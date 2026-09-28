import * as React from "react"
import { Linking, StyleSheet, Text, View } from "react-native"

import { Section } from "@/components/flow"
import { IconPhone } from "@/components/icons"
import { RecordIcon } from "@/components/record-icons"
import { TabScreen } from "@/components/tab-bar"
import { Button } from "@/components/ui"
import { CARE_TEAM, PATIENT } from "@/lib/patient"
import { SOURCES } from "@/lib/record"
import { color, font } from "@/lib/theme"

/* Care team: the practice and its people, and the providers the patient's
   record comes from. */

export default function CareTeamScreen() {
  return (
    <TabScreen tab="care-team" title="Care team">
      <Section title={PATIENT.practice}>
        <View style={styles.list}>
          {CARE_TEAM.map((m, i) => (
            <View key={m.name} style={[styles.row, i < CARE_TEAM.length - 1 && styles.rule]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {m.name
                    .replace("Dr. ", "")
                    .split(" ")
                    .map((w) => w[0])
                    .join("")}
                </Text>
              </View>
              <View style={styles.body}>
                <Text style={styles.name}>{m.name}</Text>
                <Text style={styles.meta}>{m.role}</Text>
              </View>
            </View>
          ))}
        </View>
        <Button variant="outline" icon={IconPhone} onPress={() => Linking.openURL(`tel:${PATIENT.practicePhone}`)}>
          {`Call ${PATIENT.practicePhone}`}
        </Button>
      </Section>

      <Section title="Where your records come from">
        <View style={styles.list}>
          {SOURCES.map((s, i) => (
            <View key={s.name} style={[styles.row, i < SOURCES.length - 1 && styles.rule]}>
              <View style={styles.tile}>
                <RecordIcon name={s.kind} size={18} color={color.primary} />
              </View>
              <View style={styles.body}>
                <Text style={styles.name}>{s.name}</Text>
                <Text style={styles.meta}>{s.label}</Text>
              </View>
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
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: font.semibold, fontSize: 14, color: color.primary },
  tile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: color.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: 2 },
  name: { fontFamily: font.medium, fontSize: 15, color: color.text },
  meta: { fontFamily: font.regular, fontSize: 13, color: color.muted },
})
