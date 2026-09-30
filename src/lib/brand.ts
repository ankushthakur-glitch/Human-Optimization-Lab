/**
 * What the product is called, and the artwork that stands for it.
 *
 * One constant because the name has been changed before and a few screens kept
 * the old one each time. Anything that puts the name on screen, or in a page
 * title, reads it from here — change this line and the whole library follows.
 * Prose that happens to mention the product can stay prose.
 */
export const BRAND_NAME = "Inlay Health"

/**
 * The machine-readable form of the name, for anything keyed rather than read:
 * localStorage keys and the Comment Kit namespace.
 *
 * Kept beside BRAND_NAME so a rename touches one file. Changing it orphans
 * whatever is already stored under the old key — a browser's saved theme, and
 * any Comment Kit threads held locally rather than in Supabase — because
 * nothing migrates the old keys across.
 */
export const BRAND_SLUG = "human-optimization"

/** The suffix page titles carry, e.g. "Foundations | Inlay Health". */
export const titleTemplate = `%s | ${BRAND_NAME}`

/** "Foundations | Inlay Health" */
export function brandedTitle(page: string) {
  return `${page} | ${BRAND_NAME}`
}

/**
 * The lockup, in the two tones it has to come in.
 *
 * The Inlay Health horizontal lockup (identity assets v2.1, Sep 2026), copied
 * from inlay-identity-assets/logo/svg into public/brand/inlay. `light` is the
 * full-colour artwork for light surfaces; `dark` is the reversed artwork with
 * its petrol backing removed, for dark ones. The files' built-in clear space
 * is trimmed from the viewBox so the art sits flush with the box it is given;
 * the paths themselves are untouched, as the brand rules require. Both are
 * rendered and the wrong one hidden by CSS, so the swap costs no JavaScript
 * and cannot flash the wrong tone on first paint.
 */
export const LOGO = {
  light: "/brand/inlay/lockup-light.svg",
  dark: "/brand/inlay/lockup-dark.svg",
  width: 406,
  height: 84,
} as const

/**
 * The symbol on its own, for places too narrow for the lockup, chiefly the
 * collapsed sidebar rail. Trimmed to its square like LOGO. The favicons are the
 * app icon (the same symbol on a petrol tile), which reads on light and dark
 * browser chrome alike.
 *
 * As with LOGO, `light`/`dark` name the scheme each file is drawn for. Brand
 * minimum: 32px full colour.
 */
export const MARK = {
  light: "/brand/inlay/mark-light.svg",
  dark: "/brand/inlay/mark-dark.svg",
  size: 100,
} as const

/** The app icon: the symbol on a rounded petrol tile. */
export const APP_ICON = "/brand/inlay/app-icon.svg"
