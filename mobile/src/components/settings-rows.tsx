import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { CaretRight } from "@/components/ph"
import { Card } from "@/components/record-kit"
import { card, color, hairline, ink, space, type } from "@/lib/theme"

/* The rows of the patient's settings pages, Profile and Access, drawn as
   the Figma "Hol" Profile (5 Oct 2026): a round tinted tile, a title with
   a line under it, and a switch, an action or a chevron on the right;
   rows in a card split by hairlines; a label and its value on one line. */

/** Figma's switch: a 36 by 20 track, teal when on and light grey when
    off, with a white knob lifted by the xs shadow. */
export function Switch({ value, onChange, label }: { value: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      hitSlop={10}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      style={[styles.switch, value && styles.switchOn]}
    >
      <View style={[styles.knob, value && styles.knobOn]} />
    </Pressable>
  )
}

/** The round 28 tile on the teal tint, holding a 16 icon. */
export function Tile({ children, tint = color.primaryTint }: { children: React.ReactNode; tint?: string }) {
  return <View style={[styles.tile, { backgroundColor: tint }]}>{children}</View>
}

/** A row in a card: the tile, the title (a line under it when given) and
    whatever sits on the right: a switch, an action, a chevron. */
export function Row({
  icon,
  title,
  meta,
  right,
  onPress,
  gap = space.lead,
  regular,
  accessibilityLabel,
}: {
  icon: React.ReactNode
  title: string
  meta?: string
  right?: React.ReactNode
  onPress?: () => void
  /** Tile to words: 10 beside a two line row, 12 on one line, 8 beside a
      switch. */
  gap?: number
  /** The settings' titles are 14 regular in Grey/09; the rest 14 medium in
      Grey/08. */
  regular?: boolean
  accessibilityLabel?: string
}) {
  const body = (
    <>
      <Tile>{icon}</Tile>
      <View style={styles.rowWords}>
        <Text style={regular ? styles.rowTitleRegular : rowTitle} numberOfLines={1}>
          {title}
        </Text>
        {!!meta && (
          <Text style={styles.rowMeta} numberOfLines={1}>
            {meta}
          </Text>
        )}
      </View>
      {right}
    </>
  )
  if (!onPress) return <View style={[styles.row, { gap }]}>{body}</View>
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} style={({ pressed }) => [styles.row, { gap }, pressed && styles.pressed]}>
      {body}
    </Pressable>
  )
}

export const Chevron = () => <CaretRight size={16} color={card.chevron} />

/** A card's rows, split by a hairline with `space` above and below it. */
export function Rows({ children, space: room = space.card }: { children: React.ReactNode; space?: number }) {
  const rows = React.Children.toArray(children).filter(Boolean)
  return (
    <Card style={{ gap: room }}>
      {rows.map((row, i) => (
        <React.Fragment key={i}>
          {i > 0 && <View style={styles.rule} />}
          {row}
        </React.Fragment>
      ))}
    </Card>
  )
}

/** A label and its value on one line, as the sharing card lists them. */
export function Pair({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.pair}>
      <Text style={styles.pairLabel}>{label}</Text>
      <Text style={styles.pairValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  )
}

/** A label on the left and a switch on the right, as the sharing card
    opens. */
export function SwitchPair({ label, value, onChange, switchLabel }: { label: string; value: boolean; onChange: (on: boolean) => void; switchLabel: string }) {
  return (
    <View style={styles.pair}>
      <Text style={styles.pairLabel}>{label}</Text>
      <Switch value={value} onChange={onChange} label={switchLabel} />
    </View>
  )
}

/** A setting she turns on or off: the tile, the title, the switch. */
export function SwitchRow({ icon, title, value, onChange, regular = true }: { icon: React.ReactNode; title: string; value: boolean; onChange: (on: boolean) => void; regular?: boolean }) {
  return <Row icon={icon} title={title} regular={regular} gap={regular ? space.inline : space.lead} right={<Switch value={value} onChange={onChange} label={title} />} />
}

/** A row title's ink, for a title drawn outside a Row (Log out). */
export const rowTitle = { ...type.title, color: ink.detail }

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },

  rule: { height: 0.8, backgroundColor: hairline.rule },

  row: { flexDirection: "row", alignItems: "center" },
  tile: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  rowWords: { flex: 1, gap: space.stack },
  rowTitleRegular: { ...type.body, color: ink.content },
  rowMeta: { ...type.label },

  pair: { flexDirection: "row", alignItems: "center", gap: space.inline, minHeight: type.body.lineHeight },
  pairLabel: { flex: 1, ...type.body },
  pairValue: { flexShrink: 1, ...type.title, color: ink.detail, textAlign: "right" },

  switch: { width: 36, height: 20, borderRadius: 10, backgroundColor: "#EBEBEB", padding: 2 },
  switchOn: { backgroundColor: color.primary },
  knob: { width: 16, height: 16, borderRadius: 8, backgroundColor: color.background, boxShadow: "0 1px 3px rgba(16, 24, 40, 0.1), 0 1px 2px rgba(16, 24, 40, 0.06)" },
  knobOn: { transform: [{ translateX: 16 }] },
})
