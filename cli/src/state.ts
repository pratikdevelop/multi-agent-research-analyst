import { Annotation } from '@langchain/langgraph'
import { BaseMessage } from '@langchain/core/messages'

export const ResearchState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (prev, next) => prev.concat(next),
    default: () => [],
  }),
  // Which agent should act next. The supervisor sets this each turn.
  next: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => 'research',
  }),
  // Raw findings pulled from the Knowledge Base, including flagged contradictions.
  research: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => '',
  }),
  // Synthesized analysis built from research.
  analysis: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => '',
  }),
  // Drafted report with citations.
  draft: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => '',
  }),
  // Review agent's verdict: 'approved' or a list of unsupported claims to fix.
  reviewNotes: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => '',
  }),
  retries: Annotation<number>({
    reducer: (_prev, next) => next,
    default: () => 0,
  }),
})

export type ResearchStateType = typeof ResearchState.State
