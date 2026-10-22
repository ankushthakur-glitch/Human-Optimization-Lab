import { router } from "expo-router"
import * as React from "react"
import { PanResponder, StyleSheet, Text, TextInput, View } from "react-native"

import { FlowScreen } from "@/components/flow"
import { PrimaryButton } from "@/components/hol"
import { Info, Ruler, Scales } from "@/components/ph"
import { Block } from "@/components/record-kit"
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
    router.replace("/today")
  }

  return (
    <FlowScreen page title="Set your starting point" footer={<PrimaryButton onPress={start} disabled={!ready || saving}>Start day one</PrimaryButton>}>
      <Text style={type.body}>Your tests gave us the numbers. These are the ones only you can give us — and everything from here is measured against today.</Text>

      <Block title="From your tests" meta="already in">
        <View style={styles.tiles}>
          {TEST_RESULTS.map((t) => (
            <View key={t.label} style={styles.tile} accessible accessibilityLabel={`${t.label}, ${t.value}${t.unit ? ` ${t.unit}` : ""}`}>
              <Text style={type.label}>{t.label}</Text>
              <Text style={styles.value}>
                {t.value}
                {!!t.unit && <Text style={type.unit}>{` ${t.unit}`}</Text>}
              </Text>
            </View>
          ))}
        </View>
      </Block>

      <Block title="Measured at home" meta="2 entries">
        <View style={styles.fields}>
          <Field label="Weight today" unit="lb" value={weight} onChange={setWeight} icon={<Scales size={16} color={ink.secondary} />} />
          <Field label="Waist" unit="in" value={waist} onChange={setWaist} icon={<Ruler size={16} color={ink.secondary} />} />
        </View>
      </Block>

      <Block title="How much each one bothers you" meta="today">
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

function Field({ label, unit, value, onChange, icon }: { label: string; unit: string; value: string; onChange: (v: string) => void; icon: React.ReactNode }) {
  return (
    <View style={styles.fill}>
      <Text style={[type.label, styles.fieldLabel]}>{label}</Text>
      <View style={styles.field}>
        {icon}
        <TextInput
          value={value}
          onChangeText={(v) => onChange(v.replace(/[^\d.,]/g, "").slice(0, 5))}
          keyboardType="decimal-pad"
          accessibilityLabel={`${label}, ${unit}`}
          style={styles.input}
        />
        <Text style={type.unit}>{unit}</Text>
      </View>
    </View>
  )
}

/** A 0 to 10 score on a bar: tap it, or drag along it. The bar's colour
    walks from teal to amber to clay as it bothers her more, and the number
    is always beside it. */
function Score({ value, label, onChange }: { value: number; label: string; onChange: (n: number) => void }) {
  const [width, setWidth] = React.useState(0)
  const at = React.useRef({ width: 0, onChange })
  at.current = { width, onChange }
  const pan = React.useMemo(() => {
    const move = (x: number) => {
      const { width: w, onChange: change } = at.current
      if (w > 0) change(Math.max(0, Math.min(10, Math.round((x / w) * 10))))
    }
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => move(e.nativeEvent.locationX),
      onPanResponderMove: (e) => move(e.nativeEvent.locationX),
    })
  }, [])
  const tone = value >= 7 ? CLAY : value >= 4 ? color.amber : color.primary
  return (
    <View style={styles.score}>
      <View
        {...pan.panHandlers}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`${label}, how much it bothers you`}
        accessibilityValue={{ min: 0, max: 10, now: value, text: `${value} out of 10` }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) => onChange(Math.max(0, Math.min(10, value + (e.nativeEvent.actionName === "increment" ? 1 : -1))))}
        style={styles.hit}
      >
        <View style={styles.track}>
          <View style={[styles.fillBar, { width: `${value * 10}%`, backgroundColor: tone }]} />
        </View>
        <View style={[styles.knob, { left: `${value * 10}%`, borderColor: tone }]} pointerEvents="none" />
      </View>
      <Text style={[styles.num, { color: value >= 4 ? "#A95413" : ink.primary }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1, minWidth: 0 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: space.inline },
  tile: { flexBasis: "48%", flexGrow: 1, gap: 2, padding: space.item, borderRadius: 10, backgroundColor: color.background, borderWidth: 1, borderColor: hairline.edge, boxShadow: card.shadowXs },
  value: { ...type.hero, fontVariant: ["tabular-nums"] },

  fields: { flexDirection: "row", gap: space.item },
  fieldLabel: { marginBottom: space.stack, fontFamily: font.medium },
  field: { flexDirection: "row", alignItems: "center", gap: space.inline, height: 44, paddingHorizontal: space.item, borderRadius: 10, backgroundColor: color.background, borderWidth: 1, borderColor: hairline.outline },
  input: { ...type.title, flex: 1, minWidth: 0, padding: 0, color: ink.strong, outlineWidth: 0 } as never,

  symptoms: { gap: space.inline },
  symptom: { gap: space.inline, padding: space.item, borderRadius: 10, backgroundColor: color.background, borderWidth: 1, borderColor: hairline.edge, boxShadow: card.shadowXs },
  top: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: space.inline },
  name: { ...type.title, color: ink.strong },
  score: { flexDirection: "row", alignItems: "center", gap: space.item },
  hit: { flex: 1, height: 28, justifyContent: "center" },
  track: { height: 6, borderRadius: 3, overflow: "hidden", backgroundColor: chart.track },
  fillBar: { height: 6, borderRadius: 3 },
  knob: { position: "absolute", width: 18, height: 18, marginLeft: -9, borderRadius: 9, backgroundColor: color.background, borderWidth: 2, boxShadow: card.shadowXs },
  num: { ...type.stat, minWidth: 16, textAlign: "right", fontVariant: ["tabular-nums"] },

  foot: { flexDirection: "row", alignItems: "flex-start", gap: space.inline },
})
