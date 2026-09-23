import { ChatGroq } from '@langchain/groq'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import type { ResearchStateType } from '../state'

const model = new ChatGroq({ model: 'openai/gpt-oss-20b', temperature: 0 })

const SYSTEM_PROMPT = `You are the review agent - the hallucination gate.

Compare the draft report against the original research findings. For every
factual claim in the draft, confirm it traces back to something in the findings.

Respond in exactly one of these two formats:
1. "APPROVED" if every claim is supported and contradictions were handled honestly.
2. "REVISE: <bullet list of specific unsupported claims or issues>" if not.`

const MAX_RETRIES = 2

export async function reviewNode(state: ResearchStateType) {
  const response = await model.invoke([
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage(`Research findings:\n\n${state.research}\n\nDraft report:\n\n${state.draft}`),
  ])

  const verdict = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

  if (verdict.trim().startsWith('APPROVED') || state.retries >= MAX_RETRIES) {
    return { reviewNotes: '', next: 'done' }
  }

  return {
    reviewNotes: verdict,
    retries: state.retries + 1,
    next: 'writing_agent',
  }
}