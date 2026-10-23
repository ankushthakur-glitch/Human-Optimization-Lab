import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { FlowScreen } from "@/components/flow"
import { Heartbeat, Moon, Package, Watch } from "@/components/ph"
import { Block, Card, Group, NeedsRow, StatRow, StatTile, Tag, toast } from "@/components/record-kit"
import { Button, TextField } from "@/components/ui"
import { color, font, hairline, ink, space, type } from "@/lib/theme"
import { AT_HOME, SYMPTOMS } from "@/lib/v14"

/* Deck screen 29, "The day everything counts from": progress needs a
   zero, and half of it is in no test. The four test findings carry in
   already, weight and waist are typed at home (the two she re-measures
   every week), and the three symptoms she named are scored 0 to 10.

   Beyond the deck: the 22 Oct call agreed that most of the plan is
   measured off a wearable, so the starting point also asks which devices
   she has, and points to Care when she has none. The 0 to 10 scale is a
   row of numbers she taps, coloured by how much it bothers her, so the
   choice reads at a glance without a slider to drag. */

type Score = number

function tone(v: Score) {
  if (v >= 7) return { ink: color.high, tint: color.highTint }
  if (v >= 4) return { ink: color.low, tint: color.lowTint }
  return { ink: color.ok, tint: color.okTint }
}

function Scale({ value, onChange, label }: { value: Score; onChange: (v: Score) => void; label: string }) {
  return (
    <View style={styles.scale} accessibilityRole="radiogroup" accessibilityLabel={`${label}, 0 to 10`}>
      {Array.from({ length: 11 }, (_, n) => {
        const on = n === value
        const t = tone(n)
        return (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={`${n}`}
            hitSlop={4}
            style={[styles.cell, on && { backgroundColor: t.tint, borderColor: t.ink }]}
          >
            <Text style={[styles.cellText, on && { color: t.ink, fontFamily: font.semibold }]}>{n}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export default function StartingPoint() {
  const [weight, setWeight] = React.useState(String(AT_HOME.start.weight))
  const [waist, setWaist] = React.useState(String(AT_HOME.start.waist))
  const [scores, setScores] = React.useState(SYMPTOMS.map((s) => s.start))

  return (
    <FlowScreen
      page
      title="Set your starting point"
      description="Everything from here is measured against today."
      footer={
        <Button onPress={() => router.replace("/v14/plan" as never)} disabled={!weight || !waist}>
          Start day one
        </Button>
      }
    >
      <View style={styles.list}>
        <Block title="From your tests" action={<Tag tone="ok">Already in</Tag>}>
          <StatRow>
            <StatTile value="41" unit="%" label="Body fat" meta="DEXA" />
            <StatTile value="18" label="Sleep, AHI" meta="Home sleep study" />
          </StatRow>
          <StatRow>
            <StatTile value="1,310" unit="kcal" label="Resting metabolism" meta="RMR" />
            <StatTile value="4.2" label="hs-CRP" meta="Blood panel" />
          </StatRow>
        </Block>

        <Block title="Measured at home" meta="Today">
          <Card style={styles.fields}>
            <View style={styles.field}>
              <TextField label="Weight" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" trailing={<Text style={styles.unit}>lb</Text>} compact />
            </View>
            <View style={styles.field}>
              <TextField label="Waist" value={waist} onChangeText={setWaist} keyboardType="decimal-pad" trailing={<Text style={styles.unit}>in</Text>} compact />
            </View>
          </Card>
          <Text style={type.meta}>You measure these two again every Monday, no appointment needed.</Text>
        </Block>

        <Block title="How much each one bothers you" meta="0 is not at all">
          {SYMPTOMS.map((s, i) => (
            <Card key={s.name} style={styles.symptom}>
              <View style={styles.symptomHead}>
                <View style={styles.grow}>
                  <Text style={type.title}>{s.name}</Text>
                  <Text style={type.meta}>{s.said}</Text>
                </View>
                <Text style={[type.hero, { color: tone(scores[i]).ink }]}>{scores[i]}</Text>
              </View>
              <Scale label={s.name} value={scores[i]} onChange={(v) => setScores((all) => all.map((x, j) => (j === i ? v : x)))} />
            </Card>
          ))}
          <Text style={type.meta}>We ask these same three at week 8 and every quarter. That is how you will know whether any of it worked.</Text>
        </Block>

        <Block title="Your devices" meta="Do you have a wearable?">
          <Group>
            <NeedsRow icon={<Watch size={16} color={color.primary} />} title="Apple Watch" meta="Exercise and sleep come from here" tag={{ tone: "ok", label: "Connected" }} chevron={false} />
            <NeedsRow icon={<Moon size={16} color={color.primary} />} title="ResMed CPAP" meta="Hours worn each night" tag={{ tone: "ok", label: "Connected" }} chevron={false} />
            <NeedsRow icon={<Heartbeat size={16} color={color.primary} />} title="Withings scale" meta="Not connected yet. You can type your weight instead." action={{ label: "Connect", onPress: () => toast("Opens Connect in the real app") }} />
            <NeedsRow icon={<Package size={16} color={color.primary} />} title="No wearable?" meta="Most of your plan is measured by one. See options in Care." onPress={() => router.push("/v14/care" as never)} />
          </Group>
        </Block>
      </View>
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  list: { gap: space.section },
  grow: { flex: 1, minWidth: 0, gap: space.line },
  fields: { flexDirection: "row", gap: space.item },
  field: { flex: 1 },
  unit: { ...type.unitLarge, paddingRight: space.item },
  symptom: { gap: space.item },
  symptomHead: { flexDirection: "row", alignItems: "center", gap: space.item },
  scale: { flexDirection: "row", gap: 3 },
  cell: { flex: 1, height: 32, borderRadius: 8, borderWidth: 1, borderColor: hairline.outline, alignItems: "center", justifyContent: "center", backgroundColor: color.background },
  cellText: { ...type.label, color: ink.content },
})
