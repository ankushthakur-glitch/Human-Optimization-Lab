"use client"

import * as React from "react"

import { Example, ExampleWrapper } from "@/design-system/examples/example"
import {
  VoiceBeam,
  useMicrophone,
  type VoiceBeamColorVariant,
} from "@/design-system/ui/voice-beam"
import { Button } from "@/design-system/ui/button"
import { Input } from "@/design-system/ui/input"
import { Label } from "@/design-system/ui/label"
import { Switch } from "@/design-system/ui/switch"
import { useMounted } from "@/hooks/use-mounted"

const COLOR_VARIANTS: VoiceBeamColorVariant[] = ["colorful", "ocean", "sunset", "candy"]

export default function VoiceBeamExample() {
  return (
    <ExampleWrapper>
      <VoiceBeamSimulated />
      <VoiceBeamMicrophone />
      <VoiceBeamProcessing />
      <VoiceBeamColors />
    </ExampleWrapper>
  )
}

// A getter is sampled once per frame by the driver, so the synthetic level
// animates the beam without re-rendering this component 60 times a second.
function useSimulatedLevel() {
  return React.useCallback(() => {
    const t = performance.now() / 1000
    const swell = Math.sin(t * 1.6) * 0.5 + 0.5
    const flutter = Math.sin(t * 7.3) * 0.12
    return Math.max(0, Math.min(1, swell * 0.7 + flutter))
  }, [])
}

function VoiceBeamSimulated() {
  const level = useSimulatedLevel()

  return (
    <Example title="Driven by level">
      <VoiceBeam level={level}>
        <div className="w-full rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
          Ask anything…
        </div>
      </VoiceBeam>
      <p className="text-xs text-muted-foreground">
        No microphone needed. <code className="font-mono">level</code> takes a
        number or a getter, so any source can drive the glow.
      </p>
    </Example>
  )
}

// The microphone is never requested on mount: Safari only starts audio inside a
// user gesture, and a docs page should not prompt for permission on load.
function VoiceBeamMicrophone() {
  const mic = useMicrophone()

  // `supported` is probed during render, so it reads false on the server and
  // true in the browser. Gate on mount so the first client render still matches
  // the HTML, then let the real value take over.
  const mounted = useMounted()
  const supported = mounted ? mic.supported : true

  return (
    <Example title="Driven by microphone">
      <VoiceBeam stream={mic.stream} active={mic.state === "live"}>
        <div className="w-full rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
          {mic.state === "live" ? "Listening…" : "Speak once the microphone is on"}
        </div>
      </VoiceBeam>

      <div className="flex items-center gap-3">
        {mic.state === "live" ? (
          <Button variant="outline" onClick={mic.stop}>
            Stop microphone
          </Button>
        ) : (
          <Button onClick={mic.start} disabled={!supported || mic.state === "requesting"}>
            {mic.state === "requesting" ? "Requesting…" : "Use microphone"}
          </Button>
        )}
        <span className="text-xs text-muted-foreground">
          {!supported
            ? "This browser cannot capture audio."
            : mic.state === "denied"
              ? "Permission denied."
              : mic.state === "error"
                ? (mic.error?.message ?? "Something went wrong.")
                : "Permission is requested on click, never on load."}
        </span>
      </div>
    </Example>
  )
}

function VoiceBeamProcessing() {
  const [processing, setProcessing] = React.useState(true)
  const level = useSimulatedLevel()

  return (
    <Example title="Processing">
      <VoiceBeam level={processing ? 0 : level} processing={processing}>
        <div className="w-full rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
          {processing ? "Thinking…" : "Ask anything…"}
        </div>
      </VoiceBeam>
      <div className="flex items-center gap-3">
        <Switch id="voice-beam-processing" checked={processing} onCheckedChange={setProcessing} />
        <Label htmlFor="voice-beam-processing">
          Gather the lobes into a travelling beam
        </Label>
      </div>
    </Example>
  )
}

function VoiceBeamColors() {
  const level = useSimulatedLevel()

  return (
    <Example title="Color variants" className="gap-8">
      {COLOR_VARIANTS.map((colorVariant) => (
        <VoiceBeam key={colorVariant} level={level} colorVariant={colorVariant}>
          <Input readOnly defaultValue={colorVariant} className="capitalize" />
        </VoiceBeam>
      ))}
    </Example>
  )
}
