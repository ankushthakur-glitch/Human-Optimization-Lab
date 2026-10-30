/* The clinic manager's numbers. The practice's three reports, from "Inlay
   Health, Reports by Portal" (30 Oct 2026): order and test activity, the
   billing statement behind Inlay's invoice, and membership conversion.
   The five count reports above them (enrollment and activation, encounters,
   outcomes, alerts, value and renewal) feed the Dashboard only; they are
   not in Reports. Built on the provider Reports engine, numbers seeded by
   report, row and period. */

import {
  catalog,
  billingFor,
  inlayPrice,
  practiceBilling,
  vendorName,
} from "@/components/admin/billing/billing-data"
import { PRACTICE, providerName } from "@/components/practice/practice-data"
import {
  PLAN_PRICE,
  type ListReport,
  type ListRow,
  type Period,
  type Report,
  type ReportContext,
  addDays,
  dayIn,
  dayLabel,
  per,
  pickOf,
  rate,
  raw,
  scaled,
  seeded,
  shareOf,
} from "@/components/provider/reports/reports-data"

export const ENROLLMENT: Report = {
  id: "enrollment",
  name: "Enrollment and activation",
  tiles: ["added", "enrolled", "enrollRate", "activateRate"],
  columns: [
    { id: "added", header: "Added and invited", format: "count", value: raw("added") },
    { id: "enrolled", header: "Enrolled", format: "count", value: raw("enrolled") },
    { id: "waiting", header: "Still invited", format: "count", value: raw("waiting") },
    { id: "declined", header: "Declined", format: "count", value: raw("declined") },
    { id: "connected", header: "Record connected", format: "count", value: raw("connected") },
    { id: "activated", header: "Activated", format: "count", value: raw("activated") },
    { id: "enrollRate", header: "Enrollment rate", format: "percent", value: rate("enrolled", "added") },
    { id: "activateRate", header: "Activation rate", format: "percent", value: rate("activated", "enrolled") },
    { id: "days", header: "Average days to enroll", format: "days", value: per("days", "enrolled") },
  ],
  /* Every patient added is invited at once; activated means onboarding
     finished (consent, record connected, symptom check). */
  counts: ({ n, part, rand: r }) => {
    const added = n(8, 30)
    const enrolled = part(added, 0.45, 0.8)
    const declined = part(added - enrolled, 0.1, 0.4)
    const connected = part(enrolled, 0.8, 1)
    return {
      added, enrolled, declined, connected,
      waiting: added - enrolled - declined,
      activated: part(connected, 0.6, 0.95),
      days: enrolled * (2 + r() * 10),
    }
  },
}

/** The encounter types, in the order the report and dashboard show them. */
export const ENCOUNTER_TYPES = [
  { id: "inPerson", label: "In-person visits" },
  { id: "telehealth", label: "Telehealth visits" },
  { id: "messages", label: "Secure messages" },
  { id: "askInlay", label: "Ask Inlay chats" },
  { id: "labDraws", label: "Lab draws" },
  { id: "checkIns", label: "Care plan check-ins" },
] as const

export const ENCOUNTERS: Report = {
  id: "encounters",
  name: "Engagement by encounter type",
  tiles: ["total", "perPatient", "telehealth", "askInlay"],
  columns: [
    ...ENCOUNTER_TYPES.map((t) => ({
      id: t.id,
      header: t.label,
      format: "count" as const,
      value: raw(t.id),
    })),
    { id: "total", header: "All encounters", format: "count", value: raw("total") },
    { id: "perPatient", header: "Encounters per active patient", format: "decimal", value: per("total", "active") },
  ],
  counts: ({ n, size }) => {
    const c = {
      inPerson: n(8, 30),
      telehealth: n(10, 40),
      messages: n(30, 120),
      askInlay: n(60, 220),
      labDraws: n(4, 18),
      checkIns: n(6, 24),
    }
    return {
      ...c,
      total: Object.values(c).reduce((s, v) => s + v, 0),
      active: size(40, 110),
    }
  },
}

export const OUTCOMES: Report = {
  id: "outcomes",
  name: "Outcomes",
  tiles: ["improvedRate", "betterRate", "symptomDrop", "bioAge"],
  columns: [
    { id: "retested", header: "Retested", format: "count", value: raw("retested") },
    { id: "improved", header: "Markers back in range", format: "count", value: raw("improved") },
    { id: "improvedRate", header: "Improved rate", format: "percent", value: rate("improved", "retested") },
    { id: "rated", header: "Symptoms rated", format: "count", value: raw("rated") },
    { id: "better", header: "Symptoms better", format: "count", value: raw("better") },
    { id: "betterRate", header: "Symptoms better rate", format: "percent", value: rate("better", "rated") },
    { id: "symptomDrop", header: "Average symptom score drop", format: "decimal", value: per("drop", "rated") },
    { id: "bioAge", header: "Average biological age drop", format: "years", value: per("years", "retested") },
  ],
  /* Retested: patients with a follow-up panel after their baseline.
     Symptoms: the three bothersome symptoms, rated 0 to 10 each week. */
  counts: ({ n, part, rand: r }) => {
    const retested = n(2, 12)
    const rated = n(15, 50)
    return {
      retested, rated,
      improved: part(retested, 0.4, 0.85),
      better: part(rated, 0.35, 0.75),
      drop: rated * (0.4 + r() * 1.8),
      years: retested * (0.2 + r() * 1.3),
    }
  },
}

