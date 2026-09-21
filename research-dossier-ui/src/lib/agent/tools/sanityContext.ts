import { MultiServerMCPClient } from '@langchain/mcp-adapters'

type SanityTool = Awaited<
  ReturnType<MultiServerMCPClient['getTools']>
>[number]

type SanityContext = {
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

export async function loadSanityContext(): Promise<SanityContext> {
  const mcpUrl = getRequiredEnv('SANITY_CONTEXT_MCP_URL')
  const organizationToken = getRequiredEnv(
    'SANITY_ORGANIZATION_TOKEN',
  )

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
    /*
     * Sanity Context exposes /initial-context for custom agents.
     * This gives us the Knowledge Base outline and grounding context.
     */
    const initialContextUrl =
      `${mcpUrl.replace(/\/$/, '')}/initial-context`

    const response = await fetch(initialContextUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${organizationToken}`,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(
        `Sanity Context initial_context failed: ` +
          `${response.status} ${response.statusText}`,
      )
    }

    const initialContext = await response.text()

    if (!initialContext.trim()) {
      throw new Error(
        'Sanity Context initial_context returned an empty response.',
      )
    }

    /*
     * Load the MCP tools.
     *
     * getTools() returns a flattened array of tools from the
     * configured MCP servers.
     */
    const tools = await client.getTools()

    const knowledgeBaseRead = tools.find(
      (tool: { name: string }) => tool.name === 'knowledge_base_read',
    )

    if (!knowledgeBaseRead) {
      const availableTools = tools
        .map((tool: { name: string }) => tool.name)
        .join(', ')

      throw new Error(
        `Sanity Context is connected, but ` +
          `knowledge_base_read is unavailable. ` +
          `Available tools: ${availableTools || 'none'}`,
      )
    }

    return {
      client,
      knowledgeBaseRead,
      initialContext,
    }
  } catch (error) {
    await client.close().catch(() => undefined)
    throw error
  }
}