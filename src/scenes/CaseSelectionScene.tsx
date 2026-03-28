import { useState, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import { generateCase } from '../ai/generateCase'
import type { CaseSummary, CaseData } from '../store/gameStore'

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

const TYPE_MISSION: Record<string, string> = {
  murder: 'Someone is dead. The killer is still out there — and they know how to disappear. Talk to witnesses, find the evidence, and bring them in before the trail goes cold.',
  theft: 'Something was taken. Someone planned this and they think they got away clean. Shake down the right people, find what was stolen, and expose the thief.',
  kidnapping: 'A person is missing and someone is pulling the strings. Every hour counts. Find the connections, follow the money, and track down who took them.',
  fraud: 'A con is being run and someone is getting rich off lies. Dig through the paper trail, pressure the right suspects, and unravel the deception.',
  disappearance: 'Gone without a trace — or so they want you to think. Find out what really happened to this person and who had reason to make them vanish.',
  extortion: 'Someone is being squeezed and they came to you for help. Find out who is doing it, what leverage they have, and put a stop to it.',
}

export default function CaseSelectionScene() {
  const { world, setCurrentCase, setPhase, reset } = useGameStore()

  const [introCase, setIntroCase] = useState<CaseSummary | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [pendingCase, setPendingCase] = useState<CaseData | null>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const acceptPendingRef = useRef(false)
  const generationTokenRef = useRef(0)

  if (!world) return null

  function handleCardClick(caseId: string) {
    if (isGenerating) return
    const summary = world!.cases.find((c) => c.id === caseId)
    if (!summary) return

    const token = ++generationTokenRef.current
    setIntroCase(summary)
    setIsGenerating(true)
    setPendingCase(null)
    setGenerationError(null)
    setError(null)
    acceptPendingRef.current = false

    generateCase(summary, world!.city.name)
      .then((fullCase) => {
        if (generationTokenRef.current !== token) return
        setPendingCase(fullCase)
        if (acceptPendingRef.current) {
          setCurrentCase(fullCase)
          setPhase('city')
        }
      })
      .catch((e) => {
        if (generationTokenRef.current !== token) return
        setGenerationError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (generationTokenRef.current === token) setIsGenerating(false)
      })
  }

  function handleAcceptCase() {
    if (pendingCase) {
      setCurrentCase(pendingCase)
      setPhase('city')
    } else if (generationError) {
      // do nothing, error is shown
    } else {
      acceptPendingRef.current = true
    }
  }

  function handleDeclineCase() {
    generationTokenRef.current++
    setIntroCase(null)
    setIsGenerating(false)
    setPendingCase(null)
    setGenerationError(null)
    acceptPendingRef.current = false
  }

  const boardIsLoading = isGenerating && !introCase

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
          const color = TYPE_COLORS[c.type] ?? '#d4b483'
          const icon = TYPE_ICONS[c.type] ?? '📁'

          return (
            <div
              key={c.id}
              onClick={() => !boardIsLoading && handleCardClick(c.id)}
              style={{
                background: '#08060a',
                border: `1px solid #222`,
                padding: 24,
                cursor: boardIsLoading ? 'default' : 'pointer',
                opacity: 1,
                transition: 'border-color 0.15s, box-shadow 0.15s',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!boardIsLoading) {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = color
                  el.style.boxShadow = `0 0 16px ${color}22`
                }
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = '#222'
                el.style.boxShadow = 'none'
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

      {/* Case intro overlay */}
      {introCase && (
        <CaseIntroOverlay
          summary={introCase}
          cityName={world.city.name}
          isGenerating={isGenerating}
          hasResult={!!pendingCase}
          generationError={generationError}
          onAccept={handleAcceptCase}
          onDecline={handleDeclineCase}
        />
      )}
    </div>
  )
}

interface CaseIntroOverlayProps {
  summary: CaseSummary
  cityName: string
  isGenerating: boolean
  hasResult: boolean
  generationError: string | null
  onAccept: () => void
  onDecline: () => void
}

function CaseIntroOverlay({
  summary, cityName, isGenerating, hasResult, generationError, onAccept, onDecline,
}: CaseIntroOverlayProps) {
  const color = TYPE_COLORS[summary.type] ?? '#d4b483'
  const icon = TYPE_ICONS[summary.type] ?? '📁'
  const mission = TYPE_MISSION[summary.type] ?? 'Find the truth. Whatever it takes.'
  const fileNumber = summary.id.replace('case_', '0')

  const acceptPending = !hasResult && !generationError && !isGenerating === false
  const canAccept = hasResult || generationError === null

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(3, 2, 8, 0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Courier New", monospace',
      zIndex: 100,
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        width: '100%', maxWidth: 600,
        margin: '0 20px',
        border: `1px solid ${color}66`,
        boxShadow: `0 0 60px ${color}22, 0 0 120px ${color}11`,
        background: '#06040b',
        overflow: 'hidden',
      }}>
        {/* Header bar */}
        <div style={{
          background: `${color}18`,
          borderBottom: `1px solid ${color}44`,
          padding: '12px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 10, color: color, letterSpacing: 4, textTransform: 'uppercase' }}>
            {icon} Classified Case File
          </span>
          <span style={{ fontSize: 10, color: '#444', letterSpacing: 2 }}>
            {cityName.toUpperCase()} · FILE #{fileNumber}
          </span>
        </div>

        <div style={{ padding: '32px 32px 0' }}>
          {/* Case type */}
          <div style={{
            fontSize: 10, color, letterSpacing: 4,
            textTransform: 'uppercase', marginBottom: 10,
          }}>
            {summary.type} investigation
          </div>

          {/* Title */}
          <h2 style={{
            fontSize: 28, color: '#d4b483', margin: '0 0 24px',
            letterSpacing: 3, fontWeight: 'normal',
            textShadow: `0 0 20px ${color}44`,
            lineHeight: 1.2,
          }}>
            {summary.title}
          </h2>

          {/* Divider */}
          <div style={{
            borderTop: `1px solid ${color}33`,
            marginBottom: 24,
          }} />

          {/* Situation report */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 9, color: '#444', letterSpacing: 4,
              textTransform: 'uppercase', marginBottom: 10,
            }}>
              Situation Report
            </div>
            <div style={{
              fontSize: 14, color: '#aaa', lineHeight: 1.9,
              fontStyle: 'italic',
              borderLeft: `3px solid ${color}55`,
              paddingLeft: 16,
            }}>
              "{summary.hook}"
            </div>
          </div>

          {/* Details grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 16, marginBottom: 24,
          }}>
            <div style={{
              background: '#0a080f',
              border: '1px solid #1a1a1a',
              padding: '12px 16px',
            }}>
              <div style={{ fontSize: 9, color: '#444', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>
                Victim
              </div>
              <div style={{ fontSize: 13, color: '#d4b483' }}>
                {summary.victim_name}
              </div>
            </div>
            <div style={{
              background: '#0a080f',
              border: '1px solid #1a1a1a',
              padding: '12px 16px',
            }}>
              <div style={{ fontSize: 9, color: '#444', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>
                Scene
              </div>
              <div style={{ fontSize: 13, color: '#d4b483' }}>
                {summary.location}
              </div>
            </div>
          </div>

          {/* Mission briefing */}
          <div style={{
            background: '#0a080f',
            border: `1px solid ${color}22`,
            padding: '16px',
            marginBottom: 28,
          }}>
            <div style={{ fontSize: 9, color: color, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 10 }}>
              Your Mission
            </div>
            <div style={{ fontSize: 12, color: '#666', lineHeight: 1.9 }}>
              {mission}
            </div>
          </div>
        </div>

        {/* Footer / actions */}
        <div style={{
          borderTop: `1px solid ${color}22`,
          padding: '20px 32px 24px',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          {generationError && (
            <div style={{
              fontSize: 11, color: '#ff4444',
              padding: '8px 12px', border: '1px solid #ff444433',
              marginBottom: 4,
            }}>
              Failed to load case. Please try again.
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              onClick={onDecline}
              style={{
                background: 'transparent',
                border: '1px solid #333',
                color: '#555',
                fontFamily: '"Courier New", monospace',
                fontSize: 11, letterSpacing: 2,
                padding: '10px 20px',
                cursor: 'pointer',
                textTransform: 'uppercase',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = '#555'
                el.style.color = '#888'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = '#333'
                el.style.color = '#555'
              }}
            >
              ← Decline
            </button>

            <button
              onClick={generationError ? onDecline : onAccept}
              disabled={false}
              style={{
                flex: 1,
                background: generationError ? '#1a0505' : `${color}18`,
                border: `1px solid ${generationError ? '#ff444455' : color + '88'}`,
                color: generationError ? '#ff4444' : color,
                fontFamily: '"Courier New", monospace',
                fontSize: 12, letterSpacing: 3,
                padding: '12px 24px',
                cursor: 'pointer',
                textTransform: 'uppercase',
                boxShadow: generationError ? 'none' : `0 0 20px ${color}22`,
                transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!generationError) {
                  const el = e.currentTarget as HTMLElement
                  el.style.boxShadow = `0 0 30px ${color}44`
                }
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.boxShadow = generationError ? 'none' : `0 0 20px ${color}22`
              }}
            >
              {generationError
                ? '↩ Try another case'
                : isGenerating && !hasResult
                  ? 'Assembling case...'
                  : 'Take the case →'}
            </button>
          </div>

          {/* Generation status */}
          {isGenerating && !hasResult && !generationError && (
            <div style={{
              fontSize: 9, color: '#444', letterSpacing: 3,
              textTransform: 'uppercase', textAlign: 'center',
            }}>
              Setting the scene · placing suspects · hiding evidence
            </div>
          )}
          {hasResult && (
            <div style={{
              fontSize: 9, color: `${color}88`, letterSpacing: 3,
              textTransform: 'uppercase', textAlign: 'center',
            }}>
              Case ready
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
