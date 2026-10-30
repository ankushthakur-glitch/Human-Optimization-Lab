"use client"

import * as React from "react"
import { toast } from "@/design-system/ui/sonner"
import { IconCheckCircle, IconDownload } from "@/design-system/icons"

import { day } from "@/components/admin/billing/billing"
import {
  PERIODS,
  type Payout,
  type PayoutOrder,
  type PayoutStatus,
  TEST_CATEGORIES,
  money,
  payoutMargin,
  payoutResolutions,
  payoutsFor,
  resolvePayout,
} from "@/components/admin/billing/billing-data"
import { usePractices } from "@/components/admin/practices-store"
import {
  type Column,
  DetailSection,
  Directory,
  NAME_LINK,
  SUB_TAB,
  SUB_TABS_LIST,
} from "@/components/practice/directory"
import { SideSheet, SideSheetHeader } from "@/components/practice/sheets"
import { SettingsTable, StatusDot } from "@/components/settings/settings-kit"
import { Button } from "@/design-system/ui/button"
import { SheetFooter } from "@/design-system/ui/sheet"
import { TableCell, TableRow } from "@/design-system/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/design-system/ui/tabs"

/* Vendor payouts: what Inlay owes each vendor at the contracted rate. The
   vendor's own invoice sits beside the orders Inlay recorded, and a ready
   payout is paid from the list or its sheet. There is no query step. */

type Tone = "success" | "warning" | "danger" | "muted"

/** A row's own action: the secondary button in the brand's soft teal. */
export const SOFT_PRIMARY =
  "bg-primary-surface text-primary hover:bg-[color-mix(in_oklch,var(--primary-surface),var(--primary)_10%)] dark:text-primary-tint"

const PAYOUT_TONE: Record<PayoutStatus, Tone> = {
  Paid: "success",
  Ready: "muted",
  Accruing: "muted",
}

/** The payouts with the admin's payments on them. */
function usePayouts() {
  const { practices } = usePractices()
  const { items: resolutions } = payoutResolutions.use()
  const base = React.useMemo(() => payoutsFor(practices), [practices])
  return React.useMemo(() => {
    const byId = new Map(resolutions.map((r) => [r.id, r]))
    return base.map((p) => ({
      ...p,
      status: byId.get(p.id)?.status ?? p.status,
    }))
  }, [base, resolutions])
}

function pay(p: Payout) {
  resolvePayout({ id: p.id, status: "Paid", paid: p.theirInvoice })
  toast.success(`${p.vendorName} paid ${money(p.theirInvoice, false)}`)
}

