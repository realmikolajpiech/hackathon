import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Clone, Html, OrbitControls } from '@react-three/drei'
import { Suspense, useState, useRef, useMemo, useEffect, Component, type ReactNode } from 'react'
import * as THREE from 'three'
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import Building, { NEON_COLORS } from '../components/Building'
import Player from '../components/Player'
import FollowCamera from '../components/FollowCamera'
import DialogBox from '../components/DialogBox'
import VoiceUI from '../components/VoiceUI'
import Notebook from '../components/Notebook'
import Inventory from '../components/Inventory'
import { useGameStore } from '../store/gameStore'

class ModelErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  render() { return this.state.hasError ? null : this.props.children }
}

// ─── Procedural tree ────────────────────────────────────────────────────────
function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} scale={0.4}>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.06, 0.1, 0.8, 6]} />
        <meshStandardMaterial color="#5c3a1e" />
      </mesh>
      <mesh position={[0, 1.2, 0]}>
        <coneGeometry args={[0.5, 1.0, 6]} />
        <meshStandardMaterial color="#2a5a2a" />
      </mesh>
      <mesh position={[0, 1.8, 0]}>
        <coneGeometry args={[0.35, 0.7, 6]} />
        <meshStandardMaterial color="#3a7a3a" />
      </mesh>
    </group>
  )
}

// ─── Road layout ────────────────────────────────────────────────────────────
const S = 3

const ROAD_MODELS = ['/models/roads/road-crossroad.glb', '/models/roads/road-straight.glb']
const FILLER_SKYSCRAPERS = [
  '/models/commercial/building-skyscraper-a.glb',
  '/models/commercial/building-skyscraper-b.glb',
  '/models/commercial/building-skyscraper-c.glb',
  '/models/commercial/building-skyscraper-d.glb',
  '/models/commercial/building-skyscraper-e.glb',
]
const FILLER_SMALL = [
  '/models/commercial/low-detail-building-a.glb',
  '/models/commercial/low-detail-building-b.glb',
  '/models/commercial/low-detail-building-c.glb',
  '/models/commercial/low-detail-building-d.glb',
  '/models/commercial/low-detail-building-e.glb',
  '/models/commercial/low-detail-building-f.glb',
  '/models/commercial/low-detail-building-g.glb',
  '/models/commercial/low-detail-building-h.glb',
  '/models/industrial/building-a.glb',
  '/models/industrial/building-b.glb',
  '/models/industrial/building-c.glb',
  '/models/industrial/building-f.glb',
  '/models/industrial/building-g.glb',
];

[...ROAD_MODELS, ...FILLER_SKYSCRAPERS, ...FILLER_SMALL].forEach(u => useGLTF.preload(u))

function RoadGrid() {
  const { scene: cross }    = useGLTF('/models/roads/road-crossroad.glb')
  const { scene: straight } = useGLTF('/models/roads/road-straight.glb')

  const tiles = useMemo(() => {
    const out: { pos: [number, number, number]; rot: number; obj: 'cross' | 'straight' }[] = []
    const ext = S * 3

    for (let x = -ext; x <= ext; x += S)
      for (let z = -ext; z <= ext; z += S)
        out.push({ pos: [x, 0, z], rot: 0, obj: 'cross' })

    for (let x = -ext; x <= ext; x += S) {
      for (let z = -ext; z < ext; z += S) {
        for (let fill = 1; fill < S; fill++)
          out.push({ pos: [x, 0, z + fill], rot: 0, obj: 'straight' })
      }
    }
    for (let z = -ext; z <= ext; z += S) {
      for (let x = -ext; x < ext; x += S) {
        for (let fill = 1; fill < S; fill++)
          out.push({ pos: [x + fill, 0, z], rot: Math.PI / 2, obj: 'straight' })
      }
    }

    return out
  }, [])

  return (
    <group>
      {tiles.map((t, i) => (
        <Clone
          key={i}
          object={t.obj === 'cross' ? cross : straight}
          position={t.pos}
          scale={1}
          rotation={[0, t.rot, 0]}
        />
      ))}
    </group>
  )
}

