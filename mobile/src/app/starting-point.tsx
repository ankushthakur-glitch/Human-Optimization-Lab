import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, TextInput, View } from "react-native"

import { FlowScreen } from "@/components/flow"
import { PrimaryButton } from "@/components/hol"
import { Info } from "@/components/ph"
import { Block, Tag } from "@/components/record-kit"
import { dayOfAt, localDay, waists, weighIns, type Entry } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { SYMPTOMS, TEST_RESULTS } from "@/lib/topics"
import { card, chart, color, font, hairline, ink, space, type } from "@/lib/theme"

/* Set your starting point (Journey_14 screen 29), after "All tests
   complete" and before day one. Progress needs a zero, and half of it is
   not in any test: the patient sets it themselves before day one. The four
   test findings are carried in already, so nothing measured is re-typed.
   Weight and waist are entered at home, because those are the two she will
   re-measure every week without an appointment. The three symptoms she
   named at the start are scored 0 to 10 today (waking at three, an 8;
   irritability, a 7; weight gain, a 6). Without this the programme has
   nothing to prove. The same three are asked again at week eight and every
   quarter, which is how she will know whether any of it worked. "Start day
   one" opens Today. */

const CLAY = chart.outsideClay

export default function StartingPointScreen() {
  const s = useOnboarding()
  const set = s.startingPoint
  const [weight, setWeight] = React.useState(() => String(set?.weight ?? Math.round(weighIns(s).at(-1)?.value ?? 178)))
  const [waist, setWaist] = React.useState(() => String(set?.waist ?? (waists(s).at(-1)?.value ?? 36.5).toFixed(1)))
  const [bother, setBother] = React.useState<Record<"wake" | "irritable" | "gain", number>>(() => set?.bother ?? { wake: 8, irritable: 7, gain: 6 })
  const [saving, setSaving] = React.useState(false)

  const w = Number(weight.replace(",", "."))
  const c = Number(waist.replace(",", "."))
  const ready = Number.isFinite(w) && w >= 70 && w <= 600 && Number.isFinite(c) && c >= 20 && c <= 80

  async function start() {
    if (!ready) return
    setSaving(true)
    const now = new Date()
    const day = localDay(now)
    // Day one's two numbers are readings like any weigh-in, so Progress
    // pairs every later one with them.
    const mine = (kind: "weight" | "waist", value: number): Entry => ({ id: `e-${kind}-${now.getTime().toString(36)}`, kind, at: now.toISOString(), value: Math.round(value * 10) / 10 })
    const kept = (s.entries ?? []).filter((e) => !((e.kind === "weight" || e.kind === "waist") && dayOfAt(e.at) === day))
    await s.save({
      entries: [...kept, mine("weight", w), mine("waist", c)],
      startingPoint: { at: now.toISOString(), weight: Math.round(w * 10) / 10, waist: Math.round(c * 10) / 10, bother },
    })
    router.replace("/plan")
  }

  return (
    <FlowScreen page title="Set your starting point" footer={<PrimaryButton onPress={start} disabled={!ready || saving}>Start day one</PrimaryButton>}>
      <Text style={type.body}>Your tests gave us the numbers. Add the ones only you can give — progress is measured from today.</Text>

      <Block title="From your tests" action={<Tag tone="ok">Already in</Tag>}>
        <View style={styles.tiles}>
          {TEST_RESULTS.map((t) => (
            <View key={t.label} style={styles.tile} accessible accessibilityLabel={`${t.label}, ${t.value}${t.unit ? ` ${t.unit}` : ""}, ${t.via}`}>
              <Text style={styles.value}>
                {t.value}
                {!!t.unit && <Text style={type.unit}>{t.unit === "%" ? t.unit : ` ${t.unit}`}</Text>}
              </Text>
              <Text style={styles.tileName} numberOfLines={1}>{t.label}</Text>
              <Text style={type.meta} numberOfLines={1}>{t.via}</Text>
            </View>
          ))}
        </View>
      </Block>

      <Block title="Measured at home" meta="Today">
        <View style={styles.fields}>
          <Field label="Weight" unit="lb" value={weight} onChange={setWeight} />
          <Field label="Waist" unit="in" value={waist} onChange={setWaist} />
        </View>
      </Block>

      <Block title="How much each one bothers you" action={<Text style={styles.today}>today</Text>}>
        <View style={styles.symptoms}>
          {SYMPTOMS.map((sy) => (
            <View key={sy.id} style={styles.symptom}>
              <View style={styles.top}>
                <Text style={styles.name}>{sy.name}</Text>
                <Text style={type.meta}>{sy.note}</Text>
              </View>
              <Score value={bother[sy.id]} label={sy.name} onChange={(n) => setBother((b) => ({ ...b, [sy.id]: n }))} />
            </View>
          ))}
        </View>
      </Block>

      <View style={styles.foot}>
        <Info size={14} color={ink.tertiary} />
        <Text style={[type.meta, styles.fill]}>We ask these same three at week eight and every quarter. That is how you will know whether any of it worked.</Text>
      </View>
    </FlowScreen>
  )
}

