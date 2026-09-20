'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { AgentTrace, type TraceStep } from '@/components/AgentTrace'
import { ReportView } from '@/components/ReportView'

export default function Home() {
  const [question, setQuestion] = useState('')
  const [running, setRunning] = useState(false)
  const [steps, setSteps] = useState<TraceStep[]>([])
  const [report, setReport] = useState('')
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  async function runResearch() {
    if (!question.trim() || running) return

    setRunning(true)
    setSteps([])
    setReport('')
    setError('')

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
        signal: controller.signal,
      })

      if (!res.body) throw new Error('No response stream')

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
            setReport(data.draft)
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

  const researchText = steps.find((s) => s.node === 'research_agent')?.preview ?? ''

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: '340px 1fr',
        gap: 48,
        padding: '56px 48px',
        maxWidth: 1280,
        margin: '0 auto',
      }}
    >
      <aside>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 600,
            margin: '0 0 4px',
            color: 'var(--text-bright)',
          }}
        >
          Research Dossier
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-dim)', marginTop: 0, marginBottom: 12, lineHeight: 1.6 }}>
          A research agent that reads a structured Knowledge Base and reports
          contradictions instead of smoothing them over.
        </p>
        <Link
          href="/sources"
          className="mono"
          style={{ fontSize: 12, color: 'var(--teal)', textDecoration: 'none' }}
        >
          browse the knowledge base →
        </Link>

        <div style={{ marginTop: 24 }}>
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
          <div style={{ marginTop: 16, color: 'var(--rust)', fontSize: 13 }}>{error}</div>
        )}

        {steps.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <AgentTrace steps={steps} running={running} />
          </div>
        )}
        </div>
      </aside>

      <section style={{ display: 'flex', alignItems: 'flex-start', paddingTop: 8 }}>
        {report ? (
          <ReportView report={report} research={researchText} />
        ) : (
          <div
            style={{
              color: 'var(--text-dim)',
              fontSize: 14,
              paddingTop: 80,
              textAlign: 'center',
              width: '100%',
            }}
          >
            {running ? 'Compiling the dossier…' : 'Ask a question to open a case.'}
          </div>
        )}
      </section>
    </main>
  )
}