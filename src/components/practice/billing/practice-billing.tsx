"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "@/design-system/ui/sonner"
import { IconCheckCircle, IconDownload } from "@/design-system/icons"

import {
  InvoiceStatusDot,
  day,
  useInvoices,
} from "@/components/admin/billing/billing"
import {
  type Invoice,
  PERIODS,
  billingFor,
  editInvoice,
  invoiceSubtotal,
  invoiceTotal,
  isOpen,
  money,
  practiceBilling,
} from "@/components/admin/billing/billing-data"
import { downloadInvoice } from "@/components/admin/billing/invoice-pdf"
import {
  type Column,
  Directory,
  ID_CELL,
  NAME_LINK,
  SUB_TAB,
  SUB_TABS_LIST,
} from "@/components/practice/directory"
import {
  PRACTICE,
  fullName,
  patients,
} from "@/components/practice/practice-data"
import { PracticeShell } from "@/components/practice/practice-shell"
import { ProviderShell } from "@/components/provider/provider-shell"
import { RecordCard, RecordPage } from "@/components/practice/record-page"
import { labOrders } from "@/components/provider/chart-lab-orders"
import { ToolbarSelect } from "@/components/provider/reports/reports"
import { SettingsTable, StatusDot } from "@/components/settings/settings-kit"
import { Button } from "@/design-system/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/design-system/ui/dialog"
import { TableCell, TableRow } from "@/design-system/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/design-system/ui/tabs"

/* The clinic manager's Billing, from the "Inlay Health, Billing" deck and
   the 29 Oct 2026 walkthrough: what the practice owes and what is building
   up, every test its providers ordered with the price it will carry, and
   one invoice per billing period. The practice sees the Inlay price only,
   never Inlay's contracted rate or margin, and its patients are never
   billed for anything here. Invoices and payments are the same records the
   Super Admin sees. */

/* One module, two portals: the clinic manager and the provider see the same
   billing, by role. Only the provider pays; the clinic manager can view the
   practice's orders and invoices. */
export type BillingPortal = "practice" | "provider"

/* Providers already have access to these patients, so their billing shows
   who each order was for and links to the chart; the clinic manager's
   billing shows the patient ID only. */
const PORTALS: Record<
  BillingPortal,
  {
    base: string
    canPay: boolean
    patients: boolean
    canExport: boolean
    /** Can split orders and invoices by the physician who ordered. */
    byPhysician: boolean
  }
> = {
  practice: {
    base: "/screens/practice/billing",
    canPay: false,
    patients: false,
    canExport: true,
    byPhysician: true,
  },
  provider: {
    base: "/screens/patients/billing",
    canPay: true,
    patients: true,
    /* No spreadsheet export in the provider portal (user, 30 Oct). */
    canExport: false,
    byPhysician: false,
  },
}

const PortalContext = React.createContext(PORTALS.practice)
const usePortal = () => React.useContext(PortalContext)

/** The patient behind an order's ID, for a portal that may see patients.
    Sample invoice IDs are matched to a sample patient of the practice. */
function usePatient(portal?: BillingPortal) {
  const context = usePortal()
  const allowed = (portal ? PORTALS[portal] : context).patients
  const { items } = patients.use()
  return (code: string) => {
    if (!allowed || !code || items.length === 0) return null
    const seed = [...code].reduce((n, ch) => n + ch.charCodeAt(0), 0)
    return items.find((p) => p.id === code) ?? items[seed % items.length]
  }
}

/** Downloads an invoice, naming its patients where the portal may. */
function useDownloadInvoice(portal?: BillingPortal) {
  const find = usePatient(portal)
  return (invoice: Invoice) =>
    downloadInvoice(invoice, (code) => {
      const p = find(code)
      return p ? fullName(p) : code
    })
}

/** An order's patient: their name, linked to the chart, where the portal
    has access; the ID otherwise. */
function PatientName({ code }: { code: string }) {
  const find = usePatient()
  const p = find(code)
  if (!p) return <span className="tabular-nums">{code || "None"}</span>
  return (
    <Link
      href={`/screens/patients/${p.id}`}
      className="text-foreground hover:text-primary-tint hover:underline"
    >
      {fullName(p)}
    </Link>
  )
}

