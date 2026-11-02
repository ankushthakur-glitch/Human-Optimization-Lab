import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, View } from "react-native"

import { FlowScreen } from "@/components/flow"
import { PrimaryButton } from "@/components/hol"
import { Heart, Hospital, Plus, Watch } from "@/components/ph"
import { billingOf } from "@/components/plan-account-pieces"
import { DevicesSheet } from "@/components/plan-tab-devices"
import { Block, toast } from "@/components/record-kit"
import { Chevron, Pair, Row, Rows, SwitchPair } from "@/components/settings-rows"
import { Sheet, SheetText } from "@/components/sheet"
import { Button } from "@/components/ui"
import { type Connection, type ConnectionKind, connectionsOf } from "@/lib/access"
import { rowDate } from "@/lib/dates"
import { sharingOff } from "@/lib/experience"
import { useOnboarding } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { color, space } from "@/lib/theme"

/* Access, one tap under Profile (5 Oct 2026 call): the permission she gave
   to collect her records (on until she turns it off with its switch; it
   no longer runs out, 2 Nov 2026), then everything her
   record is connected to: her doctors' systems, and for a member her
   devices (Apple Health, her watch, any ring or scale) with "Add a device".
   Devices come with the paid plan, so a free patient sees no Devices
   group. Nothing is disconnected one by one (user, 6 Oct 2026).

   Without the permission nothing is connected: the card says so and offers
   to connect. */


const GROUPS: { kind: ConnectionKind; title: string }[] = [
  { kind: "ehr", title: "Health records" },
  { kind: "device", title: "Devices" },
]

const iconOf = (c: Connection) => (c.kind === "ehr" ? Hospital : c.id === "apple-health" ? Heart : Watch)

export default function AccessScreen() {
  const onboarding = useOnboarding()
  const { consent, consentAt, profile } = onboarding
  const [adding, setAdding] = React.useState(false)
  const paid = !["none", "ended"].includes(billingOf(onboarding.membership).state)
  const connections = connectionsOf(onboarding, paid)
  const [withdrawing, setWithdrawing] = React.useState(false)
  const off = sharingOff(onboarding)
  const name = `${profile?.firstName ?? PATIENT.firstName} ${profile?.lastName ?? PATIENT.lastName}`

  async function withdraw() {
    // Stopping keeps everything collected; the day is kept for the banner
    // every tab shows (C.28).
    await onboarding.save({ consent: "declined", sharingOffAt: new Date().toISOString() })
    setWithdrawing(false)
    toast("Sharing turned off")
  }

  return (
    <View style={styles.fill}>
      <FlowScreen page title="Access">
        <Block title="Sharing your records">
          {consent === "signed" ? (
            <Rows>
              <SwitchPair
                label="Sharing"
                value
                onChange={(on) => !on && setWithdrawing(true)}
                switchLabel="Share my records"
              />
              <Pair label="Signed" value={consentAt ? rowDate(new Date(consentAt)) : "At setup"} />
              <Pair label="Signed as" value={onboarding.signedAs ?? name} />
              <Pair label="Shared with" value={PATIENT.practice} />
            </Rows>
          ) : (
            <>
              <Rows>
                <SwitchPair label="Not sharing" value={false} onChange={(on) => on && router.push("/connect")} switchLabel="Share my records" />
                {!!off?.on && <Pair label="Turned off" value={off.on} />}
              </Rows>
              <PrimaryButton onPress={() => router.push("/connect")}>Connect my records</PrimaryButton>
            </>
          )}
        </Block>

        {consent === "signed" &&
          GROUPS.filter((g) => paid || g.kind !== "device").map((g) => (
              <Block key={g.kind} title={g.title}>
                <Rows>
                  {connections.filter((c) => c.kind === g.kind).map((c) => {
                    const Icon = iconOf(c)
                    return <Row key={c.id} icon={<Icon size={16} color={color.primary} />} title={c.name} meta={c.via} gap={10} />
                  })}
                  {g.kind === "device" && (
                    <Row icon={<Plus size={16} color={color.primary} />} title="Add a device" right={<Chevron />} onPress={() => setAdding(true)} />
                  )}
                </Rows>
              </Block>
            ))}
      </FlowScreen>

      {adding && <DevicesSheet onClose={() => setAdding(false)} />}

      {withdrawing && (
        <Sheet title="Stop sharing your records?" onClose={() => setWithdrawing(false)}>
          <SheetText>We'll stop collecting new records. What's already in your record stays, and your care team can still see it.</SheetText>
          <View style={styles.actions}>
            <Button variant="destructive" onPress={withdraw}>
              Stop sharing
            </Button>
            <Button variant="outline" onPress={() => setWithdrawing(false)}>
              Keep sharing
            </Button>
          </View>
        </Sheet>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  actions: { gap: space.item },
})
