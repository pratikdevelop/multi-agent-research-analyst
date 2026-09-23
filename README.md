# Research Dossier

A multi-agent research system that queries a structured Knowledge Base and
**preserves disagreement between sources instead of flattening it into one
confident answer**.

Built with LangGraph, Groq, and Sanity, for the
[Sanity Challenge](https://dev.to/challenges/sanity-2026-09-16) — this README
covers the engineering decisions in more depth than the contest submission
did, for anyone evaluating the code itself.

**Live demo:** [multi-agent-research-analyst.vercel.app](https://multi-agent-research-analyst.vercel.app/)

## The problem this solves

Ask most RAG systems a question where the sources disagree, and you get one
of two failure modes: the model picks a side silently, or it mushes both
answers into a hedge that doesn't actually tell you anything is contested.

This system's Knowledge Base has a real example: LangGraph's docs imply
checkpoint serialization is safe by default, an official security advisory
(CVE-2026-28277) says the default is actually permissive, and a second
advisory database's framing of the same CVE adds that exploitation requires
an attacker to already have privileged write access. Three true statements,
in tension. The system is built to surface that tension explicitly rather
than resolve it for you.

## Architecture

```
User question
     │
     ▼
Research Agent ──queries──▶ GROQ (Sanity Content API)
     │                             │
     │                     claims + sources +
     │                     contradicts[] relationships
     ▼
Analysis Agent (weighs conflicting claims by source trust)
     │
     ▼
Writing Agent (drafts a cited report)
     │
     ▼
Review Agent (hallucination gate — rejects unsupported claims,
              bounces back to Writing, max 2 retries)
     │
     ▼
Human approval gate (edit or approve before the case closes)
     │
     ▼
Final report, stamped CONTESTED if sources disagreed
```

Each stage is a LangGraph node; `src/lib/agent/router.ts` reads the `next`
field each node writes to shared state and decides where to go — including
the retry loop back to Writing when Review rejects a draft.

## Why a `contradicts` field, not just similarity search

The Sanity schema (`sanity/schemaTypes/`) models three document types —
`topic`, `source`, `claim` — where `claim` documents carry a `contradicts`
field referencing other claims. That's the actual mechanism: a vector
similarity search over the same text would return all three sources as
plausible matches, but nothing in embedding space tells the agent that two
of them are in *tension* rather than just topically related. Making
`contradicts` an explicit graph edge means the research agent's GROQ query
can pull a claim and its contradictions in a single request, with no
inference step where the model might miss the conflict.

## What's real vs. what's a deliberate shortcut

Being direct about this, since it matters for anyone reading the code:

- **Sanity Context MCP, with a GROQ fallback** — the research agent connects
  to the real Sanity Context MCP endpoint (`src/lib/agent/tools/sanityContextMcp.ts`),
  using the `knowledge_base_read` tool it exposes and the `/initial-context`
  grounding text Context recommends injecting into the system prompt. If MCP
  isn't configured (missing env vars) or the connection fails at runtime, it
  falls back automatically to a direct GROQ query
  (`src/lib/agent/tools/sanityContext.ts`) against the same dataset — same
  tool-call contract either way, so the rest of the agent doesn't know or
  care which one served the request.
- **UI-level approval gate, not a LangGraph interrupt** — LangGraph does
  have a real `interrupt()` / `Command({resume})` API for pausing execution
  mid-graph. I chose a simpler UI-level gate (the draft renders in an
  editable box; the stamped "final" view only appears after clicking
  Approve) because it's lower-risk to ship correctly under deadline pressure
  than an interrupt/resume flow I hadn't tested end-to-end. Functionally
  equivalent for the user; architecturally a shortcut.
- **Single-pass citation extraction is regex-based**, not structured data
  passed through state. It works because the research tool's output format
  is consistent, but it's coupled to that format — see `src/lib/citations.ts`.

## Running it

This is one of two projects in the repo — `cli/` (terminal agent) and
`research-dossier-ui/` (this one, the web app). They each have their own
`package.json`, `node_modules`, and `.env`, and share the same Sanity
project/dataset.

```bash
npm install
cp .env.example .env
# fill in GROQ_API_KEY, SANITY_API_TOKEN, SANITY_PROJECT_ID, SANITY_DATASET
```

**Web app:**
```bash
npm run dev
```

**Terminal version, same agent logic** — lives in the sibling `cli/` folder:
```bash
cd ../cli
npm install   # separate install, separate node_modules
npm run start -- "does LangGraph handle checkpoint deserialization safely by default?"
```

**Tests** (pure logic — router and citation parsing, no live API calls):
```bash
npm test
```

**Knowledge Base browser** — inspect the raw claims/sources/contradictions
without asking a question first: `/sources` route once `npm run dev` is
running.

## Project structure

```
src/
  app/
    page.tsx              - chat UI, live agent trace, approval gate
    sources/page.tsx       - Knowledge Base browser
    api/research/route.ts  - SSE streaming endpoint
    api/kb/route.ts        - Knowledge Base fetch endpoint
  components/
    AgentTrace.tsx          - live case-log of agent progress
    ReportView.tsx          - the rendered dossier + CONTESTED stamp
  lib/
    citations.ts            - extracted, unit-tested citation parsing
    agent/
      graph.ts               - the compiled StateGraph
      router.ts               - extracted, unit-tested routing logic
      state.ts                 - shared graph state shape
      agents/                   - research, analysis, writing, review nodes
      tools/sanityContext.ts     - the Sanity query tool
sanity/
  schemaTypes/              - topic, source, claim schemas
```

Note: `cli/` (the terminal version) and `sanity/` (the Studio) are sibling
folders at the repo root, outside `research-dossier-ui/` — this README
covers the web app only.

## Next steps (if I keep building this)

1. **True graph-level interrupts** — replace the UI approval gate with
   LangGraph's actual `interrupt()`/resume flow
2. **Multi-topic support** — the Knowledge Base currently has one deep
   topic; the architecture supports more without changes
3. Token-by-token streaming from the Writing agent, rather than
   whole-node streaming