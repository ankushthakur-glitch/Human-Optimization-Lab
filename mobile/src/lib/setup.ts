import { router } from "expo-router"

import { addDays, clock, dayLabel } from "@/lib/member"
import { useOnboarding, type Booking } from "@/lib/onboarding"
import { BASELINE, SETUP, TOUR, type SetupStep } from "@/lib/program"
import { localIso } from "@/lib/todo"

/* The paid setup after joining (FINAL-SPEC C.27, catalog M-72 to M-74):
   questionnaire, medicines, a device, the starting tests and a short tour,
   in that order. Each step says where it is in the count ("Step 2 of 5"),
   saves what it collected and opens the next one over itself, so the
   swipe goes back a step. The last step hands the plan to the doctor as a
   draft and lands on the Plan tab, with the setup cleared from history. */

type Snapshot = Parameters<ReturnType<typeof useOnboarding>["save"]>[0]
type Patch = Snapshot

/** "Step 2 of 5" */
export const stepLabel = (step: number, steps: number = SETUP.length) => `Step ${step} of ${steps}`

/** The draft's version: 1 for a first plan, and after a cancel and a
    rejoin the next number after every version she kept (version 3 after
    versions 1 and 2, C.15), so no version is ever reused. */
export function draftVersion(s: Pick<Snapshot, "plan" | "planHistory">): number {
  const kept = [...(s.planHistory ?? []), ...(s.plan?.versions ?? [])].map((v) => v.version)
  return Math.max(0, ...kept) + 1
}

/** One step of the paid setup: where it sits in the count, and finishing
    it, which saves what it collected and opens the next step over this
    one. The last step hands the plan to the doctor as a draft and lands on
    the Plan tab with the setup cleared from history. */
export function useSetupStep(id: SetupStep) {
  const onboarding = useOnboarding()
  const index = SETUP.findIndex((s) => s.id === id)
  const next = SETUP[index + 1]

  async function finish(patch: Patch = {}) {
    const setupDone = [...new Set([...(onboarding.setupDone ?? []), id])]
    await onboarding.save({
      ...patch,
      setupDone,
      ...(next ? {} : { plan: { status: "review" as const, version: draftVersion(onboarding), versions: [] } }),
    })
    if (next) router.push(next.href)
    else {
      router.dismissTo("/")
      router.push("/plan")
    }
  }

  return { step: index + 1, steps: SETUP.length, label: stepLabel(index + 1), finish }
}

/* ------------------------------------------------------ starting tests -- */

/** A test the plan needs and the record does not have yet, with three
    openings to choose from. */
export type StartingTest = { id: string; name: string; detail: string; where: string; slots: { at: Date; words: string }[] }

/* Openings by weekday from tomorrow, at the times the practice and the
   imaging partner offer: the blood draw early (it is fasting), the scan
   later in the day. Worked out from the device date, so every opening is
   ahead of her on any day (E.13). */
const OPENINGS: Record<string, { weekday: number; hour: number; minute: number }[]> = {
  blood: [
    { weekday: 0, hour: 8, minute: 0 },
    { weekday: 1, hour: 7, minute: 30 },
    { weekday: 3, hour: 8, minute: 15 },
  ],
  dexa: [
    { weekday: 2, hour: 10, minute: 0 },
    { weekday: 4, hour: 14, minute: 30 },
    { weekday: 5, hour: 9, minute: 0 },
  ],
}

/** The next `n` weekdays after `now`. */
function weekdays(now: Date, n: number): Date[] {
  const days: Date[] = []
  for (let d = addDays(now, 1); days.length < n; d = addDays(d, 1)) if (d.getDay() !== 0 && d.getDay() !== 6) days.push(d)
  return days
}

/** The starting tests to book (lib/program.ts BASELINE), each with three
    openings: "Fri, Oct 2, 8:00 AM". */
export function startingTests(now: Date = new Date()): StartingTest[] {
  const days = weekdays(now, 6)
  return BASELINE.missing.map((t) => ({
    id: t.id,
    name: t.name,
    detail: t.detail,
    where: t.where,
    slots: (OPENINGS[t.id] ?? OPENINGS.blood).map((o) => {
      const d = days[o.weekday]
      const at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), o.hour, o.minute)
      return { at, words: `${dayLabel(at)}, ${clock(o.hour, o.minute)}` }
    }),
  }))
}

/** The tests she picked, as bookings (store `bookings`, by test), so they
    show with her other booked tests in This week and To do. Booked
    through her plan, nothing is paid here. */
export function bookingsFor(picked: Record<string, string>, tests: StartingTest[]): Record<string, Booking> {
  const out: Record<string, Booking> = {}
  for (const t of tests) {
    const slot = t.slots.find((s) => s.words === picked[t.id])
    if (!slot) continue
    out[t.id] = { where: t.where, when: slot.words, price: "", paid: "", at: localIso(slot.at), time: clock(slot.at.getHours(), slot.at.getMinutes()) }
  }
  return out
}

/* ---------------------------------------------------------------- tour -- */

/** The short tour at the end of setup, one card at a time. */
export const TOUR_CARDS = TOUR
