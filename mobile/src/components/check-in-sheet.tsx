import * as React from "react"
import { KeyboardAvoidingView, Linking, Platform, StyleSheet, Text, View } from "react-native"

import { IconCheck } from "@/components/icons"
import { Sheet } from "@/components/sheet"
import { toast } from "@/components/toast"
import { Button, TextField } from "@/components/ui"
import { MANUAL_ENTRIES, WALK, clockOf, dateOfAt, dayOfAt, daysBetween, localDay, pressures, shortDay, stands, waists, weighIns, type Entry } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { chart, color, ink, space, type } from "@/lib/theme"

/* The short sheets a member enters a home reading in, from Home's Today
   rows, Progress and History (FINAL-SPEC C.23): a weigh in, a blood
   pressure reading, the monthly waist and chair stand checks, and the walk
   after dinner. Each is the approved bottom Sheet as it is: how to measure
   in one line, one or two fields, the last reading for comparison, and
   Save. A saved reading joins the earlier ones at once (Progress, History
   and the blood pressure page read the same `entries`), as entered by her,
   never joined to a clinic's readings. One reading a day of each kind: a
   second one that day replaces the first, so the sheet opened from a done
   row edits it. A very high blood pressure says what to do before it is
   saved (L-30, rule based). Until devices connect, every reading is typed
   in. */

export type CheckInKind = "weight" | "bp" | "waist" | "walk" | "stands"

export type CheckInSheetProps = { kind: CheckInKind; onClose: () => void }

export function CheckInSheet({ kind, onClose }: CheckInSheetProps) {
  if (kind === "walk") return <WalkSheet onClose={onClose} />
  if (kind === "bp") return <PressureSheet onClose={onClose} />
  return <MeasureSheet kind={kind} onClose={onClose} />
}

/** "Saved" for every reading: the chart that shows it is already redrawn. */
const SAVED = "Saved. Your chart is updated."

type Store = ReturnType<typeof useOnboarding>
type Measured = Exclude<CheckInKind, "walk">

/** How to take each reading, one line from the member's data
    (MANUAL_ENTRIES), its last two words kept together so it never ends on
    one word. */
const HOW = Object.fromEntries(MANUAL_ENTRIES.map((m) => [m.id, m.how.replace(/ (\S+)$/, "\u00A0$1")])) as Record<Measured, string>

/** One field's words and the plausible range of what it takes. */
const MEASURE: Record<Exclude<Measured, "bp">, { title: string; label: string; unit?: string; min: number; max: number; whole?: boolean }> = {
  weight: { title: "Weigh in", label: "Weight", unit: "lb", min: 70, max: 600 },
  waist: { title: "Waist", label: "Waist", unit: "in", min: 20, max: 80 },
  stands: { title: "Chair stands", label: "Stands in 30 seconds", min: 0, max: 60, whole: true },
}

/** "178.5" from "178.5" or "178,5"; undefined for anything else. */
function numberOf(text: string): number | undefined {
  const t = text.trim().replace(",", ".")
  if (!/^\d+(\.\d+)?$/.test(t)) return undefined
  return Number(t)
}

/** Her readings of a kind, oldest first: the sample history merged with
    what she entered. */
const READINGS: Record<Measured, (s: Store) => { at: string; value: number; value2?: number }[]> = { weight: weighIns, waist: waists, bp: pressures, stands }

/** Today's own entry of a kind, which the sheet edits. */
function todayEntry(s: Store, kind: Measured): Entry | undefined {
  const day = localDay()
  return (s.entries ?? []).filter((e) => e.kind === kind && dayOfAt(e.at) === day).at(-1)
}

/** "Last: 178.5 lb on Sep 24", the reading before today's, for comparison. */
function lastLine(s: Store, kind: Measured, unit?: string) {
  const day = localDay()
  const last = READINGS[kind](s)
    .filter((m) => dayOfAt(m.at) < day)
    .at(-1)
  if (!last) return undefined
  const when = dateOfAt(last.at)
  const ago = daysBetween(when, new Date())
  const value = kind === "bp" ? `${last.value}/${last.value2}` : kind === "stands" ? String(last.value) : last.value.toFixed(1)
  return `Last: ${value}${unit ? ` ${unit}` : ""} ${ago === 1 ? "yesterday" : `on ${shortDay(when)}`}`
}

/** Today's reading of a kind saved, replacing an earlier one from today. */
function withEntry(s: Store, entry: Omit<Entry, "id" | "at">): Entry[] {
  const day = localDay()
  const kept = (s.entries ?? []).filter((e) => !(e.kind === entry.kind && dayOfAt(e.at) === day))
  const now = new Date()
  return [...kept, { ...entry, id: `e-${entry.kind}-${now.getTime().toString(36)}`, at: now.toISOString() } as Entry]
}

