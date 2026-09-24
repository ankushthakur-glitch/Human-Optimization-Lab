"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { SUB_TAB, SUB_TABS_LIST } from "@/components/practice/directory"
import { providers, users } from "@/components/practice/practice-data"
import { PracticeShell } from "@/components/practice/practice-shell"
import { ProvidersPanel } from "@/components/practice/providers"
import { StaffPanel } from "@/components/practice/users"
import { Tabs, TabsList, TabsTrigger } from "@/design-system/ui/tabs"

export type UsersTab = "providers" | "staff"

const TABS: { id: UsersTab; label: string }[] = [
  { id: "providers", label: "Providers" },
  { id: "staff", label: "Non-clinical users" },
]

/**
 * Everyone who signs in to the practice, in one module: clinical providers
 * and non-clinical staff sit on two tabs of the same list frame. The tab
 * lives in the URL (?tab=staff) so a reload or a shared link keeps it.
 */
export function UsersScreen() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const tab: UsersTab = params.get("tab") === "staff" ? "staff" : "providers"
  const counts: Record<UsersTab, number> = {
    providers: providers.use().items.length,
    staff: users.use().items.length,
  }

  /* The worklist's segmented switch, holding the two user types. */
  const heading = (
    <Tabs
      value={tab}
      onValueChange={(next) =>
        router.replace(next === "staff" ? `${pathname}?tab=staff` : pathname)
      }
    >
      <TabsList className={SUB_TABS_LIST}>
        {TABS.map((t) => (
          <TabsTrigger key={t.id} value={t.id} className={SUB_TAB}>
            {t.label} ({counts[t.id]})
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )

  return (
    <PracticeShell active="users">
      {/* Keyed by tab so search, filters and paging start fresh on each. */}
      {tab === "providers" ? (
        <ProvidersPanel key="providers" heading={heading} />
      ) : (
        <StaffPanel key="staff" heading={heading} />
      )}
    </PracticeShell>
  )
}
