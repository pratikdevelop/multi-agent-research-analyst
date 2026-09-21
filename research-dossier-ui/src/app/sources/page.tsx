'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Claim {
  _id: string
  text: string
  confidence: string
  lastVerified?: string
  topic: { _id: string; title: string } | null
  source: { title: string; url?: string; trustLevel?: string; kind?: string } | null
  contradictedBy: { _id: string; text: string; source: { title: string; trustLevel?: string } | null }[] | null
}

const CONFIDENCE_COLOR: Record<string, string> = {
  confirmed: 'var(--teal)',
  disputed: 'var(--rust)',
  outdated: 'var(--text-dim)',
  unverified: 'var(--gold)',
}

export default function SourcesPage() {
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/kb')
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load (${r.status})`)
        return r.json()
      })
      .then((data) => {
        if (data.error) setError(data.error)
        else setClaims(data.claims ?? [])
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false))
  }, [])

  const byTopic = new Map<string, Claim[]>()
  for (const claim of claims) {
    const key = claim.topic?.title ?? 'Untitled topic'
    if (!byTopic.has(key)) byTopic.set(key, [])
    byTopic.get(key)!.push(claim)
  }

  return (
    <main className="sources-shell" style={{ maxWidth: 860, margin: '0 auto' }}>
      <Link
        href="/"
        className="mono"
        style={{ color: 'var(--text-dim)', fontSize: 13, textDecoration: 'none' }}
      >
        ← back to case file
      </Link>

      <h1 style={{ fontSize: 26, fontWeight: 600, margin: '16px 0 4px', color: 'var(--text-bright)' }}>
        Knowledge Base
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-dim)', marginTop: 0, marginBottom: 40, lineHeight: 1.6 }}>
        Every claim on record, with its source and any claim it contradicts.
      </p>

      {loading && <div style={{ color: 'var(--text-dim)' }}>Loading…</div>}
      {error && <div style={{ color: 'var(--rust)' }}>{error}</div>}

      {Array.from(byTopic.entries()).map(([topicTitle, topicClaims]) => (
        <section key={topicTitle} style={{ marginBottom: 48 }}>
          <h2
            className="mono"
            style={{
              fontSize: 13,
              letterSpacing: '0.04em',
              color: 'var(--gold)',
              marginBottom: 16,
              textTransform: 'lowercase',
            }}
          >
            {topicTitle}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {topicClaims.map((claim) => (
              <div
                key={claim._id}
                id={claim._id}
                style={{
                  background: 'var(--paper)',
                  color: 'var(--ink)',
                  borderRadius: 2,
                  padding: '20px 24px',
                  borderLeft: `3px solid ${CONFIDENCE_COLOR[claim.confidence] ?? 'var(--thread)'}`,
                }}
              >
                <div style={{ fontSize: 15, lineHeight: 1.6 }}>{claim.text}</div>

                <div
                  className="mono"
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 12,
                    marginTop: 12,
                    fontSize: 12,
                    color: 'var(--ink-soft)',
                  }}
                >
                  <span>{claim.confidence}</span>
                  {claim.source && (
                    <span>
                      ·{' '}
                      {claim.source.url ? (
                        <a href={claim.source.url} target="_blank" rel="noreferrer" style={{ color: 'var(--teal)' }}>
                          {claim.source.title}
                        </a>
                      ) : (
                        claim.source.title
                      )}{' '}
                      ({claim.source.trustLevel ?? 'unknown'})
                    </span>
                  )}
                </div>

                {(claim.contradictedBy ?? []).length > 0 && (
                  <div
                    style={{
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: '1px solid var(--paper-line)',
                    }}
                  >
                    <div className="mono" style={{ fontSize: 11, color: 'var(--rust)', marginBottom: 6 }}>
                      contradicts
                    </div>
                    {(claim.contradictedBy ?? []).map((c) => (
                      <a
                        key={c._id}
                        href={`#${c._id}`}
                        style={{
                          display: 'block',
                          fontSize: 13,
                          color: 'var(--ink)',
                          textDecoration: 'none',
                          fontStyle: 'italic',
                        }}
                      >
                        "{c.text}" — {c.source?.title ?? 'unknown source'}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      {!loading && !error && claims.length === 0 && (
        <div style={{ color: 'var(--text-dim)' }}>No claims in the Knowledge Base yet.</div>
      )}
    </main>
  )
}