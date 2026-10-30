/* Inlay's billing, from the "Inlay Health, Billing" deck and the 29 Oct 2026
   walkthrough. Two sources of income, one source of payment: practices are
   invoiced for the tests their providers order, patients pay in the app for
   tests, memberships and AI credit, and Inlay pays every vendor its
   contracted rate. Everything above that rate is margin, and the rate is
   never shown to a practice or a patient: both see the Inlay price only.
   Practices pay no access fee, and physicians never earn from orders.
   Sample data, seeded so a month always reads the same. */

import type { Practice } from "@/components/admin/practices-store"
import { createCollection } from "@/components/practice/collection-store"
import {
  type Report,
  raw,
  seeded,
} from "@/components/provider/reports/reports-data"

export const money = (value: number, cents = true) =>
  `${value < 0 ? "-" : ""}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  })}`

/* -------------------------------------------------------------------------- */
/*  Vendors                                                                    */
/* -------------------------------------------------------------------------- */

export const TEST_CATEGORIES = ["Lab", "Imaging"] as const
export type TestCategory = (typeof TEST_CATEGORIES)[number]

/* A brand-new vendor is connected by the development team first; after that
   its catalogue is managed in the portal. */
export const VENDORS = [
  { id: "quest", name: "Quest Diagnostics", category: "Lab" },
  { id: "labcorp", name: "Labcorp", category: "Lab" },
  { id: "bodyspec", name: "BodySpec", category: "Imaging" },
  { id: "radnet", name: "RadNet", category: "Imaging" },
] as const satisfies readonly {
  id: string
  name: string
  category: TestCategory
}[]

export const vendorName = (id: string) =>
  VENDORS.find((v) => v.id === id)?.name ?? id

/** The states the sample practices and patients order from. */
export const STATES = ["MI", "OH", "IN", "FL", "TX", "CA", "NY"] as const

/** The tax preview's example state; Stripe Tax works out the real rate. */
export const SAMPLE_TAX = { state: "FL", rate: 7 }

/* -------------------------------------------------------------------------- */
/*  Catalogue and pricing                                                      */
/* -------------------------------------------------------------------------- */

/** Who can order a test: practices from the patient chart, patients from
    the app, or both. */
export const ORDERED_BY = ["Practices and patients", "Practices", "Patients"]

export const TEST_STATUSES = ["Live", "Draft", "Inactive"] as const

export type RegionalRate = { state: string; rate: number }

export type CatalogTest = {
  id: string
  name: string
  vendor: string
  category: TestCategory
  /** These arrive with the vendor's test: code, specimen, turnaround. */
  code: string
  specimen: string
  turnaround: string
  /** The states the vendor serves; empty means every state. */
  states: string[]
  /** States practices order from where this test has no price yet. */
  unpriced: string[]
  /** What Inlay pays the vendor per order, typed once. */
  rate: number
  /** Inlay's margin on the rate, typed once; the price is worked out. */
  margin: number
  /** A different contracted rate in some states. */
  overrides: RegionalRate[]
  orderedBy: string
  /** Sales tax on the patient price, where the state requires it. */
  taxable: boolean
  status: (typeof TEST_STATUSES)[number]
}

export const priceWith = (rate: number, margin: number) =>
  Math.round(rate * (1 + margin / 100) * 100) / 100

/** The one price practices and patients both see. */
export const inlayPrice = (t: Pick<CatalogTest, "rate" | "margin">) =>
  priceWith(t.rate, t.margin)

export const statesLabel = (t: Pick<CatalogTest, "states">) =>
  t.states.length === 0 ? "All" : t.states.join(", ")

type SeedTest = Omit<
  CatalogTest,
  | "id"
  | "overrides"
  | "status"
  | "unpriced"
  | "states"
  | "orderedBy"
  | "taxable"
> &
  Partial<CatalogTest>

