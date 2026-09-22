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
 * The supplied artwork is white-on-transparent — 81% of its ink is near-white,
 * so on a light page the wordmark and most of the H disappear and leave the
 * spokes floating alone. `light` is a luminance inversion of it, which is a
 * clean operation only because the artwork carries zero chroma. Both are
 * rendered and the wrong one hidden by CSS, so the swap costs no JavaScript
 * and cannot flash the wrong tone on first paint.
 *
 * Replace both with the vector source when design supplies it; these are
 * 750×189 rasters and the mark deserves better at large sizes.
 */
export const LOGO = {
  light: "/brand/logo/logo-lockup-light.png",
  dark: "/brand/logo/logo-lockup-dark.png",
  width: 750,
  height: 189,
} as const
