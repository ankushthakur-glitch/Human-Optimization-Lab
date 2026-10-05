"use client"

import * as React from "react"
import { Alert02Icon, ArrowRight02Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Button } from "@/design-system/ui/button"
import {
  Badge,
  DataTable,
  KitIcon,
  Row,
  Td,
  Th,
} from "@/components/dashboard-kit-v2"
import { usDay } from "@/components/provider/mock-clock"
import type { DashboardModel } from "@/components/patient-dashboard/model"
import {
  type MedCase,
  doseText,
  sourceName,
} from "@/components/patient-dashboard/rules"
import {
  Clip,
  HeaderLink,
  type OpenSection,
} from "@/components/patient-dashboard/ui"
import {
  EDGE,
  EmptyRow,
  SectionCard,
} from "@/components/patient-dashboard/section-card"

/* Medication reconciliation: one row per medication that needs a
   decision, with the practice's list, the outside record and what the
   patient reports side by side. Confirm change means the change is real
   and the practice updates its own EHR (the platform never writes back);
   Not current dismisses it until a different entry arrives. Patient
   answers are plain text: not taking a medication is not an error. */

const FINISH_MS = 5000

type Decision = "acknowledged" | "dismissed"
type Finishing = { c: MedCase; decision: Decision; at: number }

/** What changed, under the medication's name. */
function changeType(c: MedCase) {
  if (c.other && c.practice) return "Dose changed"
  if (c.other) return "New"
  if (c.answer?.answer === "Not taking") return "Patient stopped"
  if (c.answer?.answer === "Taking differently") return "Taking differently"
  if (c.allergy) return "Allergy"
  return "Changed"
}

const REPORTS: Record<string, string> = {
  Taking: "Taking as prescribed",
  "Not taking": "Not taking",
  "Taking differently": "Taking differently",
}

export function Medications({
  model,
  onOpen,
  onDecide,
  onUndo,
}: {
  model: DashboardModel
  onOpen: OpenSection
  onDecide: (c: MedCase, decision: Decision) => void
  onUndo: (key: string) => void
}) {
  /* A decided row stays for five seconds with Undo, then leaves. */
  const [finishing, setFinishing] = React.useState<Finishing[]>([])
  const [timers] = React.useState(
    () => new Map<string, ReturnType<typeof setTimeout>>()
  )
  React.useEffect(() => () => timers.forEach(clearTimeout), [timers])

  const rows = [...model.cases]
  for (const f of [...finishing].sort((a, b) => a.at - b.at))
    if (!rows.some((c) => c.key === f.c.key))
      rows.splice(Math.min(f.at, rows.length), 0, f.c)

  function decide(c: MedCase, decision: Decision) {
    const at = rows.findIndex((x) => x.key === c.key)
    onDecide(c, decision)
    setFinishing((f) => [
      ...f.filter((x) => x.c.key !== c.key),
      { c, decision, at },
    ])
    timers.set(
      c.key,
      setTimeout(() => {
        setFinishing((f) => f.filter((x) => x.c.key !== c.key))
        timers.delete(c.key)
      }, FINISH_MS)
    )
  }

  function undo(key: string) {
    clearTimeout(timers.get(key))
    timers.delete(key)
    setFinishing((f) => f.filter((x) => x.c.key !== key))
    onUndo(key)
  }

  return (
    <SectionCard
      id="meds"
      title="Medications to reconcile"
      description="Your list vs outside records and patient answers"
      flush
      actions={
        <HeaderLink onClick={() => onOpen("medications")}>
          All medications ({model.medicationCount})
        </HeaderLink>
      }
    >
      <DataTable
        aria-label="Medications to reconcile"
        minWidth={860}
        className="table-fixed"
      >
        <thead>
          <tr>
            <Th className={cn(EDGE, "w-[14%]")}>Medication</Th>
            <Th className="w-[12%]">Your list</Th>
            <Th className="w-[30%]">Outside record</Th>
            <Th className="w-[19%]">Patient reports</Th>
            <Th className={EDGE}>
              <span className="sr-only">Actions</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <EmptyRow span={5}>No discrepancies</EmptyRow>
          ) : (
            rows.map((c) => (
              <ReconcileRow
                key={c.key}
                c={c}
                done={finishing.find((f) => f.c.key === c.key)?.decision}
                onDecide={(d) => decide(c, d)}
                onUndo={() => undo(c.key)}
              />
            ))
          )}
        </tbody>
      </DataTable>
    </SectionCard>
  )
}

function ReconcileRow({
  c,
  done,
  onDecide,
  onUndo,
}: {
  c: MedCase
  done?: Decision
  onDecide: (d: Decision) => void
  onUndo: () => void
}) {
  const { practice, other, answer } = c
  return (
    <Row className={cn(done && "[&>td:not(:last-child)]:opacity-50")}>
      <Td className={cn(EDGE, "py-2.5")}>
        <span className="flex min-w-0 flex-col items-start gap-0.5">
          <Clip className="text-sm font-medium">{c.medication}</Clip>
          <span className="text-xs text-muted-foreground">{changeType(c)}</span>
          {c.allergy && (
            <Badge tone="error" icon={Alert02Icon} className="mt-1">
              Allergy: {c.allergy}
            </Badge>
          )}
        </span>
      </Td>
      <Td className="text-sm whitespace-nowrap">
        {practice ? (
          doseText(practice)
        ) : (
          <span className="text-muted-foreground">Not on list</span>
        )}
      </Td>
      <Td>
        {other ? (
          <span className="flex min-w-0 flex-col gap-0.5">
            {practice ? (
              <span
                aria-label={`Changed from ${doseText(practice)} to ${doseText(other)}`}
                className="flex flex-wrap items-center gap-1.5 text-sm"
              >
                <s aria-hidden className="text-muted-foreground">
                  {practice.dose}
                </s>
                <KitIcon icon={ArrowRight02Icon} size={14} />
                <span aria-hidden className="font-semibold">
                  {doseText(other)}
                </span>
              </span>
            ) : (
              <span className="text-sm font-semibold">{doseText(other)}</span>
            )}
            <span className="text-xs text-muted-foreground tabular-nums">
              {other.prescriber} · {sourceName(other.source)} ·{" "}
              {usDay(other.date)}
            </span>
          </span>
        ) : (
          <span className="text-sm text-muted-foreground/60">
            No outside record
          </span>
        )}
      </Td>
      <Td>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm">
            {answer ? REPORTS[answer.answer] : "No answer"}
          </span>
          {answer && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {answer.note ? `“${answer.note}” · ` : ""}Reported{" "}
              {usDay(answer.date)}
            </span>
          )}
        </span>
      </Td>
      <Td className={cn(EDGE, "text-right")}>
        {done ? (
          <span
            role="status"
            className="inline-flex items-center gap-1 text-[13px] text-muted-foreground"
          >
            {done === "acknowledged" ? "Confirmed" : "Not current"} ·
            <Button
              variant="link"
              size="xs"
              className="h-auto px-0"
              onClick={onUndo}
            >
              Undo
            </Button>
          </span>
        ) : (
          <span className="inline-flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-[30px]"
              onClick={() => onDecide("acknowledged")}
            >
              Confirm change
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-[30px]"
              onClick={() => onDecide("dismissed")}
            >
              Not current
            </Button>
          </span>
        )}
      </Td>
    </Row>
  )
}