const SEED_TESTS: SeedTest[] = [
  {
    name: "Comprehensive metabolic panel",
    vendor: "quest",
    category: "Lab",
    code: "10231, CPT 80053",
    specimen: "Serum, fasting",
    turnaround: "1 to 2 days",
    rate: 18,
    margin: 120,
  },
  /* The same test from a second vendor, at its own rate and the same price. */
  {
    name: "Comprehensive metabolic panel",
    vendor: "labcorp",
    category: "Lab",
    code: "322000, CPT 80053",
    specimen: "Serum, fasting",
    turnaround: "1 to 2 days",
    rate: 16.5,
    margin: 140,
  },
  {
    name: "Lipid panel",
    vendor: "quest",
    category: "Lab",
    code: "7600, CPT 80061",
    specimen: "Serum, fasting",
    turnaround: "1 to 2 days",
    rate: 14,
    margin: 125,
  },
  {
    name: "Hemoglobin A1C",
    vendor: "quest",
    category: "Lab",
    code: "496, CPT 83036",
    specimen: "Whole blood",
    turnaround: "1 day",
    rate: 12,
    margin: 130,
  },
  {
    name: "Lipoprotein(a)",
    vendor: "labcorp",
    category: "Lab",
    code: "120188, CPT 83695",
    specimen: "Serum",
    turnaround: "3 to 5 days",
    rate: 22,
    margin: 120,
  },
  {
    name: "Thyroid panel",
    vendor: "labcorp",
    category: "Lab",
    code: "235010, CPT 84443",
    specimen: "Serum",
    turnaround: "2 to 3 days",
    rate: 22,
    margin: 120,
    status: "Draft",
  },
  {
    name: "Multi-cancer early detection",
    vendor: "quest",
    category: "Lab",
    code: "39627",
    specimen: "Whole blood",
    turnaround: "10 to 14 days",
    rate: 690,
    margin: 30,
    orderedBy: "Patients",
    taxable: true,
  },
  {
    name: "DEXA, full body composition",
    vendor: "bodyspec",
    category: "Imaging",
    code: "CPT 76499",
    specimen: "Scan",
    turnaround: "Same day",
    rate: 95,
    margin: 60,
    states: ["MI", "OH", "IN", "FL"],
    unpriced: ["TX", "CA"],
    taxable: true,
  },
  {
    name: "Resting metabolic rate",
    vendor: "bodyspec",
    category: "Imaging",
    code: "CPT 94690",
    specimen: "Breath test",
    turnaround: "Same day",
    rate: 75,
    margin: 60,
    states: ["MI"],
    taxable: true,
  },
  {
    name: "Coronary calcium score CT",
    vendor: "radnet",
    category: "Imaging",
    code: "CPT 75571",
    specimen: "Scan",
    turnaround: "3 to 5 days",
    rate: 99,
    margin: 50,
    states: ["CA", "NY", "FL"],
    overrides: [{ state: "CA", rate: 89 }],
  },
  {
    name: "MRI knee, without contrast",
    vendor: "radnet",
    category: "Imaging",
    code: "CPT 73721",
    specimen: "Scan",
    turnaround: "2 to 4 days",
    rate: 310,
    margin: 45,
    states: ["CA", "NY"],
    orderedBy: "Practices",
  },
]

export const catalog = createCollection<CatalogTest>(
  "hol-billing-catalog",
  SEED_TESTS.map((t, i) => ({
    states: [],
    unpriced: [],
    overrides: [],
    orderedBy: ORDERED_BY[0],
    taxable: false,
    status: "Live",
    ...t,
    id: `TST${String(i + 1).padStart(3, "0")}`,
  })),
  "catalog-v2"
)

/* -------------------------------------------------------------------------- */
/*  Practice billing                                                           */
/* -------------------------------------------------------------------------- */

export const INVOICE_PERIODS = ["Weekly", "Monthly", "Per order"] as const
export const PAYMENT_TERMS = [
  "On receipt",
  "Net 7",
  "Net 15",
  "Net 30",
] as const
export const PRACTICE_METHODS = [
  "Bank transfer",
  "Direct debit",
  "Card",
] as const

/** One practice's billing settings: every invoice it receives is built
    from these, nothing is decided invoice by invoice. */
export type PracticeBilling = {
  id: string
  period: string
  terms: string
  grace: number
  /** Percent of the overdue balance, a month. */
  lateFee: number
  method: string
}

