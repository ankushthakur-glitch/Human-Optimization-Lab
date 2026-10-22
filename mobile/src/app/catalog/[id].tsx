import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { DoesList, LimitsList, OrderNote, PriceCard } from "@/components/catalog-parts"
import { PageNotFoundState } from "@/components/error-state"
import { FlowScreen } from "@/components/flow"
import { PrimaryButton } from "@/components/hol"
import { CaretLeft } from "@/components/ph"
import { Block, Tag } from "@/components/record-kit"
import { toast } from "@/components/toast"
import { categoryOf, item as findItem, money } from "@/lib/catalog"
import { CARE_TEAM } from "@/lib/patient"
import { color, font, ink, space, type } from "@/lib/theme"

/* One catalog item (client deck, screen 53, "A Catalog Item": "What it does,
   and what it cannot"): every catalog row opens into this. The name and
   what it is, the price card (a member's price against the standard
   price, and when it arrives), what the item actually does, what it cannot
   tell you with the same weight, who writes the order, and one button that
   orders and pays. Order and pay sits on the page itself, so the catalog
   is a storefront rather than a brochure that ends in a phone call.

   A test or scan goes on to a time (screen 54); a device, a programme or
   supplies are ordered there and then. */

/** "Dr. Maya Patel" as "Dr. Patel". */
const DOCTOR = (() => {
  const name = CARE_TEAM.find((p) => p.role === "Physician")?.name ?? "Your physician"
  const parts = name.split(/\s+/)
  return parts[0] === "Dr." && parts.length > 2 ? `Dr. ${parts[parts.length - 1]}` : name
})()

export default function CatalogItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const it = id ? findItem(id) : undefined
  if (!it) return <PageNotFoundState />
  const category = categoryOf(it)

  const order = () => {
    if (it.fulfil === "visit") return router.push({ pathname: "/catalog/book/[id]", params: { id: it.id } })
    // Nothing to book: the order goes to the physician and the patient is
    // told what happens next.
    toast(`Ordered. ${DOCTOR} signs the order and we'll message you next.`)
    router.dismissTo("/care")
  }

  return (
    <FlowScreen
      page
      title={category?.title ?? "Catalog"}
      footer={
        <View style={styles.foot}>
          <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back to the catalog" style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <CaretLeft size={14} color={ink.secondary} />
            <Text style={styles.backText}>Catalog</Text>
          </Pressable>
          <View style={styles.order}>
            <PrimaryButton onPress={order}>{`Order and pay · ${money(it.member)}`}</PrimaryButton>
          </View>
        </View>
      }
    >
      <View style={styles.head}>
        <View style={styles.nameLine}>
          <Text style={styles.name} accessibilityRole="header">
            {it.name}
          </Text>
          <Tag tone="low">{it.tag}</Tag>
        </View>
        <Text style={styles.intro}>{it.intro}</Text>
      </View>

      <PriceCard item={it} />

      <Block title="What it does" meta="plainly">
        <DoesList lines={it.does} />
      </Block>

      <Block title="What it cannot tell you" meta="the limits">
        <LimitsList lines={it.cannot} />
      </Block>

      <OrderNote doctor={DOCTOR} inlay={it.inlay} />
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  head: { gap: space.inline },
  // The name first, its badge after it; the badge wraps under a long name.
  nameLine: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.inline },
  name: { ...type.hero, flexShrink: 1 },
  intro: { ...type.body },
  foot: { flexDirection: "row", alignItems: "center", gap: space.item },
  back: { flexDirection: "row", alignItems: "center", gap: space.stack, paddingRight: 4 },
  backText: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: ink.secondary },
  order: { flex: 1 },
  pressed: { opacity: 0.6 },
})
