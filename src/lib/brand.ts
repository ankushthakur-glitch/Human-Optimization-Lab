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
 * Concept Variation 5 in teal (the heart-figure mark and the two-line
 * wordmark), copied out of public/brand/concepts/v5 so the concept gallery can
 * change without moving the product's logo. `light` is the artwork as
 * supplied; `dark` is the same file with its gradient stops lifted to light
 * teal, since the supplied gradient runs to near-black and vanishes on a dark
 * page. Both are rendered and the wrong one hidden by CSS, so the swap costs no
 * JavaScript and cannot flash the wrong tone on first paint.
 */
export const LOGO = {
  light: "/brand/logo/hol-v5-lockup-light.svg",
  dark: "/brand/logo/hol-v5-lockup-dark.svg",
  width: 2219,
  height: 556,
} as const

/**
 * The mark on its own — the H without the wordmark, centred on a transparent
 * square — for places too narrow for the lockup, chiefly the collapsed sidebar
 * rail. It is the same artwork the favicons are rendered from, so the rail and the
 * browser tab show one thing rather than two.
 *
 * As with LOGO, `light`/`dark` name the scheme each file is drawn for:
 * `light` is the teal mark for light surfaces, `dark` its lifted tone.
 */
export const MARK = {
  light: "/brand/favicon/hol-v5-mark-light.svg",
  dark: "/brand/favicon/hol-v5-mark-dark.svg",
  size: 512,
} as const