export const DEFAULT_BILLING: Omit<PracticeBilling, "id"> = {
  period: "Monthly",
  terms: "Net 15",
  grace: 5,
  lateFee: 1.5,
  method: "Bank transfer",
}

/** Each practice's saved settings; a practice with none uses the defaults. */
export const practiceBilling = createCollection<PracticeBilling>(
  "hol-billing-practices",
  [],
  "practice-billing-v1"
)

export function billingFor(
  practiceId: string,
  saved: PracticeBilling[]
): PracticeBilling {
  const r = seeded(`billing|${practiceId}`)
  return (
    saved.find((b) => b.id === practiceId) ?? {
      ...DEFAULT_BILLING,
      id: practiceId,
      /* A few sample practices already run on their own terms. */
      ...(r() < 0.25
        ? {
            period: "Weekly",
            terms: "On receipt",
            grace: 3,
            method: "Direct debit",
          }
        : r() < 0.15
          ? { period: "Per order", terms: "On receipt", method: "Card" }
          : {}),
    }
  )
}

export function saveBilling(billing: PracticeBilling) {
  if (practiceBilling.get().some((b) => b.id === billing.id))
    practiceBilling.patch(billing.id, billing)
  else practiceBilling.add([billing])
}

/* -------------------------------------------------------------------------- */
/*  Invoices                                                                   */
/* -------------------------------------------------------------------------- */

export const INVOICE_STATUSES = [
  "Paid",
  "Due",
  "In grace",
  "Past due",
  "Draft",
] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

export type InvoiceLine = {
  id: string
  date: string
  /** The patient's ID only: names stay in the practice's own portal. */
  patient: string
  test: string
  vendor: string
  provider: string
  price: number
  /** The contracted rate, for the admin's margin line only. */
  cost: number
}

export type InvoiceCredit = { id: string; reason: string; amount: number }

export type Invoice = {
  id: string
  practiceId: string
  practiceName: string
  period: string
  issued: string
  due: string
  terms: string
  grace: number
  method: string
  status: InvoiceStatus
  /** Days late, for an invoice past due or in its grace period. */
  daysLate: number
  lines: InvoiceLine[]
  credits: InvoiceCredit[]
  lateFee: number
  /** How the practice paid, once the admin records it. */
  payment?: InvoicePayment
}

/** A payment the admin records against an invoice, with its proof. */
export type InvoicePayment = {
  amount: number
  /** ISO day the money arrived. */
  date: string
  method: string
  reference: string
  note: string
  /** The remittance or bank slip, kept as a data URL. */
  file?: { name: string; size: number; url: string }
}

export const RECEIPT_METHODS = [...PRACTICE_METHODS, "Check", "Wire"] as const

export const invoiceSubtotal = (i: Invoice) =>
  i.lines.reduce((sum, l) => sum + l.price, 0)
export const invoiceCredits = (i: Invoice) =>
  i.credits.reduce((sum, c) => sum + c.amount, 0)
export const invoiceTotal = (i: Invoice) =>
  Math.max(0, invoiceSubtotal(i) - invoiceCredits(i) + i.lateFee)
export const invoiceCost = (i: Invoice) =>
  i.lines.reduce((sum, l) => sum + l.cost, 0)

/** Still to be paid: due, in grace or past due. */
export const isOpen = (i: Invoice) =>
  i.status === "Due" || i.status === "In grace" || i.status === "Past due"

const PROVIDERS = [
  "Dr. Reed",
  "Dr. Shah",
  "Dr. Carter",
  "Dr. Mehta",
  "Dr. Ortiz",
]

/* The months invoiced so far, newest first. */
const MONTHS = [
  {
    key: "2026-10",
    label: "October 2026",
    issued: "2026-10-31",
    due: "2026-11-15",
  },
  {
    key: "2026-09",
    label: "September 2026",
    issued: "2026-10-01",
    due: "2026-10-16",
  },
  {
    key: "2026-08",
    label: "August 2026",
    issued: "2026-09-01",
    due: "2026-09-16",
  },
]

export const PERIODS = MONTHS.map((m) => m.label)

const practiceTests = () =>
  SEED_TESTS.filter((t) => (t.orderedBy ?? ORDERED_BY[0]) !== "Patients")

