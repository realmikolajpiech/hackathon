import { Canvas, useFrame, extend } from '@react-three/fiber'
import { useGLTF, Clone, OrbitControls, Sky, Effects } from '@react-three/drei'
import { Suspense, useState, useRef, useMemo, useEffect, Component, type ReactNode } from 'react'
import * as THREE from 'three'
import { OrbitControls as OrbitControlsImpl, UnrealBloomPass } from 'three-stdlib'
import Building from '../components/Building'
import Player from '../components/Player'
import FollowCamera from '../components/FollowCamera'
import DialogBox from '../components/DialogBox'
import VoiceUI from '../components/VoiceUI'
import Notebook from '../components/Notebook'
import Inventory from '../components/Inventory'
import CityMinimap from '../components/CityMinimap'
import { useGameStore } from '../store/gameStore'
import { WORLD_SCALE, SCALE } from '../config/modelScales'
import type { Collider } from '../utils/collisions'

extend({ UnrealBloomPass })

// eslint-disable-next-line @typescript-eslint/no-namespace
declare module '@react-three/fiber' {
  interface ThreeElements {
    unrealBloomPass: object
  }
}

function enableShadows(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true
      child.receiveShadow = true
    }
  })
}

// Window detection by color: dark panels on buildings are glass/windows
function enableWindowGlow(obj: THREE.Object3D, glowColor = '#ffeeaa') {
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh) return
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    mats.forEach((m) => {
      const mat = m as THREE.MeshStandardMaterial
      if (!mat.color) return
      const { r, g, b } = mat.color
      const brightness = (r + g + b) / 3
      // Dark materials (0.03–0.32 brightness) are window/glass panels — make them glow
      if (brightness > 0.03 && brightness < 0.18) {
        mat.emissive = new THREE.Color(glowColor)
        mat.emissiveIntensity = 1.2
      }
    })
  })
}

class ModelErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  render() { return this.state.hasError ? null : this.props.children }
}

const W = WORLD_SCALE

// ─── Road layout ────────────────────────────────────────────────────────────
const ROAD_SPACING = 3  // tiles between intersections
const GRID_BLOCKS = 3
const EXT = ROAD_SPACING * GRID_BLOCKS

// Pre-compute valid block centers (true midpoint between road lanes)
const BLOCK_HALF = (ROAD_SPACING - 2) / 2
const BLOCK_CENTERS: [number, number][] = []
for (let bx = -EXT + 1; bx < EXT; bx += ROAD_SPACING) {
  for (let bz = -EXT + 1; bz < EXT; bz += ROAD_SPACING) {
    BLOCK_CENTERS.push([
      (bx + BLOCK_HALF) * W,
      (bz + BLOCK_HALF) * W,
    ])
  }
}

function snapToBlock(wx: number, wz: number): [number, number] {
  let bestDist = Infinity
  let best: [number, number] = BLOCK_CENTERS[0]
  for (const bc of BLOCK_CENTERS) {
    const dx = wx - bc[0]
    const dz = wz - bc[1]
    const dist = dx * dx + dz * dz
    if (dist < bestDist) {
      bestDist = dist
      best = bc
    }
  }
  return best
}

function isOnRoad(wx: number, wz: number): boolean {
  const gx = Math.round(wx / W)
  const gz = Math.round(wz / W)
  if (Math.abs(wx - gx * W) > W * 0.45 || Math.abs(wz - gz * W) > W * 0.45) return false
  const modX = ((gx % ROAD_SPACING) + ROAD_SPACING) % ROAD_SPACING
  const modZ = ((gz % ROAD_SPACING) + ROAD_SPACING) % ROAD_SPACING
  return modX === 0 || modZ === 0
}

const ROAD_MODELS = ['/models/roads/road-crossroad.glb', '/models/roads/road-straight.glb']
const FILLER_SKYSCRAPERS = [
  '/models/commercial/building-skyscraper-a.glb',
  '/models/commercial/building-skyscraper-b.glb',
  '/models/commercial/building-skyscraper-c.glb',
]
const FILLER_MEDIUM = [
  '/models/commercial/building-a.glb',
  '/models/commercial/building-b.glb',
  '/models/commercial/building-c.glb',
  '/models/commercial/building-e.glb',
  '/models/commercial/building-h.glb',
]