/** The portal's own frame around a billing screen. */
function Frame({
  portal,
  children,
}: {
  portal: BillingPortal
  children: React.ReactNode
}) {
  return (
    <PortalContext.Provider value={PORTALS[portal]}>
      {portal === "provider" ? (
        <ProviderShell active="billing">{children}</ProviderShell>
      ) : (
        <PracticeShell active="billing">{children}</PracticeShell>
      )}
    </PortalContext.Provider>
  )
}

type Tab = "orders" | "invoices"

const TABS: { id: Tab; label: string }[] = [
  { id: "orders", label: "Orders" },
  { id: "invoices", label: "Invoices and statements" },
]

/* -------------------------------------------------------------------------- */
/*  Data                                                                       */
/* -------------------------------------------------------------------------- */

export const ORDER_STATUSES = [
  "Awaiting booking",
  "Booked",
  "Result in",
  "Cancelled",
] as const
type OrderStatus = (typeof ORDER_STATUSES)[number]

const ORDER_TONE: Record<OrderStatus, "success" | "warning" | "muted"> = {
  "Awaiting booking": "warning",
  Booked: "muted",
  "Result in": "success",
  Cancelled: "muted",
}

type PracticeOrder = {
  id: string
  date: string
  patient: string
  test: string
  facility: string
  provider: string
  period: string
  status: OrderStatus
  /** What the order adds to the next invoice; a credit is negative. */
  amount: number
}

/** This practice's invoices, with any changes either portal made. */
function usePracticeInvoices() {
  return useInvoices().filter((i) => i.practiceId === PRACTICE.id)
}

const ALL_PHYSICIANS = "all"

/** The physician the clinic manager picked, kept in ?physician= so it
    carries across the tabs and into an invoice. */
function usePhysician() {
  const params = useSearchParams()
  return params.get("physician") ?? ALL_PHYSICIANS
}

/** The same page with the physician changed and the other params kept. */
function withPhysician(params: URLSearchParams, physician: string) {
  const next = new URLSearchParams(params)
  if (physician === ALL_PHYSICIANS) next.delete("physician")
  else next.set("physician", physician)
  const query = next.toString()
  return query ? `?${query}` : ""
}

/** One physician's share of an invoice: their lines only. */
const physicianLines = (i: Invoice, physician: string) =>
  physician === ALL_PHYSICIANS
    ? i.lines
    : i.lines.filter((l) => l.provider === physician)

function PhysicianSelect({
  physicians,
  value,
}: {
  physicians: string[]
  value: string
}) {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  return (
    <ToolbarSelect
      label="Physician"
      className="w-44"
      value={value}
      onChange={(next) =>
        router.replace(
          `${pathname}${withPhysician(params, next || ALL_PHYSICIANS)}`
        )
      }
      items={[
        { value: ALL_PHYSICIANS, label: "All physicians" },
        ...physicians.map((p) => ({ value: p, label: p })),
      ]}
    />
  )
}

/** Every order the practice placed through Inlay: the invoiced lines, the
    credits for cancelled ones, and orders placed in the chart since. */
function usePracticeOrders(invoices: Invoice[]): PracticeOrder[] {
  const { items: chart } = labOrders.use()
  const current = PERIODS[0]
  const fromInvoices = invoices.flatMap((i) => [
    ...i.lines.map((l, n) => ({
      id: `${i.id}-${l.id}`,
      date: l.date,
      patient: l.patient,
      test: l.test,
      facility: l.vendor,
      provider: l.provider,
      period: i.period,
      /* The open period is still being booked and collected. */
      status: (i.period !== current
        ? "Result in"
        : (["Result in", "Booked", "Awaiting booking"] as const)[
            n % 3
          ]) as OrderStatus,
      amount: l.price,
    })),
    ...i.credits.map((c) => ({
      id: `${i.id}-${c.id}`,
      date: i.issued,
      patient: "",
      test: c.reason,
      facility: "",
      provider: "",
      period: i.period,
      status: "Cancelled" as const,
      amount: -c.amount,
    })),
  ])
  const fromChart = chart.flatMap((o) =>
    o.items.map((item) => ({
      id: `${o.id}-${item.testId}`,
      date: o.orderedAt.slice(0, 10),
      patient: o.patientId,
      test: item.name,
      facility: item.facility,
      provider: o.orderedBy,
      period: current,
      status: (o.status === "Cancelled"
        ? "Cancelled"
        : "Awaiting booking") as OrderStatus,
      amount: o.status === "Cancelled" ? 0 : item.price,
    }))
  )
  return [...fromChart, ...fromInvoices].sort((a, b) =>
    b.date.localeCompare(a.date)
  )
}

