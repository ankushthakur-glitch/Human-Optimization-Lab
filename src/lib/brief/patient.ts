import { NOW, daysSince } from "@/components/provider/mock-clock"
import { type DashboardModel, encounterKey, orderKey, reportKey } from "@/components/patient-dashboard/model"
import {
  type KeyTrend,
  caseKey,
  isUrgentReport,
  latestOf,
  monthsBetween,
  previousOf,
  readingStatus,
  shortSource,
} from "@/components/patient-dashboard/rules"
import type { TrackedOrder } from "@/components/patient-dashboard/types"
import type { OptimizationModel } from "@/components/patient-dashboard/optimization/model"
import {
  fmt,
  goalProgress,
  isInside,
  markerByName,
  numericHistory,
  scanChange,
  shown,
  targetText,
  targetsMet,
} from "@/components/patient-dashboard/optimization/rules"
import type { Biomarker } from "@/components/patient-dashboard/optimization/types"
import { type BriefItem, RANK, type Source, type Tone } from "@/lib/brief/types"

/* The patient brief's generators (composeBrief("patient", ctx) in
   index.ts). Each reads the patient's models and returns zero or more
   items with sources; an item without a source is dropped. The composer
   keeps the top four by tone rank and shows them in the generators' order
   below, which is the order of the physician's questions. Templates are
   fixed; every number, date, name and unit comes from the data. Dates
   inside sentences are MM/DD. A generator never restates what Tier 1
   already shows: an urgent report's values stay in Tier 1, so the brief
   names the finding and the order that waits on it. */

export type PatientContext = {
  core: DashboardModel
  opt?: OptimizationModel
  /** "she", "he" or "they", for the dose-difference sentence. */
  pronoun: "she" | "he" | "they"
}

type Draft = Omit<BriefItem, "rank">

type Generator = (ctx: PatientContext) => BriefItem[]

const ranked = (d: Draft): BriefItem => ({ ...d, rank: RANK[d.tone] })

const md = (iso: string) => `${iso.slice(5, 7)}/${iso.slice(8, 10)}`
/** Names that keep their capital mid-sentence. */
const EPONYMS = new Set(["Holter", "Doppler", "Pap", "Snellen", "Mantoux"])

/** Lower-cases a leading capital, leaving acronyms ("ECG") and eponyms ("Holter") alone. */
const lower = (s: string) => (/^[A-Z][a-z]/.test(s) && !EPONYMS.has(s.split(" ")[0]) ? s.charAt(0).toLowerCase() + s.slice(1) : s)

/** An order's name without its numeric qualifier: "Holter monitor 48-hour" as "Holter monitor". */
const orderName = (name: string) => name.replace(/\s+\d.*$/, "")

/** "A, and B" / "A, B, and C": clauses joined with the comma before "and". */
const clauses = (parts: string[]) =>
  parts.length <= 1 ? parts.join("") : `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`
