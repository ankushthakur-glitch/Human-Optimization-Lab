"use client"

import { Tick02Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Button } from "@/design-system/ui/button"
import {
  Alert,
  Badge,
  type BadgeTone,
  DataTable,
  Td,
  Th,
  Tr,
} from "@/components/dashboard-kit"
import { usDay } from "@/components/provider/mock-clock"
import type { DashboardModel } from "@/components/patient-dashboard/model"
import type { OptimizationModel } from "@/components/patient-dashboard/optimization/model"
import { supplementsByTime } from "@/components/patient-dashboard/optimization/rules"
import type {
  Biomarker,
  MedicationChange,
} from "@/components/patient-dashboard/optimization/types"
import type { MedCase } from "@/components/patient-dashboard/rules"
import {
  AiChip,
  OptCard,
  markerLabel,
} from "@/components/patient-dashboard/optimization-computed/parts/ui"

/* The HOLv.9 medications block: the practice list against other sources
   (Confirm change or Not current settles a difference, as in the free
   view), an AI-found supplement conflict with its evidence, recent changes
   and the supplements by time of day. */

const DIVIDER = "border-[color-mix(in_oklab,var(--border)_65%,transparent)]"

const CHANGE: Record<
  MedicationChange["status"] | "Confirmed",
  { tone: BadgeTone; dot: string }
> = {
  Verify: { tone: "warning", dot: "bg-warning" },
  Active: { tone: "primary", dot: "bg-primary" },
  Unconfirmed: { tone: "warning", dot: "bg-warning" },
  Confirmed: { tone: "success", dot: "bg-success" },
}

export function Medications({
  model,
  core,
  onAll,
  onDecide,
  onAddConflict,
  onOpenMarker,
}: {
  model: OptimizationModel
  core: DashboardModel
  onAll: () => void
  onDecide: (c: MedCase, decision: "acknowledged" | "dismissed") => void
  onAddConflict: (item: string) => void
  onOpenMarker: (name: string, from: HTMLElement) => void
}) {
  const s = model.data.snapshot
  const caseFor = (name: string) =>
    core.cases.find((c) => c.medication === name && c.other)
  const groups = supplementsByTime(model.data.supplements)

  return (
    <OptCard
      id="meds"
      title="Medications"
      description="Practice list vs other sources"
      flush
      className="h-full"
      controls={
        <Button
          variant="link"
          size="xs"
          className="h-auto px-0 text-[13px]"
          onClick={onAll}
        >
          All medications ({model.medicationCount})
        </Button>
      }
    >
      <DataTable aria-label="Medications" minWidth={440}>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Current dosage</Th>
            <Th>Dosage change</Th>
          </tr>
        </thead>
        <tbody>
          {s.medications.map((m) => {
            const c = caseFor(m.name)
            return (
              <Tr key={m.name}>
                <Td className="font-medium">{m.name}</Td>
                <Td className="whitespace-nowrap">
                  <span className="flex flex-col">
                    <span>{m.dose}</span>
                    <span className="text-xs text-muted-foreground">
                      {m.prescriber}
                    </span>
                  </span>
                </Td>
                <Td>
                  {m.change ? (
                    <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <span className="flex flex-col whitespace-nowrap">
                        <span className="tabular-nums">
                          <s className="text-muted-foreground">
                            {m.change.from}
                          </s>{" "}
                          → <span className="font-semibold">{m.change.to}</span>
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {m.change.by} · {usDay(m.change.date)}
                        </span>
                      </span>
                      {c && (
                        <span className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDecide(c, "acknowledged")}
                          >
                            Confirm change
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="px-2"
                            onClick={() => onDecide(c, "dismissed")}
                          >
                            Not current
                          </Button>
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">None</span>
                  )}
                </Td>
              </Tr>
            )
          })}
        </tbody>
      </DataTable>

      <div className="flex flex-col gap-4 px-5 py-4">
        {model.conflicts.map((c) => {
          const evidence = model.marker(c.evidenceMarkerName)
          return (
            <Alert
              key={c.item}
              tone="warning"
              title={
                <span className="flex flex-wrap items-center gap-2">
                  {c.item} <AiChip />
                </span>
              }
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAddConflict(c.item)}
                >
                  Add to priorities
                </Button>
              }
            >
              <span className="flex flex-wrap items-center gap-1.5">
                Conflicts with
                {evidence ? (
                  <EvidenceBadge marker={evidence} onOpen={onOpenMarker} />
                ) : (
                  c.conflictsWith
                )}
              </span>
            </Alert>
          )
        })}

        {s.changes.length > 0 && (
          <section
            aria-labelledby="opt-changes-title"
            className="flex flex-col gap-2"
          >
            <h3
              id="opt-changes-title"
              className="text-[13px] text-muted-foreground"
            >
              Recent changes
            </h3>
            <ul className="flex flex-col gap-3">
              {s.changes.map((ch) => {
                const status =
                  ch.medication && !caseFor(ch.medication)
                    ? "Confirmed"
                    : ch.status
                const t = CHANGE[status]
                return (
                  <li
                    key={`${ch.date}-${ch.text}`}
                    className="grid grid-cols-[88px_10px_minmax(0,1fr)_auto] items-start gap-x-3"
                  >
                    <span className="text-[13px] text-muted-foreground tabular-nums">
                      {usDay(ch.date)}
                    </span>
                    <span
                      aria-hidden
                      className={cn("mt-1.5 size-2 rounded-full", t.dot)}
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="text-sm font-medium">{ch.text}</span>
                      <span className="text-xs text-muted-foreground">
                        {ch.sub}
                      </span>
                    </span>
                    <Badge
                      tone={t.tone}
                      icon={status === "Confirmed" ? Tick02Icon : undefined}
                    >
                      {status}
                    </Badge>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {groups.length > 0 && (
          <section
            aria-labelledby="opt-supplements-title"
            className={cn("flex flex-col gap-2 border-t pt-4", DIVIDER)}
          >
            <h3
              id="opt-supplements-title"
              className="text-[13px] text-muted-foreground"
            >
              Supplements
            </h3>
            <div className="grid grid-cols-2 gap-2 @md/card:grid-cols-3 @lg/card:grid-cols-5">
              {groups.map((g) => (
                <div
                  key={g.time}
                  className="flex min-w-0 flex-col gap-1 rounded-[5.76px] bg-surface-sunken px-3 py-2.5"
                >
                  <span className="text-xs text-muted-foreground">
                    {g.time}
                  </span>
                  {g.items.map((it) => (
                    <span
                      key={it.name}
                      className="text-[13px] font-medium"
                      title={`${it.brand} · ${it.dose}`}
                    >
                      {it.name}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </OptCard>
  )
}

/** "Vitamin D 63 ng/mL (target 40-60)": opens the marker. */
function EvidenceBadge({
  marker,
  onOpen,
}: {
  marker: Biomarker
  onOpen: (name: string, from: HTMLElement) => void
}) {
  const range =
    marker.targetLow != null && marker.targetHigh != null
      ? ` (target ${marker.targetLow}-${marker.targetHigh})`
      : ""
  return (
    <button
      type="button"
      onClick={(e) => onOpen(marker.name, e.currentTarget)}
      className="rounded-[4.32px] outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Badge
        tone="outline"
        className="cursor-pointer hover:bg-surface-row-hover"
      >
        {markerLabel(marker)}
        {range}
      </Badge>
    </button>
  )
}
