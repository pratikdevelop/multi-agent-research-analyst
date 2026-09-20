import { ChatGroq } from '@langchain/groq'
import { AIMessage, HumanMessage, SystemMessage, ToolMessage, type BaseMessage } from '@langchain/core/messages'
import { sanityContextTool } from '../tools/sanityContext'
import type { ResearchStateType } from '../state'

const model = new ChatGroq({ model: 'openai/gpt-oss-20b', temperature: 0 }).bindTools([
  sanityContextTool,
])

const SYSTEM_PROMPT = `You are the research agent. Your only job is to gather facts
using the sanity_knowledge_base tool - never answer from general knowledge alone.

Rules:
- Query the Knowledge Base with 1-3 focused questions covering the user's topic.
- If the tool flags a contradiction between sources, report BOTH sides with their
  sources and trust levels. Do not silently pick a winner.
- Once you have enough findings, stop calling tools and reply with a flat summary
  of sourced facts. Do not analyze or conclude - that's the analysis agent's job.`

const MAX_TOOL_ITERATIONS = 4

export async function researchNode(state: ResearchStateType) {
  const userGoal = state.messages[state.messages.length - 1]?.content ?? ''

  const history: BaseMessage[] = [
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage(String(userGoal)),
  ]

  let findings = ''

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await model.invoke(history)
    history.push(response)

    const toolCalls = (response as AIMessage).tool_calls ?? []

    if (toolCalls.length === 0) {
      // Model is done calling tools - this is the final findings summary.
      findings = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
      break
    }

    // Execute every requested tool call and feed results back as ToolMessages
    // before asking the model to continue.
    for (const call of toolCalls) {
      const result = await sanityContextTool.invoke(call.args as { query: string })
      history.push(
        new ToolMessage({
          content: typeof result === 'string' ? result : JSON.stringify(result),
          tool_call_id: call.id ?? '',
        })
      )
    }
  }

  if (!findings) {
    // Hit MAX_TOOL_ITERATIONS without a final text reply - fall back to
    // whatever tool results we collected rather than passing empty state
    // downstream.
    findings = history
      .filter((m): m is ToolMessage => m instanceof ToolMessage)
      .map((m) => m.content)
      .join('\n\n')
  }

  return {
    research: findings,
    next: 'analysis_agent',
  }
}
