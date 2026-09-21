import { NextResponse } from "next/server";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";

export const runtime = "nodejs";

export async function GET() {
  try {
    const mcpUrl = process.env.SANITY_CONTEXT_MCP_URL;
    const token = process.env.SANITY_ORGANIZATION_TOKEN;

    if (!mcpUrl) {
      return NextResponse.json(
        {
          ok: false,
          error: "SANITY_CONTEXT_MCP_URL is missing",
        },
        { status: 500 }
      );
    }

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error: "SANITY_ORGANIZATION_TOKEN is missing",
        },
        { status: 500 }
      );
    }

    const client = new MultiServerMCPClient({
      mcpServers: {
        sanity: {
          transport: "http",
          url: mcpUrl,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      },
      throwOnLoadError: true,
      useStandardContentBlocks: true,
    });

    const tools = await client.getTools();

    const toolNames = tools.map((tool) => tool.name);

    await client.close();

    return NextResponse.json({
      ok: true,
      endpoint: mcpUrl,
      tools: toolNames,
      hasInitialContext: toolNames.includes("initial_context"),
      hasKnowledgeBaseRead: toolNames.includes("knowledge_base_read"),
      message:
        "Sanity Context MCP connection succeeded.",
    });
  } catch (error) {
    console.error("Sanity Context MCP error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown MCP connection error",
      },
      { status: 500 }
    );
  }
}