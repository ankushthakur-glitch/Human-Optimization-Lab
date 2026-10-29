"use client"

import * as React from "react"

import { patients, providers } from "@/components/practice/practice-data"
import { PROVIDER_ID } from "@/components/provider/provider-shell"
import { workItems } from "@/components/provider/home-v2/mock"
import { useClinicDay } from "@/components/provider/home-v2/overview"
import { openQueue, patientsInScope, typeCounts } from "@/components/provider/home-v2/selectors"
import { useNow, isoDay, useAppointments } from "@/components/provider/schedule/schedule-data"
import { NOW } from "@/components/provider/mock-clock"
import { ME, isOverdue, tasks } from "@/components/provider/tasks/tasks-data"
import { useOptimization } from "@/components/provider/dashboard-variants/optimization-data"

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

/* The four summary counts every variation leads with. Counts only: the
   rows behind them live in the schedule, the patient list and the tasks.

   Placeholders awaiting confirmation (see the note on each field):
   - upcoming: booked visits (Scheduled) from now through the next 7 days.
   - attention: patients with at least one open item in the review queue.
   - active: optimization members whose plan is Active.
   - tasks: the signed-in provider's tasks that are not Completed. */
export function useDashboardMetrics() {
  const { ready, open, urgent, now, byId, clinic } = useProviderDay()
  const opt = useOptimization()
  const appointments = useAppointments(now)
  const allTasks = tasks.use()

  return React.useMemo(() => {
    const today = now ? now.slice(0, 10) : ""
    const end = (() => {
      if (!now) return ""
      const d = new Date(`${today}T00:00:00`)
      d.setDate(d.getDate() + 7)
      return isoDay(d)
    })()
    const upcoming = now
      ? appointments.filter((a) => a.status === "Scheduled" && a.start > now && a.start.slice(0, 10) <= end)
      : []
    const mine = allTasks.items.filter((t) => t.assigneeId === ME && t.status !== "Completed")
    const needing = new Set(open.map((i) => i.patientId))
    const urgentPatients = new Set(urgent.map((i) => i.patientId))

    return {
      today,
      visitsToday: clinic.today,
      schedule: { day: clinic.day, title: clinic.title, now },
      /* The rows behind the counts, for a variation that lists them. */
      lists: { upcoming, attention: open, members: opt.active, tasks: mine, byId },
      ready: ready && opt.ready && allTasks.ready && !!now,
      upcoming: {
        count: upcoming.length,
        today: upcoming.filter((a) => a.start.startsWith(today)).length,
      },
      attention: { patients: needing.size, urgent: urgentPatients.size },
      active: { count: opt.active.length, members: opt.members.length },
      tasks: {
        open: mine.length,
        overdue: mine.filter(isOverdue).length,
        dueToday: mine.filter((t) => !isOverdue(t) && t.due.startsWith(NOW.slice(0, 10))).length,
      },
    }
  }, [ready, opt.ready, opt.active, opt.members.length, allTasks, appointments, now, open, urgent, byId, clinic.today, clinic.day, clinic.title])
}
