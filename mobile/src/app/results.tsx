import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { Badge, Section } from "@/components/flow"
import { RecordIcon } from "@/components/record-icons"
import { TabScreen } from "@/components/tab-bar"
import { DATA_TYPES, FINDINGS } from "@/lib/record"
import { color, font } from "@/lib/theme"

/* Results: the flagged results first, then everything the record holds,
   by kind, with its count. */

export default function ResultsScreen() {
  return (
    <TabScreen tab="results" title="Results">
      <Section title="Needs attention" action={<Badge tone="high">{`${FINDINGS.length} results`}</Badge>}>
        <View style={styles.list}>
          {FINDINGS.map((f, i) => (
            <View key={f.id} style={[styles.finding, i < FINDINGS.length - 1 && styles.rule]}>
              <View style={[styles.flag, { backgroundColor: f.flag === "high" ? color.high : color.low }]} />
              <View style={styles.body}>
                <Text style={styles.name}>{f.name}</Text>
                <Text style={styles.meta}>
                  Target {f.range}, {f.source}, {f.date}
                </Text>
              </View>
              <View style={styles.right}>
                <Text style={styles.value}>{f.value}</Text>
                <Badge tone={f.flag}>{f.flag === "high" ? "High" : "Low"}</Badge>
              </View>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Your record">
        <View style={styles.list}>
          {DATA_TYPES.map((t, i) => (
            <View key={t.key} style={[styles.row, i < DATA_TYPES.length - 1 && styles.rule]}>
              <View style={styles.tile}>
                <RecordIcon name={t.icon} size={18} color={color.primary} />
              </View>
              <Text style={styles.rowLabel}>{t.label}</Text>
              <Text style={styles.count}>{t.count}</Text>
            </View>
          ))}
        </View>
      </Section>
    </TabScreen>
  )
}

const styles = StyleSheet.create({
  list: { borderWidth: 1, borderColor: color.border, borderRadius: 18, paddingHorizontal: 14 },
  rule: { borderBottomWidth: 1, borderBottomColor: color.border },
  finding: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  flag: { width: 4, alignSelf: "stretch", borderRadius: 2 },
  body: { flex: 1, gap: 2 },
  name: { fontFamily: font.medium, fontSize: 15, color: color.text },
  meta: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: color.muted },
  right: { alignItems: "flex-end", gap: 4 },
  value: { fontFamily: font.semibold, fontSize: 15, color: color.text },

  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  tile: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: color.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { flex: 1, fontFamily: font.medium, fontSize: 15, color: color.text },
  count: { fontFamily: font.semibold, fontSize: 17, color: color.text },
})
