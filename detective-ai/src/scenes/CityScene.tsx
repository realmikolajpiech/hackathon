import { Canvas } from '@react-three/fiber'
import { OrthographicCamera, Stars } from '@react-three/drei'
import { Suspense, useState } from 'react'
import Building from '../components/Building'
import DialogBox from '../components/DialogBox'
import VoiceUI from '../components/VoiceUI'
import Notebook from '../components/Notebook'
import { useGameStore } from '../store/gameStore'

export default function CityScene() {
  const {
    currentCase,
    activeNPC,
    setActiveNPC,
    setCurrentInterior,
    setPhase,
    world,
  } = useGameStore()
  const [showNotebook, setShowNotebook] = useState(false)

  if (!currentCase) return null

  const buildings = currentCase.map_layout.buildings

  function handleBuildingClick(npcId: string | null, buildingType: string) {
    // Prefer interior exploration if available
    const interior = currentCase!.interiors?.find((i) => i.building_type === buildingType)
    if (interior) {
      setCurrentInterior(interior)
      setPhase('interior')
      return
    }
    // Fallback: open dialogue directly (for cases without interiors defined)
    if (npcId) {
      const npc = currentCase!.npcs.find((n) => n.id === npcId)
      if (npc) setActiveNPC(npc)
    }
  }

  function handleCloseDialog() {
    setActiveNPC(null)
  }

  function handleTranscript(text: string) {
    const { activeNPC: npc, addMessage } = useGameStore.getState()
    if (npc) {
      addMessage(npc.id, { role: 'assistant', content: text })
    }
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#050510', position: 'relative' }}>
      <Canvas shadows>
        <OrthographicCamera
          makeDefault
          position={[12, 12, 12]}
          zoom={55}
          near={0.1}
          far={200}
        />

        <Stars radius={80} depth={50} count={3000} factor={3} fade speed={0.3} />

        <ambientLight intensity={0.15} color="#1a1a3a" />
        <directionalLight position={[5, 10, 5]} intensity={0.4} color="#4040ff" castShadow />
        <pointLight position={[0, 8, 0]} intensity={1} color="#ff0055" distance={20} />

        {/* Ground */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[30, 30]} />
          <meshStandardMaterial color="#080810" roughness={1} />
        </mesh>

        <gridHelper args={[30, 30, '#1a1a3a', '#111122']} position={[0, 0, 0]} />

        <Suspense fallback={null}>
          {buildings.map((b, i) => (
            <Building
              key={i}
              type={b.type}
              position={b.position}
              npcId={b.npc_id}
              onClick={() => handleBuildingClick(b.npc_id, b.type)}
            />
          ))}
        </Suspense>
      </Canvas>

      {/* HUD */}
      <div style={{
        position: 'fixed', top: 16, left: 16,
        fontFamily: '"Courier New", monospace', color: '#888',
        fontSize: 12, pointerEvents: 'none',
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
          Click a building to enter
        </div>
      </div>

      {/* Top-right controls */}
      <div style={{ position: 'fixed', top: 16, right: 16, display: 'flex', gap: 8 }}>
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

      {/* Suspects list hint */}
      <div style={{
        position: 'fixed', bottom: 16, left: 16,
        fontFamily: '"Courier New", monospace', fontSize: 11,
        color: '#444', pointerEvents: 'none',
      }}>
        {currentCase.npcs.map((npc) => {
          const building = buildings.find((b) => b.npc_id === npc.id)
          return (
            <div key={npc.id} style={{ marginBottom: 3 }}>
              <span style={{ color: '#555' }}>{npc.name}</span>
              <span style={{ color: '#333' }}> — {building?.type ?? '?'}</span>
            </div>
          )
        })}
      </div>

      {/* Fallback dialogue (when no interior) */}
      {activeNPC && (
        <>
          <DialogBox onClose={handleCloseDialog} />
          <VoiceUI onTranscript={handleTranscript} />
        </>
      )}

      {showNotebook && <Notebook onClose={() => setShowNotebook(false)} />}
    </div>
  )
}
