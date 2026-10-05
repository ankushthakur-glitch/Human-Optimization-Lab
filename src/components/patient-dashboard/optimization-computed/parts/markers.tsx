"use client"

import * as React from "react"
import { Clock01Icon, Flag02Icon, Tick02Icon, ViewIcon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Button } from "@/design-system/ui/button"
import {
  Badge,
  DataTable,
  FlagBadge,
  Icon,
  SegmentedControl,
  Td,
  Th,
  Tr,
} from "@/components/dashboard-kit"
import { usDay } from "@/components/provider/mock-clock"
import type { OptimizationModel } from "@/components/patient-dashboard/optimization/model"
import { BANDS, type BandKey, shown } from "@/components/patient-dashboard/optimization/rules"
import type { Biomarker, SnapshotMarker } from "@/components/patient-dashboard/optimization/types"
import { AiChip, BasedOn, OptCard } from "@/components/patient-dashboard/optimization-computed/parts/ui"

/* The HOLv.9 marker bands as the sheet shows them (Out of target, On watch,
   Not yet tested), and the top priorities with their next milestones. A
   marker row opens its side panel; so does every Based on badge. */

type OpenMarker = (name: string, from: HTMLElement) => void

export function StatusBadge({ status }: { status: SnapshotMarker["status"] | Biomarker["status"] }) {
  if (status === "High" || status === "Low") return <FlagBadge flag={status} />
  if (status === "Watch")
    return (
      <Badge tone="warning" icon={ViewIcon}>
        Watch
      </Badge>
    )
  if (status === "Not yet tested" || status === "Not Yet Tested")
    return (
      <Badge tone="info" icon={Clock01Icon}>
        Not yet tested
      </Badge>
    )
  if (status === "Optimal" || status === "In Range")
    return (
      <Badge tone="success" icon={Tick02Icon}>
        {status === "Optimal" ? "Optimal" : "In range"}
      </Badge>
    )
  return <Badge tone="light">{status}</Badge>
}

export function TierBadge({ tier }: { tier?: string }) {
  if (!tier) return null
  return <Badge tone={tier === "Tier 1" ? "primary" : "light"}>{tier}</Badge>
}

export function Markers({
  model,
  band,
  onBand,
  onOpen,
  onLabs,
}: {
  model: OptimizationModel
  band: BandKey
  onBand: (band: BandKey) => void
  onOpen: OpenMarker
  onLabs: () => void
}) {
  const s = model.data.snapshot
  const rows = model.bands[band]
  const settled = s.counts["In range"] + s.counts.Optimal
  return (
    <OptCard
      id="markers"
      title="Markers"
      description={
        <span className="whitespace-normal">
          Latest draw {usDay(s.latestDraw)} · {s.bulk.count} results from {s.bulk.source} {usDay(s.bulk.date)}
        </span>
      }
      flush
      className="h-full"
      controls={
        <SegmentedControl
          label="Marker bands"
          value={band}
          onChange={onBand}
          options={BANDS.map((b) => ({ value: b, label: b, count: model.bands[b].length }))}
        />
      }
      footer={
        <span className="flex flex-wrap items-center gap-1">
          {settled} markers at optimal or in range ·
          <Button variant="link" size="xs" className="h-auto px-0 text-[13px]" onClick={onLabs}>
            full list in Lab results
          </Button>
        </span>
      }
    >
      {rows.length === 0 ? (
        <p className="px-5 py-4 text-[13px] text-muted-foreground">None</p>
      ) : (
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
            {rows.map((r) => {
              const marker = model.marker(r.name)
              return (
                <Tr key={r.name} onOpen={marker ? (from) => onOpen(marker.name, from) : undefined}>
                  <Td className="max-w-[180px] font-medium">{r.name}</Td>
                  <Td className="whitespace-nowrap tabular-nums">
                    {r.latest ? (
                      <>
                        <span className="font-semibold">{shown(r.latest)}</span>{" "}
                        <span className="text-xs text-muted-foreground">{r.unit}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Not resulted</span>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground tabular-nums">{r.target}</Td>
                  <Td>
                    <StatusBadge status={r.status} />
                  </Td>
                  <Td>
                    <TierBadge tier={r.tier} />
                  </Td>
                  <Td className="min-w-[200px] text-foreground/80">{r.whatToDo}</Td>
                </Tr>
              )
            })}
          </tbody>
        </DataTable>
      )}
    </OptCard>
  )
}

/* ----------------------------------------------------- top priorities -- */

export function TopPriorities({
  model,
  onApprove,
  onOrder,
  onOpen,
}: {
  model: OptimizationModel
  onApprove: () => void
  onOrder: (test: string) => void
  onOpen: OpenMarker
}) {
  const approved = model.prioritiesApproved
  const open = model.toOrder.filter((t) => t.status === "Discuss")
  return (
    <OptCard
      id="priorities"
      title="Top priorities"
      count={approved ? undefined : <AiChip />}
      description="Next milestone for each"
      flush
      className="h-full"
      controls={
        approved ? (
          <Badge tone="success" icon={Tick02Icon}>
            Approved {usDay(approved.at)}
          </Badge>
        ) : (
          <Button variant="outline" size="sm" onClick={onApprove}>
            Approve all
          </Button>
        )
      }
    >
      <ol>
        {model.priorities.map((p, i) => {
          const evidence = p.met ? [] : p.basedOn.map(model.marker).filter((b): b is Biomarker => Boolean(b))
          return (
            <li
              key={`${p.order}-${p.text}`}
              className="flex gap-3 border-b border-[color-mix(in_oklab,var(--border)_65%,transparent)] px-5 py-3"
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums",
                  p.met ? "bg-success-1 text-success" : "bg-primary-surface text-primary-tint"
                )}
              >
                {p.met ? <Icon icon={Tick02Icon} className="size-3.5" /> : i + 1}
                {p.met && <span className="sr-only">Met</span>}
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-sm font-medium">{p.text}</p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                  <Icon icon={Flag02Icon} className="size-3.5" />
                  <span className="sr-only">Next milestone</span>
                  {p.milestone}
                </p>
                <BasedOn markers={evidence} onOpen={onOpen} className="pt-0.5" />
              </div>
            </li>
          )
        })}
      </ol>
      {model.toOrder.length > 0 && (
        <section aria-labelledby="opt-order-title" className="flex flex-col">
          <div className="flex flex-col gap-0.5 px-5 pt-3.5 pb-2">
            <h3 id="opt-order-title" className="flex items-center gap-2 text-sm font-semibold">
              Order at next visit <Badge tone="info">{open.length}</Badge>
            </h3>
            <p className="text-[13px] text-muted-foreground">Not yet tested</p>
          </div>
          <ul>
            {model.toOrder.map((t) => (
              <li
                key={t.test}
                className="flex items-center gap-3 border-b border-[color-mix(in_oklab,var(--border)_65%,transparent)] px-5 py-2.5 last:border-0"
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium" title={t.test}>
                    {t.test}
                  </span>
                  <span className="truncate text-xs text-muted-foreground" title={t.why}>
                    {t.why}
                  </span>
                </div>
                <TierBadge tier={t.tier} />
                {t.status === "Ordered" ? (
                  <Badge tone="light" icon={Tick02Icon}>
                    Ordered
                  </Badge>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => onOrder(t.test)}>
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
