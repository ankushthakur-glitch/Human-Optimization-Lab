import * as React from "react"
import { StyleSheet, Text, TextInput, View } from "react-native"

import { Check, Info, MagnifyingGlass, User, WarningCircle, X } from "@/components/ph"
import { Card } from "@/components/record-kit"
import { Pressable } from "react-native"
import { money, type Item } from "@/lib/catalog"
import { card, cardRadius, color, font, hairline, ink, space, type } from "@/lib/theme"

/* The Care tab's pieces (client deck screens 52 to 54), built from the
   signed-in kit's tokens:

   Rich         a sentence with **bold** words to weigh
   PriceCard    the teal tinted card: the member price, the standard price struck
                through, and when it arrives
   DoesList     "What it does": teal checks
   LimitsList   "What it cannot tell you": clay marks, given the same weight
   OrderNote    who writes and holds the order, and what Inlay does
   SearchField  "Search 118 tests, scans and programmes" */

/** A sentence with `**bold**` words, in the weight of a title. */
export function Rich({ children, style }: { children: string; style?: object }) {
  const parts = children.split("**")
  return (
    <Text style={[type.body, style]}>
      {parts.map((p, i) => (i % 2 ? (
        <Text key={i} style={styles.strong}>
          {p}
        </Text>
      ) : (
        p
      )))}
    </Text>
  )
}

/** The teal tinted card under an item's name: the price a member pays, the
    standard price struck through, and, on its own line below, when the
    result or the order arrives. */
export function PriceCard({ item }: { item: Item }) {
  return (
    <View style={styles.price} accessible accessibilityLabel={priceWords(item)}>
      <View style={styles.priceTop}>
        <View style={styles.priceLeft}>
          <Text style={styles.priceNow}>{money(item.member)}</Text>
          {!!item.standard && <Text style={styles.priceWas}>{money(item.standard)}</Text>}
        </View>
      </View>
      <Text style={styles.priceNote}>{item.priceNote}</Text>
      <View style={styles.priceRight}>
        <Text style={styles.priceLabel}>{item.when.label.toUpperCase()}</Text>
        <Text style={styles.priceWhen}>{item.when.value}</Text>
      </View>
    </View>
  )
}

const priceWords = (item: Item) =>
  `${money(item.member)} member price${item.standard ? `, instead of ${money(item.standard)}` : ""}. ${item.priceNote}. ${item.when.label} ${item.when.value}`

/** What the item does, one teal check to a line. */
export function DoesList({ lines }: { lines: readonly string[] }) {
  return (
    <Card style={styles.list}>
      {lines.map((l) => (
        <View key={l} style={styles.line}>
          <View style={styles.checkMark}>
            <Check size={12} color={color.primary} weight="bold" />
          </View>
          <Rich style={styles.lineText}>{l}</Rich>
        </View>
      ))}
    </Card>
  )
}

/** What it cannot tell you, set the same size and weight as what it does:
    a clay ring with an exclamation, never red words. */
export function LimitsList({ lines }: { lines: readonly string[] }) {
  return (
    <Card style={styles.list}>
      {lines.map((l) => (
        <View key={l} style={styles.line}>
          <View style={styles.limitMark}>
            <WarningCircle size={16} color={CLAY} />
          </View>
          <Rich style={styles.lineText}>{l}</Rich>
        </View>
      ))}
    </Card>
  )
}

/** The order stated once, at the foot, not buried in terms: the physician
    writes and holds it; Inlay connects, schedules and carries the result
    back; no practising medicine, no insurance billing. */
export function OrderNote({ doctor, inlay }: { doctor: string; inlay: string }) {
  return (
    <View style={styles.order} accessible>
      <User size={16} color={ink.secondary} />
      <Rich style={styles.orderText}>{`**${doctor} writes and holds the order.** Inlay ${inlay}. We do not practise medicine and we do not bill insurance.`}</Rich>
    </View>
  )
}

/** A quiet line with an info mark, for a footnote. */
export function FootNote({ children }: { children: string }) {
  return (
    <View style={styles.foot}>
      <Info size={14} color={ink.tertiary} />
      <Text style={styles.footText}>{children}</Text>
    </View>
  )
}

/** The catalog's search: a filled field with a magnifier, and a clear
    button once there are words in it. */
export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (t: string) => void; placeholder: string }) {
  return (
    <View style={styles.search}>
      <MagnifyingGlass size={16} color={ink.secondary} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={color.placeholder}
        style={styles.searchInput}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel={placeholder}
      />
      {!!value && (
        <Pressable onPress={() => onChange("")} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
          <X size={14} color={ink.secondary} />
        </Pressable>
      )}
    </View>
  )
}

/** The clay the kit uses for a limit or a late mark, never red. */
const CLAY = "#A95413"
const styles = StyleSheet.create({
  strong: { fontFamily: font.semibold, color: ink.strong },

  price: { backgroundColor: color.primarySoft, borderRadius: cardRadius, borderWidth: 1, borderColor: color.primaryEdge, padding: space.card, gap: space.stack, boxShadow: card.shadow },
  priceTop: { flexDirection: "row", alignItems: "flex-end", gap: space.item },
  priceLeft: { flexDirection: "row", alignItems: "baseline", gap: space.inline },
  priceNow: { fontFamily: font.semibold, fontSize: 24, lineHeight: 30, color: ink.strong },
  priceWas: { ...type.unitLarge, color: ink.tertiary, textDecorationLine: "line-through" },
  priceRight: { gap: space.mark },
  priceLabel: type.caption,
  priceWhen: { ...type.value, color: ink.primary },
  priceNote: type.label,

  list: { gap: space.item, padding: space.card },
  line: { flexDirection: "row", gap: space.lead, alignItems: "flex-start" },
  lineText: { flex: 1, fontSize: 13, lineHeight: 19 },
  checkMark: { width: 18, height: 18, borderRadius: 9, backgroundColor: color.primarySoft, alignItems: "center", justifyContent: "center", marginTop: 1 },
  limitMark: { width: 18, height: 18, alignItems: "center", justifyContent: "center", marginTop: 1 },

  order: { flexDirection: "row", gap: space.lead, alignItems: "flex-start", padding: space.card, borderRadius: 8, borderWidth: 1, borderColor: hairline.edge, backgroundColor: color.primaryTint },
  orderText: { flex: 1, fontSize: 12, lineHeight: 18 },

  foot: { flexDirection: "row", gap: space.inline, alignItems: "flex-start", paddingHorizontal: 2 },
  footText: { ...type.label, flex: 1, color: ink.tertiary },

  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inline,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: hairline.edge,
    backgroundColor: color.inputFill,
  },
  searchInput: { flex: 1, height: 44, fontFamily: font.regular, fontSize: 14, color: color.text, outlineStyle: "none" } as object,
})
