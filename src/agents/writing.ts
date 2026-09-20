import { ChatGroq } from '@langchain/groq'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import type { ResearchStateType } from '../state'

const model = new ChatGroq({ model: 'openai/gpt-oss-20b', temperature: 0.3 })

const SYSTEM_PROMPT = `You are the writing agent. Turn the analysis into a clear
report for the end user.

Rules:
- Every factual claim must carry an inline citation back to the source named in
  the research/analysis (e.g. "(per Sanity docs, official-docs)").
- Never state a claim that wasn't in the research findings - the review agent
  will check this and bounce anything unsupported back to you.
- If a contradiction was flagged, mention it explicitly rather than smoothing it over.`

export async function writingNode(state: ResearchStateType) {
  const revisionNote = state.reviewNotes
    ? `\n\nThe review agent rejected your previous draft. Fix these issues:\n${state.reviewNotes}`
    : ''

  const response = await model.invoke([
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage(
      `Analysis:\n\n${state.analysis}\n\nResearch findings for citation reference:\n\n${state.research}${revisionNote}`
    ),
  ])

  const draft = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

  return {
    draft,
    next: 'review_agent',
  }
}