// Gemini Live API — real-time bidirectional voice
// Uses the Multimodal Live API via WebSocket

export interface LiveSessionConfig {
  systemPrompt: string
  onAudioData: (audioData: ArrayBuffer) => void
  onTranscript: (text: string) => void
  onError: (error: string) => void
  onStatusChange: (status: 'connecting' | 'connected' | 'disconnected') => void
}

export class GeminiLiveSession {
  private ws: WebSocket | null = null
  private config: LiveSessionConfig
  private audioContext: AudioContext | null = null
  private audioQueue: ArrayBuffer[] = []
  private isPlaying = false

  constructor(config: LiveSessionConfig) {
    this.config = config
  }

  connect() {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    const url = isLocal
      ? 'ws://localhost:3001/api/live'
      : `wss://${window.location.host}/api/live`
    this.config.onStatusChange('connecting')
    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      // Send setup message
      const setupMsg = {
        setup: {
          model: 'models/gemini-3.1-flash-live-preview',
          generation_config: {
            response_modalities: ['AUDIO'],
            speech_config: {
              voice_config: { prebuilt_voice_config: { voice_name: 'Charon' } },
            },
          },
          system_instruction: {
            parts: [{ text: this.config.systemPrompt }],
          },
        },
      }
      this.ws!.send(JSON.stringify(setupMsg))
    }

    this.ws.onmessage = async (event) => {
      let text: string
      if (event.data instanceof Blob) {
        text = await event.data.text()
      } else {
        text = event.data
      }

      try {
        const msg = JSON.parse(text)

        if (msg.setupComplete) {
          this.config.onStatusChange('connected')
        }

        if (msg.serverContent?.modelTurn?.parts) {
          for (const part of msg.serverContent.modelTurn.parts) {
            if (part.inlineData?.mimeType?.startsWith('audio/')) {
              const audioData = base64ToArrayBuffer(part.inlineData.data)
              this.config.onAudioData(audioData)
              this.queueAudio(audioData)
            }
            if (part.text) {
              this.config.onTranscript(part.text)
            }
          }
        }
      } catch {
        // non-JSON messages ignored
      }
    }

    this.ws.onerror = () => {
      this.config.onError('WebSocket error — check API key and network')
    }

    this.ws.onclose = () => {
      this.config.onStatusChange('disconnected')
    }
  }

  sendAudio(pcmData: ArrayBuffer) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    const base64 = arrayBufferToBase64(pcmData)
    const msg = {
      realtimeInput: {
        mediaChunks: [{ mimeType: 'audio/pcm;rate=16000', data: base64 }],
      },
    }
    this.ws.send(JSON.stringify(msg))
  }

  sendText(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    const msg = {
      clientContent: {
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: true,
      },
    }
    this.ws.send(JSON.stringify(msg))
  }

  private async queueAudio(data: ArrayBuffer) {
    this.audioQueue.push(data)
    if (!this.isPlaying) {
      this.playNextAudio()
    }
  }

  private async playNextAudio() {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false
      return
    }
    this.isPlaying = true
    const data = this.audioQueue.shift()!

    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 24000 })
    }

    try {
      // Gemini Live returns raw PCM 16-bit LE at 24kHz
      const pcm16 = new Int16Array(data)
      const float32 = new Float32Array(pcm16.length)
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0
      }

      const audioBuffer = this.audioContext.createBuffer(1, float32.length, 24000)
      audioBuffer.copyToChannel(float32, 0)

      const source = this.audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(this.audioContext.destination)
      source.onended = () => this.playNextAudio()
      source.start()
    } catch {
      this.playNextAudio()
    }
  }

  disconnect() {
    this.ws?.close()
    this.ws = null
    this.audioContext?.close()
    this.audioContext = null
    this.audioQueue = []
    this.isPlaying = false
  }
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}
