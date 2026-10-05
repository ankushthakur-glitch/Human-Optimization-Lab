import { cn } from "@/lib/utils"
import { Avatar as DsAvatar, AvatarFallback, AvatarImage } from "@/design-system/ui/avatar"

/* The patient photo when there is one; otherwise initials as the build
   shows them: a white circle, 1px border, muted 12px initials. */

const SIZE = { sm: "size-7", md: "size-9", lg: "size-12" } as const

export function Avatar({
  name,
  photo,
  size = "md",
  className,
}: {
  name: string
  photo?: string
  size?: keyof typeof SIZE
  className?: string
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
  return (
    <DsAvatar className={cn(SIZE[size], "shrink-0", className)}>
      {photo && <AvatarImage src={photo} alt="" />}
      <AvatarFallback className="bg-card text-xs font-medium text-muted-foreground">
        {initials}
      </AvatarFallback>
    </DsAvatar>
  )
}
