import type { WorldData } from '../store/gameStore'

const PROMPT = `Generate a noir detective game world set in 1950s America.

Return ONLY valid JSON with this exact structure:
{
  "city": {
    "name": "string — a noir city name",
    "atmosphere": "2-3 sentences describing the city at night — rain, neon, corruption, fog"
  },
  "cases": [
    {
      "id": "case_1",
      "title": "string",
      "type": "murder",
      "hook": "One gripping sentence hinting at the mystery without spoiling it",
      "victim_name": "string",
      "location": "string — a specific place in the city"
    },
    {
      "id": "case_2",
      "title": "string",
      "type": "theft",
      "hook": "...",
      "victim_name": "string",
      "location": "string"
    },
    {
      "id": "case_3",
      "title": "string",
      "type": "kidnapping",
      "hook": "...",
      "victim_name": "string",
      "location": "string"
    },
    {
      "id": "case_4",
      "title": "string",
      "type": "disappearance",
      "hook": "...",
      "victim_name": "string",
      "location": "string"
    }
  ]
}

Rules:
- City must feel dangerous, atmospheric, corrupt — like 1950s noir
- Exactly 4 cases, using these types: murder, theft, kidnapping, disappearance
- Each case hook must be unique, evocative, and not reveal the solution
- NO markdown, NO explanation, ONLY the JSON object`

export async function generateWorld(): Promise<WorldData> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/gemini-3.1-flash-lite-preview',
      body: {
        contents: [{ parts: [{ text: PROMPT }] }],
        generationConfig: { temperature: 0.9, responseMimeType: 'application/json' },
      },
    }),
  })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`API error ${response.status}: ${body}`)
  }
  const data = await response.json()
  const raw: string = data.candidates[0].content.parts[0].text
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON object found in response')
  return JSON.parse(raw.slice(start, end + 1)) as WorldData
}
