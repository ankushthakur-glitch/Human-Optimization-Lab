import { type Patient, fullName } from "@/components/practice/practice-data"
import { NOW, daysSince, ms } from "@/components/provider/mock-clock"
import {
  type MedicationChange,
  type Ranked,
  type WorkItem,
  heaviestPatient,
  longOpen,
} from "@/components/provider/work-items"
import { BRIEF_LIMIT, type BriefItem, type Source, TONE_RANK } from "@/lib/brief/types"

/* The home brief's generators. Each looks at the open queue in scope and
   returns zero or more items with sources; the composer ranks them and
   keeps the top four. Urgent results are Tier 1 on the home page, so no
   generator here repeats them. */

export type HomeContext = {
  /** Open items for the patients in scope, ranked. */
  open: Ranked[]
  patients: Map<string, Patient>
  /** ISO date-time of the provider's last visit to the dashboard. */
  lastVisit: string
}

type Generator = (ctx: HomeContext) => BriefItem[]

/* ------------------------------------------------------------- words -- */

const mmdd = (iso: string) => `${iso.slice(5, 7)}/${iso.slice(8, 10)}`
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
const system = (source: string) => source.replace(/\s*\((Epic|Cerner|athena)\)\s*$/i, "")

function pronouns(p: Patient | undefined) {
  if (p?.sex === "Female") return { Their: "Her", her: "her" }
  if (p?.sex === "Male") return { Their: "His", her: "his" }
  return { Their: "Their", her: "their" }
}

const nameOf = (ctx: HomeContext, id: string) => {
  const p = ctx.patients.get(id)
  return p ? fullName(p) : id
}

/** "a third", "a quarter", "half", else "n of total". */
export function fractionWord(n: number, total: number) {
  const r = total ? n / total : 0
  if (r >= 0.45) return "half"
  if (r >= 0.3) return "a third"
  if (r >= 0.22) return "a quarter"
  return `${n.toLocaleString("en-US")} of ${total.toLocaleString("en-US")}`
}

const doseNumber = (dose?: string) => Number.parseFloat(dose ?? "")

/** How a medication changed, as the brief says it; empty when the change
    is the patient's own report. */
function changeWords(m: MedicationChange) {
  switch (m.change) {
    case "stopped":
      return "stopped"
    case "not_on_list":
      return "started"
    case "dose": {
      const up = doseNumber(m.toDose) > doseNumber(m.fromDose)
      return `${up ? "increased" : "decreased"} to ${m.toDose ?? ""}`.trim()
    }
    default:
      return ""
  }
}

const item = (
  id: string,
  tone: BriefItem["tone"],
  lead: string,
  body: string,
  sources: Source[],
  at: string
): BriefItem => ({ id, tone, lead, body, sources, rank: TONE_RANK[tone], at })

/* -------------------------------------------------------- generators -- */

/** An optimization plan waiting for the provider's approval, due today or
    past. */
const planApprovals: Generator = (ctx) =>
  ctx.open
    .filter(
      (w): w is Ranked & { type: "review_due" } =>
        w.type === "review_due" &&
        w.payload.review === "Optimization plan approval" &&
        w.payload.due <= NOW.slice(0, 10)
    )
    .map((w) => {
      const today = w.payload.due === NOW.slice(0, 10)
      return item(
        `plan-${w.id}`,
        "action",
        `${nameOf(ctx, w.patientId)}'s optimization plan ${today ? "is due for your approval today" : `was due ${mmdd(w.payload.due)}`}.`,
        `It was drafted by AI on ${mmdd(w.createdAt)}.`,
        [{ label: `AI plan · ${mmdd(w.createdAt)}`, kind: "plan", refId: w.id }],
        w.createdAt
      )
    })

/** Process items that have waited more than 42 days: orders that have
    spent every reminder, and care gaps in the oldest bucket. The lead
    count is the sum of the two clauses, so the sentence always adds up. */