/* -------------------------------------------------------------------------- */
/*  Screen                                                                     */
/* -------------------------------------------------------------------------- */

export function PracticeBillingScreen({
  portal = "practice",
}: {
  portal?: BillingPortal
}) {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const invoices = usePracticeInvoices()
  const allOrders = usePracticeOrders(invoices)
  const { byPhysician } = PORTALS[portal]
  const pickedPhysician = usePhysician()
  const physician = byPhysician ? pickedPhysician : ALL_PHYSICIANS
  const physicians = [
    ...new Set(allOrders.map((o) => o.provider).filter(Boolean)),
  ].sort()
  const orders =
    physician === ALL_PHYSICIANS
      ? allOrders
      : allOrders.filter((o) => o.provider === physician)
  const [paying, setPaying] = React.useState<Invoice[] | null>(null)
  const requested = params.get("tab")
  const tab: Tab = TABS.some((t) => t.id === requested)
    ? (requested as Tab)
    : "orders"

  const heading = (
    <div className="flex flex-wrap items-center gap-2">
      <Tabs
        value={tab}
        onValueChange={(next) => {
          const query = new URLSearchParams(params)
          if (next === "orders") query.delete("tab")
          else query.set("tab", String(next))
          const qs = query.toString()
          router.replace(qs ? `${pathname}?${qs}` : pathname)
        }}
      >
        <TabsList className={SUB_TABS_LIST}>
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className={SUB_TAB}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {byPhysician && (
        <PhysicianSelect physicians={physicians} value={physician} />
      )}
    </div>
  )

  return (
    <Frame portal={portal}>
      {tab === "orders" && (
        <OrdersPanel
          key={`orders-${physician}`}
          heading={heading}
          orders={orders}
          picked={physician !== ALL_PHYSICIANS}
        />
      )}
      {tab === "invoices" && (
        <InvoicesPanel
          key={`invoices-${physician}`}
          heading={heading}
          invoices={invoices}
          physician={physician}
          onPay={setPaying}
        />
      )}
      <PayDialog invoices={paying} onClose={() => setPaying(null)} />
    </Frame>
  )
}

/* -------------------------------------------------------------------------- */
/*  Orders                                                                     */
/* -------------------------------------------------------------------------- */

/* Every order placed through Inlay with the price it will carry; a
   cancelled one shows as a credit, so the period's total always matches
   what will be invoiced. */
