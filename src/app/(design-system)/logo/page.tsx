"use client"

import * as React from "react"
import { IconDownload } from "@/design-system/icons"

import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger } from "@/design-system/ui/tabs"

/* The logo concepts under review, each supplied in the three brand
   accents. Files live in public/brand/concepts/v{n}/: `lockup-{colour}.svg` is
   the artwork as supplied, `mark-{colour}.svg` the same file re-cropped to a
   square around the mark (viewBox only — no path is redrawn). */
const CONCEPTS = [
  { id: "v1", label: "Variation 1", note: "Figure mark · two-line wordmark" },
  { id: "v2", label: "Variation 2", note: "Figure mark · three-line wordmark" },
  { id: "v3", label: "Variation 3", note: "H mark · three-line wordmark" },
  { id: "v4", label: "Variation 4", note: "H mark · two-line wordmark" },
  { id: "v5", label: "Variation 5", note: "Heart-figure mark · two-line wordmark" },
  { id: "v6", label: "Variation 6", note: "Heart-figure mark · three-line wordmark" },
  { id: "v7", label: "Variation 7", note: "H-figure mark · two-line wordmark" },
] as const

const COLOURS = [
  { id: "blue", label: "Blue", tile: "#2C71E5" },
  { id: "cyan", label: "Cyan", tile: "#076D85" },
  { id: "teal", label: "Teal", tile: "#01837E" },
] as const

type ConceptId = (typeof CONCEPTS)[number]["id"]
type ColourId = (typeof COLOURS)[number]["id"]

const lockupSrc = (c: ConceptId, k: ColourId) => `/brand/concepts/${c}/lockup-${k}.svg`
const markSrc = (c: ConceptId, k: ColourId) => `/brand/concepts/${c}/mark-${k}.svg`

/* Knocks any artwork out to solid white, for the reversed versions. */
const REVERSE = "brightness(0) invert(1)"

function Panel({
  title,
  detail,
  download,
  className,
  style,
  children,
}: {
  title: string
  detail?: string
  download?: string
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <section className="flex h-full flex-col overflow-hidden rounded-xl border bg-card">
      {/* Every card previews on the same surface at the same height, so the
          grid reads as one set; coloured and dark versions sit on their own
          tile inside it rather than repainting the card. */}
      <div
        className={cn(
          "flex h-64 items-center justify-center gap-6 bg-muted/50 p-6",
          className
        )}
        style={style}
      >
        {children}
      </div>
      <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          {detail ? (
            <p className="text-xs text-muted-foreground">{detail}</p>
          ) : null}
        </div>
        {download ? (
          <a
            href={download}
            download
            className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <IconDownload className="size-3.5" />
            SVG
          </a>
        ) : null}
      </div>
    </section>
  )
}

/* A filled surface inside a card's preview — the brand colour, dark, or
   white — so every card keeps the same neutral frame around it. */
function Tile({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <div
      className="flex h-full min-w-0 flex-1 items-center justify-center rounded-lg ring-1 ring-black/5"
      style={{ background: bg }}
    >
      {children}
    </div>
  )
}

