"use client"

import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"
import { BRAND_NAME, MARK } from "@/lib/brand"
import { IconLock } from "@/design-system/icons"

import s from "./brand-panel.module.css"

/* The brand panel beside every sign-in form: four technical drawings of what the product
   does, set on a faint grid and advancing on their own. Each diagram is SVG
   for the lines and HTML for the nodes, because only HTML can blur what is
   behind it, and that blur over the grid is what makes the nodes read as
   glass. Every figure is illustrative sample data. */

// Every drawing shares one coordinate space; HTML nodes are placed in it by
// percentage so they stay locked to the lines at any panel width.
const W = 560
const H = 360
const at = (
  x: number,
  y: number,
  w: number,
  h: number
): React.CSSProperties => ({
  left: `${(x / W) * 100}%`,
  top: `${(y / H) * 100}%`,
  width: `${(w / W) * 100}%`,
  height: `${(h / H) * 100}%`,
})

/** How long each drawing stays up before the next one arrives. */
const DWELL_MS = 2000

/* ------------------------------------------------------------------------ */
/* Shared pieces                                                             */
/* ------------------------------------------------------------------------ */

/** The panel's chrome: the mark and name on top, the trust line below. The
    panel only shows from lg; below that the form takes the full width. */
function Frame({
  style,
  children,
}: {
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        s.frame,
        "hidden rounded-2xl lg:flex lg:flex-col lg:p-12 xl:p-14"
      )}
      style={style}
    >
      <div className="relative z-10 flex items-center gap-2.5">
        {/* Pure white, so the mark matches the name beside it. */}
        <Image
          src={MARK.dark}
          alt=""
          aria-hidden
          width={28}
          height={28}
          className="size-7 brightness-0 invert"
        />
        <span className="text-[15px] font-semibold tracking-[-0.01em]">
          {BRAND_NAME}
        </span>
      </div>
      {children}
      <p className="relative z-10 flex items-center gap-2 text-xs opacity-85">
        <IconLock className="size-3.5" />
        HIPAA-aligned, with two-factor sign-in on every account
      </p>
    </div>
  )
}

/** The slide's headline and one supporting line. */
function Copy({ title, body }: { title: string; body: string }) {
  return (
    <div className="relative z-10">
      <h2 className="font-heading text-[2.625rem] leading-[1.06] font-semibold tracking-[-0.035em] text-balance xl:text-[3rem]">
        {title}
      </h2>
      <p className="mt-4 max-w-[42ch] text-[15px] leading-relaxed opacity-90">
        {body}
      </p>
    </div>
  )
}

/** Catmull-Rom through the points, as cubic Béziers: a curve that passes
    through every reading instead of cutting corners between them. */
function smooth(points: [number, number][]) {
  return points.reduce((d, [x, y], i, p) => {
    if (i === 0) return `M${x} ${y}`
    const [x0, y0] = p[i - 2] ?? p[i - 1]
    const [x1, y1] = p[i - 1]
    const [x3, y3] = p[i + 1] ?? [x, y]
    const c1 = [x1 + (x - x0) / 6, y1 + (y - y0) / 6]
    const c2 = [x - (x3 - x1) / 6, y - (y3 - y1) / 6]
    return `${d} C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${x} ${y}`
  }, "")
}

function Plus({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 14 14"
      aria-hidden
      className={cn("absolute size-3.5 opacity-60", className)}
    >
      <path d="M7 0V14M0 7H14" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

/** The record: the mark in a pane of glass, beating in time with the data. */
function GlassNode({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <div className="absolute" style={at(x, y, size, size)}>
      <div className="relative aspect-square w-full">
        <div
          aria-hidden
          className={cn(s.halo, "absolute -inset-[35%] rounded-full blur-2xl")}
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--glow) 60%, transparent), transparent 65%)",
          }}
        />
        <div
          className={cn(
            s.glassNode,
            "inset-0 flex items-center justify-center rounded-[24%]"
          )}
        >
          <Image
            src={MARK.dark}
            alt=""
            aria-hidden
            width={96}
            height={96}
            className={cn(
              s.beat,
              "size-[60%] brightness-0 drop-shadow-[0_6px_14px_rgb(0_0_0/0.35)] invert"
            )}
          />
        </div>
        <Plus className="-top-[7px] -left-[7px]" />
        <Plus className="-top-[7px] -right-[7px]" />
        <Plus className="-bottom-[7px] -left-[7px]" />
        <Plus className="-right-[7px] -bottom-[7px]" />
      </div>
    </div>
  )
}

