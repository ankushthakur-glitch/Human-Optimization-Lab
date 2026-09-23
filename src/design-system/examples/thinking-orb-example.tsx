"use client"

import * as React from "react"

import { Example, ExampleWrapper } from "@/design-system/examples/example"
import { ThinkingOrb, type OrbSize, type OrbState } from "@/design-system/ui/thinking-orb"
import { Label } from "@/design-system/ui/label"
import { Switch } from "@/design-system/ui/switch"

const STATES: { state: OrbState; caption: string }[] = [
  { state: "working", caption: "Particles on tilted orbits" },
  { state: "searching", caption: "A scan meridian sweeps a globe" },
  { state: "solving", caption: "Bands scramble, then click back" },
  { state: "listening", caption: "A waveform rolls through rings" },
  { state: "connecting", caption: "A constellation wires itself" },
  { state: "weaving", caption: "Three strands plait around" },
  { state: "composing", caption: "An undulating multi-band sash" },
  { state: "breathing", caption: "A face-on ring slowly morphing" },
  { state: "shaping", caption: "Circle → triangle → square" },
]

// 64 and 20 are hand-tuned designs; 32 is interpolated between them.
const SIZES: OrbSize[] = [64, 32, 20]

export default function ThinkingOrbExample() {
  return (
    <ExampleWrapper>
      <ThinkingOrbStates />
      <ThinkingOrbSizes />
      <ThinkingOrbTint />
      <ThinkingOrbPaused />
    </ExampleWrapper>
  )
}

function ThinkingOrbStates() {
  return (
    <Example title="States" containerClassName="md:col-span-2">
      <div className="grid w-full grid-cols-2 gap-6 sm:grid-cols-3">
        {STATES.map(({ state, caption }) => (
          <div key={state} className="flex flex-col items-center gap-2 text-center">
            <ThinkingOrb state={state} size={64} />
            <div className="text-sm font-medium capitalize">{state}</div>
            <div className="text-xs text-muted-foreground">{caption}</div>
          </div>
        ))}
      </div>
    </Example>
  )
}

function ThinkingOrbSizes() {
  return (
    <Example title="Sizes" className="items-center">
      <div className="flex w-full items-center justify-around gap-4">
        {SIZES.map((size) => (
          <div key={size} className="flex flex-col items-center gap-2">
            <ThinkingOrb state="working" size={size} />
            <div className="text-xs text-muted-foreground">{size}px</div>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        The 20px orb sits inline with text, like this <ThinkingOrb state="working" size={20} className="inline-block align-text-bottom" />, mid-sentence.
      </p>
    </Example>
  )
}

function ThinkingOrbTint() {
  return (
    <Example title="Tint">
      <div className="flex w-full items-center justify-around gap-4">
        {[undefined, "#6366f1", "#10b981", "#f43f5e"].map((color, i) => (
          <ThinkingOrb key={i} state="connecting" size={64} color={color} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        The depth-shading ramp is preserved on the tint, so colored orbs keep the
        same 3D reading as the grayscale default.
      </p>
    </Example>
  )
}

function ThinkingOrbPaused() {
  const [paused, setPaused] = React.useState(false)

  return (
    <Example title="Paused" className="items-center">
      <ThinkingOrb state="solving" size={64} paused={paused} />
      <div className="flex items-center gap-3">
        <Switch id="thinking-orb-paused" checked={paused} onCheckedChange={setPaused} />
        <Label htmlFor="thinking-orb-paused">Freeze on the current frame</Label>
      </div>
    </Example>
  )
}