function Field({ label, unit, value, onChange }: { label: string; unit: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.fill}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.field}>
        <TextInput
          value={value}
          onChangeText={(v) => onChange(v.replace(/[^\d.,]/g, "").slice(0, 5))}
          keyboardType="decimal-pad"
          accessibilityLabel={`${label}, ${unit}`}
          style={styles.input}
        />
      </View>
    </View>
  )
}

/** A 0 to 10 score as a bar with the number beside it: tap or drag along
    the bar to set it. The bar and the number take the colour of how much it
    bothers her, teal to amber to clay. */
function Score({ value, label, onChange }: { value: number; label: string; onChange: (n: number) => void }) {
  const tone = value >= 7 ? CLAY : value >= 4 ? color.amber : color.primary
  const width = React.useRef(0)
  const set = (x: number) => {
    if (width.current > 0) onChange(Math.max(0, Math.min(10, Math.round((x / width.current) * 10))))
  }
  return (
    <View style={styles.score}>
      <View
        style={styles.hit}
        onLayout={(e) => {
          width.current = e.nativeEvent.layout.width
        }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => set(e.nativeEvent.locationX)}
        onResponderMove={(e) => set(e.nativeEvent.locationX)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`${label}, how much it bothers you`}
        accessibilityValue={{ min: 0, max: 10, now: value, text: `${value} out of 10` }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) => onChange(Math.max(0, Math.min(10, value + (e.nativeEvent.actionName === "increment" ? 1 : -1))))}
      >
        <View style={styles.track} pointerEvents="none">
          <View style={[styles.bar, { width: `${value * 10}%`, backgroundColor: tone }]} />
        </View>
      </View>
      <Text style={[styles.num, { color: tone }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1, minWidth: 0 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: space.inline },
  tile: { flexBasis: "47%", flexGrow: 1, gap: 2, padding: space.item, borderRadius: 10, backgroundColor: color.background, borderWidth: 1, borderColor: hairline.edge, boxShadow: card.shadowXs },
  value: { ...type.hero, fontVariant: ["tabular-nums"] },
  tileName: { ...type.title, color: ink.content },

  fields: { flexDirection: "row", gap: space.item },
  fieldLabel: { ...type.value, marginBottom: space.inline },
  field: { justifyContent: "center", height: 44, paddingHorizontal: space.item, borderRadius: 10, backgroundColor: color.background, borderWidth: 1, borderColor: hairline.outline },
  input: { ...type.title, minWidth: 0, padding: 0, color: ink.strong, outlineWidth: 0 } as never,

  symptoms: { gap: space.inline },
  today: { ...type.meta, fontFamily: font.medium, color: CLAY },
  symptom: { gap: 2, paddingHorizontal: space.item, paddingVertical: 10, borderRadius: 12, backgroundColor: color.background, borderWidth: 1, borderColor: hairline.edge, boxShadow: card.shadowXs },
  top: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: space.inline },
  name: { ...type.title, fontFamily: font.semibold, color: ink.strong, flexShrink: 1 },
  score: { flexDirection: "row", alignItems: "center", gap: space.item },
  hit: { flex: 1, minWidth: 0, height: 22, justifyContent: "center" },
  track: { height: 5, borderRadius: 2.5, overflow: "hidden", backgroundColor: hairline.rule },
  bar: { height: "100%", borderRadius: 2.5 },
  num: { ...type.title, fontFamily: font.semibold, minWidth: 18, textAlign: "right", fontVariant: ["tabular-nums"] },

  foot: { flexDirection: "row", alignItems: "flex-start", gap: space.inline },
})
