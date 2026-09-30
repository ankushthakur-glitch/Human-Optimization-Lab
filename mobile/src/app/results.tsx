import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { Sparkline } from "@/components/charts"
import { Badge, Section } from "@/components/flow"
import { Count, IconTile, List, ListRow } from "@/components/list"
import { RecordIcon, type RecordIconName } from "@/components/record-icons"
import { TabScreen } from "@/components/tab-bar"
import { useOnboarding } from "@/lib/onboarding"
import {
  ALLERGIES,
  BIOMARKERS,
  DATA_TYPES,
  DIRECTION_LABEL,
  DOCUMENTS,
  IMMUNIZATIONS,
  MEDICATIONS,
  ORDERS,
  PROBLEMS,
  PROCEDURES,
  SOURCES,
  VISITS,
  direction,
  inRange,
  medDifference,
} from "@/lib/record"
import { color, font } from "@/lib/theme"

/* Results: the patient's longitudinal record. Every biomarker with its
   direction over time, then each part of the record (conditions, medicines,
   allergies, visits, tests ordered and whether they were done, documents),
   with any difference between two lists called out, and ways to add what
   never reaches the doctor: a photographed report, or something the patient
   tells us. */

export type RecordKind = "conditions" | "allergies" | "visits" | "procedures" | "orders" | "documents" | "immunizations"

const count = (key: string) => DATA_TYPES.find((t) => t.key === key)?.count

export default function ResultsScreen() {
  const { added = [], meds = {} } = useOnboarding()
  const toConfirm = MEDICATIONS.filter((m) => !m.resolved && !meds[m.id]).length
  const notDone = ORDERS.filter((o) => o.state !== "done" && o.state !== "planned").length

  const parts: { kind: RecordKind | "medications"; icon: RecordIconName; label: string; n?: number; note?: string }[] = [
    { kind: "conditions", icon: "conditions", label: "Conditions", n: PROBLEMS.length, note: "1 difference" },
    { kind: "medications", icon: "medications", label: "Medicines", n: MEDICATIONS.length, note: toConfirm ? `${toConfirm} to confirm` : undefined },
    { kind: "allergies", icon: "allergies", label: "Allergies", n: ALLERGIES.length, note: "1 difference" },
    { kind: "visits", icon: "visits", label: "Visits", n: count("Encounter") ?? VISITS.length },
    { kind: "procedures", icon: "procedures", label: "Procedures", n: PROCEDURES.length },
    { kind: "orders", icon: "labs", label: "Tests ordered", n: ORDERS.length, note: notDone ? `${notDone} not done yet` : undefined },
    { kind: "immunizations", icon: "immunizations", label: "Immunizations", n: count("Immunization") ?? IMMUNIZATIONS.length },
    { kind: "documents", icon: "documents", label: "Documents", n: (count("DocumentReference") ?? DOCUMENTS.length) + added.filter((a) => a.id.startsWith("report")).length },
  ]

  return (
    <TabScreen tab="results" title="Record">
      <Section title="Biomarkers" action={<Badge tone="high">{`${BIOMARKERS.filter((b) => !inRange(b, b.points.at(-1)!.value)).length} out of range`}</Badge>}>
        <List>
          {BIOMARKERS.map((b) => {
            const last = b.points.at(-1)!
            const out = !inRange(b, last.value)
            const dir = direction(b)
            return (
              <ListRow
                key={b.id}
                title={b.name}
                meta={DIRECTION_LABEL[dir]}
                right={
                  <View style={styles.marker}>
                    <Sparkline marker={b} />
                    <View style={styles.value}>
                      <Text style={[styles.valueText, out && { color: color.high }]}>{last.shown ?? last.value}</Text>
                      <Text style={styles.unit}>{b.unit}</Text>
                    </View>
                  </View>
                }
                onPress={() => router.push({ pathname: "/biomarker/[id]", params: { id: b.id } })}
              />
            )
          })}
        </List>
      </Section>

      <Section title="Your record">
        <List>
          {parts.map((p) => (
            <ListRow
              key={p.kind}
              icon={
                <IconTile>
                  <RecordIcon name={p.icon} size={18} color={color.primary} />
                </IconTile>
              }
              title={p.label}
              note={p.note ? { text: p.note } : undefined}
              right={p.n !== undefined ? <Count>{p.n}</Count> : undefined}
              onPress={() =>
                p.kind === "medications"
                  ? router.push("/medications")
                  : router.push({ pathname: "/record/[kind]", params: { kind: p.kind } })
              }
            />
          ))}
        </List>
      </Section>

      <Section title="Add to your record">
        <List>
          <ListRow
            icon={
              <IconTile tone="muted">
                <RecordIcon name="documents" size={18} color={color.text} />
              </IconTile>
            }
            title="Add a report"
            meta="A scan or test from a private clinic"
            onPress={() => router.push("/add-report")}
          />
          <ListRow
            icon={
              <IconTile tone="muted">
                <RecordIcon name="visits" size={18} color={color.text} />
              </IconTile>
            }
            title="Tell us something"
            meta="A medicine, a visit or a test elsewhere"
            onPress={() => router.push("/tell-us")}
          />
        </List>
        {added.length > 0 && (
          <List>
            {added.map((a) => (
              <ListRow
                key={a.id}
                title={a.title}
                meta={`${a.detail}, ${a.at}`}
                right={a.unclear ? <Badge tone="low">Being checked</Badge> : <Badge tone="ok">Added</Badge>}
              />
            ))}
          </List>
        )}
      </Section>

      <Section title="Where it comes from">
        <List>
          {SOURCES.map((s) => (
            <ListRow
              key={s.name}
              icon={
                <IconTile>
                  <RecordIcon name={s.kind} size={18} color={color.primary} />
                </IconTile>
              }
              title={s.name}
              meta={`${s.label}, ${s.system}`}
            />
          ))}
        </List>
      </Section>
    </TabScreen>
  )
}

const styles = StyleSheet.create({
  marker: { flexDirection: "row", alignItems: "center", gap: 10 },
  value: { alignItems: "flex-end", minWidth: 56 },
  valueText: { fontFamily: font.semibold, fontSize: 15, color: color.text },
  unit: { fontFamily: font.regular, fontSize: 11, color: color.muted },
})
