"use client"

import * as React from "react"

import {
  type Location,
  type Patient,
  type PatientStatus,
  type Provider,
  type StaffUser,
  PATIENT_STATUSES,
  locations,
  patients,
  providers,
  remindersSent,
  users,
} from "@/components/practice/practice-data"
import { duplicateReviews } from "@/components/practice/patient-duplicates"
import {
  ALERTS,
  ENCOUNTERS,
  ENROLLMENT,
  OUTCOMES,
  VALUE,
} from "@/components/practice/practice-reports-data"
import { employers } from "@/components/settings/settings-data"
import {
  type Counts,
  type Period,
  type Report,
  periodsFor,
  totalFor,
} from "@/components/provider/reports/reports-data"

/* What the five clinic manager dashboard variations read. Two sources:
   the live practice lists (providers, staff, patients, locations, the
   duplicate queue, employer accounts), so a dashboard row matches the
   Users, Patients and Locations pages, and the practice reports' totals,
   so a dashboard number matches its report. The clinic manager is
   non-clinical: aggregates and admin work only, never medical data. */

export const PRACTICE_BASE = "/screens/practice"
export const HREF = {
  users: `${PRACTICE_BASE}/users`,
  staff: `${PRACTICE_BASE}/users?tab=staff`,
  provider: (id: string) => `${PRACTICE_BASE}/users/providers/${id}`,
  newProvider: `${PRACTICE_BASE}/users/providers/new`,
  patients: `${PRACTICE_BASE}/patients`,
  patient: (id: string) => `${PRACTICE_BASE}/patients/${id}`,
  newPatient: `${PRACTICE_BASE}/patients/new`,
  duplicates: `${PRACTICE_BASE}/patients/duplicates`,
  duplicate: (id: string) => `${PRACTICE_BASE}/patients/duplicates/${id}`,
  locations: `${PRACTICE_BASE}/locations`,
  location: (id: string) => `${PRACTICE_BASE}/locations/${id}`,
  reports: `${PRACTICE_BASE}/reports`,
  report: (r: Report) => `${PRACTICE_BASE}/reports?report=${r.id}`,
  settings: `${PRACTICE_BASE}/settings`,
}

const DAY = 86_400_000

/** Local "2026-10-25" for today. */
export function todayIso() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Whole days from an ISO day (or date time) to today; 0 for none. */
export function daysAgo(iso: string | undefined, today = todayIso()) {
  if (!iso) return 0
  return Math.max(0, Math.round((Date.parse(`${today}T12:00:00`) - Date.parse(`${iso.slice(0, 10)}T12:00:00`)) / DAY))
}

/** Whole days from today to an ISO day; negative once it has passed. */
export function daysUntil(iso: string, today = todayIso()) {
  return Math.round((Date.parse(`${iso.slice(0, 10)}T12:00:00`) - Date.parse(`${today}T12:00:00`)) / DAY)
}

export const pct = (num: number, den: number) => (den ? Math.round((num / den) * 100) : 0)

/** How recently an active patient used the app. */
export type Engagement = "This week" | "This month" | "Quiet 30+ days"
export function engagementOf(p: Patient, today = todayIso()): Engagement {
  const d = daysAgo(p.lastEngagedAt, today)
  return d <= 7 ? "This week" : d <= 30 ? "This month" : "Quiet 30+ days"
}

export type ProviderRow = {
  provider: Provider
  patients: Patient[]
  active: number
  invited: number
  declined: number
  /** Active out of everyone invited who answered or is waiting. */
  enrollRate: number
  quiet: number
}

export type LocationRow = {
  location: Location
  providers: Provider[]
  staff: StaffUser[]
  patients: Patient[]
  active: number
  invited: number
  enrollRate: number
}

/** A licence that runs out within 90 days, or already has. */
export type ExpiringLicense = {
  provider: Provider
  type: string
  state: string
  expiry: string
  days: number
}

/** Patients added per week for the last `weeks` weeks, oldest first. */
export type WeekCount = { start: string; label: string; added: number; active: number }

const SHORT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })
export const shortDay = (iso: string) => SHORT.format(new Date(`${iso.slice(0, 10)}T12:00:00`))

