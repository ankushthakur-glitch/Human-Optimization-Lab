"use client"

import * as React from "react"
import { IconDownload } from "@/design-system/icons"

import { cn } from "@/lib/utils"
import {
  BILLING_REPORTS,
  PNL,
  money,
} from "@/components/admin/billing/billing-data"
import { CARD } from "@/components/admin/dashboard-charts"
import { exportRows } from "@/components/practice/directory"
import { ToolbarSelect } from "@/components/provider/reports/reports"
import {
  type Counts,
  countsFor,
  periodsFor,
} from "@/components/provider/reports/reports-data"
import { Button } from "@/design-system/ui/button"
import { Card } from "@/design-system/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/ui/table"

/* Billing's profit and loss, laid out like the deck's Reports screen: one
   statement per channel and the consolidated position for a month, then
   the margin each test makes and the tax collected per state. The same
   numbers as the P&L, margin and tax reports in Reports. */

const MARGIN = BILLING_REPORTS.find((r) => r.id === "margin-per-test")!
const TAX = BILLING_REPORTS.find((r) => r.id === "tax")!

const STATE_NAMES: Record<string, string> = {
  MI: "Michigan",
  OH: "Ohio",
  IN: "Indiana",
  FL: "Florida",
  TX: "Texas",
  CA: "California",
  NY: "New York",
}

/* The statement's lines, each worked out from a channel's counts; costs
   and refunds read as negatives. */
const LINES: { label: string; value: (c: Counts) => number; total?: true }[] = [
  { label: "Testing revenue", value: (c) => c.testing },
  { label: "Membership revenue", value: (c) => c.membership },
  { label: "AI credit", value: (c) => c.ai },
  { label: "Vendor cost", value: (c) => -c.cost },
  { label: "Physician review fees", value: (c) => -c.reviews },
  { label: "Refunds and credits", value: (c) => -c.refunds },
  {
    label: "Net",
    value: (c) =>
      c.testing + c.membership + c.ai - c.cost - c.reviews - c.refunds,
    total: true,
  },
]

const whole = (n: number) => money(Math.round(n), false)

const KINDS = ["Month", "Quarter", "Year"] as const
type Kind = (typeof KINDS)[number]

export function BillingStatement({ heading }: { heading: React.ReactNode }) {
  const [kind, setKind] = React.useState<Kind>("Month")
  const periods = periodsFor(kind)
  /* A month opens on the last closed one; a quarter or year on the current. */
  const [key, setKey] = React.useState(periods[1].key)
  const month =
    periods.find((m) => m.key === key) ?? periods[kind === "Month" ? 1 : 0]

  const provider = countsFor(PNL, "provider", month, null)
  const patient = countsFor(PNL, "patient", month, null)

  const margins = MARGIN.rows!.items.map((t) => {
    const c = countsFor(MARGIN, t.id, month, null)
    return { ...t, each: c.orders ? (c.revenue - c.cost) / c.orders : 0 }
  })
  const taxes = TAX.rows!.items.map((s) => ({
    ...s,
    tax: countsFor(TAX, s.id, month, null).tax,
  }))

  function exportForFinance() {
    void exportRows(`Profit and loss ${month.label}`, [
      ...LINES.map((l) => ({
        Line: l.label,
        "Provider channel": whole(l.value(provider)),
        "Patient channel": whole(l.value(patient)),
        Consolidated: whole(l.value(provider) + l.value(patient)),
      })),
      { Line: "" },
      ...margins.map((m) => ({
        Line: `Margin per order, ${m.name}`,
        Consolidated: money(m.each),
      })),
      ...taxes.map((t) => ({
        Line: `Tax collected, ${STATE_NAMES[t.id] ?? t.id}`,
        Consolidated: money(t.tax),
      })),
    ])
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-surface-sunken px-4 pt-3 pb-6 *:shrink-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {heading}
        <div className="flex items-center gap-3">
          <ToolbarSelect
            label="Period"
            className="w-32"
            items={KINDS.map((k) => ({ label: k, value: k }))}
            value={kind}
            onChange={(next) => {
              const k = next as Kind
              setKind(k)
              setKey(periodsFor(k)[k === "Month" ? 1 : 0].key)
            }}
          />
          <ToolbarSelect
            key={kind}
            label={kind}
            className="w-44"
            items={periods.map((m) => ({ label: m.label, value: m.key }))}
            value={month.key}
            onChange={setKey}
          />
          <Button
            variant="outline"
            size="sm"
            className="rounded-md"
            onClick={exportForFinance}
          >
            <IconDownload />
            Export for finance
          </Button>
        </div>
      </div>

      <Card className={cn(CARD, "overflow-hidden")}>
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b px-4 py-3">
          <h2 className="text-base font-semibold">
            Profit and loss by channel
          </h2>
          <span className="text-xs text-muted-foreground">{month.label}</span>
        </div>
        <Table>
          <TableHeader className="bg-surface-head [&_th]:h-9 [&_th]:px-4 [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground">
            <TableRow className="hover:bg-transparent">
              <TableHead />
              <TableHead className="text-right">Provider channel</TableHead>
              <TableHead className="text-right">Patient channel</TableHead>
              <TableHead className="text-right">Consolidated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="[&_td]:px-4 [&_td]:py-3">
            {LINES.map((l) => {
              const a = l.value(provider)
              const b = l.value(patient)
              return (
                <TableRow
                  key={l.label}
                  className={cn(
                    l.total &&
                      "bg-surface-head font-semibold hover:bg-surface-head"
                  )}
                >
                  <TableCell className={cn(!l.total && "text-foreground/90")}>
                    {l.label}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {whole(a)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {whole(b)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {whole(a + b)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <ListCard
          title="Margin per test"
          meta="Per order"
          rows={margins.map((m) => ({
            key: m.id,
            label: m.name,
            value: money(m.each),
          }))}
        />
        <ListCard
          title="Tax collected"
          meta="Patient channel"
          rows={taxes.map((t) => ({
            key: t.id,
            label: STATE_NAMES[t.id] ?? t.id,
            value: money(t.tax),
          }))}
        />
      </div>
    </div>
  )
}

function ListCard({
  title,
  meta,
  rows,
}: {
  title: string
  meta: string
  rows: { key: string; label: string; value: string }[]
}) {
  return (
    <Card className={cn(CARD, "gap-0")}>
      <div className="flex items-baseline justify-between gap-2 border-b px-4 py-3">
        <h2 className="text-base font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground">{meta}</span>
      </div>
      <dl className="flex flex-col gap-2.5 px-4 py-4 text-sm">
        {rows.map((r) => (
          <div
            key={r.key}
            className="flex items-baseline justify-between gap-4"
          >
            <dt className="truncate text-muted-foreground">{r.label}</dt>
            <dd className="tabular-nums">{r.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}
