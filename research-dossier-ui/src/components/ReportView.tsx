'use client'

interface Citation {
  title: string
  url: string
}

// Pulls "(https://...)" style links out of the research/report text so we
// can render them as real clickable citations instead of leaving them as
// buried inline text.
function extractCitations(text: string): Citation[] {
  const seen = new Map<string, Citation>()
  const re = /([A-Za-z0-9 _'".,-]{3,60})\s*\((https?:\/\/[^\s)]+)\)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(text))) {
    const url = match[2]
    if (!seen.has(url)) {
      seen.set(url, { title: match[1].trim().replace(/^Source:\s*/, ''), url })
    }
  }
  return Array.from(seen.values())
}

export function ReportView({ report, research }: { report: string; research: string }) {
  const citations = extractCitations(research || report)
  const hasContradiction = /contradict/i.test(research) || /contradict/i.test(report)

  return (
    <div
      style={{
        background: 'var(--paper)',
        color: 'var(--ink)',
        borderRadius: 2,
        padding: '48px 56px',
        position: 'relative',
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
      }}
    >
      {hasContradiction && (
        <div
          className="mono"
          style={{
            position: 'absolute',
            top: 40,
            right: 48,
            border: '2px solid var(--rust)',
            color: 'var(--rust)',
            padding: '4px 12px',
            fontSize: 12,
            letterSpacing: '0.08em',
            transform: 'rotate(4deg)',
            opacity: 0.85,
          }}
        >
          CONTESTED
        </div>
      )}

      <div
        className="mono"
        style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 8, letterSpacing: '0.04em' }}
      >
        dossier
      </div>

      <div
        style={{
          whiteSpace: 'pre-wrap',
          lineHeight: 1.7,
          fontSize: 16,
          maxWidth: 640,
        }}
      >
        {report}
      </div>

      {citations.length > 0 && (
        <div style={{ marginTop: 40, paddingTop: 24, borderTop: `1px solid var(--paper-line)` }}>
          <div className="mono" style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 12 }}>
            sources
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {citations.map((c) => (
              <a
                key={c.url}
                href={c.url}
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--teal)', fontSize: 14, textDecoration: 'none' }}
              >
                {c.title || c.url} ↗
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
