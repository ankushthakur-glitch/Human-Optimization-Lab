import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { ConnectSheet, type Step } from "@/app/connections"
import { Card, FlowScreen } from "@/components/flow"
import { Hospital } from "@/components/ph"
import { TextAction } from "@/components/record-kit"
import { Row } from "@/components/settings-rows"
import { Button } from "@/components/ui"
import { type Source, useSources } from "@/lib/connections"
import { useOnboarding } from "@/lib/onboarding"
import { color, font, ink, space } from "@/lib/theme"

/* Setup's "Connect your health records" page, right after the authorization
   page and before "Updates about your care" (the consent texts). The 5 Oct 2026 call settled what HOL reads: the two
   record systems, Epic MyChart and Oracle Health (lib/connections.ts).
   No devices, no wearables. Since 21 Oct 2026 Continue
   stays disabled until one system is connected, and connecting opens as a
   centred popup rather than the Connect tab's bottom sheet. */

export default function ConnectRecordsScreen() {
  const onboarding = useOnboarding()
  const sources = useSources().filter((s) => s.kind === "ehr")
  const [step, setStep] = React.useState<Step | null>(null)
  const linked = sources.some((s) => s.connected)

  const { period } = useLocalSearchParams<{ period?: string }>()

  const next = () => router.push({ pathname: "/onboarding/consent-texts", params: period ? { period } : {} })

  return (
    <View style={styles.fill}>
      <FlowScreen
        hol
        title="Connect your health records"
        description="Link your doctors' record system so results, medicines and visits arrive on their own."
        footer={<Button onPress={next} disabled={!linked}>Continue</Button>}
      >
        {sources.map((s) => (
          <Source key={s.id} source={s} onConnect={() => setStep({ connecting: s })} />
        ))}
      </FlowScreen>
      {step && <ConnectSheet popup step={step} onStep={setStep} onClose={() => setStep(null)} />}
    </View>
  )
}

/** One record system: its name and who it serves, Connect (or when it
    synced). */
function Source({ source, onConnect }: { source: Source; onConnect: () => void }) {
  return (
    <Card style={styles.source}>
      <Row
        icon={<Hospital size={16} color={color.primary} />}
        title={source.name}
        meta={source.via}
        gap={10}
        right={
          source.connected ? (
            <View style={styles.synced}>
              <View style={styles.dot} />
              <Text style={styles.syncedText}>{source.synced ?? "Connected"}</Text>
            </View>
          ) : (
            <TextAction onPress={onConnect}>Connect</TextAction>
          )
        }
      />
    </Card>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  source: { gap: space.item, backgroundColor: color.background, padding: space.card + 4 },
  synced: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.ok },
  syncedText: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: ink.tertiary },
})
