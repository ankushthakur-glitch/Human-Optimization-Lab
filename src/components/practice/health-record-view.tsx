"use client"

import * as React from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  XAxis,
  YAxis,
} from "recharts"
import { toast } from "@/design-system/ui/sonner"

import { cn } from "@/lib/utils"
import { SelectField } from "@/components/form-kit"
import { SUB_TAB, SUB_TABS_LIST } from "@/components/practice/directory"
import {
  type Biomarker,
  type HealthRecord,
  PLANS,
  type Trend,
  inRange,
  latest,
  rangeLabel,
  recommendPlan,
  sourceName,
  suggestedReason,
  trendOf,
} from "@/components/practice/health-record"
import {
  type Patient,
  fullName,
  shortDate,
  usDate,
} from "@/components/practice/practice-data"
import { DetailGrid, RecordCard } from "@/components/practice/record-page"
import { SideSheet, SideSheetHeader } from "@/components/practice/sheets"
import { Badge } from "@/design-system/ui/badge"
import { Button } from "@/design-system/ui/button"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/design-system/ui/chart"
import { Checkbox } from "@/design-system/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/design-system/ui/dialog"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/design-system/ui/empty"
import { Field, FieldLabel } from "@/design-system/ui/field"
import { SheetFooter } from "@/design-system/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/design-system/ui/tabs"
import { Textarea } from "@/design-system/ui/textarea"
import {
  Illustration,
  type IllustrationName,
} from "@/components/illustrations/illustration"

/* Pieces of the patient chart's lab results (biomarker trends) and the plan
   recommendation. Values are read-only; every one carries where it came
   from, and a change adds to the history instead of replacing it. */

/* -------------------------------------------------------------------------- */
/*  Small pieces                                                               */
/* -------------------------------------------------------------------------- */

const TREND_VARIANT: Record<Trend, "success" | "secondary" | "destructive"> = {
  Improving: "success",
  Stable: "secondary",
  Declining: "destructive",
}

export function TrendBadge({ trend }: { trend: Trend }) {
  return <Badge variant={TREND_VARIANT[trend]}>{trend}</Badge>
}

/** A tiny line of a marker's readings, drawn to the row's height. */
function Sparkline({ b, className }: { b: Biomarker; className?: string }) {
  const values = b.readings.map((r) => r.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const w = 64
  const h = 20
  const points = values
    .map(
      (v, i) =>
        `${(i / (values.length - 1)) * w},${h - 2 - ((v - min) / span) * (h - 4)}`
    )
    .join(" ")
  const trend = trendOf(b)
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn("h-5 w-16 overflow-visible", className)}
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={
          trend === "Declining"
            ? "stroke-destructive"
            : trend === "Improving"
              ? "stroke-success"
              : "stroke-muted-foreground"
        }
      />
    </svg>
  )
}

function Value({ b }: { b: Biomarker }) {
  const off = !inRange(b)
  return (
    <span className={cn("font-medium tabular-nums", off && "text-destructive")}>
      {latest(b).value}
      <span className="ml-1 text-xs font-normal text-muted-foreground">
        {b.unit}
      </span>
    </span>
  )
}

/* A record section with nothing in it: the art, one line, and at most a
   sentence. Sized for a card, smaller than a page's empty state. */
function RecordEmpty({
  illustration,
  title,
  children,
}: {
  illustration: IllustrationName
  title: string
  children?: React.ReactNode
}) {
  return (
    <Empty className="gap-3 p-6">
      <EmptyHeader>
        <EmptyMedia>
          <Illustration name={illustration} className="size-28" />
        </EmptyMedia>
        <EmptyTitle className="text-base">{title}</EmptyTitle>
        {children && <EmptyDescription>{children}</EmptyDescription>}
      </EmptyHeader>
    </Empty>
  )
}

function EmptyRow({
  cols,
  ...props
}: { cols: number } & React.ComponentProps<typeof RecordEmpty>) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={cols} className="p-0">
        <RecordEmpty {...props} />
      </TableCell>
    </TableRow>
  )
}

/* -------------------------------------------------------------------------- */
/*  Biomarkers                                                                 */
/* -------------------------------------------------------------------------- */

