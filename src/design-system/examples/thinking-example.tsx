"use client"

import * as React from "react"

import { Example, ExampleWrapper } from "@/design-system/examples/example"
import {
  Thinking,
  ThinkingContent,
  ThinkingStep,
  ThinkingTrigger,
} from "@/design-system/ui/thinking"
import { Bubble, BubbleContent } from "@/design-system/ui/bubble"
import { Button } from "@/design-system/ui/button"

export default function ThinkingExample() {
  return (
    <ExampleWrapper>
      <ThinkingActive />
      <ThinkingSettled />
      <ThinkingInConversation />
      <ThinkingControlled />
    </ExampleWrapper>
  )
}

function ThinkingActive() {
  return (
    <Example title="Working">
      <Thinking defaultOpen>
        <ThinkingTrigger active>Thinking</ThinkingTrigger>
        <ThinkingContent>
          <ThinkingStep label="Plan">
            The question is about overdue follow-ups, so I need the encounter
            list before I can rank anything.
          </ThinkingStep>
          <ThinkingStep label="Check">
            Pulling the last 90 days of visits for this panel.
          </ThinkingStep>
        </ThinkingContent>
      </Thinking>
    </Example>
  )
}

function ThinkingSettled() {
  return (
    <Example title="Settled">
      <Thinking>
        <ThinkingTrigger>Thought for 6 seconds</ThinkingTrigger>
        <ThinkingContent>
          <ThinkingStep label="Plan">
            Rank by days overdue, then by risk score, and cut the list at ten.
          </ThinkingStep>
          <ThinkingStep label="Check">
            Two records had no risk score. I left them in but sorted them last
            rather than dropping them silently.
          </ThinkingStep>
          <ThinkingStep label="Answer">
            Ten patients, sorted, with the two unscored ones flagged.
          </ThinkingStep>
        </ThinkingContent>
      </Thinking>
    </Example>
  )
}

function ThinkingInConversation() {
  return (
    <Example title="In a conversation">
      <div className="flex w-full max-w-md flex-col gap-4">
        <Bubble variant="tinted" align="end">
          <BubbleContent>Who is overdue for a follow-up?</BubbleContent>
        </Bubble>
        <Thinking>
          <ThinkingTrigger>Thought for 4 seconds</ThinkingTrigger>
          <ThinkingContent>
            <ThinkingStep>
              Checked the visit history first — the scheduling table alone would
              have missed the walk-ins.
            </ThinkingStep>
          </ThinkingContent>
        </Thinking>
        <Bubble variant="ghost">
          <BubbleContent>
            Ten patients are past their follow-up window. Three are more than a
            month overdue.
          </BubbleContent>
        </Bubble>
      </div>
    </Example>
  )
}

function ThinkingControlled() {
  const [open, setOpen] = React.useState(false)

  return (
    <Example title="Controlled">
      <div className="flex w-full flex-col items-start gap-4">
        <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
          {open ? "Hide reasoning" : "Show reasoning"}
        </Button>
        <Thinking open={open} onOpenChange={setOpen}>
          <ThinkingTrigger>Thought for 2 seconds</ThinkingTrigger>
          <ThinkingContent>
            <ThinkingStep>
              Open state is owned by the page here, so a toolbar elsewhere can
              expand every trace at once.
            </ThinkingStep>
          </ThinkingContent>
        </Thinking>
      </div>
    </Example>
  )
}
