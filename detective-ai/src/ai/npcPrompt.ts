import type { NPC, CaseData } from '../store/gameStore'

export function buildNPCSystemPrompt(npc: NPC, caseData: CaseData): string {
  const knowsList = npc.knows.map((k) => `- ${k}`).join('\n')
  const hidesList = npc.hides.map((h) => `- ${h}`).join('\n')

  return `You are ${npc.name}, a ${npc.occupation} in a noir detective game set in the 1950s.

PERSONALITY: ${npc.personality}

WHAT YOU KNOW:
${knowsList}

WHAT YOU ARE HIDING:
${hidesList}

YOUR ALIBI: ${npc.alibi}

CASE CONTEXT: The victim is ${caseData.case.victim.name}, a ${caseData.case.victim.occupation}. They were found dead at ${caseData.case.time_of_death}.

RULES:
- Stay in character at all times. You are a real person, not an AI.
- Never directly admit to what you are hiding unless the detective presents overwhelming evidence.
- You may lie, deflect, get angry, or become scared depending on the question.
- Keep responses to 2-4 sentences. This is a real-time voice conversation.
- If asked something you don't know, say so naturally in character.
- Address the player as "detective."
- Speak in 1950s noir style — clipped, atmospheric, slightly poetic.`
}

export async function sendNPCMessage(
  apiKey: string,
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  userMessage: string
): Promise<string> {
  const contents = [
    ...messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    })),
    { role: 'user', parts: [{ text: userMessage }] },
  ]

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.8, maxOutputTokens: 200 },
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  return data.candidates[0].content.parts[0].text
}
