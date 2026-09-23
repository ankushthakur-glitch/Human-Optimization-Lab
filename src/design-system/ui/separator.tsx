"use client"

import { Separator as SeparatorPrimitive } from "@base-ui/react/separator"
import { cn } from "cn"

/* The vertical default is self-stretch, so a separator in a flex row spans the
   row without being told how tall it is. Note the trap that comes with it: a
   flex item with a definite cross size is not stretched, and an unstretched
   item aligns to the *start* of the cross axis. Any caller that sets an
   explicit height must therefore also set `data-vertical:self-center` — under
   the same variant, or the stretch below wins on specificity and survives the
   merge — otherwise the rule silently pins itself to the top of the row. */

function Separator({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