/** The alert kinds, in the order the report and dashboard show them. */
export const ALERT_TYPES = [
  { id: "critical", label: "Critical results" },
  { id: "er", label: "ER visits" },
  { id: "rising", label: "Rising trends" },
  { id: "overdue", label: "Overdue tests" },
] as const

export const ALERTS: Report = {
  id: "alerts",
  name: "Alert volume",
  tiles: ["raised", "open", "fast", "hours"],
  columns: [
    ...ALERT_TYPES.map((t) => ({
      id: t.id,
      header: t.label,
      format: "count" as const,
      value: raw(t.id),
    })),
    { id: "raised", header: "Alerts raised", format: "count", value: raw("raised") },
    { id: "open", header: "Open", format: "count", value: raw("open") },
    { id: "fast", header: "Acknowledged within 24 hours", format: "percent", value: rate("fast", "acknowledged") },
    { id: "hours", header: "Average time to acknowledge", format: "hours", value: per("hours", "acknowledged") },
  ],
  /* Overdue tests escalate 14 days past due. */
  counts: ({ n, part, rand: r }) => {
    const c = {
      critical: n(1, 6),
      er: n(0, 3),
      rising: n(4, 18),
      overdue: n(2, 10),
    }
    const raised = Object.values(c).reduce((s, v) => s + v, 0)
    const acknowledged = part(raised, 0.85, 1)
    return {
      ...c, raised, acknowledged,
      open: raised - acknowledged,
      fast: part(acknowledged, 0.6, 0.98),
      hours: acknowledged * (2 + r() * 30),
    }
  },
}

export const VALUE: Report = {
  id: "value",
  name: "Value and renewal",
  tiles: ["members", "mrr", "renewRate", "revenue"],
  typeFilter: false,
  columns: [
    { id: "members", header: "Active members", format: "count", value: raw("members") },
    { id: "newMembers", header: "New members", format: "count", value: raw("newMembers") },
    { id: "due", header: "Renewals due", format: "count", value: raw("due") },
    { id: "renewed", header: "Renewed", format: "count", value: raw("renewed") },
    { id: "cancelled", header: "Cancelled", format: "count", value: raw("cancelled") },
    { id: "renewRate", header: "Renewal rate", format: "percent", value: rate("renewed", "decided") },
    { id: "mrr", header: "Monthly recurring revenue", format: "currency", value: (c) => c.members * PLAN_PRICE },
    { id: "revenue", header: "Revenue in period", format: "currency", value: raw("revenue") },
  ],
  /* Renewal rate counts only the renewals that have been decided. */
  counts: ({ n, size, part, months }) => {
    const members = size(8, 35)
    const due = n(1, 6)
    const renewed = part(due, 0.6, 0.95)
    const cancelled = part(due - renewed, 0.3, 1)
    return {
      members, due, renewed, cancelled,
      decided: renewed + cancelled,
      newMembers: n(1, 6),
      revenue: Math.round(members * PLAN_PRICE * months),
    }
  },
}


/* -------------------------------------------------------------------------- */
/*  Reports                                                                    */
/* -------------------------------------------------------------------------- */

const between = (rand: () => number, lo: number, hi: number) => lo + rand() * (hi - lo)

/** The order statuses, until the vendor contracts settle the cancellation,
    no show and reschedule policies (28 Oct). */
const ORDER_STATUSES: { status: string; weight: number }[] = [
  { status: "Completed", weight: 0.55 },
  { status: "Attended", weight: 0.08 },
  { status: "Scheduled", weight: 0.14 },
  { status: "Ordered", weight: 0.08 },
  { status: "Rescheduled", weight: 0.05 },
  { status: "Cancelled", weight: 0.06 },
  { status: "No show", weight: 0.04 },
]

function orderStatus(rand: () => number) {
  let at = rand()
  for (const s of ORDER_STATUSES) {
    if (at < s.weight) return s.status
    at -= s.weight
  }
  return ORDER_STATUSES[0].status
}

/** The tests the practice's physicians ordered through Inlay in a period:
    Inlay books each one, follows it to completion and returns the result
    image for Epic upload (26 Oct). Both practice reports read these. */
