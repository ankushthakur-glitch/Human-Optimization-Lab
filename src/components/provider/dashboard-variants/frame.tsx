"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { FOCUS } from "@/components/dashboard-kit-v2"
import { ProviderShell } from "@/components/provider/provider-shell"

/* Six dashboard variations for review, each after one ReUI template, in
   the provider's frame. The strip on top walks between them and the live
   dashboard; it goes once a variation is picked. */

const BASE = "/screens/patients/dashboard"

export const VARIANTS = [
  { href: BASE, label: "Current" },
  { href: `${BASE}/v1`, label: "1 Queue" },
  { href: `${BASE}/v2`, label: "2 Activity" },
  { href: `${BASE}/v3`, label: "3 Practice" },
  { href: `${BASE}/v4`, label: "4 Clinic day" },
  { href: `${BASE}/v5`, label: "5 Panel" },
  { href: `${BASE}/v6`, label: "6 Briefing" },
] as const

export function VariantSwitch({ className }: { className?: string }) {
  const path = usePathname()
  return (
    <nav aria-label="Dashboard variations" className={cn("flex items-center gap-2 overflow-x-auto no-scrollbar", className)}>
      <span className="shrink-0 text-xs text-muted-foreground">Variation</span>
      <div className="flex shrink-0 gap-0.5 rounded-full border border-border bg-card p-0.5">
        {VARIANTS.map((v) => {
          const active = path === v.href
          return (
            <Link
              key={v.href}
              href={v.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-1 text-[13px] font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
                active && "bg-primary text-primary-foreground hover:text-primary-foreground",
                FOCUS
              )}
            >
              {v.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

/** The provider's frame with the variation strip over a scrolling canvas. */
export function VariantFrame({
  children,
  canvas = "bg-surface-sunken",
  padded = true,
}: {
  children: React.ReactNode
  /** The page's background class. */
  canvas?: string
  /** False when the variation lays out its own full height panes. */
  padded?: boolean
}) {
  return (
    <ProviderShell active="dashboard">
      <div className={cn("no-scrollbar flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto", canvas)}>
        <div className="border-b border-border bg-card px-6 py-2">
          <VariantSwitch />
        </div>
        {padded ? <div className="flex w-full min-w-0 flex-col gap-5 px-6 pt-5 pb-8">{children}</div> : children}
      </div>
    </ProviderShell>
  )
}
