import * as React from "react"
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native"

import { Microphone } from "@/components/ph"
import { toast } from "@/components/record-kit"
import { Sheet } from "@/components/sheet"
import { askAbout } from "@/components/topic-kit"
import { Button } from "@/components/ui"
import { dayOfAt, localDay, waists, weighIns, type Entry } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { SIX, type SixId } from "@/lib/topics"
import { color, font, hairline, ink, space, type } from "@/lib/theme"

/* Today's measurements (Journey_14 screen 38): choosing "Enter today's
   numbers" opens a sheet over the Measure page carrying the exact fields
   she set on day one (all six), so a missed waist cannot quietly become a
   gap in the chart. Each tile shows the last value under it, so a typo is
   obvious on sight; the ones still to go are the only tiles marked. Voice
   or keypad: say all six in one breath, or tap a tile and key it in.
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
  const [focus, setFocus] = React.useState<SixId>()
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
          <Text style={type.body}>All six you set on day one. We ask for every one of them so a missed waist cannot quietly become a gap in the chart.</Text>

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
            {SIX.map((f) => {
              const missing = value(f.id) === undefined
              const on = focus === f.id
              return (
                <View key={f.id} style={[styles.tile, on && styles.tileOn, missing && !on && entered > 0 && styles.tileMissing]}>
                  <Text style={styles.tileLabel}>{f.label}</Text>
                  <View style={styles.valueRow}>
                    <TextInput
                      value={text[f.id]}
                      onChangeText={(v) => setText((t) => ({ ...t, [f.id]: v }))}
                      onFocus={() => setFocus(f.id)}
                      onBlur={() => setFocus((x) => (x === f.id ? undefined : x))}
                      placeholder="—"
                      placeholderTextColor={ink.tertiary}
                      keyboardType="decimal-pad"
                      accessibilityLabel={`${f.label}, ${f.unit}`}
                      style={styles.input}
                    />
                    {!!text[f.id] && <Text style={type.unit}>{f.unit}</Text>}
                  </View>
                  <Text style={[styles.was, missing && entered > 0 && styles.needed]}>{missing && entered > 0 ? "still needed" : `was ${was(f.id, f.was)}`}</Text>
                </View>
              )
            })}
          </View>

          <View style={styles.count}>
            <Text style={[styles.countText, left > 0 && entered > 0 && styles.countLeft]}>{entered ? `${entered} of 6 entered${left ? ` · ${left} to go` : ""}` : "None entered yet"}</Text>
            <Text style={type.meta}>Tap a tile to key it in</Text>
          </View>
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
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.inline },
  tile: { flexBasis: "48%", flexGrow: 1, gap: space.stack, padding: space.item, borderRadius: 10, backgroundColor: color.background, borderWidth: 1, borderColor: hairline.edge },
  tileOn: { borderColor: color.primary, backgroundColor: color.primaryTint },
  tileMissing: { borderColor: color.amberEdge, borderStyle: "dashed", backgroundColor: color.amberTint },
  tileLabel: { ...type.caption, color: ink.secondary },
  valueRow: { flexDirection: "row", alignItems: "baseline", gap: space.stack },
  input: { ...type.hero, minWidth: 56, padding: 0, fontFamily: font.semibold, color: ink.strong, outlineWidth: 0 } as never,
  was: { ...type.meta },
  needed: { color: "#A95413", fontFamily: font.medium },
  count: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  countText: { ...type.metaStrong, color: ink.good },
  countLeft: { color: "#A95413" },
})
