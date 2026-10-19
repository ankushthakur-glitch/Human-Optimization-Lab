import * as React from "react"
import { ActivityIndicator, Animated, Easing, Platform, StyleSheet, Text, View } from "react-native"

import { Bluetooth, CheckCircle, Hospital, Plus, ShieldCheck, Watch } from "@/components/ph"
import { Block, TextAction, toast } from "@/components/record-kit"
import { Chevron, Row, Rows, Switch } from "@/components/settings-rows"
import { Sheet } from "@/components/sheet"
import { TabScreen } from "@/components/tab-bar"
import { Button } from "@/components/ui"
import { type Source, connectSource, useSources } from "@/lib/connections"
import { chart, color, ink, space, type } from "@/lib/theme"

/* Connections, the Connect tab (16 Oct 2026): where she connects her
   health. Nothing is connected to start.

   Health records: the two systems HOL reads directly, Epic MyChart and
   Oracle Health (5 Oct 2026 call), each with Connect, which asks what to
   share and then signs her in.

   Devices and wearables: the usual pairing flow. Add a device opens a
   sheet that scans for a moment, then lists the devices it found; Connect
   on one pairs it, and it joins her list with a green dot. Its sheets are
   drawn over the tab bar. */

type DeviceStep = "scanning" | "found" | { pairing: Source } | { paired: Source }

export default function ConnectionsScreen() {
  const sources = useSources()
  const [record, setRecord] = React.useState<Source | null>(null)
  const [device, setDevice] = React.useState<DeviceStep | null>(null)

  const ehr = sources.filter((s) => s.kind === "ehr")
  const linkedEhr = ehr.filter((s) => s.connected)
  const openEhr = ehr.filter((s) => !s.connected)
  const devices = sources.filter((s) => s.kind === "device")
  const linkedDevices = devices.filter((s) => s.connected)

  const sheets = (
    <>
      {record && (
        <ShareSheet
          source={record}
          onBack={() => setRecord(null)}
          onConnect={(data) => {
            connectSource(record.id, data)
            setRecord(null)
            toast(`${record.name} connected`)
          }}
        />
      )}
      {device && (
        <DeviceSheet
          step={device}
          found={devices.filter((s) => !s.connected)}
          onStep={setDevice}
          onClose={() => setDevice(null)}
        />
      )}
    </>
  )

  return (
    <TabScreen tab="connections" title="Connections" overlay={sheets}>
      <View style={styles.page}>
        <Block title="Health records">
          <Rows>
            {linkedEhr.map((s) => (
              <Row key={s.id} icon={<Hospital size={16} color={color.primary} />} title={s.name} meta={s.via} gap={10} right={<Synced when={s.synced} />} />
            ))}
            {openEhr.map((s) => (
              <Row
                key={s.id}
                icon={<Hospital size={16} color={color.primary} />}
                title={s.name}
                meta={s.via}
                gap={10}
                right={<TextAction onPress={() => setRecord(s)}>Connect</TextAction>}
              />
            ))}
          </Rows>
        </Block>

        <Block title="Devices and wearables">
          <Rows>
            {linkedDevices.length === 0 && <Row icon={<Watch size={16} color={ink.tertiary} />} title="None connected" regular />}
            {linkedDevices.map((s) => (
              <Row key={s.id} icon={<Watch size={16} color={color.primary} />} title={s.name} meta={s.via} gap={10} right={<Synced when={s.synced} />} />
            ))}
            <Row icon={<Plus size={16} color={color.primary} />} title="Add a device" right={<Chevron />} onPress={() => setDevice("scanning")} />
          </Rows>
        </Block>
      </View>
    </TabScreen>
  )
}

/** A green dot and when it last synced, on the right of a connected row. */
function Synced({ when }: { when?: string }) {
  return (
    <View style={styles.synced}>
      <View style={styles.dot} />
      <Text style={styles.syncedText}>{when ?? "Synced"}</Text>
    </View>
  )
}

/* ------------------------------------------------------------ records -- */

/** What she shares from a record system: a switch per kind of data, all
    on to start. Connect needs at least one. */
function ShareSheet({ source, onBack, onConnect }: { source: Source; onBack: () => void; onConnect: (data: string[]) => void }) {
  const [on, setOn] = React.useState<Record<string, boolean>>(() => Object.fromEntries(source.data.map((d) => [d, true])))
  const chosen = source.data.filter((d) => on[d])
  return (
    <Sheet title={`Share from ${source.name}`} onClose={onBack}>
      <Rows>
        {source.data.map((d) => (
          <View key={d} style={styles.pair}>
            <Text style={styles.pairLabel}>{d}</Text>
            <Switch value={!!on[d]} onChange={(v) => setOn((x) => ({ ...x, [d]: v }))} label={d} />
          </View>
        ))}
      </Rows>
      <View style={styles.note}>
        <ShieldCheck size={16} color={color.primary} />
        <Text style={styles.noteText}>Inlay only reads it. Your care team sees it too.</Text>
      </View>
      <View style={styles.actions}>
        <Button disabled={!chosen.length} onPress={() => onConnect(chosen)}>
          Sign in and connect
        </Button>
        <Button variant="outline" onPress={onBack}>
          Back
        </Button>
      </View>
    </Sheet>
  )
}

