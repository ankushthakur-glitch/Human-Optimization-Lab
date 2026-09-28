"use client"

import * as React from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"
import { IconClock, IconUser } from "@/design-system/icons"

import { cn } from "@/lib/utils"
import {
  type Allergy,
  type HealthRecord,
  LOINC,
  SOURCES,
  type VitalSet,
  bmiOf,
  heightLabel,
  kgOf,
} from "@/components/practice/health-record"
import { today } from "@/components/practice/collection-store"
import { SUB_TAB, SUB_TABS_LIST } from "@/components/practice/directory"
import { type Patient, usDate } from "@/components/practice/practice-data"
import {
  FilterSelect,
  RecordTable,
  pageOffset,
  SearchBox,
  Section,
  SectionBar,
  SectionBody,
  SourceSelect,
  matches,
  useBarFilters,
} from "@/components/provider/chart-layout"
import { PracticeTag, useEntryDialog } from "@/components/provider/chart-forms"
import { usePaged } from "@/components/table-pager"
import { Badge } from "@/design-system/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/design-system/ui/tabs"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/design-system/ui/chart"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/ui/table"

/* One section per kind of record Health Gorilla returns, with the columns
   the Custom EHR lists use for it (data only; the look is ours). Rows stay
   one line of data; each ends in a menu whose View details popup carries the
   rest, the source included. Synced rows are read only. */

const PILL = "h-5 rounded-full px-2 text-[13px] font-normal"
const sourceName = (id: string) => SOURCES.find((s) => s.id === id)?.name ?? id
const no = (i: number) => String(i + 1).padStart(3, "0")

function Empty({ cols, children }: { cols: number; children: string }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={cols}
        className="py-8! text-center text-muted-foreground"
      >
        {children}
      </TableCell>
    </TableRow>
  )
}

/* -------------------------------------------------------------------------- */
/*  Diagnoses (Condition)                                                      */
/* -------------------------------------------------------------------------- */