// Max possible distance from center (used for probability gradient)
const MAX_BLOCK_DIST = (EXT - 1 + BLOCK_HALF) * W

;[...ROAD_MODELS, ...FILLER_SKYSCRAPERS, ...FILLER_MEDIUM].forEach(u => useGLTF.preload(u))

function extractFirstMesh(scene: THREE.Object3D): THREE.Mesh | null {
  let found: THREE.Mesh | null = null
  scene.traverse((c) => { if (!found && (c as THREE.Mesh).isMesh) found = c as THREE.Mesh })
  return found
}

const _obj = new THREE.Object3D()

function RoadGrid() {
  const { scene: cross }    = useGLTF('/models/roads/road-crossroad.glb')
  const { scene: straight } = useGLTF('/models/roads/road-straight.glb')

  const crossMesh = useMemo(() => extractFirstMesh(cross), [cross])
  const straightMesh = useMemo(() => extractFirstMesh(straight), [straight])

  const { crossMatrices, straightMatrices } = useMemo(() => {
    const cm: THREE.Matrix4[] = []
    const sm: THREE.Matrix4[] = []

    for (let x = -EXT; x <= EXT; x += ROAD_SPACING)
      for (let z = -EXT; z <= EXT; z += ROAD_SPACING) {
        _obj.position.set(x * W, 0, z * W)
        _obj.rotation.set(0, 0, 0)
        _obj.scale.setScalar(SCALE.road)
        _obj.updateMatrix()
        cm.push(_obj.matrix.clone())
      }

    for (let x = -EXT; x <= EXT; x += ROAD_SPACING)
      for (let z = -EXT; z < EXT; z += ROAD_SPACING)
        for (let f = 1; f < ROAD_SPACING; f++) {
          _obj.position.set(x * W, 0, (z + f) * W)
          _obj.rotation.set(0, Math.PI / 2, 0)
          _obj.scale.setScalar(SCALE.road)
          _obj.updateMatrix()
          sm.push(_obj.matrix.clone())
        }

    for (let z = -EXT; z <= EXT; z += ROAD_SPACING)
      for (let x = -EXT; x < EXT; x += ROAD_SPACING)
        for (let f = 1; f < ROAD_SPACING; f++) {
          _obj.position.set((x + f) * W, 0, z * W)
          _obj.rotation.set(0, 0, 0)
          _obj.scale.setScalar(SCALE.road)
          _obj.updateMatrix()
          sm.push(_obj.matrix.clone())
        }

    return { crossMatrices: cm, straightMatrices: sm }
  }, [])

  const crossInst = useMemo(() => {
    if (!crossMesh) return null
    const inst = new THREE.InstancedMesh(crossMesh.geometry, crossMesh.material, crossMatrices.length)
    crossMatrices.forEach((m, i) => inst.setMatrixAt(i, m))
    inst.instanceMatrix.needsUpdate = true
    inst.receiveShadow = true
    inst.frustumCulled = false
    return inst
  }, [crossMesh, crossMatrices])

  const straightInst = useMemo(() => {
    if (!straightMesh) return null
    const inst = new THREE.InstancedMesh(straightMesh.geometry, straightMesh.material, straightMatrices.length)
    straightMatrices.forEach((m, i) => inst.setMatrixAt(i, m))
    inst.instanceMatrix.needsUpdate = true
    inst.receiveShadow = true
    inst.frustumCulled = false
    return inst
  }, [straightMesh, straightMatrices])

  return (
    <group>
      {crossInst && <primitive object={crossInst} />}
      {straightInst && <primitive object={straightInst} />}
    </group>
  )
}

