"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "@/design-system/ui/sonner"
import {
  IconCheckCircle,
  IconDownload,
  IconEye,
  IconFileText,
  IconFlash,
  IconSend,
  IconTrash,
  IconUpload,
} from "@/design-system/icons"

import { AdminShell } from "@/components/admin/admin-shell"
import {
  INVOICE_STATUSES,
  type Invoice,
  type InvoicePayment,
  type InvoiceStatus,
  PERIODS,
  applyEdits,
  editInvoice,
  invoiceCost,
  invoiceCredits,
  invoiceEdits,
  invoiceSubtotal,
  invoiceTotal,
  invoicesFor,
  isOpen,
  money,
  practiceBilling,
  RECEIPT_METHODS,
} from "@/components/admin/billing/billing-data"
import { BillingStatement } from "@/components/admin/billing/billing-statement"
import { downloadInvoice } from "@/components/admin/billing/invoice-pdf"
import { PayoutsPanel } from "@/components/admin/billing/payouts"
import { usePractices } from "@/components/admin/practices-store"
import {
  type Column,
  Directory,
  ID_CELL,
  NAME_LINK,
  RowMenu,
  SUB_TAB,
  SUB_TABS_LIST,
} from "@/components/practice/directory"
import {
  REMOVE_TINT,
  RecordCard,
  RecordPage,
} from "@/components/practice/record-page"
import {
  ChoiceSelect,
  SettingsTable,
  StatusDot,
} from "@/components/settings/settings-kit"
import { Button } from "@/design-system/ui/button"
import { DatePicker } from "@/design-system/ui/date-picker"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/design-system/ui/dialog"
import { DropdownMenuItem } from "@/design-system/ui/dropdown-menu"
import { Field, FieldLabel } from "@/design-system/ui/field"
import { Input } from "@/design-system/ui/input"
import { TableCell, TableRow } from "@/design-system/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/design-system/ui/tabs"
import { Textarea } from "@/design-system/ui/textarea"

/* The Super Admin's Billing, from the "Inlay Health, Billing" deck and the
   29 Oct 2026 walkthrough: invoices raised from orders, what Inlay owes
   each vendor, and the profit and loss. The tab lives in ?tab= like the
   clinic manager's Users. Prices and each practice's billing terms are set
   in Settings and on the practice. */

const BASE = "/screens/admin/billing"

type BillingTab = "invoices" | "payouts" | "pnl"

const TABS: { id: BillingTab; label: string }[] = [
  { id: "invoices", label: "Invoices" },
  { id: "payouts", label: "Vendor payouts" },
  { id: "pnl", label: "Profit and loss" },
]

export const day = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

type Tone = "success" | "warning" | "danger" | "muted"

export const INVOICE_TONE: Record<InvoiceStatus, Tone> = {
  Paid: "success",
  Due: "muted",
  "In grace": "warning",
  "Past due": "danger",
  Draft: "muted",
}

/** An invoice's status, with the days late once it is past its due date. */
export function InvoiceStatusDot({ invoice }: { invoice: Invoice }) {
  const label =
    invoice.status === "Past due"
      ? `${invoice.daysLate} days late`
      : invoice.status === "In grace"
        ? `Grace, ${invoice.grace - invoice.daysLate} days left`
        : invoice.status
  return <StatusDot tone={INVOICE_TONE[invoice.status]}>{label}</StatusDot>
}

/** The practices' invoices with the admin's changes laid over them. */
export function useInvoices() {
  const { practices } = usePractices()
  const { items: saved } = practiceBilling.use()
  const { items: edits } = invoiceEdits.use()
  const base = React.useMemo(
    () => invoicesFor(practices, saved),
    [practices, saved]
  )
  return React.useMemo(() => applyEdits(base, edits), [base, edits])
}

/** Raises the period's invoices for every practice from recorded orders. */
export function runInvoices(invoices: Invoice[]) {
  const drafts = invoices.filter((i) => i.status === "Draft")
  drafts.forEach((i) => editInvoice(i.id, { status: "Due" }))
  toast.success(
    drafts.length
      ? `${drafts.length} invoices raised and sent to practices`
      : "Every invoice for the period is already raised"
  )
}

