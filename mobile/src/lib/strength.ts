import { dayKey } from "@/lib/dates"
import type { ActivityLog } from "@/lib/member"
import type { useOnboarding } from "@/lib/onboarding"
import { LIFTS, type Lift } from "@/lib/topics"

/* Strength progression for the default programme's lifts, all of it
   optional. She can log a lift's sets on its page, and after saving say
   how close to failure her last set was ("How many more reps could you
   have done?").
   From the last session she logged, next week's target ratchets by one
   small step: one or two more reps, or the next dumbbell or band once the
   reps reach the top of the range. Nothing logged means nothing changes: the plan
   stays as written. She can also turn the weekly change off.

   Minimal equipment, gentle steps (HOL, 26 Oct): light dumbbells and bands,
   never more than one rung at a time, and going to failure holds the load
   rather than pushing it. Members are not training to be bodybuilders. */

type Store = ReturnType<typeof useOnboarding>

/** Light dumbbells as they are sold, in lb, each hand. */
export const DUMBBELLS = [3, 5, 8, 10, 12, 15, 20, 25, 30]

/** Resistance bands by their printed pull, in lb. */
export const BANDS = [
  { lb: 10, name: "Extra light" },
  { lb: 15, name: "Light" },
  { lb: 25, name: "Medium" },
  { lb: 35, name: "Heavy" },
  { lb: 50, name: "Extra heavy" },
]

export type Target = { sets: number; reps: number; load: number }
export type SetLog = NonNullable<ActivityLog["entries"]>[number]
export type Move = "weight" | "reps" | "hold"
export type Step = { target: Target; move: Move; why: string }
export type Session = { day: string; entries: SetLog[] }

/** "3 × 10" */
export const setsText = (t: Pick<Target, "sets" | "reps">) => `${t.sets} × ${t.reps}`

/** "15 lb", or for a band "Medium band, 25 lb". */
export function loadText(lift: Lift, lb: number) {
  if (lift.gear !== "band") return `${lb} lb`
  const band = BANDS.find((b) => b.lb === lb)
  return band ? `${band.name} band, ${lb} lb` : `${lb} lb band`
}

/** The short version for a narrow column: "15 lb", "Medium". */
export const loadShort = (lift: Lift, lb: number) => (lift.gear === "band" ? (BANDS.find((b) => b.lb === lb)?.name ?? `${lb} lb`) : `${lb} lb`)

/** The next dumbbell or band up, or the same at the top of the rack. */
function rungUp(lift: Lift, lb: number) {
  const ladder = lift.gear === "band" ? BANDS.map((b) => b.lb) : DUMBBELLS
  return ladder.find((l) => l > lb) ?? lb
}

/** How many more reps she could have done, as she answered after a set. */
export const EFFORT: { rir: number; label: string; short: string }[] = [
  { rir: 0, label: "None, that was failure", short: "Failure" },
  { rir: 1, label: "1 more", short: "1 left" },
  { rir: 2, label: "2 more", short: "2 left" },
  { rir: 3, label: "3 or more", short: "3+ left" },
]
export const effortShort = (rir: number | undefined) => EFFORT.find((e) => e.rir === Math.min(rir ?? -1, 3))?.short

/** One session's step to the next. The load is what she actually used (the
    lightest set), so a session done heavier or lighter than planned moves on
    from where she really is. */
export function nextStep(lift: Lift, planned: Target, entries: SetLog[]): Step {
  const done = entries.filter((e) => e.reps !== undefined && e.weightLb !== undefined)
  if (!done.length) return { target: planned, move: "hold", why: "Nothing logged, so the plan stays as written." }
  const load = Math.min(...done.map((e) => e.weightLb!))
  const got = done.reduce((n, e) => n + e.reps!, 0)
  const hit = done.length >= planned.sets && done.every((e) => e.reps! >= planned.reps)
  const same = { sets: planned.sets, reps: planned.reps, load }
  if (!hit) return { target: same, move: "hold", why: `You got ${got} of ${planned.sets * planned.reps} reps. Same again next week.` }

  const answered = done.map((e) => e.rir).filter((r): r is number => r !== undefined)
  const least = answered.length ? Math.min(...answered) : undefined
  const up = rungUp(lift, load)
  if (least === 0) return { target: same, move: "hold", why: "You went to failure, so the load holds. Stop a rep or two short next time." }
  // Plenty left climbs the reps faster, never the load: the load only
  // steps up from the top of the range.
  if (least !== undefined && least >= 3 && planned.reps < lift.top)
    return { target: { ...same, reps: Math.min(planned.reps + 2, lift.top) }, move: "reps", why: "Every set had 3 or more reps left, so two more reps each set." }
  if (planned.reps < lift.top) return { target: { ...same, reps: planned.reps + 1 }, move: "reps", why: "All your reps done, so one more rep each set." }
  if (up > load) return { target: { sets: planned.sets, reps: lift.reps, load: up }, move: "weight", why: `You reached ${lift.top} reps, so you move up to ${loadShort(lift, up)} and start at ${lift.reps}.` }
  return { target: same, move: "hold", why: "You are at the top of the range. Hold here." }
}

