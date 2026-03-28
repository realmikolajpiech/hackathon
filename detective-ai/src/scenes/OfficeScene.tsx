import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { generateCase } from '../ai/generateCase'

interface OfficeSceneProps {
  apiKey: string
}

export default function OfficeScene({ apiKey }: OfficeSceneProps) {
  const [showComputer, setShowComputer] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { setCurrentCase, setPhase, currentCase } = useGameStore()

  async function handleGenerateCase() {
    setIsGenerating(true)
    setError(null)
    try {
      const caseData = await generateCase(apiKey)
      setCurrentCase(caseData)
    } catch (e) {
      setError('Failed to generate case. Check your API key.')
      console.error(e)
    }
    setIsGenerating(false)
  }

  function handleGoToCity() {
    setPhase('city')
    setShowComputer(false)
  }

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'linear-gradient(180deg, #0a0508 0%, #12080a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Courier New", monospace', color: '#d4b483',
      position: 'relative',
    }}>
      {/* Office background elements */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.05, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(0deg, #d4b483 0px, #d4b483 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, #d4b483 0px, #d4b483 1px, transparent 1px, transparent 40px)',
      }} />

      <div style={{
        position: 'absolute', top: 20, left: 20, fontSize: 11, color: '#555',
        letterSpacing: 3,
      }}>
        DETECTIVE'S OFFICE — 3RD FLOOR
      </div>

      {!showComputer ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 11, letterSpacing: 4, color: '#888', marginBottom: 12,
          }}>
            YOUR OFFICE
          </div>
          <h1 style={{
            fontSize: 48, margin: '0 0 8px', color: '#d4b483',
            textShadow: '0 0 20px rgba(212,180,131,0.5)',
            letterSpacing: 6,
          }}>
            DETECTIVE AI
          </h1>
          <div style={{ color: '#555', fontSize: 14, marginBottom: 48 }}>
            A noir mystery game
          </div>
          <div style={{
            fontSize: 50, marginBottom: 32, cursor: 'pointer',
            filter: 'drop-shadow(0 0 10px #d4b483)',
          }}
            onClick={() => setShowComputer(true)}
            title="Click the computer"
          >
            🖥
          </div>
          <div style={{ color: '#555', fontSize: 12 }}>
            Click the computer to receive a case
          </div>
        </div>
      ) : (
        <div style={{
          width: 520, background: '#0a080a',
          border: '1px solid #8B6914', padding: 32,
          boxShadow: '0 0 60px rgba(139,105,20,0.2)',
        }}>
          <div style={{ fontSize: 11, letterSpacing: 4, color: '#555', marginBottom: 20 }}>
            INCOMING CASES
          </div>

          {!currentCase && !isGenerating && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#888', marginBottom: 24, fontSize: 13 }}>
                No active cases. Generate a new one?
              </div>
              <button onClick={handleGenerateCase} style={{
                background: '#8B6914', border: 'none', color: '#0a0805',
                padding: '12px 32px', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 14, fontWeight: 'bold',
                letterSpacing: 2,
              }}>
                GENERATE CASE
              </button>
            </div>
          )}

          {isGenerating && (
            <div style={{ textAlign: 'center', color: '#888', padding: '32px 0' }}>
              <div style={{ fontSize: 24, marginBottom: 12 }}>⌛</div>
              <div style={{ letterSpacing: 2, fontSize: 12 }}>
                RECEIVING TRANSMISSION...
              </div>
            </div>
          )}

          {error && (
            <div style={{ color: '#ff4444', fontSize: 12, marginBottom: 16, textAlign: 'center' }}>
              {error}
            </div>
          )}

          {currentCase && !isGenerating && (
            <div>
              <div style={{
                fontSize: 20, color: '#d4b483', marginBottom: 16,
                textShadow: '0 0 10px rgba(212,180,131,0.3)',
              }}>
                {currentCase.case.title}
              </div>
              <div style={{ fontSize: 12, color: '#888', lineHeight: 1.8 }}>
                <div>Victim: <span style={{ color: '#d4b483' }}>{currentCase.case.victim.name}</span></div>
                <div>Occupation: {currentCase.case.victim.occupation}</div>
                <div>Time of death: {currentCase.case.time_of_death}</div>
                <div>Location: {currentCase.case.location}</div>
                <div style={{ marginTop: 12 }}>
                  Suspects: {currentCase.npcs.length}
                </div>
              </div>
              <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
                <button onClick={handleGoToCity} style={{
                  flex: 1, background: '#8B0000', border: '1px solid #ff0055',
                  color: '#fff', padding: '10px', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 13, letterSpacing: 1,
                }}>
                  INVESTIGATE
                </button>
                <button onClick={handleGenerateCase} style={{
                  background: 'transparent', border: '1px solid #555',
                  color: '#888', padding: '10px 16px', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 11,
                }}>
                  NEW CASE
                </button>
              </div>
            </div>
          )}

          <button onClick={() => setShowComputer(false)} style={{
            marginTop: 20, background: 'transparent', border: 'none',
            color: '#444', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 11, padding: 0,
          }}>
            ← back
          </button>
        </div>
      )}
    </div>
  )
}
