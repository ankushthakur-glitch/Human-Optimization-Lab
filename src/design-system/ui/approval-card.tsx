import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const approvalCardVariants = cva(
  "group/approval-card flex w-full min-w-0 flex-col gap-4 rounded-3xl border p-4 text-sm",
  {
    variants: {
      tone: {
        default: "border-border bg-card",
        caution: "border-warning/30 bg-warning-surface/40",
        danger: "border-destructive/30 bg-destructive/5",
      },
    },
    defaultVariants: {
      tone: "default",
    },
  }
)

/**
 * A pending action the agent wants to take. The card states what will happen
 * before it happens — the details list carries the arguments, so the person
 * approving is never guessing at what they are approving.
 */
function ApprovalCard({
  tone = "default",
  className,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof approvalCardVariants>) {
  return (
    <div
      data-slot="approval-card"
      data-tone={tone}
      className={cn(approvalCardVariants({ tone }), className)}
      {...props}
    />
  )
}

function ApprovalCardHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="approval-card-header"
      className={cn("flex min-w-0 items-start gap-3", className)}
      {...props}
    />
  )
}

function ApprovalCardIcon({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="approval-card-icon"
      aria-hidden="true"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary-surface text-primary-tint [&_svg]:size-4",
        className
      )}
      {...props}
    />
  )
}

function ApprovalCardTitle({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="approval-card-title"
      className={cn("font-heading text-sm font-medium", className)}
      {...props}
    />
  )
}

function ApprovalCardDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="approval-card-description"
      className={cn("text-xs leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  )
}

function ApprovalCardDetails({
  className,
  ...props
}: React.ComponentProps<"dl">) {
  return (
    <dl
      data-slot="approval-card-details"
      className={cn(
        "grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-2xl bg-surface-sunken p-3 text-xs",
        className
      )}
      {...props}
    />
  )
}

function ApprovalCardDetail({
  label,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  label: string
  children?: React.ReactNode
}) {
  return (
    <div data-slot="approval-card-detail" className="contents" {...props}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("min-w-0 font-mono wrap-break-word", className)}>
        {children}
      </dd>
    </div>
  )
}

function ApprovalCardActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="approval-card-actions"
      className={cn(
        "flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-3",
        className
      )}
      {...props}
    />
  )
}

export {
  ApprovalCard,
  ApprovalCardHeader,
  ApprovalCardIcon,
  ApprovalCardTitle,
  ApprovalCardDescription,
  ApprovalCardDetails,
  ApprovalCardDetail,
  ApprovalCardActions,
  approvalCardVariants,
}
