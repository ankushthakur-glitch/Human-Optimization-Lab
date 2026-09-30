import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { Badge, Card, Chip, FlowScreen, Section } from "@/components/flow"
import { Button } from "@/components/ui"
import { useOnboarding } from "@/lib/onboarding"
import { DEVICES, FOOD_LOGGING } from "@/lib/program"
import { useSetupStep } from "@/lib/setup"
import { color, font } from "@/lib/theme"

/* Paid setup, step 3: a watch, ring or scale, for how the patient actually
   lives between visits, and how they would like to log food (no food
   diary). Connecting is simulated in the prototype; the real app goes
   through Terra. */

export default function DevicesScreen() {
  const onboarding = useOnboarding()
  const { finish } = useSetupStep("devices")
  const [connected, setConnected] = React.useState<string[]>(onboarding.devices ?? [])
  const [food, setFood] = React.useState<string | undefined>(onboarding.foodLogging)
  const toggle = (id: string) => setConnected((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))
  const save = () => finish({ devices: connected, foodLogging: food })

  return (
    <FlowScreen
      back={false}
      title="Connect a device"
      footer={
        <>
          <Button onPress={save} disabled={!connected.length}>
            Continue
          </Button>
          <Button variant="outline" onPress={save}>
            I don't have one
          </Button>
        </>
      }
    >
      <View style={styles.devices}>
        {DEVICES.map((d) => {
          const on = connected.includes(d.id)
          return (
            <Card key={d.id} selected={on} onPress={() => toggle(d.id)}>
              <View style={styles.device}>
                <View style={styles.body}>
                  <Text style={styles.name}>{d.name}</Text>
                  <Text style={styles.meta}>{d.kind}</Text>
                </View>
                {on ? <Badge tone="ok">Connected</Badge> : <Text style={styles.connect}>Connect</Text>}
              </View>
            </Card>
          )
        })}
      </View>

      <Section title="Log food by">
        <View style={styles.chips}>
          {FOOD_LOGGING.map((f) => (
            <Chip key={f} label={f} selected={food === f} onPress={() => setFood(f)} />
          ))}
        </View>
      </Section>
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  devices: { gap: 10 },
  device: { flexDirection: "row", alignItems: "center", gap: 12 },
  body: { flex: 1, gap: 2 },
  name: { fontFamily: font.semibold, fontSize: 16, color: color.text },
  meta: { fontFamily: font.regular, fontSize: 13, color: color.muted },
  connect: { fontFamily: font.semibold, fontSize: 14, color: color.primary },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
})
