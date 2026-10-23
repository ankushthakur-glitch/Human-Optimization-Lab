"use client"

import * as React from "react"

import { patients, providers } from "@/components/practice/practice-data"
import { PROVIDER_ID } from "@/components/provider/provider-shell"
import { workItems } from "@/components/provider/home-v2/mock"
import { useClinicDay } from "@/components/provider/home-v2/overview"
import { openQueue, patientsInScope, typeCounts } from "@/components/provider/home-v2/selectors"
import { useNow } from "@/components/provider/schedule/schedule-data"

/* What every variation reads, from the same stores the live dashboard
   reads: the signed-in provider's patients, their open work, the clinic
   day on the real clock, and the provider's own record. */
export function useProviderDay() {
  const roster = patients.use()
  const work = workItems.use()
  const staff = providers.use()
  const ready = roster.ready && work.ready

  const byId = React.useMemo(() => new Map(roster.items.map((p) => [p.id, p])), [roster.items])
  const mine = React.useMemo(() => patientsInScope(roster.items, "mine", PROVIDER_ID), [roster.items])
  const open = React.useMemo(() => openQueue(work.items, mine), [work.items, mine])
  const counts = React.useMemo(() => typeCounts(open), [open])
  const urgent = React.useMemo(
    () => open.filter((i) => i.priority === "urgent").sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [open]
  )
  const now = useNow()
  const clinic = useClinicDay(now)
  const me = staff.items.find((s) => s.id === PROVIDER_ID)

  return { ready, byId, mine, open, counts, urgent, now, clinic, me, work: work.items }
}
