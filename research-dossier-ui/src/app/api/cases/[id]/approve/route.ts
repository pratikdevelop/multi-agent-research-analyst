import { sanityWriteClient, isWriteConfigured } from '@/lib/sanity/writeClient'

export const runtime = 'nodejs'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isWriteConfigured()) {
    return Response.json({ skipped: true, reason: 'SANITY_WRITE_TOKEN not configured' })
  }

  try {
    const { id } = await params
    const { finalText } = await req.json()

    if (!finalText) {
      return Response.json({ error: 'finalText is required' }, { status: 400 })
    }

    // The workflow transition itself: draft -> approved, as a patch on the
    // same document rather than a new one - the document's history in
    // Sanity's dataset IS the audit trail of who approved what and when.
    await sanityWriteClient
      .patch(id)
      .set({
        status: 'approved',
        finalText,
        approvedAt: new Date().toISOString(),
      })
      .commit()

    return Response.json({ ok: true })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}