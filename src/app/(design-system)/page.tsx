import Link from "next/link"
import {
  IconChartBox,
  IconCompass,
  IconGrid,
  IconPalette,
} from "@/design-system/icons"

import { ALL_EXAMPLES, EXAMPLE_GROUPS } from "@/lib/examples"
import { ACCENT_THEMES, BASE_PALETTES } from "@/design-system/tokens/themes"
import { BODY_FONTS } from "@/design-system/tokens/fonts"
import { Badge } from "@/design-system/ui/badge"
import { ComponentIcon } from "@/design-system/component-icon"

const ENTRY_POINTS = [
  {
    href: "/foundations",
    icon: IconPalette,
    title: "Foundations",
    body: "Color tokens, typography scale, radius, spacing, and elevation — the primitives every component is built from.",
  },
  {
    href: "/patterns/navigation",
    icon: IconCompass,
    title: "Navigation patterns",
    body: "Every way a clinician moves through the product: shells, sidebars, tabs, breadcrumbs, command palette, and wizards.",
  },
  {
    href: "/patterns/data",
    icon: IconChartBox,
    title: "Data patterns",
    body: "How dense clinical data is segregated — tables, faceted filters, master-detail, grouping, and density modes.",
  },
  {
    href: "/components/button",
    icon: IconGrid,
    title: "Components",
    body: `All ${ALL_EXAMPLES.length} components with every variant, size, and state, in light and dark.`,
  },
]

export default function Page() {
  return (
    <div>
      <header className="mb-10">
        <Badge variant="secondary" className="mb-3">
          v1 · Base layer
        </Badge>
        <h1 className="font-heading text-4xl font-semibold tracking-tight">
          Clinic EHR Design System
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          A themeable base layer for a content-heavy clinical SaaS product. Built on shadcn
          (Base UI), it ships {ALL_EXAMPLES.length} components, {ACCENT_THEMES.length} accent
          themes, {BASE_PALETTES.length} neutral palettes, and {BODY_FONTS.length} typefaces —
          all switchable at runtime from the <strong className="text-foreground">Customize</strong>{" "}
          menu in the header.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {ENTRY_POINTS.map((e) => (
          <Link
            key={e.href}
            href={e.href}
            className="group flex flex-col gap-2 rounded-xl border bg-card p-5 transition-colors hover:border-primary"
          >
            <e.icon className="size-5 text-primary-tint" />
            <span className="font-heading font-semibold">{e.title}</span>
            <span className="text-sm text-muted-foreground">{e.body}</span>
          </Link>
        ))}
      </div>

      <section className="mt-14">
        <h2 className="font-heading text-xl font-semibold tracking-tight">Principles</h2>
        <dl className="mt-4 grid gap-5 sm:grid-cols-2">
          {[
            [
              "Tokens, never hex",
              "Every surface, border, and text color references a semantic token. That is what makes the whole product re-themeable in one click.",
            ],
            [
              "Density is a mode, not a rewrite",
              "Clinical users scan hundreds of rows. Comfortable and compact densities share one component — only spacing tokens change.",
            ],
            [
              "One family, many weights",
              "A single neutral sans across body and headings keeps long-form clinical documentation calm. Pair a display face only when hierarchy needs it.",
            ],
            [
              "State is always visible",
              "Loading, empty, and error states ship with every data pattern. A blank table is a bug, not a state.",
            ],
          ].map(([title, body]) => (
            <div key={title}>
              <dt className="text-sm font-semibold">{title}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-14">
        <h2 className="font-heading text-xl font-semibold tracking-tight">Component index</h2>
        <div className="mt-4 flex flex-col gap-6">
          {EXAMPLE_GROUPS.map((group) => (
            <div key={group.name}>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-foreground/70 uppercase">
                {group.name}
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {group.items.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/components/${item.slug}`}
                    title={item.description}
                    className="group flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 transition-colors hover:border-primary hover:bg-surface-hover"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-primary-surface group-hover:text-primary-tint">
                      <ComponentIcon slug={item.slug} className="size-4" />
                    </span>
                    <span className="min-w-0 truncate text-xs font-medium">{item.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