export function usePracticeOps() {
  const { items: provs, ready: r1 } = providers.use()
  const { items: staff, ready: r2 } = users.use()
  const { items: pats, ready: r3 } = patients.use()
  const { items: locs, ready: r4 } = locations.use()
  const { items: dups, ready: r5 } = duplicateReviews.use()
  const { items: emps, ready: r6 } = employers.use()
  const ready = r1 && r2 && r3 && r4 && r5 && r6

  return React.useMemo(() => {
    const today = todayIso()
    const activeProviders = provs.filter((p) => p.status === "Active")
    const invitedProviders = provs.filter((p) => p.status === "Invited")
    const departed = provs.filter((p) => p.status === "Inactive")
    const activeLocations = locs.filter((l) => l.status === "Active")

    const byStatus = Object.fromEntries(
      PATIENT_STATUSES.map((s) => [s, pats.filter((p) => p.status === s)])
    ) as Record<PatientStatus, Patient[]>

    const engagement: Record<Engagement, Patient[]> = {
      "This week": [],
      "This month": [],
      "Quiet 30+ days": [],
    }
    for (const p of byStatus.Active) engagement[engagementOf(p, today)].push(p)

    /* Invites still out: the final reminder (day 30, carries the decline
       link) is the last nudge, so the ones closest to it come first. */
    const pendingInvites = [...byStatus.Invited].sort((a, b) => a.invitedAt.localeCompare(b.invitedAt))
    const nearFinal = pendingInvites.filter((p) => daysAgo(p.invitedAt, today) >= 21)

    const providerRows: ProviderRow[] = activeProviders.map((provider) => {
      const mine = pats.filter((p) => p.providerId === provider.id)
      const active = mine.filter((p) => p.status === "Active").length
      const invited = mine.filter((p) => p.status === "Invited").length
      const declined = mine.filter((p) => p.status === "Declined").length
      return {
        provider,
        patients: mine,
        active,
        invited,
        declined,
        enrollRate: pct(active, active + invited + declined),
        quiet: mine.filter((p) => p.status === "Active" && engagementOf(p, today) === "Quiet 30+ days").length,
      }
    })

    const locationRows: LocationRow[] = locs.map((location) => {
      const here = pats.filter((p) => p.locationId === location.id)
      const active = here.filter((p) => p.status === "Active").length
      const invited = here.filter((p) => p.status === "Invited").length
      const declined = here.filter((p) => p.status === "Declined").length
      return {
        location,
        providers: activeProviders.filter((p) => p.locationIds.includes(location.id)),
        staff: staff.filter((s) => s.status !== "Inactive" && s.locationIds.includes(location.id)),
        patients: here,
        active,
        invited,
        enrollRate: pct(active, active + invited + declined),
      }
    })

    const expiringLicenses: ExpiringLicense[] = provs
      .filter((p) => p.status !== "Inactive")
      .flatMap((provider) =>
        provider.licenses
          .filter((l) => l.expiry)
          .map((l) => ({ provider, type: l.type, state: l.state, expiry: l.expiry, days: daysUntil(l.expiry, today) }))
      )
      .filter((l) => l.days <= 90)
      .sort((a, b) => a.days - b.days)

    const weeks = 12
    const weekly: WeekCount[] = Array.from({ length: weeks }, (_, i) => {
      const end = Date.parse(`${today}T12:00:00`) - (weeks - 1 - i) * 7 * DAY
      const start = new Date(end - 6 * DAY).toISOString().slice(0, 10)
      const endIso = new Date(end).toISOString().slice(0, 10)
      const added = pats.filter((p) => p.registrationDate >= start && p.registrationDate <= endIso)
      return { start, label: shortDay(start), added: added.length, active: added.filter((p) => p.status === "Active").length }
    })

    const bySource = {
      Manual: pats.filter((p) => p.source === "Manual").length,
      "Bulk import": pats.filter((p) => p.source === "Bulk import").length,
    }

    const employerRows = emps.map((e) => {
      const theirs = pats.filter((p) => p.employerId === e.id)
      return { employer: e, patients: theirs.length, active: theirs.filter((p) => p.status === "Active").length }
    })
    const selfSignup = pats.filter((p) => !p.employerId).length

    return {
      ready,
      today,
      providers: provs,
      activeProviders,
      invitedProviders,
      departed,
      staff,
      invitedStaff: staff.filter((s) => s.status === "Invited"),
      patients: pats,
      byStatus,
      engagement,
      pendingInvites,
      nearFinal,
      remindersSent,
      locations: locs,
      activeLocations,
      duplicates: [...dups].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)),
      providerRows,
      locationRows,
      expiringLicenses,
      weekly,
      bySource,
      employerRows,
      selfSignup,
    }
  }, [provs, staff, pats, locs, dups, emps, ready])
}

export type PracticeOps = ReturnType<typeof usePracticeOps>

export type PeriodKind = "Month" | "Quarter" | "Year"

/** How many periods a trend shows for each kind. */
export const SPAN: Record<PeriodKind, number> = { Month: 6, Quarter: 4, Year: 3 }

/** The practice reports' totals for a period kind, over the active
    providers at a location ("" for all), with the period before and a
    trend of the last few periods, oldest first. */
export function useReportTotals(kind: PeriodKind, locationId = "") {
  const { items: provs } = providers.use()
  return React.useMemo(() => {
    const ids = provs
      .filter((p) => p.status === "Active" && (!locationId || p.locationIds.includes(locationId)))
      .map((p) => p.id)
    const periods = periodsFor(kind)
    const [now, before] = periods
    const at = (report: Report, period: Period = now) => totalFor(report, ids, period)
    const pick = (period: Period) => ({
      period,
      enroll: at(ENROLLMENT, period),
      enc: at(ENCOUNTERS, period),
      alerts: at(ALERTS, period),
      value: at(VALUE, period),
      outcomes: at(OUTCOMES, period),
    })
    return {
      providerIds: ids,
      now: pick(now),
      before: pick(before),
      trend: periods.slice(0, SPAN[kind]).reverse().map(pick),
      /** One provider's counts for a report in the current period. */
      forProvider: (report: Report, providerId: string, period: Period = now): Counts =>
        totalFor(report, [providerId], period),
    }
  }, [provs, kind, locationId])
}

export type ReportTotals = ReturnType<typeof useReportTotals>
