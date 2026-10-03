import { createClient } from '@sanity/client'

/**
 * A separate client from sanityContext.ts's read-only one, using a token
 * with Editor permission instead of Viewer. Kept as its own module
 * deliberately: the read path (research agent) and the write path (case
 * workflow) should never accidentally share a token, so a bug in one can't
 * silently grant write access to the other.
 */
export const sanityWriteClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID ?? '',
  dataset: process.env.SANITY_DATASET ?? 'production',
  apiVersion: '2026-01-01',
  token: process.env.SANITY_WRITE_TOKEN ?? '',
  useCdn: false,
})

export function isWriteConfigured(): boolean {
  return Boolean(process.env.SANITY_PROJECT_ID && process.env.SANITY_WRITE_TOKEN)
}