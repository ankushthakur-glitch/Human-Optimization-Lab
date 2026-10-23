import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { Camera } from "@/components/ph"
import { Block, Group, NeedsRow, StatRow, StatTile } from "@/components/record-kit"
import { color, ink, space, type } from "@/lib/theme"
import { AT_HOME, FINDINGS, PATIENT, SYMPTOMS } from "@/lib/v14"

/* Progress (Journey_14 screen 48): every number against the day she
   started, and every comparison dated. A band carries the start, today and
   the day count; each group then reads left as day one and right as today.
   The photo check in (screen 49) opens from the foot. */

export function PlanProgress() {
  const lost = AT_HOME.start.weight - AT_HOME.now.weight
  return (
    <View style={styles.page}>
      <View style={styles.band} accessible accessibilityLabel={`Started ${PATIENT.started}. Today ${PATIENT.today}. Day ${PATIENT.day}.`}>
        <View>
          <Text style={styles.bandLabel}>Started</Text>
          <Text style={styles.bandValue}>{PATIENT.started}</Text>
        </View>
        <View>
          <Text style={styles.bandLabel}>Today</Text>
          <Text style={styles.bandValue}>{PATIENT.today}</Text>
        </View>
        <View style={styles.bandEnd}>
          <Text style={styles.bandLabel}>Day</Text>
          <Text style={styles.bandValue}>{PATIENT.day}</Text>
        </View>
      </View>

      <StatRow>
        <StatTile value={`${lost.toFixed(1)}`} unit="lb" label="Weight lost" meta={`From ${AT_HOME.start.weight} lb`} hue="green" />
        <StatTile value="3.1" unit="pts" label="Body fat down" meta="From 41%" hue="green" />
      </StatRow>

      <Block title="What the tests found" meta="Jul 1 to Oct 6">
        <Group>
          {FINDINGS.map((f) => (
            <Compare key={f.name} name={f.name} line={f.source} from={f.start} to={f.now ?? "Not retested"} />
          ))}
        </Group>
      </Block>

      <Block title="The three you named" meta="0 to 10, lower is better">
        <Group>
          {SYMPTOMS.map((s) => (
            <Compare key={s.name} name={s.name} line="Re-scored at week 12" from={`${s.start}`} to={`${s.now}`} />
          ))}
        </Group>
      </Block>

      <Block title="Measured at home" meta="Jul 1 to Oct 6">
        <Group>
          <Compare name="Weight" line={`Goal ${AT_HOME.goal.weight} lb`} from={`${AT_HOME.start.weight} lb`} to={`${AT_HOME.now.weight} lb`} />
          <Compare name="Waist" line="Entered each Monday" from={`${AT_HOME.start.waist} in`} to={`${AT_HOME.now.waist} in`} />
        </Group>
      </Block>

      <Group>
        <NeedsRow icon={<Camera size={16} color={color.primary} />} title="Photo check in" meta="Last taken Oct 5" onPress={() => router.push("/v14/photos" as never)} />
      </Group>
    </View>
  )
}

/** Day one on the left, today on the right, labelled rather than implied. */
function Compare({ name, line, from, to }: { name: string; line: string; from: string; to: string }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${name}, ${line}. ${from} on day one, ${to} today.`}>
      <View style={styles.grow}>
        <Text style={type.title}>{name}</Text>
        <Text style={type.meta}>{line}</Text>
      </View>
      <Text style={type.label}>{from}</Text>
      <Text style={type.meta}>to</Text>
      <Text style={[type.value, styles.now]}>{to}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  page: { gap: space.section },
  band: { flexDirection: "row", gap: space.section, backgroundColor: "#1F2E2A", borderRadius: 12, padding: space.card },
  bandEnd: { marginLeft: "auto", alignItems: "flex-end" },
  bandLabel: { ...type.caption, color: "rgba(255,255,255,0.7)" },
  bandValue: { ...type.title, color: ink.onColor },
  row: { flexDirection: "row", alignItems: "center", gap: space.inline, paddingVertical: space.rowY, paddingHorizontal: space.rowX },
  grow: { flex: 1, minWidth: 0, gap: space.line },
  now: { color: ink.primary },
})
