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

export interface EvidenceItem {
  id: string
  name: string          // e.g. "Monogrammed handkerchief"
  description: string   // Physical appearance
  found_at: string      // Interior name where found
  links_to: string | null // npc id this evidence points toward (hidden until examined)
}

export interface InteriorObject {
  id: string
  name: string
  examine_text: string
  evidence_id?: string  // if set, examining this object collects the evidence item
}

export interface Interior {
  building_type: string
  name: string
  atmosphere: string
  description: string
  objects: InteriorObject[]
}

export interface CaseData {
  case: {
    title: string
    victim: { name: string; occupation: string }
    location: string
    time_of_death: string
    murder_weapon: string | null
    motive: string
    solution: { murderer_id: string; evidence: string[] }
  }
  npcs: NPC[]
  clues: Clue[]
  evidence_items: EvidenceItem[]
  map_layout: {
    buildings: Array<{ type: string; position: [number, number, number]; npc_id: string | null }>
  }
  interiors?: Interior[]
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface CaseSummary {
  id: string
  title: string
  type: string
  hook: string
  victim_name: string
  location: string
}

export interface WorldData {
  city: {
    name: string
    atmosphere: string
  }
  cases: CaseSummary[]
}

type GamePhase =
  | 'menu'
  | 'case_selection'
  | 'city'
  | 'interior'
  | 'resolution'

interface GameState {
  phase: GamePhase
  world: WorldData | null
  currentCase: CaseData | null
  currentInterior: Interior | null
  activeNPC: NPC | null
  examinedObjects: string[]
  collectedEvidence: EvidenceItem[]
  notebook: {
    clues: string[]
    suspicions: string[]
  }
  dialogHistory: { npcId: string; messages: Message[] }[]
  accusation: string | null
  isLoading: boolean
  voiceActive: boolean

  setPhase: (phase: GamePhase) => void
  setWorld: (world: WorldData) => void
  setCurrentCase: (caseData: CaseData) => void
  setCurrentInterior: (interior: Interior | null) => void
  setActiveNPC: (npc: NPC | null) => void
  examineObject: (objectId: string) => void
  collectEvidence: (item: EvidenceItem) => void
  addNote: (note: string) => void
  addSuspicion: (suspicion: string) => void
  addMessage: (npcId: string, message: Message) => void
  accuse: (npcId: string) => void
  setLoading: (loading: boolean) => void
  setVoiceActive: (active: boolean) => void
  reset: () => void
}

const initialState = {
  phase: 'menu' as GamePhase,
  world: null,
  currentCase: null,
  currentInterior: null,
  activeNPC: null,
  examinedObjects: [] as string[],
  collectedEvidence: [] as EvidenceItem[],
  notebook: { clues: [] as string[], suspicions: [] as string[] },
  dialogHistory: [] as { npcId: string; messages: Message[] }[],
  accusation: null,
  isLoading: false,
  voiceActive: false,
}

export const useGameStore = create<GameState>((set) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),
  setWorld: (world) => set({ world }),
  setCurrentCase: (caseData) => set({ currentCase: caseData }),
  setCurrentInterior: (interior) => set({ currentInterior: interior }),
  setActiveNPC: (npc) => set({ activeNPC: npc }),
  examineObject: (objectId) =>
    set((s) => ({
      examinedObjects: s.examinedObjects.includes(objectId)
        ? s.examinedObjects
        : [...s.examinedObjects, objectId],
    })),
  collectEvidence: (item) =>
    set((s) => ({
      collectedEvidence: s.collectedEvidence.find((e) => e.id === item.id)
        ? s.collectedEvidence
        : [...s.collectedEvidence, item],
    })),
  addNote: (note) =>
    set((s) => ({ notebook: { ...s.notebook, clues: [...s.notebook.clues, note] } })),
  addSuspicion: (suspicion) =>
    set((s) => ({
      notebook: { ...s.notebook, suspicions: [...s.notebook.suspicions, suspicion] },
    })),
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
  reset: () => set({ ...initialState }),
}))
