import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/components/dashboard-kit/icon"

/* One proportion as a rounded bar: segments in a fixed semantic order
   (urgent → routine), 2px gaps, and a legend of squares with counts under
   it. A segment with a handler is a button that filters the list below. */

export type StackedSegment = {
  key: string
  label: string
  count: number
  color: string
  onPress?: () => void
  pressed?: boolean
}

export function StackedBar({
  segments,
  label,
  className,
}: {
  segments: StackedSegment[]
  label: string
  className?: string
}) {
  const total = segments.reduce((s, x) => s + x.count, 0)
  const shown = segments.filter((s) => s.count > 0)
  const any = segments.some((s) => s.pressed)
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <div role="img" aria-label={label} className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full">
        {shown.map((s) => (
          <span
            key={s.key}
            className={cn("h-full rounded-full transition-opacity", any && !s.pressed && "opacity-40")}
            style={{ width: `${total ? (s.count / total) * 100 : 0}%`, background: s.color }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
        {segments.map((s) => {
          const body = (
            <>
              <span aria-hidden className="size-2 shrink-0 rounded-[2px]" style={{ background: s.color }} />
              <span className="tabular-nums">{`${s.label} ${s.count.toLocaleString("en-US")}`}</span>
            </>
          )
          return (
            <li key={s.key} className={cn(any && !s.pressed && "opacity-60")}>
              {s.onPress ? (
                <button
                  type="button"
                  aria-pressed={s.pressed}
                  onClick={s.onPress}
                  className={cn("inline-flex items-center gap-1.5 rounded-sm hover:text-foreground", FOCUS_RING)}
                >
                  {body}
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5">{body}</span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
