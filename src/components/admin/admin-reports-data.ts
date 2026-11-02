/* The Super Admin's three reports, from "Inlay Health, Reports by Portal"
   (30 Oct 2026): what Inlay earned per order channel, which vendors deliver,
   and what AI costs against what it brings in. All cross-practice. */

import type { Practice } from "@/components/admin/practices-store"
import {
  BILLING_REPORTS,
  PNL,
  STATES,
  VENDORS,
  catalog,
} from "@/components/admin/billing/billing-data"
import {
  type ListReport,
  type ListRow,
  type Report,
  addDays,
  countsFor,
  pickOf,
  raw,
  scaled,
  seeded,
  shareOf,
} from "@/components/provider/reports/reports-data"

const between = (rand: () => number, lo: number, hi: number) => lo + rand() * (hi - lo)
const total = (rows: ListRow[], key: string) =>
  rows.reduce((s, r) => s + (typeof r[key] === "number" ? (r[key] as number) : 0), 0)

const TAX = BILLING_REPORTS.find((r) => r.id === "tax")!

/* 7. Two sources of income, one source of payment, kept apart (28 Oct): a
   P&L per channel and the consolidated net in the Total row. Seeded as the
   Billing statement's P&L, so both read the same month the same. Tax is a
   placeholder until the multi-state treatment is settled. */
export function channelRevenue(practices: Practice[]): Report {
  return {
    id: PNL.id,
    name: "Channel revenue and margin",
    rows: PNL.rows,
    tiles: ["testing", "gross", "membership", "net"],
    columns: [
      { id: "orders", header: "Orders", format: "count", value: raw("orders") },
      { id: "testing", header: "Test revenue", format: "currency", value: raw("testing") },
      { id: "cost", header: "Vendor cost", format: "currency", value: raw("cost") },
      { id: "gross", header: "Gross margin", format: "currency", value: (c) => c.testing - c.cost },
      { id: "tax", header: "Tax collected", format: "currency", value: raw("tax") },
      { id: "membership", header: "Membership revenue", format: "currency", value: raw("membership") },
      { id: "ai", header: "AI credit revenue", format: "currency", value: raw("ai") },
      { id: "refunds", header: "Refunds", format: "currency", value: raw("refunds") },
      { id: "reviews", header: "Physician review fees", format: "currency", value: raw("reviews") },
      {
        id: "net",
        header: "Net",
        format: "currency",
        value: (c) => c.testing + c.membership + c.ai - c.cost - c.reviews - c.refunds,
      },
    ],
    filters: [
      { id: "row", label: "Channel", all: "Both channels" },
      { id: "vendor", label: "Vendor", all: "All vendors", options: VENDORS.map((v) => ({ label: v.name, value: v.id })) },
      { id: "state", label: "State", all: "All states", options: STATES.map((s) => ({ label: s, value: s })) },
      {
        id: "practice",
        label: "Practice",
        all: "All practices",
        options: practices.map((p) => ({ label: p.name, value: p.id })),
      },
    ],
    counts: (draw) => {
      const base = PNL.counts(draw)
      const { id, rand, period, filters } = draw
      const orders = Math.round(base.testing / (id === "provider" ? 95 + rand() * 45 : 120 + rand() * 60))
      /* Sales tax is charged on the patient price only. */
      const tax =
        id === "patient"
          ? (filters.state ? [filters.state] : STATES).reduce(
              (s, state) => s + countsFor(TAX, state, period, null).tax,
              0
            )
          : 0
      const testLines = scaled(
        { orders, testing: base.testing, cost: base.cost },
        shareOf(id, filters.vendor, 0.15, 0.45)
      )
      const c = scaled(
        { ...base, ...testLines },
        shareOf(id, filters.state, 0.08, 0.3)
      )
      return scaled({ ...c, tax }, shareOf(id, filters.practice, 0.04, 0.18), ["tax"])
    },
  }
}

