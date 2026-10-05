import * as React from "react"

import type { VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Badge as DsBadge, type badgeVariants } from "@/design-system/ui/badge"
import { type IconDef, KitIcon } from "@/components/dashboard-kit-v2/icon"

/* The kit's badge is the component library's Badge: each tone maps to a
   library variant, and the kit adds only the optional icon or dot. A status
   never relies on colour alone: it carries a 12px icon or a dot before the
   word. */

export type Tone = "error" | "warning" | "success" | "info" | "primary" | "light" | "outline"

const VARIANT: Record<Tone, VariantProps<typeof badgeVariants>["variant"]> = {
  error: "destructive",
  warning: "warning",
  success: "success",
  info: "info",
  primary: "secondary",
  light: "secondary",
  outline: "outline",
}

export function Badge({
  tone = "light",
  icon,
  dot,
  className,
  children,
  ...props
}: React.ComponentProps<"span"> & {
  tone?: Tone
  icon?: IconDef
  /** A 6px dot before the word, in the tone's colour. */
  dot?: boolean
}) {
  return (
    <DsBadge
      variant={VARIANT[tone]}
      className={cn("tabular-nums", tone === "primary" && "bg-primary-surface text-primary-tint", className)}
      {...props}
    >
      {icon && <KitIcon icon={icon} size={12} />}
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </DsBadge>
  )
}
