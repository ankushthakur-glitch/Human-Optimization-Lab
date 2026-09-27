"use client"

import * as React from "react"
import {
  IconDashboard,
  IconHospital,
  IconSettings,
} from "@/design-system/icons"

import {
  EhrShell,
  type NavItem,
  type ShellAccount,
  type ShellAction,
} from "@/components/ehr-shell"

export type AdminModule = "dashboard" | "practices" | "settings"

const ADMIN_NAV: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: IconDashboard,
    href: "/screens/admin/dashboard",
  },
  {
    id: "practices",
    label: "Practices",
    icon: IconHospital,
    href: "/screens/admin/practices",
  },
  {
    id: "settings",
    label: "Settings",
    icon: IconSettings,
    href: "/screens/admin/settings",
  },
]

/* The platform admin the invite flow introduces (see /screens/login). */
const ADMIN_ACCOUNT: ShellAccount = {
  name: "Maya Chen",
  email: "maya.chen@humanoptimization.com",
  initials: "MC",
  avatar:
    "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&crop=faces&w=96&h=96&q=80",
}

const ADMIN_ACTIONS: ShellAction[] = [
  {
    label: "Add practice",
    href: "/screens/admin/practices?new=1",
    icon: IconHospital,
  },
]

/** The Super Admin console: the EHR frame with the platform's own modules. */
export function AdminShell({
  active,
  children,
}: {
  active: AdminModule
  children: React.ReactNode
}) {
  return (
    <EhrShell
      active={active}
      nav={ADMIN_NAV}
      homeHref="/screens/admin/practices"
      account={ADMIN_ACCOUNT}
      actions={ADMIN_ACTIONS}
    >
      {children}
    </EhrShell>
  )
}
