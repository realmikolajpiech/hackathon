import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Clone, Html, Text } from '@react-three/drei'
import { Suspense, useState, useMemo, Component, type ReactNode } from 'react'
import Building, { NEON_COLORS } from '../components/Building'
import DialogBox from '../components/DialogBox'
import VoiceUI from '../components/VoiceUI'
import Notebook from '../components/Notebook'
import { useGameStore } from '../store/gameStore'

<<<<<<< HEAD
export default function CityScene() {
=======
class ModelErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  render() { return this.state.hasError ? null : this.props.children }
}

// ─── Procedural tree ────────────────────────────────────────────────────────
function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 0.8, 6]} />
        <meshStandardMaterial color="#5c3a1e" />
      </mesh>
      <mesh position={[0, 1.3, 0]}>
        <coneGeometry args={[0.6, 1.2, 6]} />
        <meshStandardMaterial color="#2a5a2a" />
      </mesh>
      <mesh position={[0, 2.1, 0]}>
        <coneGeometry args={[0.45, 0.9, 6]} />
        <meshStandardMaterial color="#3a6b3a" />
      </mesh>
    </group>
  )
}

// ─── Road tile grid ─────────────────────────────────────────────────────────
function RoadGrid() {
  const { scene: cross }    = useGLTF('/models/roads/road-crossroad.glb')
  const { scene: straight } = useGLTF('/models/roads/road-straight.glb')
  const S = 4

  const tiles = useMemo(() => {
    const out: { pos: [number, number, number]; type: 'cross' | 'h' | 'v' }[] = []
    for (let x = -8; x <= 8; x += S * 2)
      for (let z = -8; z <= 8; z += S * 2)
        out.push({ pos: [x, 0, z], type: 'cross' })
    for (let x = -8 + S; x < 8; x += S * 2)
      for (let z = -8; z <= 8; z += S * 2)
        out.push({ pos: [x, 0, z], type: 'h' })
    for (let x = -8; x <= 8; x += S * 2)
      for (let z = -8 + S; z < 8; z += S * 2)
        out.push({ pos: [x, 0, z], type: 'v' })
    return out
  }, [])

  return (
    <group>
      {tiles.map((t, i) => (
        <Clone
          key={i}
          object={t.type === 'cross' ? cross : straight}
          position={t.pos}
          scale={2}
          rotation={t.type === 'h' ? [0, Math.PI / 2, 0] : [0, 0, 0]}
        />
      ))}
    </group>
  )
}

// ─── Street lamps (GLB) ────────────────────────────────────────────────────
const LAMP_POS: [number, number, number][] = [
  [-6, 0, -6], [6, 0, -6], [-6, 0, 6], [6, 0, 6],
]

function GLBLamps() {
  const { scene: lamp } = useGLTF('/models/roads/streetlamp.glb')
  return (
    <group>
      {LAMP_POS.map((pos, i) => (
        <group key={i} position={pos}>
          <Clone object={lamp} scale={2} />
          <pointLight position={[0, 7, 0]} color="#ffc060" intensity={8} distance={20} />
        </group>
      ))}
    </group>
  )
}

// ─── Parked cars (GLB) ──────────────────────────────────────────────────────
function ParkedCars() {
  const { scene: police } = useGLTF('/models/cars/police.glb')
  const { scene: sedan }  = useGLTF('/models/cars/sedan-sports.glb')
  return (
    <group>
      <Clone object={sedan}  position={[-3, 0, 9]}  scale={2} />
      <Clone object={police} position={[9, 0, 3]}   scale={2} rotation={[0, Math.PI / 2, 0]} />
      <Clone object={sedan}  position={[3, 0, -9]}  scale={2} />
    </group>
  )
}

// ─── Trees ──────────────────────────────────────────────────────────────────
const TREE_POS: [number, number, number][] = [
  [-5, 0, -7], [5, 0, -7], [-7, 0, -3], [7, 0, -3],
  [-7, 0, 4],  [7, 0, 4],  [-5, 0, 7],  [5, 0, 7],
  [-3, 0, -3], [3, 0, -3], [-3, 0, 3],  [3, 0, 3],
]

// ─── Main scene ─────────────────────────────────────────────────────────────
interface CitySceneProps { apiKey: string }

