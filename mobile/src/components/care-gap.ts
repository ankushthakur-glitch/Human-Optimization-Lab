import type { RecordIconName } from "@/components/record-icons"
import type { Hue, Step } from "@/components/record-kit"
import type { CareGap, GapKind } from "@/lib/record"

/* How a care gap shows on To do, on the test it follows and on its own
   page: its icon, how far its reminders have got, and what happens after
   the last one (F-42, F-61). Three reminders about two weeks apart, then
   Dr. Patel's team reaches out; said plainly, never as a warning, and the
   step after the last reminder is clay, never red. */

export const GAP_ICON: Record<GapKind, RecordIconName> = {
  order: "labs",
  "follow-up": "visits",
  // A screening to have: the microscope, not the syringe of a vaccine.
  preventive: "lab",
  condition: "conditions",
}

/** A gap's tile: one to talk through at the next visit sits with the
    other visit items (violet, as To do's "For your next visit" draws
    them); one to book or call is teal. */
export const gapHue = (g: Pick<CareGap, "action">): Hue => (g.action === "talk" ? "violet" : "teal")

/** Reminders a care gap gets before the practice follows up. */
export const REMINDERS = 3

/** "Reminder 2 of 3", or nothing before the first is sent. */
export function reminderLine(g: Pick<CareGap, "reminders">): string | undefined {
  if (g.reminders <= 0) return undefined
  return `Reminder ${Math.min(g.reminders, REMINDERS)} of ${REMINDERS}`
}

/** What happens after the reminders, as To do says it: "Then Dr. Patel's
    team will reach out." while reminders are left, "Dr. Patel's team will
    reach out." once the last one went out. */
export function teamLine(g: Pick<CareGap, "reminders">): string {
  return g.reminders >= REMINDERS ? "Dr. Patel's team will reach out." : "Then Dr. Patel's team will reach out."
}

/** A To do row's facts with where its reminders have got to: "Dr. Patel
    ordered it on Mar 4" becomes "Dr. Patel ordered it on Mar 4. Reminder 3
    of 3. Dr. Patel's team will reach out." Home keeps the short line; To
    do has the room for what comes next. Without reminders the line stays
    as it is. The facts may already hold their words together (lib/todo.ts
    sends them through keepTogether), so the reminder is looked for with
    plain spaces. */
export function withReminders(meta: string, g: Pick<CareGap, "reminders"> | undefined): string {
  const reminder = g && reminderLine(g)
  if (!g || !reminder) return meta
  const facts = meta.trim().replace(/\.$/, "")
  const parts = facts.replace(/ /g, " ").includes(reminder) ? [facts] : [facts, reminder]
  return `${parts.join(". ")}. ${teamLine(g)}`
}

/** The reminders as dated steps: each one sent ticked with its day, the
    ones still to come after it, and last what follows them (`last`: "Then
    Dr. Patel's team will reach out" on a test, "Then Dr. Patel and your
    clinic follow up" on a care gap), marked once it is reached. Once she
    has booked, only the reminders that went out are shown: nothing more
    will be sent. */
export function reminderSteps(g: Pick<CareGap, "reminders" | "sent">, last: string, booked = false): Step[] {
  const sent = Math.min(g.reminders, REMINDERS)
  const steps: Step[] = Array.from({ length: booked ? sent : REMINDERS }, (_, i) => ({
    label: `Reminder ${i + 1}`,
    date: i < sent ? g.sent[i] : undefined,
    state: i < sent ? "done" : "next",
  }))
  if (!booked) steps.push({ label: keepTogether(last), state: sent >= REMINDERS ? "alert" : "next" })
  return steps
}

/* --------------------------------------------------------- clean wraps -- */

const NBSP = "\u00A0"
const MONTH = "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)"

/** The most characters two words held together at the end of a line may
    run to, so a held pair still fits the narrowest column it can land in
    (a hero row on a 320 pt phone): "follow up visit", "cancer screening". */