// ─── Filler buildings (decoration, not clickable) ───────────────────────────
function FillerBuildings() {
  const skyscrapers = FILLER_SKYSCRAPERS.map(u => useGLTF(u).scene)
  const smalls = FILLER_SMALL.map(u => useGLTF(u).scene)

  const placements = useMemo(() => {
    const out: { pos: [number, number, number]; scene: THREE.Group; rot: number }[] = []
    const ext = S * 3
    let idx = 0

    for (let bx = -ext + 1; bx < ext; bx += S) {
      for (let bz = -ext + 1; bz < ext; bz += S) {
        const cx = bx + (S - 1) / 2
        const cz = bz + (S - 1) / 2
        const distFromCenter = Math.max(Math.abs(cx), Math.abs(cz))
        const isCenter = distFromCenter < S * 2

        if (isCenter) {
          const sc = skyscrapers[idx % skyscrapers.length]
          out.push({ pos: [cx, 0, cz], scene: sc, rot: (idx * Math.PI / 2) })
        } else {
          const sm = smalls[idx % smalls.length]
          out.push({ pos: [cx, 0, cz], scene: sm, rot: (idx * Math.PI / 2) })
        }
        idx++
      }
    }
    return out
  }, [skyscrapers, smalls])

  return (
    <group>
      {placements.map((p, i) => (
        <Clone key={i} object={p.scene} position={p.pos} rotation={[0, p.rot, 0]} scale={1} />
      ))}
    </group>
  )
}

