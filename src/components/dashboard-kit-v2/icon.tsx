import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import { cn } from "@/lib/utils"

/* The kit's icon: a Hugeicons stroke-rounded glyph at 1.5 stroke. Icons name
   a type or a status; they are never decoration, so every one is hidden from
   assistive tech and the word beside it carries the meaning. */

export type IconDef = IconSvgElement

export function KitIcon({
  icon,
  size = 16,
  className,
}: {
  icon: IconDef
  size?: number
  className?: string
}) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      strokeWidth={1.5}
      aria-hidden
      className={cn("shrink-0", className)}
    />
  )
}

/** The build's focus style, for anything the kit makes focusable. */
export const FOCUS =
  "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

/** The inner divider (TailAdmin gray-100): the border token at 60%. */
export const DIVIDER = "border-border/60"
