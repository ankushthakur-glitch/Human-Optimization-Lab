import { router } from "expo-router"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { CaretRight, Check } from "@/components/ph"
import { HUE } from "@/components/record-kit"
import { moveDone, prescription, type ActivityLog, type Exercise } from "@/lib/member"
import type { useOnboarding } from "@/lib/onboarding"
import { card, chart, color, ink, space, type } from "@/lib/theme"

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

/** A sentence with its last two words joined (a no-break space), so a wrap
    never leaves one word alone on its last line ("feet hip width apart."). */
export const keepEnd = (text: string) => text.replace(/ (?=\S+$)/, " ")

/** Back to where she came from (Home, or the session), or there when the
    page was opened on its own. */
export function goBack(fallback: "/" | "/exercise") {
  if (router.canGoBack()) router.back()
  else router.navigate(fallback)
}

/** The numbered mark's size: the Figma "Hol" row tile, round 28. A line of text
    beside it centres on it with (MARK_SIZE - lineHeight) / 2 above. */
export const MARK_SIZE = 28

/** A move's or a step's number on the teal tint; a small light green check
    once the move is done. */
export function NumberMark({ n, done }: { n: number; done?: boolean }) {
  return (
    <View style={[styles.mark, done && styles.markDone]}>
      {done ? (
        <View style={styles.doneDot}>
          <Check size={10} color={color.ok} weight="bold" />
        </View>
      ) : (
        <Text style={styles.markText}>{n}</Text>
      )}
    </View>
  )
}

/** One move of today's session: its number, name and sets, the sets ticked
    so far while it is under way, and the whole row opens the move. */
export function ExerciseRow({ n, move, log, onPress }: { n: number; move: Exercise; log?: ActivityLog; onPress: () => void }) {
  const done = moveDone(log, move)
  const part = !done && log?.sets ? `${log.sets} of ${move.sets} sets done` : undefined
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[`${n}. ${move.name}`, prescription(move), done ? "done" : part].filter(Boolean).join(", ")}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <NumberMark n={n} done={done} />
      <View style={styles.rowBody}>
        <Text style={type.title}>{move.name}</Text>
        <Text style={type.label}>{prescription(move)}</Text>
        {!!part && <Text style={styles.note}>{part}</Text>}
      </View>
      <CaretRight size={16} color={card.chevron} />
    </Pressable>
  )
}

/** The walk's tick: an empty ring, then a green check once done. */
export function TickCircle({ done }: { done: boolean }) {
  return <View style={[styles.tick, done && styles.tickDone]}>{done && <Check size={14} color={color.onPrimary} weight="bold" />}</View>
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.6 },
  mark: { width: MARK_SIZE, height: MARK_SIZE, borderRadius: MARK_SIZE / 2, alignItems: "center", justifyContent: "center", backgroundColor: HUE.teal.tint },
  // Done: the tile stays 28 so the words keep their place, with a small 20
  // light green circle and a green check at its centre.
  markDone: { backgroundColor: "transparent" },
  doneDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: color.okTint, alignItems: "center", justifyContent: "center" },
  // Frontline's step number: 12 medium in the text teal.
  markText: { ...type.metaStrong, color: ink.primary, fontVariant: ["tabular-nums"] },
  // The kit row's metrics (NeedsRow), so the moves and the walk sit alike:
  // the 28 tile 12 from its words, the meta 4 under the title.
  row: { flexDirection: "row", alignItems: "center", gap: space.lead, paddingVertical: space.rowY },
  rowBody: { flex: 1, gap: space.stack },
  // The kit row's teal note line (NeedsRow's `note`).
  note: { ...type.metaStrong, color: ink.primary },
  // The ring is the kit's resting mark grey (a step not reached yet).
  tick: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: "#D0D5DD", alignItems: "center", justifyContent: "center" },
  tickDone: { borderWidth: 0, backgroundColor: chart.inRange },
})
