import { Example, ExampleWrapper } from "@/design-system/examples/example"
import {
  ToolChip,
  ToolChipGroup,
  ToolChipLabel,
  ToolChipMeta,
  ToolChipStatus,
} from "@/design-system/ui/tool-chip"
import { Bubble, BubbleContent } from "@/design-system/ui/bubble"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Calendar01Icon,
  DatabaseIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons"

export default function ToolChipsExample() {
  return (
    <ExampleWrapper>
      <ToolChipStatuses />
      <ToolChipWithMeta />
      <ToolChipCustomIcons />
      <ToolChipInResponse />
    </ExampleWrapper>
  )
}

function ToolChipStatuses() {
  return (
    <Example title="Statuses">
      <ToolChipGroup>
        <ToolChip status="pending">
          <ToolChipStatus status="pending" />
          <ToolChipLabel>Queued</ToolChipLabel>
        </ToolChip>
        <ToolChip status="running">
          <ToolChipStatus status="running" />
          <ToolChipLabel>Searching records</ToolChipLabel>
        </ToolChip>
        <ToolChip status="success">
          <ToolChipStatus status="success" />
          <ToolChipLabel>Read chart</ToolChipLabel>
        </ToolChip>
        <ToolChip status="error">
          <ToolChipStatus status="error" />
          <ToolChipLabel>Lab feed timed out</ToolChipLabel>
        </ToolChip>
      </ToolChipGroup>
    </Example>
  )
}

function ToolChipWithMeta() {
  return (
    <Example title="With meta">
      <ToolChipGroup>
        <ToolChip status="success">
          <ToolChipStatus status="success" />
          <ToolChipLabel>search_encounters</ToolChipLabel>
          <ToolChipMeta>412ms</ToolChipMeta>
        </ToolChip>
        <ToolChip status="success">
          <ToolChipStatus status="success" />
          <ToolChipLabel>read_observations</ToolChipLabel>
          <ToolChipMeta>28 rows</ToolChipMeta>
        </ToolChip>
        <ToolChip status="running">
          <ToolChipStatus status="running" />
          <ToolChipLabel>summarise</ToolChipLabel>
          <ToolChipMeta>6s</ToolChipMeta>
        </ToolChip>
      </ToolChipGroup>
    </Example>
  )
}

function ToolChipCustomIcons() {
  return (
    <Example title="Custom icons">
      <ToolChipGroup>
        <ToolChip status="success">
          <HugeiconsIcon icon={DatabaseIcon} aria-hidden="true" />
          <ToolChipLabel>Patient index</ToolChipLabel>
        </ToolChip>
        <ToolChip status="running">
          <HugeiconsIcon icon={Search01Icon} aria-hidden="true" />
          <ToolChipLabel>Full-text search</ToolChipLabel>
        </ToolChip>
        <ToolChip status="pending">
          <HugeiconsIcon icon={Calendar01Icon} aria-hidden="true" />
          <ToolChipLabel>Scheduling</ToolChipLabel>
        </ToolChip>
      </ToolChipGroup>
    </Example>
  )
}

function ToolChipInResponse() {
  return (
    <Example title="In a response">
      <div className="flex w-full max-w-md flex-col gap-3">
        <ToolChipGroup>
          <ToolChip status="success">
            <ToolChipStatus status="success" />
            <ToolChipLabel>search_encounters</ToolChipLabel>
            <ToolChipMeta>28 rows</ToolChipMeta>
          </ToolChip>
          <ToolChip status="success">
            <ToolChipStatus status="success" />
            <ToolChipLabel>read_observations</ToolChipLabel>
          </ToolChip>
        </ToolChipGroup>
        <Bubble variant="ghost">
          <BubbleContent>
            I looked at the last 90 days of encounters and pulled the matching
            observations. Three results sit outside the reference range.
          </BubbleContent>
        </Bubble>
      </div>
    </Example>
  )
}