/** A labelled box on the drawing, in lighter glass than the record. */
function Label({
  x,
  y,
  w,
  h,
  center,
  children,
}: {
  x: number
  y: number
  w: number
  h: number
  center?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        s.glassLabel,
        "flex items-center rounded-xl px-3.5 text-xs font-medium whitespace-nowrap",
        center && "justify-center px-0"
      )}
      style={at(x, y, w, h)}
    >
      {children}
    </div>
  )
}

/** A faint line, and a bright dash travelling along it. */
function Wire({ d, delay = 0 }: { d: string; delay?: number }) {
  return (
    <>
      <path d={d} fill="none" stroke="currentColor" strokeOpacity="0.3" />
      <path
        d={d}
        fill="none"
        stroke="var(--glow)"
        strokeWidth="2"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray="10 90"
        className={s.travel}
        style={{ animationDelay: `${delay}s` }}
      />
    </>
  )
}

const mono = {
  className: "font-sans",
  fontSize: 11.5,
  letterSpacing: 1.4,
  fill: "currentColor",
} as const

/* ------------------------------------------------------------------------ */
/* 1. Sources: three feeds into one record.                                  */
/* ------------------------------------------------------------------------ */

const SOURCES = [
  { label: "Lab panels", y: 70 },
  { label: "Hospital records", y: 180 },
  { label: "Wearables", y: 290 },
]
const feed = (y: number) =>
  y === 180
    ? "M176 180 H352"
    : `M176 ${y} H252 Q264 ${y} 264 ${y + (y < 180 ? 12 : -12)} V${y < 180 ? 168 : 192} Q264 180 276 180 H352`

function SourcesDrawing() {
  return (
    <>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="absolute inset-0 size-full overflow-visible"
        aria-hidden
      >
        {SOURCES.map(({ y }, i) => (
          <g key={y}>
            <Wire d={feed(y)} delay={i * 0.45} />
            <circle cx="176" cy={y} r="3" fill="var(--glow)" />
          </g>
        ))}
        <path
          d="M472 180 H556"
          stroke="currentColor"
          strokeOpacity="0.3"
          strokeDasharray="2 4"
        />
        <text x="412" y="272" textAnchor="middle" {...mono} opacity="0.95">
          One record
        </text>
      </svg>
      {SOURCES.map(({ label, y }) => (
        <Label key={label} x={-8} y={y - 22} w={184} h={44}>
          {label}
        </Label>
      ))}
      <GlassNode x={352} y={120} size={120} />
    </>
  )
}

/* ------------------------------------------------------------------------ */
/* 2. Marker: one biomarker drawn against its lab range and optimal band.   */
/* ------------------------------------------------------------------------ */

// ApoB (mg/dL), January to September. y = 300 - (v - 40) * 2.4, so the lab
// limit (130) sits at y 84 and the optimal ceiling (80) at y 204.
const APOB = [128, 124, 113, 104, 96, 88, 82, 77, 74]
const APOB_PTS = APOB.map(
  (v, i) => [60 + i * 56, 300 - (v - 40) * 2.4] as [number, number]
)
const [END_X, END_Y] = APOB_PTS[APOB_PTS.length - 1]

