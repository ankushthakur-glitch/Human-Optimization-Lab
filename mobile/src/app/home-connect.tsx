import { router } from "expo-router"
import { StyleSheet, Text, View } from "react-native"

import { HomeHeader } from "@/components/home-header"
import { NeedsYou, RecordSections } from "@/components/home-free"
import { Hospital, Watch } from "@/components/ph"
import { Block, CARD_RADIUS, Rise } from "@/components/record-kit"
import { Chevron, Row, Rows } from "@/components/settings-rows"
import { TabScreen, useDemoTabs } from "@/components/tab-bar"
import { READINGS, useDemoSources } from "@/lib/connections-demo"
import { card, color, space, type } from "@/lib/theme"

/* The free home with connections (demo, 16 Oct 2026): the free home as it
   is, with one extra block after Needs you, Your connections, whose two
   rows open Connections for her doctors' systems and for her devices and
   wearables. Once a device is connected, From your devices shows today's
   readings above it. The tab bar gains Connect (tab-bar.tsx DEMO_TABS).
   Reached from the review link
   /demo/free?to=/home-connect; the real Home is unchanged. */

export default function HomeConnectScreen() {
  useDemoTabs()
  return (
    <TabScreen tab="home" header={<HomeHeader variant="free" />}>
      <View style={styles.page}>
        <NeedsYou />
        <FromDevices />
        <YourConnections />
        <RecordSections skipNeeds />
      </View>
    </TabScreen>
  )
}

const count = (n: number, one: string) => (n ? `${n} ${one}${n === 1 ? "" : "s"} connected` : "None connected")

function YourConnections() {
  const sources = useDemoSources().filter((s) => s.connected)
  const ehr = sources.filter((s) => s.kind === "ehr").length
  const devices = sources.filter((s) => s.kind === "device").length
  return (
    <Rise at={2} id="home-connect:connections">
      <Block title="Your connections">
        <Rows>
          <Row
            icon={<Hospital size={16} color={color.primary} />}
            title="Health records"
            meta={count(ehr, "system")}
            gap={10}
            right={<Chevron />}
            onPress={() => router.push("/connections")}
          />
          <Row
            icon={<Watch size={16} color={color.primary} />}
            title="Devices and wearables"
            meta={count(devices, "device")}
            gap={10}
            right={<Chevron />}
            onPress={() => router.push("/connections")}
          />
        </Rows>
      </Block>
    </Rise>
  )
}

/** Today's readings from the devices she connected, two to a row. */
function FromDevices() {
  const tiles = useDemoSources()
    .filter((s) => s.kind === "device" && s.connected)
    .flatMap((s) => (READINGS[s.id] ?? []).map((r) => ({ ...r, from: s.name, key: `${s.id}:${r.label}` })))
    .slice(0, 4)
  if (!tiles.length) return null
  return (
    <Rise at={2} id="home-connect:devices">
      <Block title="From your devices">
        <View style={styles.grid}>
          {tiles.map((t) => (
            <View key={t.key} style={styles.tile}>
              <Text style={styles.tileLabel} numberOfLines={1}>
                {t.label}
              </Text>
              <Text style={styles.tileValue} numberOfLines={1}>
                {t.value}
                {!!t.unit && <Text style={styles.tileUnit}> {t.unit}</Text>}
              </Text>
              <Text style={styles.tileFrom} numberOfLines={1}>
                {t.from} · Today
              </Text>
            </View>
          ))}
        </View>
      </Block>
    </Rise>
  )
}

const styles = StyleSheet.create({
  page: { gap: space.section },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.item },
  tile: {
    flexBasis: "47%",
    flexGrow: 1,
    gap: 4,
    padding: space.compact,
    borderRadius: CARD_RADIUS,
    backgroundColor: card.fill,
    boxShadow: card.shadow,
  },
  tileLabel: { ...type.label },
  tileValue: { ...type.stat },
  tileUnit: { ...type.label },
  tileFrom: { ...type.meta },
})
