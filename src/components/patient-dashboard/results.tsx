"use client"

import * as React from "react"
import { InformationCircleIcon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Button } from "@/design-system/ui/button"
import {
  Badge,
  DataTable,
  FlagText,
  Row,
  SegmentedControl,
  Sparkline,
  Td,
  Th,
  TrendText,
  TrendWord,
} from "@/components/dashboard-kit-v2"
import { usDay } from "@/components/provider/mock-clock"
import {
  type DashboardModel,
  reportKey,
} from "@/components/patient-dashboard/model"
import {
  comparable,
  isRising,
  isUrgentReport,
  isUrgentResult,
  latestOf,
  previousOf,
  rangeText,
  sourceName,
  statusOf,
  trendOf,
} from "@/components/patient-dashboard/rules"
import type {
  ClinicalReport,
  LabResult,
} from "@/components/patient-dashboard/types"
import {
  Clip,
  HeaderLink,
  type OpenSection,
} from "@/components/patient-dashboard/ui"
import {
  Dot,
  EDGE,
  EmptyRow,
  SectionCard,
} from "@/components/patient-dashboard/section-card"

/* Results judged against their reference ranges: out of range, trending
   toward a limit, or abnormal reports nobody has reviewed. Rows sort
   urgent, then worsening, then furthest outside the range. A row selects
   the result shown in Result detail. Five rows show by default; the rest
   sit behind one "Show n more". In-range results are a count. Only the
   urgent row carries red. */

export type ResultsTab = "out" | "trending" | "reports"

const LIMIT = 5

const NOUN: Record<ResultsTab, string> = {
  out: "out of range",
  trending: "trending",
  reports: "reports",
}

export function Results({
  model,
  tab,
  onTab,
  selected,
  onSelect,
  onOpen,
  onReviewReport,
}: {
  model: DashboardModel
  tab: ResultsTab
  onTab: (tab: ResultsTab) => void
  selected?: string
  onSelect: (code: string) => void
  onOpen: OpenSection
  onReviewReport: (r: ClinicalReport) => void
}) {
  const [all, setAll] = React.useState(false)
  const rows = tab === "trending" ? model.trending : model.outOfRange
  const count = tab === "reports" ? model.reports.length : rows.length
  const hidden = all ? 0 : Math.max(0, count - LIMIT)

  /* The systems behind the listed rows, the practice's own lab first. */
  const readings =
    tab === "reports" ? model.reports : rows.map((l) => latestOf(l)!)
  const sources = [
    ...new Set(
      [...readings]
        .sort((a, b) => Number(a.isOutsideSource) - Number(b.isOutsideSource))
        .map((r) => sourceName(r.source))
    ),
  ]

  return (
    <SectionCard
      id="results"
      title="Results"
      description={sources.join(" · ") || "No results"}
      flush
      actions={
        <SegmentedControl
          label="Results"
          value={tab}
          onChange={(t) => {
            onTab(t)
            setAll(false)
          }}
          items={[
            {
              value: "out",
              label: "Out of range",
              count: model.outOfRange.length,
            },
            {
              value: "trending",
              label: "Trending",
              count: model.trending.length,
            },
            { value: "reports", label: "Reports", count: model.reports.length },
          ]}
        />
      }
      footer={
        <>
          {hidden > 0 && (
            <>
              <HeaderLink onClick={() => setAll(true)}>
                Show {hidden} more {NOUN[tab]}
              </HeaderLink>
              <Dot />
            </>
          )}
          <span className="text-muted-foreground">
            {model.inRange} in range
          </span>
          <Dot />
          <HeaderLink onClick={() => onOpen("labs")}>
            All lab results
          </HeaderLink>
        </>
      }
    >
      {tab === "reports" ? (
        <DataTable aria-label="Reports" minWidth={640}>
          <thead>
            <tr>
              <Th className={EDGE}>Report</Th>
              <Th>Finding</Th>
              <Th>Flag</Th>
              <Th>Source</Th>
              <Th className={EDGE}>
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {model.reports.length === 0 ? (
              <EmptyRow span={5}>No reports to review</EmptyRow>
            ) : (
              (all ? model.reports : model.reports.slice(0, LIMIT)).map((r) => (
                <ReportRow
                  key={reportKey(r)}
                  r={r}
                  onReview={() => onReviewReport(r)}
                />
              ))
            )}
          </tbody>
        </DataTable>
      ) : (
        <DataTable
          aria-label={tab === "out" ? "Out of range" : "Trending"}
          minWidth={640}
        >
          <thead>
            <tr>
              <Th className={EDGE}>Test</Th>
              <Th>Result</Th>
              <Th className="text-right">Range</Th>
              <Th className="text-right">Previous</Th>
              <Th className={EDGE}>Trend</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <EmptyRow span={5}>
                {tab === "out"
                  ? "No out-of-range results"
                  : "No trending results"}
              </EmptyRow>
            ) : (
              (all ? rows : rows.slice(0, LIMIT)).map((lab) => (
                <ResultRow
                  key={lab.code}
                  lab={lab}
                  selected={lab.code === selected}
                  onSelect={() => onSelect(lab.code)}
                />
              ))
            )}
          </tbody>
        </DataTable>
      )}
    </SectionCard>
  )
}

