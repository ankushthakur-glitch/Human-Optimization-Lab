import type { RecordIconName } from "@/components/record-icons"
import type { GapKind } from "@/lib/record"

/* How a care gap shows on the dashboard and its own page. */

export const GAP_ICON: Record<GapKind, RecordIconName> = {
  order: "labs",
  "follow-up": "visits",
  preventive: "immunizations",
  condition: "conditions",
}

/** What a care gap's reminders have come to, in a line. Saying it is
    booked is not the same as done: it closes when the result arrives. */
export function gapStatus(reminders: number, booked?: string) {
  if (booked) return "Booked, waiting for the result"
  if (reminders >= 3) return "Dr. Patel and your clinic will follow up"
  if (reminders === 0) return "To raise with your doctor"
  return `Reminder ${reminders} of 3`
}
