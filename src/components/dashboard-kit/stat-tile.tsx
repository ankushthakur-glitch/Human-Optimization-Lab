import { cn } from "@/lib/utils"
import { FOCUS_RING, Icon, type KitIcon } from "@/components/dashboard-kit/icon"

/* The Figma summary tile: a count on a categorical tint with its icon top
   right. Tints are for counts only, never a status; category 5 (green) is
   kept for Targets met. A button when it leads to the card it counts. */

export type TileTint = "category-1" | "category-2" | "primary" | "category-4" | "slate" | "category-5"

const TINT: Record<TileTint, { bg: string; fg: string }> = {
  "category-1": { bg: "bg-category-1-surface", fg: "text-category-1" },
  "category-2": { bg: "bg-category-2-surface", fg: "text-category-2" },
  primary: { bg: "bg-primary-surface", fg: "text-primary" },
  "category-4": { bg: "bg-category-4-surface", fg: "text-category-4" },
  slate: { bg: "bg-secondary", fg: "text-muted-foreground" },
  "category-5": { bg: "bg-category-5-surface", fg: "text-category-5" },
}

export function StatTile({
  label,
  value,
  icon,
  tint,
  onClick,
}: {
  label: string
  value: React.ReactNode
  icon: KitIcon
  tint: TileTint
  onClick?: () => void
}) {
  const t = TINT[tint]
  const body = (
    <>
      <span className="flex items-start justify-between gap-2">
        <span className="truncate text-[13px] font-medium text-foreground/70">{label}</span>
        <Icon icon={icon} className={cn("size-[22px]", t.fg)} />
      </span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
    </>
  )
  const cls = cn("flex min-w-0 flex-col gap-1.5 rounded-[7.2px] p-4 text-left", t.bg)
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(cls, FOCUS_RING, "hover:brightness-[0.98]")}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  )
}
