"use client"

import * as React from "react"
import {
  IconChat,
  IconDashboard,
  IconFileList,
  IconFileUpload,
  IconSettings,
  IconUser,
  IconUserAdd,
} from "@/design-system/icons"

import {
  REYES_ID,
  fullName,
  patients,
} from "@/components/practice/practice-data"
import {
  EhrShell,
  type ModuleId,
  type NavItem,
  type ShellAction,
  type ShellNotification,
} from "@/components/ehr-shell"
import { useCarePlansToReview } from "@/components/provider/chart-care-plan"
import { atLabel } from "@/components/provider/chart-epic"

const BASE = "/screens/patients"

/** The signed-in provider, Dr. Daniel Reyes (the header's chip). */
export const PROVIDER_ID = REYES_ID

/* The EHR's module list with the provider's Dashboard wired to its page. */
const PROVIDER_NAV: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: IconDashboard,
    href: `${BASE}/dashboard`,
  },
  { id: "patients", label: "Patients", icon: IconUser, href: BASE },
  { id: "tasks", label: "Tasks", icon: IconFileList, href: `${BASE}/tasks` },
  {
    id: "communication",
    label: "Communication",
    icon: IconChat,
    href: `${BASE}/communication`,
  },
  { id: "settings", label: "Settings", icon: IconSettings },
]

const PROVIDER_ACTIONS: ShellAction[] = [
  { label: "Add patient", href: `${BASE}/new`, icon: IconUserAdd },
  {
    label: "Bulk add patients",
    href: `${BASE}?import=1`,
    icon: IconFileUpload,
  },
]

/** The provider's portal: the EHR frame with its full navigation. */
export function ProviderShell({
  active = "patients",
  children,
}: {
  active?: ModuleId
  children: React.ReactNode
}) {
  const toReview = useCarePlansToReview()
  const { items } = patients.use()
  /* Care plans waiting on the physician, each opening its review. */
  const notifications: ShellNotification[] = toReview.map((r) => {
    const p = items.find((x) => x.id === r.patientId)
    const name = p ? fullName(p) : r.patientId
    return {
      id: `care-plan-${r.patientId}`,
      title:
        r.status === "Changes requested"
          ? `${name} asked for care plan changes`
          : `${name} sent a care plan for review`,
      meta: atLabel(r.event.at),
      href: `${BASE}/${r.patientId}?section=care-plan`,
    }
  })
  return (
    <EhrShell
      active={active}
      nav={PROVIDER_NAV}
      actions={PROVIDER_ACTIONS}
      notifications={notifications}
    >
      {children}
    </EhrShell>
  )
}
