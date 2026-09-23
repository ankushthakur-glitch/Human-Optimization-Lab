"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  SentIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "@hugeicons/core-free-icons"

import { Example, ExampleWrapper } from "@/design-system/examples/example"
import {
  Bubble,
  BubbleContent,
  BubbleGroup,
  BubbleReactions,
} from "@/design-system/ui/bubble"
import { Button } from "@/design-system/ui/button"
import {
  LoadingState,
  LoadingStateIndicator,
  LoadingStateLabel,
} from "@/design-system/ui/loading-state"
import { Marker, MarkerContent } from "@/design-system/ui/marker"
import {
  PromptBar,
  PromptBarActions,
  PromptBarInput,
  PromptBarToolbar,
} from "@/design-system/ui/prompt-bar"
import {
  Thinking,
  ThinkingContent,
  ThinkingStep,
  ThinkingTrigger,
} from "@/design-system/ui/thinking"
import {
  ToolChip,
  ToolChipGroup,
  ToolChipLabel,
  ToolChipMeta,
  ToolChipStatus,
} from "@/design-system/ui/tool-chip"

export default function ChatExample() {
  return (
    <ExampleWrapper>
      <ChatThread />
      <ChatWithFeedback />
      <ChatPending />
      <ChatEmpty />
    </ExampleWrapper>
  )
}

function ChatThread() {
  return (
    <Example title="Thread">
      <div className="flex w-full max-w-md flex-col gap-4">
        <Marker variant="separator">
          <MarkerContent>Today</MarkerContent>
        </Marker>
        <Bubble variant="tinted" align="end">
          <BubbleContent>
            Which patients in my panel are overdue for a follow-up?
          </BubbleContent>
        </Bubble>
        <Thinking>
          <ThinkingTrigger>Thought for 4 seconds</ThinkingTrigger>
          <ThinkingContent>
            <ThinkingStep>
              The scheduling table alone would miss walk-ins, so I checked the
              encounter history instead.
            </ThinkingStep>
          </ThinkingContent>
        </Thinking>
        <ToolChipGroup>
          <ToolChip status="success">
            <ToolChipStatus status="success" />
            <ToolChipLabel>search_encounters</ToolChipLabel>
            <ToolChipMeta>28 rows</ToolChipMeta>
          </ToolChip>
        </ToolChipGroup>
        <Bubble variant="ghost">
          <BubbleContent>
            Ten patients are past their follow-up window. Three are more than a
            month overdue. R. Álvarez is the furthest out at 41 days.
          </BubbleContent>
        </Bubble>
        <BubbleGroup>
          <Bubble variant="outline" align="end">
            <BubbleContent
              className="border-dashed border-primary"
              render={<button type="button" />}
            >
              Draft outreach for the three worst
            </BubbleContent>
          </Bubble>
          <Bubble variant="outline" align="end">
            <BubbleContent
              className="border-dashed border-primary"
              render={<button type="button" />}
            >
              Show me the full list
            </BubbleContent>
          </Bubble>
        </BubbleGroup>
      </div>
    </Example>
  )
}

function ChatWithFeedback() {
  return (
    <Example title="Response feedback">
      <div className="flex w-full max-w-md flex-col gap-6">
        <Bubble variant="tinted" align="end">
          <BubbleContent>Summarise the March visit.</BubbleContent>
        </Bubble>
        <Bubble variant="ghost">
          <BubbleContent>
            Routine review. Adherence improved after moving to a morning dose,
            no hypoglycaemic episodes, and the A1c order was deferred to April.
          </BubbleContent>
          <BubbleReactions className="gap-1 bg-background">
            <Button variant="ghost" size="icon-xs" aria-label="Helpful">
              <HugeiconsIcon icon={ThumbsUpIcon} />
            </Button>
            <Button variant="ghost" size="icon-xs" aria-label="Not helpful">
              <HugeiconsIcon icon={ThumbsDownIcon} />
            </Button>
          </BubbleReactions>
        </Bubble>
      </div>
    </Example>
  )
}

function ChatPending() {
  const [value, setValue] = React.useState("")

  return (
    <Example title="Waiting on a response">
      <div className="flex w-full max-w-md flex-col gap-4">
        <Bubble variant="tinted" align="end">
          <BubbleContent>Compare this to the visit in March.</BubbleContent>
        </Bubble>
        <LoadingState>
          <LoadingStateIndicator kind="dots" />
          <LoadingStateLabel className="font-normal text-muted-foreground">
            Reading two encounters
          </LoadingStateLabel>
        </LoadingState>
        <PromptBar onSubmit={(event) => event.preventDefault()}>
          <PromptBarInput
            placeholder="Ask a follow-up…"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <PromptBarToolbar>
            <PromptBarActions>
              <Button
                type="submit"
                size="icon-sm"
                aria-label="Send"
                disabled={!value.trim()}
              >
                <HugeiconsIcon icon={SentIcon} />
              </Button>
            </PromptBarActions>
          </PromptBarToolbar>
        </PromptBar>
      </div>
    </Example>
  )
}

const OPENERS = [
  "What changed since the last visit?",
  "Who is overdue for a follow-up?",
  "Draft a portal message",
]

function ChatEmpty() {
  return (
    <Example title="New conversation">
      <div className="flex w-full max-w-md flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="font-heading text-base font-medium">
            Ask about this chart
          </h3>
          <p className="text-sm text-muted-foreground">
            Answers cite the record they came from. Nothing is written back
            without your approval.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {OPENERS.map((opener) => (
            <Bubble key={opener} variant="outline">
              <BubbleContent
                className="border-dashed"
                render={<button type="button" />}
              >
                {opener}
              </BubbleContent>
            </Bubble>
          ))}
        </div>
      </div>
    </Example>
  )
}