function ordersFor(period: Period, { patients, providers, employers }: ReportContext): ListRow[] {
  const tests = catalog.get().filter((t) => t.status === "Live" && t.orderedBy !== "Patients")
  const panel = patients.filter((p) => p.status === "Active")
  const doctors = providers.filter((p) => p.status === "Active")
  if (!tests.length || !panel.length || !doctors.length) return []
  const r = seeded(`orders|${PRACTICE.id}|${period.key}`)
  const total = Math.min(600, Math.max(1, Math.round(period.months * between(r, 38, 52))))
  return Array.from({ length: total }, (_, i) => {
    const patient = pickOf(panel, r)
    const doctor = doctors.find((d) => d.id === patient.providerId) ?? pickOf(doctors, r)
    const test = pickOf(tests, r)
    const date = dayIn(period, r)
    const status = orderStatus(r)
    const booked = status !== "Ordered" && status !== "Cancelled"
    const appointment = booked ? addDays(date, 2 + Math.floor(r() * 9)) : ""
    const done = status === "Completed"
    return {
      id: `O${period.key}-${i}`,
      date,
      patient: `${patient.firstName} ${patient.lastName}`,
      physician: providerName(doctor),
      test: test.name,
      type: test.category,
      vendor: vendorName(test.vendor),
      status,
      appointment,
      result: done ? addDays(appointment, 1 + Math.floor(r() * 5)) : "",
      epic: done ? (r() < 0.8 ? "Image returned" : "Image pending") : "",
      price: inlayPrice(test),
      charge: status === "Cancelled" ? 0 : inlayPrice(test),
      employer: employers.find((e) => e.id === patient.employerId)?.name ?? "",
    }
  }).sort((a, b) => b.date.localeCompare(a.date))
}

const ORDER_TONE: Record<string, "success" | "warning" | "danger" | "muted"> = {
  Completed: "success",
  Rescheduled: "warning",
  Cancelled: "danger",
  "No show": "danger",
}

export const ORDER_ACTIVITY: ListReport = {
  id: "orders",
  name: "Order and test activity",
  noun: "order",
  columns: [
    { id: "date", header: "Order date", format: "date" },
    { id: "patient", header: "Patient", format: "text" },
    { id: "physician", header: "Ordering physician", format: "text" },
    { id: "test", header: "Test or imaging", format: "text" },
    { id: "vendor", header: "Vendor", format: "text" },
    { id: "status", header: "Status", format: "text", tone: (r) => ORDER_TONE[r.status as string] ?? "muted" },
    { id: "appointment", header: "Appointment", format: "date", empty: "Not booked" },
    { id: "result", header: "Result received", format: "date", empty: "Not yet" },
    { id: "epic", header: "Epic upload", format: "text", empty: "Not yet" },
    { id: "charge", header: "Charge", format: "price", total: true },
  ],
  tiles: [
    { label: "Orders", format: "count", value: (rows) => rows.length },
    { label: "Completed", format: "count", value: (rows) => rows.filter((r) => r.status === "Completed").length },
    {
      label: "Cancelled or no show",
      format: "count",
      value: (rows) => rows.filter((r) => r.status === "Cancelled" || r.status === "No show").length,
    },
    { label: "Charges", format: "price", value: (rows) => rows.reduce((s, r) => s + (r.charge as number), 0) },
  ],
  filters: [
    { id: "physician", label: "Physician", all: "All physicians" },
    { id: "vendor", label: "Vendor", all: "All vendors" },
    { id: "status", label: "Status", all: "All statuses" },
    { id: "patient", label: "Patient", all: "All patients" },
    { id: "employer", label: "Employer", all: "All employers" },
  ],
  records: ordersFor,
}

/* The provider channel runs on credit (28 Oct): Inlay books the test, the
   patient has it, then the practice is invoiced. A cancelled order reverses
   the charge raised at booking. Steve Benture reviews this flow before it
   is final. */
const termsDays = (terms: string) => Number(terms.match(/\d+/)?.[0] ?? 0)

const billing = () => billingFor(PRACTICE.id, practiceBilling.get())

/** What was still unpaid from earlier periods when this one closed. */
const backlogFor = (period: Period) => {
  const r = seeded(`backlog|${PRACTICE.id}|${period.key}`)
  return r() < 0.35 ? Math.round(between(r, 180, 1400) * 100) / 100 : 0
}

