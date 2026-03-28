import { Canvas, useFrame, extend } from '@react-three/fiber'
import { useGLTF, Clone, OrbitControls, Sky, Effects } from '@react-three/drei'
import { Suspense, useState, useRef, useMemo, useEffect, Component, type ReactNode } from 'react'
import * as THREE from 'three'
import { OrbitControls as OrbitControlsImpl, UnrealBloomPass, FilmPass } from 'three-stdlib'
import Building from '../components/Building'
import Player from '../components/Player'
import FollowCamera from '../components/FollowCamera'
import DialogBox from '../components/DialogBox'
import VoiceUI from '../components/VoiceUI'
import Notebook from '../components/Notebook'
import Inventory from '../components/Inventory'
import { useGameStore } from '../store/gameStore'
import { WORLD_SCALE, SCALE } from '../config/modelScales'

extend({ UnrealBloomPass, FilmPass })

// eslint-disable-next-line @typescript-eslint/no-namespace
declare module '@react-three/fiber' {
  interface ThreeElements {
    unrealBloomPass: object
    filmPass: object
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
      if (brightness > 0.03 && brightness < 0.32) {
        mat.emissive = new THREE.Color(glowColor)
        mat.emissiveIntensity = 1.8
        mat.toneMapped = false
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
const GRID_BLOCKS = 2
const EXT = ROAD_SPACING * GRID_BLOCKS

const ROAD_MODELS = ['/models/roads/road-crossroad.glb', '/models/roads/road-straight.glb']
const FILLER_SKYSCRAPERS = [
  '/models/commercial/building-skyscraper-a.glb',
  '/models/commercial/building-skyscraper-b.glb',
  '/models/commercial/building-skyscraper-c.glb',
]
const FILLER_SMALL = [
  '/models/commercial/low-detail-building-a.glb',
  '/models/commercial/low-detail-building-b.glb',
  '/models/commercial/low-detail-building-c.glb',
  '/models/commercial/low-detail-building-d.glb',
  '/models/commercial/low-detail-building-e.glb',
  '/models/industrial/building-a.glb',
  '/models/industrial/building-b.glb',
];

[...ROAD_MODELS, ...FILLER_SKYSCRAPERS, ...FILLER_SMALL].forEach(u => useGLTF.preload(u))

function RoadGrid() {
  const { scene: cross }    = useGLTF('/models/roads/road-crossroad.glb')
  const { scene: straight } = useGLTF('/models/roads/road-straight.glb')

  useEffect(() => { enableShadows(cross); enableShadows(straight) }, [cross, straight])

  const tiles = useMemo(() => {
    const out: { pos: [number, number, number]; rot: number; obj: 'cross' | 'straight' }[] = []

    // Crossroad intersections
    for (let x = -EXT; x <= EXT; x += ROAD_SPACING)
      for (let z = -EXT; z <= EXT; z += ROAD_SPACING)
        out.push({ pos: [x * W, 0, z * W], rot: 0, obj: 'cross' })

    // Straight roads along Z axis (vertical) — rotate 90° so lanes face Z
    for (let x = -EXT; x <= EXT; x += ROAD_SPACING)
      for (let z = -EXT; z < EXT; z += ROAD_SPACING)
        for (let f = 1; f < ROAD_SPACING; f++)
          out.push({ pos: [x * W, 0, (z + f) * W], rot: Math.PI / 2, obj: 'straight' })

    // Straight roads along X axis (horizontal) — no rotation, lanes face X
    for (let z = -EXT; z <= EXT; z += ROAD_SPACING)
      for (let x = -EXT; x < EXT; x += ROAD_SPACING)
        for (let f = 1; f < ROAD_SPACING; f++)
          out.push({ pos: [(x + f) * W, 0, z * W], rot: 0, obj: 'straight' })

    return out
  }, [])

  return (
    <group>
      {tiles.map((t, i) => (
        <Clone
          key={i}
          object={t.obj === 'cross' ? cross : straight}
          position={t.pos}
          scale={SCALE.road}
          rotation={[0, t.rot, 0]}
        />
      ))}
    </group>
  )
}

// ─── Filler buildings ───────────────────────────────────────────────────────
function FillerBuildings() {
  const skyscrapers = FILLER_SKYSCRAPERS.map(u => useGLTF(u).scene)
  const smalls = FILLER_SMALL.map(u => useGLTF(u).scene)

  useEffect(() => {
    ;[...skyscrapers, ...smalls].forEach((s) => { enableShadows(s); enableWindowGlow(s, '#ffeeaa') })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const placements = useMemo(() => {
    const out: { pos: [number, number, number]; scene: THREE.Group; rot: number }[] = []
    let idx = 0

    for (let bx = -EXT + 1; bx < EXT; bx += ROAD_SPACING) {
      for (let bz = -EXT + 1; bz < EXT; bz += ROAD_SPACING) {
        const cx = (bx + (ROAD_SPACING - 1) / 2) * W
        const cz = (bz + (ROAD_SPACING - 1) / 2) * W
        const dist = Math.max(Math.abs(cx), Math.abs(cz))
        const pool = dist < ROAD_SPACING * W * 1.2 ? skyscrapers : smalls
        out.push({ pos: [cx, 0, cz], scene: pool[idx % pool.length], rot: (idx * Math.PI / 2) })
        idx++
      }
    }
    return out
  }, [skyscrapers, smalls])

  return (
    <group>
      {placements.map((p, i) => (
        <Clone key={i} object={p.scene} position={p.pos} rotation={[0, p.rot, 0]} scale={SCALE.fillerBuilding} />
      ))}
    </group>
  )
}

// Spotlight that points straight down — needs a scene target object
function LampSpot({ px, pz }: { px: number; pz: number }) {
  const spotRef = useRef<THREE.SpotLight>(null)
  const targetRef = useRef<THREE.Group>(null)
  useEffect(() => {
    if (spotRef.current && targetRef.current) {
      spotRef.current.target = targetRef.current
      targetRef.current.updateMatrixWorld()
    }
  }, [])
  // Head is at the end of the curved arm — slightly offset from the pole
  const hx = px + 0.5
  const hz = pz + 0.5
  const hy = 3.6
  return (
    <>
      {/* Target directly below lamp head on the ground */}
      <group ref={targetRef} position={[hx, 0, hz]} />
      <spotLight
        ref={spotRef}
        position={[hx, hy, hz]}
        angle={Math.PI / 1.9}
        penumbra={0.55}
        intensity={22}
        distance={14}
        decay={1.6}
        color="#ffdd88"
        castShadow={false}
      />
    </>
  )
}

// ─── Street lamps ───────────────────────────────────────────────────────────
function GLBLamps() {
  const { scene: lamp } = useGLTF('/models/roads/streetlamp.glb')
  const positions = useMemo(() => {
    const out: [number, number, number][] = []
    for (let x = -EXT; x <= EXT; x += ROAD_SPACING)
      for (let z = -EXT; z <= EXT; z += ROAD_SPACING)
        if ((Math.abs(x) + Math.abs(z)) % (ROAD_SPACING * 2) === 0)
          out.push([x * W + 0.8, 0, z * W + 0.8])
    return out
  }, [])

  useEffect(() => { enableShadows(lamp) }, [lamp])

  return (
    <group>
      {positions.map((pos, i) => (
        <group key={i}>
          <Clone object={lamp} position={pos} scale={SCALE.lamp} />
          <LampSpot px={pos[0]} pz={pos[2]} />
        </group>
      ))}
    </group>
  )
}

// ─── Parked cars ────────────────────────────────────────────────────────────
function ParkedCars() {
  const { scene: police } = useGLTF('/models/cars/police.glb')
  const { scene: sedan }  = useGLTF('/models/cars/sedan-sports.glb')
  const { scene: taxi }   = useGLTF('/models/cars/taxi.glb')

  useEffect(() => { enableShadows(police); enableShadows(sedan); enableShadows(taxi) }, [police, sedan, taxi])

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
  const buildings = currentCase.map_layout.buildings

  function handleBuildingInteract(npcId: string | null, buildingType: string) {
    const type = buildingType.toLowerCase().trim()
    const interiors = currentCase!.interiors ?? []

    // Exact match first, then partial match (handles AI inconsistencies like "police" vs "police_station")
    const interior =
      interiors.find((i) => i.building_type.toLowerCase().trim() === type) ??
      interiors.find((i) => {
        const bt = i.building_type.toLowerCase().trim()
        return bt.includes(type) || type.includes(bt)
      })

    if (interior) { setCurrentInterior(interior); setPhase('interior'); return }
    if (npcId) {
      const npc = currentCase!.npcs.find((n) => n.id === npcId)
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
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
        shadows="soft"
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
          <Player onPositionChange={(pos) => playerPos.current.copy(pos)} />
        </Suspense>
        <FollowCamera target={playerPos.current} controlsRef={controlsRef} />
        <ProximityChecker buildings={buildings} playerPos={playerPos} onNearbyChange={handleNearbyChange} />

        {/* Lighting */}
        <ambientLight intensity={0.4} color="#0a0a2a" />
        <directionalLight
          position={[-20, 30, 10]}
          intensity={1.6}
          color="#b0c8ff"
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-near={0.5}
          shadow-camera-far={120}
          shadow-camera-left={-45}
          shadow-camera-right={45}
          shadow-camera-top={45}
          shadow-camera-bottom={-45}
          shadow-bias={-0.0005}
        />
        <directionalLight position={[20, 8, -15]} intensity={0.4} color="#ff6622" />
        <hemisphereLight args={['#111133', '#1a0f00', 0.4]} />

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
        <fogExp2 attach="fog" args={['#070510', 0.018]} />

        {/* Ground */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
          <planeGeometry args={[80, 80]} />
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

        <ModelErrorBoundary>
          <Suspense fallback={null}>
            <ParkedCars />
          </Suspense>
        </ModelErrorBoundary>

        <ModelErrorBoundary>
          <Suspense fallback={null}>
            <FillerBuildings />
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
          <unrealBloomPass args={[new THREE.Vector2(256, 256), 0.8, 0.5, 0.75]} />
          {/* @ts-ignore */}
          <filmPass args={[0.12, 0.0, 0, false]} />
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
          WASD move · E interact · Scroll zoom · Drag rotate
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
        <button onClick={() => setPhase('case_selection')} style={{
          background: '#0a0a1a', border: '1px solid #2a2a3a',
          color: '#555', padding: '6px 14px',
          cursor: 'pointer', fontFamily: '"Courier New", monospace', fontSize: 11,
        }}>← CASES</button>
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
    </div>
  )
}
