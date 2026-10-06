import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { StyleSheet, View } from "react-native"

import { FlowScreen } from "@/components/flow"
import { PrimaryButton } from "@/components/hol"
import { Heart, Hospital, Plus, Watch } from "@/components/ph"
import { billingOf } from "@/components/plan-account-pieces"
import { DevicesSheet } from "@/components/plan-tab-devices"
import { Block, TextAction, toast } from "@/components/record-kit"
import { Chevron, Pair, Row, Rows, SwitchPair } from "@/components/settings-rows"
import { Sheet, SheetText } from "@/components/sheet"
import { Button } from "@/components/ui"
import { ADDABLE, type Connection, type ConnectionKind, connectionsOf, disconnectText } from "@/lib/access"
import { DEFAULT_PERIOD, periodEnd, periodLabel } from "@/lib/consent"
import { rowDate } from "@/lib/dates"
import { sharingOff } from "@/lib/experience"
import { useOnboarding } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { color, space } from "@/lib/theme"

/* Access, one tap under Profile (5 Oct 2026 call): the permission she gave
   to collect her records (until when, stopped by its switch, renewed from
   the sharing banner's "Renew" through `?sheet=renew`), then everything her
   record is connected to, her doctors' systems and her devices (Apple
   Health, her watch, any ring or scale), each disconnected on its own and
   asked once more first. A disconnected one stays listed with the day, and
   can be connected again; one she added comes off the list. "Add a device"
   picks one for a member; devices come with the paid plan, so for anyone
   else it opens the plan's devices sheet.

   Without the permission nothing is connected: the card says so and offers
   to connect. */

type Confirm = { what: "withdraw" } | { what: "renew" } | { what: "disconnect"; connection: Connection }

const GROUPS: { kind: ConnectionKind; title: string }[] = [
  { kind: "ehr", title: "Health records" },
  { kind: "device", title: "Devices" },
]

const iconOf = (c: Connection) => (c.kind === "ehr" ? Hospital : c.id === "apple-health" ? Heart : Watch)

