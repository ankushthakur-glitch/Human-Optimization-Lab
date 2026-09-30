"use client"

import * as React from "react"
import { IconExternalLink } from "@/design-system/icons"

import { CUSTOM_ACCENT_THEMES } from "@/design-system/tokens/accents"

/* The screen each preview renders, at the desktop size it was designed for.
   The frame is drawn at full size and scaled down, so what you compare is the
   real layout — not a reflowed narrow version of it. */
const SCREEN = "/screens/patients"
const FRAME_W = 1440
const FRAME_H = 900

/* What each colour says about Inlay Health as a care brand — the
   clinical side and the optimization side — for the conversation about which
   one to pick. */
const QUALITIES: Record<string, string[]> = {
  inlay: ["Integration", "Clarity", "Support", "Calm"],
  "inlay-p7": ["Approachable", "Clarity", "Support", "Fresh"],
  "inlay-palette": ["Warmth", "Calm", "Craft", "Clinical clarity"],
  "brand-blue": ["Trust", "Expertise", "Precision", "Reliability"],
  "brand-cyan": ["Clarity", "Innovation", "Prevention", "Vitality"],
  "brand-teal": ["Healing", "Longevity", "Balance", "Wellbeing"],
}

function ScaledScreen({ accent, label }: { accent: string; label: string }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [scale, setScale] = React.useState(0.3)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / FRAME_W)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className="relative w-full overflow-hidden rounded-lg border bg-background shadow-sm"
      style={{ aspectRatio: `${FRAME_W} / ${FRAME_H}` }}
    >
      <iframe
        src={`${SCREEN}?accent=${accent}`}
        title={`Patients screen: ${label}`}
        width={FRAME_W}
        height={FRAME_H}
        className="absolute top-0 left-0 origin-top-left border-0"
        style={{ transform: `scale(${scale})` }}
      />
    </div>
  )
}

export default function AccentComparisonPage() {
  return (
    <div>
      <header className="mb-8">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Primary colour
        </h1>
      </header>

      <div className="flex flex-col gap-12">
        {CUSTOM_ACCENT_THEMES.map((theme) => {
          return (
            <section key={theme.name} className="flex min-w-0 flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-medium">{theme.label}</h2>
                <a
                  href={`${SCREEN}?accent=${theme.name}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  Open full size
                  <IconExternalLink className="size-3.5" />
                </a>
              </div>
              <ScaledScreen accent={theme.name} label={theme.label} />
              {QUALITIES[theme.name] ? (
                <p className="text-sm text-foreground">
                  {QUALITIES[theme.name].join(" · ")}
                </p>
              ) : null}
            </section>
          )
        })}
      </div>
    </div>
  )
}
