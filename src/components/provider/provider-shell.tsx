"use client"

import * as React from "react"
import {
  IconBilling,
  IconCalendar,
  IconChartColumn,
  IconChat,
  IconDashboard,
  IconFileList,
  IconFileUpload,
  IconSettings,
  IconUser,
  IconUserAdd,
} from "@/design-system/icons"

import { REYES_ID } from "@/components/practice/practice-data"
import {
  EhrShell,
  type ModuleId,
  type NavItem,
  type ShellAction,
} from "@/components/ehr-shell"

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
  {
    id: "schedule",
    label: "Schedule",
    icon: IconCalendar,
    href: `${BASE}/schedule`,
  },
  { id: "tasks", label: "Tasks", icon: IconFileList, href: `${BASE}/tasks` },
  {
    id: "communication",
    label: "Communication",
    icon: IconChat,
    href: `${BASE}/communication`,
  },
  {
    id: "reports",
    label: "Reports",
    icon: IconChartColumn,
    href: `${BASE}/reports`,
  },
  {
    id: "billing",
    label: "Billing",
    icon: IconBilling,
    href: `${BASE}/billing`,
  },
  {
    id: "settings",
    label: "Settings",
    icon: IconSettings,
    href: `${BASE}/settings`,
  },
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
  return (
    <EhrShell
      active={active}
      nav={PROVIDER_NAV}
      actions={PROVIDER_ACTIONS}
    >
      {children}
    </EhrShell>
  )
}