export default function AccessScreen() {
  const onboarding = useOnboarding()
  const { sheet } = useLocalSearchParams<{ sheet?: string }>()
  const { consent, consentAt, profile } = onboarding
  const disconnected = onboarding.disconnected ?? {}
  const [adding, setAdding] = React.useState(false)
  const paid = !["none", "ended"].includes(billingOf(onboarding.membership).state)
  const connections = connectionsOf(onboarding)
  const [confirm, setConfirm] = React.useState<Confirm | null>(sheet === "renew" && consent === "signed" ? { what: "renew" } : null)
  const period = onboarding.consentPeriod ?? DEFAULT_PERIOD
  const off = sharingOff(onboarding)
  const name = `${profile?.firstName ?? PATIENT.firstName} ${profile?.lastName ?? PATIENT.lastName}`

  async function act(c: Confirm) {
    // Stopping keeps everything collected; the day is kept for the banner
    // every tab shows (C.28).
    if (c.what === "withdraw") await onboarding.save({ consent: "declined", sharingOffAt: new Date().toISOString() })
    if (c.what === "renew") await onboarding.save({ consentAt: new Date().toISOString() })
    if (c.what === "disconnect") {
      const id = c.connection.id
      await onboarding.save(
        c.connection.added ? { devices: (onboarding.devices ?? []).filter((d) => d !== id) } : { disconnected: { ...disconnected, [id]: new Date().toISOString() } },
      )
    }
    setConfirm(null)
    toast(c.what === "withdraw" ? "Sharing turned off" : c.what === "renew" ? "Sharing renewed" : `${c.connection.name} disconnected`)
  }

  async function reconnect(c: Connection) {
    const { [c.id]: _, ...rest } = disconnected
    await onboarding.save({ disconnected: rest })
    toast(`${c.name} connected`)
  }

  async function add(c: Connection) {
    await onboarding.save({ devices: [...(onboarding.devices ?? []), c.id] })
    setAdding(false)
    toast(`${c.name} connected`)
  }

  return (
    <View style={styles.fill}>
      <FlowScreen page title="Access">
        <Block title="Sharing your records">
          {consent === "signed" ? (
            <Rows>
              <SwitchPair
                label={`Until ${rowDate(periodEnd(period, consentAt ? new Date(consentAt) : new Date()))}`}
                value
                onChange={(on) => !on && setConfirm({ what: "withdraw" })}
                switchLabel="Share my records"
              />
              <Pair label="Signed" value={consentAt ? rowDate(new Date(consentAt)) : "At setup"} />
              <Pair label="For" value={periodLabel(period)} />
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
          GROUPS.map((g) => (
              <Block key={g.kind} title={g.title}>
                <Rows>
                  {connections.filter((c) => c.kind === g.kind).map((c) => {
                    const at = disconnected[c.id]
                    const Icon = iconOf(c)
                    return (
                      <Row
                        key={c.id}
                        icon={<Icon size={16} color={color.primary} />}
                        title={c.name}
                        meta={at ? `Disconnected ${rowDate(new Date(at))}` : c.via}
                        gap={10}
                        right={
                          at ? (
                            <TextAction onPress={() => reconnect(c)}>Connect</TextAction>
                          ) : (
                            <TextAction tone="destructive" onPress={() => setConfirm({ what: "disconnect", connection: c })}>
                              Disconnect
                            </TextAction>
                          )
                        }
                      />
                    )
                  })}
                  {g.kind === "device" && (
                    <Row icon={<Plus size={16} color={color.primary} />} title="Add a device" right={<Chevron />} onPress={() => setAdding(true)} />
                  )}
                </Rows>
              </Block>
            ))}
      </FlowScreen>

      {adding && (paid ? <AddDeviceSheet added={onboarding.devices ?? []} onAdd={add} onClose={() => setAdding(false)} /> : <DevicesSheet onClose={() => setAdding(false)} />)}

      {confirm && (
        <Sheet
          title={confirm.what === "withdraw" ? "Stop sharing your records?" : confirm.what === "renew" ? "Renew permission?" : `Disconnect ${confirm.connection.name}?`}
          onClose={() => setConfirm(null)}
        >
          <SheetText>
            {confirm.what === "withdraw"
              ? "We'll stop collecting new records. What's already in your record stays, and your care team can still see it."
              : confirm.what === "renew"
                ? `We'll keep collecting your records for another ${periodLabel(period)}, starting today.`
                : disconnectText(confirm.connection)}
          </SheetText>
          <View style={styles.actions}>
            {confirm.what === "renew" ? (
              <Button onPress={() => act(confirm)}>Renew</Button>
            ) : (
              <Button variant="destructive" onPress={() => act(confirm)}>
                {confirm.what === "withdraw" ? "Stop sharing" : "Disconnect"}
              </Button>
            )}
            <Button variant="outline" onPress={() => setConfirm(null)}>
              {confirm.what === "renew" ? "Not now" : confirm.what === "withdraw" ? "Keep sharing" : "Keep connected"}
            </Button>
          </View>
        </Sheet>
      )}
    </View>
  )
}

/** A member picks a ring, scale or watch to connect; the ones already
    connected are left out. */
function AddDeviceSheet({ added, onAdd, onClose }: { added: string[]; onAdd: (c: Connection) => void; onClose: () => void }) {
  const left = ADDABLE.filter((d) => !added.includes(d.id))
  return (
    <Sheet title="Add a device" onClose={onClose}>
      {left.length ? (
        <Rows>
          {left.map((d) => (
            <Row key={d.id} icon={<Watch size={16} color={color.primary} />} title={d.name} meta={d.via} gap={10} right={<TextAction onPress={() => onAdd(d)}>Connect</TextAction>} />
          ))}
        </Rows>
      ) : (
        <SheetText>Every device we work with is connected.</SheetText>
      )}
      <Button variant="outline" onPress={onClose}>
        Not now
      </Button>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  actions: { gap: space.item },
})
