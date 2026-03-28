import { useState, useRef, useEffect, useCallback } from 'react'
import { GeminiLiveSession } from '../ai/geminiLive'
import { buildNPCSystemPrompt } from '../ai/npcPrompt'
import { useGameStore } from '../store/gameStore'

interface VoiceUIProps {
  onTranscript: (text: string) => void
}

export default function VoiceUI({ onTranscript }: VoiceUIProps) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle')
  const [isTalking, setIsTalking] = useState(false)
  const sessionRef = useRef<GeminiLiveSession | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const { activeNPC, currentCase, setVoiceActive } = useGameStore()

  const startSession = useCallback(async () => {
    if (!activeNPC || !currentCase) return
    setStatus('connecting')

    const systemPrompt = buildNPCSystemPrompt(activeNPC, currentCase)

    const session = new GeminiLiveSession({
      systemPrompt,
      onAudioData: () => {},
      onTranscript: (text) => {
        onTranscript(text)
        setIsTalking(true)
        setTimeout(() => setIsTalking(false), 2000)
      },
      onError: (err) => {
        console.error(err)
        setStatus('error')
      },
      onStatusChange: (s) => {
        if (s === 'connected') setStatus('connected')
        if (s === 'disconnected') setStatus((prev) => prev === 'error' ? 'error' : 'idle')
      },
    })

    session.connect()
    sessionRef.current = session
    setVoiceActive(true)

    // Set up microphone
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      audioCtxRef.current = new AudioContext({ sampleRate: 16000 })
      const source = audioCtxRef.current.createMediaStreamSource(stream)
      const processor = audioCtxRef.current.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      processor.onaudioprocess = (e) => {
        if (!sessionRef.current) return
        const float32 = e.inputBuffer.getChannelData(0)
        const pcm16 = new Int16Array(float32.length)
        for (let i = 0; i < float32.length; i++) {
          pcm16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768))
        }
        sessionRef.current.sendAudio(pcm16.buffer)
      }

      source.connect(processor)
      processor.connect(audioCtxRef.current.destination)
    } catch {
      setStatus('error')
    }
  }, [activeNPC, currentCase, onTranscript, setVoiceActive])

  const stopSession = useCallback(() => {
    sessionRef.current?.disconnect()
    sessionRef.current = null
    processorRef.current?.disconnect()
    processorRef.current = null
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
    mediaStreamRef.current = null
    audioCtxRef.current?.close()
    audioCtxRef.current = null
    setStatus('idle')
    setVoiceActive(false)
  }, [setVoiceActive])

  useEffect(() => {
    return () => stopSession()
  }, [stopSession])

  const isActive = status === 'connected' || status === 'connecting'

  return (
    <div style={{
      position: 'fixed', bottom: 200, right: 20,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      zIndex: 101,
    }}>
      {/* Pulsing ring when NPC is talking */}
      {isTalking && (
        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          border: '3px solid #ff0055',
          animation: 'pulse 0.8s infinite',
          position: 'absolute', top: -10,
        }} />
      )}

      <button
        onClick={isActive ? stopSession : startSession}
        style={{
          width: 56, height: 56, borderRadius: '50%',
          background: isActive ? '#ff0055' : '#0a0a1a',
          border: `2px solid ${isActive ? '#ff0055' : '#555'}`,
          color: '#fff', cursor: 'pointer', fontSize: 22,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isActive ? '0 0 20px #ff0055' : 'none',
          transition: 'all 0.2s',
        }}
        title={isActive ? 'End voice session' : 'Start voice session'}
      >
        {status === 'connecting' ? '...' : isActive ? '🎙' : '🎤'}
      </button>

      <div style={{
        color: status === 'error' ? '#ff4444' : '#888',
        fontSize: 10, fontFamily: 'monospace', textAlign: 'center',
      }}>
        {status === 'idle' && 'VOICE'}
        {status === 'connecting' && 'CONNECTING...'}
        {status === 'connected' && 'LIVE'}
        {status === 'error' && 'ERROR — check console'}
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