const longOpenItems: Generator = (ctx) => {
  const { items, orders, gaps } = longOpen(ctx.open)
  const a = orders.length
  const b = gaps.length
  if (a + b === 0) return []
  const clauses = [
    a === 1
      ? "1 is an unscheduled order that has used all its reminders"
      : a > 1
        ? `${a} are unscheduled orders that have used all their reminders`
        : "",
    b === 1 ? "1 is a care gap" : b > 1 ? `${b} are care gaps` : "",
  ].filter(Boolean)
  const body = clauses.length === 2 ? `${clauses[0]}, and ${clauses[1]}.` : clauses.length === 1 ? `${clauses[0]}.` : ""
  const sources: Source[] = []
  if (a > 0) sources.push({ label: `Orders · ${a}`, kind: "filter", refId: "orders", filter: { tab: "overdue_order" } })
  if (b > 0)
    sources.push({ label: `Care gaps · ${b}`, kind: "filter", refId: "care-gaps", filter: { tab: "care_gap", age: "43+" } })
  const newest = items.map((i) => i.createdAt).sort().reverse()[0] ?? NOW
  return [
    item(
      "long-open",
      "action",
      `${(a + b).toLocaleString("en-US")} items have been open for more than 42 days.`,
      body,
      sources,
      newest
    ),
  ]
}

/** A recent admission, with the medication change that came with it. */
const admissions: Generator = (ctx) =>
  ctx.open
    .filter(
      (w): w is Ranked & { type: "outside_care" } =>
        w.type === "outside_care" && w.payload.event === "Admission" && daysSince(w.createdAt) <= 14
    )
    .sort((x, y) => ms(y.createdAt) - ms(x.createdAt))
    .map((w) => {
      const patient = ctx.patients.get(w.patientId)
      const c = w.payload
      const med = ctx.open
        .filter(
          (m): m is Ranked & { type: "medication_change" } =>
            m.type === "medication_change" && m.patientId === w.patientId && ms(m.createdAt) > ms(ctx.lastVisit)
        )
        .sort((x, y) => ms(y.createdAt) - ms(x.createdAt))
        .find((m) => changeWords(m.payload) !== "")
      const { Their } = pronouns(patient)
      const sources: Source[] = [{ label: `${w.source} · ${mmdd(c.date)}`, kind: "encounter", refId: w.id }]
      let body = ""
      if (med) {
        const m = med.payload
        body = `${Their} ${lower(m.medication)} was ${changeWords(m)}${m.changedBy ? ` by ${m.changedBy}` : ""} on ${mmdd(m.date)}.`
        sources.push({ label: `${system(med.source)} · ${mmdd(m.date)}`, kind: "medication", refId: med.id })
      }
      return item(
        `admission-${w.id}`,
        "clinical",
        `${nameOf(ctx, w.patientId)} was admitted to ${c.facility} with ${c.shortReason ?? lower(c.reason)} (${mmdd(c.date)}).`,
        body,
        sources,
        w.createdAt
      )
    })

/** The patient whose chart clears the most of the queue, when it is five or
    more items. */
const heaviestChart: Generator = (ctx) => {
  const g = heaviestPatient(ctx.open)
  if (!g || g.items.length < 5) return []
  const { her } = pronouns(ctx.patients.get(g.patientId))
  const newest = g.items.map((i) => i.createdAt).sort().reverse()[0]
  return [
    item(
      `heaviest-${g.patientId}`,
      "info",
      `${nameOf(ctx, g.patientId)} has the most open items (${g.items.length.toLocaleString("en-US")}).`,
      `Reviewing ${her} chart clears ${fractionWord(g.items.length, ctx.open.length)} of the queue.`,
      [{ label: "Worklist", kind: "filter", refId: "worklist", filter: { tab: "patient", patientId: g.patientId } }],
      newest
    ),
  ]
}

export const HOME_GENERATORS: Generator[] = [planApprovals, longOpenItems, admissions, heaviestChart]

/** The home brief: every generator's items with a source, by tone rank
    (urgent → info) and newest first within a tone, the top four kept.
    composeBrief("home", ctx) in index.ts is this function. */
export function composeHomeBrief(ctx: HomeContext): BriefItem[] {
  return HOME_GENERATORS.flatMap((g) => g(ctx))
    .filter((i) => i.sources.length > 0)
    .sort((a, b) => a.rank - b.rank || b.at.localeCompare(a.at))
    .slice(0, BRIEF_LIMIT)
}

/** The footer action's target: the heaviest chart, when the brief names it. */
export function heaviestFor(ctx: HomeContext) {
  const g = heaviestPatient(ctx.open)
  return g && g.items.length >= 5 ? g.patientId : undefined
}

/* Kept for callers that only need the type. */
export type { WorkItem }
