import {
  Alert02Icon,
  ArrowDown02Icon,
  ArrowDownRight01Icon,
  ArrowRight02Icon,
  ArrowUp02Icon,
  ArrowUpRight01Icon,
  DiamondIcon,
  InformationCircleIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"

import { Badge } from "@/components/dashboard-kit/badge"

/* Clinical flags and trend words as badges, each an icon and a word so they
   read without colour: ↑ High, ↓ Low, ◆ Critical, ⓘ Abnormal, ⚠ Urgent,
   ✓ Goal met; ↗ Worsening, ↘/↗ Improving, → Stable, New. */

export type Flag = "High" | "Low" | "Critical" | "Abnormal" | "Urgent" | "Goal met"

const FLAG = {
  High: { icon: ArrowUp02Icon, tone: "error" },
  Low: { icon: ArrowDown02Icon, tone: "error" },
  Critical: { icon: DiamondIcon, tone: "error" },
  Abnormal: { icon: InformationCircleIcon, tone: "error" },
  Urgent: { icon: Alert02Icon, tone: "error" },
  "Goal met": { icon: Tick02Icon, tone: "success" },
} as const

export function FlagBadge({ flag, className }: { flag: Flag; className?: string }) {
  return (
    <Badge tone={FLAG[flag].tone} icon={FLAG[flag].icon} className={className}>
      {flag}
    </Badge>
  )
}

export type Trend = "worsening" | "improving" | "stable" | "new"

/** The arrow follows the value: rising or falling. */
export function TrendBadge({ trend, rising, className }: { trend: Trend; rising?: boolean; className?: string }) {
  const arrow = rising ? ArrowUpRight01Icon : ArrowDownRight01Icon
  if (trend === "worsening")
    return (
      <Badge tone="error" icon={rising === false ? ArrowDownRight01Icon : ArrowUpRight01Icon} className={className}>
        Worsening
      </Badge>
    )
  if (trend === "improving")
    return (
      <Badge tone="success" icon={arrow} className={className}>
        Improving
      </Badge>
    )
  if (trend === "stable")
    return (
      <Badge tone="light" icon={ArrowRight02Icon} className={className}>
        Stable
      </Badge>
    )
  return (
    <Badge tone="light" className={className}>
      New
    </Badge>
  )
}
