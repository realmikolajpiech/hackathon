import type { CaseData, CaseSummary } from '../store/gameStore'

function buildPrompt(summary: CaseSummary, cityName: string): string {
  return `You are a detective game designer. Generate a noir case that is LOGICALLY SOLVABLE through deduction.

City: ${cityName}
Case Title: "${summary.title}"
Case Type: ${summary.type}
Hook: ${summary.hook}
Victim: ${summary.victim_name}
Location: ${summary.location}

FIRST, plan the case internally before writing JSON:
1. Decide WHO the killer is and their specific motive.
2. Decide WHAT physical evidence the killer left behind and WHERE — each piece must have a clear reason it implicates the killer (e.g. their monogrammed lighter found at the scene, not the victim's own belongings).
3. Decide WHY each innocent suspect looks guilty — give each one a secret that makes them suspicious but is ultimately unrelated to the murder.
4. Map out the INVESTIGATION PATH: which location leads to which, so the player must visit at least 3-4 buildings following a logical trail of clues.
5. Verify: can a player, starting from the crime scene, follow hints from objects and NPC dialogue to reach every location where solution evidence is hidden? If not, add a breadcrumb.

Return ONLY valid JSON with this exact structure:
{
  "case": {
    "title": "string",
    "victim": { "name": "string", "occupation": "string" },
    "location": "string",
    "time_of_death": "string — e.g. 2:15 AM",
    "murder_weapon": "string or null",
    "motive": "string — the killer's specific reason",
    "solution": { "murderer_id": "npc_X", "evidence": ["ev_1", "ev_2", "ev_3"] }
  },
  "npcs": [
    {
      "id": "npc_1",
      "name": "string",
      "occupation": "string",
      "building": "bar",
      "personality": "string — 3-4 adjectives and behavioral traits that affect how they speak",
      "knows": [
        "string — a fact they reveal freely",
        "string — a fact that NAMES another NPC or location the player should visit next",
        "string — an observation about another suspect's behavior",
        "string — (optional) another cross-reference"
      ],
      "hides": [
        "string — a secret they only reveal under pressure",
        "string — another hidden fact that explains their suspicious behavior"
      ],
      "alibi": "string — their specific, verifiable or falsifiable claim about whereabouts"
    }
  ],
  "evidence_items": [
    {
      "id": "ev_1",
      "name": "string — short evocative name",
      "description": "string — physical description that EXPLAINS why this implicates the linked suspect (e.g. 'A gold cufflink engraved with the initials R.M. — matching those of suspect Raymond Marsh')",
      "found_at": "string — MUST exactly match the 'name' field of one of the interiors",
      "links_to": "npc_id or null"
    }
  ],
  "map_layout": {
    "buildings": [
      { "type": "string", "position": [x, 0, z], "npc_id": "npc_1 or null" }
    ]
  },
  "interiors": [
    {
      "building_type": "bar",
      "name": "string — proper name of this location",
      "atmosphere": "string — one evocative phrase",
      "description": "string — 2-3 sentences in second person starting with 'You enter...'",
      "objects": [
        {
          "id": "obj_1",
          "name": "string — short object name",
          "examine_text": "string — what the detective observes. Non-evidence objects MUST hint at another location, suspect, or contradiction to investigate.",
          "evidence_id": "ev_1 — only if this object yields evidence, otherwise OMIT this field entirely"
        }
      ]
    }
  ]
}

=== LOGICAL CONSISTENCY RULES ===

EVIDENCE MUST MAKE SENSE:
- Every evidence item with links_to MUST have a description that clearly explains WHY it implicates that specific person. "A matchbook from Sal's club" found at Sal's own club is NOT evidence — it's expected. Evidence must be something personal to the suspect found WHERE IT SHOULDN'T BE, or a document/record that ties them to the crime.
- The murder weapon or a forensic trace of it (blood type match, a fragment, tool marks) MUST be one of the evidence items. It must link to the killer.
- Red herring evidence must be genuinely misleading: an innocent suspect's personal item found near the crime scene, or a financial record suggesting motive. But it must have an innocent explanation discoverable through dialogue.

EVERY LOCATION MUST BE REACHABLE THROUGH HINTS:
- The crime scene (first building the player visits) must contain at least one object examine_text or NPC dialogue that names or hints at a second location.
- Each subsequent location must be hinted at by a previous one — through NPC "knows" facts, object examine_texts, or evidence descriptions.
- NO island locations: every building must be reachable by following the trail from the crime scene. Trace it yourself: crime scene → hint → location B → hint → location C, etc.
- At least one NPC's "knows" must explicitly mention the name of the NPC or location where the next critical evidence is found.

NPC KNOWLEDGE MUST CREATE CONTRADICTIONS:
- Each NPC must have 3-4 "knows" and 2-3 "hides".
- At least one "knows" per NPC must NAME a different NPC or their building/location.
- NPC alibis should be partially verifiable — another NPC can confirm or contradict them.
- The killer's alibi must be falsifiable through evidence or another NPC's testimony.
- Innocent NPCs' "hides" should explain their suspicious behavior without connecting to the murder (e.g. hiding an affair, a debt, illegal side business).

SUSPECTS:
- Exactly 4 NPCs (npc_1 through npc_4). Exactly one is the killer.
- Every innocent suspect must have BOTH a plausible motive AND suspicious behavior — but their "hides" must reveal an innocent explanation.
- The killer's "hides" must contain the actual incriminating secret that connects to the evidence.

EVIDENCE DISTRIBUTION:
- 6-7 evidence items total.
- Exactly 3 items link to the killer (these go in solution.evidence).
- Exactly 2 items link to innocent NPCs as red herrings.
- 1-2 items have links_to: null for atmosphere.
- Solution evidence MUST come from at least 3 different interiors — the player cannot solve the case from fewer than 3 buildings.
- No single interior may contain more than 2 evidence items.
- At least 1 evidence item must be found at the killer's own building (something they failed to hide).

BUILDINGS & INTERIORS:
- Exactly 5 buildings: one per NPC + one with npc_id null.
- Building types MUST be exactly one of: bar, apartments, warehouse, office, police.
- Exactly 5 interiors — one per building. Each interior's building_type MUST match its building's type.
- 5-7 objects per interior. Non-evidence objects must have examine_text that provides a hint, names another suspect, or reveals a contradiction.
- Building positions: integer coordinates, spread at least 4 units apart, X and Z between -6 and 6, Y always 0.

TONE: dark, moody, 1950s noir. Clipped prose. Moral ambiguity.
- NO markdown, NO explanation, ONLY the JSON object`
}

