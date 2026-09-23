import * as React from "react"

import { cn } from "@/lib/utils"
import { BRAND_NAME, LOGO, MARK } from "@/lib/brand"

import s from "./logo-loader.module.css"

/* The branded loaders, built from the mark, for anything the portal waits on
   long enough to notice: a page on its way, a list loading, the hand-off into
   the app after sign-in. They are the Motion set from the Logo page, made
   into components.

   Keep the plain Spinner for waits inside a control (a button that is
   submitting, a chip that is running): at that size the mark stops reading
   as a mark, and a spinner is the clearer signal there.

   Both tones of the artwork ship and CSS hides one, as elsewhere, so the mark
   never flashes the wrong tone before hydration. */

/* eslint-disable @next/next/no-img-element -- brand SVGs shown as-is, and a
   loader must not wait on the image optimiser to appear */

function Mark({ className }: { className?: string }) {
  return (
    <>
      <img src={MARK.light} alt="" aria-hidden className={cn("dark:hidden", className)} />
      <img src={MARK.dark} alt="" aria-hidden className={cn("hidden dark:block", className)} />
    </>
  )
}

function Lockup({ className }: { className?: string }) {
  return (
    <>
      <img src={LOGO.light} alt={BRAND_NAME} className={cn("w-auto dark:hidden", className)} />
      <img src={LOGO.dark} alt={BRAND_NAME} className={cn("hidden w-auto dark:block", className)} />
    </>
  )
}

type LogoLoaderKind = "ripple" | "fill" | "dots" | "beat"

const SIZES = {
  sm: { box: "size-10", mark: "size-5", fill: "size-6" },
  md: { box: "size-24", mark: "size-10", fill: "size-16" },
  lg: { box: "size-32", mark: "size-14", fill: "size-20" },
} as const

/**
 * The mark, moving: rings pulsing outward (`ripple`), colour rising through it
 * (`fill`), a row of typing dots under it (`dots`) or a heartbeat (`beat`,
 * the one that still reads at small sizes).
 */
function LogoLoader({
  kind = "ripple",
  size = "md",
  label = "Loading",
  className,
  ...props
}: React.ComponentProps<"div"> & {
  kind?: LogoLoaderKind
  size?: keyof typeof SIZES
  /** Announced to screen readers; not shown. */
  label?: string
}) {
  const { box, mark, fill } = SIZES[size]
  return (
    <div
      data-slot="logo-loader"
      role="status"
      aria-live="polite"
      className={cn("inline-flex flex-col items-center justify-center gap-3", className)}
      {...props}
    >
      <span className="sr-only">{label}</span>
      {kind === "ripple" && (
        <span className={cn("relative flex items-center justify-center", box)}>
          {[0, 0.8, 1.6].map((delay) => (
            <span
              key={delay}
              aria-hidden
              className={cn(s.ripple, "absolute inset-0 rounded-full border-2 border-primary-tint")}
              style={{ animationDelay: `${delay}s` }}
            />
          ))}
          <Mark className={cn("relative", mark)} />
        </span>
      )}
      {kind === "fill" && (
        <span className={cn("relative", fill)}>
          <Mark className="absolute inset-0 size-full opacity-15 grayscale" />
          <span className={cn(s.fill, "absolute inset-0")}>
            <Mark className="size-full" />
          </span>
        </span>
      )}
      {kind === "beat" && <Mark className={cn(s.beat, mark)} />}
      {kind === "dots" && (
        <>
          <Mark className={mark} />
          <span aria-hidden className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={cn(s.dot, "size-1.5 rounded-full bg-primary-tint")}
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </span>
        </>
      )}
    </div>
  )
}

/**
 * The full-screen wait: the lockup, an indeterminate bar and a line saying
 * what is loading. For page loads and the step into the app after sign-in.
 */
function LogoSplash({
  status = "Loading",
  overlay = false,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  /** What is on its way, e.g. "Loading patients". Shown and announced. */
  status?: string
  /** Cover the page (fixed, above everything) rather than fill its parent. */
  overlay?: boolean
}) {
  return (
    <div
      data-slot="logo-splash"
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center bg-background",
        overlay ? cn(s.enter, "fixed inset-0 z-50") : "min-h-svh w-full",
        className
      )}
      {...props}
    >
      <div className="flex w-64 flex-col items-center gap-4">
        <Lockup className="h-10" />
        <div className="relative h-1 w-full overflow-hidden rounded-full bg-muted">
          <span className={cn(s.bar, "absolute inset-y-0 rounded-full bg-primary")} />
        </div>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          {status}
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              aria-hidden
              className={cn(s.dot, "inline-block size-1 rounded-full bg-current")}
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </p>
      </div>
    </div>
  )
}

/* eslint-enable @next/next/no-img-element */

export { LogoLoader, LogoSplash, type LogoLoaderKind }
