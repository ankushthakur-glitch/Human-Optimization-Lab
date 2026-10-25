import { StyleSheet, View } from "react-native"

import { Check } from "@/components/ph"
import type { ActivityLog } from "@/lib/member"
import type { useOnboarding } from "@/lib/onboarding"
import { chart, color } from "@/lib/theme"

/* The pieces today's exercise and one exercise share (FINAL-SPEC C.19,
   C.20): the numbered mark a move carries in the session and a cue carries
   in its steps, the move row, the walk's tick circle, and how one entry of
   a day's log is written. When a move counts as done is `moveDone` in
   lib/member.ts, the rule Home and the day page use too. */

type Store = ReturnType<typeof useOnboarding>

/** Saves one entry of a day's log (a move, the session or the walk), or
    removes it with undefined; the rest of the day stays as it is. */
export function saveLog(s: Store, day: string, id: string, log: ActivityLog | undefined) {
  const { [id]: _replaced, ...rest } = s.exercises?.[day] ?? {}
  return s.save({ exercises: { ...s.exercises, [day]: log ? { ...rest, [id]: log } : rest } })
}

/* Only digits, for the reps; digits and one point, for a weight. */
export const digits = (text: string) => text.replace(/\D/g, "").slice(0, 3)
export function decimal(text: string) {
  const [whole, ...rest] = text.replace(/[^\d.]/g, "").split(".")
  return (rest.length ? `${whole}.${rest.join("")}` : whole).slice(0, 5)
}
export const amount = (text: string) => (text && Number.isFinite(Number(text)) ? Number(text) : undefined)

/** A sentence with its last two words joined (a no-break space), so a wrap
    never leaves one word alone on its last line ("feet hip width apart."). */
export const keepEnd = (text: string) => text.replace(/ (?=\S+$)/, " ")

/** The numbered mark's size: the Figma "Hol" row tile, round 28. A line of text
    beside it centres on it with (MARK_SIZE - lineHeight) / 2 above. */
export const MARK_SIZE = 28

/** The walk's tick: an empty ring, then a green check once done. */
export function TickCircle({ done }: { done: boolean }) {
  return <View style={[styles.tick, done && styles.tickDone]}>{done && <Check size={14} color={color.onPrimary} weight="bold" />}</View>
}

const styles = StyleSheet.create({
  // The ring is the kit's resting mark grey (a step not reached yet).
  tick: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: "#D0D5DD", alignItems: "center", justifyContent: "center" },
  tickDone: { borderWidth: 0, backgroundColor: chart.inRange },
})
