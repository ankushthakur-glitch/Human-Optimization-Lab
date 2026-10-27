import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { StyleSheet, Text } from "react-native"

import { PageNotFoundState } from "@/components/error-state"
import { FlowScreen } from "@/components/flow"
import {
  Barbell,
  Brain,
  Butterfly,
  Car,
  Dna,
  Drop,
  Fish,
  Flame,
  Flask,
  FlowerLotus,
  ForkKnife,
  Gauge,
  GenderIntersex,
  Heart,
  Heartbeat,
  Leaf,
  Magnet,
  Moon,
  Package,
  Scales,
  Scan,
  ShieldPlus,
  Sun,
  Watch,
  Wind,
} from "@/components/ph"
import { Block, Group, HUE, NeedsRow, type Hue } from "@/components/record-kit"
import { CATEGORIES, itemsIn, money, type Item } from "@/lib/catalog"
import { type } from "@/lib/theme"

/* A category's list (every Care row opens one): every item in it, priced.
   Each is ordered on its own: a row opens that item's page (what it does,
   what it cannot tell you), which orders and pays. */

/** Each item's tile: what it measures or is, in a hue of its own. */
const ICON: Record<string, { Icon: React.ComponentType<{ size?: number; color?: string }>; hue: Hue }> = {
  "blood-panel": { Icon: Drop, hue: "red" },
  "lipid-advanced": { Icon: Heart, hue: "red" },
  a1c: { Icon: Gauge, hue: "amber" },
  thyroid: { Icon: Butterfly, hue: "violet" },
  "vitamin-d": { Icon: Sun, hue: "amber" },
  hormones: { Icon: GenderIntersex, hue: "violet" },
  inflammation: { Icon: Flame, hue: "red" },
  iron: { Icon: Magnet, hue: "blue" },
  kidney: { Icon: Flask, hue: "teal" },
  liver: { Icon: ShieldPlus, hue: "green" },
  "omega-3": { Icon: Fish, hue: "blue" },
  micronutrients: { Icon: Leaf, hue: "green" },
  dexa: { Icon: Scales, hue: "red" },
  rmr: { Icon: Flame, hue: "amber" },
  "vo2-max": { Icon: Wind, hue: "blue" },
  "whole-body-mri": { Icon: Scan, hue: "teal" },
  "calcium-ct": { Icon: Heart, hue: "red" },
  "brain-mri": { Icon: Brain, hue: "violet" },
  "multi-cancer": { Icon: ShieldPlus, hue: "red" },
  shield: { Icon: Drop, hue: "amber" },
  hereditary: { Icon: Dna, hue: "violet" },
  "ad-detect": { Icon: Brain, hue: "amber" },
  apoe: { Icon: Dna, hue: "violet" },
  atn: { Icon: Flask, hue: "teal" },
  "sleep-study": { Icon: Moon, hue: "amber" },
  cgm: { Icon: Drop, hue: "teal" },
  oura: { Icon: Watch, hue: "violet" },
  "bp-cuff": { Icon: Heartbeat, hue: "red" },
  "smart-scale": { Icon: Scales, hue: "blue" },
  smart: { Icon: FlowerLotus, hue: "green" },
  nutrition: { Icon: ForkKnife, hue: "amber" },
  movement: { Icon: Barbell, hue: "blue" },
  "home-care": { Icon: Package, hue: "blue" },
  meals: { Icon: ForkKnife, hue: "green" },
  transport: { Icon: Car, hue: "teal" },
}

export default function CatalogCategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const category = CATEGORIES.find((c) => c.id === id)
  const items = category ? itemsIn(category.id) : []

  if (!category || items.length === 0) return <PageNotFoundState />
  const [one, plural] = category.noun

  return (
    <FlowScreen page title={category.title}>
      <Block title={plural.charAt(0).toUpperCase() + plural.slice(1)} meta={`${items.length} ${items.length === 1 ? one : plural}`}>
        <Group>
          {items.map((it) => (
            <ItemRow key={it.id} item={it} />
          ))}
        </Group>
      </Block>
    </FlowScreen>
  )
}

/** One item: its tile, name and partner, its price, opening its own page. */
function ItemRow({ item: it }: { item: Item }) {
  const { Icon, hue } = ICON[it.id] ?? { Icon: Flask, hue: "teal" as Hue }
  return (
    <NeedsRow
      icon={<Icon size={16} color={HUE[hue].ink} />}
      hue={hue}
      title={it.name}
      meta={it.intro}
      right={<Text style={styles.price}>{money(it.member)}</Text>}
      accessibilityLabel={`${it.name}, ${money(it.member)}. ${it.intro}`}
      onPress={() => router.push({ pathname: "/catalog/[id]", params: { id: it.id } })}
    />
  )
}

const styles = StyleSheet.create({
  // Digits of one width, so the prices line up down the column.
  price: { ...type.stat, fontVariant: ["tabular-nums"] },
})
