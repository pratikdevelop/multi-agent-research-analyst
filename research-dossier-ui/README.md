# Research Dossier — Web UI

A web front end for the multi-agent research analyst: ask a question, watch
research → analysis → writing → review run live in the case log on the left,
then read the result as a dossier on the right — with a CONTESTED stamp when
sources disagreed, and clickable citations pulled straight from the research.

This is a separate, self-contained Next.js app. It has its own copy of the
agent code (`src/lib/agent/`) so it can run independently of the CLI project
you already have — same logic, just wired to a browser instead of a terminal.

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env` with the same values as your CLI project's `.env`:
- `GROQ_API_KEY`
- `SANITY_API_TOKEN`
- `SANITY_PROJECT_ID` / `SANITY_DATASET` (already pre-filled)

## Run

```bash
npm run dev
```

Open `http://localhost:3000`, type a question your Knowledge Base can answer
(e.g. "does LangGraph handle checkpoint deserialization safely by default?"),
and hit **investigate**.

## How the streaming works

`src/app/api/research/route.ts` runs the LangGraph graph with
`streamMode: "updates"` and forwards each node's result to the browser as a
Server-Sent Event the moment it completes — that's what drives the live case
log instead of a single "please wait" spinner.

## If you change the agent logic later

Keep `src/lib/agent/` here in sync with the CLI project's `src/` — they're
currently two copies of the same code. If you'd rather maintain one copy,
turning this into a small monorepo (shared `packages/agent`) is the next
natural step, but wasn't necessary to get a working demo.

## Still worth adding

- Streaming token-by-token from the writing agent (currently it streams
  whole-node results, not partial text)
- Human-in-the-loop: pause after `review_agent` for manual approval before
  showing the final dossier
- A KB browser view so people can see the raw claims/sources/contradictions
  without asking a question first
