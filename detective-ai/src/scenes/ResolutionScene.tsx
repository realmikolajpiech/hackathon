import { useGameStore } from '../store/gameStore'

export default function ResolutionScene() {
  const { currentCase, accusation, reset } = useGameStore()

  if (!currentCase || !accusation) return null

  const isCorrect = accusation === currentCase.case.solution.murderer_id
  const accusedNPC = currentCase.npcs.find((n) => n.id === accusation)
  const murdererNPC = currentCase.npcs.find((n) => n.id === currentCase.case.solution.murderer_id)

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: isCorrect ? '#020a02' : '#0a0202',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Courier New", monospace',
    }}>
      <div style={{
        textAlign: 'center', maxWidth: 500, padding: 40,
        border: `1px solid ${isCorrect ? '#00ff88' : '#ff0055'}`,
        boxShadow: `0 0 60px ${isCorrect ? 'rgba(0,255,136,0.2)' : 'rgba(255,0,85,0.2)'}`,
      }}>
        <div style={{
          fontSize: 64, marginBottom: 16,
        }}>
          {isCorrect ? '✓' : '✗'}
        </div>

        <h1 style={{
          color: isCorrect ? '#00ff88' : '#ff0055',
          fontSize: 28, letterSpacing: 4, margin: '0 0 8px',
        }}>
          {isCorrect ? 'CASE CLOSED' : 'WRONG SUSPECT'}
        </h1>

        <div style={{ color: '#888', fontSize: 13, marginBottom: 32 }}>
          {isCorrect
            ? `You correctly identified ${accusedNPC?.name} as the killer.`
            : `${accusedNPC?.name} was innocent. The real killer was ${murdererNPC?.name}.`}
        </div>

        {!isCorrect && (
          <div style={{
            color: '#d4b483', fontSize: 12, marginBottom: 24,
            padding: '12px 16px', border: '1px solid #8B691433',
            background: '#12100a', textAlign: 'left', lineHeight: 1.8,
          }}>
            <div style={{ color: '#888', marginBottom: 8, letterSpacing: 2, fontSize: 11 }}>
              THE TRUTH
            </div>
            <div>The murderer was <strong style={{ color: '#ff0055' }}>{murdererNPC?.name}</strong></div>
            <div>Weapon: {currentCase.case.murder_weapon}</div>
            <div>Motive: {currentCase.case.motive}</div>
          </div>
        )}

        <button onClick={reset} style={{
          background: isCorrect ? '#00ff88' : '#8B0000',
          border: 'none',
          color: isCorrect ? '#020a02' : '#fff',
          padding: '12px 40px',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 14,
          fontWeight: 'bold',
          letterSpacing: 2,
        }}>
          NEW GAME
        </button>
      </div>
    </div>
  )
}
