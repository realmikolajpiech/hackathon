import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { NPC } from '../store/gameStore'

const ROAD_SPACING = 3
const GRID_BLOCKS = 3
const EXT = ROAD_SPACING * GRID_BLOCKS  // 9 tiles
const W = 6                              // WORLD_SCALE
const WORLD_RANGE = EXT * W             // 54 units center-to-edge

type BuildingEntry = {
  type: string
  position: [number, number, number]
  npc_id: string | null
}

const TYPE_COLORS: Record<string, string> = {
  bar:         '#ff4466',
  office:      '#00e87a',
  police:      '#22ccff',
  warehouse:   '#ff9922',
  club:        '#cc55ff',
  hotel:       '#ffaacc',
  shop:        '#33ffcc',
  factory:     '#ffbb44',
  restaurant:  '#ff7744',
  apartments:  '#eedd55',
  market:      '#77ffcc',
}

function typeColor(type: string): string {
  const t = type.toLowerCase()
  for (const [k, c] of Object.entries(TYPE_COLORS)) if (t.includes(k)) return c
  return '#e0cc88'
}

interface Props {
  buildings: BuildingEntry[]
  playerPosRef: React.MutableRefObject<THREE.Vector3>
  npcs?: NPC[]
}

function drawMap(
  ctx: CanvasRenderingContext2D,
  size: number,
  buildings: BuildingEntry[],
  playerPos: THREE.Vector3,
  npcs: NPC[],
  full: boolean,
) {
  const pad = full ? 20 : 10
  const inner = size - pad * 2
  const scale = inner / (2 * WORLD_RANGE)

  function wToM(wx: number, wz: number): [number, number] {
    return [pad + (wx + WORLD_RANGE) * scale, pad + (wz + WORLD_RANGE) * scale]
  }

  ctx.clearRect(0, 0, size, size)

  // ── Background ─────────────────────────────────────────────────────────────
  ctx.fillStyle = '#05050e'
  ctx.fillRect(0, 0, size, size)

  // ── City blocks (lighter than roads) ──────────────────────────────────────
  ctx.fillStyle = '#0b0b1e'
  for (let x = -EXT; x < EXT; x += ROAD_SPACING) {
    for (let z = -EXT; z < EXT; z += ROAD_SPACING) {
      const [bx1] = wToM((x + 0.6) * W, 0)
      const [bx2] = wToM((x + ROAD_SPACING - 0.6) * W, 0)
      const [, bz1] = wToM(0, (z + 0.6) * W)
      const [, bz2] = wToM(0, (z + ROAD_SPACING - 0.6) * W)
      ctx.fillRect(bx1, bz1, bx2 - bx1, bz2 - bz1)
    }
  }

  // ── Road centre lines (faint) ─────────────────────────────────────────────
  ctx.strokeStyle = '#0f0f28'
  ctx.lineWidth = full ? 0.5 : 0.4
  ctx.setLineDash([2, 4])
  for (let x = -EXT; x <= EXT; x += ROAD_SPACING) {
    const [px] = wToM(x * W, 0)
    ctx.beginPath(); ctx.moveTo(px, pad); ctx.lineTo(px, size - pad); ctx.stroke()
  }
  for (let z = -EXT; z <= EXT; z += ROAD_SPACING) {
    const [, pz] = wToM(0, z * W)
    ctx.beginPath(); ctx.moveTo(pad, pz); ctx.lineTo(size - pad, pz); ctx.stroke()
  }
  ctx.setLineDash([])

  // ── Story buildings ────────────────────────────────────────────────────────
  for (const b of buildings) {
    const [px, pz] = wToM(b.position[0], b.position[2])
    const color = typeColor(b.type)
    const r = full ? 7 : 4

    // Soft glow
    const grd = ctx.createRadialGradient(px, pz, 0, px, pz, r * 2.5)
    grd.addColorStop(0, color + '55')
    grd.addColorStop(1, color + '00')
    ctx.fillStyle = grd
    ctx.beginPath()
    ctx.arc(px, pz, r * 2.5, 0, Math.PI * 2)
    ctx.fill()

    // Solid dot
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(px, pz, r, 0, Math.PI * 2)
    ctx.fill()

    // Inner bright core
    ctx.fillStyle = '#ffffff44'
    ctx.beginPath()
    ctx.arc(px, pz, r * 0.4, 0, Math.PI * 2)
    ctx.fill()

    // NPC ring: thin circle when a suspect is here
    if (b.npc_id) {
      ctx.strokeStyle = '#ffffff55'
      ctx.lineWidth = full ? 1 : 0.8
      ctx.beginPath()
      ctx.arc(px, pz, r + (full ? 3 : 2), 0, Math.PI * 2)
      ctx.stroke()
    }

    // Labels on full map only
    if (full) {
      const npc = b.npc_id ? npcs.find((n) => n.id === b.npc_id) : null
      ctx.textAlign = 'center'

      if (npc) {
        ctx.font = '600 8px Inter, "Courier New", monospace'
        ctx.fillStyle = '#ffffff99'
        ctx.fillText(npc.name.split(' ')[0], px, pz - r - 6)
      }

      ctx.font = '7px "Courier New", monospace'
      ctx.fillStyle = color + 'bb'
      ctx.fillText(b.type.toUpperCase().slice(0, 9), px, pz + r + 10)
    }
  }

  // ── Player ────────────────────────────────────────────────────────────────
  const [ppx, ppz] = wToM(playerPos.x, playerPos.z)
  const pr = full ? 5 : 3

  // Outer pulse ring
  ctx.strokeStyle = '#ffffff22'
  ctx.lineWidth = full ? 1.5 : 1
  ctx.beginPath()
  ctx.arc(ppx, ppz, pr + (full ? 5 : 3), 0, Math.PI * 2)
  ctx.stroke()

  // White dot
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(ppx, ppz, pr, 0, Math.PI * 2)
  ctx.fill()

  // Yellow centre
  ctx.fillStyle = '#ffdd44'
  ctx.beginPath()
  ctx.arc(ppx, ppz, pr * 0.45, 0, Math.PI * 2)
  ctx.fill()
}

