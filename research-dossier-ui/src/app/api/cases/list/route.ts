import { createClient } from '@sanity/client'

export const runtime = 'nodejs'

// Read-only client, same shape as sanityContext.ts's - cases are read with
// the Viewer token, only written with the separate Editor-scoped one.
const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID ?? '',
  dataset: process.env.SANITY_DATASET ?? 'production',
  apiVersion: '2026-01-01',
  token: process.env.SANITY_API_TOKEN ?? '',
  useCdn: false,
})

const CASES_QUERY = /* groq */ `
  *[_type == "caseReport"] | order(createdAt desc) {
    _id,
    question,
    status,
    createdAt,
    approvedAt
  }
`

export async function GET() {
  try {
    const cases = await client.fetch(CASES_QUERY)
    return Response.json({ cases })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}