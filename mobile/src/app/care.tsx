import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { Barbell, Brain, Flask, Leaf, Moon, Package, Scales, Scan, ShieldPlus, Watch } from "@/components/ph"
import { Block, Group, HUE, NeedsRow } from "@/components/record-kit"
import { TabScreen } from "@/components/tab-bar"
import { CATEGORIES, money, type Category } from "@/lib/catalog"
import { ink, space, type } from "@/lib/theme"

/* Care, a tab (client deck, screen 52, "The Catalog": "Everything we can
   order, priced"): what the patient's physician can order, in nine
   categories drawn from the vetted partner directory. Each row names its
   category, the national partners behind it and the price it starts at,
   and opens the list of its items; each opens its own page (screen 53),
   which goes straight to a time (screen 54).

   Membership and billing are no longer the Care tab: they stay one tap
   away on Profile and in the Plan tab. */

const ICON: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  lab: Flask,
  body: Scales,
  imaging: Scan,
  cancer: ShieldPlus,
  brain: Brain,
  sleep: Moon,
  devices: Watch,
  programmes: Leaf,
  home: Package,
}

const NINE = "9 categories"

export default function CareScreen() {

  return (
    <TabScreen tab="care" title="Care">
      <View style={styles.page}>
        <Block title="Browse" meta={NINE}>
          <Group>
            {CATEGORIES.map((c) => (
              <CategoryRow key={c.id} category={c} />
            ))}
          </Group>
        </Block>

      </View>
    </TabScreen>
  )
}

/** One category: its tile, name, partners and starting price, opening its
    item. */
function CategoryRow({ category: c }: { category: Category }) {
  const Icon = ICON[c.id] ?? Barbell
  return (
    <NeedsRow
      icon={<Icon size={16} color={HUE[c.hue].ink} />}
      hue={c.hue}
      title={c.title}
      meta={c.meta}
      right={
        <View style={styles.price}>
          {!c.exact && <Text style={styles.from}>from</Text>}
          <Text style={styles.amount}>{money(c.price)}</Text>
        </View>
      }
      accessibilityLabel={`${c.title}. ${c.meta}. ${c.exact ? "" : "From "}${money(c.price)}`}
      onPress={() => router.push({ pathname: "/catalog/category/[id]", params: { id: c.id } })}
    />
  )
}

const styles = StyleSheet.create({
  page: { gap: space.section },
  price: { alignItems: "flex-end", minWidth: 44 },
  from: { ...type.caption },
  amount: { ...type.stat },
})
