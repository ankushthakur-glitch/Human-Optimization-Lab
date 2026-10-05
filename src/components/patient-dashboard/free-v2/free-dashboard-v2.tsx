"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  DIVIDER,
  DataTable,
  FlagText,
  FOCUS,
  Row,
  Sparkline,
  Td,
  Th,
  TrendWord,
} from "@/components/dashboard-kit-v2"
import type { Patient } from "@/components/practice/practice-data"
import { usDay } from "@/components/provider/mock-clock"
import type { DashboardModel } from "@/components/patient-dashboard/model"
import type { Dashboard } from "@/components/patient-dashboard/patient-dashboard"
import {
  changeBetween,
  comparable,
  doseText,
  isOverdue,
  isRising,
  latestOf,
  rangeText,
  shortSource,
  statusOf,
  trendOf,
} from "@/components/patient-dashboard/rules"
import type { LabResult } from "@/components/patient-dashboard/types"
import {
  CardSkeleton,
  HeaderLink,
  type OpenSection,
} from "@/components/patient-dashboard/ui"

/* Version 2 of the free member's Dashboard, laid out like the Dashboard tab
   of the HOLv.9 biomarker tracker and filled from the free member's own EHR
   record: four status bands with their counts, Out of range beside the
   headline numbers, On watch beside what is due, Top priorities beside the
   medication table (your list against the other source), and the markers
   that sit in range. Version 1 (patient-dashboard.tsx) is unchanged; the
   chart picks between them with ?v=. */

type Band = "out" | "watch" | "due" | "range"

const BAND: Record<Band, { label: string; dot: string }> = {
  out: { label: "Out of range", dot: "bg-destructive" },
  watch: { label: "On watch", dot: "bg-warning" },
  due: { label: "Due or overdue", dot: "bg-info" },
  range: { label: "In range", dot: "bg-success" },
}

const domId = (b: Band | "priorities" | "meds") => `free-v2-${b}`

const jump = (id: string) =>
  requestAnimationFrame(() => {
    const el = document.getElementById(id)
    el?.scrollIntoView({ behavior: "smooth", block: "start" })
    el?.focus({ preventScroll: true })
  })

const SPAN: Record<number, string> = {
  4: "xl:col-span-4",
  5: "xl:col-span-5",
  6: "xl:col-span-6",
  7: "xl:col-span-7",
  8: "xl:col-span-8",
}

function Pair({
  left,
  right,
  spans,
}: {
  left: React.ReactNode
  right: React.ReactNode
  spans: [number, number]
}) {
  if (!left || !right) return <>{left ?? right}</>
  return (
    <div className="grid items-stretch gap-4 xl:grid-cols-12">
      <div className={cn("min-w-0", SPAN[spans[0]])}>{left}</div>
      <div className={cn("min-w-0", SPAN[spans[1]])}>{right}</div>
    </div>
  )
}

function Section({
  id,
  title,
  count,
  actions,
  children,
}: {
  id: string
  title: string
  count?: number
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card
      id={id}
      tabIndex={-1}
      aria-labelledby={`${id}-title`}
      className="h-full scroll-mt-3 outline-none"
    >
      <CardHeader
        title={title}
        titleId={`${id}-title`}
        count={count != null ? <Badge tone="light">{count}</Badge> : undefined}
        actions={actions}
      />
      {children}
    </Card>
  )
}

const valueOf = (lab: LabResult) => {
  const r = latestOf(lab)
  return r ? `${r.value} ${lab.unit}` : ""
}

/* ------------------------------------------------------------ model -- */

function bands(model: DashboardModel) {
  const out = model.outOfRange
  const watch = model.trending
  const due = [
    ...model.orders.map((o) => ({
      key: o.key,
      name: o.order,
      kind: "Order",
      since: o.orderedAt,
      clock: o.clock,
      reminders: o.reminderDates.length,
    })),
    ...model.gaps.map((g) => ({
      key: g.key,
      name: g.gap,
      kind: g.gapType,
      since: g.due,
      clock: g.clock,
      reminders: g.remindersSent,
    })),
  ].sort((a, b) => Number(isOverdue(b.clock)) - Number(isOverdue(a.clock)))
  const flagged = new Set([...out, ...watch].map((l) => l.code))
  const inRange = model.data.labs.filter(
    (l) => !flagged.has(l.code) && statusOf(l) === "In range"
  )
  return { out, watch, due, inRange }
}

