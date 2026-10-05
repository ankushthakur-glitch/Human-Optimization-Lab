import { cn } from "@/lib/utils"

/* TailAdmin's activity timeline: nodes on a 2px rail, filled primary when
   new or unreviewed and hollow otherwise. Put TimelineNodes in an <ol>. */

export function TimelineNode({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <li className="group/node relative flex gap-3 pb-5 last:pb-0">
      <span aria-hidden className="absolute top-5 bottom-0 left-[7px] w-0.5 bg-secondary group-last/node:hidden" />
      <span
        aria-hidden
        className={cn(
          "relative mt-0.5 size-4 shrink-0 rounded-full border-2",
          active ? "border-primary bg-primary" : "border-ring bg-card"
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">{children}</div>
    </li>
  )
}