/** The flag beside a value: "↑ High", "↓ Low", a Critical badge, or nothing. */
export function ResultFlag({
  lab,
  className,
}: {
  lab: LabResult
  className?: string
}) {
  const s = statusOf(lab)
  if (s === "In range") return null
  if (s === "Critical")
    return (
      <Badge tone="error" className={className}>
        Critical
      </Badge>
    )
  return (
    <FlagText flag={s} urgent={isUrgentResult(lab)} className={className} />
  )
}

function ResultRow({
  lab,
  selected,
  onSelect,
}: {
  lab: LabResult
  selected: boolean
  onSelect: () => void
}) {
  const last = latestOf(lab)!
  const prev = previousOf(lab)
  const status = statusOf(lab)
  const urgent = isUrgentResult(lab)
  const trend = trendOf(lab)
  return (
    <Row
      selected={selected}
      onOpen={onSelect}
      aria-label={[
        urgent && "Urgent",
        lab.name,
        `${last.value} ${lab.unit}`,
        status,
      ]
        .filter(Boolean)
        .join(", ")}
    >
      <Td className={cn(EDGE, "min-w-52 py-2.5")}>
        <div className="flex min-w-0 flex-col gap-0.5">
          <Clip className="text-sm font-medium">{lab.name}</Clip>
          <span className="text-xs text-muted-foreground tabular-nums">
            {sourceName(last.source)} · {usDay(last.date)}
            {last.isOutsideSource && " · outside"}
          </span>
        </div>
      </Td>
      <Td className="whitespace-nowrap">
        <span className="inline-flex items-center gap-2">
          <span className="tabular-nums">
            <span
              className={cn(
                "text-[15px] font-bold",
                urgent && "text-destructive"
              )}
            >
              {last.value}
            </span>{" "}
            <span className="text-xs text-muted-foreground">{lab.unit}</span>
          </span>
          <ResultFlag lab={lab} />
        </span>
      </Td>
      <Td className="text-right whitespace-nowrap text-muted-foreground tabular-nums">
        {rangeText(lab)}
      </Td>
      <Td className="text-right whitespace-nowrap text-muted-foreground tabular-nums">
        {prev ? prev.value : ""}
      </Td>
      <Td className={cn(EDGE, "whitespace-nowrap")}>
        <span className="inline-flex items-center gap-2.5">
          <Sparkline
            label={`${lab.name} trend`}
            values={comparable(lab).map((r) => r.value)}
            low={lab.refLow}
            high={lab.refHigh}
            latest={
              urgent ? "out" : trend === "improving" ? "better" : "neutral"
            }
          />
          <TrendWord trend={trend} rising={isRising(lab)} urgent={urgent} />
        </span>
      </Td>
    </Row>
  )
}

function ReportRow({
  r,
  onReview,
}: {
  r: ClinicalReport
  onReview: () => void
}) {
  const urgent = isUrgentReport(r)
  return (
    <Row>
      <Td className={cn(EDGE, "py-2.5 text-sm font-medium whitespace-nowrap")}>
        {r.report}
      </Td>
      <Td className="max-w-64">
        <Clip>{r.finding}</Clip>
        <span className="text-xs text-muted-foreground tabular-nums">
          {usDay(r.date)}
        </span>
      </Td>
      <Td>
        {r.flag === "Critical" ? (
          <Badge tone="error">Critical</Badge>
        ) : (
          <TrendText
            icon={InformationCircleIcon}
            tone={urgent ? "urgent" : "neutral"}
          >
            {r.flag}
          </TrendText>
        )}
      </Td>
      <Td>
        <Clip className="text-muted-foreground">
          {`${sourceName(r.source)}${r.isOutsideSource ? " · outside" : ""}`}
        </Clip>
      </Td>
      <Td className={cn(EDGE, "text-right")}>
        <Button
          variant="outline"
          size="sm"
          className="h-[30px]"
          onClick={onReview}
        >
          Mark reviewed
        </Button>
      </Td>
    </Row>
  )
}