// ─── Filler buildings (4 per block) ─────────────────────────────────────────
const FILLER_SCALE = WORLD_SCALE * 0.7
const FILLER_MEDIUM_SCALE = WORLD_SCALE * 0.55
const QUAD_OFF = W * 0.42
const QUAD_OFFSETS: [number, number][] = [
  [-QUAD_OFF, -QUAD_OFF],
  [-QUAD_OFF,  QUAD_OFF],
  [ QUAD_OFF, -QUAD_OFF],
  [ QUAD_OFF,  QUAD_OFF],
]

function FillerBuildings({ excludePositions }: { excludePositions?: [number, number][] }) {
  const skyscrapers = FILLER_SKYSCRAPERS.map(u => useGLTF(u).scene)
  const mediums = FILLER_MEDIUM.map(u => useGLTF(u).scene)

  useEffect(() => {
    ;[...skyscrapers, ...mediums].forEach((s) => { enableShadows(s); enableWindowGlow(s, '#ffeeaa') })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const placements = useMemo(() => {
    const out: { pos: [number, number, number]; scene: THREE.Group; tall: boolean }[] = []
    let idx = 0

    // Position-based hash so each spot has stable randomness independent of iteration order
    const posHash = (x: number, z: number) => {
      const ix = Math.round(x * 10)
      const iz = Math.round(z * 10)
      const h = (ix * 73856093) ^ (iz * 19349663)
      return ((h >>> 0) % 10000) / 10000
    }

    for (let bx = -EXT + 1; bx < EXT; bx += ROAD_SPACING) {
      for (let bz = -EXT + 1; bz < EXT; bz += ROAD_SPACING) {
        const cx = (bx + BLOCK_HALF) * W
        const cz = (bz + BLOCK_HALF) * W

        if (excludePositions?.some(([ex, ez]) => {
          const dx = cx - ex, dz = cz - ez
          return dx * dx + dz * dz < W * W
        })) { idx += 4; continue }

        const dist = Math.max(Math.abs(cx), Math.abs(cz))
        // Linear gradient: 100% skyscraper at center → 60% at max edge
        const skyscraperProb = 1.0 - 0.4 * Math.min(dist / MAX_BLOCK_DIST, 1)

        for (const [ox, oz] of QUAD_OFFSETS) {
          const tall = posHash(cx + ox, cz + oz) < skyscraperProb
          out.push({
            pos: [cx + ox, 0, cz + oz],
            scene: tall ? skyscrapers[idx % skyscrapers.length] : mediums[idx % mediums.length],
            tall,
          })
          idx++
        }
      }
    }
    return out
  }, [skyscrapers, mediums, excludePositions])

  return (
    <group>
      {placements.map((p, i) => (
        <Clone key={i} object={p.scene} position={p.pos} scale={p.tall ? FILLER_SCALE : FILLER_MEDIUM_SCALE} />
      ))}
    </group>
  )
}

// ─── Street lamps (models only, lights are proximity-based) ─────────────────

const LAMP_EDGE = W * 0.45
const ALL_LAMP_POS: { pos: [number, number, number]; rot: number }[] = []
for (let x = -EXT; x <= EXT; x += ROAD_SPACING)
  for (let z = -EXT; z <= EXT; z += ROAD_SPACING)
    if ((Math.abs(x) + Math.abs(z)) % (ROAD_SPACING * 2) === 0) {
      ALL_LAMP_POS.push({ pos: [x * W + LAMP_EDGE, 0, z * W + LAMP_EDGE], rot: 0 })
      ALL_LAMP_POS.push({ pos: [x * W - LAMP_EDGE, 0, z * W - LAMP_EDGE], rot: Math.PI })
    }

function GLBLamps() {
  const { scene: lamp } = useGLTF('/models/roads/streetlamp.glb')
  const lampMesh = useMemo(() => extractFirstMesh(lamp), [lamp])

  const inst = useMemo(() => {
    if (!lampMesh) return null
    const im = new THREE.InstancedMesh(lampMesh.geometry, lampMesh.material, ALL_LAMP_POS.length)
    ALL_LAMP_POS.forEach((l, i) => {
      _obj.position.set(l.pos[0], l.pos[1], l.pos[2])
      _obj.rotation.set(0, l.rot, 0)
      _obj.scale.setScalar(SCALE.lamp)
      _obj.updateMatrix()
      im.setMatrixAt(i, _obj.matrix)
    })
    im.instanceMatrix.needsUpdate = true
    im.frustumCulled = false
    return im
  }, [lampMesh])

  return inst ? <primitive object={inst} /> : null
}

const MAX_ACTIVE_LIGHTS = 6

function ProximityLights({ playerPos }: { playerPos: React.MutableRefObject<THREE.Vector3> }) {
  const lightsRef = useRef<THREE.PointLight[]>([])
  const groupRef = useRef<THREE.Group>(null)

  useFrame(() => {
    const pp = playerPos.current
    const sorted = ALL_LAMP_POS
      .map((l) => ({ l, d: (pp.x - l.pos[0]) ** 2 + (pp.z - l.pos[2]) ** 2 }))
      .sort((a, b) => a.d - b.d)

    for (let i = 0; i < MAX_ACTIVE_LIGHTS; i++) {
      const light = lightsRef.current[i]
      if (!light) continue
      if (i < sorted.length) {
        const lp = sorted[i].l.pos
        light.position.set(lp[0], SCALE.lamp * 0.55, lp[2])
        light.visible = true
      } else {
        light.visible = false
      }
    }
  })

  return (
    <group ref={groupRef}>
      {Array.from({ length: MAX_ACTIVE_LIGHTS }).map((_, i) => (
        <pointLight
          key={i}
          ref={(el) => { if (el) lightsRef.current[i] = el }}
          color="#ffdd88"
          intensity={20}
          distance={16}
          decay={1.8}
          visible={false}
        />
      ))}
    </group>
  )
}

// ─── Parked cars ────────────────────────────────────────────────────────────
function ParkedCars() {
  const { scene: police } = useGLTF('/models/cars/police.glb')
  const { scene: sedan }  = useGLTF('/models/cars/sedan-sports.glb')
  const { scene: taxi }   = useGLTF('/models/cars/taxi.glb')

  // Cars don't cast shadows — saves a lot of GPU work

  return (
    <group>
      <Clone object={sedan}  position={[-2, 0, 7]}  scale={SCALE.car} />
      <Clone object={taxi}   position={[7, 0, 2]}   scale={SCALE.car} rotation={[0, Math.PI / 2, 0]} />
      <Clone object={police} position={[2, 0, -7]}  scale={SCALE.car} />
      <Clone object={sedan}  position={[-7, 0, -2]} scale={SCALE.car} rotation={[0, Math.PI / 2, 0]} />
    </group>
  )
}

// ─── Proximity checker ─────────────────────────────────────────────────────
type BuildingEntry = { type: string; position: [number, number, number]; npc_id: string | null }

function ProximityChecker({
  buildings,
  playerPos,
  onNearbyChange,
}: {
  buildings: BuildingEntry[]
  playerPos: React.MutableRefObject<THREE.Vector3>
  onNearbyChange: (b: BuildingEntry | null) => void
}) {
  const lastNearest = useRef<BuildingEntry | null>(null)
  const frameSkip = useRef(0)
  useFrame(() => {
    if (++frameSkip.current % 10 !== 0) return
    const pos = playerPos.current
    let nearest: BuildingEntry | null = null
    let nearestDist = Infinity
    for (const b of buildings) {
      const dx = pos.x - b.position[0]
      const dz = pos.z - b.position[2]
      const dist = dx * dx + dz * dz
      if (dist < 16 && dist < nearestDist) {
        nearest = b
        nearestDist = dist
      }
    }
    if (nearest !== lastNearest.current) {
      lastNearest.current = nearest
      onNearbyChange(nearest)
    }
  })
  return null
}

// ─── Main scene ─────────────────────────────────────────────────────────────
export default function CityScene() {
  const {
    currentCase, activeNPC,
    setActiveNPC, setCurrentInterior, setPhase, world,
    collectedEvidence,
    openInventory,
    inventoryOpen,
    cityPlayerPosition, setCityPlayerPosition,
  } = useGameStore()
  const [showNotebook, setShowNotebook] = useState(false)
  const playerPos = useRef(new THREE.Vector3(0, 0, 0))
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const [nearbyBuilding, setNearbyBuilding] = useState<BuildingEntry | null>(null)
  const nearbyBuildingRef = useRef<BuildingEntry | null>(null)

  function handleNearbyChange(b: BuildingEntry | null) {
    nearbyBuildingRef.current = b
    setNearbyBuilding(b)
  }

  if (!currentCase) return null
  const rawBuildings = currentCase.map_layout.buildings

  // Snap ALL story buildings to valid block centers (never on roads).
  // Each building gets the nearest free block center to avoid overlaps.
  const buildings = useMemo(() => {
    const used = new Set<string>()
    return rawBuildings.map((b) => {
      const sorted = [...BLOCK_CENTERS].sort((a, c) => {
        const da = (b.position[0] - a[0]) ** 2 + (b.position[2] - a[1]) ** 2
        const dc = (b.position[0] - c[0]) ** 2 + (b.position[2] - c[1]) ** 2
        return da - dc
      })
      const best = sorted.find((bc) => !used.has(`${bc[0]},${bc[1]}`)) ?? sorted[0]
      used.add(`${best[0]},${best[1]}`)
      return { ...b, position: [best[0], b.position[1], best[1]] as [number, number, number] }
    })
  }, [rawBuildings])

  // Positions of story buildings to exclude from filler generation
  const storyBlockPositions = useMemo<[number, number][]>(() =>
    buildings.map((b) => [b.position[0], b.position[2]]),
  [buildings])

  // Collision data for all city objects
  const cityColliders = useMemo<Collider[]>(() => {
    const out: Collider[] = []

    // Filler buildings (4 per block)
    const fhs = FILLER_SCALE * 0.45
    for (let bx = -EXT + 1; bx < EXT; bx += ROAD_SPACING) {
      for (let bz = -EXT + 1; bz < EXT; bz += ROAD_SPACING) {
        const cx = (bx + BLOCK_HALF) * W
        const cz = (bz + BLOCK_HALF) * W
        const isExcluded = storyBlockPositions.some(([ex, ez]) => {
          const dx = cx - ex, dz = cz - ez
          return dx * dx + dz * dz < W * W
        })
        if (!isExcluded) {
          for (const [ox, oz] of QUAD_OFFSETS)
            out.push({ x: cx + ox, z: cz + oz, hw: fhs, hd: fhs })
        }
      }
    }

    // Story buildings
    const bs = SCALE.building * 0.5
    for (const b of buildings) {
      out.push({ x: b.position[0], z: b.position[2], hw: bs, hd: bs })
    }

    // Lamps (two per intersection — opposite corners)
    const lampEdge = W * 0.45
    for (let x = -EXT; x <= EXT; x += ROAD_SPACING)
      for (let z = -EXT; z <= EXT; z += ROAD_SPACING)
        if ((Math.abs(x) + Math.abs(z)) % (ROAD_SPACING * 2) === 0) {
          out.push({ x: x * W + lampEdge, z: z * W + lampEdge, hw: 0.25, hd: 0.25 })
          out.push({ x: x * W - lampEdge, z: z * W - lampEdge, hw: 0.25, hd: 0.25 })
        }

    // Cars (longer along one axis)
    out.push({ x: -2, z: 7, hw: 0.5, hd: 1.0 })
    out.push({ x: 7, z: 2, hw: 1.0, hd: 0.5 })
    out.push({ x: 2, z: -7, hw: 0.5, hd: 1.0 })
    out.push({ x: -7, z: -2, hw: 1.0, hd: 0.5 })

    return out
  }, [buildings, storyBlockPositions])

  function handleBuildingInteract(npcId: string | null, buildingType: string) {
    if (!currentCase) return
    const type = buildingType.toLowerCase().trim()
    const interiors = currentCase.interiors ?? []

    // Exact match first, then partial match (handles AI inconsistencies like "police" vs "police_station")
    const interior =
      interiors.find((i) => i.building_type.toLowerCase().trim() === type) ??
      interiors.find((i) => {
        const bt = i.building_type.toLowerCase().trim()
        return bt.includes(type) || type.includes(bt)
      })

    if (interior) {
      const p = playerPos.current
      setCityPlayerPosition([p.x, p.y, p.z])
      setCurrentInterior(interior)
      setPhase('interior')
      return
    }
    if (npcId) {
      const npc = currentCase.npcs.find((n) => n.id === npcId)
      if (npc) setActiveNPC(npc)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() === 'e' && nearbyBuildingRef.current) {
        handleBuildingInteract(nearbyBuildingRef.current.npc_id, nearbyBuildingRef.current.type)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function handleCloseDialog() { setActiveNPC(null) }

  function handleTranscript(text: string) {
    const { activeNPC: npc, addMessage } = useGameStore.getState()
    if (npc) addMessage(npc.id, { role: 'assistant', content: text })
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a1a', position: 'relative' }}>
      <Canvas
        camera={{ position: [15, 15, 15], fov: 40, near: 0.1, far: 300 }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        dpr={[1, 1]}
        shadows
        onCreated={(state) => { state.gl.toneMappingExposure = 0.85 }}
      >
        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          enableDamping
          dampingFactor={0.1}
          minDistance={5}
          maxDistance={40}
          maxPolarAngle={Math.PI / 2.5}
          minPolarAngle={Math.PI / 6}
        />

        <Suspense fallback={null}>
          <Player
            onPositionChange={(pos) => playerPos.current.copy(pos)}
            colliders={cityColliders}
            startPosition={cityPlayerPosition ?? undefined}
          />
        </Suspense>
        <FollowCamera target={playerPos.current} controlsRef={controlsRef} />
        <ProximityChecker buildings={buildings} playerPos={playerPos} onNearbyChange={handleNearbyChange} />

        {/* Lighting */}
        <ambientLight intensity={0.3} color="#0a0a2a" />
        <directionalLight
          position={[-20, 30, 10]}
          intensity={1.0}
          color="#b0c8ff"
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-near={1}
          shadow-camera-far={80}
          shadow-camera-left={-30}
          shadow-camera-right={30}
          shadow-camera-top={30}
          shadow-camera-bottom={-30}
          shadow-bias={-0.001}
        />
        <directionalLight position={[20, 8, -15]} intensity={0.25} color="#ff6622" />
        <hemisphereLight args={['#111133', '#1a0f00', 0.3]} />

        {/* Sky & atmosphere */}
        <Sky
          distance={450000}
          sunPosition={[0, -0.5, -1]}
          inclination={0.52}
          azimuth={0.25}
          rayleigh={0.05}
          turbidity={20}
          mieCoefficient={0.003}
          mieDirectionalG={0.9}
        />
        <fogExp2 attach="fog" args={['#070510', 0.012]} />

        {/* Ground */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
          <planeGeometry args={[140, 140]} />
          <meshStandardMaterial color="#0d1a0f" roughness={0.95} metalness={0.02} />
        </mesh>

        <ModelErrorBoundary>
          <Suspense fallback={null}>
            <RoadGrid />
          </Suspense>
        </ModelErrorBoundary>

        <ModelErrorBoundary>
          <Suspense fallback={null}>
            <GLBLamps />
          </Suspense>
        </ModelErrorBoundary>

        <ProximityLights playerPos={playerPos} />

        <ModelErrorBoundary>
          <Suspense fallback={null}>
            <ParkedCars />
          </Suspense>
        </ModelErrorBoundary>

        <ModelErrorBoundary>
          <Suspense fallback={null}>
            <FillerBuildings excludePositions={storyBlockPositions} />
          </Suspense>
        </ModelErrorBoundary>

        <ModelErrorBoundary>
          <Suspense fallback={null}>
            {buildings.map((b, i) => (
              <Building
                key={i}
                type={b.type}
                position={b.position}
                npcId={b.npc_id}
              />
            ))}
          </Suspense>
        </ModelErrorBoundary>

        <Effects disableGamma>
          {/* @ts-ignore */}
          <unrealBloomPass args={[new THREE.Vector2(128, 128), 0.25, 0.7, 0.95]} />
        </Effects>
      </Canvas>

      {/* HUD */}
      <div style={{
        position: 'fixed', top: 16, left: 16,
        fontFamily: '"Courier New", monospace',
        color: '#888', fontSize: 12, pointerEvents: 'none',
      }}>
        {world && (
          <div style={{ color: '#555', fontSize: 10, marginBottom: 2, letterSpacing: 2 }}>
            {world.city.name.toUpperCase()}
          </div>
        )}
        <div style={{ color: '#ff0055', fontSize: 15, fontWeight: 'bold', marginBottom: 4 }}>
          {currentCase.case.title}
        </div>
        <div style={{ fontSize: 11 }}>
          Victim: <span style={{ color: '#d4b483' }}>{currentCase.case.victim.name}</span>
        </div>
        <div style={{ marginTop: 6, color: '#444', fontSize: 11 }}>
          WASD move · E interact · M map · Scroll zoom
        </div>
      </div>

      <div style={{ position: 'fixed', top: 16, right: 16, display: 'flex', gap: 8 }}>
        <button
          onClick={openInventory}
          style={{
            background: '#0a0a1a', border: `1px solid ${collectedEvidence.length > 0 ? '#d4b48366' : '#2a2a3a'}`,
            color: collectedEvidence.length > 0 ? '#d4b483' : '#444',
            padding: '6px 14px',
            cursor: 'pointer', fontFamily: '"Courier New", monospace', fontSize: 11,
            letterSpacing: 1, position: 'relative',
          }}
        >
          ◆ EVIDENCE
          {collectedEvidence.length > 0 && (
            <span style={{
              position: 'absolute', top: -5, right: -5,
              background: '#d4b483', color: '#050510',
              borderRadius: '50%', width: 16, height: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 'bold',
            }}>
              {collectedEvidence.length}
            </span>
          )}
        </button>
        <button onClick={() => setShowNotebook(true)} style={{
          background: '#0a0805', border: '1px solid #8B6914',
          color: '#d4b483', padding: '6px 14px',
          cursor: 'pointer', fontFamily: '"Courier New", monospace', fontSize: 11, letterSpacing: 1,
        }}>NOTEBOOK</button>
        <button onClick={() => setPhase('detective_office')} style={{
          background: '#0a0805', border: '1px solid #8B6914',
          color: '#d4b483', padding: '6px 14px',
          cursor: 'pointer', fontFamily: '"Courier New", monospace', fontSize: 11, letterSpacing: 1,
        }}>⚖ OFFICE</button>
      </div>

      <div style={{
        position: 'fixed', bottom: 16, left: 16,
        fontFamily: '"Courier New", monospace', fontSize: 11,
        color: '#444', pointerEvents: 'none',
      }}>
        {currentCase.npcs.map((npc) => {
          const building = buildings.find((b) => b.npc_id === npc.id)
          return (
            <div key={npc.id} style={{ marginBottom: 3 }}>
              <span style={{ color: '#666' }}>{npc.name}</span>
              <span style={{ color: '#333' }}> — {building?.type ?? '?'}</span>
            </div>
          )
        })}
      </div>

      {nearbyBuilding && !activeNPC && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.85)', border: '1px solid #ff0055',
          color: '#fff', padding: '8px 20px',
          fontFamily: '"Courier New", monospace', fontSize: 13, letterSpacing: 2,
          pointerEvents: 'none', textShadow: '0 0 8px #ff0055',
        }}>
          <span style={{ color: '#ff0055', fontWeight: 'bold' }}>E</span>
          {' '}— {nearbyBuilding.type.toUpperCase()}
        </div>
      )}

      {activeNPC && (
        <>
          <DialogBox onClose={handleCloseDialog} />
          <VoiceUI onTranscript={handleTranscript} />
        </>
      )}
      {showNotebook && <Notebook onClose={() => setShowNotebook(false)} />}
      {inventoryOpen && <Inventory />}

      <CityMinimap
        buildings={buildings}
        playerPosRef={playerPos}
        npcs={currentCase?.npcs ?? []}
      />
    </div>
  )
}
