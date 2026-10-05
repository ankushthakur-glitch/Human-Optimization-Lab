import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import { cn } from "@/lib/utils"

export type KitIcon = IconSvgElement

/* The kit's one icon: Hugeicons stroke-rounded at the build's stroke width.
   Icons name a type or a status; they never decorate, so they hide from
   screen readers and the word beside them carries the meaning. */
export function Icon({ icon, className }: { icon: KitIcon; className?: string }) {
  return (
    <HugeiconsIcon
      icon={icon}
      data-icon=""
      strokeWidth={1.5}
      aria-hidden
      className={cn("size-4 shrink-0", className)}
    />
  )
}

/** The build's focus ring, for kit elements that are not Buttons. */
export const FOCUS_RING =
  "outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