const HELD = 16

/** A preposition that leads the last words of a line ("on Mar 4", "at
    Pacific Heart", "from 3 places"): it goes to the next line with them. */
const PREPOSITION = /^(?:about|at|by|for|from|in|of|on|to|with)$/

/** The app's one way of keeping words that read badly apart on one line,
    for every row, title and sentence that can wrap on a narrow phone. A
    no-break space does it, so the line still wraps anywhere else, and a
    second pass changes nothing:
    - "Reminder 3 of 3", "Dr. Patel", "follow up";
    - a date ("Mar 4", "Jun 3, 2026") with its weekday ("Wed, Oct 7") and a
      time ("10:30 AM");
    - a number with the word it counts ("2 medicines", "3 places", "20 mg"),
      never with a little word after it ("2 for your next visit");
    - a place of two capitalised words ending a part of the line ("Pacific
      Heart", "La Jolla");
    - at the end, the last word with the one before it ("your record",
      "reach out.") and a preposition with the words it leads ("on Mar 4"),
      so a line never ends on one word; never across a comma or a full stop
      ("Results in, / Aug 14");
    - a title of three words wraps where its two lines come out evenest:
      "Book your / mammogram", "Colorectal / cancer screening".
    Nothing is joined in two words, or past HELD characters: a column too
    narrow for them could not hold them as one either. */
export function keepTogether(text: string): string {
  const held = text
    .replace(/\bReminder (\d+) of (\d+)/g, (_all, n: string, of: string) => `Reminder${NBSP}${n}${NBSP}of${NBSP}${of}`)
    .replace(/\b(Dr|Mr|Mrs|Ms)\. /g, (_all, title: string) => `${title}.${NBSP}`)
    .replace(new RegExp(`\\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun), (?=${MONTH} \\d)`, "g"), (_all, weekday: string) => `${weekday},${NBSP}`)
    .replace(new RegExp(`\\b(${MONTH}) (\\d{1,2})(?:, (\\d{4}))?`, "g"), (_all, month: string, day: string, year?: string) =>
      year ? `${month}${NBSP}${day},${NBSP}${year}` : `${month}${NBSP}${day}`
    )
    .replace(/(\d) (AM|PM)\b/g, `$1${NBSP}$2`)
    .replace(/(\d) (?!(?:a|an|and|at|by|for|from|in|of|on|or|the|to|with)\b)(?=[a-z])/g, `$1${NBSP}`)
    .replace(/\b([Ff]ollow) up\b/g, `$1${NBSP}up`)
    .replace(/\b([A-Z][a-z]+) (?!(?:Dr|Mr|Mrs|Ms)\b)([A-Z][a-z]+)\b(?=[,.]|$)/g, `$1${NBSP}$2`)
  let units = held.split(" ")
  if (units.length < 3) return held
  // Unit i held to the one after it, when neither a comma nor a full stop
  // stands between them and the pair is short enough.
  const joined = (i: number) => [...units.slice(0, i), `${units[i]}${NBSP}${units[i + 1]}`, ...units.slice(i + 2)]
  const fits = (i: number, room = HELD) => !/[,.:;]$/.test(units[i]) && units[i].length + units[i + 1].length + 1 <= room
  const single = (unit: string) => !unit.includes(NBSP)
  if (units.length === 3 && !/[,.:;!?]/.test(held) && units.every(single)) {
    const [a, b, c] = units.map((u) => u.length)
    return (fits(1) && Math.abs(a - (b + c + 1)) <= Math.abs(a + b + 1 - c) ? joined(1) : units).join(" ")
  }
  if (single(units[units.length - 1]) && fits(units.length - 2)) units = joined(units.length - 2)
  const lead = units.length - 2
  if (lead >= 1 && PREPOSITION.test(units[lead]) && fits(lead, HELD + 4)) units = joined(lead)
  return units.join(" ")
}
