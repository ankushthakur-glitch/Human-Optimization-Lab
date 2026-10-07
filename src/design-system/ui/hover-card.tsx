"use client"

import * as React from "react"
import { PreviewCard as PreviewCardPrimitive } from "@base-ui/react/preview-card"
import { cn } from "cn"

/* Where the pointer last was, so a card can open at the cursor. */
let pointer = { x: 0, y: 0 }
if (typeof window !== "undefined")
  window.addEventListener(
    "pointermove",
    (e) => {
      pointer = { x: e.clientX, y: e.clientY }
    },
    { passive: true, capture: true }
  )

function HoverCard({ ...props }: PreviewCardPrimitive.Root.Props) {
  return <PreviewCardPrimitive.Root data-slot="hover-card" {...props} />
}

function HoverCardTrigger({ ...props }: PreviewCardPrimitive.Trigger.Props) {
  return (
    <PreviewCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />
  )
}

type ContentProps = PreviewCardPrimitive.Popup.Props &
  Pick<
    PreviewCardPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  > & {
    arrow?: boolean
    /** Open at the pointer, where it was when the card opened, rather
        than against the trigger's edge. */
    followCursor?: boolean
  }

/* The card opens where the cursor is and points at it: a small arrow on
   the edge facing the pointer, in the card's own fill, bordered on its two
   outer sides so it reads as part of the card's outline. It mounts only
   while open, so the cursor is read at the moment it opens. */
function Positioned({
  className,
  side = "bottom",
  sideOffset = 12,
  align = "center",
  alignOffset = 0,
  arrow = true,
  followCursor = true,
  children,
  ...props
}: ContentProps) {
  const [anchor] = React.useState(() => {
    const { x, y } = pointer
    return followCursor && (x || y)
      ? {
          getBoundingClientRect: () =>
            DOMRect.fromRect({ x, y, width: 0, height: 0 }),
        }
      : undefined
  })
  return (
    <PreviewCardPrimitive.Positioner
      anchor={anchor}
      align={anchor ? "center" : align}
      alignOffset={anchor ? 0 : alignOffset}
      side={side}
      sideOffset={sideOffset}
      collisionPadding={12}
      className="isolate z-50"
    >
      <PreviewCardPrimitive.Popup
        data-slot="hover-card-content"
        className={cn(
          "z-50 w-72 origin-(--transform-origin) rounded-2xl bg-popover p-4 text-sm text-popover-foreground shadow-[0_16px_40px_rgba(16,24,40,.12)] ring-1 ring-foreground/5 outline-hidden duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      >
        {arrow && (
          <PreviewCardPrimitive.Arrow
            data-slot="hover-card-arrow"
            className="size-3 rotate-45 rounded-[2px] border-foreground/5 bg-popover data-[side=bottom]:-top-1.5 data-[side=bottom]:border-t data-[side=bottom]:border-l data-[side=left]:-right-1.5 data-[side=left]:border-t data-[side=left]:border-r data-[side=right]:-left-1.5 data-[side=right]:border-b data-[side=right]:border-l data-[side=top]:-bottom-1.5 data-[side=top]:border-r data-[side=top]:border-b dark:border-foreground/10"
          />
        )}
        {children}
      </PreviewCardPrimitive.Popup>
    </PreviewCardPrimitive.Positioner>
  )
}

function HoverCardContent(props: ContentProps) {
  return (
    <PreviewCardPrimitive.Portal data-slot="hover-card-portal">
      <Positioned {...props} />
    </PreviewCardPrimitive.Portal>
  )
}

/* One part of a hover card: a heading, a quiet line under it, then its
   content. Sections stack with a hairline between them, edge to edge. */
function HoverCardSection({
  title,
  meta,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"section">, "title"> & {
  title?: React.ReactNode
  meta?: React.ReactNode
}) {
  return (
    <section
      data-slot="hover-card-section"
      className={cn(
        "-mx-4 flex flex-col gap-2 border-t border-border/70 px-4 py-3 first:border-t-0 first:pt-0 last:pb-0",
        className
      )}
      {...props}
    >
      {(title || meta) && (
        <div className="flex flex-col gap-0.5">
          {title && (
            <h4 className="text-sm leading-5 font-semibold">{title}</h4>
          )}
          {meta && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {meta}
            </span>
          )}
        </div>
      )}
      {children}
    </section>
  )
}

export { HoverCard, HoverCardTrigger, HoverCardContent, HoverCardSection }
