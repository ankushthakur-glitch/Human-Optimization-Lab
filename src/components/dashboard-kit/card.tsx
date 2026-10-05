import * as React from "react"
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Button } from "@/design-system/ui/button"
import { Icon } from "@/components/dashboard-kit/icon"

/* TailAdmin's widget card on the build's tokens: white, 1px border, 7.2px
   radius; a 60px header (title, optional count, controls on the right) over
   a padded or flush body, with an optional footer. */

export function Card({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "min-w-0 overflow-hidden rounded-[7.2px] border border-border bg-card text-card-foreground",
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({
  title,
  titleId,
  description,
  count,
  variant = "ruled",
  children,
  className,
}: {
  title: React.ReactNode
  titleId?: string
  /** One muted line under the title, as a shadcn chart card has. */
  description?: React.ReactNode
  /** A badge or meta right after the title. */
  count?: React.ReactNode
  /** "ruled" draws a border under the header; "plain" (the prioritized
      dashboards) runs straight into the body with 16/20/6 padding. */
  variant?: "ruled" | "plain"
  /** Controls on the right. */
  children?: React.ReactNode
  className?: string
}) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-center gap-3 px-5",
        variant === "ruled"
          ? "min-h-[60px] border-b border-[color-mix(in_oklab,var(--border)_65%,transparent)] py-3.5"
          : "items-start pt-4 pb-1.5",
        className
      )}
    >
      <div className="flex min-w-0 flex-col">
        <div className="flex min-w-0 items-center gap-2">
          <h2 id={titleId} className="truncate text-[15px] leading-[22px] font-semibold">
            {title}
          </h2>
          {count}
        </div>
        {description && (
          <p className="truncate text-[13px] leading-[18px] text-muted-foreground tabular-nums">{description}</p>
        )}
      </div>
      {children && (
        <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>
      )}
    </header>
  )
}

export function CardBody({
  flush,
  className,
  ...props
}: React.ComponentProps<"div"> & { flush?: boolean }) {
  return <div className={cn(!flush && "p-5", className)} {...props} />
}

export function CardFooter({
  variant = "ruled",
  className,
  ...props
}: React.ComponentProps<"div"> & { variant?: "ruled" | "plain" }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-5",
        variant === "ruled"
          ? "border-t border-[color-mix(in_oklab,var(--border)_65%,transparent)] py-3"
          : "pt-1 pb-4",
        className
      )}
      {...props}
    />
  )
}

/** The header's expand button: opens the full list this card previews. */
export function ExpandButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <Button
      variant="outline"
      size="icon-sm"
      aria-label={label}
      onClick={onClick}
      className="rounded-lg text-muted-foreground"
    >
      <Icon icon={ArrowUpRight01Icon} />
    </Button>
  )
}
