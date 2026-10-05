import type { CSSProperties } from "react"

/* Version 4's colour system, taken from the reference image: each band has
   one hue (red, orange, violet, green) used as a soft tint for its card, a
   solid disc for its icon and a strong text for its number, and blue is
   the action colour (tabs, links, buttons). Every class lives here so the
   components only name a tone. */

export type ToneKey = "red" | "orange" | "violet" | "green" | "blue"

export const TONE: Record<
  ToneKey,
  {
    /** The card wash: a soft gradient to white. */
    wash: string
    soft: string
    solid: string
    text: string
    border: string
    ring: string
    /** For charts. */
    hex: string
  }
> = {
  red: {
    wash: "bg-gradient-to-br from-red-50 to-white dark:from-red-500/15 dark:to-card",
    soft: "bg-red-50 dark:bg-red-500/15",
    solid: "bg-red-500",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-100 dark:border-red-500/25",
    ring: "ring-red-200 border-red-300 dark:ring-red-500/30",
    hex: "#ef4444",
  },
  orange: {
    wash: "bg-gradient-to-br from-orange-50 to-white dark:from-orange-500/15 dark:to-card",
    soft: "bg-orange-50 dark:bg-orange-500/15",
    solid: "bg-orange-500",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-orange-100 dark:border-orange-500/25",
    ring: "ring-orange-200 border-orange-300 dark:ring-orange-500/30",
    hex: "#f97316",
  },
  violet: {
    wash: "bg-gradient-to-br from-violet-50 to-white dark:from-violet-500/15 dark:to-card",
    soft: "bg-violet-50 dark:bg-violet-500/15",
    solid: "bg-violet-500",
    text: "text-violet-600 dark:text-violet-400",
    border: "border-violet-100 dark:border-violet-500/25",
    ring: "ring-violet-200 border-violet-300 dark:ring-violet-500/30",
    hex: "#8b5cf6",
  },
  green: {
    wash: "bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-500/15 dark:to-card",
    soft: "bg-emerald-50 dark:bg-emerald-500/15",
    solid: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-100 dark:border-emerald-500/25",
    ring: "ring-emerald-200 border-emerald-300 dark:ring-emerald-500/30",
    hex: "#10b981",
  },
  blue: {
    wash: "bg-gradient-to-br from-blue-50 to-white dark:from-blue-500/15 dark:to-card",
    soft: "bg-blue-50 dark:bg-blue-500/15",
    solid: "bg-blue-600",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-100 dark:border-blue-500/25",
    ring: "ring-blue-200 border-blue-300 dark:ring-blue-500/30",
    hex: "#2563eb",
  },
}

/** Blue as the action colour inside version 4: the kit's tabs, links and
    default buttons read --primary, so the scope swaps it. */
export const ACTION_SCOPE = {
  "--primary": "#2563eb",
  "--primary-tint": "#1d4ed8",
  "--primary-foreground": "#ffffff",
  "--primary-surface": "color-mix(in oklab, #2563eb 10%, transparent)",
  "--ring": "#2563eb",
} as CSSProperties

export const BUTTON_SOLID = "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
export const BUTTON_OUTLINE =
  "border-blue-600 text-blue-700 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-300 dark:hover:bg-blue-500/10"
