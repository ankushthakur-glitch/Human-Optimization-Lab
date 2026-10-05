import { cn } from "@/lib/utils"
import { type IconDef, KitIcon } from "@/components/dashboard-kit-v2/icon"

/* The Figma summary tile: a category-tinted square with a 13px label, a
   24px value and a 22px icon top right. Tints count things; they are never
   red or amber. */

export type Tint = "category-1" | "category-2" | "primary" | "category-4" | "slate" | "category-5"

const TINT: Record<Tint, string> = {
  "category-1": "bg-category-1-surface text-category-1",
  "category-2": "bg-category-2-surface text-category-2",
  primary: "bg-primary-surface text-primary-tint",
  "category-4": "bg-category-4-surface text-category-4",
  slate: "bg-secondary text-muted-foreground",
  "category-5": "bg-category-5-surface text-category-5",
}

export function StatTile({
  label,
  value,
  icon,
  tint,
  className,
}: {
  label: string
  value: number | string
  icon: IconDef
  tint: Tint
  className?: string
}) {
  return (
    <div className={cn("relative flex flex-col gap-1 rounded-[7.2px] p-4", TINT[tint], className)}>
      <span className="absolute top-4 right-4">
        <KitIcon icon={icon} size={22} />
      </span>
      <span className="text-[13px] font-medium text-foreground/70">{label}</span>
      <span className="text-2xl leading-8 font-semibold text-foreground tabular-nums">
        {typeof value === "number" ? value.toLocaleString("en-US") : value}
      </span>
    </div>
  )
}