export async function generateCase(
  summary: CaseSummary,
  cityName: string
): Promise<CaseData> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 45_000)

  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'models/gemini-3.1-flash-lite-preview',
        body: {
          contents: [{ parts: [{ text: buildPrompt(summary, cityName) }] }],
          generationConfig: { temperature: 0.6, responseMimeType: 'application/json' },
        },
      }),
    })
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`Gemini API ${response.status}: ${body}`)
    }
    const data = await response.json()
    const candidate = data.candidates?.[0]
    if (!candidate?.content?.parts?.[0]?.text) {
      const reason = candidate?.finishReason ?? 'unknown'
      throw new Error(`Gemini returned no text (finishReason: ${reason}). Full response: ${JSON.stringify(data).slice(0, 500)}`)
    }
    const raw: string = candidate.content.parts[0].text
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start === -1 || end === -1) throw new Error('No JSON object found in response')
    const jsonStr = raw.slice(start, end + 1)
    try {
      return JSON.parse(jsonStr) as CaseData
    } catch (parseErr) {
      console.error('Failed to parse case JSON:', jsonStr.slice(0, 500))
      throw new Error(`JSON parse error in generateCase: ${parseErr instanceof Error ? parseErr.message : parseErr}`)
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Case generation timed out — check your network connection')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}
