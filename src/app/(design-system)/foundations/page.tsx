"use client"

import Link from "next/link"

import { BASE_PALETTES, RADIUS_OPTIONS } from "@/design-system/tokens/themes"
import { ALL_ACCENT_THEMES } from "@/design-system/tokens/accents"
import { BODY_FONTS } from "@/design-system/tokens/fonts"
import { useDesignSystem } from "@/design-system/providers/design-system-provider"
import { Badge } from "@/design-system/ui/badge"
import { Separator } from "@/design-system/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/ui/table"

const COLOR_PAIRS = [
  {
    name: "background / foreground",
    className: "bg-background text-foreground",
  },
  { name: "card / card-foreground", className: "bg-card text-card-foreground" },
  {
    name: "popover / popover-foreground",
    className: "bg-popover text-popover-foreground",
  },
  {
    name: "primary / primary-foreground",
    className: "bg-primary text-primary-foreground",
  },
  {
    name: "secondary / secondary-foreground",
    className: "bg-secondary text-secondary-foreground",
  },
  {
    name: "muted / muted-foreground",
    className: "bg-muted text-muted-foreground",
  },
  {
    name: "surface-hover / surface-hover-foreground",
    className: "bg-surface-hover text-surface-hover-foreground",
  },
  {
    name: "accent / accent-foreground",
    className: "bg-accent text-accent-foreground",
  },
  {
    name: "surface-selected",
    className: "bg-surface-selected text-foreground",
  },
  {
    name: "sidebar / sidebar-foreground",
    className: "bg-sidebar text-sidebar-foreground",
  },
]

const RAMPS = [
  {
    name: "primary",
    label: "Primary",
    steps: [
      "bg-primary-1",
      "bg-primary-2",
      "bg-primary-3",
      "bg-primary-4",
      "bg-primary-5",
      "bg-primary-6",
      "bg-primary-7",
      "bg-primary-8",
      "bg-primary-9",
      "bg-primary-10",
    ],
  },
  {
    name: "success",
    label: "Success",
    steps: [
      "bg-success-1",
      "bg-success-2",
      "bg-success-3",
      "bg-success-4",
      "bg-success-5",
      "bg-success-6",
      "bg-success-7",
      "bg-success-8",
      "bg-success-9",
      "bg-success-10",
    ],
  },
  {
    name: "warning",
    label: "Warning",
    steps: [
      "bg-warning-1",
      "bg-warning-2",
      "bg-warning-3",
      "bg-warning-4",
      "bg-warning-5",
      "bg-warning-6",
      "bg-warning-7",
      "bg-warning-8",
      "bg-warning-9",
      "bg-warning-10",
    ],
  },
  {
    // "Error" is what the ramp is called in the palette; --destructive is what
    // the token is called everywhere else in the system, so it keeps that name.
    name: "destructive",
    label: "Error",
    steps: [
      "bg-destructive-1",
      "bg-destructive-2",
      "bg-destructive-3",
      "bg-destructive-4",
      "bg-destructive-5",
      "bg-destructive-6",
      "bg-destructive-7",
      "bg-destructive-8",
      "bg-destructive-9",
      "bg-destructive-10",
    ],
  },
]

const LINE_TOKENS = [
  { name: "border", className: "bg-border" },
  { name: "input", className: "bg-input" },
  { name: "ring", className: "bg-ring" },
  { name: "destructive", className: "bg-destructive" },
  { name: "sidebar-border", className: "bg-sidebar-border" },
  { name: "sidebar-ring", className: "bg-sidebar-ring" },
]

const CHARTS = [
  { name: "chart-1", className: "bg-chart-1" },
  { name: "chart-2", className: "bg-chart-2" },
  { name: "chart-3", className: "bg-chart-3" },
  { name: "chart-4", className: "bg-chart-4" },
  { name: "chart-5", className: "bg-chart-5" },
]

