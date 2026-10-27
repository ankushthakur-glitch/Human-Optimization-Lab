/* The clinic manager's reports: how the practice is doing as a whole, one
   row per provider. Five are the practice's own (enrollment and activation,
   engagement by encounter type, outcomes, alert volume, value and renewal);
   membership conversion is shared with the provider portal, so both
   portals show the same numbers for it. Built on the
   provider Reports engine: raw counts per row, every column worked out from
   them, numbers seeded by report, provider and period. */

import {
  PLAN_PRICE,
  REPORTS,
  type Report,
  per,
  rate,
  raw,
} from "@/components/provider/reports/reports-data"

const shared = (id: string) => REPORTS.find((r) => r.id === id)!

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

export const PRACTICE_REPORTS: Report[] = [
  ENROLLMENT,
  ENCOUNTERS,
  OUTCOMES,
  ALERTS,
  VALUE,
  shared("membership"),
]