const upper = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const numberIn = (s: string) => Number((s.match(/-?\d+(\.\d+)?/) ?? [NaN])[0])
const and = (parts: string[]) =>
  parts.length <= 1 ? parts.join("") : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`

const cutoffOf = (core: DashboardModel) => core.review?.at.slice(0, 10) ?? ""

/* ------------------------------------------------------------ orders -- */

/** "Referral · Corewell": the order's kind and where it went. */
function orderSource(o: TrackedOrder): Source {
  const kind = /referral/i.test(o.order) ? "Referral" : o.order
  const place = o.facility ? ` · ${o.facility.split(" ")[0]}` : ""
  return { label: `${kind}${place}`, kind: "order", refId: orderKey(o) }
}

function orderState(o: TrackedOrder) {
  if (o.scheduledAt) return `The ${lower(o.order)} is booked for ${md(o.scheduledAt)}.`
  const to = o.facility ? ` to ${o.facility}` : ""
  return `The ${lower(o.order)}${to} has not been scheduled.`
}

/* --------------------------------------------------------- generators -- */

/** An unreviewed ED visit or admission, with what came out of it. */
function outsideEvent({ core }: PatientContext): Draft[] {
  return core.encounters
    .filter((e) => !e.reviewed && (e.event === "ED visit" || e.event === "Admission"))
    .map((e) => {
      const day = e.date.slice(0, 10)
      const labs = core.data.labs.filter((l) => {
        const last = latestOf(l)
        return last && last.date.slice(0, 10) === day && last.isOutsideSource && readingStatus(l, last) !== "In range"
      })
      const report = core.data.reports.find((r) => r.date.slice(0, 10) === day && r.flag !== "Normal")
      const started = core.data.medications.filter((m) => !m.isPracticeList && m.date.slice(0, 10) === day)
      const sentences: string[] = []
      const results = labs.map((l) => {
        const last = latestOf(l)!
        const prev = previousOf(l)
        return `${l.name} was ${last.value} ${l.unit}${prev ? ` (previously ${prev.value})` : ""}`
      })
      if (results.length || report) {
        const shown = report ? `the ${lower(report.report)} showed ${lower(report.finding)}` : ""
        sentences.push(`${upper(clauses([...results, shown].filter(Boolean)))}.`)
      }
      for (const m of started) sentences.push(`${m.medication} ${m.dose} ${m.frequency} was started.`)
      const sources: Source[] = [
        { label: `${e.event === "ED visit" ? "ED" : "Discharge"} note · ${md(e.date)}`, kind: "encounter", refId: encounterKey(e) },
        ...labs.slice(0, 1).map((l) => ({ label: `Lab · ${md(latestOf(l)!.date)}`, kind: "lab" as const, refId: l.code })),
        ...(report ? [{ label: `${report.documentLabel ?? `${report.report} PDF`}`, kind: "document" as const, refId: reportKey(report) }] : []),
      ]
      return {
        id: `event:${encounterKey(e)}`,
        tone: "urgent" as Tone,
        lead: `${e.event} for ${lower(e.reason)} at ${shortSource(e.source)} (${md(e.date)}).`,
        body: sentences.join(" "),
        sources,
        at: e.date,
      }
    })
}

/** An unreviewed outside abnormal report that no visit explains. */
function urgentReport({ core }: PatientContext): Draft[] {
  const visitDays = new Set(core.data.encounters.map((e) => e.date.slice(0, 10)))
  return core.reports
    .filter((r) => !r.reviewed && isUrgentReport(r) && !visitDays.has(r.date.slice(0, 10)))
    .map((r) => {
      const order = r.orderRef ? core.orders.find((o) => o.order === r.orderRef) : undefined
      const body = [r.summary ? `${r.summary}.` : "", order ? orderState(order) : ""].filter(Boolean).join(" ")
      return {
        id: `report:${reportKey(r)}`,
        tone: "urgent" as Tone,
        lead: `${upper(r.finding)} on ${r.inBrief ?? `the ${lower(r.report)}`} (${md(r.date)}).`,
        body,
        sources: [
          { label: r.documentLabel ?? `${r.report} PDF`, kind: "document", refId: reportKey(r) },
          ...(order ? [orderSource(order)] : []),
        ],
        at: r.date,
      }
    })
}

/** A dose another source changed since the last review. */
function doseDifference({ core, pronoun }: PatientContext): Draft[] {
  const cutoff = cutoffOf(core)
  return core.cases
    .filter((c) => c.other && c.practice && c.other.date.slice(0, 10) > cutoff)
    .map((c) => {
      const other = c.other!
      const practice = c.practice!
      const direction = numberIn(other.dose) > numberIn(practice.dose) ? "increased" : "decreased"
      /* The visit the change came from, when one arrived with it. */
      const visit = core.data.encounters.find((v) => v.source === other.source && v.date.slice(0, 10) === other.date.slice(0, 10))
      const specialty = visit?.facility.split(" ").pop()?.toLowerCase()
      const by = specialty ?? other.prescriber
      const confirms = c.answer && (c.answer.answer === "Taking" || (c.answer.note ?? "").includes(other.dose))
      const body = c.answer
        ? confirms
          ? `The patient confirms ${pronoun} ${pronoun === "they" ? "take" : "takes"} ${other.dose}; your list still shows ${practice.dose}.`
          : `The patient reports ${lower(c.answer.answer)}; your list still shows ${practice.dose}.`
        : "The patient has not answered."
      const sources: Source[] = [
        visit && specialty
          ? { label: `${visit.facility.split(" ")[0]} ${specialty} · ${md(visit.date)}`, kind: "encounter", refId: encounterKey(visit) }
          : { label: `${shortSource(other.source)} · ${md(other.date)}`, kind: "medication", refId: caseKey(c.medication, other.source, other.dose) },
        ...(c.answer ? [{ label: `Patient answers · ${md(c.answer.date)}`, kind: "patient" as const, refId: `answer:${c.medication}` }] : []),
      ]
      return {
        id: `dose:${c.key}`,
        tone: "action" as Tone,
        lead: `${c.medication} was ${direction} to ${other.dose} by ${by} (${md(other.date)}).`,
        body,
        sources,
        at: other.date,
      }
    })
}

/** Three consecutive moves the wrong way, ending outside the range or within 10% of its edge. */
function worsening(b: Biomarker) {
  const h = numericHistory(b)
  if (h.length < 3) return undefined
  const [a, m, z] = h.slice(-3)
  const dir = b.betterDirection
  const up = a.n < m.n && m.n < z.n
  const down = a.n > m.n && m.n > z.n
  let worse = false
  if (dir === "Lower") worse = up
  else if (dir === "Higher") worse = down
  else return undefined
  if (!worse) return undefined
  const limit = dir === "Lower" ? (b.targetHigh ?? b.labHigh) : (b.targetLow ?? b.labLow)
  if (limit == null) return undefined
  const near = dir === "Lower" ? z.n >= limit * 0.9 : z.n <= limit * 1.1
  if (!near && isInside(b, z.n)) return undefined
  return { points: [a, m, z], up }
}

/* The free view's control markers, named the way the brief says them. */
const PLAIN_NAME: Record<string, string> = {
  HbA1c: "Blood sugar",
  "LDL-C": "Cholesterol",
  "Systolic BP": "Blood pressure",
  eGFR: "Kidney function",
  TSH: "Thyroid",
  Weight: "Weight",
}

/** "6.1%" or "104 mg/dL": the unit follows the value, tight for a percent. */
const withUnit = (v: number | string, unit: string) => (unit === "%" ? `${v}%` : `${v} ${unit}`)

/** The same three-point test over a key trend's points. */
function worseningTrend(t: KeyTrend) {
  if (t.points.length < 3) return undefined
  const [a, m, z] = t.points.slice(-3)
  const up = a.value < m.value && m.value < z.value
  const down = a.value > m.value && m.value > z.value
  const worse = t.betterDirection === "lower" ? up : t.betterDirection === "higher" ? down : false
  if (!worse) return undefined
  const limit = t.betterDirection === "lower" ? t.refHigh : t.refLow
  if (limit == null) return undefined
  const near = t.betterDirection === "lower" ? z.value >= limit * 0.9 : z.value <= limit * 1.1
  if (!near && !z.flagged) return undefined
  return { points: [a, m, z], up }
}

/** A problem's control marker drifting away from its range. */
function worseningMarker({ core, opt }: PatientContext): Draft[] {
  const out: Draft[] = []
  if (opt) {
    for (const c of opt.data.conditions) {
      const b = c.controlMarkerName ? markerByName(opt.data.biomarkers, c.controlMarkerName) : undefined
      const w = b && worsening(b)
      if (!b || !w) continue
      const [a, m, z] = w.points
      out.push({
        id: `trend:${b.name}`,
        tone: "clinical",
        lead: `${PLAIN_NAME[b.name] ?? b.name} is trending ${w.up ? "up" : "down"}.`,
        body: `${b.name} went ${shown(a.n)} → ${shown(m.n)} → ${withUnit(shown(z.n), b.unit)} over ${monthsBetween(a.date, z.date)} months.`,
        sources: [{ label: `${shortSource(z.source || "Lab")} · ${md(z.date)}`, kind: "lab", refId: b.name }],
        at: z.date,
      })
    }
    return out
  }
  /* The free view: the key trends behind the problem list, in their order. */
  for (const t of core.trends) {
    /* Lab markers only (a LOINC code); vitals are not labs and get no lab chip. */
    if (!/^\d+-\d$/.test(t.id)) continue
    const w = worseningTrend(t)
    if (!w || !PLAIN_NAME[t.label]) continue
    const [a, m, z] = w.points
    const companion = core.trends.find((x) => x.id !== t.id && /glucose/i.test(x.label) && /a1c/i.test(t.label))
    const last = companion?.points[companion.points.length - 1]
    const related = companion && last ? `, and ${lower(companion.label)} is ${withUnit(last.value, companion.unit)}` : ""
    out.push({
      id: `trend:${t.id}`,
      tone: "clinical",
      lead: `${PLAIN_NAME[t.label]} is trending ${w.up ? "up" : "down"}.`,
      body: `${t.label} went ${a.value} → ${m.value} → ${withUnit(z.value, t.unit)} over ${monthsBetween(a.date, z.date)} months${related}.`,
      sources: [{ label: `${shortSource(z.source)} · ${md(z.date)}`, kind: "lab", refId: t.id }],
      at: z.date,
    })
  }
  return out
}

/** An order past its escalation point that Tier 1 does not already show. */
function overdueOrder({ core }: PatientContext): Draft[] {
  const inTierOne = new Set(core.reports.filter((r) => !r.reviewed && isUrgentReport(r)).map((r) => r.orderRef))
  const booked = core.orders.find((o) => o.clock.kind === "future")
  return core.orders
    .filter((o) => o.clock.kind === "running" && o.clock.overdue && !inTierOne.has(o.order))
    .map((o) => {
      const clock = o.clock as { day: number }
      const reminders = o.reminderDates.length
      const other = booked && booked.key !== o.key ? ` The ${lower(orderName(booked.order))} is booked for ${md(booked.scheduledAt!)}.` : ""
      return {
        id: `overdue:${o.key}`,
        tone: "action" as Tone,
        lead: `The ${lower(orderName(o.order))} is ${clock.day} days overdue`,
        body: `and still unscheduled after ${reminders} reminder${reminders === 1 ? "" : "s"}.${other}`,
        sources: [{ label: "Orders", kind: "filter", refId: "orders" }],
        at: o.orderedAt,
      }
    })
}

/** How far outside its range the point before the normalizing one sat. */
function excursion(b: Biomarker, cutoff: string) {
  const h = numericHistory(b)
  const i = h.findIndex((p, k) => p.date > cutoff && k > 0 && !isInside(b, h[k - 1].n) && isInside(b, p.n))
  if (i <= 0) return 0
  const prev = h[i - 1].n
  const low = b.targetLow ?? b.labLow
  const high = b.targetHigh ?? b.labHigh
  if (high != null && prev > high) return (prev - high) / high
  if (low != null && prev < low) return (low - prev) / low
  return 0
}

/** Markers that moved into range since the last review (optimization). */
function targetsMetSince({ core, opt }: PatientContext): Draft[] {
  if (!opt) return []
  const cutoff = cutoffOf(core)
  const met = targetsMet(opt.data.biomarkers, cutoff).sort((a, b) => excursion(b, cutoff) - excursion(a, cutoff))
  if (met.length === 0) return []
  const latest = (b: Biomarker) => numericHistory(b).filter((p) => p.date > cutoff).pop()!
  const day = met.map(latest).map((p) => p.date).sort().pop()!
  const bands = [...opt.data.snapshot.bands["Out of target"], ...opt.data.snapshot.bands["On watch"]]
  const stale = met.some((b) => {
    const row = bands.find((r) => r.name.toLowerCase() === b.name.toLowerCase())
    return row && row.latest !== String(latest(b).n)
  })
  return [
    {
      id: "targets",
      tone: "clinical",
      lead: `${and(met.map((b) => `${b.name} (${shown(latest(b).n)})`))} normalized on the ${md(day)} repeat.`,
      body: stale ? "The marker bands still list the older values until the tracker is updated." : "",
      sources: [
        { label: `Lab · ${md(day)}`, kind: "lab", refId: met.map((b) => b.name).join("|") },
        ...(stale ? [{ label: "HOLv.9 tracker", kind: "document" as const, refId: "tracker" }] : []),
      ],
      at: day,
    },
  ]
}

const RECENT_DAYS = 90

/** Weight and DEXA progress when a body point is recent (optimization). */
function bodyProgress({ opt }: PatientContext): Draft[] {
  if (!opt) return []
  const weightGoal = opt.goals.find((g) => g.seriesMarkerName.toLowerCase() === "weight")
  const weight = weightGoal && markerByName(opt.data.biomarkers, weightGoal.seriesMarkerName)
  if (!weightGoal || !weight) return []
  const scans = opt.data.scans
  const vat = scans.find((s) => /vat area/i.test(s.metric))
  const fat = scans.find((s) => /body fat/i.test(s.metric))
  const lean = scans.find((s) => /lean mass/i.test(s.metric))
  const latestWeight = numericHistory(weight).pop()
  const scanDate = opt.data.snapshot.scanDates.latest
  const recent = [latestWeight?.date, scanDate].some((d) => d && daysSince(d) <= RECENT_DAYS)
  if (!latestWeight || !recent) return []
  const pct = Math.round(goalProgress(weightGoal) * 100)
  const parts = [
    `Weight ${fmt(weightGoal.baseline)} → ${fmt(weightGoal.current)} ${weightGoal.unit} (${pct}% of the way to goal)`,
    vat ? `VAT area down ${Math.abs(scanChange(vat).pct)}%` : "",
    fat ? `body fat ${fmt(fat.first)} → ${fmt(fat.latest)}%` : "",
  ].filter(Boolean)
  const leanDown = lean && lean.latest < lean.first ? ` Lean mass is down ${fmt(lean.first - lean.latest, 1)} ${lean.unit}, so protecting it is now a priority.` : ""
  return [
    {
      id: "body",
      tone: "improving",
      lead: "Body composition keeps improving.",
      body: `${parts.join(", ")}.${leanDown}`,
      sources: [
        ...(vat ? [{ label: `DEXA · ${md(scanDate)}`, kind: "lab" as const, refId: "VAT Area" }] : []),
        { label: `Scale · ${md(latestWeight.date)}`, kind: "lab", refId: weight.name },
      ],
      at: [latestWeight.date, scanDate].sort().pop()!,
    },
  ]
}

/** An open supplement conflict (optimization). */
function supplementConflict({ opt }: PatientContext): Draft[] {
  if (!opt) return []
  return opt.conflicts.flatMap((c) => {
    const b = markerByName(opt.data.biomarkers, c.evidenceMarkerName)
    const last = b && numericHistory(b).pop()
    if (!b || !last) return []
    const [name, dose] = c.item.split(" · ")
    const range = targetText(b)
    return [
      {
        id: `conflict:${c.item}`,
        tone: "action" as Tone,
        lead: `${name} ${dose ?? ""} conflicts with ${b.name} ${shown(last.n)} ${b.unit}`.replace(/\s+/g, " "),
        body: range ? `(target ${range}).` : "",
        sources: [
          { label: "Supplement list", kind: "medication", refId: "supplements" },
          { label: `Lab · ${md(last.date)}`, kind: "lab", refId: b.name },
        ],
        at: last.date,
      },
    ]
  })
}

/* --------------------------------------------------------- the list -- */

export const PATIENT_GENERATORS: Generator[] = [
  outsideEvent,
  urgentReport,
  doseDifference,
  worseningMarker,
  overdueOrder,
  targetsMetSince,
  bodyProgress,
  supplementConflict,
].map((g) => (ctx: PatientContext) => g(ctx).map(ranked))

/* --------------------------------------------------------------- meta -- */

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** "08/12 → 10/03/2026 · 19 new results · 2 medication changes · 2 targets met". */
export function briefMeta({ core, opt }: PatientContext) {
  const from = core.review?.at ?? opt?.data.planSince ?? NOW
  const to = NOW
  const counts = opt
    ? Object.fromEntries(opt.since.map((s) => [s.kind, s.count]))
    : Object.fromEntries(core.chips.map((c) => [c.type, c.count]))
  const n = (k: string) => counts[k] ?? 0
  const resultNoun = opt ? ["new result", "new results"] : ["result", "results"]
  const parts = [
    n("results") + n("result") ? plural(n("results") + n("result"), resultNoun[0], resultNoun[1]) : "",
    n("medications") + n("medication") ? plural(n("medications") + n("medication"), "medication change", "medication changes") : "",
    n("outside") + n("outside visit") ? plural(n("outside") + n("outside visit"), "outside visit", "outside visits") : "",
    n("diagnoses") + n("diagnosis") ? plural(n("diagnoses") + n("diagnosis"), "new diagnosis", "new diagnoses") : "",
    n("targets") ? plural(n("targets"), "target met", "targets met") : "",
  ].filter(Boolean)
  return [`${md(from)} → ${to.slice(5, 7)}/${to.slice(8, 10)}/${to.slice(0, 4)}`, ...parts].join(" · ")
}

/** The items as plain text for a visit note, prefixed as AI-drafted. */
export function briefAsText(items: BriefItem[], meta: string) {
  const lines = items.map((i) => `- ${i.lead} ${i.body}`.trim() + ` [${i.sources.map((s) => s.label).join("; ")}]`)
  return [`[AI-drafted] Since your last review · ${meta}`, ...lines].join("\n")
}
