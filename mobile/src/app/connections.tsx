import * as React from "react"
import { ActivityIndicator, StyleSheet, Text, View } from "react-native"

import { CheckCircle, Hospital } from "@/components/ph"
import { Block, TextAction } from "@/components/record-kit"
import { Row, Rows } from "@/components/settings-rows"
import { Sheet } from "@/components/sheet"
import { TabScreen } from "@/components/tab-bar"
import { Button } from "@/components/ui"
import { type Source, connectSource, useSources } from "@/lib/connections"
import { chart, color, space, type } from "@/lib/theme"

/* Connections, the Connect tab (16 Oct 2026): where she connects her
   health records. Nothing is connected to start.

   Health records: the two systems HOL reads directly, Epic MyChart and
   Oracle Health (5 Oct 2026 call). Since 19 Oct 2026 Connect opens a
   sheet that shows a loader while it connects, then says it's connected;
   the share sheet and the devices group are gone. Its sheet is drawn
   over the tab bar. */

export type Step = { connecting: Source } | { connected: Source }

export default function ConnectionsScreen() {
  const sources = useSources()
  const [step, setStep] = React.useState<Step | null>(null)

  const ehr = sources.filter((s) => s.kind === "ehr")
  const linkedEhr = ehr.filter((s) => s.connected)
  const openEhr = ehr.filter((s) => !s.connected)

  const sheets = step && <ConnectSheet step={step} onStep={setStep} onClose={() => setStep(null)} />

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
                right={<TextAction onPress={() => setStep({ connecting: s })}>Connect</TextAction>}
              />
            ))}
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

/* ------------------------------------------------------------ connect -- */

const CONNECT_MS = 1800

/** Connecting to a record system: a loader sheet for a moment, then the
    connected sheet. Each has its own key so the connected sheet slides up
    as a popup of its own instead of just swapping the loader's content. */
export function ConnectSheet({ step, onStep, onClose, popup = false }: { step: Step; onStep: (s: Step) => void; onClose: () => void; popup?: boolean }) {
  React.useEffect(() => {
    if (!("connecting" in step)) return
    const t = setTimeout(() => {
      connectSource(step.connecting.id)
      onStep({ connected: step.connecting })
    }, CONNECT_MS)
    return () => clearTimeout(t)
  }, [step, onStep])

  if ("connecting" in step)
    return (
      <Sheet key="connecting" title={`Connecting to ${step.connecting.name}`} onClose={onClose} popup={popup}>
        <View style={styles.status}>
          <ActivityIndicator color={color.primary} size="large" />
          <Text style={styles.statusText}>Signing you in securely</Text>
        </View>
      </Sheet>
    )

  return (
    <Sheet key="connected" title={`${step.connected.name} connected`} onClose={onClose} popup={popup}>
      <View style={styles.status}>
        <View style={styles.doneTile}>
          <CheckCircle size={32} color={color.primary} />
        </View>
        <Text style={styles.statusText}>Your records from {step.connected.name} are on their way</Text>
      </View>
      <Button onPress={onClose}>Done</Button>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  page: { gap: space.section },
  synced: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: chart.inRange },
  syncedText: { ...type.meta },
  status: { alignItems: "center", gap: space.section, paddingVertical: space.section },
  statusText: { ...type.label, textAlign: "center" },
  doneTile: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: color.primarySoft },
})
