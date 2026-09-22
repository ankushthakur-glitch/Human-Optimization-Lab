"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import * as FreeIcons from "@hugeicons/core-free-icons"

import { ICON_CATALOG, IconSearch, IconCheck, IconClose } from "@/design-system/icons"
import { useDesignSystem } from "@/design-system/providers/design-system-provider"
import { cn } from "@/lib/utils"
import { Badge } from "@/design-system/ui/badge"
import { Input } from "@/design-system/ui/input"
import { Separator } from "@/design-system/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/design-system/ui/tooltip"

type IconData = React.ComponentProps<typeof HugeiconsIcon>["icon"]

const ALL_ICONS: { name: string; icon: IconData }[] = Object.entries(FreeIcons)
  .filter(([name, value]) => name.endsWith("Icon") && Array.isArray(value))
  .map(([name, value]) => ({ name, icon: value as IconData }))
  .sort((a, b) => a.name.localeCompare(b.name))

const RESULT_CAP = 240

const STROKES = [
  { name: "light", value: 1, label: "Light", note: "1.0 — airy, best above 20px" },
  { name: "regular", value: 1.5, label: "Regular", note: "1.5 — the default" },
  { name: "bold", value: 2, label: "Bold", note: "2.0 — high contrast, small sizes" },
]

const SIZES = [
  { className: "size-3", label: "size-3", note: "Inside badges" },
  { className: "size-4", label: "size-4", note: "Default — buttons, menus, inputs" },
  { className: "size-5", label: "size-5", note: "Section headers" },
  { className: "size-6", label: "size-6", note: "Empty states" },
  { className: "size-8", label: "size-8", note: "Feature tiles" },
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
  const { config, setConfig } = useDesignSystem()
  const [query, setQuery] = React.useState("")
  const [copied, setCopied] = React.useState<string | null>(null)

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ALL_ICONS.slice(0, RESULT_CAP)
    return ALL_ICONS.filter((i) => i.name.toLowerCase().includes(q)).slice(0, RESULT_CAP)
  }, [query])

  const matchCount = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ALL_ICONS.length
    return ALL_ICONS.filter((i) => i.name.toLowerCase().includes(q)).length
  }, [query])

  async function copy(name: string) {
    try {
      await navigator.clipboard.writeText(name)
      setCopied(name)
      setTimeout(() => setCopied(null), 1200)
    } catch {
      // Clipboard can be blocked; the name is visible on the tile regardless.
    }
  }

  return (
    <div>
      <header className="mb-10">
        <Badge variant="secondary" className="mb-3">
          Iconography
        </Badge>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Icons</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          The system uses{" "}
          <a
            href="https://hugeicons.com/icons/stroke-rounded"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Hugeicons Stroke Rounded
          </a>{" "}
          — {ALL_ICONS.length.toLocaleString()} icons, drawn on a 24px grid with rounded caps and
          joins. Every component in this design system has been regenerated against it.
        </p>
      </header>

      <div className="flex flex-col gap-14">
        <Section
          title="Stroke weight"
          description="Weight is a global design token, not a per-icon prop. Hugeicons writes stroke-width as an SVG presentation attribute, and CSS outranks that — so one variable re-weights every icon in the product at once."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {STROKES.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => setConfig({ iconStroke: s.name })}
                aria-pressed={config.iconStroke === s.name}
                className={cn(
                  "flex flex-col items-start gap-3 rounded-xl border p-5 text-left transition-colors",
                  config.iconStroke === s.name
                    ? "border-primary bg-primary/5"
                    : "bg-card hover:border-primary/50"
                )}
              >
                <div className="flex items-center gap-3">
                  {[FreeIcons.Home01Icon, FreeIcons.Search01Icon, FreeIcons.Calendar01Icon].map(
                    (icon, i) => (
                      <HugeiconsIcon
                        key={i}
                        icon={icon as IconData}
                        strokeWidth={s.value}
                        className="size-6"
                      />
                    )
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {s.label}
                    {s.name === "regular" && (
                      <span className="ml-2 text-[10px] text-muted-foreground">DEFAULT</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{s.note}</p>
                </div>
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Selecting a weight here changes it product-wide — the same control lives in{" "}
            <strong className="text-foreground">Customize</strong>. Current weight:{" "}
            <code className="font-mono">{config.iconStroke}</code>.
          </p>
        </Section>

        <Separator />

        <Section
          title="Size"
          description="Icons inherit currentColor and scale with Tailwind size utilities. Keep optical weight consistent: pair small sizes with the bolder stroke if an icon reads too faint."
        >
          <div className="flex flex-wrap items-end gap-6 rounded-xl border bg-card p-6">
            {SIZES.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-2">
                <div className="flex h-10 items-end">
                  <HugeiconsIcon
                    icon={FreeIcons.Stethoscope02Icon as IconData}
                    className={s.className}
                  />
                </div>
                <div className="text-center">
                  <p className="font-mono text-[10px]">{s.label}</p>
                  <p className="text-[10px] text-muted-foreground">{s.note}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Separator />

        <Section
          title="Available styles"
          description="Hugeicons publishes nine styles. Only Stroke Rounded ships in the free package that this project installs."
        >
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Style</th>
                  <th className="px-4 py-2.5 text-left font-medium">Availability</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="px-4 py-2.5 font-medium">Stroke Rounded</td>
                  <td className="px-4 py-2.5">
                    <Badge variant="secondary">
                      <IconCheck /> Installed
                    </Badge>
                  </td>
                </tr>
                {[
                  "Stroke Sharp",
                  "Stroke Standard",
                  "Solid Rounded",
                  "Solid Sharp",
                  "Solid Standard",
                  "Duotone Rounded",
                  "Twotone Rounded",
                  "Bulk Rounded",
                ].map((style) => (
                  <tr key={style} className="border-t">
                    <td className="px-4 py-2.5 text-muted-foreground">{style}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline">Requires Hugeicons Pro</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground">
            The other eight styles live in <code className="font-mono">@hugeicons/core-pro-icons</code>,
            which is not published to public npm and needs a paid licence plus a private registry
            token. Once that licence exists, swapping is a package install and an import change —
            the component API is identical, so nothing else in this system has to move.
          </p>
        </Section>

        <Separator />

        <Section
          title="Design system set"
          description={`The ${ICON_CATALOG.length} icons wired into this product's components and pages. Import these from @/design-system/icons — they carry no strokeWidth prop, so they follow the global token.`}
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {ICON_CATALOG.map(({ name, source, Icon }) => (
              <Tooltip key={name}>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      onClick={() => copy(name)}
                      className="flex flex-col items-center gap-2 rounded-xl border bg-card px-2 py-4 transition-colors hover:border-primary hover:bg-surface-hover"
                    >
                      <Icon className="size-5" />
                      <span className="w-full truncate text-center text-[10px] text-muted-foreground">
                        {name.replace(/^Icon/, "")}
                      </span>
                    </button>
                  }
                />
                <TooltipContent>
                  {copied === name ? "Copied" : `${name} · ${source}`}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </Section>

        <Separator />

        <Section
          title="Full library"
          description={`All ${ALL_ICONS.length.toLocaleString()} free icons. Search by name, then click to copy the export name for use with HugeiconsIcon.`}
        >
          <div className="relative max-w-sm">
            <IconSearch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search icons — heart, calendar, lab…"
              className="pl-9"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <IconClose className="size-4" />
              </button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {matchCount.toLocaleString()} match{matchCount === 1 ? "" : "es"}
            {matchCount > RESULT_CAP && ` · showing first ${RESULT_CAP}`}
          </p>

          {results.length === 0 ? (
            <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
              No icons match “{query}”.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-8">
              {results.map(({ name, icon }) => (
                <Tooltip key={name}>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        onClick={() => copy(name)}
                        className="flex flex-col items-center gap-2 rounded-lg border bg-card px-1.5 py-3 transition-colors hover:border-primary hover:bg-surface-hover"
                      >
                        <HugeiconsIcon icon={icon} className="size-5" />
                        <span className="w-full truncate text-center text-[9px] text-muted-foreground">
                          {name.replace(/Icon$/, "")}
                        </span>
                      </button>
                    }
                  />
                  <TooltipContent>{copied === name ? "Copied" : name}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}
