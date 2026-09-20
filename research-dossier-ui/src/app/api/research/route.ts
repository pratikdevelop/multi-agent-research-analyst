import { HumanMessage } from '@langchain/core/messages'
import { graph } from '@/lib/agent/graph'

export const runtime = 'nodejs'
export const maxDuration = 60 // multi-agent run = several sequential LLM calls, default 10s isn't enough

const NODE_LABELS: Record<string, string> = {
  research_agent: 'Research',
  analysis_agent: 'Analysis',
  writing_agent: 'Writing',
  review_agent: 'Review',
}

export async function POST(req: Request) {
  const { question } = await req.json()

  if (!question || typeof question !== 'string') {
    return new Response('Missing "question" in request body', { status: 400 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        )
      }

      try {
        const events = await graph.stream(
          { messages: [new HumanMessage(question)] },
          { configurable: { thread_id: `run-${Date.now()}` }, streamMode: 'updates' }
        )

        for await (const chunk of events) {
          for (const [nodeName, update] of Object.entries(chunk)) {
            send('step', {
              node: nodeName,
              label: NODE_LABELS[nodeName] ?? nodeName,
              // Only forward the fields the UI actually renders, per-node,
              // so the trace shows meaningful content as each step lands.
              preview:
                (update as Record<string, unknown>).research ??
                (update as Record<string, unknown>).analysis ??
                (update as Record<string, unknown>).draft ??
                (update as Record<string, unknown>).reviewNotes ??
                '',
            })

            if ((update as Record<string, unknown>).draft) {
              send('report', { draft: (update as Record<string, unknown>).draft })
            }
          }
        }

        send('done', {})
      } catch (err) {
        send('error', { message: err instanceof Error ? err.message : String(err) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}