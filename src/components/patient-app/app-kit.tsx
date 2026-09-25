"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { ThinkingOrb, type OrbState } from "@/design-system/ui/thinking-orb"
import { StreamingText } from "@/design-system/ui/streaming-text"

/* The patient app's onboarding after the invite: consent, the daily habits
   questions and the medication list, with the AI the product is built
   around at every step. A clickable prototype on the web so it can use the
   design system's AI components (thinking orb, streaming text);
   the approved flow is then carried into the Expo app (mobile/).

   The AI here is simulated with fixed sample answers: there is no model
   behind it yet. It never diagnoses or gives dosing advice, it only
   explains, reads, fills in and summarizes, and the patient confirms. */

export const PATIENT = { first: "Olivia", full: "Olivia Bennett" }
export const PRACTICE = "Harborview Longevity Clinic"
export const DOCTOR = "Dr. Elise Harrington"

/* -------------------------------------------------------------------------- */
/*  Frame                                                                      */
/* -------------------------------------------------------------------------- */

/** A phone on a desktop screen; the whole viewport on a phone. */
export function AppFrame({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface-sunken sm:py-8">
      <div className="w-full sm:w-auto sm:rounded-[2.6rem] sm:border sm:border-black/10 sm:bg-neutral-900 sm:p-2.5 sm:shadow-xl">
        <div
          className={cn(
            "relative flex h-dvh w-full flex-col overflow-hidden bg-white text-[15px] text-neutral-900 sm:h-[760px] sm:w-[375px] sm:rounded-[2.1rem]",
            className
          )}
        >
          <div className="hidden h-11 shrink-0 items-center justify-between px-7 text-[13px] font-semibold sm:flex">
            <span>9:41</span>
            <span className="absolute top-2 left-1/2 h-6 w-24 -translate-x-1/2 rounded-full bg-neutral-900" />
            <span className="h-2.5 w-4 rounded-sm border border-current" />
          </div>
          {children}
        </div>
      </div>
    </main>
  )
}

export function AppBar({
  title,
  step,
  onBack,
}: {
  title?: string
  step?: string
  onBack?: () => void
}) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 px-4">
      <button
        type="button"
        aria-label="Back"
        onClick={onBack}
        disabled={!onBack}
        className="grid size-8 place-items-center rounded-full text-2xl text-neutral-500 hover:bg-neutral-100 disabled:opacity-40"
      >
        &#8249;
      </button>
      <span className="flex-1 truncate text-center font-semibold">{title}</span>
      <span className="w-14 text-right text-xs whitespace-nowrap text-neutral-500">
        {step}
      </span>
    </div>
  )
}

export function AppButton({
  children,
  variant = "primary",
  className,
  ...props
}: React.ComponentProps<"button"> & {
  variant?: "primary" | "outline" | "ghost"
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-[15px] font-semibold transition-colors disabled:opacity-40",
        variant === "primary" && "bg-primary text-white hover:bg-primary/90",
        variant === "outline" &&
          "border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50",
        variant === "ghost" && "text-primary hover:bg-primary/5",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function ProgressBar({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  return (
    <div
      className={cn(
        "h-1.5 overflow-hidden rounded-full bg-neutral-100",
        className
      )}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-500"
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

export function Check({ on, round }: { on: boolean; round?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-5 shrink-0 place-items-center border text-[11px] text-white transition-colors",
        round ? "rounded-full" : "rounded-md",
        on ? "border-primary bg-primary" : "border-neutral-300 bg-white"
      )}
    >
      {on && "✓"}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/*  AI pieces                                                                  */
/* -------------------------------------------------------------------------- */

/** Marks anything the AI filled in or suggested, so the patient can tell. */
export function AiTag({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary",
        className
      )}
    >
      <span aria-hidden>✦</span>
      {children}
    </span>
  )
}

/** A pill that starts an AI action. */
export function AiPill({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-[13px] font-medium text-primary transition-colors hover:bg-primary/10",
        className
      )}
    >
      <span aria-hidden>✦</span>
      {children}
    </button>
  )
}

/** Resolves after `ms`, for the simulated model's think time. */
export const wait = (ms: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, ms))

