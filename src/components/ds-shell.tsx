"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { IconMenu, IconMoon, IconSun } from "@/design-system/icons"
import { useTheme } from "next-themes"

import { EXAMPLE_GROUPS } from "@/lib/examples"
import { cn } from "@/lib/utils"
import { ThemeCustomizer } from "@/design-system/theme-customizer"
import { Button } from "@/design-system/ui/button"
import { ComponentIcon } from "@/design-system/component-icon"
import { BRAND_NAME } from "@/lib/brand"

const OVERVIEW_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/foundations", label: "Foundations" },
  { href: "/icons", label: "Icons" },
  { href: "/patterns/navigation", label: "Navigation patterns" },
  { href: "/patterns/data", label: "Data patterns" },
  { href: "/layouts", label: "Screen assembler" },
]

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {mounted && resolvedTheme === "dark" ? <IconSun /> : <IconMoon />}
    </Button>
  )
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        {OVERVIEW_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "rounded-md px-2 py-1.5 text-sm transition-colors",
              pathname === link.href
                ? "bg-surface-selected selected-marker font-medium text-foreground"
                : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
            )}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {EXAMPLE_GROUPS.map((group) => (
        <div key={group.name} className="flex flex-col gap-1">
          <span className="px-2 pb-1 text-xs font-semibold tracking-wide text-foreground/70 uppercase">
            {group.name}
          </span>
          {group.items.map((item) => {
            const href = `/components/${item.slug}`
            const active = pathname === href
            return (
              <Link
                key={item.slug}
                href={href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-surface-selected selected-marker font-medium text-foreground"
                    : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                )}
              >
                <ComponentIcon
                  slug={item.slug}
                  className={cn("size-4 shrink-0", active ? "text-primary-tint" : "opacity-70")}
                />
                <span className="min-w-0 truncate">{item.title}</span>
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

export function DsShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md">
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          aria-label="Toggle navigation"
          onClick={() => setOpen((v) => !v)}
        >
          <IconMenu />
        </Button>
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-heading text-sm font-semibold tracking-tight">{BRAND_NAME}</span>
          <span className="text-sm text-muted-foreground">Design System</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <ThemeCustomizer />
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside
          className={cn(
            "w-64 shrink-0 overflow-y-auto border-r p-4",
            "sticky top-14 h-[calc(100svh-3.5rem)]",
            "lg:block",
            open ? "fixed inset-x-0 top-14 bottom-0 z-40 block w-full bg-background lg:relative lg:inset-auto lg:w-64" : "hidden"
          )}
        >
          <NavLinks onNavigate={() => setOpen(false)} />
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-6xl px-6 py-10 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