function OrdersPanel({
  heading,
  orders,
  picked,
}: {
  heading: React.ReactNode
  orders: PracticeOrder[]
  /** A physician is picked above, so the list is already theirs. */
  picked: boolean
}) {
  const { canExport } = usePortal()
  const providers = [...new Set(orders.map((o) => o.provider).filter(Boolean))]
  const columns: Column<PracticeOrder>[] = [
    {
      id: "date",
      header: "Date",
      className: "w-32 tabular-nums text-foreground/80",
      cell: (o) => day(o.date),
      sortValue: (o) => o.date,
    },
    {
      id: "patient",
      header: "Patient",
      className: "hidden text-foreground/80 md:table-cell",
      cell: (o) => <PatientName code={o.patient} />,
    },
    {
      id: "test",
      header: "Test",
      cell: (o) => <span className="font-medium">{o.test}</span>,
      sortValue: (o) => o.test,
    },
    {
      id: "facility",
      header: "Facility",
      className: "hidden text-foreground/80 lg:table-cell",
      cell: (o) => o.facility || "None",
    },
    {
      id: "provider",
      header: "Ordered by",
      className: "hidden text-foreground/80 md:table-cell",
      cell: (o) => o.provider || "Inlay",
    },
    {
      id: "status",
      header: "Status",
      cell: (o) => (
        <StatusDot tone={ORDER_TONE[o.status]}>{o.status}</StatusDot>
      ),
      sortValue: (o) => o.status,
    },
    {
      id: "amount",
      header: "On invoice",
      className: "text-right tabular-nums",
      cell: (o) =>
        o.amount < 0 ? `${money(o.amount)} credit` : money(o.amount),
      sortValue: (o) => o.amount,
    },
  ]
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Directory
        title="Orders"
        heading={heading}
        noun="orders"
        rows={orders}
        columns={columns}
        search={(o) => [o.patient, o.test, o.facility, o.provider]}
        filters={[
          {
            id: "period",
            label: "Period",
            all: "All periods",
            options: PERIODS,
            match: (o, v) => o.period === v,
          },
          ...(picked
            ? []
            : [
                {
                  id: "provider",
                  label: "Ordered by",
                  all: "All physicians",
                  options: providers,
                  match: (o: PracticeOrder, v: string) => o.provider === v,
                },
              ]),
          {
            id: "status",
            label: "Status",
            all: "Any status",
            options: ORDER_STATUSES,
            match: (o, v) => o.status === v,
          },
        ]}
        initialFilters={{ period: PERIODS[0] }}
        hideExport={!canExport}
        exportName="Orders"
        exportRow={(o) => ({
          Date: day(o.date),
          Patient: o.patient,
          Test: o.test,
          Facility: o.facility,
          "Ordered by": o.provider,
          Status: o.status,
          "On invoice": money(o.amount),
        })}
        emptyIllustration="no-results"
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Invoices and statements                                                    */
/* -------------------------------------------------------------------------- */

type Doc = {
  id: string
  kind: "Invoice" | "Credit note" | "Statement"
  period: string
  issued: string
  amount: number
  /** The physician's orders on the invoice, when one is picked. */
  orders?: number
  invoice?: Invoice
  /** The invoice every document opens: its own, or the period's. */
  source: Invoice
}

/* One invoice per billing period covering every order in it, with credit
   notes and monthly statements alongside. */
function InvoicesPanel({
  heading,
  invoices,
  physician,
  onPay,
}: {
  heading: React.ReactNode
  invoices: Invoice[]
  physician: string
  onPay: (invoices: Invoice[]) => void
}) {
  const { base, canPay, canExport } = usePortal()
  const all = physician === ALL_PHYSICIANS
  const query = all ? "" : `?physician=${encodeURIComponent(physician)}`
  /* With a physician picked, each invoice shows their orders on it only;
     credit notes and statements belong to the whole practice. */
  const docs: Doc[] = invoices.flatMap((i) => {
    const lines = physicianLines(i, physician)
    if (!all && !lines.length) return []
    const invoice = {
      id: i.id,
      kind: "Invoice" as const,
      period: i.period,
      issued: i.issued,
      orders: lines.length,
      amount: all ? invoiceTotal(i) : lines.reduce((s, l) => s + l.price, 0),
      invoice: i,
      source: i,
    }
    if (!all) return [invoice]
    return [
      invoice,
      ...i.credits.map((c) => ({
        id: c.id,
        kind: "Credit note" as const,
        period: i.period,
        issued: i.issued,
        amount: -c.amount,
        source: i,
      })),
      {
        id: `STM-${i.id.slice(4, 10)}`,
        kind: "Statement" as const,
        period: i.period,
        issued: i.issued,
        amount: invoiceTotal(i),
        source: i,
      },
    ]
  })
  const view = (d: Doc) => `${base}/invoices/${d.source.id}${query}`
  const open = invoices.filter(isOpen)

  const columns: Column<Doc>[] = [
    {
      id: "id",
      header: "Number",
      className: ID_CELL,
      cell: (d) => <Link href={view(d)}>{d.id}</Link>,
      sortValue: (d) => d.id,
    },
    {
      id: "kind",
      header: "Document",
      cell: (d) => (
        <Button
          variant="link"
          className={NAME_LINK}
          nativeButton={false}
          render={<Link href={view(d)} />}
        >
          {d.kind}
        </Button>
      ),
      sortValue: (d) => d.kind,
    },
    {
      id: "period",
      header: "Period",
      className: "text-foreground/80",
      cell: (d) => d.period,
    },
    {
      id: "issued",
      header: "Issued",
      className: "hidden tabular-nums text-foreground/80 md:table-cell",
      cell: (d) => day(d.issued),
      sortValue: (d) => d.issued,
    },
    {
      id: "due",
      header: "Due",
      className: "hidden tabular-nums text-foreground/80 lg:table-cell",
      cell: (d) => (d.invoice ? day(d.invoice.due) : "None"),
    },
    ...(all
      ? []
      : [
          {
            id: "physician",
            header: "Physician",
            cell: () => physician,
          },
          {
            id: "orders",
            header: "Orders",
            className: "text-right tabular-nums",
            cell: (d: Doc) => d.orders ?? 0,
            sortValue: (d: Doc) => d.orders ?? 0,
          },
        ]),
    {
      id: "amount",
      header: all ? "Amount" : `${physician}'s orders`,
      className: "text-right font-medium tabular-nums",
      cell: (d) => money(d.amount),
      sortValue: (d) => d.amount,
    },
    ...(all
      ? []
      : [
          {
            id: "total",
            header: "Invoice total",
            className:
              "hidden text-right tabular-nums text-foreground/80 lg:table-cell",
            cell: (d: Doc) => money(d.invoice ? invoiceTotal(d.invoice) : 0),
          },
        ]),
    {
      id: "status",
      header: "Status",
      cell: (d) =>
        d.invoice ? (
          <InvoiceStatusDot invoice={d.invoice} />
        ) : (
          <StatusDot tone="muted">
            {d.kind === "Credit note" ? "Applied" : "Issued"}
          </StatusDot>
        ),
    },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Directory
        title="Invoices and statements"
        heading={heading}
        noun="documents"
        rows={docs.filter((d) => d.invoice?.status !== "Draft")}
        columns={columns}
        search={(d) => [d.id, d.kind, d.period]}
        filters={[
          ...(all
            ? [
                {
                  id: "kind",
                  label: "Document",
                  all: "All documents",
                  options: ["Invoice", "Credit note", "Statement"],
                  match: (d: Doc, v: string) => d.kind === v,
                },
              ]
            : []),
          {
            id: "period",
            label: "Period",
            all: "All periods",
            options: PERIODS,
            match: (d, v) => d.period === v,
          },
        ]}
        primaryAction={
          canPay && open.length
            ? {
                label: "Pay balance",
                icon: <IconCheckCircle />,
                onClick: () => onPay(open),
              }
            : undefined
        }
        hideExport={!canExport}
        exportName="Invoices and statements"
        exportRow={(d) => ({
          Number: d.id,
          Document: d.kind,
          Period: d.period,
          Issued: day(d.issued),
          ...(all ? {} : { Physician: physician, Orders: d.orders ?? 0 }),
          Amount: money(d.amount),
          Status: d.invoice?.status ?? "Issued",
        })}
        emptyIllustration="no-results"
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Pay                                                                        */
/* -------------------------------------------------------------------------- */

function PayDialog({
  invoices,
  onClose,
}: {
  invoices: Invoice[] | null
  onClose: () => void
}) {
  const { items: saved } = practiceBilling.use()
  const method = billingFor(PRACTICE.id, saved).method
  const total = (invoices ?? []).reduce((s, i) => s + invoiceTotal(i), 0)
  return (
    <Dialog open={invoices !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pay {money(total)}</DialogTitle>
          <DialogDescription className="sr-only">
            Pay the selected invoices with the practice&apos;s payment method.
          </DialogDescription>
        </DialogHeader>
        <dl className="grid gap-2 text-sm">
          {(invoices ?? []).map((i) => (
            <div key={i.id} className="flex justify-between gap-3">
              <dt className="text-muted-foreground">
                {i.id}, {i.period}
              </dt>
              <dd className="tabular-nums">{money(invoiceTotal(i))}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 border-t pt-2">
            <dt className="text-muted-foreground">Pay with</dt>
            <dd>{method}</dd>
          </div>
        </dl>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              invoices?.forEach((i) => editInvoice(i.id, { status: "Paid" }))
              toast.success(`Payment of ${money(total)} sent`)
              onClose()
            }}
          >
            Pay {money(total)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* -------------------------------------------------------------------------- */
/*  Invoice                                                                    */
/* -------------------------------------------------------------------------- */

/* What the practice reconciles against: every line it can check against
   its own records. No contracted rate or margin is shown. */
export function PracticeInvoiceScreen({
  id,
  portal = "practice",
}: {
  id: string
  portal?: BillingPortal
}) {
  const { base, canPay } = PORTALS[portal]
  const invoice = usePracticeInvoices().find((i) => i.id === id)
  const { items: saved } = practiceBilling.use()
  const billing = billingFor(PRACTICE.id, saved)
  const [paying, setPaying] = React.useState<Invoice[] | null>(null)
  const download = useDownloadInvoice(portal)
  const params = useSearchParams()
  const picked = PORTALS[portal].byPhysician
    ? (params.get("physician") ?? ALL_PHYSICIANS)
    : ALL_PHYSICIANS
  const back = `${base}?tab=invoices${
    picked === ALL_PHYSICIANS ? "" : `&physician=${encodeURIComponent(picked)}`
  }`
  const lines = invoice ? physicianLines(invoice, picked) : []
  const share = lines.reduce((s, l) => s + l.price, 0)

  return (
    <Frame portal={portal}>
      {!invoice || invoice.status === "Draft" ? (
        <RecordPage title="Invoice not found" backHref={back}>
          <RecordCard title="This invoice is not available" />
        </RecordPage>
      ) : (
        <RecordPage
          title={invoice.id}
          backHref={back}
          badge={<InvoiceStatusDot invoice={invoice} />}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => download(invoice)}
              >
                <IconDownload />
                Download PDF
              </Button>
              {canPay && isOpen(invoice) && (
                <Button size="sm" onClick={() => setPaying([invoice])}>
                  Pay {money(invoiceTotal(invoice))}
                </Button>
              )}
            </div>
          }
        >
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <RecordCard
              title="Lines"
              action={
                PORTALS[portal].byPhysician ? (
                  <PhysicianSelect
                    physicians={[
                      ...new Set(invoice.lines.map((l) => l.provider)),
                    ].sort()}
                    value={picked}
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {invoice.period}, issued {day(invoice.issued)}
                  </span>
                )
              }
            >
              <SettingsTable
                columns={[
                  { header: "Date", className: "w-28" },
                  { header: "Patient" },
                  { header: "Test" },
                  { header: "Facility", className: "hidden md:table-cell" },
                  { header: "Physician", className: "hidden sm:table-cell" },
                  { header: "Price", className: "text-right" },
                ]}
              >
                {lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-foreground/80 tabular-nums">
                      {day(l.date)}
                    </TableCell>
                    <TableCell className="text-foreground/80">
                      <PatientName code={l.patient} />
                    </TableCell>
                    <TableCell className="font-medium">{l.test}</TableCell>
                    <TableCell className="hidden text-foreground/80 md:table-cell">
                      {l.vendor}
                    </TableCell>
                    <TableCell className="hidden text-foreground/80 sm:table-cell">
                      {l.provider}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(l.price)}
                    </TableCell>
                  </TableRow>
                ))}
              </SettingsTable>
            </RecordCard>

            <RecordCard title="Summary">
              <dl className="grid gap-2 text-sm">
                {picked !== ALL_PHYSICIANS && (
                  <div className="mb-1 grid gap-2 border-b pb-3">
                    <Sum
                      label={`${picked}'s orders`}
                      value={String(lines.length)}
                    />
                    <Sum label={`${picked}'s share`} value={money(share)} />
                  </div>
                )}
                <Sum label="Orders" value={String(invoice.lines.length)} />
                <Sum label="Subtotal" value={money(invoiceSubtotal(invoice))} />
                {invoice.credits.map((c) => (
                  <Sum
                    key={c.id}
                    label={`Credit note ${c.id}`}
                    value={money(-c.amount)}
                  />
                ))}
                {invoice.lateFee > 0 && (
                  <Sum label="Late fee" value={money(invoice.lateFee)} />
                )}
                <div className="my-1 border-t pt-3">
                  <Sum
                    strong
                    label={invoice.status === "Paid" ? "Paid" : "Amount due"}
                    value={money(invoiceTotal(invoice))}
                  />
                </div>
                <Sum label="Due date" value={day(invoice.due)} />
                <Sum label="Terms" value={invoice.terms} />
                <Sum label="Grace period" value={`${invoice.grace} days`} />
                <Sum label="Late fee" value={`${billing.lateFee}% a month`} />
                <Sum label="How to pay" value={invoice.method} />
              </dl>
              <p className="mt-4 rounded-md bg-muted/60 px-4 py-3 text-sm">
                No patient is billed for anything on this invoice.
              </p>
            </RecordCard>
          </div>
        </RecordPage>
      )}
      <PayDialog invoices={paying} onClose={() => setPaying(null)} />
    </Frame>
  )
}

function Sum({
  label,
  value,
  strong,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={strong ? "font-semibold" : "text-muted-foreground"}>
        {label}
      </dt>
      <dd
        className={
          strong
            ? "font-heading text-xl font-semibold tabular-nums"
            : "text-right tabular-nums"
        }
      >
        {value}
      </dd>
    </div>
  )
}
