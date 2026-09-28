"use client"

import * as React from "react"
import { IconFileUpload, IconUserAdd } from "@/design-system/icons"

import { EhrShell, type ShellAction } from "@/components/ehr-shell"

const BASE = "/screens/patients"

/** The provider the invite flow introduces (see /screens/login?as=provider). */
export const PROVIDER_ID = "PR3132"

const PROVIDER_ACTIONS: ShellAction[] = [
  { label: "Add patient", href: `${BASE}/new`, icon: IconUserAdd },
  {
    label: "Bulk add patients",
    href: `${BASE}?import=1`,
    icon: IconFileUpload,
  },
]

/** The provider's portal: the EHR frame with its full navigation. */
export function ProviderShell({ children }: { children: React.ReactNode }) {
  return (
    <EhrShell active="patients" actions={PROVIDER_ACTIONS}>
      {children}
    </EhrShell>
  )
}