/* -------------------------------------------------------- the history -- */

/** How the seeded weeks felt, one answer a week, rotated per lift so the
    four lifts climb at their own pace. */
const FELT = [2, 2, 3, 1, 0, 2]
const WEEKS = FELT.length

/** Six weekly sessions before today, built by running the rule itself from
    the lift's starting load, so today's target follows from them. */
function seeded(lift: Lift, today: Date): Session[] {
  const shift = LIFTS.findIndex((l) => l.id === lift.id)
  let planned: Target = { sets: lift.sets, reps: lift.reps, load: lift.start }
  return Array.from({ length: WEEKS }, (_, w) => {
    const rir = FELT[(w + shift) % WEEKS]
    // A week at failure loses a rep on the last set.
    const entries = Array.from({ length: planned.sets }, (_, i) => ({ reps: rir === 0 && i === planned.sets - 1 ? planned.reps - 1 : planned.reps, weightLb: planned.load, rir }))
    const on = new Date(today)
    on.setDate(on.getDate() - 7 * (WEEKS - w))
    const session = { day: dayKey(on), entries }
    planned = nextStep(lift, planned, entries).target
    return session
  })
}

/** Every session of a lift, oldest first: the seeded weeks, then what she
    logged herself (her own log wins on a day both have). */
export function sessionsOf(s: Store, lift: Lift, today: Date = new Date()): Session[] {
  const own: Session[] = Object.entries(s.exercises ?? {})
    .map(([day, logs]) => ({ day, entries: logs[lift.id]?.entries ?? [] }))
    .filter((x) => x.entries.length)
  const days = new Set(own.map((x) => x.day))
  return [...seeded(lift, today).filter((x) => !days.has(x.day)), ...own].sort((a, b) => a.day.localeCompare(b.day))
}

/** Whether the weekly change is on; unset reads as on. */
export const progressOn = (s: Store) => s.liftProgress !== false

/** Today's target: the plan as written, stepped on from each logged
    session before today. With the weekly change off it holds at the last
    load she used; a set she asked to keep going forward holds as saved. */
export function targetOf(s: Store, lift: Lift, today: Date = new Date()): Target {
  const held = s.liftHolds?.[lift.id]
  if (held) return held
  const key = dayKey(today)
  const before = sessionsOf(s, lift, today).filter((x) => x.day < key)
  let planned: Target = { sets: lift.sets, reps: lift.reps, load: lift.start }
  if (!progressOn(s)) {
    const last = before[before.length - 1]?.entries
    return last?.length ? { ...planned, load: Math.min(...last.map((e) => e.weightLb ?? lift.start)) } : planned
  }
  for (const x of before) planned = nextStep(lift, planned, x.entries).target
  return planned
}

/** Next week's step, from today's log once there is one, else the last
    session's. */
export function nextWeekOf(s: Store, lift: Lift, today: Date = new Date()): Step | undefined {
  const key = dayKey(today)
  const target = targetOf(s, lift, today)
  // Today counts once every set is in.
  const logged = s.exercises?.[key]?.[lift.id]?.entries
  if (logged && logged.filter((e) => e.reps !== undefined).length >= target.sets) return nextStep(lift, target, logged)
  const list = sessionsOf(s, lift, today).filter((x) => x.day < key)
  if (!list.length) return undefined
  // Today not logged yet: next week is today's target, held.
  return { target, move: "hold", why: "" }
}

/** The heaviest load of each session, for the resistance trend. */
export const resistanceOf = (list: Session[]) => list.map((x) => ({ date: x.day, value: Math.max(...x.entries.map((e) => e.weightLb ?? 0)) }))
