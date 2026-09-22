/**
 * What the product is called.
 *
 * One constant because the name has been changed before and a few screens kept
 * the old one each time. Anything that puts the name on screen, or in a page
 * title, reads it from here — change this line and the whole library follows.
 * Prose that happens to mention the product can stay prose.
 */
export const BRAND_NAME = "Clinic EHR"

/** The suffix page titles carry, e.g. "Scheduling — Clinic EHR". */
export const titleTemplate = `%s — ${BRAND_NAME}`

/** "Foundations — Clinic EHR" */
export function brandedTitle(page: string) {
  return `${page} — ${BRAND_NAME}`
}
