import type { WorldData } from '../store/gameStore'

const PROMPT = `Generate a noir detective game world set in 1950s America.

Return ONLY valid JSON with this exact structure:
{
  "city": {
    "name": "string — a noir city name",
    "atmosphere": "2-3 plain sentences describing the city at night. Concrete details only — what you see, hear, smell. No metaphors."
  },
  "cases": [
    {
      "id": "case_1",
      "title": "string",
      "type": "murder",
      "hook": "One plain sentence stating what happened and what's suspicious about it. E.g. 'A dock worker was found dead in a locked office with no sign of forced entry.'",
      "victim_name": "string",
      "location": "string — a specific place in the city"
    },
    {
      "id": "case_2",
      "title": "string",
      "type": "theft",
      "hook": "One plain sentence stating what happened and what's suspicious. No poetic language.",
      "victim_name": "string",
      "location": "string"
    },
    {
      "id": "case_3",
      "title": "string",
      "type": "kidnapping",
      "hook": "One plain sentence stating what happened and what's suspicious. No poetic language.",
      "victim_name": "string",
      "location": "string"
    },
    {
      "id": "case_4",
      "title": "string",
      "type": "disappearance",
      "hook": "One plain sentence stating what happened and what's suspicious. No poetic language.",
      "victim_name": "string",
      "location": "string"
    }
  ]
}

Rules:
- Write in plain, direct language — no purple prose, no metaphors, no flowery descriptions
- City setting is 1950s noir but described with concrete facts, not poetic atmosphere
- Exactly 4 cases, using these types: murder, theft, kidnapping, disappearance
- Each case hook must state a clear suspicious situation that makes a player want to investigate
- NO markdown, NO explanation, ONLY the JSON object`

export async function generateWorld(): Promise<WorldData> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)

  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
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
      return JSON.parse(jsonStr) as WorldData
    } catch (parseErr) {
      console.error('Failed to parse world JSON:', jsonStr.slice(0, 500))
      throw new Error(`JSON parse error in generateWorld: ${parseErr instanceof Error ? parseErr.message : parseErr}`)
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('World generation timed out — check your network connection')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}