/** The approved Sheet, rising with the keyboard on an iPhone so the field
    and Save stay in sight. The keyboard's padding only moves children in
    the flow, so the sheet sits in a view that fills what is left. */
function Frame({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={styles.fill} pointerEvents="box-none">
        <Sheet title={title} onClose={onClose}>
          {children}
        </Sheet>
      </View>
    </KeyboardAvoidingView>
  )
}

/** A unit inside a field, on the right. */
const Unit = ({ children }: { children: string }) => <Text style={styles.unit}>{children}</Text>

/* ------------------------------------------------- one number readings -- */

function MeasureSheet({ kind, onClose }: { kind: Exclude<Measured, "bp">; onClose: () => void }) {
  const s = useOnboarding()
  const m = MEASURE[kind]
  const own = todayEntry(s, kind)
  const [text, setText] = React.useState(own ? (m.whole ? String(own.value) : own.value.toFixed(1)) : "")
  const [error, setError] = React.useState<string>()
  const [saving, setSaving] = React.useState(false)
  const last = lastLine(s, kind, m.unit)

  async function save() {
    const value = numberOf(text)
    if (value === undefined || value < m.min || value > m.max || (m.whole && !Number.isInteger(value))) {
      setError("Check the number.")
      return
    }
    setSaving(true)
    await s.save({ entries: withEntry(s, { kind, value: m.whole ? value : Math.round(value * 10) / 10 }) })
    toast(SAVED)
    onClose()
  }

  return (
    <Frame title={m.title} onClose={onClose}>
      <Text style={styles.how}>{HOW[kind]}</Text>
      <View style={styles.field}>
        <TextField
          label={m.label}
          value={text}
          onChangeText={(v) => {
            setText(v)
            setError(undefined)
          }}
          keyboardType={m.whole ? "number-pad" : "decimal-pad"}
          returnKeyType="done"
          onSubmitEditing={save}
          error={error}
          trailing={m.unit ? <Unit>{m.unit}</Unit> : undefined}
        />
        {!!last && <Text style={styles.last}>{last}</Text>}
      </View>
      <Button onPress={save} pending={saving} disabled={!text.trim()}>
        Save
      </Button>
    </Frame>
  )
}

/* ----------------------------------------------------- blood pressure -- */

/** Past either limit the reading is very high: what to do comes before the
    save (L-30). */
const VERY_HIGH = { top: 180, bottom: 120 }

function PressureSheet({ onClose }: { onClose: () => void }) {
  const s = useOnboarding()
  const own = todayEntry(s, "bp")
  const [top, setTop] = React.useState(own ? String(own.value) : "")
  const [bottom, setBottom] = React.useState(own?.value2 !== undefined ? String(own.value2) : "")
  const [pulse, setPulse] = React.useState(own?.pulse !== undefined ? String(own.pulse) : "")
  const [errors, setErrors] = React.useState<{ top?: string; bottom?: string; pulse?: string }>({})
  const [warned, setWarned] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const last = lastLine(s, "bp", "mmHg")

  const edit = (set: (v: string) => void) => (v: string) => {
    set(v)
    setErrors({})
    setWarned(false)
  }

  /** The reading as numbers, or the fields to check. */
  function read() {
    const t = numberOf(top)
    const b = numberOf(bottom)
    const p = pulse.trim() ? numberOf(pulse) : undefined
    const next: typeof errors = {}
    if (t === undefined || !Number.isInteger(t) || t < 60 || t > 300) next.top = "Check the number."
    if (b === undefined || !Number.isInteger(b) || b < 30 || b > 200 || (t !== undefined && b >= t)) next.bottom = "Check the number."
    if (pulse.trim() && (p === undefined || !Number.isInteger(p) || p < 25 || p > 250)) next.pulse = "Check the number."
    setErrors(next)
    return Object.keys(next).length ? undefined : { top: t!, bottom: b!, pulse: p }
  }

  async function save(confirmed = false) {
    const r = read()
    if (!r) return
    if (!confirmed && (r.top >= VERY_HIGH.top || r.bottom >= VERY_HIGH.bottom)) {
      setWarned(true)
      return
    }
    setSaving(true)
    await s.save({ entries: withEntry(s, { kind: "bp", value: r.top, value2: r.bottom, ...(r.pulse !== undefined ? { pulse: r.pulse } : {}) }) })
    toast(SAVED)
    onClose()
  }

  return (
    <Frame title="Blood pressure" onClose={onClose}>
      <Text style={styles.how}>{HOW.bp}</Text>
      <View style={styles.field}>
        <View style={styles.pair}>
          <View style={styles.half}>
            <TextField
              label="Top number"
              style={styles.shrink}
              value={top}
              onChangeText={edit(setTop)}
              keyboardType="number-pad"
              maxLength={3}
              error={errors.top}
              trailing={<Unit>mmHg</Unit>}
            />
          </View>
          <View style={styles.half}>
            <TextField
              label="Bottom number"
              style={styles.shrink}
              value={bottom}
              onChangeText={edit(setBottom)}
              keyboardType="number-pad"
              maxLength={3}
              error={errors.bottom}
              trailing={<Unit>mmHg</Unit>}
            />
          </View>
        </View>
        {!!last && <Text style={styles.last}>{last}</Text>}
      </View>
      <TextField label="Pulse" value={pulse} onChangeText={edit(setPulse)} keyboardType="number-pad" maxLength={3} error={errors.pulse} trailing={<Unit>bpm</Unit>} />
      {warned ? (
        <>
          <View style={styles.warning} accessibilityRole="alert" accessibilityLiveRegion="assertive">
            <Text style={styles.warningTitle}>This reading is very high.</Text>
            <Text style={styles.warningText}>
              If you have chest pain, shortness of breath, weakness, or trouble speaking or seeing, call 911 now. Otherwise rest 5 minutes and measure again.
            </Text>
          </View>
          <View style={styles.actions}>
            <Button onPress={() => save(true)} pending={saving}>
              Save reading
            </Button>
            <Button variant="outline" onPress={() => Linking.openURL(`tel:${PATIENT.practicePhone.replace(/\D/g, "")}`).catch(() => {})}>
              Call Harborview
            </Button>
          </View>
        </>
      ) : (
        <Button onPress={() => save()} pending={saving} disabled={!top.trim() || !bottom.trim()}>
          Save
        </Button>
      )}
    </Frame>
  )
}

