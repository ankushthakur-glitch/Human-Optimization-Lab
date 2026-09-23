import type { AccentTheme } from "@/design-system/tokens/themes"

/**
 * Accents authored by hand, in `app/themes.custom.css`.
 *
 * `tokens/themes.ts` is regenerated from the shadcn preset list and carries a
 * do-not-edit header, so a brand colour that is not one of those presets cannot
 * live there. It lives here, so the generator can rewrite its file without
 * dropping the brand, and every picker reads one list.
 *
 * `swatch` mirrors what the generated entries carry — the light-mode --primary,
 * which is what the picker paints.
 */
export const CUSTOM_ACCENT_THEMES: AccentTheme[] = [
  { name: "brand-blue", label: "Blue", swatch: "oklch(0.571 0.19 260.3)" },
  { name: "brand-cyan", label: "Cyan", swatch: "oklch(0.555 0.102 222)" },
  { name: "brand-teal", label: "Teal", swatch: "oklch(0.551 0.095 190)" },
]

/**
 * Every accent the customizer and the appearance menu can offer: brand blue
 * (Figma Primary/07-Main, #2c71e5, the default) and cyan and teal variants
 * built to the same contrast contract. The generated shadcn presets are not
 * offered at all; they stay in themes.css only because the generator owns
 * that file.
 */
export const ALL_ACCENT_THEMES: AccentTheme[] = CUSTOM_ACCENT_THEMES

/** Whether a stored accent is still one the product offers. */
export function isKnownAccent(name: unknown): name is string {
  return ALL_ACCENT_THEMES.some((theme) => theme.name === name)
}
