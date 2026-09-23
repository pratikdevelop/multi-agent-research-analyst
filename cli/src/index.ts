import 'dotenv/config'
import { HumanMessage } from '@langchain/core/messages'
import { graph } from './graph'

async function main() {
  const question = process.argv.slice(2).join(' ')

  if (!question) {
    console.error('Usage: npm run start -- "your research question"')
    process.exit(1)
  }

  const result = await graph.invoke(
    { messages: [new HumanMessage(question)] },
    { configurable: { thread_id: `run-${Date.now()}` } }
  )

  console.log('\n=== RESEARCH ===\n', result.research)
  console.log('\n=== ANALYSIS ===\n', result.analysis)
  console.log('\n=== FINAL REPORT ===\n', result.draft)
}

main().catch((err) => {
  console.error('Run failed:', err)
  process.exit(1)
})
