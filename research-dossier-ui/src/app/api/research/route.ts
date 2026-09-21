import { HumanMessage } from '@langchain/core/messages'
import { graph } from '@/lib/agent/graph'

export const runtime = 'nodejs'
export const maxDuration = 60

const NODE_LABELS: Record<string, string> = {
  research_agent: 'Research',
  analysis_agent: 'Analysis',
  writing_agent: 'Writing',
  review_agent: 'Review',
}

export async function POST(req: Request) {
  const { question } = await req.json()

  if (!question || typeof question !== 'string') {
    return new Response('Missing "question" in request body', {
      status: 400,
    })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(
            `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
          ),
        )
      }

      try {
        const events = await graph.stream(
          {
            messages: [new HumanMessage(question)],
          },
          {
            configurable: {
              thread_id: `run-${Date.now()}`,
            },
            streamMode: 'updates',
          },
        )

        for await (const chunk of events) {
          for (const [nodeName, update] of Object.entries(chunk)) {
            const nodeUpdate = update as Record<string, unknown>

            send('step', {
              node: nodeName,
              label: NODE_LABELS[nodeName] ?? nodeName,

              preview:
                nodeUpdate.research ??
                nodeUpdate.analysis ??
                nodeUpdate.draft ??
                nodeUpdate.reviewNotes ??
                '',
            })

            if (nodeUpdate.draft) {
              send('report', {
                draft: nodeUpdate.draft,
              })
            }
          }
        }

        send('done', {})
      } catch (err) {
        send('error', {
          message:
            err instanceof Error ? err.message : String(err),
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}