/* A browser tab at its real size, so the favicon is judged where it lives. */
function BrowserTab({ src, dark }: { src: string; dark?: boolean }) {
  return (
    <div
      className={cn(
        "flex h-9 w-56 items-center gap-2 rounded-t-lg px-3 text-xs shadow-sm",
        dark ? "bg-[#35363a] text-white/90" : "bg-white text-neutral-800"
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="size-4 shrink-0"
        style={dark ? { filter: REVERSE } : undefined}
      />
      <span className="truncate">Patients | Human Optimization Lab</span>
    </div>
  )
}

/* Loader motion. One stylesheet for every animation on the page, and all of
   it switched off under prefers-reduced-motion — a loader that can't move
   still shows the mark, it just holds still. */
const MOTION_CSS = `
@keyframes logo-draw {
  0% { stroke-dashoffset: 2600; fill-opacity: 0; stroke-opacity: 1 }
  55% { stroke-dashoffset: 0; fill-opacity: 0; stroke-opacity: 1 }
  75% { fill-opacity: 1; stroke-opacity: 0 }
  92% { fill-opacity: 1; stroke-opacity: 0 }
  100% { stroke-dashoffset: 0; fill-opacity: 0; stroke-opacity: 0 }
}
@keyframes logo-ripple { 0% { transform: scale(.55); opacity: .55 } 100% { transform: scale(1.35); opacity: 0 } }
@keyframes logo-fill { 0% { clip-path: inset(100% 0 0 0); opacity: 1 } 70% { clip-path: inset(0 0 0 0); opacity: 1 } 88% { opacity: 1 } 100% { clip-path: inset(0 0 0 0); opacity: 0 } }
@keyframes logo-bar { 0% { left: -40%; width: 40% } 60%,100% { left: 100%; width: 40% } }
@keyframes logo-dot { 0%,80%,100% { opacity: .25; transform: translateY(0) } 40% { opacity: 1; transform: translateY(-4px) } }
@keyframes logo-wipe { 0% { clip-path: inset(0 100% 0 0) } 55%,85% { clip-path: inset(0 0 0 0) } 100% { clip-path: inset(0 0 0 100%) } }
.logo-draw svg { width: 100%; height: 100% }
.logo-draw svg path { stroke: var(--c); stroke-width: 7; stroke-dasharray: 2600; animation: logo-draw 3s ease-in-out infinite }
.logo-ripple { animation: logo-ripple 2.4s cubic-bezier(.2,.6,.3,1) infinite }
.logo-fill { animation: logo-fill 2.6s ease-in-out infinite }
.logo-bar { animation: logo-bar 1.6s ease-in-out infinite }
.logo-dot { animation: logo-dot 1.2s ease-in-out infinite }
.logo-wipe { animation: logo-wipe 2.6s ease-in-out infinite }
@media (prefers-reduced-motion: reduce) {
  .logo-motion *, .logo-motion *::after { animation: none !important }
  .logo-draw svg path { stroke-dasharray: none; fill-opacity: 1; stroke-opacity: 0 }
  .logo-ripple { opacity: 0 }
}
`

/* One tile in the motion set: a white stage on the shared preview surface. */
function MotionCard({
  title,
  detail,
  children,
}: {
  title: string
  detail: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col overflow-hidden rounded-xl border bg-card">
      <div className="flex h-44 bg-muted/50 p-3">
        <div
          className="flex flex-1 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-black/5"
        >
          {children}
        </div>
      </div>
      <div className="border-t px-3 py-2.5">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </section>
  )
}

/* The draw-on loader needs the mark's paths in the DOM to trace them, so this
   one fetches the SVG and inlines it; every other loader animates the <img>. */
function InlineMark({ src, stroke }: { src: string; stroke: string }) {
  const [markup, setMarkup] = React.useState("")
  React.useEffect(() => {
    let live = true
    fetch(src)
      .then((r) => r.text())
      .then((text) => live && setMarkup(text))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [src])
  return (
    <div
      className="logo-draw size-20"
      style={{ "--c": stroke } as React.CSSProperties}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  )
}

export default function LogoPage() {
  const [concept, setConcept] = React.useState<ConceptId>("v1")
  const [colour, setColour] = React.useState<ColourId>("teal")
  const tile = COLOURS.find((c) => c.id === colour)!.tile
  const current = CONCEPTS.find((c) => c.id === concept)!
  const lockup = lockupSrc(concept, colour)
  const mark = markSrc(concept, colour)

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Logo</h1>
      </header>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={concept} onValueChange={(v) => setConcept(v as ConceptId)}>
          <TabsList>
            {CONCEPTS.map((c) => (
              <TabsTrigger key={c.id} value={c.id}>
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Tabs value={colour} onValueChange={(v) => setColour(v as ColourId)}>
          <TabsList>
            {COLOURS.map((c) => (
              <TabsTrigger key={c.id} value={c.id} className="gap-1.5">
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: c.tile }}
                />
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">{current.note}</p>

      {/* eslint-disable @next/next/no-img-element -- SVG artwork shown as-is */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Panel
            title="Logo with name"
            detail="Primary lockup: headers, documents, sign-in"
            download={lockup}
          >
            <div className="flex h-full w-full items-center justify-center rounded-lg bg-white">
              <img src={lockup} alt="Logo with name" className="h-24 w-auto max-w-[80%]" />
            </div>
          </Panel>
        </div>

        <Panel
          title="Logo with name (reversed)"
          detail="On the brand colour"
        >
          <Tile bg={tile}>
            <img src={lockup} alt="" className="h-14 w-auto max-w-[80%]" style={{ filter: REVERSE }} />
          </Tile>
        </Panel>

        <Panel
          title="Logo with name (on dark)"
          detail="Dark mode and dark imagery"
        >
          <Tile bg="#0a0a0a">
            <img src={lockup} alt="" className="h-14 w-auto max-w-[80%]" style={{ filter: REVERSE }} />
          </Tile>
        </Panel>

        <Panel title="Logo" detail="Mark only: collapsed nav, avatars, small spaces" download={mark}>
          <Tile bg="#ffffff">
            <img src={mark} alt="Logo mark" className="size-28" />
          </Tile>
        </Panel>

        <Panel title="Logo (reversed)" detail="Mark on the brand colour and on dark">
          <Tile bg={tile}>
            <img src={mark} alt="" className="size-24" style={{ filter: REVERSE }} />
          </Tile>
          <Tile bg="#0a0a0a">
            <img src={mark} alt="" className="size-24" style={{ filter: REVERSE }} />
          </Tile>
        </Panel>

        <Panel title="Favicon" detail="Browser tab at 16px, in light and dark chrome" className="flex-col gap-6">
          <div className="flex flex-col gap-2">
            <BrowserTab src={mark} />
            <BrowserTab src={mark} dark />
          </div>
          {/* Bottom-aligned on one baseline, labels on a shared line under it. */}
          <div className="flex items-end gap-10">
            {[16, 32, 48].map((s) => (
              <div key={s} className="flex flex-col items-center gap-2">
                <img src={mark} alt="" style={{ width: s, height: s }} />
                <span className="text-xs text-muted-foreground tabular-nums">{s}px</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="App icon" detail="Home screen and PWA: brand, white and dark tiles">
          {[
            { size: 96, bg: tile, reversed: true },
            { size: 96, bg: "#ffffff", reversed: false },
            { size: 96, bg: "#0a0a0a", reversed: true },
          ].map((icon, i) => (
            <div
              key={i}
              className="flex items-center justify-center shadow-md ring-1 ring-black/5"
              style={{
                width: icon.size,
                height: icon.size,
                background: icon.bg,
                borderRadius: icon.size * 0.225,
              }}
            >
              <img
                src={mark}
                alt=""
                style={{
                  width: icon.size * 0.6,
                  height: icon.size * 0.6,
                  filter: icon.reversed ? REVERSE : undefined,
                }}
              />
            </div>
          ))}
        </Panel>

        <Panel title="Social avatar" detail="Profile images, cropped to a circle">
          <div className="flex size-24 items-center justify-center rounded-full" style={{ background: tile }}>
            <img src={mark} alt="" className="size-14" style={{ filter: REVERSE }} />
          </div>
          <div className="flex size-24 items-center justify-center rounded-full bg-white ring-1 ring-black/5">
            <img src={mark} alt="" className="size-14" />
          </div>
          <div className="flex size-24 items-center justify-center rounded-full bg-[#0a0a0a]">
            <img src={mark} alt="" className="size-14" style={{ filter: REVERSE }} />
          </div>
        </Panel>

        <Panel title="Minimum size" detail="Smallest the lockup should appear">
          {/* A label column and a logo column, so every size starts on the same
              left edge and the rows sit on an even rhythm. */}
          <div className="grid grid-cols-[3rem_auto] items-center gap-x-6 gap-y-6">
            {[40, 28, 20].map((h) => (
              <React.Fragment key={h}>
                <span className="text-right text-xs text-muted-foreground tabular-nums">
                  {h}px
                </span>
                <img src={lockup} alt="" style={{ height: h }} className="w-auto" />
              </React.Fragment>
            ))}
          </div>
        </Panel>
      </div>
      {/* eslint-enable @next/next/no-img-element */}
      <h2 className="mt-12 mb-1 font-heading text-xl font-semibold tracking-tight">
        Motion
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Small animations built from the logo, for splash screens and waiting
        states. All of them hold still under reduced motion.
      </p>
      <style>{MOTION_CSS}</style>
      {/* eslint-disable @next/next/no-img-element -- SVG artwork shown as-is */}
      <div
        className="logo-motion grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        style={{ "--c": tile } as React.CSSProperties}
      >
        <MotionCard title="Draw" detail="Traces the mark, then fills">
          <InlineMark src={mark} stroke={tile} />
        </MotionCard>

        <MotionCard title="Ripple" detail="Rings pulse outward">
          <div className="relative flex size-24 items-center justify-center">
            {[0, 0.8, 1.6].map((d) => (
              <span
                key={d}
                className="logo-ripple absolute inset-0 rounded-full border-2"
                style={{ borderColor: tile, animationDelay: `${d}s` }}
              />
            ))}
            <img src={mark} alt="" className="relative size-10" />
          </div>
        </MotionCard>

        <MotionCard title="Fill" detail="Colour rises through the mark">
          <div className="relative size-16">
            <img src={mark} alt="" className="absolute inset-0 size-full opacity-15 grayscale" />
            <img src={mark} alt="" className="logo-fill absolute inset-0 size-full" />
          </div>
        </MotionCard>

        <MotionCard title="Dots" detail="Mark with a typing-dot loader">
          <div className="flex flex-col items-center gap-3">
            <img src={mark} alt="" className="size-11" />
            <span className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="logo-dot size-1.5 rounded-full"
                  style={{ background: tile, animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </span>
          </div>
        </MotionCard>

        <MotionCard title="Lockup reveal" detail="Full logo wipes on">
          <img src={lockup} alt="" className="logo-wipe h-9 w-auto max-w-[85%]" />
        </MotionCard>

        <MotionCard title="Loading" detail="Lockup, progress bar and status">
          <div className="flex w-full flex-col items-center gap-3 px-6">
            <img src={lockup} alt="" className="h-7 w-auto max-w-full" />
            <div className="relative h-1 w-full overflow-hidden rounded-full bg-black/5">
              <span className="logo-bar absolute inset-y-0 rounded-full" style={{ background: tile }} />
            </div>
            <p className="flex items-center gap-1 text-[11px] text-neutral-500">
              Loading patients
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="logo-dot inline-block size-1 rounded-full bg-current"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </p>
          </div>
        </MotionCard>

      </div>
      {/* eslint-enable @next/next/no-img-element */}
    </div>
  )
}
