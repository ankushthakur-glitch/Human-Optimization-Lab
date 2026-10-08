import * as React from "react"
import { ArrowExpand01Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Button } from "@/design-system/ui/button"
import { DIVIDER, KitIcon } from "@/components/dashboard-kit-v2/icon"

/* TailAdmin's widget card on the build's tokens. White, one border, 7.2px
   radius. The header carries a 15/600 title, an optional count badge after
   it, an optional one-line description, and controls on the right. Bodies
   are padded unless they hold a table or list. */

export const Card = React.forwardRef<HTMLElement, React.ComponentProps<"section">>(
  function Card({ className, ...props }, ref) {
    return (
      <section
        ref={ref}
        className={cn(
          "flex min-w-0 flex-col overflow-hidden rounded-[7.2px] border border-border bg-card text-card-foreground",
          className
        )}
        {...props}
      />
    )
  }
)

export function CardHeader({
  title,
  titleId,
  count,
  description,
  actions,
  divider = true,
  className,
}: {
  title: React.ReactNode
  titleId?: string
  /** A badge after the title. */
  count?: React.ReactNode
  /** The one muted line under the title that a chart card carries. */
  description?: React.ReactNode
  /** Controls on the right. */
  actions?: React.ReactNode
  divider?: boolean
  className?: string
}) {
  return (
    <header
      className={cn(
        "flex min-h-[56px] flex-wrap items-center gap-3 px-4 py-3",
        divider && cn("border-b", DIVIDER),
        className
      )}
    >
      <div className="flex min-w-0 flex-col">
        <div className="flex min-w-0 items-center gap-2">
          <h2 id={titleId} className="truncate text-[15px] leading-[23px] font-semibold">
            {title}
          </h2>
          {count}
        </div>
        {description && (
          <p className="truncate text-[13px] leading-5 text-muted-foreground tabular-nums">{description}</p>
        )}
      </div>
      {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export function CardBody({
  flush,
  className,
  ...props
}: React.ComponentProps<"div"> & { flush?: boolean }) {
  return <div className={cn("min-w-0", !flush && "p-4", className)} {...props} />
}

export function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center gap-3 border-t px-4 py-2.5", DIVIDER, className)}
      {...props}
    />
  )
}

/** The header's expand button: opens the full list the card previews. */
export function ExpandButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      variant="outline"
      size="icon-sm"
      aria-label={label}
      onClick={onClick}
      className="rounded-lg text-muted-foreground"
    >
      <KitIcon icon={ArrowExpand01Icon} />
    </Button>
  )
}