/** Every practice's invoices for the period: the tests its providers
    ordered, a credit note for orders that never happened, a late fee once
    the grace period is used. Patients are never billed for any of it. */
export function invoicesFor(
  practices: Practice[],
  saved: PracticeBilling[]
): Invoice[] {
  const tests = practiceTests()
  return (
    practices
      .filter((p) => p.status === "Active")
      .slice(0, 14)
      .flatMap((p, pi) => {
        const billing = billingFor(p.id, saved)
        return MONTHS.map((m, mi) => {
          const r = seeded(`${p.id}|${m.key}`)
          const count = 4 + Math.floor(r() * 10)
          const lines: InvoiceLine[] = Array.from(
            { length: count },
            (_, li) => {
              const t = tests[Math.floor(r() * tests.length)]
              const day = String(1 + Math.floor(r() * 27)).padStart(2, "0")
              return {
                id: `L${li + 1}`,
                date: `${m.key}-${day}`,
                patient: `P-${10200 + Math.floor(r() * 900)}`,
                test: t.name,
                vendor: vendorName(t.vendor),
                provider: PROVIDERS[Math.floor(r() * PROVIDERS.length)],
                price: priceWith(t.rate, t.margin),
                cost: t.rate,
              }
            }
          )
          lines.sort((a, b) => a.date.localeCompare(b.date))
          const credits: InvoiceCredit[] =
            r() < 0.35
              ? [
                  {
                    id: `CRN-${String(30 + pi).padStart(4, "0")}`,
                    reason: "Order cancelled before collection, last period",
                    amount: Math.round((25 + r() * 120) * 100) / 100,
                  },
                ]
              : []
          /* October is still open; September is mostly paid, a few late. */
          const status: InvoiceStatus =
            mi === 0
              ? pi % 5 === 4
                ? "Draft"
                : "Due"
              : mi === 1 && pi % 4 === 2
                ? "Past due"
                : mi === 1 && pi % 6 === 1
                  ? "In grace"
                  : "Paid"
          const subtotal = lines.reduce((s, l) => s + l.price, 0)
          return {
            id: `INV-${m.key.replace("-", "")}-${String(pi + 1).padStart(3, "0")}`,
            practiceId: p.id,
            practiceName: p.name,
            period: m.label,
            issued: m.issued,
            due: m.due,
            terms: billing.terms,
            grace: billing.grace,
            method: billing.method,
            status,
            daysLate:
              status === "Past due" ? 14 : status === "In grace" ? 1 : 0,
            lines,
            credits,
            lateFee:
              status === "Past due"
                ? Math.round(subtotal * billing.lateFee) / 100
                : 0,
          }
        })
      })
      /* Newest period first, each practice once within it. */
      .sort((a, b) => b.issued.localeCompare(a.issued))
  )
}

/** What the admin has changed on an invoice: paid, sent, credits added. */
export type InvoiceEdit = {
  id: string
  status?: InvoiceStatus
  credits?: InvoiceCredit[]
  payment?: InvoicePayment
}

export const invoiceEdits = createCollection<InvoiceEdit>(
  "hol-billing-invoice-edits",
  [],
  "edits-v2"
)

/** The invoices with the admin's changes laid over them. */
export function applyEdits(list: Invoice[], edits: InvoiceEdit[]) {
  const byId = new Map(edits.map((e) => [e.id, e]))
  return list.map((i) => {
    const e = byId.get(i.id)
    if (!e) return i
    return {
      ...i,
      status: e.status ?? i.status,
      credits: [...i.credits, ...(e.credits ?? [])],
      payment: e.payment ?? i.payment,
    }
  })
}

/** Records a change, starting the invoice's edit row when it has none. */
export function editInvoice(id: string, changes: Omit<InvoiceEdit, "id">) {
  if (invoiceEdits.get().some((e) => e.id === id))
    invoiceEdits.patch(id, changes)
  else invoiceEdits.add([{ id, ...changes }])
}

/* -------------------------------------------------------------------------- */
/*  Vendor payouts                                                             */
/* -------------------------------------------------------------------------- */