const TYPE_SCALE = [
  {
    token: "text-4xl",
    size: "36px",
    weight: "600",
    className: "text-4xl font-semibold",
  },
  {
    token: "text-2xl",
    size: "24px",
    weight: "600",
    className: "text-2xl font-semibold",
  },
  {
    token: "text-lg",
    size: "18px",
    weight: "600",
    className: "text-lg font-semibold",
  },
  { token: "text-base", size: "16px", weight: "400", className: "text-base" },
  { token: "text-sm", size: "14px", weight: "400", className: "text-sm" },
  {
    token: "text-xs",
    size: "12px",
    weight: "500",
    className: "text-xs font-medium",
  },
]

const RADII = [
  { name: "sm", className: "rounded-sm" },
  { name: "md", className: "rounded-md" },
  { name: "lg", className: "rounded-lg" },
  { name: "xl", className: "rounded-xl" },
  { name: "2xl", className: "rounded-2xl" },
  { name: "3xl", className: "rounded-3xl" },
  { name: "4xl", className: "rounded-4xl" },
]

const SPACING = [
  { name: "1", px: "4px", className: "w-1" },
  { name: "2", px: "8px", className: "w-2" },
  { name: "3", px: "12px", className: "w-3" },
  { name: "4", px: "16px", className: "w-4" },
  { name: "6", px: "24px", className: "w-6" },
  { name: "8", px: "32px", className: "w-8" },
  { name: "12", px: "48px", className: "w-12" },
  { name: "16", px: "64px", className: "w-16" },
]

const ELEVATION = [
  { name: "shadow-none", className: "shadow-none" },
  { name: "shadow-sm", className: "shadow-sm" },
  { name: "shadow-md", className: "shadow-md" },
  { name: "shadow-lg", className: "shadow-lg" },
  { name: "shadow-xl", className: "shadow-xl" },
]

const ICON_SIZES = [
  { name: "size-3", className: "size-3" },
  { name: "size-4", className: "size-4" },
  { name: "size-5", className: "size-5" },
  { name: "size-6", className: "size-6" },
]

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-heading text-xl font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  )
}

