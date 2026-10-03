import { sanityWriteClient, isWriteConfigured } from '@/lib/sanity/writeClient'
import { isRateLimited, getClientKey } from '@/lib/rateLimit'

export const runtime = 'nodejs'

const MAX_TEXT_LENGTH = 10000

export async function POST(req: Request) {
  if (!isWriteConfigured()) {
    return Response.json({ skipped: true, reason: 'SANITY_WRITE_TOKEN not configured' })
  }

  const clientKey = getClientKey(req)
  if (isRateLimited(clientKey, 10, 10 * 60 * 1000)) {
    return Response.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const { question, draftText } = await req.json()

    if (!question || !draftText || typeof question !== 'string' || typeof draftText !== 'string') {
      return Response.json({ error: 'question and draftText are required strings' }, { status: 400 })
    }

    if (question.length > 500 || draftText.length > MAX_TEXT_LENGTH) {
      return Response.json({ error: 'question or draftText exceeds the allowed length' }, { status: 400 })
    }

    const doc = await sanityWriteClient.create({
      _type: 'caseReport',
      question,
      draftText,
      status: 'draft',
      createdAt: new Date().toISOString(),
    })

    return Response.json({ id: doc._id })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}