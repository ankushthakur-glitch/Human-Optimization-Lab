import { cn } from "@/lib/utils"

/* Shared pieces of the mock mail client the invitation email is shown in, on
   the web screen and the mobile one. The client stands for the recipient's own
   mail app, so it borrows that kind of app's icon set (Material Symbols); its
   type stays Inter, since the whole portal is set in Inter only. */

const SYMBOLS =
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0..1,0&display=block"

export const SANS = { fontFamily: "var(--font-inter), Inter, Arial, sans-serif" }
export const ROBOTO = { fontFamily: "var(--font-inter), Inter, Arial, sans-serif" }

/** The client's icon font; React hoists it into the document head. */
export function MailFonts() {
  return (
    <>
      <link rel="stylesheet" href={SYMBOLS} precedence="default" />
    </>
  )
}

/** One Material Symbols glyph, drawn by ligature name. */
export function Sym({
  name,
  size = 20,
  fill = false,
  className,
}: {
  name: string
  size?: number
  fill?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn("material-symbols-outlined shrink-0 select-none", className)}
      style={{
        fontSize: size,
        width: size,
        height: size,
        lineHeight: 1,
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
      }}
    >
      {name}
    </span>
  )
}

/** Chrome only — the mail client's own controls do nothing in the prototype. */
export function IconButton({
  name,
  label,
  size = 40,
  icon = 20,
  fill,
  className,
}: {
  name: string
  label?: string
  size?: number
  icon?: number
  fill?: boolean
  className?: string
}) {
  return (
    <span
      role="button"
      aria-label={label}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full text-[#444746] hover:bg-[#1f1f1f]/[0.08]",
        className
      )}
      style={{ width: size, height: size }}
    >
      <Sym name={name} size={icon} fill={fill} />
    </span>
  )
}

/** The grey "Inbox ×" chip that follows a subject line. */
export function InboxChip() {
  return (
    <span
      className="inline-flex h-[18px] items-center gap-0.5 rounded-[4px] bg-[#dddddd] pr-0.5 pl-1 align-middle text-xs text-[#444746]"
      style={ROBOTO}
    >
      Inbox
      <Sym name="close" size={12} />
    </span>
  )
}
