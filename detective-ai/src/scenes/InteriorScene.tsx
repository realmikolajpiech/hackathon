import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import DialogBox from '../components/DialogBox'
import VoiceUI from '../components/VoiceUI'
import Notebook from '../components/Notebook'

interface InteriorSceneProps {
  apiKey: string
}

export default function InteriorScene({ apiKey }: InteriorSceneProps) {
  const {
    currentInterior,
    currentCase,
    activeNPC,
    setActiveNPC,
    setCurrentInterior,
    setPhase,
    examineObject,
    examinedObjects,
    accuse,
    addNote,
  } = useGameStore()
  const [showNotebook, setShowNotebook] = useState(false)

  if (!currentInterior || !currentCase) return null

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const interior = currentInterior!

  // Find the NPC assigned to this building type
  const buildingData = currentCase.map_layout.buildings.find(
    (b) => b.type === interior.building_type
  )
  const npc = buildingData?.npc_id
    ? currentCase.npcs.find((n) => n.id === buildingData.npc_id) ?? null
    : null

  function handleExit() {
    setActiveNPC(null)
    setCurrentInterior(null)
    setPhase('city')
  }

  function handleTalkToNPC() {
    if (npc) setActiveNPC(npc)
  }

  function handleCloseDialog() {
    setActiveNPC(null)
  }

  function handleTranscript(text: string) {
    const { activeNPC: npcNow, addMessage } = useGameStore.getState()
    if (npcNow) {
      addMessage(npcNow.id, { role: 'assistant', content: text })
    }
  }

  function handleExamine(objId: string, examineText: string) {
    examineObject(objId)
    addNote(`[${interior.name}] ${examineText}`)
  }

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: '#050510',
      display: 'flex', flexDirection: 'column',
      fontFamily: '"Courier New", monospace', color: '#d4b483',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Scanlines */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.025,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 3px)',
        zIndex: 10,
      }} />

      {/* Top bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 20px',
        borderBottom: '1px solid #1a1a2e',
        background: 'rgba(3,3,12,0.95)',
        zIndex: 5, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handleExit}
            style={{
              background: 'transparent', border: '1px solid #2a2a3a',
              color: '#666', padding: '4px 10px', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 10, letterSpacing: 1,
            }}
          >
            ← CITY
          </button>
          <div>
            <span style={{ color: '#444', fontSize: 10 }}>
              {currentCase.case.title.toUpperCase()} ·{' '}
            </span>
            <span style={{ color: '#d4b483', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 }}>
              {currentInterior.name.toUpperCase()}
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowNotebook(true)}
          style={{
            background: 'transparent', border: '1px solid #8B6914',
            color: '#d4b483', padding: '4px 12px', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 10, letterSpacing: 1,
          }}
        >
          NOTEBOOK
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '40px 0',
        paddingBottom: activeNPC ? '48vh' : '40px',
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 40px' }}>
          {/* Atmosphere tag */}
          <div style={{
            fontSize: 10, color: '#555', letterSpacing: 3,
            marginBottom: 10, textTransform: 'uppercase',
          }}>
            {currentInterior.atmosphere}
          </div>

          {/* Scene description */}
          <div style={{
            fontSize: 15, color: '#b8965a', lineHeight: 2,
            marginBottom: 40, fontStyle: 'italic',
            borderLeft: '2px solid #8B691433',
            paddingLeft: 18,
          }}>
            {currentInterior.description}
          </div>

          {/* NPC panel */}
          {npc && !activeNPC && (
            <div style={{
              marginBottom: 36, padding: '16px 20px',
              border: '1px solid #ff005533',
              background: 'rgba(255,0,85,0.04)',
            }}>
              <div style={{ fontSize: 10, color: '#ff0055', marginBottom: 8, letterSpacing: 2 }}>
                PERSON PRESENT
              </div>
              <div style={{ fontSize: 15, color: '#e0e0e0', marginBottom: 4 }}>
                <strong>{npc.name}</strong>
              </div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 14 }}>
                {npc.occupation}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleTalkToNPC}
                  style={{
                    background: '#8B0000', border: '1px solid #ff0055',
                    color: '#fff', padding: '7px 18px', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 12, letterSpacing: 1,
                  }}
                >
                  INTERROGATE {npc.name.split(' ')[0].toUpperCase()}
                </button>
                <button
                  onClick={() => accuse(npc.id)}
                  style={{
                    background: 'transparent', border: '1px solid #ff0055',
                    color: '#ff0055', padding: '7px 18px', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 12, letterSpacing: 1,
                  }}
                >
                  ACCUSE
                </button>
              </div>
            </div>
          )}

          {/* Objects */}
          <div>
            <div style={{
              fontSize: 10, color: '#555', letterSpacing: 3,
              marginBottom: 16, textTransform: 'uppercase',
            }}>
              Examine surroundings
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {currentInterior.objects.map((obj) => {
                const examined = examinedObjects.includes(obj.id)
                return (
                  <div key={obj.id}>
                    <div
                      onClick={() => !examined && handleExamine(obj.id, obj.examine_text)}
                      style={{
                        padding: '10px 14px',
                        border: `1px solid ${examined ? '#8B691444' : '#1e1e2e'}`,
                        background: examined ? 'rgba(139,105,20,0.06)' : 'transparent',
                        cursor: examined ? 'default' : 'pointer',
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        if (!examined) {
                          const el = e.currentTarget as HTMLElement
                          el.style.borderColor = '#8B6914'
                          el.style.background = 'rgba(139,105,20,0.05)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!examined) {
                          const el = e.currentTarget as HTMLElement
                          el.style.borderColor = '#1e1e2e'
                          el.style.background = 'transparent'
                        }
                      }}
                    >
                      <span style={{ fontSize: 13, color: examined ? '#d4b483' : '#666' }}>
                        {examined ? '▸ ' : '○ '}
                        {obj.name}
                      </span>
                      {!examined && (
                        <span style={{ fontSize: 9, color: '#444', letterSpacing: 2 }}>
                          EXAMINE
                        </span>
                      )}
                    </div>

                    {examined && (
                      <div style={{
                        padding: '12px 16px 12px 28px',
                        background: 'rgba(3,3,12,0.7)',
                        borderLeft: '2px solid #8B6914',
                        marginLeft: 14,
                        fontSize: 13, color: '#b8965a',
                        lineHeight: 1.8, fontStyle: 'italic',
                      }}>
                        {obj.examine_text}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Dialogue overlay */}
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
