import { createClient } from '@sanity/client'

export const runtime = 'nodejs'

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID ?? '',
  dataset: process.env.SANITY_DATASET ?? 'production',
  apiVersion: '2026-01-01',
  token: process.env.SANITY_API_TOKEN ?? '',
  useCdn: false,
})

// Pulls every claim, expanded with its topic, source, and any claims it
// contradicts (with their sources too) - everything the browser page needs
// in one round trip, grouped by topic.
const ALL_CLAIMS_QUERY = /* groq */ `
  *[_type == "claim"] | order(topic->title asc) {
    _id,
    text,
    confidence,
    lastVerified,
    "topic": topic->{_id, title},
    "source": source->{title, url, trustLevel, kind},
    "contradictedBy": contradicts[]->{
      _id,
      text,
      "source": source->{title, trustLevel}
    }
  }
`

export async function GET() {
  try {
    const claims = await client.fetch(ALL_CLAIMS_QUERY)
    return Response.json({ claims })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}