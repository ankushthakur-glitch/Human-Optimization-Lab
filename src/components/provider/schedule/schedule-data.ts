"use client"

import * as React from "react"

import {
  REYES_ID,
  type Patient,
  patients,
} from "@/components/practice/practice-data"
import { ms } from "@/components/provider/mock-clock"

/* The provider's schedule, read only: appointments are booked elsewhere
   (Epic, the front desk) and the portal only shows them. Unlike the rest of
   the portal it runs on the real clock, so today is today. Sample data:
   Dr. Reyes works Monday to Friday, 8 AM to 5 PM, with lunch at noon. Past
   visits are mostly completed; a few were missed or cancelled. */

export const APPOINTMENT_STATUSES = [
  "Scheduled",
  "Checked in",
  "Completed",
  "No show",
  "Cancelled",
] as const
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number]

export const APPOINTMENT_TYPES = [
  "New patient visit",
  "Baseline review",
  "Care plan review",
  "Lab results review",
  "Quarterly review",
  "Follow up",
] as const
export type AppointmentType = (typeof APPOINTMENT_TYPES)[number]

export const VISIT_MODES = ["In person", "Virtual"] as const
export type VisitMode = (typeof VISIT_MODES)[number]

export type Appointment = {
  id: string
  patientId: string
  /** Local "2026-10-05T09:30:00". */
  start: string
  minutes: number
  type: AppointmentType
  mode: VisitMode
  status: AppointmentStatus
  reason: string
  /** The clinic for an in person visit. */
  locationId: string
}

/* The working day the grid draws: 8 AM to 5 PM, lunch 12 to 12:30. */
export const DAY_START = 8
export const DAY_END = 17
export const LUNCH = { start: 12 * 60, end: 12 * 60 + 30 }

/** Days the provider sees patients: Monday (1) to Friday (5). */
export function isWorkingDay(date: Date) {
  const d = date.getDay()
  return d >= 1 && d <= 5
}

const REASONS: Record<AppointmentType, string[]> = {
  "New patient visit": [
    "Establish care, review history from Epic",
    "New member intake",
  ],
  "Baseline review": [
    "Review baseline panel results",
    "Baseline labs and body composition",
  ],
  "Care plan review": [
    "Walk through the proposed care plan",
    "Care plan changes requested by patient",
  ],
  "Lab results review": [
    "LDL and ApoB out of range",
    "HbA1c trending up",
    "Thyroid panel follow up",
  ],
  "Quarterly review": [
    "Quarterly progress on goals",
    "Quarterly review, sleep and HRV",
  ],
  "Follow up": [
    "Blood pressure check",
    "Medication change follow up",
    "ER visit follow up",
  ],
}

const DURATION: Record<AppointmentType, number[]> = {
  "New patient visit": [60],
  "Baseline review": [45, 60],
  "Care plan review": [45],
  "Lab results review": [30],
  "Quarterly review": [30, 45],
  "Follow up": [30],
}

/* The sample covers four weeks back and eight ahead of today. */
const WEEKS_BACK = 4
const WEEKS = 12

/** A stable pseudo random number from a string, so the sample never shifts. */
function hash(text: string) {
  let h = 2166136261
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0
  return h
}

const pad = (n: number) => String(n).padStart(2, "0")
export const isoDay = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function build(pool: Patient[], nowIso: string): Appointment[] {
  if (pool.length === 0) return []
  const out: Appointment[] = []
  const now = ms(nowIso)
  const today = new Date(`${nowIso.slice(0, 10)}T00:00:00`)
  const first = new Date(today)
  first.setDate(today.getDate() - ((today.getDay() + 6) % 7) - WEEKS_BACK * 7)
  for (let i = 0; i < WEEKS * 7; i++) {
    const date = new Date(first)
    date.setDate(first.getDate() + i)
    if (!isWorkingDay(date)) continue
    const day = isoDay(date)
    let at = DAY_START * 60
    let n = 0
    while (at < DAY_END * 60) {
      const h = hash(`${day}-${n}`)
      /* Now and then a slot stays open. */
      if (h % 5 === 0) at += 30
      if (at >= LUNCH.start && at < LUNCH.end) at = LUNCH.end
      const type = APPOINTMENT_TYPES[(h >>> 3) % APPOINTMENT_TYPES.length]
      const lengths = DURATION[type]
      const minutes = lengths[(h >>> 7) % lengths.length]
      /* Nothing runs into lunch or past close. */
      if (at < LUNCH.start && at + minutes > LUNCH.start) {
        at = LUNCH.end
        continue
      }
      if (at + minutes > DAY_END * 60) break
      const patient = pool[(h >>> 11) % pool.length]
      const start = `${day}T${pad(Math.floor(at / 60))}:${pad(at % 60)}:00`
      const end = ms(start) + minutes * 60_000
      const roll = (h >>> 15) % 20
      const status: AppointmentStatus =
        end <= now
          ? roll === 0
            ? "Cancelled"
            : roll === 1
              ? "No show"
              : "Completed"
          : ms(start) <= now
            ? "Checked in"
            : roll === 0
              ? "Cancelled"
              : "Scheduled"
      const reasons = REASONS[type]
      out.push({
        id: `AP${String(10000 + out.length)}`,
        patientId: patient.id,
        start,
        minutes,
        type,
        mode: (h >>> 19) % 3 === 0 ? "Virtual" : "In person",
        status,
        reason: reasons[(h >>> 21) % reasons.length],
        locationId: patient.locationId,
      })
      at += minutes
      n++
    }
  }
  return out
}

/** Dr. Reyes's patients first, then enough of the practice to fill a week. */
function poolOf(all: Patient[]) {
  const open = all.filter((p) => p.status !== "Inactive")
  const own = open.filter((p) => p.providerId === REYES_ID)
  const rest = open
    .filter((p) => p.providerId !== REYES_ID)
    .sort((a, b) => a.id.localeCompare(b.id))
  return [...own, ...rest].slice(0, 24)
}

/** The provider's appointments around `nowIso`, oldest first. */
export function useAppointments(nowIso: string | null) {
  const { items } = patients.use()
  return React.useMemo(
    () => (nowIso ? build(poolOf(items), nowIso) : []),
    [items, nowIso]
  )
}

/* The real clock, as a local "2026-10-19T14:05:00", moving each minute.
   The server has no viewer's clock, so it reads null until the page mounts. */
const localIso = (d: Date) =>
  `${isoDay(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`

let clockNow = typeof window === "undefined" ? "" : localIso(new Date())
function subscribeClock(onChange: () => void) {
  const id = window.setInterval(() => {
    const next = localIso(new Date())
    if (next !== clockNow) {
      clockNow = next
      onChange()
    }
  }, 15_000)
  return () => window.clearInterval(id)
}

export function useNow() {
  return React.useSyncExternalStore(
    subscribeClock,
    () => clockNow || (clockNow = localIso(new Date())),
    () => null
  )
}

/** Minutes after midnight. */
export function minuteOf(iso: string) {
  return Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16))
}

export function endOf(a: Appointment) {
  const m = minuteOf(a.start) + a.minutes
  return `${a.start.slice(0, 11)}${pad(Math.floor(m / 60))}:${pad(m % 60)}:00`
}
