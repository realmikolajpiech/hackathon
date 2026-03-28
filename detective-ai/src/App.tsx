import { useState } from 'react'
import { useGameStore } from './store/gameStore'
import OfficeScene from './scenes/OfficeScene'
import CityScene from './scenes/CityScene'
import ResolutionScene from './scenes/ResolutionScene'

function ApiKeyGate({ children }: { children: (apiKey: string) => React.ReactNode }) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') ?? '')
  const [inputKey, setInputKey] = useState('')
  const [showInput, setShowInput] = useState(!apiKey)

  function handleSave() {
    const key = inputKey.trim()
    if (!key) return
    localStorage.setItem('gemini_api_key', key)
    setApiKey(key)
    setShowInput(false)
  }

  if (showInput) {
    return (
      <div style={{
        width: '100vw', height: '100vh',
        background: '#050510',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: '"Courier New", monospace', color: '#d4b483',
      }}>
        <div style={{
          width: 400, padding: 40,
          border: '1px solid #8B6914',
          background: '#0a0805',
          boxShadow: '0 0 40px rgba(139,105,20,0.2)',
        }}>
          <h2 style={{ margin: '0 0 8px', fontSize: 18, letterSpacing: 4 }}>
            DETECTIVE AI
          </h2>
          <div style={{ color: '#555', fontSize: 12, marginBottom: 24 }}>
            Enter your Gemini API key to begin
          </div>
          <input
            type="password"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="AIza..."
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#12100a', border: '1px solid #8B6914',
              color: '#d4b483', padding: '8px 12px',
              fontFamily: 'inherit', fontSize: 13,
              outline: 'none', marginBottom: 12,
            }}
          />
          <button onClick={handleSave} style={{
            width: '100%', background: '#8B6914', border: 'none',
            color: '#0a0805', padding: '10px',
            cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 13, fontWeight: 'bold', letterSpacing: 2,
          }}>
            ENTER
          </button>
          <div style={{ color: '#333', fontSize: 10, marginTop: 12, textAlign: 'center' }}>
            Key stored in localStorage only
          </div>
        </div>
      </div>
    )
  }

  return <>{children(apiKey)}</>
}

export default function App() {
  const phase = useGameStore((s) => s.phase)

  return (
    <ApiKeyGate>
      {(apiKey) => (
        <>
          {(phase === 'menu' || phase === 'office') && <OfficeScene apiKey={apiKey} />}
          {phase === 'city' && <CityScene apiKey={apiKey} />}
          {phase === 'dialogue' && <CityScene apiKey={apiKey} />}
          {phase === 'resolution' && <ResolutionScene />}
        </>
      )}
    </ApiKeyGate>
  )
}
