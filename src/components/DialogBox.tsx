import { useState, useRef, useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import { buildNPCSystemPrompt, sendNPCMessage } from '../ai/npcPrompt'

interface DialogBoxProps {
  onClose: () => void
}

export default function DialogBox({ onClose }: DialogBoxProps) {
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { activeNPC, currentCase, dialogHistory, addMessage, accuse } = useGameStore()

  const npc = activeNPC
  const messages = dialogHistory.find((d) => d.npcId === npc?.id)?.messages ?? []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!npc || !currentCase) return null

  async function handleSend() {
    if (!input.trim() || isSending) return
    const userMsg = input.trim()
    setInput('')
    setIsSending(true)
    addMessage(npc!.id, { role: 'user', content: userMsg })

    try {
      const systemPrompt = buildNPCSystemPrompt(npc!, currentCase!)
      const reply = await sendNPCMessage(systemPrompt, messages, userMsg)
      addMessage(npc!.id, { role: 'assistant', content: reply })
    } catch (e) {
      addMessage(npc!.id, { role: 'assistant', content: '...*silence*...' })
    }
    setIsSending(false)
  }

  function handleAccuse() {
    accuse(npc!.id)
  }

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      height: '45vh', background: 'rgba(5,5,15,0.97)',
      borderTop: '2px solid #ff0055', display: 'flex', flexDirection: 'column',
      fontFamily: '"Courier New", monospace', color: '#e0e0e0',
      zIndex: 100,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 16px', borderBottom: '1px solid #ff005555',
        background: 'rgba(255,0,85,0.1)',
      }}>
        <div>
          <span style={{ color: '#ff0055', fontWeight: 'bold', fontSize: 14 }}>
            {npc.name}
          </span>
          <span style={{ color: '#888', fontSize: 12, marginLeft: 8 }}>
            — {npc.occupation}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleAccuse} style={{
            background: '#8B0000', border: '1px solid #ff0055', color: '#fff',
            padding: '4px 12px', cursor: 'pointer', fontSize: 12,
            fontFamily: 'inherit',
          }}>
            ACCUSE
          </button>
          <button onClick={onClose} style={{
            background: 'transparent', border: '1px solid #555', color: '#888',
            padding: '4px 12px', cursor: 'pointer', fontSize: 12,
            fontFamily: 'inherit',
          }}>
            LEAVE
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {messages.length === 0 && (
          <div style={{ color: '#555', fontStyle: 'italic', fontSize: 13 }}>
            *{npc.name} eyes you warily...*
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <span style={{
              color: m.role === 'user' ? '#00ff88' : '#ff0055',
              fontWeight: 'bold', fontSize: 12, marginRight: 8,
            }}>
              {m.role === 'user' ? 'DETECTIVE:' : `${npc.name.toUpperCase()}:`}
            </span>
            <span style={{ fontSize: 13 }}>{m.content}</span>
          </div>
        ))}
        {isSending && (
          <div style={{ color: '#555', fontStyle: 'italic', fontSize: 13 }}>
            *{npc.name} thinks...*
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        display: 'flex', gap: 8, padding: '10px 16px',
        borderTop: '1px solid #ff005533',
      }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask a question..."
          style={{
            flex: 1, background: '#0a0a1a', border: '1px solid #333',
            color: '#e0e0e0', padding: '8px 12px', fontFamily: 'inherit',
            fontSize: 13, outline: 'none',
          }}
        />
        <button onClick={handleSend} disabled={isSending} style={{
          background: '#ff0055', border: 'none', color: '#fff',
          padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit',
          fontSize: 12, fontWeight: 'bold',
          opacity: isSending ? 0.5 : 1,
        }}>
          ASK
        </button>
      </div>
    </div>
  )
}
