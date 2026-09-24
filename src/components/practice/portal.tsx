"use client"

import * as React from "react"

import { PracticeShell } from "@/components/practice/practice-shell"
import { PROVIDER_ID, ProviderShell } from "@/components/provider/provider-shell"

/* The patient screens serve two portals: the clinic manager's
   (/screens/practice) and a provider's (/screens/provider). Each portal's
   layout names itself; the screens read it for their frame and links. */

export type PortalKey = "practice" | "provider"

const PortalContext = React.createContext<PortalKey>("practice")

export function PortalProvider({
  portal,
  children,
}: {
  portal: PortalKey
  children: React.ReactNode
}) {
  return <PortalContext value={portal}>{children}</PortalContext>
}

export function usePortal() {
  const key = React.useContext(PortalContext)
  const list = `/screens/${key}/patients`
  return {
    key,
    patientsHref: list,
    newPatientHref: `${list}/new`,
    patientHref: (id: string) => `${list}/${id}`,
    /** The signed-in provider, who new patients default to. */
    selfProviderId: key === "provider" ? PROVIDER_ID : undefined,
  }
}

/** The portal's frame around a patient screen. */
export function PatientsFrame({ children }: { children: React.ReactNode }) {
  const key = React.useContext(PortalContext)
  return key === "provider" ? (
    <ProviderShell>{children}</ProviderShell>
  ) : (
    <PracticeShell active="patients">{children}</PracticeShell>
  )
}
