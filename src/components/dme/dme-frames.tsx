"use client"

import * as React from "react"
import Link from "next/link"
import {
  IconActivity,
  IconBilling,
  IconCalendar,
  IconChart,
  IconChat,
  IconChevronDown,
  IconDashboard,
  IconNotification,
  IconSearch,
  IconSettings,
  IconTaskAdd,
  IconUser,
} from "@/design-system/icons"

import { cn } from "@/lib/utils"
import { Button } from "@/design-system/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/design-system/ui/dropdown-menu"
import { Kbd } from "@/design-system/ui/kbd"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/design-system/ui/tooltip"
import { DmeLogo } from "@/components/dme/dme-logo"

type DmeNavItem = {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  menu?: string[]
}

const NAV: DmeNavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: IconDashboard },
  { id: "schedule", label: "Scheduling", icon: IconCalendar },
  { id: "patients", label: "Patients", icon: IconUser },
  { id: "billing", label: "Billing", icon: IconBilling, menu: ["Claims", "Payments", "Invoices"] },
  { id: "tasks", label: "Tasks", icon: IconTaskAdd },
  { id: "communication", label: "Communication", icon: IconChat },
  { id: "reports", label: "Reports", icon: IconChart, menu: ["Clinical", "Financial", "Operational"] },
  { id: "settings", label: "Settings", icon: IconSettings },
  { id: "activity", label: "Activity Log", icon: IconActivity },
]

const ACCOUNT = { name: "Dr. Maria Reyes", initials: "MR" }

function Bell({ className }: { className?: string }) {
  return (
    <Button variant="ghost" size="icon-sm" aria-label="Notifications" className={cn("relative", className)}>
      <IconNotification />
      <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-destructive" />
    </Button>
  )
}

/* ------------------------------------------------------ layout 1: side -- */

export function DmeSideFrame({ active, children }: { active: string; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false)

  return (
    <div className="flex h-svh min-h-0 bg-muted/30">
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r bg-card text-sidebar-foreground transition-[width] duration-200 sm:flex",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <Link
          href="/dme-screens/side-nav"
          className={cn(
            "flex h-14 shrink-0 items-center border-b",
            collapsed ? "justify-center" : "px-4"
          )}
        >
          <DmeLogo compact={collapsed} />
        </Link>
        <nav className={cn("flex flex-col gap-1 p-3", collapsed && "items-center")}>
          {NAV.map((item) => {
            const isActive = item.id === active
            const row = (
              <button
                type="button"
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg text-sm transition-colors",
                  collapsed ? "size-10 justify-center" : "w-full px-3 py-2.5",
                  isActive
                    ? "bg-primary font-medium text-primary-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="size-5 shrink-0" />
                {!collapsed && <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>}
              </button>
            )
            if (!collapsed) return <React.Fragment key={item.id}>{row}</React.Fragment>
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger render={row} />
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            )
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative flex h-14 shrink-0 items-center gap-3 border-b bg-card px-3 sm:px-4">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            onClick={() => setCollapsed((v) => !v)}
          >
            <svg viewBox="0 0 24 24" fill="none" className="size-4" aria-hidden>
              <path d="M4 6h16M4 12h10M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </Button>
          <div className="pointer-events-none absolute inset-x-0 hidden justify-center px-4 md:flex">
            <Button
              type="button"
              variant="outline"
              aria-label="Open global search"
              className="pointer-events-auto h-8 w-full max-w-md justify-start gap-2 rounded-md border-input bg-input/30 px-2.5 font-normal text-muted-foreground hover:bg-input/50 hover:text-muted-foreground dark:bg-input/30"
            >
              <IconSearch />
              <span className="flex-1 truncate text-left">Search Lakeside Sleep Center</span>
              <Kbd>⌘K</Kbd>
            </Button>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Bell />
            <Button variant="ghost" size="sm" className="gap-2 px-1.5">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary-surface text-[11px] font-semibold text-primary-tint">
                {ACCOUNT.initials}
              </span>
              <span className="hidden text-xs font-medium sm:block">{ACCOUNT.name}</span>
            </Button>
          </div>
        </header>
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">{children}</main>
      </div>
    </div>
  )
}

/* ------------------------------------------------------- layout 2: top -- */

const TOP_ITEM =
  "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors"

export function DmeTopFrame({ active, children }: { active: string; children: React.ReactNode }) {
  return (
    <div className="flex h-svh min-h-0 flex-col bg-muted/30">
      <header className="flex h-14 shrink-0 items-center gap-4 bg-primary px-4 text-primary-foreground">
        <Link href="/dme-screens/top-nav" className="shrink-0">
          <DmeLogo inverse />
        </Link>

        <nav className="flex min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto">
          {NAV.map((item) => {
            const isActive = item.id === active
            const className = cn(
              TOP_ITEM,
              isActive
                ? "bg-primary-foreground/10 ring-2 ring-primary-foreground ring-inset"
                : "hover:bg-primary-foreground/10"
            )
            if (!item.menu) {
              return (
                <button key={item.id} type="button" aria-current={isActive ? "page" : undefined} className={className}>
                  {item.label}
                </button>
              )
            }
            return (
              <DropdownMenu key={item.id}>
                <DropdownMenuTrigger
                  render={
                    <button type="button" className={className}>
                      {item.label}
                      <IconChevronDown className="size-3.5 opacity-80" />
                    </button>
                  }
                />
                <DropdownMenuContent align="start" className="w-44">
                  {item.menu.map((entry) => (
                    <DropdownMenuItem key={entry}>{entry}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Search"
            className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <IconSearch />
          </Button>
          <Bell className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" />
          <button
            type="button"
            className="ml-1 flex items-center gap-2 rounded-full py-1 pr-2 pl-1 text-sm font-medium transition-colors hover:bg-primary-foreground/10"
          >
            <span className="flex size-7 items-center justify-center rounded-full border-2 border-primary-foreground text-[11px] font-semibold">
              {ACCOUNT.initials}
            </span>
            {ACCOUNT.name}
            <IconChevronDown className="size-3.5 opacity-80" />
          </button>
        </div>
      </header>
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">{children}</main>
    </div>
  )
}
