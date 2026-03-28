import { create } from 'zustand'

export interface NPC {
  id: string
  name: string
  occupation: string
  building: string
  personality: string
  knows: string[]
  hides: string[]
  alibi: string
}

export interface Clue {
  id: string
  location: string
  description: string
  found: boolean
}

export interface CaseData {
  case: {
    title: string
    victim: { name: string; occupation: string }
    location: string
    time_of_death: string
    murder_weapon: string
    motive: string
    solution: { murderer_id: string; evidence: string[] }
  }
  npcs: NPC[]
  clues: Clue[]
  map_layout: {
    buildings: Array<{ type: string; position: [number, number, number]; npc_id: string | null }>
  }
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

type GamePhase = 'menu' | 'office' | 'city' | 'dialogue' | 'resolution'

interface GameState {
  phase: GamePhase
  currentCase: CaseData | null
  activeNPC: NPC | null
  notebook: {
    clues: string[]
    suspicions: string[]
  }
  dialogHistory: { npcId: string; messages: Message[] }[]
  accusation: string | null
  isLoading: boolean
  voiceActive: boolean

  setPhase: (phase: GamePhase) => void
  setCurrentCase: (caseData: CaseData) => void
  setActiveNPC: (npc: NPC | null) => void
  addNote: (note: string) => void
  addSuspicion: (suspicion: string) => void
  addMessage: (npcId: string, message: Message) => void
  accuse: (npcId: string) => void
  setLoading: (loading: boolean) => void
  setVoiceActive: (active: boolean) => void
  reset: () => void
}

export const useGameStore = create<GameState>((set) => ({
  phase: 'menu',
  currentCase: null,
  activeNPC: null,
  notebook: { clues: [], suspicions: [] },
  dialogHistory: [],
  accusation: null,
  isLoading: false,
  voiceActive: false,

  setPhase: (phase) => set({ phase }),
  setCurrentCase: (caseData) => set({ currentCase: caseData }),
  setActiveNPC: (npc) => set({ activeNPC: npc }),
  addNote: (note) => set((s) => ({ notebook: { ...s.notebook, clues: [...s.notebook.clues, note] } })),
  addSuspicion: (suspicion) => set((s) => ({ notebook: { ...s.notebook, suspicions: [...s.notebook.suspicions, suspicion] } })),
  addMessage: (npcId, message) =>
    set((s) => {
      const existing = s.dialogHistory.find((d) => d.npcId === npcId)
      if (existing) {
        return {
          dialogHistory: s.dialogHistory.map((d) =>
            d.npcId === npcId ? { ...d, messages: [...d.messages, message] } : d
          ),
        }
      }
      return { dialogHistory: [...s.dialogHistory, { npcId, messages: [message] }] }
    }),
  accuse: (npcId) => set({ accusation: npcId, phase: 'resolution' }),
  setLoading: (loading) => set({ isLoading: loading }),
  setVoiceActive: (active) => set({ voiceActive: active }),
  reset: () =>
    set({
      phase: 'menu',
      currentCase: null,
      activeNPC: null,
      notebook: { clues: [], suspicions: [] },
      dialogHistory: [],
      accusation: null,
      isLoading: false,
      voiceActive: false,
    }),
}))
