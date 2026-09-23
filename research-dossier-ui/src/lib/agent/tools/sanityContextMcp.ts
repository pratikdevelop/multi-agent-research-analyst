import { MultiServerMCPClient } from '@langchain/mcp-adapters'

type SanityTool = Awaited<ReturnType<MultiServerMCPClient['getTools']>>[number]

export interface SanityContext {
  client: MultiServerMCPClient
  knowledgeBaseRead: SanityTool
  initialContext: string
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is required`)
  }
  return value
}

export function isMcpConfigured(): boolean {
  return Boolean(process.env.SANITY_CONTEXT_MCP_URL && process.env.SANITY_ORGANIZATION_TOKEN)
}

async function loadSanityContext(): Promise<SanityContext> {
  const mcpUrl = getRequiredEnv('SANITY_CONTEXT_MCP_URL')
  const organizationToken = getRequiredEnv('SANITY_ORGANIZATION_TOKEN')

  const client = new MultiServerMCPClient({
    throwOnLoadError: true,
    useStandardContentBlocks: true,
    mcpServers: {
      sanity: {
        transport: 'http',
        url: mcpUrl,
        headers: {
          Authorization: `Bearer ${organizationToken}`,
        },
      },
    },
  })

  try {
    // Sanity Context exposes /initial-context for custom agents - this
    // gives us the Knowledge Base outline and grounding context that
    // Sanity recommends including in the agent's system prompt.
    const initialContextUrl = `${mcpUrl.replace(/\/$/, '')}/initial-context`

    const response = await fetch(initialContextUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${organizationToken}` },
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`Sanity Context initial_context failed: ${response.status} ${response.statusText}`)
    }

    const initialContext = await response.text()

    if (!initialContext.trim()) {
      throw new Error('Sanity Context initial_context returned an empty response.')
    }

    const tools = await client.getTools()

    const knowledgeBaseRead = tools.find((t) => t.name === 'knowledge_base_read')

    if (!knowledgeBaseRead) {
      const availableTools = tools.map((t) => t.name).join(', ')
      throw new Error(
        `Sanity Context is connected, but knowledge_base_read is unavailable. ` +
          `Available tools: ${availableTools || 'none'}`
      )
    }

    return { client, knowledgeBaseRead, initialContext }
  } catch (error) {
    await client.close().catch(() => undefined)
    throw error
  }
}

// Cached at module scope - loadSanityContext() opens a connection and
// fetches /initial-context, neither of which should happen on every single
// research node invocation within the same running process.
let contextPromise: Promise<SanityContext> | null = null

export function getSanityContext(): Promise<SanityContext> {
  if (!contextPromise) {
    contextPromise = loadSanityContext()
  }
  return contextPromise
}