/* 8. Which lab and imaging partners deliver (26 Oct): credentialing keeps
   the practice out of court, and the cheapest good vendor can only be
   served up if it is measured. Pricing and availability are per state
   (28 Oct), so a row is a vendor in one state. */
const CREDENTIALS = ["Verified", "Review due", "Expired"] as const

export const VENDOR_PERFORMANCE: ListReport = {
  id: "vendors",
  name: "Vendor performance",
  noun: "vendor",
  columns: [
    { id: "vendor", header: "Vendor", format: "text" },
    { id: "type", header: "Type", format: "text" },
    { id: "state", header: "State", format: "text" },
    { id: "routed", header: "Orders routed", format: "count", total: true },
    { id: "completed", header: "Completed", format: "count", total: true },
    {
      id: "rate",
      header: "Completion rate",
      format: "percent",
      total: (rows) => (total(rows, "routed") ? (total(rows, "completed") / total(rows, "routed")) * 100 : 0),
    },
    { id: "cancelled", header: "Cancelled", format: "count", total: true },
    { id: "noShow", header: "No show", format: "count", total: true },
    { id: "rescheduled", header: "Rescheduled", format: "count", total: true },
    { id: "fees", header: "Fees applied", format: "price", total: true },
    {
      id: "turnaround",
      header: "Average turnaround",
      format: "days",
      total: (rows) => (total(rows, "completed") ? total(rows, "turnaroundSum") / total(rows, "completed") : 0),
    },
    {
      id: "cost",
      header: "Average contracted cost",
      format: "price",
      total: (rows) => (total(rows, "routed") ? total(rows, "costSum") / total(rows, "routed") : 0),
    },
    { id: "failures", header: "Availability failures", format: "count", total: true },
    {
      id: "credential",
      header: "Credential status",
      format: "text",
      tone: (r) => (r.credential === "Verified" ? "success" : r.credential === "Expired" ? "danger" : "warning"),
    },
    { id: "review", header: "Review date", format: "date" },
  ],
  tiles: [
    { label: "Orders routed", format: "count", value: (rows) => total(rows, "routed") },
    {
      label: "Completion rate",
      format: "percent",
      value: (rows) => (total(rows, "routed") ? (total(rows, "completed") / total(rows, "routed")) * 100 : 0),
    },
    {
      label: "Average turnaround",
      format: "days",
      value: (rows) => (total(rows, "completed") ? total(rows, "turnaroundSum") / total(rows, "completed") : 0),
    },
    { label: "Availability failures", format: "count", value: (rows) => total(rows, "failures") },
  ],
  filters: [
    { id: "vendor", label: "Vendor", all: "All vendors" },
    { id: "state", label: "State", all: "All states" },
    { id: "type", label: "Test type", all: "Labs and imaging" },
    { id: "credential", label: "Credential status", all: "Any credential status" },
  ],
  records: (period) => {
    const tests = catalog.get()
    return VENDORS.flatMap((v) => {
      const served = STATES.filter((s) => seeded(`serves|${v.id}|${s}`)() < 0.65)
      const rates = tests.filter((t) => t.vendor === v.id).map((t) => t.rate)
      const meanRate = rates.length ? rates.reduce((s, x) => s + x, 0) / rates.length : 0
      const lab = v.category === "Lab"
      return served.map((state) => {
        const r = seeded(`vendor|${v.id}|${state}|${period.key}`)
        const routed = Math.round(period.months * between(r, lab ? 20 : 6, lab ? 90 : 30))
        const cancelled = Math.round(routed * between(r, 0.01, 0.06))
        const noShow = Math.round(routed * between(r, 0, 0.04))
        const rescheduled = Math.round(routed * between(r, 0, 0.05))
        const completed = Math.max(0, routed - cancelled - noShow - Math.round(routed * between(r, 0, 0.06)))
        const turnaround = lab ? between(r, 1.2, 3.5) : between(r, 3, 9)
        const cost = meanRate * between(r, 0.9, 1.15)
        const c = seeded(`credential|${v.id}|${state}`)()
        const credential = c < 0.75 ? CREDENTIALS[0] : c < 0.95 ? CREDENTIALS[1] : CREDENTIALS[2]
        return {
          id: `${v.id}-${state}`,
          vendor: v.name,
          type: v.category,
          state,
          routed,
          completed,
          rate: routed ? (completed / routed) * 100 : 0,
          cancelled,
          noShow,
          rescheduled,
          fees: Math.round(cancelled * between(r, 0.2, 0.6)) * 35,
          turnaround,
          turnaroundSum: turnaround * completed,
          cost,
          costSum: cost * routed,
          failures: Math.round(between(r, 0, 2.5) * period.months),
          credential,
          review: addDays(
            period.to,
            credential === "Verified"
              ? 30 + Math.floor(r() * 270)
              : credential === "Review due"
                ? Math.floor(r() * 30)
                : -Math.floor(5 + r() * 60)
          ),
        }
      })
    })
  },
}