// ─── Street lamps ───────────────────────────────────────────────────────────
function GLBLamps() {
  const { scene: lamp } = useGLTF('/models/roads/streetlamp.glb')
  const positions = useMemo(() => {
    const out: [number, number, number][] = []
    const ext = S * 3
    for (let x = -ext; x <= ext; x += S)
      for (let z = -ext; z <= ext; z += S)
        if ((x + z) % (S * 2) === 0)
          out.push([x + 0.4, 0, z + 0.4])
    return out
  }, [])

  return (
    <group>
      {positions.map((pos, i) => (
        <group key={i} position={pos}>
          <Clone object={lamp} scale={1} />
          <pointLight position={[0, 3, 0]} color="#ffc060" intensity={3} distance={8} />
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
  const CS = 0.5
  return (
    <group>
      <Clone object={sedan}  position={[-1, 0, S + 0.5]}  scale={CS} />
      <Clone object={taxi}   position={[S + 0.5, 0, 1]}   scale={CS} rotation={[0, Math.PI / 2, 0]} />
      <Clone object={police} position={[1, 0, -(S + 0.5)]} scale={CS} />
      <Clone object={sedan}  position={[-(S + 0.5), 0, -1]} scale={CS} rotation={[0, Math.PI / 2, 0]} />
      <Clone object={taxi}   position={[S * 2 + 0.5, 0, -2]} scale={CS} rotation={[0, Math.PI / 2, 0]} />
    </group>
  )
}

// ─── Trees ──────────────────────────────────────────────────────────────────
const TREE_POS: [number, number, number][] = [
  [-0.4, 0, S + 0.4], [0.4, 0, -(S + 0.4)],
  [S + 0.4, 0, 0.4], [-(S + 0.4), 0, -0.4],
  [S * 2 + 0.4, 0, S + 0.4], [-(S * 2 + 0.4), 0, -(S + 0.4)],
  [S + 0.4, 0, S * 2 + 0.4], [-(S + 0.4), 0, -(S * 2 + 0.4)],
]

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
  useFrame(() => {
    const pos = playerPos.current
    let nearest: BuildingEntry | null = null
    let nearestDist = Infinity
    for (const b of buildings) {
      const dx = pos.x - b.position[0]
      const dz = pos.z - b.position[2]
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist < 3 && dist < nearestDist) {
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
    const interior = currentCase!.interiors?.find((i) => i.building_type === buildingType)
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
        camera={{ position: [10, 10, 10], fov: 40, near: 0.1, far: 500 }}
        shadows
      >
        {/* Camera controls: scroll to zoom, drag to rotate */}
        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          enableDamping
          dampingFactor={0.1}
          minDistance={3}
          maxDistance={30}
          maxPolarAngle={Math.PI / 2.5}
          minPolarAngle={Math.PI / 6}
        />

        {/* Player + follow camera + proximity */}
        <Player onPositionChange={(pos) => playerPos.current.copy(pos)} />
        <FollowCamera target={playerPos.current} controlsRef={controlsRef} />
        <ProximityChecker buildings={buildings} playerPos={playerPos} onNearbyChange={handleNearbyChange} />

        {/* Lighting */}
        <ambientLight intensity={1.5} />
        <directionalLight position={[10, 20, 10]} intensity={2} castShadow />
        <directionalLight position={[-8, 12, -8]} intensity={0.5} color="#ff6688" />
        <hemisphereLight args={['#aaccff', '#224422', 0.8]} />

        {/* Ground */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
          <planeGeometry args={[60, 60]} />
          <meshStandardMaterial color="#1a2e1a" />
        </mesh>

        {/* Trees */}
        {TREE_POS.map((pos, i) => <Tree key={`t${i}`} position={pos} />)}

        {/* Roads */}
        <ModelErrorBoundary>
          <Suspense fallback={null}>
            <RoadGrid />
          </Suspense>
        </ModelErrorBoundary>

        {/* Street lamps */}
        <ModelErrorBoundary>
          <Suspense fallback={null}>
            <GLBLamps />
          </Suspense>
        </ModelErrorBoundary>

        {/* Parked cars */}
        <ModelErrorBoundary>
          <Suspense fallback={null}>
            <ParkedCars />
          </Suspense>
        </ModelErrorBoundary>

        {/* Filler decoration buildings */}
        <ModelErrorBoundary>
          <Suspense fallback={null}>
            <FillerBuildings />
          </Suspense>
        </ModelErrorBoundary>

        {/* AI-generated case buildings (clickable) */}
        <ModelErrorBoundary>
          <Suspense fallback={null}>
            {buildings.map((b, i) => {
              const neonColor = NEON_COLORS[b.type] ?? '#ffffff'
              return (
                <group key={i}>
                  <Building
                    type={b.type}
                    position={b.position}
                    npcId={b.npc_id}
                  />
                  <group position={[b.position[0], 6, b.position[2]]}>
                    <Html center style={{ pointerEvents: 'none' }}>
                      <div style={{
                        background: 'rgba(0,0,0,0.85)',
                        border: `1px solid ${neonColor}`,
                        color: neonColor,
                        padding: '2px 8px',
                        fontFamily: '"Courier New", monospace',
                        fontSize: 11, letterSpacing: 1, whiteSpace: 'nowrap',
                        textShadow: `0 0 6px ${neonColor}`,
                      }}>
                        {b.type.toUpperCase()}
                      </div>
                    </Html>
                  </group>
                </group>
              )
            })}
          </Suspense>
        </ModelErrorBoundary>
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
          WASD to move · Press E to interact · Scroll to zoom · Drag to rotate
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
        <button
          onClick={() => setShowNotebook(true)}
          style={{
            background: '#0a0805', border: '1px solid #8B6914',
            color: '#d4b483', padding: '6px 14px',
            cursor: 'pointer', fontFamily: '"Courier New", monospace', fontSize: 11,
            letterSpacing: 1,
          }}
        >
          NOTEBOOK
        </button>
        <button
          onClick={() => setPhase('case_selection')}
          style={{
            background: '#0a0a1a', border: '1px solid #2a2a3a',
            color: '#555', padding: '6px 14px',
            cursor: 'pointer', fontFamily: '"Courier New", monospace', fontSize: 11,
          }}
        >
          ← CASES
        </button>
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
          pointerEvents: 'none',
          textShadow: '0 0 8px #ff0055',
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