type Priority = {
  title: string
  next: string
  tone: "error" | "warning" | "info"
}

function priorities(
  model: DashboardModel,
  b: ReturnType<typeof bands>
): Priority[] {
  const list: Priority[] = []
  for (const u of model.urgent.slice(0, 2))
    list.push({
      title: u.text,
      next: `Review the ${shortSource(u.source)} result from ${usDay(u.date)}`,
      tone: "error",
    })
  for (const c of model.cases.slice(0, 2))
    list.push({
      title: c.allergy
        ? `${c.medication} with a recorded ${c.allergy} allergy`
        : `${c.medication} differs between sources`,
      next: c.other
        ? `${shortSource(c.other.source)} lists ${doseText(c.other)}; confirm with the patient`
        : "Confirm what the patient takes",
      tone: c.allergy ? "error" : "warning",
    })
  for (const d of b.due.filter((x) => isOverdue(x.clock)).slice(0, 2))
    list.push({
      title: `${d.name} is overdue`,
      next: `${d.reminders} ${d.reminders === 1 ? "reminder" : "reminders"} sent; schedule or close it`,
      tone: "warning",
    })
  for (const l of b.watch.slice(0, 1))
    list.push({
      title: `${l.name} is trending ${isRising(l) ? "up" : "down"}`,
      next: `Repeat ${l.name} to confirm`,
      tone: "info",
    })
  return list.slice(0, 6)
}

/* ------------------------------------------------------------ cards -- */

function StatusBands({ b }: { b: ReturnType<typeof bands> }) {
  const counts: Record<Band, number> = {
    out: b.out.length,
    watch: b.watch.length,
    due: b.due.length,
    range: b.inRange.length,
  }
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {(Object.keys(BAND) as Band[]).map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => jump(domId(k))}
          className={cn(
            "flex min-w-0 flex-col gap-1 rounded-[7.2px] border border-border bg-card px-4 py-3 text-left transition-colors hover:border-foreground/20",
            FOCUS
          )}
        >
          <span className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
            <span
              aria-hidden
              className={cn("size-2 rounded-full", BAND[k].dot)}
            />
            {BAND[k].label}
          </span>
          <span
            className={cn(
              "text-2xl leading-8 font-semibold tabular-nums",
              counts[k] === 0 && "text-ring"
            )}
          >
            {counts[k]}
          </span>
        </button>
      ))}
    </div>
  )
}

function OutOfRange({
  labs,
  onOpen,
}: {
  labs: LabResult[]
  onOpen: OpenSection
}) {
  return (
    <Section
      id={domId("out")}
      title="Out of range"
      count={labs.length}
      actions={
        <HeaderLink onClick={() => onOpen("labs")}>Lab results</HeaderLink>
      }
    >
      {labs.length === 0 ? (
        <CardBody className="text-[13px] text-muted-foreground">
          Every result is inside its range
        </CardBody>
      ) : (
        <DataTable minWidth={640}>
          <thead>
            <tr>
              <Th>Marker</Th>
              <Th>Latest</Th>
              <Th>Range</Th>
              <Th>Status</Th>
              <Th>Trend</Th>
              <Th>Source</Th>
            </tr>
          </thead>
          <tbody>
            {labs.map((l) => {
              const r = latestOf(l)!
              const status = statusOf(l)
              const series = comparable(l).map((x) => x.value)
              return (
                <Row
                  key={l.code}
                  onOpen={() => onOpen("labs")}
                  className={cn("border-t", DIVIDER)}
                >
                  <Td className="font-medium">{l.name}</Td>
                  <Td className="tabular-nums">{valueOf(l)}</Td>
                  <Td className="text-muted-foreground tabular-nums">
                    {rangeText(l)}
                  </Td>
                  <Td>
                    {status === "Critical" ? (
                      <Badge tone="error" dot>
                        Critical
                      </Badge>
                    ) : (
                      <FlagText flag={status === "Low" ? "Low" : "High"} />
                    )}
                  </Td>
                  <Td>
                    <span className="flex items-center gap-2">
                      {series.length > 1 && (
                        <Sparkline
                          values={series}
                          low={l.refLow}
                          high={l.refHigh}
                          latest="out"
                          label={`${l.name} trend`}
                        />
                      )}
                      <TrendWord trend={trendOf(l)} rising={isRising(l)} />
                    </span>
                  </Td>
                  <Td className="text-muted-foreground tabular-nums">
                    {shortSource(r.source)} · {usDay(r.date)}
                  </Td>
                </Row>
              )
            })}
          </tbody>
        </DataTable>
      )}
    </Section>
  )
}