export const BILLING_STATEMENT: ListReport = {
  id: "statement",
  name: "Practice billing statement",
  noun: "order line",
  groupBy: "physician",
  columns: [
    { id: "date", header: "Date", format: "date" },
    { id: "patient", header: "Patient", format: "text" },
    { id: "test", header: "Test", format: "text" },
    { id: "vendor", header: "Vendor", format: "text" },
    { id: "physician", header: "Physician", format: "text" },
    { id: "line", header: "Line", format: "text", tone: (r) => (r.line === "Credit" ? "warning" : undefined) },
    { id: "charge", header: "Charge", format: "price", total: true },
    { id: "credit", header: "Credit", format: "price", total: true },
    { id: "net", header: "Net", format: "price", total: true },
  ],
  tiles: [
    { label: "Period total", format: "price", value: (rows) => rows.reduce((s, r) => s + (r.net as number), 0) },
    { label: "Credits and reversals", format: "price", value: (rows) => rows.reduce((s, r) => s + (r.credit as number), 0) },
    {
      label: "Amount due",
      format: "price",
      value: (rows) => rows.reduce((s, r) => s + (r.net as number), 0),
      note: (_, period) => {
        const b = billing()
        return `Due ${dayLabel(addDays(period.to, termsDays(b.terms)))}, ${b.grace} day grace`
      },
    },
    {
      label: "Late fee",
      format: "price",
      value: (_, period) => (backlogFor(period) * billing().lateFee) / 100,
      note: () => `${billing().lateFee}% a month on overdue balances`,
    },
    {
      label: "Outstanding backlog",
      format: "price",
      value: (_, period) => backlogFor(period),
      note: (_, period) => (backlogFor(period) ? "Unpaid from earlier periods" : "Nothing overdue"),
    },
  ],
  filters: [
    { id: "physician", label: "Physician", all: "All physicians" },
    { id: "patient", label: "Patient", all: "All patients" },
    { id: "line", label: "Line", all: "Charges and credits" },
    { id: "employer", label: "Employer", all: "All employers" },
  ],
  records: (period, ctx) =>
    ordersFor(period, ctx).flatMap((o): ListRow[] => {
      if (o.status === "Completed" || o.status === "Attended")
        return [{ ...o, line: "Charge", charge: o.price, credit: 0, net: o.price }]
      if (o.status === "Cancelled")
        return [{ ...o, line: "Credit", charge: 0, credit: o.price, net: -(o.price as number) }]
      return []
    }),
}

/* Free to paid is the whole commercial case (28 Oct), so the practice sees
   whether it works on its own panel. Counts, not revenue: the monthly and
   annual prices are still open. */
export const MEMBERSHIP: Report = {
  id: "membership",
  name: "Membership and conversion",
  typeFilter: false,
  tiles: ["activated", "paid", "conversion", "members"],
  columns: [
    { id: "invited", header: "Patients invited", format: "count", value: raw("invited") },
    { id: "activated", header: "Free app activations", format: "count", value: raw("activated") },
    { id: "paid", header: "Paid enrolments", format: "count", value: raw("paid") },
    { id: "conversion", header: "Conversion rate", format: "percent", value: rate("paid", "activated") },
    { id: "monthly", header: "Monthly", format: "count", value: raw("monthly") },
    { id: "annual", header: "Annual", format: "count", value: raw("annual") },
    { id: "cancelled", header: "Cancellations", format: "count", value: raw("cancelled") },
    { id: "members", header: "Active members at period end", format: "count", value: raw("members") },
    { id: "days", header: "Average days to enrol", format: "days", value: per("days", "paid") },
  ],
  filters: [
    {
      id: "employer",
      label: "Employer",
      all: "All employers",
      options: ({ employers }) => employers.map((e) => ({ label: e.name, value: e.id })),
    },
    {
      id: "plan",
      label: "Membership type",
      all: "Monthly and annual",
      options: [
        { label: "Monthly", value: "Monthly" },
        { label: "Annual", value: "Annual" },
      ],
    },
  ],
  counts: ({ id, n, size, part, rand, filters }) => {
    const invited = n(8, 30)
    const activated = part(invited, 0.45, 0.8)
    const paid = part(activated, 0.1, 0.35)
    const annualShare = 0.25 + rand() * 0.3
    const annual = Math.round(paid * annualShare)
    const members = size(8, 35)
    const cancelled = n(0, 3)
    const days = paid * (6 + rand() * 34)
    const plan = filters.plan
    const keep = plan === "Annual" ? annualShare : plan === "Monthly" ? 1 - annualShare : 1
    const c = {
      invited, activated, days,
      paid: plan === "Annual" ? annual : plan === "Monthly" ? paid - annual : paid,
      monthly: plan === "Annual" ? 0 : paid - annual,
      annual: plan === "Monthly" ? 0 : annual,
      cancelled: Math.round(cancelled * keep),
      members: Math.round(members * keep),
    }
    return scaled(c, shareOf(id, filters.employer, 0.1, 0.35))
  },
}

export const PRACTICE_REPORTS = [ORDER_ACTIVITY, BILLING_STATEMENT, MEMBERSHIP]

/** The dashboard's older report links, by the report that now answers them. */
export const REPORT_ALIASES: Record<string, string> = {
  enrollment: MEMBERSHIP.id,
  value: MEMBERSHIP.id,
}
