'use client'

import { useState } from 'react'

export interface TraceStep {
  node: string
  label: string
  preview: string
}

const ALL_STEPS = ['research_agent', 'analysis_agent', 'writing_agent', 'review_agent']
const STEP_LABELS: Record<string, string> = {
  research_agent: 'Research',
  analysis_agent: 'Analysis',
  writing_agent: 'Writing',
  review_agent: 'Review',
}

export function AgentTrace({ steps, running }: { steps: TraceStep[]; running: boolean }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const completedNodes = new Set(steps.map((s) => s.node))
  const activeIndex = steps.length

  function toggle(node: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(node)) next.delete(node)
      else next.add(node)
      return next
    })
  }

  return (
    <div className="mono" style={{ fontSize: 13, lineHeight: 1.6 }}>
      <div style={{ color: 'var(--text-dim)', marginBottom: 20, letterSpacing: '0.02em' }}>
        case log
      </div>

      {ALL_STEPS.map((node, i) => {
        const done = completedNodes.has(node)
        const isActive = running && i === activeIndex
        const step = steps.find((s) => s.node === node)
        const isLast = i === ALL_STEPS.length - 1
        const isOpen = expanded.has(node)

        return (
          <div key={node + i} style={{ display: 'flex', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: done ? 'var(--thread-active)' : isActive ? 'var(--gold)' : 'var(--thread)',
                  boxShadow: isActive ? '0 0 0 3px rgba(184,144,46,0.2)' : 'none',
                  marginTop: 4,
                  flexShrink: 0,
                }}
              />
              {!isLast && (
                <div
                  style={{
                    width: 1,
                    flex: 1,
                    minHeight: 24,
                    background: done ? 'var(--thread-active)' : 'var(--thread)',
                  }}
                />
              )}
            </div>

            <div style={{ paddingBottom: 24, minWidth: 0, flex: 1 }}>
              <div
                onClick={() => done && step?.preview && toggle(node)}
                style={{
                  color: done ? 'var(--text-bright)' : isActive ? 'var(--gold)' : 'var(--text-dim)',
                  cursor: done && step?.preview ? 'pointer' : 'default',
                  userSelect: 'none',
                }}
              >
                {String(i + 1).padStart(2, '0')} · {STEP_LABELS[node]}
                {isActive && <span style={{ opacity: 0.6 }}> — working…</span>}
                {done && step?.preview && (
                  <span style={{ opacity: 0.5, fontSize: 11 }}> {isOpen ? '[collapse]' : '[expand]'}</span>
                )}
              </div>
              {step && step.preview && (
                <div
                  style={{
                    color: 'var(--text-dim)',
                    marginTop: 6,
                    fontSize: 12,
                    maxHeight: isOpen ? 'none' : 60,
                    overflow: 'hidden',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {isOpen ? step.preview : `${step.preview.slice(0, 160)}${step.preview.length > 160 ? '…' : ''}`}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}