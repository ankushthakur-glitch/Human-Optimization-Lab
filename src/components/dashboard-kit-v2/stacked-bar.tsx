import { cn } from "@/lib/utils"

/* A proportion as one rounded bar: segments in a fixed semantic order
   (urgent to routine), 2px gaps, sized by count. The legend is optional,
   because a card may already list the counts beside the bar. */

export type StackedSegment = { key: string; label: string; count: number; color: string }

export function StackedBar({
  segments,
  label,
  legend,
  className,
}: {
  segments: StackedSegment[]
  label: string
  legend?: boolean
  className?: string
}) {
  const total = segments.reduce((s, x) => s + x.count, 0) || 1
  const shown = segments.filter((s) => s.count > 0)
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        role="img"
        aria-label={`${label}: ${segments.map((s) => `${s.label} ${s.count}`).join(", ")}`}
        className="flex h-2 w-full gap-0.5"
      >
        {shown.map((s) => (
          <span
            key={s.key}
            className="h-full min-w-1 rounded-full"
            style={{ flexGrow: s.count, flexBasis: 0, background: s.color }}
          />
        ))}
      </div>
      {legend && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums">
          {segments.map((s) => (
            <li key={s.key} className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-2 rounded-[2px]" style={{ background: s.color }} />
              {s.label} {s.count}
              <span className="sr-only">of {total}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
