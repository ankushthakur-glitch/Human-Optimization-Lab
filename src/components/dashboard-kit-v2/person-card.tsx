import * as React from "react"

import { cn } from "@/lib/utils"
import { Card, CardHeader } from "@/components/dashboard-kit-v2/card"
import { DIVIDER } from "@/components/dashboard-kit-v2/icon"

/* "About {first name}": the person's own goal in their words with a primary
   left border, a few key/value pairs, and room below for whatever the page
   adds (a commitment's confidence and check-ins). No screening scores. */

export function PersonCard({
  id,
  title,
  description,
  actions,
  quote,
  pairs,
  className,
  children,
}: {
  id?: string
  title: string
  description?: string
  /** One link or small button on the right of the header. */
  actions?: React.ReactNode
  quote: string
  pairs: { label: string; value: string }[]
  className?: string
  children?: React.ReactNode
}) {
  const titleId = id ? `${id}-title` : undefined
  return (
    <Card id={id} tabIndex={-1} aria-labelledby={titleId} className={cn("h-full scroll-mt-3 outline-none", className)}>
      <CardHeader title={title} titleId={titleId} description={description} actions={actions} divider={false} className="pb-0" />
      <div className="flex flex-1 flex-col gap-4 px-4 pt-3 pb-4">
        <blockquote className="border-l-[3px] border-primary pl-3.5 text-[17px] leading-[25px] font-medium text-pretty">
          “{quote}”
        </blockquote>
        {pairs.map((p) => (
          <div key={p.label} className="flex min-w-0 flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">{p.label}</span>
            <span className="text-[13px] font-medium">{p.value}</span>
          </div>
        ))}
        {children && <div className={cn("flex flex-col gap-4 border-t pt-4", DIVIDER)}>{children}</div>}
      </div>
    </Card>
  )
}
