"use client"

import * as React from "react"
import {
  IconBilling,
  IconChartColumn,
  IconDashboard,
  IconLocation,
  IconSettings,
  IconStethoscope,
  IconUser,
  IconUserAdd,
  IconUsersGroup,
} from "@/design-system/icons"

import {
  EhrShell,
  type NavItem,
  type ShellAccount,
  type ShellAction,
} from "@/components/ehr-shell"
import { PRACTICE } from "@/components/practice/practice-data"

export type PracticeModule =
  | "dashboard"
  | "users"
  | "patients"
  | "locations"
  | "reports"
  | "billing"
  | "settings"

const BASE = "/screens/practice"

const PRACTICE_NAV: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: IconDashboard,
    href: `${BASE}/dashboard`,
  },
  { id: "users", label: "Users", icon: IconUsersGroup, href: `${BASE}/users` },
  {
    id: "patients",
    label: "Patients",
    icon: IconUser,
    href: `${BASE}/patients`,
  },
  {
    id: "locations",
    label: "Locations",
    icon: IconLocation,
    href: `${BASE}/locations`,
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

/* The clinic manager the invite flow introduces (see /screens/login?as=clinic-manager). */
const MANAGER_ACCOUNT: ShellAccount = {
  name: PRACTICE.manager.name,
  email: PRACTICE.manager.email,
  initials: PRACTICE.manager.initials,
  avatar: PRACTICE.manager.photo,
}

const MANAGER_ACTIONS: ShellAction[] = [
  {
    label: "Add provider",
    href: `${BASE}/users/providers/new`,
    icon: IconStethoscope,
  },
  {
    label: "Add user",
    href: `${BASE}/users?tab=staff&new=1`,
    icon: IconUserAdd,
  },
  { label: "Add patient", href: `${BASE}/patients/new`, icon: IconUser },
  {
    label: "Add location",
    href: `${BASE}/locations/new`,
    icon: IconLocation,
  },
]

/** The clinic manager's portal: the same frame, scoped to one practice. */
export function PracticeShell({
  active,
  children,
}: {
  active: PracticeModule
  children: React.ReactNode
}) {
  return (
    <EhrShell
      active={active}
      nav={PRACTICE_NAV}
      homeHref={`${BASE}/dashboard`}
      profileHref={`${BASE}/profile`}
      account={MANAGER_ACCOUNT}
      actions={MANAGER_ACTIONS}
    >
      {children}
    </EhrShell>
  )
}
