import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { Bone, Brain, CalendarCheck, Flask, Moon, Package, MagnifyingGlass, Scan, Sparkle, Watch, Heartbeat } from "@/components/ph"
import { Block, Group, HUE, NeedsRow, toast, type Hue } from "@/components/record-kit"
import { TabScreen } from "@/components/tab-bar"
import { TextField } from "@/components/ui"
import { space, type } from "@/lib/theme"
import { CATEGORIES, ITEMS } from "@/lib/v14"

/* The Care tab for a member (Journey_14 deck screen 52, the main paid
   flow since 23 Oct 2026; app/care.tsx picks it), the catalog: everything the practice can order, priced
   and sourced from vetted national partners, open to free and paid
   patients (members see member prices). It replaces the surgical
   preparation screens. Nine categories, each naming its partners and the
   price it starts at.

   Beyond the deck: a "For your plan" block first, so the two things her
   plan points to are one tap away before she browses (one booked, one
   suggested by Dr. Patel's plan), and a search that narrows the list as
   she types. The foot says plainly that prices are cash. */

const ICON: Record<string, { Icon: React.ComponentType<{ size?: number; color?: string }>; hue: Hue }> = {
  lab: { Icon: Flask, hue: "blue" },
  body: { Icon: Bone, hue: "amber" },
  imaging: { Icon: Scan, hue: "violet" },
  cancer: { Icon: Heartbeat, hue: "red" },
  brain: { Icon: Brain, hue: "blue" },
  sleep: { Icon: Moon, hue: "violet" },
  devices: { Icon: Watch, hue: "teal" },
  programmes: { Icon: Sparkle, hue: "green" },
  home: { Icon: Package, hue: "neutral" },
}

const open = (id: string) => () => {
  if (id === "cancer") router.push("/v14/care/galleri" as never)
  else toast("Opens the category in the real app")
}

export function CareMember() {
  const [q, setQ] = React.useState("")
  const needle = q.trim().toLowerCase()
  const hit = (...words: string[]) => !needle || words.some((w) => w.toLowerCase().includes(needle))
  const cats = CATEGORIES.filter((c) => hit(c.name, c.what, c.partners))
  const items = needle ? ITEMS.filter((i) => hit(i.name, i.by, i.category)) : []

  return (
    <TabScreen tab="care" title="Care" headerRight={<Text style={type.meta}>Cash prices</Text>}>
      <View style={styles.list}>
        <TextField
          label="Search"
          placeholder="Search 118 tests, scans and programmes"
          value={q}
          onChangeText={setQ}
          icon={({ color: c }) => <MagnifyingGlass size={18} color={c} />}
          compact
          autoCorrect={false}
        />

        {!needle && (
          <Block title="For your plan">
            <Group>
              <NeedsRow
                icon={<CalendarCheck size={16} color={HUE.amber.ink} />}
                hue="amber"
                title="DEXA re-scan"
                meta="Fri, Oct 9 at 8:15 am, Fitnescity"
                tag={{ tone: "ok", label: "Booked" }}
                onPress={() => toast("Opens the booking in To do")}
              />
              <NeedsRow
                icon={<Heartbeat size={16} color={HUE.red.ink} />}
                hue="red"
                title="Multi cancer blood screening"
                meta={`Suggested in your plan. Member price $${ITEMS[0].price}`}
                onPress={open("cancer")}
              />
            </Group>
          </Block>
        )}

        {items.length > 0 && (
          <Block title="Tests">
            <Group>
              {items.map((i) => (
                <NeedsRow key={i.id} icon={<Heartbeat size={16} color={HUE.red.ink} />} hue="red" title={i.name} meta={i.by} right={`$${i.price}`} onPress={() => router.push(`/v14/care/${i.id}` as never)} />
              ))}
            </Group>
          </Block>
        )}

        <Block title="Browse" meta={`${cats.length} categories`}>
          {cats.length ? (
            <Group>
              {cats.map((c) => {
                const { Icon, hue } = ICON[c.id] ?? ICON.home
                return (
                  <NeedsRow
                    key={c.id}
                    icon={<Icon size={16} color={HUE[hue].ink} />}
                    hue={hue}
                    title={c.name}
                    meta={`${c.what}. ${c.partners}`}
                    right={`from $${c.from}`}
                    onPress={open(c.id)}
                  />
                )
              })}
            </Group>
          ) : (
            <Text style={type.body}>{`Nothing matches "${q}". Try a test name or a partner, like DEXA or Quest.`}</Text>
          )}
        </Block>

        <Text style={type.meta}>Every clinical item needs your own physician's order, placed in their portal. Prices are cash; nothing here is billed to insurance. As a member you see member prices.</Text>
      </View>
    </TabScreen>
  )
}

const styles = StyleSheet.create({
  list: { gap: space.section },
})
