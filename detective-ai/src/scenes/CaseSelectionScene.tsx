import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { generateCase } from '../ai/generateCase'

const TYPE_ICONS: Record<string, string> = {
  murder: '🔪',
  theft: '💰',
  kidnapping: '🔗',
  fraud: '📋',
  disappearance: '👻',
  extortion: '⚠',
}

const TYPE_COLORS: Record<string, string> = {
  murder: '#ff0055',
  theft: '#ffaa00',
  kidnapping: '#aa44ff',
  fraud: '#00aaff',
  disappearance: '#888888',
  extortion: '#ff6600',
}

export default function CaseSelectionScene() {
  const { world, setCurrentCase, setPhase, reset } = useGameStore()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!world) return null

  async function handleSelectCase(caseId: string) {
    const summary = world!.cases.find((c) => c.id === caseId)
    if (!summary || loadingId) return

    setLoadingId(caseId)
    setError(null)
    try {
      const fullCase = await generateCase(summary, world!.city.name)
      setCurrentCase(fullCase)
      setPhase('city')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      console.error(e)
    }
    setLoadingId(null)
  }

  const isLoading = loadingId !== null

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'linear-gradient(180deg, #050310 0%, #0a0508 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      fontFamily: '"Courier New", monospace', color: '#d4b483',
      overflowY: 'auto', padding: '48px 20px',
      boxSizing: 'border-box',
    }}>
      {/* City header */}
      <div style={{ textAlign: 'center', marginBottom: 48, maxWidth: 600 }}>
        <div style={{ fontSize: 10, letterSpacing: 4, color: '#555', marginBottom: 12, textTransform: 'uppercase' }}>
          Case Files — Detective's Desk
        </div>
        <h1 style={{
          fontSize: 40, margin: '0 0 12px', color: '#d4b483',
          textShadow: '0 0 20px rgba(212,180,131,0.4)',
          letterSpacing: 5, fontWeight: 'normal',
        }}>
          {world.city.name.toUpperCase()}
        </h1>
        <p style={{
          color: '#666', fontSize: 13, lineHeight: 1.8,
          fontStyle: 'italic', margin: '0 0 20px',
        }}>
          {world.city.atmosphere}
        </p>
        <div style={{ fontSize: 11, color: '#555', letterSpacing: 3, textTransform: 'uppercase' }}>
          Four open cases. Choose one to investigate.
        </div>
      </div>

      {/* Case cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
        gap: 16, maxWidth: 720, width: '100%',
        marginBottom: 32,
      }}>
        {world.cases.map((c) => {
          const isThisLoading = loadingId === c.id
          const color = TYPE_COLORS[c.type] ?? '#d4b483'
          const icon = TYPE_ICONS[c.type] ?? '📁'

          return (
            <div
              key={c.id}
              onClick={() => !isLoading && handleSelectCase(c.id)}
              style={{
                background: '#08060a',
                border: `1px solid ${isThisLoading ? color : '#222'}`,
                padding: 24,
                cursor: isLoading ? 'default' : 'pointer',
                opacity: isLoading && !isThisLoading ? 0.4 : 1,
                transition: 'border-color 0.15s, box-shadow 0.15s, opacity 0.2s',
                boxShadow: isThisLoading ? `0 0 20px ${color}33` : 'none',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = color
                  el.style.boxShadow = `0 0 16px ${color}22`
                }
              }}
              onMouseLeave={(e) => {
                if (!isThisLoading) {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = '#222'
                  el.style.boxShadow = 'none'
                }
              }}
            >
              {/* Case type badge */}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 14,
              }}>
                <span style={{
                  fontSize: 10, color, letterSpacing: 2,
                  textTransform: 'uppercase',
                }}>
                  {icon} {c.type}
                </span>
                <span style={{ color: '#444', fontSize: 10, letterSpacing: 1 }}>
                  FILE #{c.id.replace('case_', '0')}
                </span>
              </div>

              {/* Title */}
              <div style={{
                fontSize: 16, color: '#d4b483', marginBottom: 10,
                lineHeight: 1.3, letterSpacing: 1,
              }}>
                {c.title}
              </div>

              {/* Hook */}
              <div style={{
                fontSize: 12, color: '#777', marginBottom: 16,
                lineHeight: 1.7, fontStyle: 'italic',
                borderLeft: `2px solid ${color}44`,
                paddingLeft: 10,
              }}>
                "{c.hook}"
              </div>

              {/* Details */}
              <div style={{
                borderTop: '1px solid #1a1a1a', paddingTop: 12,
                fontSize: 11, color: '#555', lineHeight: 2,
              }}>
                <div>
                  <span style={{ color: '#444' }}>Victim:</span>{' '}
                  <span style={{ color: '#d4b483' }}>{c.victim_name}</span>
                </div>
                <div>
                  <span style={{ color: '#444' }}>Location:</span>{' '}
                  {c.location}
                </div>
              </div>

              {/* Loading overlay */}
              {isThisLoading && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(5,3,10,0.85)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 10,
                }}>
                  <div style={{ fontSize: 10, color, letterSpacing: 3, textTransform: 'uppercase' }}>
                    Loading case...
                  </div>
                  <div style={{ fontSize: 10, color: '#555' }}>
                    Placing suspects. Hiding evidence.
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {error && (
        <div style={{
          color: '#ff4444', fontSize: 12, marginTop: 8,
          padding: '8px 16px', border: '1px solid #ff444433',
        }}>
          {error}
        </div>
      )}

      <button
        onClick={() => { reset() }}
        style={{
          background: 'transparent', border: 'none',
          color: '#444', cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 11,
          marginTop: 24, letterSpacing: 1,
        }}
      >
        ← Back to menu
      </button>
    </div>
  )
}
