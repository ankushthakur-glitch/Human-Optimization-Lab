import * as React from "react"
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, type TextInput, View } from "react-native"

import { Microphone } from "@/components/ph"
import { toast } from "@/components/record-kit"
import { Sheet } from "@/components/sheet"
import { askAbout } from "@/components/topic-kit"
import { Button, TextField } from "@/components/ui"
import { dayOfAt, localDay, waists, weighIns, type Entry } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { SIX, type SixId } from "@/lib/topics"
import { color, ink, space, type } from "@/lib/theme"

/* Today's measurements (Journey_14 screen 38): choosing "Enter today's
   numbers" opens a sheet over the Measure page carrying the exact fields
   she set on day one (all six), so a missed waist cannot quietly become a
   gap in the chart. Each is a plain number field with its unit inside and
   the last value under it, so a typo is obvious on sight; Next on the
   keyboard moves down the six. Voice or keypad: say all six in one breath,
   or type them.
   Weight and waist are entries like any weigh-in, the other four are kept
   beside them by day. Saving with some missing is possible, forgetting
   silently is not: the sheet says how many are still needed. */

const number = (text: string) => {
  const t = text.trim().replace(",", ".")
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : undefined
}

export function MeasureSheet({ onClose }: { onClose: () => void }) {
  const s = useOnboarding()
  const day = localDay()
  const [text, setText] = React.useState<Record<SixId, string>>({ weight: "", chest: "", waist: "", hips: "", thigh: "", arm: "" })
  const inputs = React.useRef<(TextInput | null)[]>([])
  const [saving, setSaving] = React.useState(false)

  // The reading before today's, from her own record where it has one.
  const was = (id: SixId, fallback: string) => {
    const list = id === "weight" ? weighIns(s) : id === "waist" ? waists(s) : undefined
    const last = list?.filter((m) => dayOfAt(m.at) < day).at(-1)
    return last ? last.value.toFixed(1) : fallback
  }
  const value = (id: SixId) => {
    const min = SIX.find((f) => f.id === id)!
    const n = number(text[id])
    return n !== undefined && n >= min.min && n <= min.max ? n : undefined
  }
  const entered = SIX.filter((f) => value(f.id) !== undefined).length
  const left = SIX.length - entered

  async function save() {
    setSaving(true)
    const now = new Date()
    const entry = (kind: "weight" | "waist"): Entry[] => {
      const v = value(kind)
      return v === undefined ? [] : [{ id: `e-${kind}-${now.getTime().toString(36)}`, kind, at: now.toISOString(), value: Math.round(v * 10) / 10 }]
    }
    const replaced = new Set(["weight", "waist"].filter((k) => value(k as SixId) !== undefined))
    const kept = (s.entries ?? []).filter((e) => !(replaced.has(e.kind) && dayOfAt(e.at) === day))
    const more = Object.fromEntries((["chest", "hips", "thigh", "arm"] as const).flatMap((id) => (value(id) === undefined ? [] : [[id, value(id)]])))
    await s.save({
      entries: [...kept, ...entry("weight"), ...entry("waist")],
      measures: { ...s.measures, [day]: { ...s.measures?.[day], ...more } },
      ...(entered ? { topicLog: { ...s.topicLog, [day]: { ...s.topicLog?.[day], measure: { way: "enter", at: now.toISOString() } } } } : {}),
    })
    toast(left ? `Saved. ${left} still needed.` : "Saved. Your chart is updated.")
    onClose()
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={styles.fill} pointerEvents="box-none">
        <Sheet title="Today's measurements" onClose={onClose}>
          <Pressable
            onPress={() => {
              onClose()
              askAbout("Log my measurements: ")
            }}
            accessibilityRole="button"
            accessibilityLabel="Say all six measurements at once"
            style={({ pressed }) => [styles.voice, pressed && styles.pressed]}
          >
            <View style={styles.fill}>
              <Text style={styles.voiceTitle}>Say them all at once, instead of typing</Text>
              <Text style={type.label}>“Waist thirty-six and a quarter, arm twelve”</Text>
            </View>
            <View style={styles.mic}>
              <Microphone size={16} color={color.onPrimary} weight="fill" />
            </View>
          </Pressable>

          <View style={styles.grid}>
            {SIX.map((f, i) => {
              const last = i === SIX.length - 1
              return (
                <View key={f.id} style={styles.cell}>
                  <TextField
                    ref={(r) => {
                      inputs.current[i] = r
                    }}
                    label={f.label}
                    compact
                    value={text[f.id]}
                    onChangeText={(v) => setText((t) => ({ ...t, [f.id]: v }))}
                    keyboardType="decimal-pad"
                    returnKeyType={last ? "done" : "next"}
                    blurOnSubmit={last}
                    onSubmitEditing={() => inputs.current[i + 1]?.focus()}
                    accessibilityLabel={`${f.label} in ${f.unit}, last ${was(f.id, f.was)}`}
                    trailing={<Text style={styles.unit}>{f.unit}</Text>}
                  />
                  <Text style={type.meta}>Last {was(f.id, f.was)} {f.unit}</Text>
                </View>
              )
            })}
          </View>

          {entered > 0 && <Text style={[styles.countText, left > 0 && styles.countLeft]}>{`${entered} of 6 entered${left ? `, ${left} to go` : ""}`}</Text>}
          <Button onPress={save} pending={saving} disabled={!entered}>
            Save today's six
          </Button>
        </Sheet>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pressed: { opacity: 0.8 },
  voice: { flexDirection: "row", alignItems: "center", gap: space.lead, padding: space.item, borderRadius: 12, backgroundColor: color.primarySoft, borderWidth: 1, borderColor: color.primaryEdge },
  voiceTitle: { ...type.title, color: ink.primary },
  mic: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: color.primary },
  grid: { flexDirection: "row", flexWrap: "wrap", columnGap: space.inline, rowGap: space.item },
  cell: { flexBasis: "45%", flexGrow: 1, gap: space.mark },
  unit: { ...type.meta, paddingRight: space.item },
  countText: { ...type.metaStrong, color: ink.good },
  countLeft: { color: "#A95413" },
})