function Headlines({ model }: { model: DashboardModel }) {
  const rows = model.trends.filter((t) => t.points.length > 1)
  if (rows.length === 0) return null
  return (
    <Section id="free-v2-headlines" title="Headline numbers">
      <ul
        className={cn(
          "flex flex-col divide-y",
          DIVIDER.replace("border-", "divide-")
        )}
      >
        {rows.map((t) => {
          const first = t.points[0]
          const last = t.points[t.points.length - 1]
          const change = changeBetween(t, first.value, last.value)
          return (
            <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{t.label}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {usDay(first.date)} to {usDay(last.date)}
                </span>
              </span>
              <span className="text-sm tabular-nums">
                {first.value} →{" "}
                <span className="font-semibold">{last.value}</span> {t.unit}
              </span>
              <span
                className={cn(
                  "w-28 text-right text-xs font-medium tabular-nums",
                  change.flat
                    ? "text-muted-foreground"
                    : change.worse
                      ? "text-destructive"
                      : "text-success"
                )}
              >
                {change.text}
              </span>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}

function OnWatch({ labs }: { labs: LabResult[] }) {
  return (
    <Section id={domId("watch")} title="On watch" count={labs.length}>
      {labs.length === 0 ? (
        <CardBody className="text-[13px] text-muted-foreground">
          Nothing is trending toward a limit
        </CardBody>
      ) : (
        <ul
          className={cn(
            "flex flex-col divide-y",
            DIVIDER.replace("border-", "divide-")
          )}
        >
          {labs.map((l) => (
            <li key={l.code} className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{l.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  Range {rangeText(l)}
                </span>
              </span>
              <Sparkline
                values={comparable(l).map((x) => x.value)}
                low={l.refLow}
                high={l.refHigh}
                latest="neutral"
                label={`${l.name} trend`}
              />
              <span className="shrink-0 text-right text-sm font-semibold whitespace-nowrap tabular-nums">
                {valueOf(l)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function Due({ items }: { items: ReturnType<typeof bands>["due"] }) {
  return (
    <Section id={domId("due")} title="Due or overdue" count={items.length}>
      {items.length === 0 ? (
        <CardBody className="text-[13px] text-muted-foreground">
          No open orders or care gaps
        </CardBody>
      ) : (
        <ul
          className={cn(
            "flex flex-col divide-y",
            DIVIDER.replace("border-", "divide-")
          )}
        >
          {items.map((d) => {
            const late = isOverdue(d.clock)
            return (
              <li key={d.key} className="flex items-center gap-3 px-4 py-2.5">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{d.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {d.kind} ·{" "}
                    {d.clock.kind === "running"
                      ? `Open ${d.clock.day} days`
                      : `Scheduled ${usDay(d.clock.scheduledAt)}`}
                    {d.reminders > 0 &&
                      ` · ${d.reminders} ${d.reminders === 1 ? "reminder" : "reminders"}`}
                  </span>
                </span>
                {late ? (
                  <Badge tone="warning" dot>
                    Overdue
                  </Badge>
                ) : (
                  <Badge tone="light">Open</Badge>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Section>
  )
}

const PRIORITY_DOT = {
  error: "bg-destructive",
  warning: "bg-warning",
  info: "bg-info",
}

function TopPriorities({ items }: { items: Priority[] }) {
  return (
    <Section
      id={domId("priorities")}
      title="Top priorities"
      count={items.length}
    >
      {items.length === 0 ? (
        <CardBody className="text-[13px] text-muted-foreground">
          Nothing to act on
        </CardBody>
      ) : (
        <ol
          className={cn(
            "flex flex-col divide-y",
            DIVIDER.replace("border-", "divide-")
          )}
        >
          {items.map((p, i) => (
            <li key={p.title} className="flex items-start gap-3 px-4 py-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold tabular-nums">
                {i + 1}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span
                    aria-hidden
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      PRIORITY_DOT[p.tone]
                    )}
                  />
                  <span className="min-w-0">{p.title}</span>
                </span>
                <span className="text-[13px] text-muted-foreground">
                  {p.next}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Section>
  )
}

/** Name, your list (dose, prescriber), the other source's dose, and when it changed. */
function MedicationTable({
  model,
  onOpen,
}: {
  model: DashboardModel
  onOpen: OpenSection
}) {
  const listed = model.data.medications.filter((m) => m.isPracticeList)
  const caseFor = (name: string) =>
    model.cases.find((c) => c.medication.toLowerCase() === name.toLowerCase())
  const extra = model.cases.filter((c) => !c.practice)
  return (
    <Section
      id={domId("meds")}
      title="Medications"
      count={listed.length + extra.length}
      actions={
        <HeaderLink onClick={() => onOpen("medications")}>
          All medications
        </HeaderLink>
      }
    >
      <DataTable minWidth={600}>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Your list</Th>
            <Th>Other source</Th>
            <Th>Changed</Th>
          </tr>
        </thead>
        <tbody>
          {listed.map((m) => {
            const c = caseFor(m.medication)
            return (
              <Row
                key={m.medication}
                className={cn("border-t", DIVIDER, c && "bg-warning-1")}
              >
                <Td className="font-medium">{m.medication}</Td>
                <Td>
                  <span className="flex flex-col">
                    <span className="tabular-nums">{doseText(m)}</span>
                    <span className="text-xs text-muted-foreground">
                      {m.prescriber}
                    </span>
                  </span>
                </Td>
                <Td>
                  {c?.other ? (
                    <span className="flex flex-col">
                      <span className="font-medium text-warning tabular-nums">
                        {doseText(c.other)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {shortSource(c.other.source)}
                      </span>
                    </span>
                  ) : c?.answer ? (
                    <span className="flex flex-col">
                      <span className="font-medium text-warning">
                        {c.answer.answer}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Patient answer
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Matches</span>
                  )}
                </Td>
                <Td className="text-muted-foreground tabular-nums">
                  {c ? usDay(c.date) : "None"}
                </Td>
              </Row>
            )
          })}
          {extra.map((c) => (
            <Row key={c.key} className={cn("border-t bg-warning-1", DIVIDER)}>
              <Td className="font-medium">{c.medication}</Td>
              <Td className="text-muted-foreground">Not on your list</Td>
              <Td>
                {c.other && (
                  <span className="flex flex-col">
                    <span className="font-medium text-warning tabular-nums">
                      {doseText(c.other)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {shortSource(c.other.source)}
                    </span>
                  </span>
                )}
              </Td>
              <Td className="text-muted-foreground tabular-nums">
                {usDay(c.date)}
              </Td>
            </Row>
          ))}
        </tbody>
      </DataTable>
    </Section>
  )
}

function InRange({ labs, onOpen }: { labs: LabResult[]; onOpen: OpenSection }) {
  if (labs.length === 0) return null
  return (
    <Section
      id={domId("range")}
      title="In range"
      count={labs.length}
      actions={
        <HeaderLink onClick={() => onOpen("labs")}>Lab results</HeaderLink>
      }
    >
      <CardBody className="flex flex-wrap gap-2">
        {labs.map((l) => (
          <span
            key={l.code}
            className="inline-flex h-7 items-center gap-1.5 rounded-full bg-secondary px-3 text-[13px]"
          >
            <span aria-hidden className="size-1.5 rounded-full bg-success" />
            {l.name}
            <span className="text-muted-foreground tabular-nums">
              {valueOf(l)}
            </span>
          </span>
        ))}
      </CardBody>
    </Section>
  )
}

/* ------------------------------------------------------------ page -- */

export function FreeDashboardV2({
  dash,
  onOpen,
}: {
  dash: Dashboard
  patient: Patient
  onOpen: OpenSection
}) {
  const { ready, model } = dash
  const b = React.useMemo(() => (ready ? bands(model) : null), [ready, model])
  const top = React.useMemo(
    () => (ready && b ? priorities(model, b) : []),
    [ready, model, b]
  )

  if (!ready || !b)
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <CardSkeleton rows={1} />
        <CardSkeleton rows={5} />
        <CardSkeleton rows={4} />
      </div>
    )

  return (
    <div className="flex flex-col gap-4">
      <StatusBands b={b} />
      <Pair
        spans={[8, 4]}
        left={<OutOfRange labs={b.out} onOpen={onOpen} />}
        right={<Headlines model={model} />}
      />
      <Pair
        spans={[6, 6]}
        left={<OnWatch labs={b.watch} />}
        right={<Due items={b.due} />}
      />
      <Pair
        spans={[5, 7]}
        left={<TopPriorities items={top} />}
        right={<MedicationTable model={model} onOpen={onOpen} />}
      />
      <InRange labs={b.inRange} onOpen={onOpen} />
    </div>
  )
}