export default function CityMinimap({ buildings, playerPosRef, npcs = [] }: Props) {
  const minimapRef = useRef<HTMLCanvasElement>(null)
  const fullRef    = useRef<HTMLCanvasElement>(null)
  const [open, setOpen] = useState(false)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === 'm') setOpen((v) => !v)
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    let alive = true
    function loop() {
      if (!alive) return
      const pos = playerPosRef.current
      if (minimapRef.current) {
        const ctx = minimapRef.current.getContext('2d')
        if (ctx) drawMap(ctx, 140, buildings, pos, npcs, false)
      }
      if (open && fullRef.current) {
        const ctx = fullRef.current.getContext('2d')
        if (ctx) drawMap(ctx, 420, buildings, pos, npcs, true)
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => { alive = false; cancelAnimationFrame(rafRef.current) }
  }, [buildings, playerPosRef, npcs, open])

  return (
    <>
      {/* ── Minimap ─────────────────────────────────────────────────────── */}
      <div
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          cursor: 'pointer',
          userSelect: 'none',
          lineHeight: 0,
        }}
      >
        <canvas
          ref={minimapRef}
          width={140}
          height={140}
          style={{
            display: 'block',
            borderRadius: 4,
            border: '1px solid #151530',
            boxShadow: '0 2px 20px rgba(0,0,8,0.7)',
            opacity: 0.88,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.88')}
        />
        <div style={{
          marginTop: 4,
          fontFamily: '"Courier New", monospace',
          fontSize: 8,
          letterSpacing: 2,
          color: '#1e1e40',
          textAlign: 'right',
          paddingRight: 2,
        }}>
          MAP [M]
        </div>
      </div>

      {/* ── Full map overlay ─────────────────────────────────────────────── */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2,2,10,0.82)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(2px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', flexDirection: 'column', gap: 0 }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              padding: '10px 16px 8px',
              background: '#07071a',
              borderRadius: '4px 4px 0 0',
              border: '1px solid #12122e',
              borderBottom: 'none',
            }}>
              <span style={{
                fontFamily: '"Courier New", monospace',
                fontSize: 11,
                letterSpacing: 3,
                color: '#ff0055',
                fontWeight: 'bold',
              }}>
                DISTRICT MAP
              </span>
              <span style={{
                fontFamily: '"Courier New", monospace',
                fontSize: 9,
                letterSpacing: 2,
                color: '#1e1e48',
                cursor: 'pointer',
              }}
                onClick={() => setOpen(false)}
              >
                ESC
              </span>
            </div>

            {/* Map canvas */}
            <canvas
              ref={fullRef}
              width={420}
              height={420}
              style={{
                display: 'block',
                border: '1px solid #12122e',
              }}
            />

            {/* Footer legend */}
            <div style={{
              padding: '8px 16px',
              background: '#07071a',
              border: '1px solid #12122e',
              borderTop: 'none',
              borderRadius: '0 0 4px 4px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              flexWrap: 'wrap',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#fff', display: 'inline-block',
                }} />
                <span style={{ fontFamily: '"Courier New", monospace', fontSize: 8, color: '#33334a', letterSpacing: 1 }}>YOU</span>
              </span>
              {buildings.map((b, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: typeColor(b.type),
                    display: 'inline-block',
                    boxShadow: `0 0 4px ${typeColor(b.type)}88`,
                  }} />
                  <span style={{ fontFamily: '"Courier New", monospace', fontSize: 8, color: '#33334a', letterSpacing: 1 }}>
                    {b.type.toUpperCase()}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
