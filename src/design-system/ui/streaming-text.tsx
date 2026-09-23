"use client"

import * as React from "react"
import { cn } from "cn"

/**
 * Reveals `text` a character at a time so a completed response can be replayed
 * at the cadence a live stream would have produced it.
 */
function useStreamedText(
  text: string,
  { speed = 18, playing = true }: { speed?: number; playing?: boolean }
) {
  const [index, setIndex] = React.useState(0)

  // Restart whenever the source text changes.
  React.useEffect(() => {
    setIndex(0)
  }, [text])

  React.useEffect(() => {
    if (!playing || index >= text.length) return
    const id = window.setTimeout(() => setIndex((i) => i + 1), speed)
    return () => window.clearTimeout(id)
  }, [playing, index, text, speed])

  return {
    shown: text.slice(0, index),
    done: index >= text.length,
    reset: React.useCallback(() => setIndex(0), []),
  }
}

function StreamingText({
  text,
  speed = 18,
  playing = true,
  caret = true,
  onDone,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  text: string
  speed?: number
  playing?: boolean
  caret?: boolean
  onDone?: () => void
}) {
  const { shown, done } = useStreamedText(text, { speed, playing })

  React.useEffect(() => {
    if (done) onDone?.()
  }, [done, onDone])

  return (
    <div
      data-slot="streaming-text"
      data-streaming={!done}
      aria-busy={!done}
      className={cn(
        "w-full text-sm leading-relaxed whitespace-pre-wrap text-foreground",
        className
      )}
      {...props}
    >
      {shown}
      {caret && !done ? <StreamingCaret /> : null}
    </div>
  )
}

function StreamingCaret({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="streaming-caret"
      aria-hidden="true"
      className={cn(
        "ml-0.5 inline-block h-[1em] w-[2px] translate-y-[0.15em] animate-pulse rounded-full bg-primary align-baseline",
        className
      )}
      {...props}
    />
  )
}

function StreamingTextGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="streaming-text-group"
      className={cn("flex w-full min-w-0 flex-col gap-3", className)}
      {...props}
    />
  )
}

export { StreamingText, StreamingCaret, StreamingTextGroup, useStreamedText }
