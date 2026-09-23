"use client"

import * as React from "react"
import { cn } from "cn"

/** Grows the textarea with its content up to `maxRows`, then scrolls. */
function useAutosize(
  ref: React.RefObject<HTMLTextAreaElement | null>,
  value: unknown,
  maxRows: number
) {
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = "auto"
    const line = Number.parseFloat(getComputedStyle(el).lineHeight) || 20
    el.style.height = `${Math.min(el.scrollHeight, line * maxRows)}px`
  }, [ref, value, maxRows])
}

function PromptBar({ className, ...props }: React.ComponentProps<"form">) {
  return (
    <form
      data-slot="prompt-bar"
      className={cn(
        "flex w-full min-w-0 flex-col gap-2 rounded-3xl border bg-card p-2 shadow-sm transition-shadow focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30",
        className
      )}
      {...props}
    />
  )
}

function PromptBarInput({
  className,
  maxRows = 8,
  value,
  onKeyDown,
  onSubmitShortcut,
  ...props
}: React.ComponentProps<"textarea"> & {
  maxRows?: number
  /** Fired on Enter without Shift, the usual send shortcut. */
  onSubmitShortcut?: () => void
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null)
  useAutosize(ref, value, maxRows)

  return (
    <textarea
      ref={ref}
      data-slot="prompt-bar-input"
      rows={1}
      value={value}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (
          onSubmitShortcut &&
          !event.defaultPrevented &&
          event.key === "Enter" &&
          !event.shiftKey
        ) {
          event.preventDefault()
          onSubmitShortcut()
        }
      }}
      className={cn(
        "field-sizing-content max-h-60 w-full resize-none bg-transparent px-2.5 py-2 text-sm leading-relaxed outline-none placeholder:text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function PromptBarToolbar({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="prompt-bar-toolbar"
      className={cn("flex min-w-0 items-center gap-1.5", className)}
      {...props}
    />
  )
}

function PromptBarActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="prompt-bar-actions"
      className={cn("ml-auto flex shrink-0 items-center gap-1.5", className)}
      {...props}
    />
  )
}

function PromptBarHint({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="prompt-bar-hint"
      className={cn("px-1 text-[11px] text-muted-foreground", className)}
      {...props}
    />
  )
}

function PromptBarAttachments({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="prompt-bar-attachments"
      className={cn(
        "flex w-full flex-wrap items-center gap-1.5 px-1",
        className
      )}
      {...props}
    />
  )
}

export {
  PromptBar,
  PromptBarInput,
  PromptBarToolbar,
  PromptBarActions,
  PromptBarHint,
  PromptBarAttachments,
}
