/**
 * What the product is called, and the artwork that stands for it.
 *
 * One constant because the name has been changed before and a few screens kept
 * the old one each time. Anything that puts the name on screen, or in a page
 * title, reads it from here — change this line and the whole library follows.
 * Prose that happens to mention the product can stay prose.
 */
export const BRAND_NAME = "Human Optimization"

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

/** The suffix page titles carry, e.g. "Foundations — Human Optimization". */
export const titleTemplate = `%s — ${BRAND_NAME}`

/** "Foundations — Human Optimization" */
export function brandedTitle(page: string) {
  return `${page} — ${BRAND_NAME}`
}

/**
 * The lockup, in the two tones it has to come in.
 *
 * `light` is the supplied artwork as-is: the teal H mark and the "Human /
 * Optimization Lab" wordmark on transparent. `dark` is derived from it for dark
 * pages — the mark keeps its gradient lifted toward a light teal, the wordmark
 * goes near-white — since teal on near-black loses too much contrast. Both are
 * rendered and the wrong one hidden by CSS, so the swap costs no JavaScript
 * and cannot flash the wrong tone on first paint.
 *
 * Replace both with the vector source when design supplies it; these are
 * 2028×539 rasters.
 */
export const LOGO = {
  light: "/brand/logo/hol-logo-lockup-light.png",
  dark: "/brand/logo/hol-logo-lockup-dark.png",
  width: 2028,
  height: 539,
} as const

/**
 * The mark on its own — the H without the wordmark, centred on a transparent
 * square — for places too narrow for the lockup, chiefly the collapsed sidebar
 * rail. It is the same artwork the favicons are cut from, so the rail and the
 * browser tab show one thing rather than two.
 *
 * As with LOGO, `light`/`dark` name the scheme each file is drawn for:
 * `light` is the teal mark for light surfaces, `dark` its lifted tone.
 */
export const MARK = {
  light: "/brand/favicon/hol-mark-light-512.png",
  dark: "/brand/favicon/hol-mark-dark-512.png",
  size: 512,
} as const
