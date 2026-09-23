import { Example, ExampleWrapper } from "@/design-system/examples/example"
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockBody,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockTitle,
} from "@/design-system/ui/code-block"
import { Badge } from "@/design-system/ui/badge"

const QUERY = `select p.mrn, max(e.occurred_at) as last_visit
from patient p
join encounter e on e.patient_id = p.id
where e.occurred_at < now() - interval '90 days'
group by p.mrn
order by last_visit asc
limit 10;`

const SNIPPET = `const overdue = await db.query(OVERDUE_FOLLOW_UPS)

// Unscored patients sort last rather than dropping out of the list.
return overdue.sort((a, b) => (b.risk ?? -1) - (a.risk ?? -1))`

const SHORT = `npx shadcn@latest add button`

export default function CodeBlockExample() {
  return (
    <ExampleWrapper>
      <CodeBlockDefault />
      <CodeBlockNumbered />
      <CodeBlockHighlighted />
      <CodeBlockBare />
    </ExampleWrapper>
  )
}

function CodeBlockDefault() {
  return (
    <Example title="Default">
      <CodeBlock>
        <CodeBlockHeader>
          <CodeBlockTitle>overdue.sql</CodeBlockTitle>
          <CodeBlockActions>
            <CodeBlockCopyButton value={QUERY} />
          </CodeBlockActions>
        </CodeBlockHeader>
        <CodeBlockBody code={QUERY} />
      </CodeBlock>
    </Example>
  )
}

function CodeBlockNumbered() {
  return (
    <Example title="Line numbers">
      <CodeBlock>
        <CodeBlockHeader>
          <CodeBlockTitle>follow-ups.ts</CodeBlockTitle>
          <Badge variant="outline">TypeScript</Badge>
          <CodeBlockActions>
            <CodeBlockCopyButton value={SNIPPET} />
          </CodeBlockActions>
        </CodeBlockHeader>
        <CodeBlockBody code={SNIPPET} showLineNumbers />
      </CodeBlock>
    </Example>
  )
}

function CodeBlockHighlighted() {
  return (
    <Example title="Highlighted lines">
      <CodeBlock>
        <CodeBlockHeader>
          <CodeBlockTitle>overdue.sql</CodeBlockTitle>
          <CodeBlockActions>
            <CodeBlockCopyButton value={QUERY} />
          </CodeBlockActions>
        </CodeBlockHeader>
        <CodeBlockBody code={QUERY} showLineNumbers highlightLines={[4, 6]} />
      </CodeBlock>
    </Example>
  )
}

function CodeBlockBare() {
  return (
    <Example title="Without a header">
      <CodeBlock>
        <CodeBlockBody code={SHORT} />
      </CodeBlock>
    </Example>
  )
}
