# Multi-Agent Research Analyst (Sanity Challenge - Path 1)

A LangGraph supervisor that routes between research, analysis, writing and
review agents. The research agent queries a Sanity Context Knowledge Base
via MCP, so answers are source-linked and contradictions between sources are
surfaced explicitly rather than silently resolved.

## Architecture

```
research --> analysis --> writing --> review --+--> APPROVED --> END
                              ^                 |
                              +---- REVISE -----+   (max 2 retries)
```

- **research**: queries `sanity_knowledge_base` tool, never answers from
  general knowledge alone
- **analysis**: weighs conflicting claims by source trust level
- **writing**: drafts a cited report
- **review**: the hallucination gate - checks every claim traces back to
  the research findings, sends the draft back to `writing` if not

## Setup

1. **Sanity project**
   ```bash
   cd sanity
   npx sanity@latest init --project-id <existing-id-or-blank-for-new>
   ```
   This wires up the schemas already defined in `sanity/schemaTypes/`
   (`topic`, `source`, `claim`).

2. **Populate content**
   Open Sanity Studio (`npm run sanity:dev`) and add `topic` / `source` /
   `claim` documents for your chosen domain. Use the `contradicts` field on
   `claim` to link claims that disagree - this is what Sanity Context
   surfaces as a flagged conflict.

3. **Enable Sanity Context**
   In your Sanity Dashboard, point Sanity Context at this dataset. Copy the
   resulting MCP endpoint URL into `.env` as `SANITY_CONTEXT_MCP_URL`.

4. **Install agent dependencies**
   ```bash
   npm install
   cp .env.example .env   # fill in ANTHROPIC_API_KEY and SANITY_CONTEXT_MCP_URL
   ```

5. **Run it**
   ```bash
   npm run start -- "your research question about the domain"
   ```

## What's still a stub

- `research.ts` does a single model pass rather than a full tool-call loop.
  For production, loop: check `response.tool_calls`, execute
  `sanityContextTool`, feed results back, repeat until the model stops
  calling tools.
- No test question set yet - before submitting, write down 2-3 questions
  where a keyword search would get the wrong answer but this KB gets it
  right. That's your proof point for the DEV writeup.

## Submission checklist (Sanity Challenge, Path 1)

- [ ] Populate real claims/sources with at least one genuine contradiction
- [ ] Complete the tool-call loop in `research.ts`
- [ ] Record a build session in Claude Code for the embeddable transcript
- [ ] Scrub the transcript for API keys before publishing
- [ ] Write the DEV post from the Path One Submission Template
- [ ] Tag `#sanitychallenge`, include Sanity project ID or public dataset URL
- [ ] Submit by **October 4, 11:59 PM PDT**