export default function Page() {
  const { config } = useDesignSystem()

  const current = [
    [
      "Accent",
      ALL_ACCENT_THEMES.find((t) => t.name === config.accent)?.label ??
        config.accent,
    ],
    [
      "Base palette",
      BASE_PALETTES.find((b) => b.name === config.base)?.label ?? config.base,
    ],
    [
      "Body font",
      BODY_FONTS.find((f) => f.name === config.font)?.label ?? config.font,
    ],
    [
      "Heading font",
      config.heading === "inherit" ? "Same as body" : config.heading,
    ],
    [
      "Radius",
      `${config.radius} — ${RADIUS_OPTIONS.find((r) => r.name === config.radius)?.value}`,
    ],
  ]

  return (
    <div>
      <header className="mb-10">
        <Badge variant="secondary" className="mb-3">
          Foundations
        </Badge>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Design tokens
        </h1>
      </header>

      <div className="flex flex-col gap-14">
        <Section title="Active configuration">
          <dl className="grid gap-x-8 gap-y-3 rounded-xl border bg-card p-6 sm:grid-cols-2">
            {current.map(([k, v]) => (
              <div
                key={k}
                className="flex items-baseline justify-between gap-4 border-b border-dashed pb-2 last:border-0"
              >
                <dt className="text-sm text-muted-foreground">{k}</dt>
                <dd className="font-mono text-sm">{v}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Separator />

        <Section title="Color">
          <div className="grid gap-3 sm:grid-cols-2">
            {COLOR_PAIRS.map((pair) => (
              <div
                key={pair.name}
                className={`rounded-xl border p-4 ${pair.className}`}
              >
                <div className="font-mono text-xs">{pair.name}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-5">
            <span className="text-xs font-medium text-muted-foreground">
              Ramps
            </span>
            {RAMPS.map((ramp) => (
              <div key={ramp.name} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-xs font-medium">{ramp.label}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    --{ramp.name}-1 … --{ramp.name}-10
                  </span>
                </div>
                <div className="flex overflow-hidden rounded-lg border">
                  {ramp.steps.map((step) => (
                    <div key={step} className={`h-12 flex-1 ${step}`} />
                  ))}
                </div>
                <div className="flex">
                  {ramp.steps.map((step, i) => (
                    <span
                      key={step}
                      className="flex-1 text-center font-mono text-[10px] text-muted-foreground"
                    >
                      {i + 1}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Token</TableHead>
                <TableHead>Name</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {LINE_TOKENS.map((t) => (
                <TableRow key={t.name}>
                  <TableCell>
                    <div className={`h-6 w-16 rounded border ${t.className}`} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    --{t.name}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div>
            <span className="mb-2 block text-xs font-medium text-muted-foreground">
              Chart series
            </span>
            <div className="flex gap-2">
              {CHARTS.map((c) => (
                <div key={c.name} className="flex flex-1 flex-col gap-1.5">
                  <div className={`h-12 rounded-lg ${c.className}`} />
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {c.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Separator />

        <Section title="Typography">
          <div className="rounded-xl border bg-card p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">Specimen</TableHead>
                  <TableHead className="w-28">Token</TableHead>
                  <TableHead>Size</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TYPE_SCALE.map((t) => (
                  <TableRow key={t.token}>
                    <TableCell className={t.className}>Encounter</TableCell>
                    <TableCell className="font-mono text-xs">
                      {t.token}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {t.size}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs font-semibold">Body — font-sans</p>
              <p className="mt-2 text-sm">
                Patient tolerated the procedure well with no immediate
                complications noted.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs font-semibold">Headings — font-heading</p>
              <p className="mt-2 font-heading text-lg font-semibold">
                Assessment &amp; Plan
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs font-semibold">Data — font-mono</p>
              <p className="mt-2 font-mono text-sm">MRN-10241 · 128/82</p>
            </div>
          </div>
        </Section>

        <Separator />

        <Section title="Radius">
          <div className="flex flex-wrap gap-4">
            {RADII.map((r) => (
              <div key={r.name} className="flex flex-col items-center gap-1.5">
                <div
                  className={`size-16 border-2 border-primary bg-primary-surface ${r.className}`}
                />
                <span className="font-mono text-[10px] text-muted-foreground">
                  {r.name}
                </span>
              </div>
            ))}
          </div>
        </Section>

        <Separator />

        <Section title="Spacing">
          <div className="flex flex-col gap-2">
            {SPACING.map((s) => (
              <div key={s.name} className="flex items-center gap-3">
                <span className="w-8 font-mono text-xs text-muted-foreground">
                  {s.name}
                </span>
                <div className={`h-4 rounded-sm bg-primary ${s.className}`} />
                <span className="font-mono text-xs text-muted-foreground">
                  {s.px}
                </span>
              </div>
            ))}
          </div>
        </Section>

        <Separator />

        <Section title="Elevation">
          <div className="grid gap-4 sm:grid-cols-5">
            {ELEVATION.map((e) => (
              <div key={e.name} className="flex flex-col gap-2">
                <div
                  className={`h-16 rounded-xl border bg-card ${e.className}`}
                />
                <div className="font-mono text-[10px]">{e.name}</div>
              </div>
            ))}
          </div>
        </Section>

        <Separator />

        <Section title="Iconography">
          <div className="flex flex-wrap gap-6">
            {ICON_SIZES.map((s) => (
              <div
                key={s.name}
                className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className={`${s.className} text-primary-tint`}
                >
                  <circle cx="12" cy="12" r="9" fillOpacity="0.25" />
                  <circle cx="12" cy="12" r="4" />
                </svg>
                <div className="font-mono text-[10px]">{s.name}</div>
              </div>
            ))}
          </div>
        </Section>

        <Separator />

        <Section title="Where to next">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: "/screens/patients", label: "Patients screen" },
              { href: "/accents", label: "Primary colour" },
              { href: "/components/button", label: "All components" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-xl border bg-card px-4 py-3 text-sm transition-colors hover:border-primary hover:bg-surface-hover"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}
