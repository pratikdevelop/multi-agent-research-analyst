import { StateGraph, END, MemorySaver } from '@langchain/langgraph'
import { ResearchState, type ResearchStateType } from './state'
import { researchNode } from './agents/research'
import { analysisNode } from './agents/analysis'
import { writingNode } from './agents/writing'
import { reviewNode } from './agents/review'

/**
 * Flow:
 *   research -> analysis -> writing -> review -> (writing again, on REVISE)
 *                                            \--> END, on APPROVED / retry cap hit
 *
 * Each node returns { next: <name> } and the router below reads it.
 * MemorySaver gives you checkpointing/retries for free - if a node throws,
 * you can resume the graph from its last good checkpoint instead of
 * restarting the whole run.
 */

function route(state: ResearchStateType): string {
  if (state.next === 'done') return END
  return state.next
}

const builder = new StateGraph(ResearchState)
  .addNode('research_agent', researchNode)
  .addNode('analysis_agent', analysisNode)
  .addNode('writing_agent', writingNode)
  .addNode('review_agent', reviewNode)
  .addEdge('__start__', 'research_agent')
  .addConditionalEdges('research_agent', route)
  .addConditionalEdges('analysis_agent', route)
  .addConditionalEdges('writing_agent', route)
  .addConditionalEdges('review_agent', route)

export const graph = builder.compile({ checkpointer: new MemorySaver() })
