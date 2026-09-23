"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  File01Icon,
  Home01Icon,
  SentIcon,
  TestTube01Icon,
} from "@hugeicons/core-free-icons"

import { Example, ExampleWrapper } from "@/design-system/examples/example"
import { Badge } from "@/design-system/ui/badge"
import { Bubble, BubbleContent } from "@/design-system/ui/bubble"
import { Button } from "@/design-system/ui/button"
import {
  ContextCard,
  ContextCardHeader,
  ContextCardIcon,
  ContextCardSource,
  ContextCardTitle,
} from "@/design-system/ui/context-card"
import {
  InsightCard,
  InsightCardDelta,
  InsightCardLabel,
  InsightCardValue,
} from "@/design-system/ui/insight-card"
import {
  PromptBar,
  PromptBarActions,
  PromptBarHint,
  PromptBarInput,
  PromptBarToolbar,
} from "@/design-system/ui/prompt-bar"
import { Separator } from "@/design-system/ui/separator"
import {
  TaskList,
  TaskRow,
  TaskRowContent,
  TaskRowStatus,
  TaskRowTitle,
} from "@/design-system/ui/task-row"
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

export default function AgentScreenExample() {
  return (
    <ExampleWrapper className="md:grid-cols-1">
      <AgentScreenFull />
      <AgentScreenRunPanel />
    </ExampleWrapper>
  )
}

function AgentScreenFull() {
  const [value, setValue] = React.useState("")

  return (
    <Example title="Three-pane layout" className="p-0">
      <div className="flex min-h-[28rem] w-full overflow-hidden rounded-xl border">
        {/* Rail */}
        <nav
          aria-label="Workspace"
          className="hidden w-48 shrink-0 flex-col gap-1 border-r bg-nav p-2 text-nav-foreground sm:flex"
        >
          <Button variant="secondary" size="sm" className="justify-start">
            <HugeiconsIcon icon={Add01Icon} data-icon="inline-start" />
            New
          </Button>
          <Button variant="ghost" size="sm" className="justify-start">
            <HugeiconsIcon icon={Home01Icon} data-icon="inline-start" />
            Overview
          </Button>
          <Separator className="my-1 bg-nav-border" />
          <div className="px-2 py-1 text-[11px] font-medium tracking-wide text-nav-muted-foreground uppercase">
            Today
          </div>
          {["Overdue follow-ups", "Lab trend review"].map((item, i) => (
            <button
              key={item}
              type="button"
              aria-current={i === 0 ? "page" : undefined}
              className={[
                "truncate rounded-xl px-2.5 py-1.5 text-left text-xs transition-colors outline-none hover:bg-nav-hover focus-visible:ring-3 focus-visible:ring-ring/30",
                i === 0
                  ? "bg-nav-active font-medium text-nav-active-foreground"
                  : "",
              ].join(" ")}
            >
              {item}
            </button>
          ))}
        </nav>

        {/* Conversation */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-2 border-b px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">
                Overdue follow-ups
              </div>
              <div className="truncate text-[11px] text-muted-foreground">
                Cardiology clinic · 1,204 patients
              </div>
            </div>
            <Badge variant="outline">Read only</Badge>
          </header>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
            <Bubble variant="tinted" align="end">
              <BubbleContent>Who is overdue for a follow-up?</BubbleContent>
            </Bubble>
            <Thinking>
              <ThinkingTrigger>Thought for 4 seconds</ThinkingTrigger>
              <ThinkingContent>
                <ThinkingStep>
                  Checked encounters rather than the schedule so walk-ins count.
                </ThinkingStep>
              </ThinkingContent>
            </Thinking>
            <ToolChipGroup>
              <ToolChip status="success">
                <ToolChipStatus status="success" />
                <ToolChipLabel>search_encounters</ToolChipLabel>
                <ToolChipMeta>28 rows</ToolChipMeta>
              </ToolChip>
              <ToolChip status="running">
                <ToolChipStatus status="running" />
                <ToolChipLabel>rank</ToolChipLabel>
              </ToolChip>
            </ToolChipGroup>
            <Bubble variant="ghost">
              <BubbleContent>
                Ten patients are past their window. Three are more than a month
                overdue.
              </BubbleContent>
            </Bubble>
          </div>

          <div className="border-t p-3">
            <PromptBar onSubmit={(event) => event.preventDefault()}>
              <PromptBarInput
                placeholder="Ask a follow-up…"
                value={value}
                onChange={(event) => setValue(event.target.value)}
              />
              <PromptBarToolbar>
                <PromptBarHint>Answers cite the record</PromptBarHint>
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
        </div>

        {/* Context */}
        <aside className="hidden w-64 shrink-0 flex-col gap-3 border-l bg-surface-sunken p-3 lg:flex">
          <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Context
          </div>
          <ContextCard className="gap-1 py-2">
            <ContextCardHeader>
              <ContextCardIcon>
                <HugeiconsIcon icon={TestTube01Icon} />
              </ContextCardIcon>
              <ContextCardTitle>Lab panel, 14 Mar</ContextCardTitle>
            </ContextCardHeader>
            <ContextCardSource>observation/22190</ContextCardSource>
          </ContextCard>
          <ContextCard className="gap-1 py-2">
            <ContextCardHeader>
              <ContextCardIcon>
                <HugeiconsIcon icon={File01Icon} />
              </ContextCardIcon>
              <ContextCardTitle>Care plan</ContextCardTitle>
            </ContextCardHeader>
            <ContextCardSource>careplan/311</ContextCardSource>
          </ContextCard>
          <Separator />
          <InsightCard className="gap-1 rounded-2xl p-3">
            <InsightCardLabel>Overdue</InsightCardLabel>
            <InsightCardValue className="text-xl">28</InsightCardValue>
            <InsightCardDelta direction="up">+6 this week</InsightCardDelta>
          </InsightCard>
        </aside>
      </div>
    </Example>
  )
}

function AgentScreenRunPanel() {
  return (
    <Example title="Run panel" className="p-0">
      <div className="flex w-full flex-col overflow-hidden rounded-xl border">
        <header className="flex items-center gap-2 border-b bg-surface-head px-4 py-2.5">
          <div className="min-w-0 flex-1 text-sm font-medium">
            Nightly care-gap sweep
          </div>
          <Badge variant="info">Running</Badge>
        </header>
        <div className="grid gap-4 p-4 md:grid-cols-[1fr_auto_16rem]">
          <TaskList>
            <TaskRow status="done">
              <TaskRowStatus status="done" />
              <TaskRowContent>
                <TaskRowTitle>Load panels</TaskRowTitle>
              </TaskRowContent>
            </TaskRow>
            <TaskRow status="done">
              <TaskRowStatus status="done" />
              <TaskRowContent>
                <TaskRowTitle>Match against care plans</TaskRowTitle>
              </TaskRowContent>
            </TaskRow>
            <TaskRow status="running" last>
              <TaskRowStatus status="running" />
              <TaskRowContent>
                <TaskRowTitle>Draft outreach</TaskRowTitle>
              </TaskRowContent>
            </TaskRow>
          </TaskList>
          <Separator orientation="vertical" className="hidden md:block" />
          <div className="flex flex-col gap-3">
            <InsightCard className="gap-1 rounded-2xl p-3">
              <InsightCardLabel>Gaps found</InsightCardLabel>
              <InsightCardValue className="text-xl">128</InsightCardValue>
              <InsightCardDelta direction="down">
                -14 this week
              </InsightCardDelta>
            </InsightCard>
            <Button variant="outline" size="sm">
              Pause the run
            </Button>
          </div>
        </div>
      </div>
    </Example>
  )
}
