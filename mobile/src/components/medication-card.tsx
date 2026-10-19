import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { Info, Pill } from "@/components/ph"
import { Tag, type Tone } from "@/components/record-kit"
import { chart, color, font, hairline, ink, space, type } from "@/lib/theme"

/* The medication card: the appointment card's twin for a medicine, so the two
   onboarding screens read as one family. A pill mark where the appointment has
   its date block, the name with its tag, the dose on one line, a tinted
   callout for what to check, and the facts again as labelled details. Every
   part after the name is optional. */

export type MedicationDetail = {
  icon: React.ReactNode
  label: string
  value: string
}

export type MedicationCardProps = {
  name: string
  /** An exception beside the name ("New", "Doses differ"). */
  tag?: { tone: Tone; label: string }
  /** "20 mg once a day" */
  dose?: string
  /** "Your doctor, Aug 12, 2026" */
  source?: string
  /** What to check, in the teal callout. */
  note?: string
  /** The callout's mark; an info circle when not given. */
  noteIcon?: React.ReactNode
  /** Labelled facts under the callout, two across: Listed by, Last updated. */
  details?: MedicationDetail[]
  /** The whole card opens its item. */
  onPress?: () => void
  accessibilityLabel?: string
}

const CARD_RADIUS = 16
const TILE = 36

export function MedicationCard({ name, tag, dose, source, note, noteIcon, details, onPress, accessibilityLabel }: MedicationCardProps) {
  const label =
    accessibilityLabel ?? [name, tag?.label, dose, source, note, ...(details ?? []).map((d) => `${d.label}: ${d.value}`)].filter(Boolean).join(", ")

  const body = (
    <>
      <View style={styles.head}>
        <View style={styles.mark}>
          <Pill size={24} color={color.primary} />
        </View>
        <View style={styles.headBody}>
          <View style={styles.titleLine}>
            <Text style={styles.title}>{name}</Text>
            {tag && <Tag tone={tag.tone}>{tag.label}</Tag>}
          </View>
          {!!(dose || source) && (
            <View style={styles.metaLine}>
              {!!dose && <Text style={styles.meta}>{dose}</Text>}
              {!!dose && !!source && <View style={styles.metaRule} />}
              {!!source && <Text style={[styles.meta, styles.metaSource]}>{source}</Text>}
            </View>
          )}
        </View>
      </View>

      {!!note && (
        <View style={styles.note}>
          <View style={styles.noteIcon}>{noteIcon ?? <Info size={18} color={color.primary} />}</View>
          <View style={styles.noteRule} />
          <Text style={styles.noteText}>{note}</Text>
        </View>
      )}

      {!!details?.length && (
        <View style={styles.details}>
          {details.map((d, i) => (
            <React.Fragment key={d.label}>
              {i > 0 && <View style={styles.detailRule} />}
              <View style={styles.detail}>
                <View style={styles.detailTile}>{d.icon}</View>
                <View style={styles.detailBody}>
                  <Text style={styles.detailLabel}>{d.label}</Text>
                  <Text style={styles.detailValue}>{d.value}</Text>
                </View>
              </View>
            </React.Fragment>
          ))}
        </View>
      )}
    </>
  )

  if (!onPress)
    return (
      <View style={styles.card} accessible accessibilityLabel={label}>
        {body}
      </View>
    )
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {body}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  // The appointment card's own card: solid white, radius 16, the softest lift.
  card: {
    backgroundColor: color.background,
    borderRadius: CARD_RADIUS,
    padding: space.gutter,
    gap: space.gutter,
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
  },
  pressed: { opacity: 0.8 },

  head: { flexDirection: "row", alignItems: "flex-start", gap: space.lead },
  // The size of the appointment card's large date block.
  mark: { width: 44, height: 52, borderRadius: 10, backgroundColor: color.primaryTint, alignItems: "center", justifyContent: "center" },
  headBody: { flex: 1, minWidth: 0, gap: space.inline },
  titleLine: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: space.inline, rowGap: space.stack },
  title: { ...type.section, flexShrink: 1 },

  metaLine: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: space.item, rowGap: space.stack },
  meta: { ...type.body, color: ink.secondary },
  metaSource: { flexShrink: 1 },
  metaRule: { width: 1, height: 16, backgroundColor: hairline.outline },

  note: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lead,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: color.primarySoft,
    backgroundColor: color.primaryTint,
    padding: space.card,
  },
  noteIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.primarySoft, alignItems: "center", justifyContent: "center" },
  noteRule: { width: 1, alignSelf: "stretch", backgroundColor: color.primaryEdge },
  noteText: { ...type.title, fontFamily: font.regular, color: ink.primary, flex: 1, lineHeight: 21 },

  details: { flexDirection: "row", alignItems: "center", gap: space.lead },
  detail: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: space.lead },
  detailRule: { width: 1, alignSelf: "stretch", backgroundColor: hairline.outline },
  detailTile: { width: TILE, height: TILE, borderRadius: 10, backgroundColor: chart.track, alignItems: "center", justifyContent: "center" },
  detailBody: { flex: 1, minWidth: 0, gap: space.line },
  detailLabel: { ...type.meta },
  detailValue: { ...type.title, color: ink.strong },
})
