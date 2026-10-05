import type * as React from "react"

import {
  Alert02Icon,
  ArrowDownRight01Icon,
  ArrowUpRight01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
} from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { KitIcon, type IconDef } from "@/components/dashboard-kit-v2"
import type {
  HealthMetric,
  StatusKey,
} from "@/components/patient-dashboard/widgets/metrics"
import { TONE, type ToneKey } from "@/components/patient-dashboard/widgets/palette"

/* The four bands as the reference image draws them: red out of target,
   orange on watch, violet not yet tested, green optimal. Each has an icon
   so status never rests on colour alone. */

export const STATUS: Record<StatusKey, { label: string; sub: string; icon: IconDef; tone: ToneKey }> = {
  out: { label: "Out of target", sub: "Action needed", icon: Alert02Icon, tone: "red" },
  watch: { label: "On watch", sub: "Keep monitoring", icon: Alert02Icon, tone: "orange" },
  untested: { label: "Not yet tested", sub: "Order at next visit", icon: Clock01Icon, tone: "violet" },
  optimal: { label: "Optimal or in range", sub: "At or better than target", icon: CheckmarkCircle02Icon, tone: "green" },
}

/** The band's white icon on a solid disc. */
export function StatusIcon({ status, size = "md" }: { status: StatusKey; size?: "sm" | "md" }) {
  const s = STATUS[status]
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full text-white",
        TONE[s.tone].solid,
        size === "md" ? "size-10" : "size-9"
      )}
    >
      <KitIcon icon={s.icon} size={size === "md" ? 20 : 18} />
    </span>
  )
}

/** A soft pill in a tone: "↑ High", "Watch", "Completed". */
export function Pill({ tone, icon, children, className }: { tone: ToneKey; icon?: IconDef; children: React.ReactNode; className?: string }) {
  const t = TONE[tone]
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-medium whitespace-nowrap",
        t.soft,
        t.text,
        className
      )}
    >
      {icon && <KitIcon icon={icon} size={12} />}
      {children}
    </span>
  )
}

/** The marker's own flag: High or Low in red, Watch in orange, else its band. */
export function StatusWord({ m }: { m: HealthMetric }) {
  if (m.status === "out" && m.flag === "High") return <Pill tone="red" icon={ArrowUpRight01Icon}>High</Pill>
  if (m.status === "out" && m.flag === "Low") return <Pill tone="red" icon={ArrowDownRight01Icon}>Low</Pill>
  if (m.status === "out" || m.status === "watch") return <Pill tone="orange">Watch</Pill>
  if (m.status === "untested") return <Pill tone="violet">Not tested</Pill>
  return <Pill tone="green">In range</Pill>
}

