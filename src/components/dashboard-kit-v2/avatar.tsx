import { cn } from "@/lib/utils"

/* The patient's photo when there is one; otherwise initials in a white
   circle with the build's border, the way the Patients list shows them. */

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("")
}

export function Avatar({
  name,
  photo,
  size = 36,
  className,
}: {
  name: string
  photo?: string
  size?: 28 | 30 | 36 | 48
  className?: string
}) {
  const text = size >= 48 ? "text-sm" : "text-xs"
  return photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photo}
      alt=""
      width={size}
      height={size}
      className={cn("shrink-0 rounded-full border border-border object-cover", className)}
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-card font-medium text-muted-foreground",
        text,
        className
      )}
      style={{ width: size, height: size }}
    >
      {initialsOf(name)}
    </span>
  )
}
