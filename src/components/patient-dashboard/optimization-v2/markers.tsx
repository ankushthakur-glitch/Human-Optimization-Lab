"use client"

import * as React from "react"
import { PlusSignIcon, Tick02Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Button } from "@/design-system/ui/button"
import { DataTable, FlagText, KitIcon, Row, SegmentedControl, Td, Th } from "@/components/dashboard-kit-v2"
import { usDay } from "@/components/provider/mock-clock"
import type { OptimizationModel } from "@/components/patient-dashboard/optimization/model"
import { BANDS, type BandKey, shown } from "@/components/patient-dashboard/optimization/rules"
import type { SnapshotMarker } from "@/components/patient-dashboard/optimization/types"
import { type MarkerRow, markerTable } from "@/components/patient-dashboard/optimization-v2/rules"
import { DIVIDER, OptCard, TextLink } from "@/components/patient-dashboard/optimization-v2/ui"

/* The HOLv.9 marker bands as the sheet shows them: Out of target, On
   watch, Not yet tested. Tier 1 rows show by default, the rest behind one
   link. Under the table, the tests to order at the next visit. A row
   opens the marker's side panel. */

type OpenMarker = (name: string, from: HTMLElement, list?: string[]) => void

function Status({ status }: { status: SnapshotMarker["status"] }) {
  if (status === "High" || status === "Low") return <FlagText flag={status} urgent />
  if (status === "Watch") return <span className="text-xs font-medium text-warning">Watch</span>
  return <span className="text-xs font-medium text-muted-foreground">Not yet tested</span>
}

function Tier({ tier }: { tier?: string }) {
  if (!tier) return null
  return <span className={cn("text-[13px] whitespace-nowrap", tier === "Tier 1" ? "font-medium" : "text-muted-foreground")}>{tier}</span>
}

export function Markers({
  model,
  band,
  category,
  onBand,
  onClearCategory,
  onOpen,
  onOrder,
  onLabs,
}: {
  model: OptimizationModel
  band: BandKey
  /** A category picked in Score by category. */
  category?: string
  onBand: (band: BandKey) => void
  onClearCategory: () => void
  onOpen: OpenMarker
  onOrder: (test: string) => void
  onLabs: () => void
}) {
  const s = model.data.snapshot
  /* The one band and filter whose Tier 2 rows are open; any other view starts collapsed. */
  const view = `${band}|${category ?? ""}`
  const [openView, setOpenView] = React.useState<string | null>(null)
  const more = openView === view
  const setMore = (next: boolean) => setOpenView(next ? view : null)
  const table = markerTable(model, band, category)
  const rows = more ? [...table.first, ...table.rest] : table.first
  const names = rows.map((r) => model.marker(r.name)?.name).filter((n): n is string => Boolean(n))
  const settled = s.counts["In range"] + s.counts.Optimal

  return (
    <OptCard
      id="markers"
      title="Markers"
      description={
        <span className="flex flex-wrap items-center gap-x-1.5">
          Tier 1 first · latest draw {usDay(s.latestDraw)}
          {category && (
            <>
              <span>· {category}</span>
              <TextLink onClick={onClearCategory}>Clear</TextLink>
            </>
          )}
        </span>
      }
      actions={
        <SegmentedControl
          label="Marker bands"
          value={band}
          onChange={onBand}
          items={BANDS.map((b) => ({ value: b, label: b, count: s.counts[b] }))}
        />
      }
      flush
      footer={
        <p className="text-muted-foreground">
          {settled} markers at optimal or in range · {s.bulk.count} results from {s.bulk.source} {usDay(s.bulk.date)} ·{" "}
          <TextLink onClick={onLabs}>All lab results</TextLink>
        </p>
      }
    >
      <div className="pt-2">
      <DataTable aria-label={`Markers: ${band}`} minWidth={720}>
        <thead>
          <tr>
            <Th>Biomarker</Th>
            <Th>Latest</Th>
            <Th>Target</Th>
            <Th>Status</Th>
            <Th>Tier</Th>
            <Th>What to do</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <Td colSpan={6} className="py-4 text-[13px] text-muted-foreground">
                No markers in this band{category ? ` for ${category}` : ""}
                {category && (
                  <>
                    {" · "}
                    <TextLink onClick={onClearCategory}>Clear filters</TextLink>
                  </>
                )}
              </Td>
            </tr>
          ) : (
            rows.map((r) => <MarkerLine key={r.name} r={r} model={model} onOpen={(name, from) => onOpen(name, from, names)} />)
          )}
        </tbody>
      </DataTable>
      </div>
      {table.more && (
        <div className="px-4 py-2.5">
          <TextLink onClick={() => setMore(!more)} className="text-[13px]">
            {more ? `Hide ${table.rest.length} markers` : table.more}
          </TextLink>
        </div>
      )}

      {model.toOrder.length > 0 && (
        <section aria-labelledby="opt-order-title" className={cn("border-t", DIVIDER)}>
          <h3 id="opt-order-title" className="flex items-baseline gap-2 px-4 pt-3 pb-1 text-sm font-semibold">
            Order at next visit <span className="text-xs font-normal text-muted-foreground">· not yet tested</span>
          </h3>
          <ul>
            {model.toOrder.map((t) => (
              <li key={t.test} className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto_auto] items-center gap-4 px-4 py-2">
                <span className="truncate text-[13px] font-medium" title={t.test}>
                  {t.test}
                </span>
                <span className="truncate text-xs text-muted-foreground" title={t.why}>
                  {t.why}
                </span>
                <span className="text-xs text-muted-foreground">{t.tier}</span>
                {t.status === "Ordered" ? (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <KitIcon icon={Tick02Icon} size={12} /> Ordered
                  </span>
                ) : (
                  <Button variant="ghost" size="xs" className="h-7 px-2" onClick={() => onOrder(t.test)}>
                    <KitIcon icon={PlusSignIcon} size={12} />
                    Order
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </OptCard>
  )
}

function MarkerLine({ r, model, onOpen }: { r: MarkerRow; model: OptimizationModel; onOpen: (name: string, from: HTMLElement) => void }) {
  const marker = model.marker(r.name)
  return (
    <Row onOpen={marker ? (from) => onOpen(marker.name, from) : undefined}>
      <Td className="max-w-[200px] truncate py-2.5 font-medium" title={r.name}>
        {r.name}
      </Td>
      <Td className="whitespace-nowrap tabular-nums">
        {r.latest ? (
          <>
            <span className="text-[15px] font-bold">{shown(r.latest)}</span>{" "}
            <span className="text-xs text-muted-foreground">{r.unit}</span>
          </>
        ) : (
          <span className="text-muted-foreground">Not resulted</span>
        )}
      </Td>
      <Td className="whitespace-nowrap text-muted-foreground tabular-nums">{r.target}</Td>
      <Td>
        <Status status={r.status} />
      </Td>
      <Td>
        <Tier tier={r.tier} />
      </Td>
      <Td className="min-w-[200px]">{r.whatToDo}</Td>
    </Row>
  )
}
