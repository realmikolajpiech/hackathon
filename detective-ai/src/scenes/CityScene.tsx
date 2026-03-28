import { Canvas } from '@react-three/fiber'
import { OrthographicCamera, Stars } from '@react-three/drei'
import { Suspense, useState } from 'react'
import Building from '../components/Building'
import DialogBox from '../components/DialogBox'
import VoiceUI from '../components/VoiceUI'
import Notebook from '../components/Notebook'
import { useGameStore } from '../store/gameStore'

interface CitySceneProps {
  apiKey: string
}

export default function CityScene({ apiKey }: CitySceneProps) {
  const { currentCase, setActiveNPC, setPhase, activeNPC } = useGameStore()
  const [showNotebook, setShowNotebook] = useState(false)

  if (!currentCase) return null

  const buildings = currentCase.map_layout.buildings

  function handleBuildingClick(npcId: string | null) {
    if (!npcId) return
    const npc = currentCase!.npcs.find((n) => n.id === npcId)
    if (npc) {
      setActiveNPC(npc)
      setPhase('dialogue')
    }
  }

  function handleCloseDialog() {
    setActiveNPC(null)
    setPhase('city')
  }

  function handleTranscript(text: string) {
    const { addMessage, activeNPC: npc } = useGameStore.getState()
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
        <directionalLight
          position={[5, 10, 5]}
          intensity={0.4}
          color="#4040ff"
          castShadow
        />
        <pointLight position={[0, 8, 0]} intensity={1} color="#ff0055" distance={20} />

        {/* Ground */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[30, 30]} />
          <meshStandardMaterial color="#080810" roughness={1} />
        </mesh>

        {/* Grid lines on ground */}
        <gridHelper args={[30, 30, '#1a1a3a', '#111122']} position={[0, 0, 0]} />

        <Suspense fallback={null}>
          {buildings.map((b, i) => (
            <Building
              key={i}
              type={b.type}
              position={b.position}
              npcId={b.npc_id}
              onClick={() => handleBuildingClick(b.npc_id)}
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
        <div style={{ color: '#ff0055', fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>
          {currentCase.case.title}
        </div>
        <div>Victim: {currentCase.case.victim.name}</div>
        <div style={{ marginTop: 4, color: '#555' }}>Click a building to investigate</div>
      </div>

      {/* Top-right buttons */}
      <div style={{ position: 'fixed', top: 16, right: 16, display: 'flex', gap: 8 }}>
        <button
          onClick={() => setShowNotebook(true)}
          style={{
            background: '#0a0805', border: '1px solid #8B6914',
            color: '#d4b483', padding: '6px 14px',
            cursor: 'pointer', fontFamily: '"Courier New", monospace',
            fontSize: 12,
          }}
        >
          NOTEBOOK
        </button>
        <button
          onClick={() => setPhase('office')}
          style={{
            background: '#0a0a1a', border: '1px solid #333',
            color: '#888', padding: '6px 14px',
            cursor: 'pointer', fontFamily: '"Courier New", monospace',
            fontSize: 12,
          }}
        >
          ← OFFICE
        </button>
      </div>

      {activeNPC && (
        <>
          <DialogBox apiKey={apiKey} onClose={handleCloseDialog} />
          <VoiceUI apiKey={apiKey} onTranscript={handleTranscript} />
        </>
      )}

      {showNotebook && <Notebook onClose={() => setShowNotebook(false)} />}
    </div>
  )
}