export function PayoutsPanel({ heading }: { heading: React.ReactNode }) {
  const payouts = usePayouts()
  const [openId, setOpenId] = React.useState<string | null>(null)
  const open = payouts.find((p) => p.id === openId) ?? null

  const columns: Column<Payout>[] = [
    {
      id: "vendor",
      header: "Vendor",
      cell: (p) => (
        <Button
          variant="link"
          className={NAME_LINK}
          onClick={() => setOpenId(p.id)}
        >
          {p.vendorName}
        </Button>
      ),
      sortValue: (p) => p.vendorName,
    },
    {
      id: "month",
      header: "Period",
      className: "hidden text-foreground/80 md:table-cell",
      cell: (p) => p.month,
    },
    {
      id: "orders",
      header: "Orders",
      className: "text-right tabular-nums",
      cell: (p) => p.orders,
      sortValue: (p) => p.orders,
    },
    {
      id: "theirs",
      header: "Their invoice",
      className: "text-right tabular-nums",
      cell: (p) =>
        p.status === "Accruing" ? (
          <span className="text-muted-foreground">Not yet</span>
        ) : (
          money(p.theirInvoice, false)
        ),
      sortValue: (p) => p.theirInvoice,
    },
    {
      id: "ours",
      header: "Our records",
      className: "text-right tabular-nums",
      cell: (p) => money(p.vendorCost + p.fees, false),
      sortValue: (p) => p.vendorCost,
    },
    {
      id: "status",
      header: "Status",
      className: "hidden lg:table-cell",
      cell: (p) => (
        <StatusDot tone={PAYOUT_TONE[p.status]}>{p.status}</StatusDot>
      ),
    },
    {
      id: "actions",
      header: "",
      className: "w-28 text-right",
      cell: (p) =>
        p.status === "Ready" ? (
          <Button
            variant="secondary"
            size="sm"
            className={SOFT_PRIMARY}
            onClick={() => pay(p)}
          >
            Pay
          </Button>
        ) : null,
    },
  ]

  const ready = payouts.filter((p) => p.status === "Ready")

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Directory
        title="Vendor payouts"
        heading={heading}
        noun="payouts"
        rows={payouts}
        columns={columns}
        search={(p) => [p.vendorName, p.month, p.invoiceNo]}
        filters={[
          {
            id: "month",
            label: "Period",
            all: "All periods",
            options: PERIODS,
            match: (p, v) => p.month === v,
          },
          {
            id: "category",
            label: "Type",
            all: "All types",
            options: TEST_CATEGORIES,
            match: (p, v) => p.category === v,
          },
        ]}
        initialFilters={{ month: PERIODS[1] }}
        primaryAction={{
          label: "Approve run",
          icon: <IconCheckCircle />,
          onClick: () => {
            if (!ready.length) {
              toast.info("No payouts are ready to approve")
              return
            }
            ready.forEach((p) =>
              resolvePayout({ id: p.id, status: "Paid", paid: p.theirInvoice })
            )
            toast.success(
              `${ready.length} payouts approved, ${money(
                ready.reduce((s, p) => s + p.theirInvoice, 0),
                false
              )} to vendors`
            )
          },
        }}
        exportName="Vendor payouts"
        exportRow={(p) => ({
          Vendor: p.vendorName,
          Period: p.month,
          "Vendor invoice": p.invoiceNo,
          Orders: p.orders,
          "Their invoice": money(p.theirInvoice),
          "Our records": money(p.vendorCost + p.fees),
          Margin: money(payoutMargin(p)),
          Status: p.status,
        })}
        emptyIllustration="no-results"
      />
      <SideSheet
        open={open !== null}
        onOpenChange={(o) => !o && setOpenId(null)}
        wide
      >
        {open && <PayoutView payout={open} onClose={() => setOpenId(null)} />}
      </SideSheet>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  One payout                                                                 */
/* -------------------------------------------------------------------------- */

type View = "ours" | "theirs" | "practices"

function PayoutView({
  payout,
  onClose,
}: {
  payout: Payout
  onClose: () => void
}) {
  const [view, setView] = React.useState<View>("practices")

  const views: { id: View; label: string }[] = [
    { id: "ours", label: `Our orders (${payout.orderLines.length})` },
    { id: "theirs", label: "Vendor invoice" },
    { id: "practices", label: "By practice" },
  ]

  return (
    <>
      <SideSheetHeader
        title={`${payout.vendorName}, ${payout.month}`}
        description="The vendor's payout for the period, its invoice checked against Inlay's orders."
        badge={
          <StatusDot tone={PAYOUT_TONE[payout.status]}>
            {payout.status}
          </StatusDot>
        }
      />
      <div className="flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto p-6">
        <DetailSection
          title="Check"
          rows={[
            {
              label: "Vendor invoice",
              value: `${payout.invoiceNo}, ${day(payout.invoiceDate)}`,
            },
            { label: "Orders performed", value: payout.orders },
            { label: "Their invoice", value: money(payout.theirInvoice) },
            {
              label: "Our records",
              value: money(payout.vendorCost + payout.fees),
            },
            { label: "Billed", value: money(payout.billed) },
            { label: "Margin", value: money(payoutMargin(payout)) },
          ]}
        />

        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs value={view} onValueChange={(v) => setView(v as View)}>
              <TabsList className={SUB_TABS_LIST}>
                {views.map((v) => (
                  <TabsTrigger key={v.id} value={v.id} className={SUB_TAB}>
                    {v.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            {view === "theirs" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.success(`${payout.invoiceNo} downloaded`)}
              >
                <IconDownload />
                Download invoice
              </Button>
            )}
          </div>
          {view === "ours" && (
            <OrderTable rows={payout.orderLines} side="ours" />
          )}
          {view === "theirs" && (
            <OrderTable rows={payout.orderLines} side="theirs" />
          )}
          {view === "practices" && <ByPractice payout={payout} />}
        </section>
      </div>
      <SheetFooter className="mt-0 shrink-0 flex-row items-center justify-end gap-2 border-t p-4">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {payout.status === "Ready" && (
          <Button onClick={() => pay(payout)}>
            Pay {money(payout.theirInvoice)}
          </Button>
        )}
      </SheetFooter>
    </>
  )
}

/** One side's full list: Inlay's orders, or the vendor's invoice lines. */
function OrderTable({
  rows,
  side,
}: {
  rows: PayoutOrder[]
  side: "ours" | "theirs"
}) {
  const total = rows.reduce(
    (s, o) => s + (side === "ours" ? o.ours : o.theirs),
    0
  )
  return (
    <div className="flex flex-col gap-2">
      <SettingsTable
        columns={[
          { header: "Date", className: "w-28" },
          { header: "Order", className: "w-28" },
          { header: "Practice", className: "hidden md:table-cell" },
          { header: "Test" },
          { header: "Amount", className: "text-right" },
        ]}
      >
        {rows.map((o) => (
          <TableRow key={o.id}>
            <TableCell className="text-foreground/80 tabular-nums">
              {day(o.date)}
            </TableCell>
            <TableCell className="tabular-nums">{o.id}</TableCell>
            <TableCell className="hidden truncate text-foreground/80 md:table-cell">
              {o.practice}
            </TableCell>
            <TableCell>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate">{o.test}</span>
              </div>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {money(side === "ours" ? o.ours : o.theirs)}
            </TableCell>
          </TableRow>
        ))}
      </SettingsTable>
      <div className="flex justify-end gap-6 px-4 text-sm">
        <span className="text-muted-foreground">
          {side === "ours" ? "Our records" : "Invoice total"}
        </span>
        <span className="font-semibold tabular-nums">{money(total)}</span>
      </div>
    </div>
  )
}

function ByPractice({ payout }: { payout: Payout }) {
  return (
    <SettingsTable
      columns={[
        { header: "Practice" },
        { header: "Orders", className: "w-20 text-right" },
        { header: "Vendor cost", className: "w-28 text-right" },
        { header: "Margin", className: "w-24 text-right" },
      ]}
    >
      {payout.lines.map((l) => (
        <TableRow key={l.id}>
          <TableCell>
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{l.practice}</span>
              <span className="truncate text-xs text-muted-foreground">
                {l.provider}
              </span>
            </div>
          </TableCell>
          <TableCell className="text-right tabular-nums">{l.orders}</TableCell>
          <TableCell className="text-right tabular-nums">
            {money(l.vendorCost, false)}
          </TableCell>
          <TableCell className="text-right tabular-nums">
            {money(payoutMargin(l), false)}
          </TableCell>
        </TableRow>
      ))}
    </SettingsTable>
  )
}