type MarkerFilter = "all" | "out" | "declining"

export function BiomarkersCard({ record }: { record: HealthRecord }) {
  const [filter, setFilter] = React.useState<MarkerFilter>("all")
  const [open, setOpen] = React.useState<Biomarker | null>(null)
  const all = record.biomarkers
  const groups: Record<MarkerFilter, Biomarker[]> = {
    all,
    out: all.filter((b) => !inRange(b)),
    declining: all.filter((b) => trendOf(b) === "Declining"),
  }
  const rows = groups[filter]

  return (
    <RecordCard
      title="Biomarkers"
      action={
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as MarkerFilter)}
        >
          <TabsList className={SUB_TABS_LIST}>
            <TabsTrigger value="all" className={SUB_TAB}>
              All ({groups.all.length})
            </TabsTrigger>
            <TabsTrigger value="out" className={SUB_TAB}>
              Out of range ({groups.out.length})
            </TabsTrigger>
            <TabsTrigger value="declining" className={SUB_TAB}>
              Declining ({groups.declining.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Biomarker</TableHead>
            <TableHead>Latest</TableHead>
            <TableHead className="hidden md:table-cell">Range</TableHead>
            <TableHead>Trend</TableHead>
            <TableHead className="hidden lg:table-cell">Result date</TableHead>
            <TableHead className="hidden xl:table-cell">Source</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <EmptyRow
              cols={6}
              illustration="biomarkers-in-range"
              title={
                filter === "out"
                  ? "Every biomarker is in range"
                  : filter === "declining"
                    ? "Nothing is declining"
                    : "No biomarkers yet"
              }
            />
          )}
          {rows.map((b) => (
            <TableRow
              key={b.id}
              className="cursor-pointer"
              onClick={() => setOpen(b)}
            >
              <TableCell>
                <Button
                  variant="link"
                  className="h-auto p-0 font-medium text-foreground"
                  onClick={(event) => {
                    event.stopPropagation()
                    setOpen(b)
                  }}
                >
                  {b.name}
                </Button>
                <div className="text-xs text-muted-foreground">{b.panel}</div>
              </TableCell>
              <TableCell>
                <Value b={b} />
              </TableCell>
              <TableCell className="hidden text-muted-foreground tabular-nums md:table-cell">
                {rangeLabel(b) || "No range"}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Sparkline b={b} className="hidden sm:block" />
                  <TrendBadge trend={trendOf(b)} />
                </div>
              </TableCell>
              <TableCell className="hidden tabular-nums lg:table-cell">
                {usDate(latest(b).date)}
              </TableCell>
              <TableCell className="hidden text-muted-foreground xl:table-cell">
                {sourceName(latest(b).sourceId)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <BiomarkerSheet marker={open} onClose={() => setOpen(null)} />
    </RecordCard>
  )
}

const chartConfig = {
  value: { label: "Value", color: "var(--primary)" },
}

function BiomarkerSheet({
  marker: b,
  onClose,
}: {
  marker: Biomarker | null
  onClose: () => void
}) {
  return (
    <SideSheet
      open={b !== null}
      onOpenChange={(open) => !open && onClose()}
      wide
    >
      {b && (
        <>
          <SideSheetHeader
            title={b.name}
            description={`Every ${b.name} result on record, with its source.`}
            badge={<TrendBadge trend={trendOf(b)} />}
          />
          <div className="flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto p-6">
            <DetailGrid
              className="grid-cols-2 sm:grid-cols-4"
              items={[
                { label: "Latest", value: <Value b={b} /> },
                { label: "Range", value: rangeLabel(b) },
                {
                  label: "Previous",
                  value: `${b.readings[b.readings.length - 2]?.value ?? ""} ${b.unit}`,
                },
                { label: "Panel", value: b.panel },
              ]}
            />
            {b.readings.length < 2 ? (
              <RecordEmpty
                illustration="single-reading"
                title="One reading so far"
              >
                The trend appears after the next result.
              </RecordEmpty>
            ) : (
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-56 w-full"
              >
                <LineChart
                  data={b.readings.map((r) => ({
                    date: shortDate(r.date),
                    value: r.value,
                  }))}
                  margin={{ left: 4, right: 16, top: 8, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} />
                  {(b.low != null || b.high != null) && (
                    <ReferenceArea
                      y1={b.low}
                      y2={b.high}
                      fill="var(--success)"
                      fillOpacity={0.08}
                      ifOverflow="extendDomain"
                    />
                  )}
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    width={40}
                    tickLine={false}
                    axisLine={false}
                    domain={["auto", "auto"]}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    dataKey="value"
                    type="monotone"
                    stroke="var(--color-value)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ChartContainer>
            )}
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold text-muted-foreground">
                History
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Result date</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Source ID
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Imported
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Original value
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...b.readings].reverse().map((r) => (
                    <TableRow key={r.sourceRef}>
                      <TableCell className="tabular-nums">
                        {usDate(r.date)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "font-medium tabular-nums",
                          !inRange(b, r.value) && "text-destructive"
                        )}
                      >
                        {r.value} {b.unit}
                      </TableCell>
                      <TableCell>{sourceName(r.sourceId)}</TableCell>
                      <TableCell className="hidden text-muted-foreground tabular-nums sm:table-cell">
                        {r.sourceRef}
                      </TableCell>
                      <TableCell className="hidden tabular-nums md:table-cell">
                        {usDate(r.importedAt)}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {r.original}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <SheetFooter className="mt-0 shrink-0 flex-row justify-end border-t p-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </SheetFooter>
        </>
      )}
    </SideSheet>
  )
}

/* -------------------------------------------------------------------------- */
/*  Recommend a plan                                                           */
/* -------------------------------------------------------------------------- */

export function RecommendPlanDialog({
  patient,
  record,
  open,
  onOpenChange,
}: {
  patient: Patient
  record: HealthRecord
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open && (
          <RecommendForm
            patient={patient}
            record={record}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function RecommendForm({
  patient,
  record,
  onDone,
}: {
  patient: Patient
  record: HealthRecord
  onDone: () => void
}) {
  const suggested = React.useMemo(() => suggestedReason(record), [record])
  const metabolic = suggested.findings.some(
    (id) => id === "a1c" || id === "glucose"
  )
  const [plan, setPlan] = React.useState<string>(
    metabolic ? "Metabolic Health" : "Healthy Longevity"
  )
  const [reason, setReason] = React.useState(suggested.text)
  const [findings, setFindings] = React.useState<string[]>(suggested.findings)
  const flagged = record.biomarkers.filter(
    (b) => !inRange(b) || trendOf(b) === "Declining"
  )

  function send() {
    const planId = PLANS.find((p) => p.name === plan)?.id ?? "longevity"
    recommendPlan({
      patientId: patient.id,
      planId,
      reason: reason.trim(),
      findings,
      /* The signed-in provider: this tab only shows in the provider portal. */
      by: "Dr. Elise Harrington",
    })
    toast.success("Recommendation sent", {
      description: `${fullName(patient)} will see it in the HOL app.`,
    })
    onDone()
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Recommend a plan</DialogTitle>
        <DialogDescription className="sr-only">
          Suggest an optimization plan to the patient with the reason.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-5">
        <SelectField
          id="rec-plan"
          label="Plan"
          required
          options={PLANS.map((p) => p.name)}
          value={plan}
          onChange={setPlan}
        />
        <Field>
          <FieldLabel>Based on</FieldLabel>
          <div className="flex flex-col gap-2">
            {flagged.map((b) => {
              const checked = findings.includes(b.id)
              return (
                <label key={b.id} className="flex items-center gap-2.5 text-sm">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(next) =>
                      setFindings((list) =>
                        next
                          ? [...list, b.id]
                          : list.filter((id) => id !== b.id)
                      )
                    }
                  />
                  <span className="min-w-0 flex-1 truncate">{b.name}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {b.readings[0].value} to {latest(b).value} {b.unit}
                  </span>
                </label>
              )
            })}
          </div>
        </Field>
        <Field>
          <FieldLabel htmlFor="rec-reason">Reason</FieldLabel>
          <Textarea
            id="rec-reason"
            rows={4}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={send} disabled={!plan || !reason.trim()}>
          Send to patient
        </Button>
      </DialogFooter>
    </>
  )
}
