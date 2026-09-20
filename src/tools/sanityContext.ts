import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { createClient } from '@sanity/client'

/**
 * Queries the Sanity dataset directly via GROQ instead of going through a
 * Sanity Context MCP endpoint. Same job - the research agent gets sourced,
 * structured facts with contradictions flagged - just without Context's
 * managed layer. Swap this back to the MCP version later if/when Context
 * is enabled for the org; the tool's public shape (name, description,
 * schema, return format) is designed to stay the same either way.
 */

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID ?? '',
  dataset: process.env.SANITY_DATASET ?? 'production',
  apiVersion: '2026-01-01',
  token: process.env.SANITY_API_TOKEN ?? '',
  useCdn: false, // fresh reads - a Viewer token needs this off to read drafts/private data reliably
})

interface ClaimResult {
  text: string
  confidence: string
  source: { title: string; url?: string; trustLevel?: string } | null
  contradictedBy: { text: string; source: { title: string; trustLevel?: string } | null }[]
}

// Free-text match on claim text plus topic title, so a natural-language
// query like "checkpointing safety" matches without needing exact wording.
const CLAIMS_QUERY = /* groq */ `
  *[
    _type == "claim" &&
    (
      text match $searchTerm ||
      topic->title match $searchTerm
    )
  ]{
    text,
    confidence,
    "source": source->{title, url, trustLevel},
    "contradictedBy": contradicts[]->{
      text,
      "source": source->{title, trustLevel}
    }
  }
`

async function queryClaims(query: string): Promise<ClaimResult[]> {
  if (!process.env.SANITY_PROJECT_ID || !process.env.SANITY_API_TOKEN) {
    throw new Error(
      'SANITY_PROJECT_ID and SANITY_API_TOKEN must be set in .env before ' +
        'querying the Knowledge Base.'
    )
  }

  // GROQ `match` needs a trailing wildcard per search word for partial matching
  const searchTerm = `*${query.trim()}*`

  return client.fetch(CLAIMS_QUERY, { searchTerm })
}

export const sanityContextTool = tool(
  async ({ query }: { query: string }) => {
    const results = await queryClaims(query)

    if (results.length === 0) {
      return 'No matching entries in the Knowledge Base for this query.'
    }

    return results
      .map((r) => {
        const conflict =
          r.contradictedBy && r.contradictedBy.length > 0
            ? `\n  CONTRADICTS: ${r.contradictedBy
                .map((c) => `"${c.text}" (${c.source?.title ?? 'unknown source'})`)
                .join('; ')}`
            : ''
        return `- ${r.text}\n  Source: ${r.source?.title ?? 'unknown'}${r.source?.url ? ` (${r.source.url})` : ''} [trust: ${r.source?.trustLevel ?? 'unknown'}, confidence: ${r.confidence}]${conflict}`
      })
      .join('\n\n')
  },
  {
    name: 'sanity_knowledge_base',
    description:
      'Query the Sanity-backed Knowledge Base for claims relevant to a topic. ' +
      'Returns source-linked results and flags any claims that contradict each other. ' +
      'Always prefer this over general knowledge when the question touches the target domain.',
    schema: z.object({
      query: z.string().describe('Natural-language question or topic to search the Knowledge Base for'),
    }),
  }
)