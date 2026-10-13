import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { CalendarCheck, Clock, Drop, X } from "@/components/ph"
import { DateBlock, Tag, spokenDate, type Tone } from "@/components/record-kit"
import { chart, color, font, hairline, ink, space, type } from "@/lib/theme"

/* The appointment card (design reference, 13 Oct 2026): one booked test or
   visit as a card of its own. A date block, the title with its tag, the time
   and place on one line, what to do before in a tinted callout, and the
   facts again as labelled details. Every part after the title is optional,
   so the same card serves a lab, a visit, and a sheet with a close button. */

export type AppointmentDetail = {
  icon: React.ReactNode
  label: string
  value: string
}

export type AppointmentCardProps = {
  /** The local day, "2026-10-14" or "2026-10-14T07:30", or a Date. */
  date: Date | string
  title: string
  /** An exception beside the title ("Booked"); teal draws with a calendar mark. */
  tag?: { tone: Tone; label: string }
  /** "7:30 AM" */
  time?: string
  /** "Quest Diagnostics, Del Mar" */
  where?: string
  /** What to do before, in the teal callout: "Nothing to eat after 9:30 PM the night before." */
  prep?: string
  /** The callout's mark; a water drop, for the fasting note, when not given. */
  prepIcon?: React.ReactNode
  /** Labelled facts under the callout, two across: Test type, Location. */
  details?: AppointmentDetail[]
  /** Draws a close button at the top right, for the card on a sheet. */
  onClose?: () => void
  /** The whole card opens its item. */
  onPress?: () => void
  accessibilityLabel?: string
}

const CARD_RADIUS = 16
const TILE = 36

/** The word and mark of a tag: teal gets the calendar mark from the design,
    any other tone keeps the kit's plain badge. */
function BookedTag({ tone, label }: { tone: Tone; label: string }) {
  if (tone !== "primary") return <Tag tone={tone}>{label}</Tag>
  return (
    <View style={styles.tag}>
      <CalendarCheck size={14} color={color.primary} />
      <Text style={styles.tagText}>{label}</Text>
    </View>
  )
}

export function AppointmentCard({ date, title, tag, time, where, prep, prepIcon, details, onClose, onPress, accessibilityLabel }: AppointmentCardProps) {
  const label =
    accessibilityLabel ??
    [title, tag?.label, spokenDate(date), time, where, prep, ...(details ?? []).map((d) => `${d.label}: ${d.value}`)].filter(Boolean).join(", ")

  const body = (
    <>
      <View style={styles.head}>
        <DateBlock date={date} size="lg" />
        <View style={[styles.headBody, onClose && styles.headBodyClose]}>
          <View style={styles.titleLine}>
            <Text style={styles.title}>{title}</Text>
            {tag && <BookedTag tone={tag.tone} label={tag.label} />}
          </View>
          {!!(time || where) && (
            <View style={styles.metaLine}>
              {!!time && (
                <View style={styles.metaItem}>
                  <Clock size={16} color={ink.secondary} />
                  <Text style={styles.meta}>{time}</Text>
                </View>
              )}
              {!!time && !!where && <View style={styles.metaRule} />}
              {!!where && <Text style={[styles.meta, styles.metaWhere]}>{where}</Text>}
            </View>
          )}
        </View>
      </View>

      {!!prep && (
        <View style={styles.prep}>
          <View style={styles.prepIcon}>{prepIcon ?? <Drop size={18} color={color.primary} />}</View>
          <View style={styles.prepRule} />
          <Text style={styles.prepText}>{prep}</Text>
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

      {onClose && (
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8} style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
          <X size={18} color={ink.tertiary} />
        </Pressable>
      )}
    </>
  )

  if (!onPress)
    return (
      <View style={styles.card} accessible={!onClose} accessibilityLabel={onClose ? undefined : label}>
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
  // Solid white at radius 16, 16 inside, the kit's softest lift.
  card: {
    backgroundColor: color.background,
    borderRadius: CARD_RADIUS,
    padding: space.gutter,
    gap: space.gutter,
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
  },
  pressed: { opacity: 0.8 },

  head: { flexDirection: "row", alignItems: "flex-start", gap: space.lead },
  headBody: { flex: 1, minWidth: 0, gap: space.inline },
  // Room for the close button beside the title.
  headBodyClose: { paddingRight: 28 },
  titleLine: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: space.inline, rowGap: space.stack },
  title: { ...type.section, flexShrink: 1 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.stack,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: color.primaryEdge,
    backgroundColor: color.primarySoft,
    paddingHorizontal: space.inline,
    paddingVertical: space.stack,
  },
  tagText: { ...type.metaStrong, color: ink.primary },

  metaLine: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: space.item, rowGap: space.stack },
  metaItem: { flexDirection: "row", alignItems: "center", gap: space.inline },
  meta: { ...type.body, color: ink.secondary, fontVariant: ["tabular-nums"] },
  metaWhere: { flexShrink: 1 },
  metaRule: { width: 1, height: 16, backgroundColor: hairline.outline },

  // The callout: teal tint, a round mark, a rule, then the words in teal.
  prep: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lead,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: color.primarySoft,
    backgroundColor: color.primaryTint,
    padding: space.card,
  },
  prepIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.primarySoft, alignItems: "center", justifyContent: "center" },
  prepRule: { width: 1, alignSelf: "stretch", backgroundColor: color.primaryEdge },
  prepText: { ...type.title, fontFamily: font.regular, color: ink.primary, flex: 1, lineHeight: 21 },

  details: { flexDirection: "row", alignItems: "center", gap: space.lead },
  detail: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: space.lead },
  detailRule: { width: 1, alignSelf: "stretch", backgroundColor: hairline.outline },
  detailTile: { width: TILE, height: TILE, borderRadius: 10, backgroundColor: chart.track, alignItems: "center", justifyContent: "center" },
  detailBody: { flex: 1, minWidth: 0, gap: space.line },
  detailLabel: { ...type.meta },
  detailValue: { ...type.title, color: ink.strong },

  close: { position: "absolute", top: space.gutter, right: space.gutter, width: 24, height: 24, alignItems: "center", justifyContent: "center" },
})