/* ------------------------------------------------------------ devices -- */

const SCAN_MS = 2400
const PAIR_MS = 1600

/** The pairing flow in one sheet: scanning, the devices found, pairing
    with the one she picked, and paired. */
function DeviceSheet({
  step,
  found,
  onStep,
  onClose,
}: {
  step: DeviceStep
  found: Source[]
  onStep: (s: DeviceStep) => void
  onClose: () => void
}) {
  React.useEffect(() => {
    if (step === "scanning") {
      const t = setTimeout(() => onStep("found"), SCAN_MS)
      return () => clearTimeout(t)
    }
    if (typeof step === "object" && "pairing" in step) {
      const t = setTimeout(() => {
        connectSource(step.pairing.id, step.pairing.data)
        onStep({ paired: step.pairing })
      }, PAIR_MS)
      return () => clearTimeout(t)
    }
  }, [step, onStep])

  if (step === "scanning")
    return (
      <Sheet title="Looking for devices" onClose={onClose}>
        <View style={styles.scan}>
          <Radar />
          <Text style={styles.scanText}>Keep your device close to your phone</Text>
        </View>
        <Button variant="outline" onPress={onClose}>
          Cancel
        </Button>
      </Sheet>
    )

  if (step === "found")
    return (
      <Sheet title="Available devices" onClose={onClose}>
        {found.length ? (
          <Rows>
            {found.map((s) => (
              <Row
                key={s.id}
                icon={<Watch size={16} color={color.primary} />}
                title={s.name}
                meta={s.via}
                gap={10}
                right={<TextAction onPress={() => onStep({ pairing: s })}>Connect</TextAction>}
              />
            ))}
          </Rows>
        ) : (
          <Text style={styles.scanText}>No new devices nearby</Text>
        )}
        <Button variant="outline" onPress={() => onStep("scanning")}>
          Scan again
        </Button>
      </Sheet>
    )

  if ("pairing" in step)
    return (
      <Sheet title={`Connecting to ${step.pairing.name}`} onClose={onClose}>
        <View style={styles.scan}>
          <ActivityIndicator color={color.primary} size="large" />
          <Text style={styles.scanText}>Accept the request on your device if it asks</Text>
        </View>
      </Sheet>
    )

  return (
    <Sheet title={`${step.paired.name} connected`} onClose={onClose}>
      <View style={styles.scan}>
        <View style={styles.doneTile}>
          <CheckCircle size={32} color={color.primary} />
        </View>
        <Text style={styles.scanText}>{step.paired.data.join(", ")}</Text>
      </View>
      <View style={styles.actions}>
        <Button onPress={onClose}>Done</Button>
        <Button variant="outline" onPress={() => onStep("scanning")}>
          Add another device
        </Button>
      </View>
    </Sheet>
  )
}

/** Two rings that grow and fade from a Bluetooth tile, over and over. */
function Radar() {
  const rings = React.useRef([new Animated.Value(0), new Animated.Value(0)]).current
  React.useEffect(() => {
    const run = Animated.stagger(
      700,
      rings.map((v) =>
        Animated.loop(Animated.timing(v, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== "web" }))
      )
    )
    run.start()
    return () => run.stop()
  }, [rings])
  return (
    <View style={styles.radar}>
      {rings.map((v, i) => (
        <Animated.View
          key={i}
          style={[
            styles.ring,
            { opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.6] }) }] },
          ]}
        />
      ))}
      <View style={styles.radarTile}>
        <Bluetooth size={28} color={color.primary} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  page: { gap: space.section },
  synced: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: chart.inRange },
  syncedText: { ...type.meta },
  pair: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.item, minHeight: 28 },
  pairLabel: { ...type.title },
  note: { flexDirection: "row", alignItems: "center", gap: space.inline },
  noteText: { ...type.label, flexShrink: 1 },
  actions: { gap: space.item },
  scan: { alignItems: "center", gap: space.section, paddingVertical: space.section },
  scanText: { ...type.label, textAlign: "center" },
  radar: { width: 120, height: 120, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: 120, height: 120, borderRadius: 60, backgroundColor: color.primaryLine },
  radarTile: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: color.primarySoft },
  doneTile: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: color.primarySoft },
})
