"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { SegmentedControl } from "@/components/dashboard-kit-v2"

/* The provider home's two builds: Version 1, the work queue, and Version 2,
   the patient chart dashboard's pattern (decision band, grouped updates,
   trend rows, a docked sidebar). The choice lives in the URL as ?v=2. */

export type HomeVersion = "1" | "2"

export function useHomeVersion(): HomeVersion {
  return useSearchParams().get("v") === "2" ? "2" : "1"
}

export function VersionSwitch() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const version = useHomeVersion()
  return (
    <SegmentedControl
      label="Dashboard version"
      value={version}
      items={[
        { value: "1", label: "Version 1" },
        { value: "2", label: "Version 2" },
      ]}
      onChange={(v) => {
        /* Each version keeps its own filters, so switching starts clean. */
        const next = new URLSearchParams(params)
        next.delete("tab")
        if (v === "2") next.set("v", "2")
        else next.delete("v")
        router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false })
      }}
    />
  )
}
