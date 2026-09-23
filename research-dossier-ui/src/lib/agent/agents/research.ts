import { ChatGroq } from '@langchain/groq'
import { AIMessage, HumanMessage, SystemMessage, ToolMessage, type BaseMessage } from '@langchain/core/messages'
import type { StructuredToolInterface } from '@langchain/core/tools'
import { sanityContextTool } from '../tools/sanityContext'
import { getSanityContext, isMcpConfigured } from '../tools/sanityContextMcp'
import type { ResearchStateType } from '../state'

const BASE_SYSTEM_PROMPT = `You are the research agent. Your only job is to gather facts
using the Knowledge Base tool available to you - never answer from general
knowledge alone.

Rules:
- Query the Knowledge Base with 1-3 focused questions covering the user's topic.
- If the tool flags a contradiction between sources, report BOTH sides with their
  sources and trust levels. Do not silently pick a winner.
- Once you have enough findings, stop calling tools and reply with a flat summary
  of sourced facts. Do not analyze or conclude - that's the analysis agent's job.`

const MAX_TOOL_ITERATIONS = 4

interface ResolvedTools {
  tools: StructuredToolInterface[]
  extraSystemContext: string
}

let resolvedCache: ResolvedTools | null = null

async function resolveTools(): Promise<ResolvedTools> {
  if (resolvedCache) return resolvedCache

  if (isMcpConfigured()) {
    try {
      const { knowledgeBaseRead, initialContext } = await getSanityContext()
      console.info('[research_agent] connected to Sanity Context MCP - using knowledge_base_read.')
      resolvedCache = {
        tools: [knowledgeBaseRead],
        // Context's own recommended grounding text - gives the model an
        // outline of what's in the Knowledge Base before it even queries.
        extraSystemContext: `\n\n--- Knowledge Base context ---\n${initialContext}`,
      }
      return resolvedCache
    } catch (err) {
      console.warn(
        '[research_agent] Sanity Context MCP configured but connection failed, ' +
          'falling back to direct GROQ query tool:',
        err instanceof Error ? err.message : err
      )
    }
  }

  resolvedCache = { tools: [sanityContextTool], extraSystemContext: '' }
  return resolvedCache
}

export async function researchNode(state: ResearchStateType) {
  const { tools, extraSystemContext } = await resolveTools()
  const toolsByName = new Map(tools.map((t) => [t.name, t]))

  const model = new ChatGroq({ model: 'openai/gpt-oss-20b', temperature: 0 }).bindTools(tools)

  const userGoal = state.messages[state.messages.length - 1]?.content ?? ''

  const history: BaseMessage[] = [
    new SystemMessage(BASE_SYSTEM_PROMPT + extraSystemContext),
    new HumanMessage(String(userGoal)),
  ]

  let findings = ''

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await model.invoke(history)
    history.push(response)

    const toolCalls = (response as AIMessage).tool_calls ?? []

    if (toolCalls.length === 0) {
      findings = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
      break
    }

    for (const call of toolCalls) {
      const tool = toolsByName.get(call.name)
      const result = tool ? await tool.invoke(call.args) : `Error: no tool named "${call.name}" is available.`

      history.push(
        new ToolMessage({
          content: typeof result === 'string' ? result : JSON.stringify(result),
          tool_call_id: call.id ?? '',
        })
      )
    }
  }

  if (!findings) {
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