export type PayoutLine = {
  id: string
  practice: string
  provider: string
  orders: number
  vendorCost: number
  billed: number
}

export type PayoutStatus = "Paid" | "Ready" | "Accruing"

/** One order line, as Inlay recorded it and as the vendor billed it. */
export type PayoutOrder = {
  id: string
  date: string
  practice: string
  patient: string
  test: string
  ours: number
  theirs: number
}

export type Payout = {
  id: string
  vendor: string
  vendorName: string
  category: TestCategory
  month: string
  orders: number
  /** What Inlay owes at the contracted rate, from its own order records. */
  vendorCost: number
  /** The vendor's own invoice. */
  theirInvoice: number
  /** Late cancel and reschedule fees, only when the vendor's policy has them. */
  fees: number
  billed: number
  status: PayoutStatus
  lines: PayoutLine[]
  /** The vendor's own invoice number. */
  invoiceNo: string
  invoiceDate: string
  orderLines: PayoutOrder[]
}

export const payoutMargin = (p: { billed: number; vendorCost: number }) =>
  p.billed - p.vendorCost

/** Every order behind a payout, line by line on both sides. Each practice's
    cost is spread over its orders; imaging fees add a late cancellation
    line. */
function payoutOrders(
  v: (typeof VENDORS)[number],
  month: string,
  lines: PayoutLine[],
  fees: number
): PayoutOrder[] {
  const r = seeded(`orders|${v.id}|${month}`)
  const tests = SEED_TESTS.filter((t) => t.vendor === v.id).map((t) => t.name)
  const out: PayoutOrder[] = []
  let n = 0
  const next = () => {
    n += 1
    return `${v.id.slice(0, 1).toUpperCase()}${month.replace("-", "").slice(2)}-${String(n).padStart(3, "0")}`
  }
  const day = () =>
    `${month}-${String(1 + Math.floor(r() * 27)).padStart(2, "0")}`
  const patient = () => `P-${10200 + Math.floor(r() * 900)}`
  for (const l of lines) {
    const each = Math.floor(l.vendorCost / l.orders)
    for (let i = 0; i < l.orders; i++) {
      const amount =
        i === l.orders - 1 ? l.vendorCost - each * (l.orders - 1) : each
      out.push({
        id: next(),
        date: day(),
        practice: l.practice,
        patient: patient(),
        test: tests[Math.floor(r() * tests.length)] ?? "Test",
        ours: amount,
        theirs: amount,
      })
    }
  }
  if (fees)
    out.push({
      id: next(),
      date: day(),
      practice: lines[0]?.practice ?? "",
      patient: patient(),
      test: "Late cancellation fee",
      ours: fees,
      theirs: fees,
    })
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

/** A payout the admin has paid. */
export type PayoutResolution = {
  id: string
  status: PayoutStatus
  /** The amount paid, once paid. */
  paid?: number
}

export const payoutResolutions = createCollection<PayoutResolution>(
  "hol-billing-payout-resolutions",
  [],
  "resolutions-v2"
)

export function resolvePayout(change: PayoutResolution) {
  if (payoutResolutions.get().some((r) => r.id === change.id))
    payoutResolutions.patch(change.id, change)
  else payoutResolutions.add([change])
}

/** What Inlay owes each vendor a month, split by practice and provider. */
export function payoutsFor(practices: Practice[]): Payout[] {
  const active = practices.filter((p) => p.status === "Active").slice(0, 8)
  return MONTHS.flatMap((m, mi) =>
    VENDORS.map((v) => {
      const r = seeded(`${v.id}|${m.key}`)
      const lines: PayoutLine[] = active
        .filter(() => r() < 0.7)
        .map((p, i) => {
          const orders = 2 + Math.floor(r() * 14)
          const vendorCost = Math.round(
            orders * (v.category === "Lab" ? 14 + r() * 10 : 80 + r() * 120)
          )
          return {
            id: `${p.id}-${i}`,
            practice: p.name,
            provider: PROVIDERS[Math.floor(r() * PROVIDERS.length)],
            orders,
            vendorCost,
            billed: Math.round(vendorCost * (1.6 + r() * 0.6)),
          }
        })
      const vendorCost = lines.reduce((s, l) => s + l.vendorCost, 0)
      const fees = v.category === "Imaging" ? Math.floor(r() * 3) * 35 : 0
      const orderLines = payoutOrders(v, m.key, lines, fees)
      return {
        id: `${v.id}-${m.key}`,
        vendor: v.id,
        vendorName: v.name,
        category: v.category,
        month: m.label,
        orders: lines.reduce((s, l) => s + l.orders, 0),
        vendorCost,
        theirInvoice: vendorCost + fees,
        fees,
        billed: lines.reduce((s, l) => s + l.billed, 0),
        status: mi === 0 ? "Accruing" : mi === 2 ? "Paid" : "Ready",
        lines,
        invoiceNo: `${v.id.slice(0, 2).toUpperCase()}-${m.key.replace("-", "").slice(2)}${String(
          4400 + VENDORS.findIndex((x) => x.id === v.id) * 37
        )}`,
        invoiceDate: m.issued,
        orderLines,
      }
    })
  )
}

/* -------------------------------------------------------------------------- */
/*  Physician review fees                                                      */
/* -------------------------------------------------------------------------- */

/* Physicians are paid for documented quarterly reviews, under a separate
   agreement with Inlay. Fees are for work performed and documented, never
   tied to how much testing the practice orders. */

export const REVIEW_FEE = 40

export const REVIEW_QUARTERS = ["Q3 2026", "Q2 2026"] as const

export type Review = {
  id: string
  patient: string
  date: string
  documented: boolean
}

export type ReviewFee = {
  id: string
  physician: string
  practice: string
  quarter: string
  reviews: Review[]
  paid: boolean
}

export const reviewFeeEdits = createCollection<{
  id: string
  paid?: boolean
  /** Reviews whose documentation the admin has since checked. */
  verified?: string[]
}>("hol-billing-review-fees", [], "reviews-v1")

/** Each physician's reviews a quarter, with the admin's checks on them. */
export function reviewFeesFor(
  practices: Practice[],
  edits: { id: string; paid?: boolean; verified?: string[] }[]
): ReviewFee[] {
  const byId = new Map(edits.map((e) => [e.id, e]))
  return practices
    .filter((p) => p.status === "Active")
    .slice(0, 4)
    .flatMap((p, pi) =>
      REVIEW_QUARTERS.flatMap((quarter, qi) =>
        [0, 1].map((k) => {
          const r = seeded(`reviews|${p.id}|${quarter}|${k}`)
          const id = `RF-${p.id}-${qi}${k}`
          const count = 6 + Math.floor(r() * 14)
          /* The open quarter has a few reviews still missing their notes. */
          const missing =
            qi === 0 && (pi + k) % 2 === 1 ? 1 + Math.floor(r() * 3) : 0
          const month = qi === 0 ? ["07", "08", "09"] : ["04", "05", "06"]
          const edit = byId.get(id)
          const reviews: Review[] = Array.from({ length: count }, (_, i) => ({
            id: `${id}-${i + 1}`,
            patient: `P-${10200 + Math.floor(r() * 900)}`,
            date: `2026-${month[Math.floor(r() * 3)]}-${String(1 + Math.floor(r() * 27)).padStart(2, "0")}`,
            documented:
              i >= missing ||
              Boolean(edit?.verified?.includes(`${id}-${i + 1}`)),
          })).sort((a, b) => a.date.localeCompare(b.date))
          return {
            id,
            physician: PROVIDERS[(pi * 2 + k) % PROVIDERS.length],
            practice: p.name,
            quarter,
            reviews,
            paid: edit?.paid ?? qi === 1,
          }
        })
      )
    )
}

export const documented = (f: ReviewFee) =>
  f.reviews.filter((r) => r.documented).length
export const reviewTotal = (f: ReviewFee) => documented(f) * REVIEW_FEE

/* -------------------------------------------------------------------------- */
/*  Reports                                                                    */
/* -------------------------------------------------------------------------- */

const vendorsIn = (category: TestCategory) =>
  VENDORS.filter((v) => v.category === category).map(({ id, name }) => ({
    id,
    name,
  }))

const revenue = (category: TestCategory): Report => ({
  id: `revenue-${category.toLowerCase()}`,
  name: `Monthly revenue per ${category === "Lab" ? "lab" : "imaging center"}`,
  rows: { header: "Vendor", items: vendorsIn(category) },
  tiles: ["orders", "billed", "cost", "margin"],
  columns: [
    { id: "orders", header: "Orders", format: "count", value: raw("orders") },
    {
      id: "practice",
      header: "Provider channel",
      format: "count",
      value: raw("practice"),
    },
    {
      id: "patient",
      header: "Patient channel",
      format: "count",
      value: raw("patient"),
    },
    {
      id: "billed",
      header: "Revenue",
      format: "currency",
      value: raw("billed"),
    },
    {
      id: "cost",
      header: "Vendor cost",
      format: "currency",
      value: raw("cost"),
    },
    {
      id: "margin",
      header: "Margin",
      format: "currency",
      value: (c) => c.billed - c.cost,
    },
  ],
  counts: ({ n, part, rand }) => {
    const orders = n(
      category === "Lab" ? 120 : 30,
      category === "Lab" ? 420 : 110
    )
    const practice = part(orders, 0.4, 0.7)
    const cost =
      orders * (category === "Lab" ? 14 + rand() * 8 : 80 + rand() * 120)
    return {
      orders,
      practice,
      patient: orders - practice,
      cost,
      billed: cost * (1.6 + rand() * 0.6),
    }
  },
})

/* Two sources of income: the Total row is the consolidated position. */
const CHANNELS = [
  { id: "provider", name: "Provider channel" },
  { id: "patient", name: "Patient channel" },
]

export const PNL: Report = {
  id: "pnl",
  name: "Profit and loss by channel",
  rows: { header: "Channel", items: CHANNELS },
  tiles: ["revenue", "cost", "refunds", "net"],
  columns: [
    {
      id: "testing",
      header: "Testing revenue",
      format: "currency",
      value: raw("testing"),
    },
    {
      id: "membership",
      header: "Membership revenue",
      format: "currency",
      value: raw("membership"),
    },
    { id: "ai", header: "AI credit", format: "currency", value: raw("ai") },
    {
      id: "revenue",
      header: "Total revenue",
      format: "currency",
      value: (c) => c.testing + c.membership + c.ai,
    },
    {
      id: "cost",
      header: "Vendor cost",
      format: "currency",
      value: raw("cost"),
    },
    {
      id: "reviews",
      header: "Physician review fees",
      format: "currency",
      value: raw("reviews"),
    },
    {
      id: "refunds",
      header: "Refunds and credits",
      format: "currency",
      value: raw("refunds"),
    },
    {
      id: "net",
      header: "Net",
      format: "currency",
      value: (c) =>
        c.testing + c.membership + c.ai - c.cost - c.reviews - c.refunds,
    },
  ],
  counts: ({ id, n, rand }) => {
    /* The provider channel is testing only: no memberships or AI credit. */
    const provider = id === "provider"
    const testing = n(provider ? 40000 : 15000, provider ? 52000 : 22000)
    return {
      testing,
      membership: provider ? 0 : n(9000, 13000),
      ai: provider ? 0 : n(800, 1600),
      cost: testing * (0.72 + rand() * 0.08),
      /* Review fees are paid on the provider channel only. */
      reviews: provider ? n(1000, 1400) : 0,
      refunds: n(100, 320),
    }
  },
}

const BILLING: Report[] = [
  PNL,
  {
    id: "margin-per-test",
    name: "Margin per test",
    rows: {
      header: "Test",
      items: SEED_TESTS.map((t, i) => ({
        id: `TST${String(i + 1).padStart(3, "0")}`,
        name: `${t.name}, ${vendorName(t.vendor)}`,
      })),
    },
    tiles: ["orders", "revenue", "cost", "margin"],
    columns: [
      { id: "orders", header: "Orders", format: "count", value: raw("orders") },
      {
        id: "revenue",
        header: "Revenue",
        format: "currency",
        value: raw("revenue"),
      },
      {
        id: "cost",
        header: "Vendor cost",
        format: "currency",
        value: raw("cost"),
      },
      {
        id: "margin",
        header: "Margin",
        format: "currency",
        value: (c) => c.revenue - c.cost,
      },
      {
        id: "each",
        header: "Margin per order",
        format: "currency",
        value: (c) => (c.orders ? (c.revenue - c.cost) / c.orders : 0),
      },
    ],
    counts: ({ n, rand }) => {
      const orders = n(5, 90)
      const rate = 12 + rand() * 200
      const cost = orders * rate
      return { orders, cost, revenue: cost * (1.45 + rand() * 0.9) }
    },
  },
  {
    id: "tax",
    name: "Tax collected per state",
    rows: { header: "State", items: STATES.map((s) => ({ id: s, name: s })) },
    tiles: ["orders", "sales", "tax"],
    columns: [
      {
        id: "orders",
        header: "Taxable orders",
        format: "count",
        value: raw("orders"),
      },
      {
        id: "sales",
        header: "Taxable sales",
        format: "currency",
        value: raw("sales"),
      },
      {
        id: "tax",
        header: "Tax collected",
        format: "currency",
        value: raw("tax"),
      },
    ],
    counts: ({ n, rand }) => {
      const orders = n(0, 40)
      const sales = orders * (90 + rand() * 120)
      return {
        orders,
        sales,
        tax: sales * (rand() < 0.2 ? 0 : 0.04 + rand() * 0.04),
      }
    },
  },
  revenue("Lab"),
  revenue("Imaging"),
  {
    id: "cancellations",
    name: "Cancellation and late fees",
    rows: {
      header: "Vendor",
      items: VENDORS.map(({ id, name }) => ({ id, name })),
    },
    tiles: ["cancelled", "charged", "lost", "refunded"],
    columns: [
      {
        id: "cancelled",
        header: "Cancelled orders",
        format: "count",
        value: raw("cancelled"),
      },
      {
        id: "late",
        header: "Late cancellations",
        format: "count",
        value: raw("late"),
      },
      {
        id: "charged",
        header: "Fees charged by vendor",
        format: "currency",
        value: raw("charged"),
      },
      {
        id: "recovered",
        header: "Fees recovered",
        format: "currency",
        value: raw("recovered"),
      },
      {
        id: "lost",
        header: "Loss",
        format: "currency",
        value: (c) => c.charged - c.recovered,
      },
      {
        id: "refunded",
        header: "Refunded to patients",
        format: "currency",
        value: raw("refunded"),
      },
    ],
    counts: ({ n, part, rand }) => {
      const cancelled = n(3, 18)
      const late = part(cancelled, 0.2, 0.6)
      const charged = late * 35
      return {
        cancelled,
        late,
        charged,
        recovered: charged * (0.4 + rand() * 0.5),
        refunded: (cancelled - late) * (60 + rand() * 120),
      }
    },
  },
  {
    id: "overdue",
    name: "Overdue practices",
    rows: {
      header: "Practice",
      items: [
        { id: "593892", name: "Summit Concierge Medicine" },
        { id: "954150", name: "Harborview Longevity Clinic" },
        { id: "232276", name: "Lakeshore Precision Health" },
        { id: "428549", name: "Cedar and Pine Family Concierge" },
      ],
    },
    tiles: ["invoices", "owed", "fees", "days"],
    columns: [
      {
        id: "invoices",
        header: "Overdue invoices",
        format: "count",
        value: raw("invoices"),
      },
      {
        id: "owed",
        header: "Amount overdue",
        format: "currency",
        value: raw("owed"),
      },
      {
        id: "fees",
        header: "Late fees",
        format: "currency",
        value: (c) => c.owed * 0.015,
      },
      {
        id: "days",
        header: "Average days late",
        format: "days",
        value: (c) => (c.invoices ? c.late / c.invoices : 0),
      },
    ],
    counts: ({ size, rand }) => {
      const invoices = size(0, 3)
      return {
        invoices,
        owed: invoices * (400 + rand() * 1600),
        late: invoices * (5 + rand() * 40),
      }
    },
  },
]

export const BILLING_REPORTS: Report[] = BILLING.map((r) => ({
  ...r,
  group: "Billing",
}))
