import { cn } from "@/lib/utils"
import { FOCUS } from "@/components/dashboard-kit-v2/icon"

/* Scores by category as a grid of small cells: the name, the percent on
   the right (red only for a priority area) and a 6px bar coloured by the
   read. Sorted ascending by the caller so the weakest areas come first.
   A cell with onPress is a button that filters another card. */

export type CategoryRead = "priority" | "mixed" | "strong"

export const CATEGORY_COLOR: Record<CategoryRead, string> = {
  priority: "var(--destructive)",
  mixed: "var(--primary)",
  strong: "var(--primary-4)",
}

export function CategoryGrid({
  cells,
  selected,
  onPress,
  className,
}: {
  cells: { key: string; label: string; score: number; read: CategoryRead }[]
  selected?: string
  onPress?: (key: string) => void
  className?: string
}) {
  return (
    <ul className={cn("grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 xl:grid-cols-5", className)}>
      {cells.map((c) => {
        const inner = (
          <>
            <span className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm">{c.label}</span>
              <span
                className={cn(
                  "shrink-0 text-sm font-semibold tabular-nums",
                  c.read === "priority" ? "text-destructive" : "text-foreground"
                )}
              >
                {c.score}%
              </span>
            </span>
            <span className="block h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <span
                className="block h-full rounded-full"
                style={{ width: `${Math.max(c.score, 2)}%`, background: CATEGORY_COLOR[c.read] }}
              />
            </span>
          </>
        )
        return (
          <li key={c.key} className="min-w-0">
            {onPress ? (
              <button
                type="button"
                aria-pressed={selected === c.key}
                onClick={() => onPress(c.key)}
                className={cn(
                  "flex w-full flex-col gap-1.5 rounded-[5.76px] text-left",
                  FOCUS,
                  "focus-visible:ring-offset-2",
                  selected === c.key && "[&>span:first-child>span:first-child]:font-semibold"
                )}
              >
                {inner}
              </button>
            ) : (
              <div className="flex flex-col gap-1.5">{inner}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
