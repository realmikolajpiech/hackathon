import type { CaseData } from '../store/gameStore'

const CASE_GENERATION_PROMPT = `Generate a noir detective case for a short mystery game.

Return ONLY valid JSON matching this exact schema:
- case: { title, victim: {name, occupation}, location, time_of_death, murder_weapon, motive, solution: {murderer_id, evidence[]} }
- npcs: array of 3 suspects, each: { id, name, occupation, building (one of: bar/apartments/police/warehouse), personality, knows[], hides[], alibi }
- clues: array of 4 physical clues, each: { id, location, description, found: false }
- map_layout: { buildings: [{ type, position: [x,0,z], npc_id }] }

Rules:
- Exactly one NPC is the murderer (use id "npc_1", "npc_2", or "npc_3")
- Other NPCs have indirect knowledge but are innocent
- The case should be solvable through dialogue alone
- Tone: dark, moody, 1950s noir
- Building positions: spread them out, use values like [0,0,0], [5,0,-3], [-4,0,2], [-1,0,5]
- Include one building per NPC plus a police station with npc_id null
- NO markdown, NO explanation, ONLY the JSON object`

export async function generateCase(apiKey: string): Promise<CaseData> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: CASE_GENERATION_PROMPT }] }],
        generationConfig: { temperature: 0.9, responseMimeType: 'application/json' },
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  const text = data.candidates[0].content.parts[0].text
  return JSON.parse(text) as CaseData
}
