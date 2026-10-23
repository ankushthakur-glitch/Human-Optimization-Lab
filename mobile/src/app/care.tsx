import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { FootNote, SearchField } from "@/components/catalog-parts"
import { Barbell, Brain, CalendarCheck, Flask, Heart, Leaf, Moon, Package, Scales, Scan, ShieldPlus, Watch } from "@/components/ph"
import { Block, EmptyState, Group, HUE, NeedsRow } from "@/components/record-kit"
import { TabScreen } from "@/components/tab-bar"
import { CATEGORIES, ITEMS, matches, money, type Category } from "@/lib/catalog"
import { ink, space, type } from "@/lib/theme"

/* Care, a tab (client deck, screen 52, "The Catalog": "Everything we can
   order, priced"): what the patient's physician can order, in nine
   categories drawn from the vetted partner directory. Each row names its
   category, the national partners behind it and the price it starts at,
   and opens an item (screen 53), which goes straight to a time (screen 54).

   Search over every test, scan and programme; with words in it the list
   is the categories that match. The footnote says what is true of every
   row: it needs the patient's own physician's order, placed in the portal,
   and the prices are cash, nothing here billed to insurance.

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

/** "Search 118 tests, scans and programmes", the client's count of what the
    nine categories hold. */
const SEARCH = "Search 118 tests, scans and programmes"

const NINE = "9 categories"

export default function CareScreen() {
  const [query, setQuery] = React.useState("")
  const found = CATEGORIES.filter((c) => matches(c, query))
  const searching = query.trim().length > 0
  const multiCancer = ITEMS.find((i) => i.id === "multi-cancer")

  return (
    <TabScreen tab="care" title="Care">
      <View style={styles.page}>
        <Text style={styles.lead}>What your physician can order</Text>
        <SearchField value={query} onChange={setQuery} placeholder={SEARCH} />

        {!searching && (
          <Block title="For your plan">
            <Group>
              <NeedsRow
                icon={<CalendarCheck size={16} color={HUE.amber.ink} />}
                hue="amber"
                title="DEXA re-scan"
                tag={{ tone: "ok", label: "Booked" }}
                meta="Fri, Oct 9 at 8:15 am, Fitnescity"
                onPress={() => router.push({ pathname: "/catalog/[id]", params: { id: "dexa" } })}
              />
              <NeedsRow
                icon={<Heart size={16} color={HUE.red.ink} />}
                hue="red"
                title="Multi cancer blood screening"
                meta={`Suggested in your plan. Member price ${money(multiCancer?.member ?? 854)}`}
                onPress={() => router.push({ pathname: "/catalog/[id]", params: { id: "multi-cancer" } })}
              />
            </Group>
          </Block>
        )}

        <Block title={searching ? "Results" : "Browse"} meta={searching ? `${found.length} of ${CATEGORIES.length}` : NINE}>
          {found.length === 0 ? (
            <EmptyState art="calendar" artSize={96} title="Nothing matches that" />
          ) : (
            <Group>
              {found.map((c) => (
                <CategoryRow key={c.id} category={c} />
              ))}
            </Group>
          )}
        </Block>

        <FootNote>Every clinical item needs your own physician’s order, placed in their portal. Prices are cash — nothing here is billed to insurance.</FootNote>
      </View>
    </TabScreen>
  )
}

/** One category: its tile, name, partners and starting price, opening its
    item. */
function CategoryRow({ category: c }: { category: Category }) {
  const Icon = ICON[c.id] ?? Barbell
  const open = ITEMS.find((i) => i.id === c.item)
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
      onPress={() => open && router.push({ pathname: "/catalog/[id]", params: { id: open.id } })}
    />
  )
}

const styles = StyleSheet.create({
  page: { gap: space.section },
  lead: { ...type.label, marginBottom: -space.item, color: ink.secondary },
  price: { alignItems: "flex-end", minWidth: 44 },
  from: { ...type.caption },
  amount: { ...type.stat },
})
