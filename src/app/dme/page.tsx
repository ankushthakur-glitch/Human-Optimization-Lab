import Link from "next/link"
import { IconGrid, IconImage, IconMenu, IconPalette } from "@/design-system/icons"

import { EXAMPLE_GROUPS } from "@/lib/examples"
import { DME_NAME } from "@/lib/dme-brand"
import { ComponentIcon } from "@/design-system/component-icon"

const ENTRY_POINTS = [
  { href: "/dme/foundations", icon: IconPalette, title: "Foundations" },
  { href: "/dme/icons", icon: IconImage, title: "Icons" },
  { href: "/dme/layouts", icon: IconMenu, title: "Layout" },
  { href: "/dme/customization", icon: IconPalette, title: "Customization" },
  { href: "/dme/components/button", icon: IconGrid, title: "Components" },
]

export default function Page() {
  return (
    <div>
      <header className="mb-8">
        <h1 className="font-heading text-4xl font-semibold tracking-tight">
          {DME_NAME} Design System
        </h1>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ENTRY_POINTS.map((e) => (
          <Link
            key={e.href}
            href={e.href}
            className="group flex items-center gap-2.5 rounded-xl border bg-card px-4 py-3 transition-colors hover:border-primary"
          >
            <e.icon className="size-5 shrink-0 text-primary-tint" />
            <span className="font-heading text-sm font-semibold">{e.title}</span>
          </Link>
        ))}
      </div>

      <section className="mt-12">
        <div className="flex flex-col gap-6">
          {EXAMPLE_GROUPS.map((group) => (
            <div key={group.name}>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-foreground/70 uppercase">
                {group.name}
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {group.items.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/dme/components/${item.slug}`}
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
