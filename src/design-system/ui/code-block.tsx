"use client"

import * as React from "react"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import { CheckmarkCircle02Icon, Copy01Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/design-system/ui/button"

function CodeBlock({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="code-block"
      className={cn(
        "group/code-block flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border bg-surface-sunken",
        className
      )}
      {...props}
    />
  )
}

function CodeBlockHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="code-block-header"
      className={cn(
        "flex min-w-0 items-center gap-2 border-b bg-surface-head px-3 py-1.5",
        className
      )}
      {...props}
    />
  )
}

function CodeBlockTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="code-block-title"
      className={cn(
        "min-w-0 truncate font-mono text-xs text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function CodeBlockActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="code-block-actions"
      className={cn("ml-auto flex shrink-0 items-center gap-1", className)}
      {...props}
    />
  )
}

/** Confirms in place for a moment rather than firing a toast for a copy. */
function CodeBlockCopyButton({
  value,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { value: string }) {
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(id)
  }, [copied])

  return (
    <Button
      data-slot="code-block-copy-button"
      variant="ghost"
      size="icon-xs"
      aria-label={copied ? "Copied" : "Copy code"}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
        } catch {
          // Clipboard can be blocked by permissions — leave the label as-is.
        }
      }}
      className={cn(className)}
      {...props}
    >
      <HugeiconsIcon
        icon={copied ? CheckmarkCircle02Icon : Copy01Icon}
        className={cn(copied && "text-success")}
      />
    </Button>
  )
}

/**
 * Line numbers are rendered as a separate, aria-hidden gutter so copying the
 * selection never picks them up.
 */
function CodeBlockBody({
  code,
  showLineNumbers = false,
  highlightLines,
  className,
  ...props
}: Omit<React.ComponentProps<"pre">, "children"> & {
  code: string
  showLineNumbers?: boolean
  highlightLines?: number[]
}) {
  const lines = code.replace(/\n$/, "").split("\n")
  const highlighted = new Set(highlightLines ?? [])

  return (
    <pre
      data-slot="code-block-body"
      className={cn(
        "min-w-0 overflow-x-auto p-3 font-mono text-xs leading-relaxed",
        className
      )}
      {...props}
    >
      <code className="block min-w-fit">
        {lines.map((line, i) => (
          <span
            key={i}
            data-highlighted={highlighted.has(i + 1) || undefined}
            className={cn(
              "flex min-w-full gap-3 px-1",
              highlighted.has(i + 1) &&
                "-mx-1 bg-primary-surface px-2 ring-1 ring-primary/20 ring-inset"
            )}
          >
            {showLineNumbers ? (
              <span
                aria-hidden="true"
                className="w-6 shrink-0 text-right text-muted-foreground/60 select-none"
              >
                {i + 1}
              </span>
            ) : null}
            <span className="min-w-0 whitespace-pre">{line || " "}</span>
          </span>
        ))}
      </code>
    </pre>
  )
}

export {
  CodeBlock,
  CodeBlockHeader,
  CodeBlockTitle,
  CodeBlockActions,
  CodeBlockCopyButton,
  CodeBlockBody,
}
