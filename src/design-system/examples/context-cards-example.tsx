import { HugeiconsIcon } from "@hugeicons/react"
import {
  File01Icon,
  Note01Icon,
  TestTube01Icon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons"

import { Example, ExampleWrapper } from "@/design-system/examples/example"
import {
  ContextCard,
  ContextCardBody,
  ContextCardFooter,
  ContextCardGrid,
  ContextCardHeader,
  ContextCardIcon,
  ContextCardSource,
  ContextCardTitle,
} from "@/design-system/ui/context-card"
import { Badge } from "@/design-system/ui/badge"
import { Button } from "@/design-system/ui/button"

export default function ContextCardsExample() {
  return (
    <ExampleWrapper>
      <ContextGrid />
      <ContextSingle />
      <ContextCompact />
      <ContextAttached />
    </ExampleWrapper>
  )
}

function ContextGrid() {
  return (
    <Example title="Grid">
      <ContextCardGrid>
        <ContextCard>
          <ContextCardHeader>
            <ContextCardIcon>
              <HugeiconsIcon icon={Note01Icon} />
            </ContextCardIcon>
            <ContextCardTitle>Progress note, 12 Mar</ContextCardTitle>
          </ContextCardHeader>
          <ContextCardBody>
            Patient reports better adherence since switching to the morning
            dose. No hypoglycaemic episodes in the last six weeks.
          </ContextCardBody>
          <ContextCardFooter>
            <ContextCardSource>encounter/8841</ContextCardSource>
          </ContextCardFooter>
        </ContextCard>
        <ContextCard>
          <ContextCardHeader>
            <ContextCardIcon>
              <HugeiconsIcon icon={TestTube01Icon} />
            </ContextCardIcon>
            <ContextCardTitle>Lab panel, 14 Mar</ContextCardTitle>
          </ContextCardHeader>
          <ContextCardBody>
            A1c 8.2%, eGFR 78, potassium 5.3. Flagged high for the third draw
            running.
          </ContextCardBody>
          <ContextCardFooter>
            <ContextCardSource>observation/22190</ContextCardSource>
          </ContextCardFooter>
        </ContextCard>
      </ContextCardGrid>
    </Example>
  )
}

function ContextSingle() {
  return (
    <Example title="Single source">
      <ContextCard className="max-w-md">
        <ContextCardHeader>
          <ContextCardIcon>
            <HugeiconsIcon icon={File01Icon} />
          </ContextCardIcon>
          <ContextCardTitle>Care plan (diabetes)</ContextCardTitle>
          <Badge variant="outline" className="ml-auto">
            Primary
          </Badge>
        </ContextCardHeader>
        <ContextCardBody>
          Target A1c below 7.5%. Repeat every three months. Escalate to
          endocrinology if two consecutive results are above 9%.
        </ContextCardBody>
        <ContextCardFooter>
          <ContextCardSource>careplan/311</ContextCardSource>
          <Button variant="link" size="xs" className="ml-auto h-auto p-0">
            Open
          </Button>
        </ContextCardFooter>
      </ContextCard>
    </Example>
  )
}

function ContextCompact() {
  return (
    <Example title="Compact list">
      <div className="flex w-full flex-col gap-2">
        {[
          { title: "Demographics", source: "patient/40921" },
          { title: "Active problems (4)", source: "condition?status=active" },
          { title: "Medications (7)", source: "medicationrequest" },
        ].map((c) => (
          <ContextCard
            key={c.source}
            className="flex-row items-center gap-3 py-2"
          >
            <ContextCardIcon>
              <HugeiconsIcon icon={UserCircleIcon} />
            </ContextCardIcon>
            <ContextCardTitle className="flex-1">{c.title}</ContextCardTitle>
            <ContextCardSource className="shrink-0">
              {c.source}
            </ContextCardSource>
          </ContextCard>
        ))}
      </div>
    </Example>
  )
}

function ContextAttached() {
  return (
    <Example title="Attached to an answer">
      <div className="flex w-full flex-col gap-3">
        <p className="text-sm leading-relaxed">
          Potassium has risen at each of the last three draws. The care plan
          asks for a repeat panel before any dose change.
        </p>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Based on
          </span>
          <ContextCardGrid className="sm:grid-cols-1">
            <ContextCard className="gap-1 py-2">
              <ContextCardHeader>
                <ContextCardIcon>
                  <HugeiconsIcon icon={TestTube01Icon} />
                </ContextCardIcon>
                <ContextCardTitle>Lab panel, 14 Mar</ContextCardTitle>
                <ContextCardSource className="ml-auto shrink-0">
                  observation/22190
                </ContextCardSource>
              </ContextCardHeader>
            </ContextCard>
            <ContextCard className="gap-1 py-2">
              <ContextCardHeader>
                <ContextCardIcon>
                  <HugeiconsIcon icon={File01Icon} />
                </ContextCardIcon>
                <ContextCardTitle>Care plan (diabetes)</ContextCardTitle>
                <ContextCardSource className="ml-auto shrink-0">
                  careplan/311
                </ContextCardSource>
              </ContextCardHeader>
            </ContextCard>
          </ContextCardGrid>
        </div>
      </div>
    </Example>
  )
}