/* The orb only ever means "working". Tinted with the brand teal so it reads
   as HOL, and swapped for the solid avatar once the AI is done, so a
   finished answer never sits next to a half-drawn ring. */
export function AiOrb({
  state = "working",
  size = 32,
  className,
}: {
  state?: OrbState
  size?: 20 | 32 | 64
  className?: string
}) {
  return (
    <ThinkingOrb
      state={state}
      size={size}
      theme="light"
      color="#01837E"
      className={cn("shrink-0", className)}
    />
  )
}

/** The HOL assistant at rest: a solid teal disc with the spark. */
export function AiAvatar({
  size = 32,
  children,
  className,
}: {
  size?: 20 | 32 | 64
  children?: React.ReactNode
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-primary text-white",
        size === 64 ? "text-3xl" : size === 32 ? "text-[15px]" : "text-[11px]",
        className
      )}
      style={{ width: size, height: size }}
    >
      {children ?? "✦"}
    </span>
  )
}

/** The AI speaking: the orb while it thinks, then its answer streaming in. */
export function AiAnswer({
  text,
  thinkFor = 1400,
  orb = "composing",
  label = "Thinking",
  onDone,
  className,
}: {
  text: string
  thinkFor?: number
  orb?: OrbState
  label?: string
  onDone?: () => void
  className?: string
}) {
  const [ready, setReady] = React.useState(false)
  React.useEffect(() => {
    const id = window.setTimeout(() => setReady(true), thinkFor)
    return () => window.clearTimeout(id)
  }, [thinkFor])
  return (
    <div className={cn("flex gap-3", className)}>
      {ready ? <AiAvatar /> : <AiOrb state={orb} />}
      <div className="min-w-0 flex-1 pt-1">
        {ready ? (
          <StreamingText
            text={text}
            speed={9}
            onDone={onDone}
            className="text-[14px] leading-relaxed text-neutral-800"
          />
        ) : (
          <p className="text-[14px] text-neutral-500">{label}&hellip;</p>
        )}
      </div>
    </div>
  )
}

/** A sheet that rises inside the phone, for the AI's answers and tools. */
export function AppSheet({
  open,
  onClose,
  title,
  children,
  tall,
}: {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  children: React.ReactNode
  tall?: boolean
}) {
  if (!open) return null
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 motion-safe:animate-in motion-safe:fade-in"
      />
      <div
        role="dialog"
        aria-modal
        className={cn(
          "relative flex max-h-[88%] flex-col rounded-t-[28px] bg-white shadow-2xl motion-safe:animate-in motion-safe:slide-in-from-bottom",
          tall && "h-[88%]"
        )}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-neutral-200" />
        <div className="flex items-center gap-2 px-5 pt-3 pb-2">
          <div className="min-w-0 flex-1 font-semibold">{title}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 place-items-center rounded-full bg-neutral-100 text-neutral-500"
          >
            &#10005;
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-6">
          {children}
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Session                                                                    */
/* -------------------------------------------------------------------------- */

/* What the patient has answered, kept for the session so the summary on the
   last screen can read it. The prototype has no backend. */
export function useSessionState<T>(key: string, initial: T) {
  const [value, setValue] = React.useState<T>(initial)
  React.useEffect(() => {
    try {
      const saved = sessionStorage.getItem(`hol-app-${key}`)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setValue(JSON.parse(saved) as T)
    } catch {
      // Blocked storage: start fresh.
    }
  }, [key])
  const set = React.useCallback(
    (next: T) => {
      setValue(next)
      try {
        sessionStorage.setItem(`hol-app-${key}`, JSON.stringify(next))
      } catch {
        // Blocked storage: the answer lives for this page only.
      }
    },
    [key]
  )
  return [value, set] as const
}
