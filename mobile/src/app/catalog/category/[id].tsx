import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { PageNotFoundState } from "@/components/error-state"
import { CheckMark, FlowScreen } from "@/components/flow"
import { PrimaryButton } from "@/components/hol"
import { CaretRight } from "@/components/ph"
import { Block, Group } from "@/components/record-kit"
import { CATEGORIES, itemsIn, money, type Item } from "@/lib/catalog"
import { ink, space, type } from "@/lib/theme"

/* A category with more than one item (Laboratory): every panel in it,
   priced. The patient ticks the ones she wants and orders them together,
   one draw for all of them; the caret on a row opens that panel's own
   page (what it does, what it cannot tell you). */

export default function CatalogCategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const category = CATEGORIES.find((c) => c.id === id)
  const items = category ? itemsIn(category.id) : []
  const [picked, setPicked] = React.useState<readonly string[]>([])

  if (!category || items.length === 0) return <PageNotFoundState />

  const chosen = items.filter((i) => picked.includes(i.id))
  const total = chosen.reduce((sum, i) => sum + i.member, 0)
  const flip = (it: Item) => setPicked((p) => (p.includes(it.id) ? p.filter((x) => x !== it.id) : [...p, it.id]))

  // Every panel is drawn at Quest, so they book as one visit.
  const order = () => {
    const [first, ...rest] = chosen
    if (!first) return
    router.push({ pathname: "/catalog/book/[id]", params: { id: first.id, ...(rest.length ? { more: rest.map((i) => i.id).join(",") } : {}) } })
  }

  return (
    <FlowScreen
      page
      title={category.title}
      footer={
        <PrimaryButton onPress={order} disabled={chosen.length === 0}>
          {chosen.length === 0 ? "Select tests to order" : `Order ${chosen.length} ${chosen.length === 1 ? "test" : "tests"} · ${money(total)}`}
        </PrimaryButton>
      }
    >
      <Block title="Panels" meta={chosen.length ? `${chosen.length} selected` : `${items.length} panels`}>
        <Group>
          {items.map((it) => (
            <LabRow key={it.id} item={it} checked={picked.includes(it.id)} onPress={() => flip(it)} />
          ))}
        </Group>
      </Block>
    </FlowScreen>
  )
}

/** One panel: the tick, its name and partner, its price, and a caret to its
    own page. */
function LabRow({ item: it, checked, onPress }: { item: Item; checked: boolean; onPress: () => void }) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPress}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={`${it.name}, ${money(it.member)}. ${it.intro}`}
        style={({ pressed }) => [styles.pick, pressed && styles.pressed]}
      >
        <CheckMark checked={checked} centered />
        <View style={styles.body}>
          <Text style={styles.name}>{it.name}</Text>
          <Text style={styles.meta}>{it.intro}</Text>
        </View>
        <Text style={styles.price}>{money(it.member)}</Text>
      </Pressable>
      <Pressable
        onPress={() => router.push({ pathname: "/catalog/[id]", params: { id: it.id } })}
        accessibilityRole="button"
        accessibilityLabel={`About ${it.name}`}
        hitSlop={8}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <CaretRight size={16} color={ink.tertiary} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.inline, paddingVertical: space.rowY },
  pick: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.item },
  body: { flex: 1, gap: 2 },
  name: { ...type.title },
  meta: { ...type.label },
  // Digits of one width, so the prices line up down the column.
  price: { ...type.value, fontVariant: ["tabular-nums"] },
  pressed: { opacity: 0.6 },
})
