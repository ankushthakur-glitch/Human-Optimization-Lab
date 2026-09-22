"use client"

import Link from "next/link"

import { ACCENT_THEMES, BASE_PALETTES, RADIUS_OPTIONS } from "@/design-system/tokens/themes"
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
  { name: "background / foreground", className: "bg-background text-foreground", use: "Page canvas and primary body text" },
  { name: "card / card-foreground", className: "bg-card text-card-foreground", use: "Raised surfaces — panels, table containers, specimens" },
  { name: "popover / popover-foreground", className: "bg-popover text-popover-foreground", use: "Floating layers — menus, popovers, command palette" },
  { name: "primary / primary-foreground", className: "bg-primary text-primary-foreground", use: "Primary actions and active navigation" },
  { name: "secondary / secondary-foreground", className: "bg-secondary text-secondary-foreground", use: "Low-emphasis actions and neutral badges" },
  { name: "muted / muted-foreground", className: "bg-muted text-muted-foreground", use: "Table headers, metadata, timestamps, MRNs" },
  { name: "surface-hover / surface-hover-foreground", className: "bg-surface-hover text-surface-hover-foreground", use: "The one hover tint — every menu item, row, tab and ghost button" },
  { name: "accent / accent-foreground", className: "bg-accent text-accent-foreground", use: "shadcn's hover pair — aliased to surface-hover so stock components match" },
  { name: "surface-selected", className: "bg-surface-selected text-foreground", use: "Selected rows and choices, alongside the edge marker" },
  { name: "sidebar / sidebar-foreground", className: "bg-sidebar text-sidebar-foreground", use: "The app shell's navigation column" },
]

const LINE_TOKENS = [
  { name: "border", className: "bg-border", use: "Dividers and component outlines" },
  { name: "input", className: "bg-input", use: "Field backgrounds and outlines" },
  { name: "ring", className: "bg-ring", use: "Focus rings — never remove these" },
  { name: "destructive", className: "bg-destructive", use: "Destructive actions, critical results" },
  { name: "sidebar-border", className: "bg-sidebar-border", use: "Dividers inside the shell" },
  { name: "sidebar-ring", className: "bg-sidebar-ring", use: "Focus inside the shell" },
]

const CHARTS = [
  { name: "chart-1", className: "bg-chart-1" },
  { name: "chart-2", className: "bg-chart-2" },
  { name: "chart-3", className: "bg-chart-3" },
  { name: "chart-4", className: "bg-chart-4" },
  { name: "chart-5", className: "bg-chart-5" },
]

const TYPE_SCALE = [
  { token: "text-4xl", size: "36px", weight: "600", use: "Page title — one per screen", className: "text-4xl font-semibold" },
  { token: "text-2xl", size: "24px", weight: "600", use: "Section heading", className: "text-2xl font-semibold" },
  { token: "text-lg", size: "18px", weight: "600", use: "Card and panel titles", className: "text-lg font-semibold" },
  { token: "text-base", size: "16px", weight: "400", use: "Long-form clinical narrative", className: "text-base" },
  { token: "text-sm", size: "14px", weight: "400", use: "Default UI text and table cells", className: "text-sm" },
  { token: "text-xs", size: "12px", weight: "500", use: "Labels, badges, column headers", className: "text-xs font-medium" },
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
  { name: "shadow-none", className: "shadow-none", use: "Flat, inside a bordered container" },
  { name: "shadow-sm", className: "shadow-sm", use: "Cards resting on the canvas" },
  { name: "shadow-md", className: "shadow-md", use: "Hover lift on interactive cards" },
  { name: "shadow-lg", className: "shadow-lg", use: "Popovers, dropdowns, command palette" },
  { name: "shadow-xl", className: "shadow-xl", use: "Dialogs and sheets" },
]

const ICON_SIZES = [
  { name: "size-3", className: "size-3", use: "Inside badges" },
  { name: "size-4", className: "size-4", use: "Default — buttons, menu items, inputs" },
  { name: "size-5", className: "size-5", use: "Section and card headers" },
  { name: "size-6", className: "size-6", use: "Empty states and feature tiles" },
]

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="font-heading text-xl font-semibold tracking-tight">{title}</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