export function BillingScreen() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const invoices = useInvoices()
  const requested = params.get("tab")
  const tab: BillingTab = TABS.some((t) => t.id === requested)
    ? (requested as BillingTab)
    : "invoices"

  const heading = (
    <Tabs
      value={tab}
      onValueChange={(next) =>
        router.replace(
          next === "invoices" ? pathname : `${pathname}?tab=${next}`
        )
      }
    >
      <TabsList className={SUB_TABS_LIST}>
        {TABS.map((t) => (
          <TabsTrigger key={t.id} value={t.id} className={SUB_TAB}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )

  return (
    <AdminShell active="billing">
      {/* Keyed by tab so search, filters and paging start fresh on each. */}
      {tab === "invoices" && (
        <InvoicesPanel key="invoices" heading={heading} invoices={invoices} />
      )}
      {tab === "payouts" && <PayoutsPanel key="payouts" heading={heading} />}
      {tab === "pnl" && <BillingStatement key="pnl" heading={heading} />}
    </AdminShell>
  )
}

/* -------------------------------------------------------------------------- */
/*  Invoices                                                                   */
/* -------------------------------------------------------------------------- */

function InvoicesPanel({
  heading,
  invoices,
}: {
  heading: React.ReactNode
  invoices: Invoice[]
}) {
  const params = useSearchParams()
  const href = (i: Invoice) => `${BASE}/invoices/${i.id}`
  const practiceNames = [...new Set(invoices.map((i) => i.practiceName))]
  const [paying, setPaying] = React.useState<Invoice | null>(null)

  const columns: Column<Invoice>[] = [
    {
      id: "id",
      header: "Invoice",
      className: ID_CELL,
      cell: (i) => <Link href={href(i)}>{i.id}</Link>,
      sortValue: (i) => i.id,
    },
    {
      id: "practice",
      header: "Practice",
      cell: (i) => (
        <Button
          variant="link"
          className={NAME_LINK}
          nativeButton={false}
          render={<Link href={href(i)} />}
        >
          {i.practiceName}
        </Button>
      ),
      sortValue: (i) => i.practiceName,
    },
    {
      id: "period",
      header: "Period",
      className: "hidden text-foreground/80 lg:table-cell",
      cell: (i) => i.period,
    },
    {
      id: "due",
      header: "Due",
      className: "hidden tabular-nums text-foreground/80 md:table-cell",
      cell: (i) => day(i.due),
      sortValue: (i) => i.due,
    },
    {
      id: "orders",
      header: "Orders",
      className: "hidden text-right tabular-nums xl:table-cell",
      cell: (i) => i.lines.length,
      sortValue: (i) => i.lines.length,
    },
    {
      id: "credits",
      header: "Credit notes",
      className: "hidden text-right tabular-nums xl:table-cell",
      cell: (i) =>
        i.credits.length ? (
          money(-invoiceCredits(i))
        ) : (
          <span className="text-muted-foreground">None</span>
        ),
    },
    {
      id: "total",
      header: "Amount",
      className: "text-right font-medium tabular-nums",
      cell: (i) => money(invoiceTotal(i)),
      sortValue: (i) => invoiceTotal(i),
    },
    {
      id: "status",
      header: "Status",
      cell: (i) => <InvoiceStatusDot invoice={i} />,
      sortValue: (i) => i.status,
    },
    {
      id: "actions",
      header: "",
      className: "w-12 text-right",
      cell: (i) => (
        <RowMenu label={`Actions for ${i.id}`}>
          <DropdownMenuItem render={<Link href={href(i)} />}>
            <IconEye />
            View
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => downloadInvoice(i)}>
            <IconDownload />
            Download PDF
          </DropdownMenuItem>
          {i.status === "Draft" && (
            <DropdownMenuItem onClick={() => sendInvoice(i)}>
              <IconSend />
              Send to practice
            </DropdownMenuItem>
          )}
          {isOpen(i) && (
            <DropdownMenuItem onClick={() => sendInvoice(i)}>
              <IconSend />
              Send reminder
            </DropdownMenuItem>
          )}
          {isOpen(i) && (
            <DropdownMenuItem onClick={() => setPaying(i)}>
              <IconCheckCircle />
              Record payment
            </DropdownMenuItem>
          )}
        </RowMenu>
      ),
    },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Directory
        title="Invoices"
        heading={heading}
        noun="invoices"
        rows={invoices}
        columns={columns}
        search={(i) => [i.id, i.practiceName, i.period]}
        filters={[
          {
            id: "practice",
            label: "Practice",
            all: "All practices",
            options: practiceNames,
            match: (i, v) => i.practiceName === v,
          },
          {
            id: "status",
            label: "Status",
            all: "Any status",
            options: INVOICE_STATUSES,
            match: (i, v) => i.status === v,
          },
          {
            id: "period",
            label: "Period",
            all: "All periods",
            options: PERIODS,
            match: (i, v) => i.period === v,
          },
        ]}
        initialFilters={
          params.get("status") ? { status: params.get("status")! } : undefined
        }
        primaryAction={{
          label: "Run invoices",
          icon: <IconFlash />,
          onClick: () => runInvoices(invoices),
        }}
        exportName="Invoices"
        exportRow={(i) => ({
          Invoice: i.id,
          Practice: i.practiceName,
          Period: i.period,
          Issued: day(i.issued),
          Due: day(i.due),
          Orders: i.lines.length,
          Subtotal: money(invoiceSubtotal(i)),
          "Credit notes": money(invoiceCredits(i)),
          "Late fee": money(i.lateFee),
          Amount: money(invoiceTotal(i)),
          Status: i.status,
        })}
        emptyIllustration="no-results"
      />
      <RecordPaymentDialog invoice={paying} onClose={() => setPaying(null)} />
    </div>
  )
}

function sendInvoice(i: Invoice) {
  if (i.status === "Draft") {
    editInvoice(i.id, { status: "Due" })
    toast.success(`${i.id} sent to ${i.practiceName}`)
  } else {
    toast.success(`Reminder sent to ${i.practiceName}`)
  }
}

const MAX_PROOF = 2 * 1024 * 1024
const today = () => new Date().toISOString().slice(0, 10)
const fileSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`

/** Marks an invoice paid with what arrived, when, how, the bank reference
    and the remittance or slip as proof. */
function RecordPaymentDialog({
  invoice,
  onClose,
}: {
  invoice: Invoice | null
  onClose: () => void
}) {
  return (
    <Dialog open={!!invoice} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {invoice && (
          <RecordPaymentForm
            key={invoice.id}
            invoice={invoice}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function RecordPaymentForm({
  invoice,
  onClose,
}: {
  invoice: Invoice
  onClose: () => void
}) {
  const due = invoiceTotal(invoice)
  const [amount, setAmount] = React.useState(due.toFixed(2))
  const [date, setDate] = React.useState(today())
  const [method, setMethod] = React.useState<string>(
    (RECEIPT_METHODS as readonly string[]).includes(invoice.method)
      ? invoice.method
      : RECEIPT_METHODS[0]
  )
  const [reference, setReference] = React.useState("")
  const [note, setNote] = React.useState("")
  const [file, setFile] = React.useState<InvoicePayment["file"]>()
  const picker = React.useRef<HTMLInputElement>(null)
  const paid = Number(amount)
  const valid = paid > 0 && !!date

  function pick(f: File | undefined) {
    if (!f) return
    if (!/^(application\/pdf|image\/(png|jpeg))$/.test(f.type)) {
      toast.error("Choose a PDF, PNG or JPG file.")
      return
    }
    if (f.size > MAX_PROOF) {
      toast.error("Choose a file under 2 MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = () =>
      setFile({ name: f.name, size: f.size, url: String(reader.result) })
    reader.readAsDataURL(f)
  }

  function save() {
    editInvoice(invoice.id, {
      status: "Paid",
      payment: {
        amount: paid,
        date,
        method,
        reference: reference.trim(),
        note: note.trim(),
        file,
      },
    })
    toast.success(`Payment of ${money(paid)} recorded on ${invoice.id}`)
    onClose()
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Record payment, {invoice.id}</DialogTitle>
        <DialogDescription className="sr-only">
          Enter the payment received from {invoice.practiceName} and attach the
          proof.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="pay-amount">Amount received</FieldLabel>
          <Input
            id="pay-amount"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            className="tabular-nums"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="pay-date">Payment date</FieldLabel>
          <DatePicker
            id="pay-date"
            value={date}
            onChange={setDate}
            max={today()}
          />
        </Field>
        <Field>
          <FieldLabel>Method</FieldLabel>
          <ChoiceSelect
            label="Method"
            value={method}
            onChange={setMethod}
            options={RECEIPT_METHODS}
            className="w-full"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="pay-reference">Reference number</FieldLabel>
          <Input
            id="pay-reference"
            placeholder="Transaction or check number"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </Field>
      </div>
      <Field>
        <FieldLabel>Proof of payment</FieldLabel>
        <input
          ref={picker}
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            pick(e.target.files?.[0])
            e.target.value = ""
          }}
        />
        {!file ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => picker.current?.click()}
            className="w-full gap-2 border-dashed border-primary-tint/70 bg-transparent text-primary-tint hover:bg-primary-surface/50 hover:text-primary-tint"
          >
            <IconUpload />
            Upload document
          </Button>
        ) : (
          <div className="flex h-9 items-center gap-2 rounded-lg bg-input/50 pr-0.5 pl-1.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-primary-surface text-primary-tint">
              <IconFileText className="size-4" />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {fileSize(file.size)}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Replace document"
              onClick={() => picker.current?.click()}
            >
              <IconUpload />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Remove document"
              className={REMOVE_TINT}
              onClick={() => setFile(undefined)}
            >
              <IconTrash />
            </Button>
          </div>
        )}
      </Field>
      <Field>
        <FieldLabel htmlFor="pay-note">Note</FieldLabel>
        <Textarea
          id="pay-note"
          rows={3}
          placeholder="Type here..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
      {valid && paid < due && (
        <p className="text-sm text-muted-foreground">
          {money(due - paid)} short of the {money(due)} due.
        </p>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={!valid} onClick={save}>
          <IconCheckCircle />
          Record payment
        </Button>
      </DialogFooter>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  Invoice detail                                                             */
/* -------------------------------------------------------------------------- */

/* The full line-level record behind one invoice: every order on the left,
   the summary on the right with terms, grace and late fee, and the vendor
   cost and margin against the same orders, which only the admin sees. */
export function InvoiceScreen({ id }: { id: string }) {
  const invoice = useInvoices().find((i) => i.id === id)
  const [paying, setPaying] = React.useState(false)

  return (
    <AdminShell active="billing">
      {!invoice ? (
        <RecordPage title="Invoice not found" backHref={`${BASE}?tab=invoices`}>
          <RecordCard title="This invoice no longer exists" />
        </RecordPage>
      ) : (
        <RecordPage
          title={`${invoice.id}, ${invoice.practiceName}`}
          backHref={`${BASE}?tab=invoices`}
          badge={<InvoiceStatusDot invoice={invoice} />}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadInvoice(invoice)}
              >
                <IconDownload />
                Download PDF
              </Button>
              {isOpen(invoice) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => sendInvoice(invoice)}
                >
                  <IconSend />
                  Send reminder
                </Button>
              )}
              {invoice.status === "Draft" ? (
                <Button size="sm" onClick={() => sendInvoice(invoice)}>
                  <IconSend />
                  Send to practice
                </Button>
              ) : isOpen(invoice) ? (
                <Button size="sm" onClick={() => setPaying(true)}>
                  <IconCheckCircle />
                  Record payment
                </Button>
              ) : null}
            </div>
          }
        >
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <RecordCard
              title="Lines"
              action={
                <span className="text-xs text-muted-foreground tabular-nums">
                  {invoice.period}, issued {day(invoice.issued)}
                </span>
              }
            >
              <SettingsTable
                columns={[
                  { header: "Date", className: "w-28" },
                  { header: "Patient", className: "w-24" },
                  { header: "Test" },
                  { header: "Vendor", className: "hidden md:table-cell" },
                  { header: "Ordered by", className: "hidden sm:table-cell" },
                  { header: "Price", className: "text-right" },
                ]}
              >
                {invoice.lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-foreground/80 tabular-nums">
                      {day(l.date)}
                    </TableCell>
                    <TableCell className="text-foreground/80 tabular-nums">
                      {l.patient}
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
                <SumRow label="Orders" value={String(invoice.lines.length)} />
                <SumRow
                  label="Subtotal"
                  value={money(invoiceSubtotal(invoice))}
                />
                {invoice.credits.map((c) => (
                  <SumRow
                    key={c.id}
                    label={`Credit note ${c.id}`}
                    value={money(-c.amount)}
                  />
                ))}
                <SumRow label="Tax" value={money(0)} />
                {invoice.lateFee > 0 && (
                  <SumRow label="Late fee" value={money(invoice.lateFee)} />
                )}
                <div className="my-1 border-t pt-3">
                  <SumRow
                    strong
                    label={invoice.status === "Paid" ? "Paid" : "Due"}
                    value={money(invoiceTotal(invoice))}
                  />
                </div>
                <SumRow label="Due date" value={day(invoice.due)} />
                <SumRow label="Terms" value={invoice.terms} />
                <SumRow
                  label="Grace"
                  value={`${invoice.grace} days${
                    invoice.status === "Past due" ? ", used" : ""
                  }`}
                />
                <SumRow label="Payment" value={invoice.method} />
              </dl>
              {invoice.payment && <PaymentReceived payment={invoice.payment} />}
              <div className="mt-4 rounded-md bg-primary-surface px-4 py-3 text-sm text-primary dark:text-primary-tint">
                Vendor cost against these orders: {money(invoiceCost(invoice))}.
                Margin {money(invoiceSubtotal(invoice) - invoiceCost(invoice))}.
              </div>
            </RecordCard>
          </div>
          <RecordPaymentDialog
            invoice={paying ? invoice : null}
            onClose={() => setPaying(false)}
          />
        </RecordPage>
      )}
    </AdminShell>
  )
}

/** What the admin recorded when the invoice was paid. */
function PaymentReceived({ payment }: { payment: InvoicePayment }) {
  return (
    <div className="mt-4 border-t pt-4">
      <h3 className="mb-2 text-sm font-semibold">Payment received</h3>
      <dl className="grid gap-2 text-sm">
        <SumRow label="Amount" value={money(payment.amount)} />
        <SumRow label="Paid on" value={day(payment.date)} />
        <SumRow label="Method" value={payment.method} />
        {payment.reference && (
          <SumRow label="Reference" value={payment.reference} />
        )}
      </dl>
      {payment.note && (
        <p className="mt-2 text-sm text-foreground/80">{payment.note}</p>
      )}
      {payment.file && (
        <a
          href={payment.file.url}
          download={payment.file.name}
          className="mt-3 flex items-center gap-2 rounded-lg bg-input/50 px-2 py-1.5 text-sm hover:bg-input"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-primary-surface text-primary-tint">
            <IconFileText className="size-4" />
          </span>
          <span className="min-w-0 flex-1 truncate">{payment.file.name}</span>
          <IconDownload className="size-4 text-muted-foreground" />
        </a>
      )}
    </div>
  )
}

function SumRow({
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
            : "tabular-nums"
        }
      >
        {value}
      </dd>
    </div>
  )
}
