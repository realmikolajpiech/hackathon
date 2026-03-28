/**
 * NeonGPU – TypeGPU-powered compute shader for per-building neon glow animation.
 *
 * Each frame a WebGPU compute shader runs noise + flicker functions over every
 * building index and writes a glow intensity in [0..1] to a storage buffer.
 * Values are async-read back to CPU and applied to Three.js emissive materials.
 *
 * Falls back to a CPU sine-wave implementation when WebGPU is unavailable.
 */
import tgpu from 'typegpu'
import { arrayOf, f32, struct, u32 } from 'typegpu/data'

// ── WGSL compute shader – neon flicker per building ──────────────────────────
const FLICKER_WGSL = /* wgsl */`
struct Uniforms {
  time  : f32,
  count : u32,
}

@group(0) @binding(0) var<uniform> uni : Uniforms;
@group(0) @binding(1) var<storage, read_write> glows : array<f32>;

fn hash(n : f32) -> f32 {
  return fract(sin(n) * 43758.5453123);
}

@compute @workgroup_size(64)
fn computeGlows(@builtin(global_invocation_id) id : vec3<u32>) {
  let i = id.x;
  if (i >= uni.count) { return; }

  let s = f32(i);
  let t = uni.time;

  // Slow breath pulse per building
  let breath  = sin(t * 1.4 + hash(s) * 6.28318) * 0.14;
  // Fast neon shimmer
  let shimmer = sin(t * 14.0 + hash(s * 3.7) * 6.28318) * 0.05;
  // Occasional tube stutter (neon fizz effect)
  let stutter = step(0.96, hash(floor(t * 4.0) + s * 0.13)) * -0.38;

  glows[i] = clamp(0.68 + breath + shimmer + stutter, 0.15, 1.0);
}
`

export interface NeonGPU {
  /** Latest per-building glow intensities in [0..1]. */
  getGlows(): Float32Array
  /** Call once per animation frame with elapsed time (seconds). */
  tick(time: number): void
  destroy(): void
}

// ── CPU fallback ─────────────────────────────────────────────────────────────
function makeCPUFallback(count: number): NeonGPU {
  const glows = new Float32Array(count).fill(1)
  return {
    getGlows: () => glows,
    tick(t) {
      for (let i = 0; i < count; i++) {
        const s = i * 1.7
        const breath  = Math.sin(t * 1.4 + s) * 0.14
        const shimmer = Math.sin(t * 14.0 + s * 3.7) * 0.05
        glows[i] = Math.max(0.15, Math.min(1, 0.68 + breath + shimmer))
      }
    },
    destroy() {},
  }
}

// ── TypeGPU GPU path ──────────────────────────────────────────────────────────
export async function initNeonGPU(count: number): Promise<NeonGPU> {
  if (typeof navigator === 'undefined' || !navigator.gpu) {
    console.info('[NeonGPU] WebGPU unavailable – using CPU fallback')
    return makeCPUFallback(count)
  }

  try {
    // Acquire GPUAdapter + GPUDevice via TypeGPU
    const root   = await tgpu.init()
    const device = root.device

    // ── TypeGPU-managed buffers (type-safe data schemas) ───────────────────
    const uniformSchema = struct({ time: f32, count: u32 })
    const glowSchema    = arrayOf(f32, count)

    // TypeGPU creates the GPUBuffer with correct usage flags automatically
    const uniformBuf = root.createBuffer(uniformSchema).$usage('uniform')
    const glowBuf    = root.createBuffer(glowSchema).$usage('storage')

    // Read-back buffer lives outside TypeGPU (MAP_READ is not a storable usage)
    const readBuf = device.createBuffer({
      size:  count * 4,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    })

    // ── Compute pipeline (WGSL shader via root.device) ─────────────────────
    const shader   = device.createShaderModule({ code: FLICKER_WGSL })
    const pipeline = await device.createComputePipelineAsync({
      layout:  'auto',
      compute: { module: shader, entryPoint: 'computeGlows' },
    })

    const bindGroup = device.createBindGroup({
      layout:  pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniformBuf.buffer } },
        { binding: 1, resource: { buffer: glowBuf.buffer } },
      ],
    })

    const workgroups = Math.ceil(count / 64)
    const glows      = new Float32Array(count).fill(1)
    let   reading    = false

    return {
      getGlows: () => glows,

      tick(time: number) {
        // Write uniforms into the TypeGPU-managed buffer
        const bytes = new ArrayBuffer(8)
        new Float32Array(bytes, 0, 1)[0] = time
        new Uint32Array(bytes, 4, 1)[0]  = count
        device.queue.writeBuffer(uniformBuf.buffer, 0, bytes)

        // Dispatch compute shader + copy results to read-back buffer
        const enc  = device.createCommandEncoder()
        const pass = enc.beginComputePass()
        pass.setPipeline(pipeline)
        pass.setBindGroup(0, bindGroup)
        pass.dispatchWorkgroups(workgroups)
        pass.end()
        enc.copyBufferToBuffer(glowBuf.buffer, 0, readBuf, 0, count * 4)
        device.queue.submit([enc.finish()])

        // Non-blocking async readback – skip frame if previous read still in flight
        if (reading) return
        reading = true
        readBuf.mapAsync(GPUMapMode.READ)
          .then(() => {
            glows.set(new Float32Array(readBuf.getMappedRange()))
            readBuf.unmap()
            reading = false
          })
          .catch(() => { reading = false })
      },

      destroy() {
        readBuf.destroy()
        root.destroy()
      },
    }
  } catch (err) {
    console.warn('[NeonGPU] TypeGPU init failed – using CPU fallback:', err)
    return makeCPUFallback(count)
  }
}