export default function Page() {
  const { config } = useDesignSystem()

  const current = [
    ["Accent", ACCENT_THEMES.find((t) => t.name === config.accent)?.label ?? config.accent],
    ["Base palette", BASE_PALETTES.find((b) => b.name === config.base)?.label ?? config.base],
    ["Body font", BODY_FONTS.find((f) => f.name === config.font)?.label ?? config.font],
    ["Heading font", config.heading === "inherit" ? "Same as body" : config.heading],
    ["Radius", `${config.radius} — ${RADIUS_OPTIONS.find((r) => r.name === config.radius)?.value}`],
  ]

  return (
    <div>
      <header className="mb-10">
        <Badge variant="secondary" className="mb-3">
          Foundations
        </Badge>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Design tokens</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Every primitive the component library is built from. Each one is a CSS variable, which is
          what lets the entire product re-theme at runtime — change any value in{" "}
          <strong className="text-foreground">Customize</strong> and every component on this page
          updates instantly.
        </p>
      </header>

      <div className="flex flex-col gap-14">
        <Section
          title="Active configuration"
          description="What the Customize menu is currently applying. These are stored per browser."
        >
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
          <p className="text-sm text-muted-foreground">
            {ACCENT_THEMES.length} accent themes × {BASE_PALETTES.length} neutral palettes ×{" "}
            {BODY_FONTS.length} typefaces × {RADIUS_OPTIONS.length} radius steps, in light and dark.
          </p>
        </Section>

        <Separator />

        <Section
          title="Color"
          description="Semantic pairs. Reference the token, never the hex — a hardcoded color is the one thing that breaks theming. Each swatch below renders its foreground on its own background, so contrast is visible in every theme."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {COLOR_PAIRS.map((pair) => (
              <div key={pair.name} className={`rounded-xl border p-4 ${pair.className}`}>
                <div className="font-mono text-xs">{pair.name}</div>
                <div className="mt-1 text-xs opacity-70">{pair.use}</div>
              </div>
            ))}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Token</TableHead>
                <TableHead className="w-40">Name</TableHead>
                <TableHead>Use</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {LINE_TOKENS.map((t) => (
                <TableRow key={t.name}>
                  <TableCell>
                    <div className={`h-6 w-16 rounded border ${t.className}`} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">--{t.name}</TableCell>
                  <TableCell className="text-muted-foreground">{t.use}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div>
            <span className="mb-2 block text-xs font-medium text-muted-foreground">
              Chart series — ordered light to dark so a series reads correctly without a legend
            </span>
            <div className="flex gap-2">
              {CHARTS.map((c) => (
                <div key={c.name} className="flex flex-1 flex-col gap-1.5">
                  <div className={`h-12 rounded-lg ${c.className}`} />
                  <span className="font-mono text-[10px] text-muted-foreground">{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Separator />

        <Section
          title="Typography"
          description="A single neutral sans carries body and headings by default. Clinical documentation is read at length, so the scale favours a comfortable measure over density."
        >
          <div className="rounded-xl border bg-card p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">Specimen</TableHead>
                  <TableHead className="w-28">Token</TableHead>
                  <TableHead className="w-16">Size</TableHead>
                  <TableHead>Use</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TYPE_SCALE.map((t) => (
                  <TableRow key={t.token}>
                    <TableCell className={t.className}>Encounter</TableCell>
                    <TableCell className="font-mono text-xs">{t.token}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{t.size}</TableCell>
                    <TableCell className="text-muted-foreground">{t.use}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs font-semibold">Body — font-sans</p>
              <p className="mt-2 text-sm">
                Patient tolerated the procedure well with no immediate complications noted.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs font-semibold">Headings — font-heading</p>
              <p className="font-heading mt-2 text-lg font-semibold">Assessment &amp; Plan</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs font-semibold">Data — font-mono</p>
              <p className="mt-2 font-mono text-sm">MRN-10241 · 128/82</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Identifiers, vitals, dosages, and timestamps go in <code className="font-mono">font-mono</code>{" "}
            so digits align in columns and transpositions are easy to spot.
          </p>
        </Section>

        <Separator />

        <Section
          title="Radius"
          description="The whole scale derives from one --radius value, so changing it in Customize reshapes every component proportionally."
        >
          <div className="flex flex-wrap gap-4">
            {RADII.map((r) => (
              <div key={r.name} className="flex flex-col items-center gap-1.5">
                <div className={`size-16 border-2 border-primary bg-primary-surface ${r.className}`} />
                <span className="font-mono text-[10px] text-muted-foreground">{r.name}</span>
              </div>
            ))}
          </div>
        </Section>

        <Separator />

        <Section
          title="Spacing"
          description="A 4px base grid. Use 2 and 3 inside components, 4 and 6 between them, 8 and above between page sections."
        >
          <div className="flex flex-col gap-2">
            {SPACING.map((s) => (
              <div key={s.name} className="flex items-center gap-3">
                <span className="w-8 font-mono text-xs text-muted-foreground">{s.name}</span>
                <div className={`h-4 rounded-sm bg-primary ${s.className}`} />
                <span className="font-mono text-xs text-muted-foreground">{s.px}</span>
              </div>
            ))}
          </div>
        </Section>

        <Separator />

        <Section
          title="Elevation"
          description="Elevation signals layer, not importance. In dense clinical views prefer a border over a shadow — shadows on every row create visual noise."
        >
          <div className="grid gap-4 sm:grid-cols-5">
            {ELEVATION.map((e) => (
              <div key={e.name} className="flex flex-col gap-2">
                <div className={`h-16 rounded-xl border bg-card ${e.className}`} />
                <div>
                  <div className="font-mono text-[10px]">{e.name}</div>
                  <div className="text-[10px] text-muted-foreground">{e.use}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Separator />

        <Section
          title="Iconography"
          description="Remix Icon, line weight only. Icons inherit currentColor, so they re-theme with their container."
        >
          <div className="flex flex-wrap gap-6">
            {ICON_SIZES.map((s) => (
              <div key={s.name} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
                <svg viewBox="0 0 24 24" fill="currentColor" className={`${s.className} text-primary`}>
                  <circle cx="12" cy="12" r="9" fillOpacity="0.25" />
                  <circle cx="12" cy="12" r="4" />
                </svg>
                <div>
                  <div className="font-mono text-[10px]">{s.name}</div>
                  <div className="text-[10px] text-muted-foreground">{s.use}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Separator />

        <Section title="Where to next" description="The rest of the system.">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { href: "/patterns/navigation", label: "Navigation patterns" },
              { href: "/patterns/data", label: "Data patterns" },
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
