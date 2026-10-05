"use client"

import { Alert02Icon, ArrowRight02Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Button } from "@/design-system/ui/button"
import { Card, DataTable, FOCUS, KitIcon, Row, Td, Th } from "@/components/dashboard-kit-v2"
import { usDay } from "@/components/provider/mock-clock"
import { type DashboardModel, ME } from "@/components/patient-dashboard/model"
import { type MedCase, shortSource } from "@/components/patient-dashboard/rules"
import type { OptimizationModel } from "@/components/patient-dashboard/optimization/model"
import { supplementsByTime, targetText } from "@/components/patient-dashboard/optimization/rules"
import { medicationRows } from "@/components/patient-dashboard/optimization-v2/rules"
import { AiChip, DIVIDER, TextLink, markerLabel, optDomId } from "@/components/patient-dashboard/optimization-v2/ui"

/* One card: the practice's own list against the other sources and the
   patient's answers on the left (Confirm change means the practice updates
   its own EHR; Not current dismisses the difference), an AI-found
   supplement conflict with its evidence under it, and the supplements by
   time of day on the right. */

export function Medications({
  core,
  model,
  onAll,
  onDecide,
  onAddConflict,
  onOpenMarker,
}: {
  core: DashboardModel
  model: OptimizationModel
  onAll: () => void
  onDecide: (c: MedCase, decision: "acknowledged" | "dismissed") => void
  onAddConflict: (item: string) => void
  onOpenMarker: (name: string, from: HTMLElement) => void
}) {
  const rows = medicationRows(core, ME)
  const others = [...new Set(core.data.medications.filter((m) => !m.isPracticeList).map((m) => shortSource(m.source)))]
  const versus = [...others, "patient answers"].join(" and ")
  const groups = supplementsByTime(model.data.supplements)
  const domId = optDomId("meds")

  return (
    <Card id={domId} tabIndex={-1} aria-labelledby={`${domId}-title`} className="scroll-mt-3 outline-none xl:grid xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col">
        <header className="flex flex-wrap items-start gap-3 px-4 pt-4 pb-1">
          <div className="flex min-w-0 flex-col">
            <h2 id={`${domId}-title`} className="text-[15px] leading-[22px] font-semibold">
              Medications
            </h2>
            <p className="text-[13px] leading-[18px] text-muted-foreground">Your list vs {versus}</p>
          </div>
          <TextLink onClick={onAll} className="ml-auto text-[13px]">
            All medications ({model.medicationCount})
          </TextLink>
        </header>
        <div className="pt-2">
        <DataTable aria-label="Medications" minWidth={560}>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Your list</Th>
              <Th>Other source</Th>
              <Th>
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Row key={r.medication}>
                <Td className="py-3 font-medium">{r.medication}</Td>
                <Td className="whitespace-nowrap">
                  <span className="flex flex-col">
                    <span>{r.dose}</span>
                    {r.prescriber && <span className="text-xs text-muted-foreground">{r.prescriber}</span>}
                  </span>
                </Td>
                <Td>
                  <Difference c={r.case} />
                </Td>
                <Td className="text-right whitespace-nowrap">
                  {r.case && (
                    <span className="inline-flex gap-1.5">
                      <Button variant="outline" size="xs" className="h-7 px-2.5" onClick={() => onDecide(r.case!, "acknowledged")}>
                        Confirm change
                      </Button>
                      <Button variant="ghost" size="xs" className="h-7 px-2" onClick={() => onDecide(r.case!, "dismissed")}>
                        Not current
                      </Button>
                    </span>
                  )}
                </Td>
              </Row>
            ))}
          </tbody>
        </DataTable>
        </div>
        {model.conflicts.length > 0 && (
          <ul className="flex flex-col gap-2 px-4 pt-3 pb-4">
            {model.conflicts.map((c) => {
              const b = model.marker(c.evidenceMarkerName)
              const range = b ? targetText(b) : ""
              return (
                <li key={c.item} className="flex flex-wrap items-center gap-3 rounded-[7.2px] border border-warning-3 bg-warning-1 px-3.5 py-2.5">
                  <KitIcon icon={Alert02Icon} size={18} className="text-warning" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-medium">{c.item}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      Conflicts with{" "}
                      {b ? (
                        <button
                          type="button"
                          onClick={(e) => onOpenMarker(b.name, e.currentTarget)}
                          className={cn("rounded-sm underline-offset-2 hover:underline", FOCUS)}
                        >
                          {markerLabel(b)}
                        </button>
                      ) : (
                        c.conflictsWith
                      )}
                      {range && ` (target ${range})`}
                    </span>
                  </span>
                  <AiChip />
                  <Button variant="outline" size="xs" className="h-7 bg-card px-2.5" onClick={() => onAddConflict(c.item)}>
                    Add to priorities
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
        {rows.every((r) => !r.case) && model.conflicts.length === 0 && (
          <p className="px-4 py-3 text-[13px] text-muted-foreground">No discrepancies</p>
        )}
      </div>

      <section aria-labelledby={`${domId}-supplements`} className={cn("flex min-w-0 flex-col border-t xl:border-t-0 xl:border-l", DIVIDER)}>
        <header className="flex flex-col px-4 pt-4 pb-3">
          <h3 id={`${domId}-supplements`} className="text-[15px] leading-[22px] font-semibold">
            Supplements
          </h3>
          <p className="text-[13px] leading-[18px] text-muted-foreground tabular-nums">
            {model.data.supplements.length} {model.data.supplements.length === 1 ? "supplement" : "supplements"}
          </p>
        </header>
        <dl className="flex flex-col">
          {groups.map((g) => (
            <div key={g.time} className={cn("grid grid-cols-[88px_minmax(0,1fr)] items-baseline gap-3 border-t px-4 py-2.5", DIVIDER)}>
              <dt className="text-[13px] text-muted-foreground">{g.time}</dt>
              <dd className="text-sm" title={g.items.map((i) => `${i.name} · ${i.brand} · ${i.dose}`).join("\n")}>
                {g.items.map((i) => i.name).join(" · ")}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </Card>
  )
}

/** The other source's dose as a diff on the changed attribute, or what the patient says. */
function Difference({ c }: { c?: MedCase }) {
  if (!c) return <span className="text-muted-foreground">No change</span>
  if (c.other && c.practice)
    return (
      <span className="flex min-w-0 flex-col gap-0.5">
        <span aria-label={`Changed from ${c.practice.dose} to ${c.other.dose}`} className="flex flex-wrap items-center gap-1.5 tabular-nums">
          <s aria-hidden className="text-muted-foreground">
            {c.practice.dose}
          </s>
          <KitIcon icon={ArrowRight02Icon} size={14} />
          <span aria-hidden className="font-semibold">
            {c.other.dose}
          </span>
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {c.other.prescriber} · {usDay(c.other.date)}
        </span>
      </span>
    )
  if (c.answer)
    return (
      <span className="flex min-w-0 flex-col gap-0.5">
        <span>
          Patient: <span className="font-semibold">{c.answer.note ? c.answer.note.charAt(0).toLowerCase() + c.answer.note.slice(1) : c.answer.answer.toLowerCase()}</span>
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">Patient answers · {usDay(c.answer.date)}</span>
      </span>
    )
  return <span className="text-muted-foreground">No change</span>
}
