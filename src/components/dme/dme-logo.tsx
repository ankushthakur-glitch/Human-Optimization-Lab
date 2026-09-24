import { cn } from "@/lib/utils"

/** Placeholder lockup for the DME Clinical EHR demo gallery. */
export function DmeLogo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <svg viewBox="0 0 32 32" aria-hidden className="size-8 shrink-0">
        <rect width="32" height="32" rx="8" className="fill-primary" />
        <path
          d="M13 7h6v6h6v6h-6v6h-6v-6H7v-6h6z"
          className="fill-primary-foreground"
        />
      </svg>
      <span className="flex flex-col leading-none">
        <span className="font-heading text-sm font-bold tracking-tight">
          DME Clinical
        </span>
        <span className="text-[10px] font-semibold tracking-[0.2em] text-primary-tint uppercase">
          EHR
        </span>
      </span>
    </span>
  )
}