export default function CityScene({ apiKey }: CitySceneProps) {
>>>>>>> 1f40483 (update)
  const {
    currentCase, activeNPC,
    setActiveNPC, setCurrentInterior, setPhase, world,
  } = useGameStore()
  const [showNotebook, setShowNotebook] = useState(false)

  if (!currentCase) return null
  const buildings = currentCase.map_layout.buildings

  function handleBuildingClick(npcId: string | null, buildingType: string) {
    const interior = currentCase!.interiors?.find((i) => i.building_type === buildingType)
    if (interior) { setCurrentInterior(interior); setPhase('interior'); return }
    if (npcId) {
      const npc = currentCase!.npcs.find((n) => n.id === npcId)
      if (npc) setActiveNPC(npc)
    }
  }

  function handleTranscript(text: string) {
    const { activeNPC: npc, addMessage } = useGameStore.getState()
    if (npc) addMessage(npc.id, { role: 'assistant', content: text })
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a1a', position: 'relative' }}>
      <Canvas
        camera={{ position: [18, 18, 18], fov: 45, near: 0.1, far: 500 }}
        shadows
      >
        {/* Let user orbit to see the scene */}
        <OrbitControls
          target={[0, 2, 0]}
          maxPolarAngle={Math.PI / 2.5}
          minDistance={10}
          maxDistance={60}
        />

        {/* Strong clear lighting */}
        <ambientLight intensity={1.5} />
        <directionalLight position={[15, 30, 15]} intensity={2} castShadow />
        <directionalLight position={[-10, 15, -10]} intensity={0.8} color="#ff6688" />
        <hemisphereLight args={['#aaccff', '#224422', 1]} />

        {/* Ground — large dark green plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
          <planeGeometry args={[80, 80]} />
          <meshStandardMaterial color="#1a2e1a" />
        </mesh>

        {/* Trees (procedural, always render) */}
        {TREE_POS.map((pos, i) => <Tree key={`t${i}`} position={pos} />)}

        {/* Fallback building boxes (always render, no GLB needed) */}
        {buildings.map((b, i) => {
          const neonColor = NEON_COLORS[b.type] ?? '#ffffff'
          return (
            <group key={`fb${i}`}>
              <Building
                type={b.type}
                position={b.position}
                npcId={b.npc_id}
                onClick={() => handleBuildingClick(b.npc_id, b.type)}
                useGLB={false}
              />
              {/* Label */}
              <group position={[b.position[0], 10, b.position[2]]}>
                <Html center style={{ pointerEvents: 'none' }}>
                  <div style={{
                    background: 'rgba(0,0,0,0.8)',
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

        {/* GLB assets — load async, isolated by error boundaries */}
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

        {/* GLB building overlays */}
        <ModelErrorBoundary>
          <Suspense fallback={null}>
            {buildings.map((b, i) => (
              <Building
                key={`glb${i}`}
                type={b.type}
                position={b.position}
                npcId={b.npc_id}
                onClick={() => handleBuildingClick(b.npc_id, b.type)}
                useGLB={true}
              />
            ))}
          </Suspense>
        </ModelErrorBoundary>
      </Canvas>

      {/* ── HUD ── */}
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
          Click a building to enter · Scroll to zoom · Drag to rotate
        </div>
      </div>

      <div style={{ position: 'fixed', top: 16, right: 16, display: 'flex', gap: 8 }}>
        <button onClick={() => setShowNotebook(true)} style={{
          background: '#0a0805', border: '1px solid #8B6914',
          color: '#d4b483', padding: '6px 14px', cursor: 'pointer',
          fontFamily: '"Courier New", monospace', fontSize: 11, letterSpacing: 1,
        }}>NOTEBOOK</button>
        <button onClick={() => setPhase('case_selection')} style={{
          background: '#0a0a1a', border: '1px solid #2a2a3a',
          color: '#555', padding: '6px 14px', cursor: 'pointer',
          fontFamily: '"Courier New", monospace', fontSize: 11,
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

      {activeNPC && (
        <>
<<<<<<< HEAD
          <DialogBox onClose={handleCloseDialog} />
          <VoiceUI onTranscript={handleTranscript} />
=======
          <DialogBox apiKey={apiKey} onClose={() => setActiveNPC(null)} />
          <VoiceUI apiKey={apiKey} onTranscript={handleTranscript} />
>>>>>>> 1f40483 (update)
        </>
      )}
      {showNotebook && <Notebook onClose={() => setShowNotebook(false)} />}
    </div>
  )
}
