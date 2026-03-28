import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { generateWorld } from '../ai/generateWorld'

export default function OfficeScene() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showIntro, setShowIntro] = useState(true)
  const { setWorld, setPhase } = useGameStore()

  async function handleNewGame() {
    setIsGenerating(true)
    setError(null)
    try {
      const world = await generateWorld()
      setWorld(world)
      setPhase('case_selection')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      console.error(e)
    }
    setIsGenerating(false)
  }

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'linear-gradient(180deg, #050308 0%, #0a0508 50%, #12080a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Courier New", monospace', color: '#d4b483',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Grid overlay */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none',
        backgroundImage: [
          'repeating-linear-gradient(0deg, #d4b483 0px, #d4b483 1px, transparent 1px, transparent 40px)',
          'repeating-linear-gradient(90deg, #d4b483 0px, #d4b483 1px, transparent 1px, transparent 40px)',
        ].join(', '),
      }} />

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.8) 100%)',
      }} />

      <div style={{ position: 'absolute', top: 20, left: 20, fontSize: 10, color: '#444', letterSpacing: 3 }}>
        DETECTIVE'S OFFICE — 3RD FLOOR, WEST WING
      </div>
      <div style={{ position: 'absolute', top: 20, right: 20, fontSize: 10, color: '#444', letterSpacing: 2 }}>
        11:47 PM
      </div>

      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 10, letterSpacing: 6, color: '#666', marginBottom: 16, textTransform: 'uppercase' }}>
          A noir mystery game
        </div>

        <h1 style={{
          fontSize: 64, margin: '0 0 4px', color: '#d4b483',
          textShadow: '0 0 40px rgba(212,180,131,0.5), 0 0 80px rgba(212,180,131,0.2)',
          letterSpacing: 10, fontWeight: 'normal',
        }}>
          DETECTIVE
        </h1>
        <h2 style={{
          fontSize: 28, margin: '0 0 48px', color: '#8B6914',
          letterSpacing: 16, fontWeight: 'normal',
          textShadow: '0 0 20px rgba(139,105,20,0.4)',
        }}>
          A I
        </h2>

        {isGenerating ? (
          <div>
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 24, color: '#d4b483' }}>▪</span>
              <span style={{ fontSize: 24, color: '#8B6914', margin: '0 4px' }}>▪</span>
              <span style={{ fontSize: 24, color: '#d4b483' }}>▪</span>
            </div>
            <div style={{ color: '#888', letterSpacing: 4, fontSize: 11 }}>
              GENERATING CITY...
            </div>
            <div style={{ color: '#555', fontSize: 11, marginTop: 8 }}>
              Building world, placing suspects, hiding evidence
            </div>
          </div>
        ) : (
          <div>
            <button
              onClick={handleNewGame}
              style={{
                background: '#8B0000',
                border: '2px solid #ff0055',
                color: '#fff',
                padding: '14px 56px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 15,
                fontWeight: 'bold',
                letterSpacing: 5,
                boxShadow: '0 0 30px rgba(255,0,85,0.3)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 0 50px rgba(255,0,85,0.5)'
                ;(e.currentTarget as HTMLElement).style.background = '#aa0000'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 0 30px rgba(255,0,85,0.3)'
                ;(e.currentTarget as HTMLElement).style.background = '#8B0000'
              }}
            >
              NEW GAME
            </button>
            <div style={{ color: '#444', fontSize: 11, marginTop: 16, letterSpacing: 1 }}>
              A new city. Four open cases. The truth is out there.
            </div>
          </div>
        )}

        {error && (
          <div style={{
            color: '#ff4444', fontSize: 12, marginTop: 24,
            padding: '8px 16px', border: '1px solid #ff444433',
            background: 'rgba(255,0,0,0.05)',
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Intro overlay */}
      {showIntro && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 100,
          background: 'rgba(2,1,4,0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: '"Courier New", monospace',
        }}>
          <div style={{
            maxWidth: 560, width: '90%',
            border: '1px solid #3a2a0a',
            background: 'linear-gradient(180deg, #0e0805 0%, #0a0608 100%)',
            padding: '40px 44px',
            boxShadow: '0 0 60px rgba(212,180,131,0.08)',
            color: '#d4b483',
          }}>
            <div style={{ fontSize: 9, letterSpacing: 6, color: '#555', marginBottom: 20, textTransform: 'uppercase' }}>
              Case briefing — classified
            </div>

            <h2 style={{ fontSize: 22, letterSpacing: 6, fontWeight: 'normal', margin: '0 0 20px', color: '#d4b483' }}>
              HOW TO PLAY
            </h2>

            <p style={{ fontSize: 13, lineHeight: 1.8, color: '#a08040', margin: '0 0 18px' }}>
              A murder has been committed. You are the detective. The city is yours to explore — but the killer is still out there.
            </p>

            <div style={{ borderLeft: '2px solid #3a2a0a', paddingLeft: 16, marginBottom: 18 }}>
              {[
                ['1. PICK A CASE', 'Choose one of the open murder cases. Each is AI-generated — unique every run.'],
                ['2. EXPLORE THE CITY', 'Walk around the city. Visit locations: bars, apartments, warehouses. Click on buildings to enter.'],
                ['3. TALK TO SUSPECTS', 'Inside locations you\'ll find NPCs. Talk to them — they may lie, deflect, or reveal crucial details.'],
                ['4. COLLECT EVIDENCE', 'Clues are hidden around each scene. Pick them up and they go into your notebook automatically.'],
                ['5. MAKE YOUR ACCUSATION', 'When you\'re confident, return to your Detective Office and name the killer. Get it wrong and the case goes cold.'],
              ].map(([title, desc]) => (
                <div key={title as string} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, letterSpacing: 3, color: '#d4b483', marginBottom: 4 }}>{title}</div>
                  <div style={{ fontSize: 12, color: '#7a6030', lineHeight: 1.6 }}>{desc}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, color: '#555', marginBottom: 28, letterSpacing: 1 }}>
              TIP — Every case is generated fresh by AI. Suspects, motives, and evidence change each game.
            </div>

            <button
              onClick={() => setShowIntro(false)}
              style={{
                background: '#8B0000',
                border: '2px solid #ff0055',
                color: '#fff',
                padding: '12px 40px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 'bold',
                letterSpacing: 5,
                boxShadow: '0 0 30px rgba(255,0,85,0.3)',
                transition: 'all 0.2s',
                display: 'block',
                width: '100%',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 0 50px rgba(255,0,85,0.5)'
                ;(e.currentTarget as HTMLElement).style.background = '#aa0000'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 0 30px rgba(255,0,85,0.3)'
                ;(e.currentTarget as HTMLElement).style.background = '#8B0000'
              }}
            >
              I'M READY
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
