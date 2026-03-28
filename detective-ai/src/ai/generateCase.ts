import type { CaseData, CaseSummary } from '../store/gameStore'

function buildPrompt(summary: CaseSummary, cityName: string): string {
  return `Generate a full noir detective case.

City: ${cityName}
Case Title: "${summary.title}"
Case Type: ${summary.type}
Hook: ${summary.hook}
Victim: ${summary.victim_name}
Location: ${summary.location}

Return ONLY valid JSON with this exact structure:
{
  "case": {
    "title": "string",
    "victim": { "name": "string", "occupation": "string" },
    "location": "string",
    "time_of_death": "string — e.g. 2:15 AM",
    "murder_weapon": "string or null",
    "motive": "string",
    "solution": { "murderer_id": "npc_1", "evidence": ["ev_1", "ev_2"] }
  },
  "npcs": [
    {
      "id": "npc_1",
      "name": "string",
      "occupation": "string",
      "building": "bar",
      "personality": "string — 3-4 adjectives and behavioral traits",
      "knows": ["string — facts they will reveal through dialogue"],
      "hides": ["string — secrets they will only reveal under pressure"],
      "alibi": "string — their claim about whereabouts"
    }
  ],
  "clues": [
    { "id": "clue_1", "location": "string", "description": "string", "found": false }
  ],
  "evidence_items": [
    {
      "id": "ev_1",
      "name": "string — short evocative name e.g. 'Monogrammed handkerchief'",
      "description": "string — 1-2 sentences of physical appearance, texture, markings",
      "found_at": "string — name of the interior/location where it is hidden",
      "links_to": "npc_id of the suspect this evidence implicates, or null"
    }
  ],
  "map_layout": {
    "buildings": [
      { "type": "string", "position": [0, 0, 0], "npc_id": "npc_1 or null" }
    ]
  },
  "interiors": [
    {
      "building_type": "bar",
      "name": "string — proper name of this location",
      "atmosphere": "string — one evocative phrase e.g. 'smoke-stained, dimly lit'",
      "description": "string — 2-3 sentences in second person starting with 'You enter...'",
      "objects": [
        {
          "id": "obj_1",
          "name": "string — short object name e.g. 'Cracked mirror'",
          "examine_text": "string — 1-2 sentences of what the detective observes on close inspection. May hint at evidence.",
          "evidence_id": "ev_1 if examining this object yields an evidence item, otherwise omit this field"
        }
      ]
    }
  ]
}

Rules:
- NPCs: let the case dictate how many suspects are needed (typically 2-5). Assign ids npc_1, npc_2, etc. Exactly one is the culprit. The rest have partial knowledge, alibis, or motives that make them credible red herrings.
- Clues: as many as the case warrants — enough to give the player meaningful leads without hand-holding. Typically 3-6.
- Evidence items: enough to build a coherent case. Some should implicate the culprit, at least one should be a red herring pointing elsewhere, one or two may be atmospheric. solution.evidence must reference 2-3 culprit-linked evidence ids.
- Buildings: one per NPC plus one police station (npc_id: null). Building types from: bar, apartments, warehouse, office, police. One interior per building.
- Distribute evidence across interiors naturally — where it would realistically be found.
- 3-7 objects per interior.
- Building positions: spread out across the map, e.g. [0,0,0], [5,0,-3], [-4,0,2], [1,0,5], [−2,0,−5].
- Tone: dark, moody, 1950s noir. Clipped prose. Rain. Cigarette smoke.
- NO markdown, NO explanation, ONLY the JSON object`
}

export async function generateCase(
  summary: CaseSummary,
  cityName: string
): Promise<CaseData> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/gemini-3.1-flash-lite-preview',
      body: {
        contents: [{ parts: [{ text: buildPrompt(summary, cityName) }] }],
        generationConfig: { temperature: 0.9, responseMimeType: 'application/json' },
      },
    }),
  })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Gemini API ${response.status}: ${body}`)
  }
  const data = await response.json()
  const raw: string = data.candidates[0].content.parts[0].text
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON object found in response')
  return JSON.parse(raw.slice(start, end + 1)) as CaseData
}
