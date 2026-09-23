"use client"

import * as React from "react"

import { Example, ExampleWrapper } from "@/design-system/examples/example"
import {
  StreamingText,
  StreamingTextGroup,
} from "@/design-system/ui/streaming-text"
import { Bubble, BubbleContent } from "@/design-system/ui/bubble"
import { Button } from "@/design-system/ui/button"
import { LoadingStateIndicator } from "@/design-system/ui/loading-state"

const SUMMARY = `Three of the twelve results are outside the reference range. Potassium is the one worth looking at first — it has moved in the same direction at each of the last three draws.`

const SHORT = `Saved. The note is filed against today's encounter.`

export default function StreamingTextExample() {
  return (
    <ExampleWrapper>
      <StreamingDefault />
      <StreamingSpeeds />
      <StreamingReplay />
      <StreamingInBubble />
    </ExampleWrapper>
  )
}

function StreamingDefault() {
  return (
    <Example title="Default">
      <StreamingText text={SUMMARY} />
    </Example>
  )
}

function StreamingSpeeds() {
  return (
    <Example title="Cadence">
      <StreamingTextGroup>
        <div className="flex w-full flex-col gap-1">
          <span className="text-xs text-muted-foreground">Fast — 8ms</span>
          <StreamingText text={SUMMARY} speed={8} />
        </div>
        <div className="flex w-full flex-col gap-1">
          <span className="text-xs text-muted-foreground">Slow — 40ms</span>
          <StreamingText text={SHORT} speed={40} />
        </div>
      </StreamingTextGroup>
    </Example>
  )
}

function StreamingReplay() {
  const [run, setRun] = React.useState(0)
  const [done, setDone] = React.useState(false)

  return (
    <Example title="Replay">
      <div className="flex w-full flex-col items-start gap-4">
        <StreamingText key={run} text={SUMMARY} onDone={() => setDone(true)} />
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDone(false)
              setRun((r) => r + 1)
            }}
          >
            Replay
          </Button>
          <span className="text-xs text-muted-foreground">
            {done ? "Finished" : "Streaming…"}
          </span>
        </div>
      </div>
    </Example>
  )
}

function StreamingInBubble() {
  const [done, setDone] = React.useState(false)

  return (
    <Example title="In a message">
      <div className="flex w-full max-w-md flex-col gap-4">
        <Bubble variant="tinted" align="end">
          <BubbleContent>Summarise today's labs.</BubbleContent>
        </Bubble>
        <Bubble variant="ghost">
          <BubbleContent>
            <StreamingText text={SUMMARY} onDone={() => setDone(true)} />
          </BubbleContent>
        </Bubble>
        {!done ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <LoadingStateIndicator kind="dots" />
            Generating
          </div>
        ) : null}
      </div>
    </Example>
  )
}
