"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/design-system/ui/button"
import { Badge, DataTable, ProgressBar, SegmentedControl, Sparkline, Td, Th, Tr, TrendBadge } from "@/components/dashboard-kit"
import { StatusBadge, TierBadge } from "@/components/patient-dashboard/optimization-computed/parts/markers"
import { isCalc, isRising, latestPoint, numericHistory, shown, targetText, trendOf } from "@/components/patient-dashboard/optimization/rules"
import { OptCard } from "@/components/patient-dashboard/optimization-computed/parts/ui"
import { GROUPS, type Group, type V2Model, rangeOf, sparkTone } from "@/components/patient-dashboard/optimization-computed/rules"

/* Every marker in one status group, grouped by category with the
   category's score as a bar in its header row: worst category first, Tier
   1 first inside it. Each row carries the tracker's next step under the
   name, the latest value with a sparkline over the target band, the
   recorded status and the computed trend; the row opens the side panel. */

const DIVIDER = "border-[color-mix(in_oklab,var(--border)_65%,transparent)]"

type OpenMarker = (name: string, from: HTMLElement) => void

export function MarkersByCategory({
  v2,
  group,
  onGroup,
  onOpen,
  onLabs,
}: {
  v2: V2Model
  group: Group
  onGroup: (g: Group) => void
  onOpen: OpenMarker
  onLabs: () => void
}) {
  const groups = v2.groups[group]
  const count = groups.reduce((n, g) => n + g.markers.length, 0)
  return (
    <OptCard
      id="markers"
      title="Markers by category"
      description={`${count} of ${v2.tracked} tracked · ${v2.categories.length} categories`}
      flush
      className="h-full"
      controls={
        <SegmentedControl
          label="Status group"
          value={group}
          onChange={onGroup}
          options={GROUPS.map((g) => ({ value: g, label: g, count: v2.counts[g] }))}
        />
      }
      footer={
        <span className="flex flex-wrap items-center gap-1">
          Status as recorded by the tracker ·
          <Button variant="link" size="xs" className="h-auto px-0 text-[13px]" onClick={onLabs}>
            full list in Lab results
          </Button>
        </span>
      }
    >
      {count === 0 ? (
        <p className="px-5 py-4 text-[13px] text-muted-foreground">None</p>
      ) : (
        <DataTable aria-label={`Markers: ${group}`} minWidth={640}>
          <thead>
            <tr>
              <Th>Biomarker</Th>
              <Th>Latest</Th>
              <Th>Target</Th>
              <Th>Status</Th>
              <Th>Trend</Th>
              <Th>Tier</Th>
            </tr>
          </thead>
          <tbody>
            {groups.map(({ category, markers }) => (
              <React.Fragment key={category.category}>
                <tr className={cn("border-b bg-surface-sunken", DIVIDER)}>
                  <th scope="rowgroup" colSpan={6} className="px-5 py-2 text-left">
                    <span className="flex flex-wrap items-center gap-3">
                      <span className="text-[13px] font-semibold">{category.label}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {markers.length} of {Object.values(category.counts).reduce((a, b) => a + b, 0)}
                      </span>
                      <span className="ml-auto flex items-center gap-2">
                        <ProgressBar
                          value={category.score / 100}
                          tone={category.score === 100 ? "success" : "primary"}
                          label={`${category.label} score ${category.score}%`}
                          className="h-1.5 w-[120px]"
                        />
                        <span className="w-9 text-right text-xs font-medium tabular-nums">{category.score}%</span>
                      </span>
                    </span>
                  </th>
                </tr>
                {markers.map((b) => {
                  const last = latestPoint(b)
                  const points = numericHistory(b).map((p) => p.n)
                  const trend = trendOf(b)
                  const range = rangeOf(b)
                  return (
                    <Tr key={b.name} onOpen={(from) => onOpen(b.name, from)}>
                      <Td>
                        <span className="flex w-[180px] flex-col">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate font-medium" title={b.name}>
                              {b.name}
                            </span>
                            {isCalc(b.name) && <Badge tone="light">Calc</Badge>}
                          </span>
                          {(b.nextStep ?? b.note) && (
                            <span className="truncate text-xs text-muted-foreground" title={b.nextStep ?? b.note}>
                              {b.nextStep ?? b.note}
                            </span>
                          )}
                        </span>
                      </Td>
                      <Td className="whitespace-nowrap tabular-nums">
                        <span className="flex items-center gap-2">
                          {last ? (
                            <span>
                              <span className="font-semibold">{shown(last.value)}</span>{" "}
                              {!/^(qualitative|genotype)$/.test(b.unit) && <span className="text-xs text-muted-foreground">{b.unit}</span>}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Not resulted</span>
                          )}
                          {points.length > 1 && (
                            <Sparkline
                              values={points}
                              low={range.low}
                              high={range.high}
                              tone={sparkTone(b, trend)}
                              label={`${b.name}, ${points.length} results`}
                            />
                          )}
                        </span>
                      </Td>
                      <Td className="whitespace-nowrap text-muted-foreground tabular-nums">{targetText(b) || "None"}</Td>
                      <Td>
                        <StatusBadge status={b.status} />
                      </Td>
                      <Td>{points.length > 0 ? <TrendBadge trend={trend} rising={isRising(b)} /> : <span className="text-muted-foreground">None</span>}</Td>
                      <Td>
                        <TierBadge tier={b.tier} />
                      </Td>
                    </Tr>
                  )
                })}
              </React.Fragment>
            ))}
          </tbody>
        </DataTable>
      )}
    </OptCard>
  )
}
