"use client"

import * as React from "react"
import { IconFileUpload, IconUser, IconUserAdd } from "@/design-system/icons"

import {
  EhrShell,
  type NavItem,
  type ShellAccount,
  type ShellAction,
} from "@/components/ehr-shell"
import { INVITEES } from "@/components/auth/invitees"

const BASE = "/screens/provider"

/** The provider the invite flow introduces (see /screens/login?as=provider). */
export const PROVIDER_ID = "PR3132"

const PROVIDER_NAV: NavItem[] = [
  {
    id: "patients",
    label: "Patients",
    icon: IconUser,
    href: `${BASE}/patients`,
  },
]

const provider = INVITEES.provider

const PROVIDER_ACCOUNT: ShellAccount = {
  name: "Dr. Elise Harrington",
  email: provider.email,
  initials: "EH",
}

const PROVIDER_ACTIONS: ShellAction[] = [
  { label: "Add patient", href: `${BASE}/patients/new`, icon: IconUserAdd },
  {
    label: "Bulk add patients",
    href: `${BASE}/patients?import=1`,
    icon: IconFileUpload,
  },
]

/** The provider's portal: the same frame, scoped to their patients. */
export function ProviderShell({ children }: { children: React.ReactNode }) {
  return (
    <EhrShell
      active="patients"
      nav={PROVIDER_NAV}
      homeHref={`${BASE}/patients`}
      account={PROVIDER_ACCOUNT}
      actions={PROVIDER_ACTIONS}
    >
      {children}
    </EhrShell>
  )
}