/* 9. AI consumption against the dollar cap (22 Oct), with what the overage
   brought in. Kiran's estimate (27 Oct): a dollar buys five or six
   questions. The overage price is not set yet. */
const AI_MODELS = ["Claude Sonnet 5.5"] as const
/** The paid allowance as dollars a member a week. */
const WEEKLY_CAP = 7

export function aiUsage(practices: Practice[]): ListReport {
  return {
    id: "ai-usage",
    name: "AI usage and cost",
    noun: "practice",
    columns: [
      { id: "practice", header: "Practice", format: "text" },
      { id: "users", header: "Members using Ask Inlay", format: "count", total: true },
      { id: "questions", header: "Questions asked", format: "count", total: true },
      { id: "spend", header: "AI spend", format: "price", total: true },
      { id: "cap", header: "Cap", format: "price", total: true },
      { id: "remaining", header: "Allowance remaining", format: "price", total: true },
      { id: "over", header: "Members over cap", format: "count", total: true },
      { id: "overage", header: "Overage incurred", format: "price", total: true },
      { id: "charged", header: "Overage charged", format: "price", total: true },
      {
        id: "each",
        header: "Cost per question",
        format: "price",
        total: (rows) => (total(rows, "questions") ? total(rows, "spend") / total(rows, "questions") : 0),
      },
      { id: "model", header: "Model and version", format: "text" },
    ],
    tiles: [
      { label: "Questions asked", format: "count", value: (rows) => total(rows, "questions") },
      { label: "AI spend", format: "price", value: (rows) => total(rows, "spend") },
      { label: "Overage charged", format: "price", value: (rows) => total(rows, "charged") },
      {
        label: "Average cost per question",
        format: "price",
        value: (rows) => (total(rows, "questions") ? total(rows, "spend") / total(rows, "questions") : 0),
      },
    ],
    filters: [
      { id: "practice", label: "Practice", all: "All practices" },
      { id: "model", label: "Model", all: "All models" },
    ],
    records: (period) =>
      practices
        .filter((p) => p.status === "Active")
        .map((p) => {
          const r = seeded(`ai|${p.id}|${period.key}`)
          const weeks = (period.months * 30) / 7
          const users = Math.round(between(r, 8, 70))
          const questions = Math.round(users * weeks * between(r, 4, 14))
          const each = between(r, 0.14, 0.24)
          const spend = questions * each
          const cap = users * weeks * WEEKLY_CAP
          const over = r() < 0.5 ? 0 : 1 + Math.floor(r() * 4)
          const overage = over * weeks * between(r, 0.5, 3)
          return {
            id: p.id,
            practice: p.name,
            users,
            questions,
            spend,
            cap,
            remaining: Math.max(0, cap - spend),
            over,
            overage,
            charged: overage * between(r, 0.7, 1),
            each,
            model: pickOf(AI_MODELS, r),
          }
        }),
  }
}
