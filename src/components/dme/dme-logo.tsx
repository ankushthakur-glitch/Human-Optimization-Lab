import * as React from "react"

import { cn } from "@/lib/utils"
import { DME_NAME } from "@/lib/dme-brand"

/**
 * Placeholder lockup for the Lakeside Sleep Center demo: a crescent moon over
 * the lake. `compact` drops the wordmark (collapsed rail); `inverse` is for a
 * primary-coloured bar.
 */
export function DmeLogo({
  className,
  compact = false,
  inverse = false,
}: {
  className?: string
  compact?: boolean
  inverse?: boolean
}) {
  const moon = React.useId()
  const ink = inverse ? "fill-primary" : "fill-primary-foreground"
  const line = inverse ? "stroke-primary" : "stroke-primary-foreground"

  return (
    <span className={cn("flex items-center gap-2", className)}>
      <svg viewBox="0 0 32 32" aria-hidden className="size-8 shrink-0">
        <defs>
          <mask id={moon}>
            <rect width="32" height="32" fill="white" />
            <circle cx="19.5" cy="9.5" r="5.5" fill="black" />
          </mask>
        </defs>
        <rect
          width="32"
          height="32"
          rx="8"
          className={inverse ? "fill-primary-foreground" : "fill-primary"}
        />
        <circle cx="15" cy="13" r="6.5" mask={`url(#${moon})`} className={ink} />
        <path
          d="M7 22.5c1.5-1.2 3-1.2 4.5 0s3 1.2 4.5 0 3-1.2 4.5 0 3 1.2 4.5 0"
          fill="none"
          strokeWidth="1.8"
          strokeLinecap="round"
          className={line}
        />
        <path
          d="M10 26.5c1.5-1 3-1 4 0s3 1 4 0 3-1 4 0"
          fill="none"
          strokeWidth="1.8"
          strokeLinecap="round"
          className={line}
          opacity="0.6"
        />
      </svg>
      {compact ? (
        <span className="sr-only">{DME_NAME}</span>
      ) : (
        <span className="flex flex-col leading-none">
          <span className="font-heading text-sm font-bold tracking-tight">Lakeside</span>
          <span
            className={cn(
              "mt-0.5 text-[9px] font-semibold tracking-[0.18em] uppercase",
              inverse ? "text-primary-foreground/80" : "text-primary-tint"
            )}
          >
            Sleep Center
          </span>
        </span>
      )}
    </span>
  )
}
