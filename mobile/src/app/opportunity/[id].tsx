import { useLocalSearchParams } from "expo-router"
import type { ReactNode } from "react"
import { StyleSheet, Text, View } from "react-native"

import { UpgradePage } from "@/components/upgrade-kit"
import { DETAIL, OPPS, oppById, type NeedStatus, type SignalKind } from "@/lib/upgrade"
import { color, font, hairline, ink, space, type } from "@/lib/theme"

/* One opportunity's page (client deck, screen 22): why it came up, as the
   signals that produced it, and what it would take to confirm it, each line
   marked new, outdated or on file. Opens from a row on /opportunities. */

const SIGNAL: Record<SignalKind, { label: string; fill: string; ink: string }> = {
  record: { label: "Record", fill: color.surface, ink: ink.secondary },
  note: { label: "Note", fill: color.amberTint, ink: color.amber },
  said: { label: "You said", fill: color.primarySoft, ink: ink.primary },
}

const NEED: Record<NeedStatus, { label: string; fill: string; ink: string }> = {
  new: { label: "New", fill: color.primarySoft, ink: ink.primary },
  outdated: { label: "Outdated", fill: color.amberTint, ink: color.amber },
  onfile: { label: "On file", fill: color.surface, ink: ink.secondary },
}

/** "Your **AHI 5.3**": the starred words in bold. */
function Rich({ text }: { text: string }) {
  return (
    <Text style={styles.signalText}>
      {text.split("**").map((part, i) =>
        i % 2 ? (
          <Text key={i} style={styles.bold}>
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  )
}

function Chip({ label, fill, ink: tone }: { label: string; fill: string; ink: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: fill }]}>
      <Text style={[styles.chipText, { color: tone }]}>{label}</Text>
    </View>
  )
}

/** A section: the title and a count pill on one line, its rows in a white
    group below. */
function Section({ title, count, children }: { title: string; count: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <View style={styles.sectionBar}>
        <Text style={styles.section} accessibilityRole="header">
          {title}
        </Text>
        <View style={styles.count}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  )
}

export default function OpportunityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const opp = oppById(id)
  if (!opp) return null
  const { signals, needs } = DETAIL[opp.id]
  const toOrder = needs.filter((n) => n.status !== "onfile").length

  return (
    <UpgradePage back="/opportunities" noFoot>
      <View style={styles.head}>
        <View style={styles.titleLine}>
          <Text style={styles.title} accessibilityRole="header">
            {opp.name}
          </Text>
          <Chip label={`${opp.n} of ${OPPS.length}`} fill={color.surface} ink={ink.secondary} />
        </View>
      </View>

      <Section title="How we found it" count={String(signals.length)}>
        {signals.map((s, i) => (
          <View key={i} style={[styles.row, i > 0 && styles.divider]}>
            <View style={styles.lineRow}>
              <Chip label={SIGNAL[s.kind].label} fill={SIGNAL[s.kind].fill} ink={SIGNAL[s.kind].ink} />
              <Rich text={s.text} />
            </View>
          </View>
        ))}
      </Section>

      <Section title="What we need to confirm it" count={toOrder ? `${toOrder} to order` : "none to order"}>
        {needs.map((n, i) => {
          const t = NEED[n.status]
          return (
            <View key={i} style={[styles.row, i > 0 && styles.divider]}>
              <View style={styles.needLine}>
                <View style={styles.needWords}>
                  <Text style={styles.needName}>{n.name}</Text>
                  <Text style={styles.needSays}>{n.says}</Text>
                </View>
                <Chip label={t.label} fill={t.fill} ink={t.ink} />
              </View>
            </View>
          )
        })}
      </Section>

    </UpgradePage>
  )
}

const styles = StyleSheet.create({
  head: { gap: space.inline, paddingBottom: space.inline },
  titleLine: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: space.lead },
  title: { fontFamily: font.semibold, fontSize: 18, lineHeight: 24, letterSpacing: -0.2, color: ink.strong },
  sectionBar: { flexDirection: "row", alignItems: "center", gap: space.inline, paddingVertical: 14, paddingHorizontal: space.rowX },
  section: { ...type.title, fontFamily: font.semibold, color: ink.strong },
  count: { paddingHorizontal: 8, paddingVertical: 1, borderRadius: 999, backgroundColor: color.primarySoft },
  countText: { ...type.metaStrong, color: ink.primary },
  body: { borderTopWidth: 1, borderTopColor: hairline.rule },
  needLine: { flexDirection: "row", alignItems: "center", gap: space.lead },
  group: { overflow: "hidden", borderRadius: 10, borderWidth: 1, borderColor: hairline.edge, backgroundColor: color.background },
  row: { paddingVertical: space.rowY, paddingHorizontal: space.rowX },
  divider: { borderTopWidth: 1, borderTopColor: hairline.rule },
  lineRow: { flexDirection: "row", alignItems: "flex-start", gap: space.lead },
  chip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 1 },
  chipText: { fontFamily: font.semibold, fontSize: 10, lineHeight: 14, letterSpacing: 0.4 },
  signalText: { ...type.body, flex: 1, color: ink.content },
  bold: { fontFamily: font.semibold, color: ink.strong },
  needWords: { flex: 1, gap: 1 },
  needName: { ...type.title, fontFamily: font.semibold, color: ink.strong },
  needSays: { ...type.label, color: ink.secondary },
})
