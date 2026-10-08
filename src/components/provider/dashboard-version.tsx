"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { SUB_TAB, SUB_TABS_LIST } from "@/components/practice/directory"
import { Tabs, TabsList, TabsTrigger } from "@/design-system/ui/tabs"

/* Which patient chart dashboard the prototype shows. Version 1 is the
   widget dashboard; version 2 is the detailed charting dashboard from the
   7 Oct CareMap images and the 6 Oct call (widgets/charting-dashboard.tsx);
   version 3 is the same dashboard with the detail panel docked open on the
   top priority subject. The pick is kept per browser, and the switch sits
   in the top bar for now (EhrShell) while the versions are compared. */
export type DashboardVersion = "1" | "2" | "3"
const VERSION_KEY = "hol.chart.dashboardVersion.v2"

const listeners = new Set<() => void>()

function read(): DashboardVersion {
  try {
    const v = localStorage.getItem(VERSION_KEY)
    return v === "1" || v === "3" ? v : "2"
  } catch {
    return "2"
  }
}

export function useDashboardVersion() {
  const version = React.useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    read,
    () => "2" as const
  )
  const set = React.useCallback((v: DashboardVersion) => {
    try {
      localStorage.setItem(VERSION_KEY, v)
    } catch {}
    listeners.forEach((l) => l())
  }, [])
  return [version, set] as const
}

const VERSIONS: { id: DashboardVersion; label: string }[] = [
  { id: "1", label: "Version 1" },
  { id: "2", label: "Version 2" },
  { id: "3", label: "Version 3" },
]

/** The top bar's version switch, on a provider's patient chart only. */
export function DashboardVersionSwitch() {
  const pathname = usePathname()
  const [version, setVersion] = useDashboardVersion()
  if (!/^\/screens\/patients\/P\d+$/.test(pathname)) return null
  return (
    <Tabs
      value={version}
      onValueChange={(v) => setVersion(v as DashboardVersion)}
      className="max-md:hidden"
    >
      <TabsList className={cn(SUB_TABS_LIST, "h-8!")}>
        {VERSIONS.map((t) => (
          <TabsTrigger
            key={t.id}
            value={t.id}
            className={cn(SUB_TAB, "h-full! text-[13px]")}
          >
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
