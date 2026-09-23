"use client"

import * as React from "react"

import { Example, ExampleWrapper } from "@/design-system/examples/example"
import { BorderBeam, type BorderBeamColorVariant } from "@/design-system/ui/border-beam"
import { Button } from "@/design-system/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/design-system/ui/card"
import { Label } from "@/design-system/ui/label"
import { Switch } from "@/design-system/ui/switch"

const COLOR_VARIANTS: BorderBeamColorVariant[] = [
  "colorful",
  "mono",
  "ocean",
  "sunset",
  "forest",
  "candy",
  "ice",
  "gold",
]

export default function BorderBeamExample() {
  return (
    <ExampleWrapper>
      <BorderBeamSizes />
      <BorderBeamColors />
      <BorderBeamStrength />
      <BorderBeamActive />
    </ExampleWrapper>
  )
}

// `pulse-outside` blooms past the element, so it needs opaque children and room
// to spill — the surrounding Example padding provides it.
function BorderBeamSizes() {
  return (
    <Example title="Sizes" className="gap-8">
      <BorderBeam size="md">
        <Card className="w-full bg-card">
          <CardHeader>
            <CardTitle>Medium</CardTitle>
            <CardDescription>Full border glow — the default.</CardDescription>
          </CardHeader>
        </Card>
      </BorderBeam>

      <BorderBeam size="sm">
        <Button>Small</Button>
      </BorderBeam>

      <BorderBeam size="line">
        <div className="w-full rounded-xl border bg-card px-4 py-3 text-sm">
          Line — bottom-only traveling glow
        </div>
      </BorderBeam>

      <BorderBeam size="pulse-inner">
        <div className="w-full rounded-xl border bg-card px-4 py-3 text-sm">
          Pulse inner — contained breathe
        </div>
      </BorderBeam>

      <BorderBeam size="pulse-outside">
        <div className="w-full rounded-xl border bg-card px-4 py-3 text-sm">
          Pulse outside — outward bloom
        </div>
      </BorderBeam>
    </Example>
  )
}

function BorderBeamColors() {
  return (
    <Example title="Color variants" className="gap-6">
      {COLOR_VARIANTS.map((colorVariant) => (
        <BorderBeam key={colorVariant} size="sm" colorVariant={colorVariant}>
          <div className="w-full rounded-xl border bg-card px-4 py-3 text-sm capitalize">
            {colorVariant}
          </div>
        </BorderBeam>
      ))}
    </Example>
  )
}

function BorderBeamStrength() {
  return (
    <Example title="Strength" className="gap-6">
      {[0.3, 0.7, 1].map((strength) => (
        <BorderBeam key={strength} strength={strength}>
          <div className="w-full rounded-xl border bg-card px-4 py-3 text-sm">
            strength={strength}
          </div>
        </BorderBeam>
      ))}
    </Example>
  )
}

function BorderBeamActive() {
  const [active, setActive] = React.useState(true)

  return (
    <Example title="Play / pause">
      <BorderBeam active={active}>
        <Card className="w-full bg-card">
          <CardHeader>
            <CardTitle>Vitals summary</CardTitle>
            <CardDescription>
              The beam fades out when paused rather than cutting.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Switch id="border-beam-active" checked={active} onCheckedChange={setActive} />
            <Label htmlFor="border-beam-active">Animate</Label>
          </CardContent>
        </Card>
      </BorderBeam>
    </Example>
  )
}
