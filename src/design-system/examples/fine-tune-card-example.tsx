"use client"

import * as React from "react"
import { toast } from "sonner"

import { Example, ExampleWrapper } from "@/design-system/examples/example"
import {
  FineTuneCard,
  FineTuneCardControls,
  FineTuneCardDescription,
  FineTuneCardFooter,
  FineTuneCardHeader,
  FineTuneCardTitle,
  FineTuneControl,
} from "@/design-system/ui/fine-tune-card"
import { Button } from "@/design-system/ui/button"
import { Slider } from "@/design-system/ui/slider"
import { Switch } from "@/design-system/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/design-system/ui/toggle-group"

export default function FineTuneCardExample() {
  return (
    <ExampleWrapper>
      <FineTuneDefault />
      <FineTuneToggles />
      <FineTuneTone />
      <FineTuneCompact />
    </ExampleWrapper>
  )
}

function FineTuneDefault() {
  const [length, setLength] = React.useState(60)
  const [detail, setDetail] = React.useState(40)

  return (
    <Example title="Default">
      <FineTuneCard>
        <FineTuneCardHeader>
          <div className="min-w-0 flex-1">
            <FineTuneCardTitle>Tune the summary</FineTuneCardTitle>
            <FineTuneCardDescription>
              Changes apply on the next run. Nothing regenerates while you
              drag.
            </FineTuneCardDescription>
          </div>
        </FineTuneCardHeader>
        <FineTuneCardControls>
          <FineTuneControl label="Length" value={`${length}%`}>
            <Slider
              value={[length]}
              onValueChange={(v) => setLength(Array.isArray(v) ? v[0] : v)}
            />
          </FineTuneControl>
          <FineTuneControl
            label="Clinical detail"
            value={`${detail}%`}
            hint="Higher values keep values, units and dates in the prose."
          >
            <Slider
              value={[detail]}
              onValueChange={(v) => setDetail(Array.isArray(v) ? v[0] : v)}
            />
          </FineTuneControl>
        </FineTuneCardControls>
        <FineTuneCardFooter>
          <Button variant="ghost" size="sm">
            Reset
          </Button>
          <Button size="sm" onClick={() => toast("Regenerating…")}>
            Regenerate
          </Button>
        </FineTuneCardFooter>
      </FineTuneCard>
    </Example>
  )
}

function FineTuneToggles() {
  const [citations, setCitations] = React.useState(true)
  const [drafts, setDrafts] = React.useState(false)

  return (
    <Example title="Toggles">
      <FineTuneCard>
        <FineTuneCardHeader>
          <FineTuneCardTitle>Output</FineTuneCardTitle>
        </FineTuneCardHeader>
        <FineTuneCardControls>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs font-medium">Inline citations</div>
              <p className="text-[11px] text-muted-foreground">
                Link each claim back to the record it came from.
              </p>
            </div>
            <Switch checked={citations} onCheckedChange={setCitations} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs font-medium">Include draft orders</div>
              <p className="text-[11px] text-muted-foreground">
                Drafts still need a signature before anything is sent.
              </p>
            </div>
            <Switch checked={drafts} onCheckedChange={setDrafts} />
          </div>
        </FineTuneCardControls>
      </FineTuneCard>
    </Example>
  )
}

function FineTuneTone() {
  const [tone, setTone] = React.useState<string[]>(["clinical"])

  return (
    <Example title="Preset">
      <FineTuneCard>
        <FineTuneCardHeader>
          <div className="min-w-0 flex-1">
            <FineTuneCardTitle>Audience</FineTuneCardTitle>
            <FineTuneCardDescription>
              The same facts, pitched at a different reader.
            </FineTuneCardDescription>
          </div>
        </FineTuneCardHeader>
        <ToggleGroup
          value={tone}
          onValueChange={(value) => setTone(value as string[])}
          variant="outline"
          className="w-full"
        >
          <ToggleGroupItem value="clinical">Clinical</ToggleGroupItem>
          <ToggleGroupItem value="patient">Patient</ToggleGroupItem>
          <ToggleGroupItem value="handover">Handover</ToggleGroupItem>
        </ToggleGroup>
      </FineTuneCard>
    </Example>
  )
}

function FineTuneCompact() {
  const [temp, setTemp] = React.useState(30)

  return (
    <Example title="Single control">
      <FineTuneCard>
        <FineTuneControl
          label="Creativity"
          value={(temp / 100).toFixed(2)}
          hint="Low values repeat the source wording; high values paraphrase."
        >
          <Slider
            value={[temp]}
            onValueChange={(v) => setTemp(Array.isArray(v) ? v[0] : v)}
          />
        </FineTuneControl>
      </FineTuneCard>
    </Example>
  )
}
