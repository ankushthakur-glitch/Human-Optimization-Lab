"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { SegmentedControl } from "@/components/dashboard-kit"

/* The patient chart's optimization dashboard exists in two builds so they
   can be compared side by side (see chart-dashboard.tsx). The choice lives
   in ?v=; version 1 is the default. */

export type DashboardVersion = "1" | "2"

export function dashboardVersion(params: URLSearchParams): DashboardVersion {
  return params.get("v") === "2" ? "2" : "1"
}

/** The segmented control that swaps the two versions in place. */
export function DashboardVersionSwitch() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const version = dashboardVersion(params)

  function pick(next: DashboardVersion) {
    if (next === version) return
    const query = new URLSearchParams(params)
    if (next === "2") query.set("v", "2")
    else query.delete("v")
    router.replace(query.size ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  return (
    <SegmentedControl
      label="Dashboard version"
      value={version}
      onChange={pick}
      options={[
        { value: "1", label: "Version 1" },
        { value: "2", label: "Version 2" },
      ]}
    />
  )
}
