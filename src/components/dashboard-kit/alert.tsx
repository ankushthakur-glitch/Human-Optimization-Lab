import { Alert02Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Icon, type KitIcon } from "@/components/dashboard-kit/icon"

/* TailAdmin's alert: a tinted box with a 20px icon, a title, a quieter body
   and actions on the right. Error is clinical; warning is process. It is
   part of the page, never a notification. */

export function Alert({
  tone = "error",
  icon = Alert02Icon,
  title,
  children,
  action,
  className,
}: {
  tone?: "error" | "warning"
  /** What the alert is about; the warning triangle by default. */
  icon?: KitIcon
  title: React.ReactNode
  children?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-center gap-3 rounded-[7.2px] border px-4 py-3.5",
        tone === "error" ? "border-destructive-3 bg-destructive-1" : "border-warning-3 bg-warning-1",
        className
      )}
    >
      <Icon
        icon={icon}
        className={cn("size-5 self-start", tone === "error" ? "text-destructive" : "text-warning")}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="font-semibold tabular-nums">{title}</div>
        {children && <div className="text-[13px] text-foreground/70 tabular-nums">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
