'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { AgentTrace, type TraceStep } from '@/components/AgentTrace'
import { ReportView } from '@/components/ReportView'

const EXAMPLE_QUESTIONS = [
  'Does LangGraph handle checkpoint deserialization safely by default?',
  'Can third-party checkpointers be trusted with the same security guarantees as official ones?',
  'How serious is the checkpoint deserialization risk in practice?',
]

export default function Home() {
  const [question, setQuestion] = useState('')
  const [running, setRunning] = useState(false)
  const [steps, setSteps] = useState<TraceStep[]>([])
  const [draft, setDraft] = useState('')
  const [approved, setApproved] = useState(false)
  const [error, setError] = useState('')
  const [caseId, setCaseId] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  async function runResearch() {
    if (!question.trim() || running) return

    setRunning(true)
    setSteps([])
    setDraft('')
    setApproved(false)
    setError('')
    setCaseId(null)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
        signal: controller.signal,
      })

      if (res.status === 429) {
        throw new Error('Too many requests from this connection — please wait a few minutes and try again.')
      }
      if (!res.ok) {
        throw new Error(`Request failed (${res.status}). The server may be unreachable or misconfigured.`)
      }
      if (!res.body) throw new Error('No response stream from the server.')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''

        for (const raw of events) {
          const eventMatch = raw.match(/^event: (.+)$/m)
          const dataMatch = raw.match(/^data: (.+)$/m)
          if (!eventMatch || !dataMatch) continue

          const eventType = eventMatch[1]
          const data = JSON.parse(dataMatch[1])

          if (eventType === 'step') {
            setSteps((prev) => [...prev, data as TraceStep])
          } else if (eventType === 'report') {
            setDraft(data.draft)
            // Persist the draft as a caseReport document the moment it's
            // ready - this is the "agent moves a draft forward" half of
            // the workflow. Fire-and-forget: a write failure shouldn't
            // block the UI, same philosophy as the MCP fallback.
            persistDraft(question, data.draft).then((id) => {
              if (id) setCaseId(id)
            })
          } else if (eventType === 'error') {
            setError(data.message)
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setRunning(false)
    }
  }

  async function persistDraft(q: string, draftText: string): Promise<string | null> {
    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, draftText }),
      })
      const data = await res.json()
      return data.id ?? null
    } catch {
      return null // workflow persistence is best-effort, not load-bearing
    }
  }

  async function handleApprove(finalText: string) {
    setDraft(finalText)
    setApproved(true)

    if (caseId) {
      // The workflow transition: draft -> approved, as a patch on the same
      // Sanity document - this is the "human approves through the same
      // transition" half of the workflow.
      fetch(`/api/cases/${caseId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finalText }),
      }).catch(() => {
        // best-effort - the case closes in the UI either way
      })
    }
  }

  const researchText = steps.find((s) => s.node === 'research_agent')?.preview ?? ''

  return (
    <main className="layout-grid">
      <aside>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', color: 'var(--text-bright)' }}>
          Research Dossier
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-dim)', marginTop: 0, marginBottom: 12, lineHeight: 1.6 }}>
          A research agent that reads a structured Knowledge Base and reports
          contradictions instead of smoothing them over.
        </p>
        <Link href="/sources" className="mono" style={{ fontSize: 12, color: 'var(--teal)', textDecoration: 'none' }}>
          browse the knowledge base →
        </Link>
        {' · '}
        <Link href="/cases" className="mono" style={{ fontSize: 12, color: 'var(--teal)', textDecoration: 'none' }}>
          case history →
        </Link>

        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {EXAMPLE_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => setQuestion(q)}
                disabled={running}
                className="mono"
                style={{
                  background: 'var(--bg-raised)',
                  border: '1px solid var(--thread)',
                  color: 'var(--text-dim)',
                  borderRadius: 12,
                  padding: '4px 10px',
                  fontSize: 11,
                  cursor: running ? 'default' : 'pointer',
                  textAlign: 'left',
                }}
              >
                {q.length > 46 ? q.slice(0, 46) + '…' : q}
              </button>
            ))}
          </div>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask something the Knowledge Base can answer…"
            rows={4}
            style={{
              width: '100%',
              background: 'var(--bg-raised)',
              border: '1px solid var(--thread)',
              borderRadius: 4,
              color: 'var(--text-bright)',
              padding: 12,
              fontFamily: 'var(--font-serif)',
              fontSize: 14,
              resize: 'vertical',
            }}
          />
          <button
            onClick={runResearch}
            disabled={running || !question.trim()}
            className="mono"
            style={{
              marginTop: 12,
              width: '100%',
              background: running ? 'var(--thread)' : 'var(--gold)',
              color: running ? 'var(--text-dim)' : 'var(--ink)',
              border: 'none',
              borderRadius: 4,
              padding: '10px 0',
              fontSize: 13,
              letterSpacing: '0.03em',
              cursor: running || !question.trim() ? 'default' : 'pointer',
            }}
          >
            {running ? 'investigating…' : 'investigate'}
          </button>

          {error && (
            <div
              style={{
                marginTop: 16,
                color: 'var(--rust)',
                fontSize: 13,
                border: '1px solid var(--rust)',
                borderRadius: 4,
                padding: '10px 12px',
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}

          {steps.length > 0 && (
            <div style={{ marginTop: 40 }}>
              <AgentTrace steps={steps} running={running} />
            </div>
          )}
        </div>
      </aside>

      <section style={{ display: 'flex', alignItems: 'flex-start', paddingTop: 8, minWidth: 0 }}>
        {draft && !approved ? (
          <ApprovalGate draft={draft} onApprove={handleApprove} />
        ) : draft && approved ? (
          <ReportView report={draft} research={researchText} />
        ) : running ? (
          <SkeletonReport />
        ) : (
          <div style={{ color: 'var(--text-dim)', fontSize: 14, paddingTop: 80, textAlign: 'center', width: '100%' }}>
            Ask a question to open a case.
          </div>
        )}
      </section>
    </main>
  )
}

function ApprovalGate({ draft, onApprove }: { draft: string; onApprove: (final: string) => void }) {
  const [text, setText] = useState(draft)

  return (
    <div
      style={{
        background: 'var(--paper)',
        color: 'var(--ink)',
        borderRadius: 2,
        padding: '40px 48px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
      }}
    >
      <div className="mono" style={{ fontSize: 12, color: 'var(--gold)', marginBottom: 16, letterSpacing: '0.04em' }}>
        pending review — edit before closing the case
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={16}
        style={{
          width: '100%',
          background: 'transparent',
          border: '1px solid var(--paper-line)',
          borderRadius: 2,
          color: 'var(--ink)',
          padding: 16,
          fontFamily: 'var(--font-serif)',
          fontSize: 15,
          lineHeight: 1.6,
          resize: 'vertical',
        }}
      />
      <button
        onClick={() => onApprove(text)}
        className="mono"
        style={{
          marginTop: 16,
          background: 'var(--teal)',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          padding: '10px 24px',
          fontSize: 13,
          letterSpacing: '0.03em',
          cursor: 'pointer',
        }}
      >
        approve & close case
      </button>
    </div>
  )
}

function SkeletonReport() {
  const widths = ['70%', '95%', '88%', '60%', '92%', '40%']
  return (
    <div
      style={{
        background: 'var(--paper)',
        borderRadius: 2,
        padding: '48px 56px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {widths.map((w, i) => (
        <div key={i} className="skeleton-line" style={{ width: w, animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  )
}