function MarkerDrawing() {
  return (
    <>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="absolute inset-0 size-full overflow-visible"
        aria-hidden
      >
        {/* Axes and the two bands. */}
        <path
          d="M48 28 V300 H536"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.45"
        />
        <rect
          x="48"
          y="84"
          width="488"
          height="216"
          fill="currentColor"
          opacity="0.03"
        />
        <line
          x1="48"
          x2="536"
          y1="84"
          y2="84"
          stroke="currentColor"
          strokeOpacity="0.35"
          strokeDasharray="3 5"
        />
        <rect
          x="48"
          y="204"
          width="488"
          height="96"
          fill="var(--glow)"
          opacity="0.12"
        />
        <line
          x1="48"
          x2="536"
          y1="204"
          y2="204"
          stroke="var(--glow)"
          strokeOpacity="0.8"
          strokeDasharray="3 5"
        />
        <text x="58" y="76" {...mono} opacity="0.95">
          LAB LIMIT 130
        </text>
        <text x="58" y="222" {...mono} fill="var(--ice)">
          OPTIMAL &lt; 80
        </text>
        {/* Dimension line for the optimal band. */}
        <g stroke="var(--glow)" strokeOpacity="0.7">
          <line x1="548" x2="548" y1="204" y2="300" />
          <line x1="543" x2="553" y1="204" y2="204" />
          <line x1="543" x2="553" y1="300" y2="300" />
        </g>
        {["J", "F", "M", "A", "M", "J", "J", "A", "S"].map((m, i) => (
          <g key={i}>
            <line
              x1={60 + i * 56}
              x2={60 + i * 56}
              y1="300"
              y2="305"
              stroke="currentColor"
              strokeOpacity="0.45"
            />
            <text
              x={60 + i * 56}
              y="322"
              textAnchor="middle"
              {...mono}
              opacity="0.95"
            >
              {m}
            </text>
          </g>
        ))}
        <path
          d={smooth(APOB_PTS)}
          fill="none"
          stroke="var(--ice)"
          strokeWidth="2.25"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="100 100"
          className={s.draw}
        />
        {APOB_PTS.map(([x, y]) => (
          <path
            key={x}
            d={`M${x - 4} ${y} H${x + 4} M${x} ${y - 4} V${y + 4}`}
            stroke="currentColor"
            strokeOpacity="0.6"
          />
        ))}
        <circle
          cx={END_X}
          cy={END_Y}
          r="5"
          fill="var(--glow)"
          className={s.pulse}
        />
        <circle cx={END_X} cy={END_Y} r="4.5" fill="var(--ice)" />
        <path
          d={`M${END_X} ${END_Y - 8} V150`}
          stroke="currentColor"
          strokeOpacity="0.4"
          strokeDasharray="2 3"
        />
      </svg>
      <div
        className={cn(s.glassNode, "rounded-xl px-4 py-3")}
        style={{ ...at(END_X - 92, 76, 132, 74), height: "auto" }}
      >
        <p className="text-[11px] tracking-[0.14em] opacity-95">APOB, MG/DL</p>
        <p className="mt-1 flex items-baseline gap-2">
          <span className="font-heading text-3xl font-light tracking-[-0.03em] tabular-nums">
            74
          </span>
          <span className="text-sm tabular-nums">-42%</span>
        </p>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------------ */
/* 3. Loop: measure, review, plan, act, around the record.                   */
/* ------------------------------------------------------------------------ */

const LOOP = "M280 52 a128 128 0 1 1 0 256 a128 128 0 1 1 0 -256"
const STAGES = [
  { label: "Measure", x: 280, y: 52 },
  { label: "Review", x: 408, y: 180 },
  { label: "Plan", x: 280, y: 308 },
  { label: "Act", x: 152, y: 180 },
]

function LoopDrawing() {
  return (
    <>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="absolute inset-0 size-full overflow-visible"
        aria-hidden
      >
        <defs>
          <mask
            id="loop-cards"
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width={W}
            height={H}
          >
            <rect width={W} height={H} fill="white" />
            {STAGES.map(({ label, x, y }) => (
              <rect
                key={label}
                x={x - 56}
                y={y - 21}
                width="112"
                height="42"
                rx="10"
                fill="black"
              />
            ))}
          </mask>
        </defs>
        <circle
          cx="280"
          cy="180"
          r="160"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.1"
          strokeDasharray="2 6"
        />
        <g mask="url(#loop-cards)">
          <Wire d={LOOP} />
        </g>
        {/* Direction marks between the stages. */}
        {[45, 135, 225, 315].map((deg) => {
          const a = (deg * Math.PI) / 180
          const x = 280 + 128 * Math.sin(a)
          const y = 180 - 128 * Math.cos(a)
          return (
            <path
              key={deg}
              d="M-4 -5 L3 0 L-4 5"
              fill="none"
              stroke="var(--glow)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              transform={`translate(${x} ${y}) rotate(${deg})`}
            />
          )
        })}
        <text x="280" y="250" textAnchor="middle" {...mono} opacity="0.95">
          Every cycle recorded
        </text>
      </svg>
      {STAGES.map(({ label, x, y }) => (
        <Label key={label} x={x - 52} y={y - 17} w={104} h={34} center>
          {label}
        </Label>
      ))}
      <GlassNode x={236} y={130} size={88} />
    </>
  )
}

/* ------------------------------------------------------------------------ */
/* 4. Layers: the record inside its boundaries.                              */
/* ------------------------------------------------------------------------ */

const LAYERS = [
  { label: "Practice boundary", x: 40, y: 14, w: 480, h: 332, r: 22 },
  { label: "ROLE-BASED ACCESS", x: 104, y: 62, w: 352, h: 236, r: 18 },
  { label: "TWO-FACTOR SIGN-IN", x: 168, y: 106, w: 224, h: 148, r: 14 },
]
const rectPath = ({ x, y, w, h, r }: (typeof LAYERS)[number]) =>
  `M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`

function LayersDrawing() {
  return (
    <>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="absolute inset-0 size-full overflow-visible"
        aria-hidden
      >
        {LAYERS.map((layer, i) => (
          <g key={layer.label}>
            <path
              d={rectPath(layer)}
              fill="currentColor"
              fillOpacity={0.025 + i * 0.02}
              stroke="currentColor"
              strokeOpacity={0.22 + i * 0.1}
              strokeDasharray={i === 0 ? "4 5" : undefined}
            />
            <text x={layer.x + 14} y={layer.y + 22} {...mono} opacity="0.95">
              {layer.label}
            </text>
          </g>
        ))}
        {/* A scan travelling the outer boundary. */}
        <path
          d={rectPath(LAYERS[0])}
          fill="none"
          stroke="var(--glow)"
          strokeWidth="2"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="6 94"
          className={s.travel}
          style={{ animationDuration: "5.6s" }}
        />
        <text x="280" y="244" textAnchor="middle" {...mono} opacity="0.95">
          Every access logged
        </text>
      </svg>
      <GlassNode x={246} y={148} size={68} />
    </>
  )
}

/* ------------------------------------------------------------------------ */
/* The panel                                                                 */
/* ------------------------------------------------------------------------ */

const SLIDES = [
  {
    drawing: SourcesDrawing,
    title: "Connected once. Current always.",
    body: "Labs, hospital records and wearables sync in the background, so the chart is ready before the visit.",
  },
  {
    drawing: LoopDrawing,
    title: "Every result sharpens the plan.",
    body: "Measure, review, plan and act, with each cycle on the record so progress is never guesswork.",
  },
  {
    drawing: LayersDrawing,
    title: "Private by design.",
    body: "Practice-level data isolation, two-factor sign-in and a full audit trail on every record.",
  },
  {
    drawing: MarkerDrawing,
    title: "Optimal, not just normal.",
    body: "Every biomarker drawn against its lab range and the optimal target you set for that patient.",
  },
]

export function BlueprintPanel() {
  const [index, setIndex] = React.useState(0)
  const [paused, setPaused] = React.useState(false)
  const slide = SLIDES[index]
  const Drawing = slide.drawing
  const next = () => setIndex((i) => (i + 1) % SLIDES.length)

  return (
    <Frame
      // Lifted a step off the other dark panels: the grid and glass read better
      // on a mid teal than on near-black.
      style={{
        background:
          "radial-gradient(75% 60% at 50% 42%, color-mix(in oklab, var(--deep) 88%, white), color-mix(in oklab, var(--deep) 62%, var(--ink)) 85%)",
      }}
    >
      <div
        aria-hidden
        className={cn(
          s.watermark,
          "pointer-events-none absolute top-[4%] -right-[16%] z-0 aspect-square w-[82%]"
        )}
      >
        <div
          className={cn(s.markLight, "size-full")}
          style={{ "--mark": `url(${MARK.light})` } as React.CSSProperties}
        />
      </div>
      <div aria-hidden className={cn("absolute inset-0 z-0", s.blueprint)} />

      {/* Hovering holds the current drawing, as it does on any carousel. */}
      <div
        className="relative z-10 grid min-h-0 flex-1 grid-rows-[3fr_2fr]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* The drawing takes the top 60% of the panel and scales to fill it:
            the row is a size container, so the drawing can be as wide as the
            row is tall allows (560:360) without spilling out of it. */}
        <div className="[container-type:size] flex min-h-0 items-center justify-center py-6">
          <div
            key={index}
            className={cn(
              "relative aspect-[560/360] w-[min(100%,40rem,155cqh)]",
              s.slideIn
            )}
            aria-hidden
          >
            <Drawing />
          </div>
        </div>

        {/* The words take the bottom 40%. */}
        <div className="flex flex-col justify-center">
          <div
            key={`copy-${index}`}
            className={s.slideIn}
            style={{ animationDelay: "120ms" }}
          >
            <Copy title={slide.title} body={slide.body} />
          </div>

          <div
            className="mt-8 flex gap-2"
            role="tablist"
            aria-label="Blueprint"
          >
            {SLIDES.map((sl, i) => (
              <button
                key={sl.title}
                role="tab"
                aria-selected={i === index}
                aria-label={sl.title}
                onClick={() => setIndex(i)}
                className="group relative h-6 w-12 cursor-pointer"
              >
                <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 overflow-hidden rounded-full bg-white/15 transition-colors group-hover:bg-white/25">
                  {i < index && (
                    <span className="absolute inset-0 bg-white/50" />
                  )}
                  {i === index && (
                    // Advancing on the bar's own animationend keeps the bar and
                    // the slide in step through pauses; with motion reduced the
                    // bar never animates, so the slides wait to be picked.
                    <span
                      key={index}
                      className={cn(s.progress, "absolute inset-0 bg-(--ice)")}
                      style={
                        {
                          "--dwell": `${DWELL_MS}ms`,
                          animationPlayState: paused ? "paused" : "running",
                        } as React.CSSProperties
                      }
                      onAnimationEnd={next}
                    />
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Frame>
  )
}
