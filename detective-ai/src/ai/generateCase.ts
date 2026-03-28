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
- Exactly 3 NPCs with ids npc_1, npc_2, npc_3. Exactly one is the culprit.
- Other NPCs have indirect knowledge but are innocent.
- Exactly 4 clues.
- Exactly 5 evidence_items: 3 that link_to the culprit, 1 that links_to an innocent NPC (red herring), 1 with links_to null (neutral/atmospheric). Evidence must be unique physical objects specific to this case (e.g. receipts, weapons, personal items, stained clothing, torn letters, matchbooks from specific locations).
- solution.evidence must reference 2-3 of the evidence item ids that link to the culprit.
- Exactly 4 buildings: one per NPC plus one police station (npc_id: null).
- Building types must be one of: bar, apartments, warehouse, office, police.
- Exactly one interior entry per building type used in map_layout.
- Distribute evidence_items across different interiors — each interior should have 1-2 objects with evidence_ids.
- 4-6 objects per interior total.
- Building positions: spread out, e.g. [0,0,0], [5,0,-3], [-4,0,2], [1,0,5].
- Tone: dark, moody, 1950s noir. Clipped prose. Rain. Cigarette smoke.
- NO markdown, NO explanation, ONLY the JSON object`
}

export async function generateCase(
  apiKey: string,
  summary: CaseSummary,
  cityName: string
): Promise<CaseData> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(summary, cityName) }] }],
        generationConfig: { temperature: 0.9, responseMimeType: 'application/json' },
      }),
    }
  )
  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`)
  const data = await response.json()
  const raw: string = data.candidates[0].content.parts[0].text
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON object found in response')
  return JSON.parse(raw.slice(start, end + 1)) as CaseData
}
