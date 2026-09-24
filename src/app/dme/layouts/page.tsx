"use client"

import * as React from "react"
import { IconExternalLink } from "@/design-system/icons"

/* Each preview is the real screen at the desktop size it was designed for,
   drawn full size and scaled down, as on the original Primary colour page. */
const FRAME_W = 1440
const FRAME_H = 900

const LAYOUTS = [
  { href: "/dme-screens/side-nav", label: "Layout 1: Side navigation" },
  { href: "/dme-screens/top-nav", label: "Layout 2: Top navigation" },
]

function ScaledScreen({ src, label }: { src: string; label: string }) {
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
        src={src}
        title={label}
        width={FRAME_W}
        height={FRAME_H}
        className="absolute top-0 left-0 origin-top-left border-0"
        style={{ transform: `scale(${scale})` }}
      />
    </div>
  )
}

export default function LayoutPage() {
  return (
    <div>
      <header className="mb-8">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Layout</h1>
      </header>

      <div className="flex flex-col gap-12">
        {LAYOUTS.map((layout) => (
          <section key={layout.href} className="flex min-w-0 flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-medium">{layout.label}</h2>
              <a
                href={layout.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Open full size
                <IconExternalLink className="size-3.5" />
              </a>
            </div>
            <ScaledScreen src={layout.href} label={layout.label} />
          </section>
        ))}
      </div>
    </div>
  )
}
