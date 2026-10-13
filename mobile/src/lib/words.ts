/* Words held together, so a wrapped line never strands one: a line's last
   two words, and a number with the word after it ("5 minutes", "9:30 PM",
   "20 mg"). A no-break space does it, so the line still wraps anywhere
   else. The record kit holds "Dr. Patel" and a date the same way (keep),
   and the care rows add "Reminder 3 of 3" (care-gap.ts keepTogether). */

const NBSP = " "

/** A line with every number held to the word after it and its last two
    words joined, so a wrap never leaves one word alone on its last line
    ("feet hip width / apart." never "apart." alone) or a bare number at a
    line's end. */
export function keepEnd(text: string): string
export function keepEnd(text: string | undefined): string | undefined
export function keepEnd(text?: string): string | undefined {
  return text?.replace(/(\d) (?=\S)/g, `$1${NBSP}`).replace(/ (\S+)$/, `${NBSP}$1`)
}
