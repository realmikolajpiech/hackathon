import { useState } from 'react'
import { useGameStore } from '../store/gameStore'

interface NotebookProps {
  onClose: () => void
}

export default function Notebook({ onClose }: NotebookProps) {
  const [newNote, setNewNote] = useState('')
  const { notebook, currentCase, collectedEvidence, addNote, addSuspicion } = useGameStore()

  function handleAddNote() {
    if (newNote.trim()) {
      addNote(newNote.trim())
      setNewNote('')
    }
  }

  return (
    <div style={{
      position: 'fixed', top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 480, maxHeight: '80vh',
      background: '#0a0805', border: '1px solid #8B6914',
      color: '#d4b483', fontFamily: '"Courier New", monospace',
      padding: 24, zIndex: 200, overflowY: 'auto',
      boxShadow: '0 0 40px rgba(139,105,20,0.3)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: '#d4b483', fontSize: 18, letterSpacing: 3 }}>
          DETECTIVE'S NOTEBOOK
        </h2>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', color: '#888',
          cursor: 'pointer', fontSize: 18,
        }}>✕</button>
      </div>

      {currentCase && (
        <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #8B691433' }}>
          <div style={{ color: '#888', fontSize: 11, letterSpacing: 2 }}>CASE</div>
          <div style={{ fontSize: 14, marginTop: 4 }}>{currentCase.case.title}</div>
          <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
            Victim: {currentCase.case.victim.name} · {currentCase.case.time_of_death}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <div style={{ color: '#888', fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>SUSPECTS</div>
        {currentCase?.npcs.map((npc) => (
          <div key={npc.id} style={{
            padding: '6px 10px', marginBottom: 4,
            background: '#12100a', border: '1px solid #8B691422',
            fontSize: 13, display: 'flex', justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>{npc.name} — {npc.occupation}</span>
            <button
              onClick={() => addSuspicion(`${npc.name} is suspicious`)}
              style={{
                background: 'transparent', border: '1px solid #8B6914',
                color: '#d4b483', padding: '2px 8px', cursor: 'pointer',
                fontSize: 10, fontFamily: 'inherit',
              }}
            >
              FLAG
            </button>
          </div>
        ))}
      </div>

      {/* Evidence board */}
      {collectedEvidence.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: '#d4b483', fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>
            ◆ EVIDENCE ({collectedEvidence.length})
          </div>
          {collectedEvidence.map((ev) => (
            <div key={ev.id} style={{
              padding: '8px 12px', marginBottom: 6,
              background: 'rgba(212,180,131,0.06)',
              border: '1px solid #d4b48333',
            }}>
              <div style={{ fontSize: 13, color: '#d4b483', marginBottom: 2 }}>
                {ev.name}
              </div>
              <div style={{ fontSize: 11, color: '#666', fontStyle: 'italic', marginBottom: 4 }}>
                {ev.description}
              </div>
              <div style={{ fontSize: 10, color: '#555', letterSpacing: 1 }}>
                Found at: {ev.found_at}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <div style={{ color: '#888', fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>NOTES</div>
        {notebook.clues.length === 0 ? (
          <div style={{ color: '#444', fontSize: 12, fontStyle: 'italic' }}>No notes yet...</div>
        ) : (
          notebook.clues.map((c, i) => (
            <div key={i} style={{ fontSize: 12, marginBottom: 4, color: '#b8965a' }}>
              • {c}
            </div>
          ))
        )}
      </div>

      {notebook.suspicions.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: '#888', fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>SUSPICIONS</div>
          {notebook.suspicions.map((s, i) => (
            <div key={i} style={{ fontSize: 12, marginBottom: 4, color: '#ff6644' }}>
              ⚠ {s}
            </div>
          ))}
        </div>
      )}

      <div style={{ borderTop: '1px solid #8B691433', paddingTop: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
            placeholder="Add a note..."
            style={{
              flex: 1, background: '#12100a', border: '1px solid #8B6914',
              color: '#d4b483', padding: '6px 10px', fontFamily: 'inherit',
              fontSize: 12, outline: 'none',
            }}
          />
          <button onClick={handleAddNote} style={{
            background: '#8B6914', border: 'none', color: '#0a0805',
            padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 11, fontWeight: 'bold',
          }}>
            ADD
          </button>
        </div>
      </div>
    </div>
  )
}
