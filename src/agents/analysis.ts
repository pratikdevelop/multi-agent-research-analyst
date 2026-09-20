import { ChatGroq } from '@langchain/groq'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import type { ResearchStateType } from '../state'

const model = new ChatGroq({ model: 'openai/gpt-oss-20b', temperature: 0 })

const SYSTEM_PROMPT = `You are the analysis agent. You receive sourced findings from
the research agent, including any flagged contradictions.

Your job:
- Weigh conflicting claims by source trust level and recency, and state which side
  you favor and why - never hide that a conflict existed.
- Identify what's well-supported vs. thin (single low-trust source).
- Produce a structured analysis the writing agent can turn into a report.
Do not write the final report - just the analysis.`

export async function analysisNode(state: ResearchStateType) {
  const response = await model.invoke([
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage(`Research findings:\n\n${state.research}`),
  ])

  const analysis = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

  return {
    analysis,
    next: 'writing_agent',
  }
}