export function DiagnosesView({ record }: { record: HealthRecord }) {
  const entry = useEntryDialog(record)
  const [status, setStatus] = React.useState("all")
  const bar = useBarFilters()
  const rows = record.conditions.filter(
    (c) =>
      (status === "all" || c.status === status) &&
      bar.fromOk(c) &&
      matches(bar.query, c.code, c.name, c.snomed, c.type, c.note)
  )
  const paged = usePaged(rows)
  return (
    <Section>
      <SectionBar
        title={`Diagnoses (${record.conditions.length})`}
        actions={
          <>
            <SearchBox
              value={bar.query}
              onChange={bar.setQuery}
              label="Search diagnoses"
            />
            <SourceSelect
              items={record.conditions}
              value={bar.from}
              onChange={bar.setFrom}
            />
            <FilterSelect
              label="Filter by status"
              value={status}
              onChange={setStatus}
              options={[
                { label: "All statuses", value: "all" },
                { label: "Active", value: "Active" },
                { label: "Historical", value: "Resolved" },
              ]}
            />
            {entry.addButton("condition")}
          </>
        }
      />
      <SectionBody className="flex flex-col pb-3">
        <RecordTable paged={paged}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">No.</TableHead>
                <TableHead>Diagnosis</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Onset date</TableHead>
                <TableHead>Recorded date</TableHead>
                <TableHead>Resolved date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="min-w-56">Note</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && <Empty cols={9}>No diagnoses match</Empty>}
              {paged.visible.map((c, i) => (
                <TableRow key={c.id}>
                  <TableCell className="text-muted-foreground">
                    {no(pageOffset(paged) + i)}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium tabular-nums">{c.code}</span>{" "}
                    {c.name}
                    <PracticeTag item={c} />
                  </TableCell>
                  <TableCell>{c.type}</TableCell>
                  <TableCell className="tabular-nums">
                    {usDate(c.onset)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {usDate(c.recorded)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {c.abated ? usDate(c.abated) : "Not resolved"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={c.status === "Active" ? "warning" : "secondary"}
                      className={PILL}
                    >
                      {c.status === "Resolved" ? "Historical" : c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-normal text-muted-foreground">
                    {c.note || "None"}
                  </TableCell>
                  <TableCell className="py-1.5!">
                    {entry.rowAction("condition", c, {
                      title: c.name,
                      codes: [
                        `ICD-10 ${c.code}`,
                        c.snomed && `SNOMED ${c.snomed}`,
                      ],
                      status: {
                        label:
                          c.status === "Resolved" ? "Historical" : c.status,
                        tone: c.status === "Active" ? "warning" : "secondary",
                      },
                      sections: [
                        { title: "Diagnosis", fields: [["Type", c.type]] },
                        {
                          title: "Dates",
                          fields: [
                            ["Onset", usDate(c.onset)],
                            ["Recorded", usDate(c.recorded)],
                            [
                              "Resolved",
                              c.abated ? usDate(c.abated) : "Not resolved",
                            ],
                          ],
                        },
                      ],
                      note: c.note,
                      source: sourceName(c.sourceId),
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </RecordTable>
      </SectionBody>
      {entry.dialog}
    </Section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Medications (MedicationStatement)                                          */
/* -------------------------------------------------------------------------- */

export function MedicationsView({
  record,
  tab,
  onTab,
}: {
  record: HealthRecord
  tab: "active" | "past"
  onTab: (tab: "active" | "past") => void
}) {
  const entry = useEntryDialog(record)
  const bar = useBarFilters()
  const active = record.medications.filter((m) => !m.ended)
  const past = record.medications.filter((m) => m.ended)
  const rows = (tab === "past" ? past : active).filter(
    (m) =>
      bar.fromOk(m) &&
      matches(bar.query, m.name, m.sig, m.route, m.prescriber, m.rxnorm)
  )
  const dxName = (code: string) =>
    record.conditions.find((c) => c.code === code)?.name ??
    (code === "J30.2" ? "Seasonal allergic rhinitis" : "")

  const paged = usePaged(rows)
  return (
    <Section>
      <SectionBar
        tabs={[
          { id: "active", label: `Active medications (${active.length})` },
          { id: "past", label: `Past medications (${past.length})` },
        ]}
        value={tab}
        onTab={(t) => onTab(t as "active" | "past")}
        actions={
          <>
            <SearchBox
              value={bar.query}
              onChange={bar.setQuery}
              label="Search medications"
            />
            <SourceSelect
              items={record.medications}
              value={bar.from}
              onChange={bar.setFrom}
            />
            {entry.addButton("medication")}
          </>
        }
      />
      <SectionBody className="flex flex-col pb-3">
        <RecordTable paged={paged}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-64">Medicines</TableHead>
                <TableHead>Sig</TableHead>
                <TableHead>Dispense</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Prescriber</TableHead>
                <TableHead>RxNorm</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <Empty cols={8}>
                  {tab === "past"
                    ? "No past medications"
                    : "No active medications"}
                </Empty>
              )}
              {paged.visible.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="whitespace-normal">
                    <span className="font-medium">{m.name}</span>
                    <PracticeTag item={m} />
                  </TableCell>
                  <TableCell className="min-w-56 whitespace-normal">
                    {m.sig}
                  </TableCell>
                  <TableCell>{m.quantity}</TableCell>
                  <TableCell className="tabular-nums">
                    {usDate(m.recorded)}
                  </TableCell>
                  <TableCell>{m.prescriber || "Not recorded"}</TableCell>
                  <TableCell className="tabular-nums">{m.rxnorm}</TableCell>
                  <TableCell>
                    <Badge
                      variant={m.ended ? "secondary" : "success"}
                      className={PILL}
                    >
                      {m.ended ? "Completed" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-1.5!">
                    {entry.rowAction("medication", m, {
                      title: m.name,
                      codes: [`RxNorm ${m.rxnorm}`],
                      status: m.ended
                        ? { label: "Completed", tone: "secondary" }
                        : { label: "Active", tone: "success" },
                      lead: ["Sig", m.sig],
                      sections: [
                        {
                          title: "Prescription",
                          fields: [
                            ["Dispense", m.quantity],
                            ["Route", m.route],
                            ["Frequency", m.frequency],
                            ["Prescriber", m.prescriber],
                            ["For", `${m.dx} ${dxName(m.dx)}`.trim()],
                          ],
                        },
                        {
                          title: "Dates",
                          fields: [
                            ["Start", usDate(m.started)],
                            ["End", m.ended ? usDate(m.ended) : "Ongoing"],
                            ["Recorded", usDate(m.recorded)],
                          ],
                        },
                      ],
                      note: m.note,
                      source: sourceName(m.sourceId),
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </RecordTable>
      </SectionBody>
      {entry.dialog}
    </Section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Allergies (AllergyIntolerance)                                             */
/* -------------------------------------------------------------------------- */

const SEVERITY: Record<
  Allergy["severity"],
  "secondary" | "warning" | "destructive"
> = { Mild: "secondary", Moderate: "warning", Severe: "destructive" }

export function AllergiesView({ record }: { record: HealthRecord }) {
  const entry = useEntryDialog(record)
  const [type, setType] = React.useState("all")
  const bar = useBarFilters()
  const rows = record.allergies.filter(
    (a) =>
      (type === "all" || a.category === type) &&
      bar.fromOk(a) &&
      matches(bar.query, a.substance, a.reaction, a.severity)
  )
  const paged = usePaged(rows)
  return (
    <Section>
      <SectionBar
        title={`Allergies (${record.allergies.length})`}
        actions={
          <>
            <SearchBox
              value={bar.query}
              onChange={bar.setQuery}
              label="Search allergies"
            />
            <SourceSelect
              items={record.allergies}
              value={bar.from}
              onChange={bar.setFrom}
            />
            <FilterSelect
              label="Filter by type"
              value={type}
              onChange={setType}
              options={[
                { label: "All types", value: "all" },
                { label: "Drug", value: "Drug" },
                { label: "Food", value: "Food" },
                { label: "Environmental", value: "Environmental" },
              ]}
            />
            {entry.addButton("allergy")}
          </>
        }
      />
      <SectionBody className="flex flex-col pb-3">
        <RecordTable paged={paged}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">No.</TableHead>
                <TableHead>Allergy type</TableHead>
                <TableHead>Allergy</TableHead>
                <TableHead>Reaction</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Onset date</TableHead>
                <TableHead>Recorded date</TableHead>
                <TableHead>Recorded by</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && <Empty cols={10}>No known allergies</Empty>}
              {paged.visible.map((a, i) => (
                <TableRow key={a.id}>
                  <TableCell className="text-muted-foreground">
                    {no(pageOffset(paged) + i)}
                  </TableCell>
                  <TableCell>{a.category}</TableCell>
                  <TableCell className="font-medium">
                    {a.substance}
                    <PracticeTag item={a} />
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    {a.reaction}
                  </TableCell>
                  <TableCell>
                    <Badge variant={SEVERITY[a.severity]} className={PILL}>
                      {a.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {usDate(a.onset)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {usDate(a.recorded)}
                  </TableCell>
                  <TableCell>{a.recordedBy}</TableCell>
                  <TableCell>{a.status}</TableCell>
                  <TableCell className="py-1.5!">
                    {entry.rowAction("allergy", a, {
                      title: a.substance,
                      codes: [a.category],
                      status: { label: a.severity, tone: SEVERITY[a.severity] },
                      lead: ["Reaction", a.reaction],
                      sections: [
                        {
                          title: "Details",
                          fields: [
                            ["Status", a.status],
                            ["Recorded by", a.recordedBy],
                          ],
                        },
                        {
                          title: "Dates",
                          fields: [
                            ["Onset", usDate(a.onset)],
                            ["Recorded", usDate(a.recorded)],
                          ],
                        },
                      ],
                      note: a.note,
                      source: sourceName(a.sourceId),
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </RecordTable>
      </SectionBody>
      {entry.dialog}
    </Section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Vitals (Observation, vital signs)                                          */
/* -------------------------------------------------------------------------- */

type Vital = {
  key: string
  label: string
  unit: string
  value: (v: VitalSet) => string
  high?: (v: VitalSet) => boolean
  /** The numbers the trend plots; blood pressure plots two lines. */
  points: (v: VitalSet) => { value: number; value2?: number }
  /** The normal band drawn behind the trend. */
  normal?: [number, number]
}

const VITALS: Vital[] = [
  {
    key: "bp",
    label: "Blood pressure",
    unit: "mmHg",
    value: (v) => `${v.systolic}/${v.diastolic}`,
    high: (v) => v.systolic >= 130 || v.diastolic >= 80,
    points: (v) => ({ value: v.systolic, value2: v.diastolic }),
  },
  {
    key: "heartRate",
    label: "Heart rate",
    unit: "bpm",
    value: (v) => `${v.heartRate}`,
    points: (v) => ({ value: v.heartRate }),
    normal: [60, 100],
  },
  {
    key: "respRate",
    label: "Respiratory rate",
    unit: "bpm",
    value: (v) => `${v.respRate}`,
    points: (v) => ({ value: v.respRate }),
    normal: [12, 20],
  },
  {
    key: "spo2",
    label: "Oxygen saturation",
    unit: "%",
    value: (v) => `${v.spo2}`,
    points: (v) => ({ value: v.spo2 }),
    normal: [95, 100],
  },
  {
    key: "temp",
    label: "Temperature",
    unit: "°F",
    value: (v) => `${v.tempF}`,
    points: (v) => ({ value: v.tempF }),
    normal: [97, 99],
  },
  {
    key: "height",
    label: "Height",
    unit: "",
    value: (v) => heightLabel(v.heightIn),
    points: (v) => ({ value: v.heightIn }),
  },
  {
    key: "weight",
    label: "Weight",
    unit: "kg",
    value: (v) => `${kgOf(v.weightLb)}`,
    points: (v) => ({ value: kgOf(v.weightLb) }),
  },
  {
    key: "bmi",
    label: "BMI",
    unit: "kg/m²",
    value: (v) => `${bmiOf(v)}`,
    high: (v) => bmiOf(v) >= 25,
    points: (v) => ({ value: Number(bmiOf(v)) }),
    normal: [18.5, 25],
  },
]

type VitalsTab = "cards" | "trends" | "table"

const trendConfig = {
  value: { label: "Value", color: "var(--primary)" },
  value2: { label: "Diastolic", color: "var(--primary-tint)" },
} satisfies ChartConfig

/* Oldest first, the way a trend reads left to right. */
function trendOf(k: Vital, sets: VitalSet[]) {
  return [...sets].reverse().map((v) => ({
    date: new Date(`${v.date}T12:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    when: `${usDate(v.date)}, ${v.time}`,
    /* Blood pressure flags each number against its own limit. */
    high: k.key === "bp" ? v.systolic >= 130 : (k.high?.(v) ?? false),
    high2: k.key === "bp" && v.diastolic >= 80,
    ...k.points(v),
  }))
}

/* The lines a clinician reads blood pressure against: stage 1 hypertension
   starts at 130 systolic or 80 diastolic. */
const BP_LIMITS = [130, 80]

function isoDaysAgo(days: number) {
  const [y, m, d] = today().split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d) - days * 86_400_000)
    .toISOString()
    .slice(0, 10)
}

const RANGES = [
  { id: "7", label: "1 week" },
  { id: "30", label: "1 month" },
  { id: "90", label: "90 days" },
]

/* Round steps (1, 2, 5, 10...) and a little room above and below, so the
   axis reads 120, 130, 140 and not 115, 135, 151. */
function niceAxis(values: number[]) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const raw = Math.max((max - min) / 4, 0.1)
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((x) => x >= raw)!
  const lo = Math.floor((min - step / 2) / step) * step
  const hi = Math.ceil((max + step / 2) / step) * step
  const ticks: number[] = []
  for (let t = lo; t <= hi + step / 1000; t += step)
    ticks.push(Math.round(t * 100) / 100)
  return { lo, hi, ticks }
}

type DotProps = {
  cx?: number
  cy?: number
  index?: number
  payload?: { high: boolean; high2: boolean }
  second?: boolean
}

/* A reading outside the normal range is drawn as a red dot. */
function ReadingDot({
  cx,
  cy,
  payload,
  small,
  second,
}: DotProps & { small: boolean }) {
  const high = second ? payload?.high2 : payload?.high
  const color = second ? "var(--color-value2)" : "var(--color-value)"
  return (
    <circle
      cx={cx}
      cy={cy}
      r={small ? 2.5 : 3.5}
      strokeWidth={1.5}
      stroke={high ? "var(--destructive)" : color}
      fill={high ? "var(--destructive)" : "var(--card)"}
    />
  )
}

function VitalTrend({ vital: k, sets }: { vital: Vital; sets: VitalSet[] }) {
  const bp = k.key === "bp"
  const config: ChartConfig = bp
    ? {
        value: { ...trendConfig.value, label: "Systolic" },
        value2: trendConfig.value2,
      }
    : { value: { ...trendConfig.value, label: k.label } }
  const data = trendOf(k, sets)
  const small = data.length > 20
  const axis = niceAxis(
    data.flatMap((d) => (d.value2 == null ? [d.value] : [d.value, d.value2]))
  )
  return (
    <ChartContainer
      config={config}
      className="aspect-auto min-h-0 w-full flex-1"
    >
      <LineChart
        data={data}
        margin={{ left: 4, right: bp ? 32 : 16, top: 8, bottom: 0 }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        {k.normal && (
          <ReferenceArea
            y1={k.normal[0]}
            y2={k.normal[1]}
            fill="var(--success)"
            fillOpacity={0.07}
            ifOverflow="hidden"
          />
        )}
        {bp &&
          BP_LIMITS.map((y) => (
            <ReferenceLine
              key={y}
              y={y}
              stroke="var(--destructive)"
              strokeOpacity={0.45}
              strokeDasharray="4 4"
              label={{
                value: `${y}`,
                position: "right",
                fontSize: 11,
                fill: "var(--destructive)",
              }}
            />
          ))}
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={28}
        />
        <YAxis
          width={40}
          tickLine={false}
          axisLine={false}
          allowDecimals={k.key === "temp" || k.key === "bmi"}
          domain={[axis.lo, axis.hi]}
          ticks={axis.ticks}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, items) => items?.[0]?.payload?.when}
            />
          }
        />
        <Line
          dataKey="value"
          type="linear"
          stroke="var(--color-value)"
          strokeWidth={1.75}
          dot={(p: DotProps) => (
            <ReadingDot key={p.index} {...p} small={small} />
          )}
          activeDot={{ r: 5 }}
        />
        {bp && (
          <Line
            dataKey="value2"
            type="linear"
            stroke="var(--color-value2)"
            strokeWidth={1.75}
            strokeDasharray="4 3"
            dot={(p: DotProps) => (
              <ReadingDot key={p.index} {...p} small={small} second />
            )}
            activeDot={{ r: 5 }}
          />
        )}
      </LineChart>
    </ChartContainer>
  )
}

function VitalTrends({
  sets: all,
  selected,
  onSelect,
}: {
  sets: VitalSet[]
  selected: string
  onSelect: (key: string) => void
}) {
  const [range, setRange] = React.useState("30")
  const k = VITALS.find((x) => x.key === selected) ?? VITALS[0]
  const latest = all[0]
  const since = isoDaysAgo(Number(range))
  const sets = all.filter((v) => v.date >= since)
  return (
    <div className="flex min-h-[420px] min-w-0 flex-1 flex-col rounded-md border bg-surface-sunken/60">
      <div
        role="tablist"
        aria-label="Vitals"
        className="grid shrink-0 auto-cols-[minmax(128px,1fr)] grid-flow-col overflow-x-auto rounded-t-md border-b"
      >
        {VITALS.map((x) => {
          const on = x.key === k.key
          const high = x.high?.(latest)
          return (
            <button
              key={x.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onSelect(x.key)}
              className={cn(
                "relative flex flex-col items-start gap-0.5 px-3 py-2.5 text-left transition-colors not-first:shadow-[inset_1px_0_0_var(--border)] first:rounded-tl-md last:rounded-tr-md",
                "after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:bg-primary after:opacity-0 after:transition-opacity",
                on ? "bg-card after:opacity-100" : "hover:bg-card/60"
              )}
            >
              <span
                className={cn(
                  "text-xs text-muted-foreground",
                  on && "font-medium text-foreground"
                )}
              >
                {x.label}
              </span>
              <span
                className={cn(
                  "text-[15px] font-semibold tabular-nums",
                  high
                    ? "text-destructive"
                    : on
                      ? "text-primary"
                      : "text-foreground"
                )}
              >
                {x.value(latest)}
                {x.unit && (
                  <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                    {x.unit}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-[15px] font-semibold">
              {k.label}
              {k.unit && (
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  ({k.unit})
                </span>
              )}
            </h3>
            <span className="text-xs text-muted-foreground tabular-nums">
              {sets.length} {sets.length === 1 ? "reading" : "readings"}
              {k.normal && `, normal ${k.normal[0]} to ${k.normal[1]}`}
            </span>
          </div>
          <Tabs value={range} onValueChange={(v) => setRange(v as string)}>
            <TabsList className={SUB_TABS_LIST}>
              {RANGES.map((r) => (
                <TabsTrigger key={r.id} value={r.id} className={SUB_TAB}>
                  {r.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        {sets.length < 2 ? (
          <p className="m-auto text-sm text-muted-foreground">
            {sets.length
              ? "One reading in this range"
              : "No readings in this range"}
          </p>
        ) : (
          <VitalTrend vital={k} sets={sets} />
        )}
      </div>
    </div>
  )
}

export function VitalsView({
  record,
  tab,
  onTab,
  selected,
  onSelect,
}: {
  record: HealthRecord
  tab: VitalsTab
  onTab: (tab: VitalsTab) => void
  selected: string
  onSelect: (key: string) => void
}) {
  const entry = useEntryDialog(record)
  const bar = useBarFilters()
  const sets = record.vitals.filter(
    (v) =>
      bar.fromOk(v) && matches(bar.query, usDate(v.date), v.date, v.recordedBy)
  )
  const [latest, previous] = sets
  const paged = usePaged(sets)
  return (
    <Section>
      <SectionBar
        tabs={[
          { id: "cards", label: "Card view" },
          { id: "trends", label: "Trend view" },
          { id: "table", label: "Table view" },
        ]}
        value={tab}
        onTab={(t) => onTab(t as VitalsTab)}
        actions={
          <>
            <SearchBox
              value={bar.query}
              onChange={bar.setQuery}
              label="Search vitals"
            />
            <SourceSelect
              items={record.vitals}
              value={bar.from}
              onChange={bar.setFrom}
            />
            {entry.addButton("vitals")}
          </>
        }
      />
      <SectionBody
        className={cn(
          tab !== "cards" && "flex flex-col",
          tab === "table" && "pb-3"
        )}
      >
        {!latest ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {record.vitals.length ? "No vitals match" : "No vitals on record"}
          </p>
        ) : tab === "cards" ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {VITALS.map((k) => {
              const high = k.high?.(latest)
              return (
                <button
                  type="button"
                  key={k.key}
                  onClick={() => onSelect(k.key)}
                  title={`View the ${k.label.toLowerCase()} trend`}
                  className="flex flex-col gap-3 rounded-md border bg-card p-4 text-left transition-colors hover:border-foreground/20"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{k.label}</span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      LOINC {LOINC[k.key]}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span
                      className={cn(
                        "text-xl font-semibold tabular-nums",
                        high && "text-destructive"
                      )}
                    >
                      {k.value(latest)}
                      {k.unit && (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          {k.unit}
                        </span>
                      )}
                    </span>
                    <span className="text-[13px] text-muted-foreground">
                      Previous:{" "}
                      {previous ? `${k.value(previous)} ${k.unit}` : "None"}
                    </span>
                    <span className="text-[13px] text-muted-foreground">
                      Note:{" "}
                      <span
                        className={cn(
                          "text-foreground",
                          high && "text-destructive"
                        )}
                      >
                        {high ? "Above normal" : "Normal"}
                      </span>
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 border-t pt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <IconClock className="size-4" />
                      {usDate(latest.date)}, {latest.time}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <IconUser className="size-4" />
                      {latest.recordedBy}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        ) : tab === "trends" ? (
          <VitalTrends sets={sets} selected={selected} onSelect={onSelect} />
        ) : (
          <RecordTable paged={paged}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date and time</TableHead>
                  {VITALS.map((k) => (
                    <TableHead key={k.key}>
                      {k.label}
                      {k.unit ? ` (${k.unit})` : ""}
                    </TableHead>
                  ))}
                  <TableHead>Recorded by</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.visible.map((v) => (
                  <TableRow key={(v as { id?: string }).id ?? v.date}>
                    <TableCell className="tabular-nums">
                      {usDate(v.date)}, {v.time}
                    </TableCell>
                    {VITALS.map((k) => (
                      <TableCell
                        key={k.key}
                        className={cn(
                          "tabular-nums",
                          k.high?.(v) && "text-destructive"
                        )}
                      >
                        {k.value(v)}
                      </TableCell>
                    ))}
                    <TableCell>{v.recordedBy}</TableCell>
                    <TableCell className="py-1.5!">
                      {entry.rowAction(
                        "vitals",
                        {
                          id: (v as { id?: string }).id ?? v.date,
                          sourceId: v.sourceId,
                        },
                        {
                          title: `Vitals on ${usDate(v.date)}`,
                          codes: [v.time],
                          sections: [
                            {
                              title: "Readings",
                              fields: VITALS.map(
                                (k): [string, React.ReactNode] => [
                                  k.label,
                                  <span
                                    key={k.key}
                                    className={cn(
                                      k.high?.(v) &&
                                        "font-medium text-destructive"
                                    )}
                                  >
                                    {k.value(v)}
                                    {k.unit && (
                                      <span className="text-muted-foreground">
                                        {" "}
                                        {k.unit}
                                      </span>
                                    )}
                                  </span>,
                                ]
                              ),
                            },
                            {
                              title: "Taken",
                              fields: [
                                ["How", v.context],
                                ["Recorded by", v.recordedBy],
                              ],
                            },
                          ],
                          note: v.note,
                          source: sourceName(v.sourceId),
                        }
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </RecordTable>
        )}
      </SectionBody>
      {entry.dialog}
    </Section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Vaccines (Immunization)                                                    */
/* -------------------------------------------------------------------------- */

function ageOn(dob: string, date: string) {
  const [by, bm, bd] = dob.split("-").map(Number)
  const [y, m, d] = date.split("-").map(Number)
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0)
}

export function VaccinesView({
  patient,
  record,
}: {
  patient: Patient
  record: HealthRecord
}) {
  const entry = useEntryDialog(record)
  const [status, setStatus] = React.useState("all")
  const bar = useBarFilters()
  const rows = record.immunizations.filter(
    (v) =>
      (status === "all" || v.status === status) &&
      bar.fromOk(v) &&
      matches(bar.query, v.vaccine, v.manufacturer, v.lot, v.by, v.performer)
  )
  const paged = usePaged(rows)
  return (
    <Section>
      <SectionBar
        title={`Vaccines (${record.immunizations.length})`}
        actions={
          <>
            <SearchBox
              value={bar.query}
              onChange={bar.setQuery}
              label="Search vaccines"
            />
            <SourceSelect
              items={record.immunizations}
              value={bar.from}
              onChange={bar.setFrom}
            />
            <FilterSelect
              label="Filter by status"
              value={status}
              onChange={setStatus}
              options={[
                { label: "All statuses", value: "all" },
                { label: "Administered", value: "Administered" },
                { label: "Historical", value: "Historical" },
                { label: "Refused", value: "Refused" },
              ]}
            />
            {entry.addButton("vaccine")}
          </>
        }
      />
      <SectionBody className="flex flex-col pb-3">
        <RecordTable paged={paged}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">No.</TableHead>
                <TableHead className="min-w-72">Vaccine name</TableHead>
                <TableHead>Administered date</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Lot</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && <Empty cols={8}>No vaccines match</Empty>}
              {paged.visible.map((v, i) => (
                <TableRow key={v.id}>
                  <TableCell className="text-muted-foreground">
                    {no(pageOffset(paged) + i)}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <div className="font-medium">
                      {v.vaccine}
                      <PracticeTag item={v} />
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {v.date ? usDate(v.date) : "Not given"}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {v.date && patient.dob ? ageOn(patient.dob, v.date) : ""}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <span
                      className={cn(
                        v.status === "Refused" && "text-destructive"
                      )}
                    >
                      {v.status}
                    </span>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {v.lot || "Not recorded"}
                  </TableCell>
                  <TableCell>{v.manufacturer || "Not recorded"}</TableCell>
                  <TableCell className="py-1.5!">
                    {entry.rowAction("vaccine", v, {
                      title: v.vaccine,
                      codes: [v.ndc && `NDC ${v.ndc}`],
                      status: {
                        label: v.status,
                        tone:
                          v.status === "Refused"
                            ? "destructive"
                            : v.status === "Administered"
                              ? "success"
                              : "secondary",
                      },
                      lead:
                        v.status === "Refused"
                          ? ["Reason refused", v.reason]
                          : undefined,
                      sections: [
                        {
                          title: "Dose",
                          fields: [
                            ["Dosage", v.dose],
                            ["Route", v.route],
                            ["Site", v.site],
                            ["Reaction", v.reaction],
                          ],
                        },
                        {
                          title: "Given",
                          fields: [
                            ["Date", v.date ? usDate(v.date) : ""],
                            ["Time", v.time],
                            [
                              "Age",
                              v.date && patient.dob
                                ? ageOn(patient.dob, v.date)
                                : "",
                            ],
                            [
                              v.status === "Refused"
                                ? "Recorded by"
                                : "Given by",
                              v.by,
                            ],
                            ["Ordered by", v.orderedBy],
                            ["Reported by", v.infoSource],
                          ],
                        },
                        {
                          title: "Product",
                          fields: [
                            ["Manufacturer", v.manufacturer],
                            ["Lot", v.lot],
                            ["Expiry", v.expiry ? usDate(v.expiry) : ""],
                          ],
                        },
                      ],
                      note: v.note,
                      source: sourceName(v.sourceId),
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </RecordTable>
      </SectionBody>
      {entry.dialog}
    </Section>
  )
}
