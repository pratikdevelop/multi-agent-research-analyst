'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface CaseDoc {
  _id: string
  question: string
  status: 'draft' | 'approved'
  createdAt?: string
  approvedAt?: string
}

export default function CasesPage() {
  const [cases, setCases] = useState<CaseDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/cases/list')
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load (${r.status})`)
        return r.json()
      })
      .then((data) => {
        if (data.error) setError(data.error)
        else setCases(data.cases ?? [])
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="sources-shell" style={{ maxWidth: 760, margin: '0 auto' }}>
      <Link href="/" className="mono" style={{ color: 'var(--text-dim)', fontSize: 13, textDecoration: 'none' }}>
        ← back to case file
      </Link>

      <h1 style={{ fontSize: 26, fontWeight: 600, margin: '16px 0 4px', color: 'var(--text-bright)' }}>
        Case History
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-dim)', marginTop: 0, marginBottom: 40, lineHeight: 1.6 }}>
        Every investigation, stored as data — the agent opens a case as{' '}
        <span className="mono" style={{ color: 'var(--gold)' }}>
          draft
        </span>
        , a human closes it as{' '}
        <span className="mono" style={{ color: 'var(--teal)' }}>
          approved
        </span>
        . This is the same transition visible in Sanity Studio.
      </p>

      {loading && <div style={{ color: 'var(--text-dim)' }}>Loading…</div>}
      {error && <div style={{ color: 'var(--rust)' }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {cases.map((c) => (
          <div
            key={c._id}
            style={{
              background: 'var(--paper)',
              color: 'var(--ink)',
              borderRadius: 2,
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.question}
              </div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>
                {c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}
              </div>
            </div>
            <span
              className="mono"
              style={{
                fontSize: 11,
                padding: '3px 10px',
                borderRadius: 12,
                flexShrink: 0,
                background: c.status === 'approved' ? 'var(--teal)' : 'var(--gold)',
                color: c.status === 'approved' ? '#fff' : 'var(--ink)',
              }}
            >
              {c.status}
            </span>
          </div>
        ))}
      </div>

      {!loading && !error && cases.length === 0 && (
        <div style={{ color: 'var(--text-dim)' }}>No cases yet — ask a question on the main page.</div>
      )}
    </main>
  )
}