"use client"

import * as React from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Attachment01Icon,
  Mic01Icon,
  SentIcon,
  StopIcon,
} from "@hugeicons/core-free-icons"

import { Example, ExampleWrapper } from "@/design-system/examples/example"
import {
  PromptBar,
  PromptBarActions,
  PromptBarAttachments,
  PromptBarHint,
  PromptBarInput,
  PromptBarToolbar,
} from "@/design-system/ui/prompt-bar"
import { Badge } from "@/design-system/ui/badge"
import { Button } from "@/design-system/ui/button"
import { Kbd } from "@/design-system/ui/kbd"

export default function PromptBarExample() {
  return (
    <ExampleWrapper>
      <PromptBarDefault />
      <PromptBarBusy />
      <PromptBarWithContext />
      <PromptBarSuggestions />
    </ExampleWrapper>
  )
}

function PromptBarDefault() {
  const [value, setValue] = React.useState("")

  const send = () => {
    if (!value.trim()) return
    toast(`Sent: ${value.trim()}`)
    setValue("")
  }

  return (
    <Example title="Default">
      <PromptBar
        onSubmit={(event) => {
          event.preventDefault()
          send()
        }}
      >
        <PromptBarInput
          placeholder="Ask about this patient…"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onSubmitShortcut={send}
        />
        <PromptBarToolbar>
          <Button variant="ghost" size="icon-sm" aria-label="Attach a file">
            <HugeiconsIcon icon={Attachment01Icon} />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Dictate">
            <HugeiconsIcon icon={Mic01Icon} />
          </Button>
          <PromptBarHint>
            <Kbd>Enter</Kbd> to send
          </PromptBarHint>
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
    </Example>
  )
}

function PromptBarBusy() {
  return (
    <Example title="Generating">
      <PromptBar onSubmit={(event) => event.preventDefault()}>
        <PromptBarInput
          placeholder="Ask a follow-up…"
          defaultValue="Compare this to the visit in March"
          disabled
        />
        <PromptBarToolbar>
          <PromptBarHint>Generating a response…</PromptBarHint>
          <PromptBarActions>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast("Generation stopped")}
            >
              <HugeiconsIcon icon={StopIcon} data-icon="inline-start" />
              Stop
            </Button>
          </PromptBarActions>
        </PromptBarToolbar>
      </PromptBar>
    </Example>
  )
}

function PromptBarWithContext() {
  const [chips, setChips] = React.useState(["Encounter 12 Mar", "Lab panel"])

  return (
    <Example title="With attached context">
      <PromptBar onSubmit={(event) => event.preventDefault()}>
        {chips.length ? (
          <PromptBarAttachments>
            {chips.map((chip) => (
              <Badge key={chip} variant="secondary">
                {chip}
                <button
                  type="button"
                  aria-label={`Remove ${chip}`}
                  className="ml-0.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setChips((c) => c.filter((x) => x !== chip))}
                >
                  ×
                </button>
              </Badge>
            ))}
          </PromptBarAttachments>
        ) : null}
        <PromptBarInput placeholder="Ask about the attached context…" />
        <PromptBarToolbar>
          <PromptBarHint>
            {chips.length} item{chips.length === 1 ? "" : "s"} in context
          </PromptBarHint>
          <PromptBarActions>
            <Button type="submit" size="icon-sm" aria-label="Send">
              <HugeiconsIcon icon={SentIcon} />
            </Button>
          </PromptBarActions>
        </PromptBarToolbar>
      </PromptBar>
    </Example>
  )
}

const SUGGESTIONS = [
  "Summarise the last visit",
  "What changed since March?",
  "Draft a portal message",
]

function PromptBarSuggestions() {
  const [value, setValue] = React.useState("")

  return (
    <Example title="With suggestions">
      <div className="flex w-full flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <Button
              key={s}
              variant="outline"
              size="xs"
              onClick={() => setValue(s)}
            >
              {s}
            </Button>
          ))}
        </div>
        <PromptBar onSubmit={(event) => event.preventDefault()}>
          <PromptBarInput
            placeholder="Ask anything…"
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