/* --------------------------------------------------------------- walk -- */

/** The walk after dinner: how to do it, then mark it done (or take the
    mark back), the same as the tick on Home's row. */
function WalkSheet({ onClose }: { onClose: () => void }) {
  const s = useOnboarding()
  const day = localDay()
  const log = s.exercises?.[day] ?? {}
  const done = log.walk

  async function mark(on: boolean) {
    const { walk: _walk, ...rest } = log
    const next = on ? { ...log, walk: { at: new Date().toISOString(), minutes: WALK.minutes } } : rest
    await s.save({ exercises: { ...s.exercises, [day]: next } })
    onClose()
  }

  return (
    <Frame title={WALK.title} onClose={onClose}>
      <View style={styles.tips}>
        {WALK.how.map((line) => (
          <View key={line} style={styles.tip}>
            <View style={styles.tipDot} />
            <Text style={styles.tipText}>{line}</Text>
          </View>
        ))}
      </View>
      {done && (
        <View style={styles.doneLine}>
          <View style={styles.doneMark}>
            <IconCheck size={10} color={color.onPrimary} strokeWidth={3} />
          </View>
          <Text style={styles.doneText}>{`Done at ${clockOf(new Date(done.at))}`}</Text>
        </View>
      )}
      {done ? (
        <Button variant="outline" onPress={() => mark(false)}>
          Mark as not done
        </Button>
      ) : (
        <Button onPress={() => mark(true)}>Mark as done</Button>
      )}
    </Frame>
  )
}

/** The approved Sheet's own gap between what it holds (sheet.tsx), which
    the line under its title pulls up against. */
const SHEET_GAP = 16

/** The approved field's inner inset (ui.tsx), so a unit sits as far in from
    the right edge as the typed number does from the left. */
const FIELD_INSET = 14

/** The walk's bullet, centred on the first line of its words. */
const TIP_DOT = 6

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // How to measure: a sentence, quieter than the fields under it, a label's
  // distance under the title.
  how: { ...type.body, color: ink.secondary, marginTop: space.inline - SHEET_GAP },
  field: { gap: space.inline },
  pair: { flexDirection: "row", gap: space.item },
  half: { flex: 1 },
  // A half width field keeps its unit in view: the input gives way first.
  shrink: { minWidth: 0 },
  unit: { ...type.unit, paddingRight: FIELD_INSET },
  last: { ...type.meta },
  warning: { gap: space.stack },
  warningTitle: { ...type.title },
  warningText: { ...type.body },
  actions: { gap: space.item },
  // The walk's how lines, a heading's distance under the title.
  tips: { gap: space.inline, marginTop: space.item - SHEET_GAP },
  tip: { flexDirection: "row", alignItems: "flex-start", gap: space.mark },
  tipDot: {
    width: TIP_DOT,
    height: TIP_DOT,
    borderRadius: TIP_DOT / 2,
    marginTop: (type.body.lineHeight - TIP_DOT) / 2,
    backgroundColor: color.primary,
  },
  tipText: { ...type.body, flex: 1 },
  doneLine: { flexDirection: "row", alignItems: "center", gap: space.mark },
  doneMark: { width: 16, height: 16, borderRadius: 8, backgroundColor: chart.inRange, alignItems: "center", justifyContent: "center" },
  doneText: { ...type.metaStrong },
})
