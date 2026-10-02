import Doctor01Icon from "@hugeicons/core-free-icons/Doctor01Icon"
import Download04Icon from "@hugeicons/core-free-icons/Download04Icon"
import Megaphone01Icon from "@hugeicons/core-free-icons/Megaphone01Icon"
import Message01Icon from "@hugeicons/core-free-icons/Message01Icon"
import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { Image, Platform, StyleSheet, Switch, Text, View } from "react-native"

import { keepTogether } from "@/components/care-gap"
import { FlowScreen } from "@/components/flow"
import { HugeIcon, type IconSvgObject } from "@/components/hugeicon"
import { IconBell, IconCard, IconFaceId, IconMail, IconShield, IconWatch } from "@/components/icons"
import { billingOf } from "@/components/plan-account-pieces"
import { DevicesSheet } from "@/components/plan-tab-devices"
import { RecordIcon } from "@/components/record-icons"
import { Block, Card, Group, KeyValue, NeedsRow, SeeAllRow, SmallAction, Tile, toast } from "@/components/record-kit"
import { Sheet, SheetText } from "@/components/sheet"
import { Button } from "@/components/ui"
import { useAuth } from "@/lib/auth"
import { DEFAULT_PERIOD, periodEnd, periodLabel } from "@/lib/consent"
import { rowDate } from "@/lib/dates"
import { sharingOff } from "@/lib/experience"
import { checkFaceId, faceIdAvailable } from "@/lib/face-id"
import { call } from "@/lib/links"
import { useOnboarding, type Channel } from "@/lib/onboarding"
import { CARE_TEAM, PATIENT } from "@/lib/patient"
import { TIERS } from "@/lib/plans"
import { color, hairline, space, type } from "@/lib/theme"

/* The patient's own page (FINAL-SPEC C.18), in the catalog's order (S-49):
   who she is; her doctor and practice, a call away; the permission she
   gave to collect her records (until when, renewed by her each period,
   stopped a tap away); how she wants to hear from Inlay, with texts about
   her care and news and offers as two separate choices (S-57, Q-11); her
   membership, whose billing, pause and cancel live on its own page; a
   watch, ring or scale (coming, never shown as connected); Face ID; who
   has looked at her record and a copy of it; and signing out.

   Free, the membership group says so and offers a look at the plan (no
   price, B-06). `?sheet=renew` opens the renewal (the sharing banner's
   "Renew"). */

type Confirm = "withdraw" | "renew"

const TOPICS: { id: Channel; label: string; icon: React.ReactNode }[] = [
  { id: "push", label: "In the app", icon: <IconBell size={18} color={color.primary} /> },
  { id: "sms", label: "Texts about my care", icon: <Glyph icon={Message01Icon} /> },
  { id: "news", label: "News and offers", icon: <Glyph icon={Megaphone01Icon} /> },
  { id: "email", label: "Email", icon: <IconMail size={18} color={color.primary} /> },
]

/** Texts about her care, the app and email are on until she turns them
    off; news and offers stay off until she turns them on (Q-11). */
const TOPIC_DEFAULT: Record<Channel, boolean> = { push: true, sms: true, email: true, news: false }

const DOCTOR = CARE_TEAM[0]

function Glyph({ icon }: { icon: IconSvgObject }) {
  return <HugeIcon icon={icon} size={18} color={color.primary} />
}

/* The web build's switch paints its "on" knob in its own green unless told
   (react-native-web's activeThumbColor); a phone uses thumbColor for both. */
const WHITE_KNOB_ON = (Platform.OS === "web" ? { activeThumbColor: color.background } : {}) as object

/** A switch in the app's colours: a white knob on teal when on. */
function Toggle({ value, onChange, label }: { value: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ true: color.primary, false: color.border }}
      thumbColor={color.background}
      ios_backgroundColor={color.border}
      accessibilityLabel={label}
      {...WHITE_KNOB_ON}
    />
  )
}

/** A setting she turns on or off, drawn as the kit's row beside it (its
    teal tile, the title, a row's room above and below) with the switch on
    the right. The switch stays its own control, named by the title, so a
    screen reader reaches it (the kit's row reads as one element). */
function SwitchRow({ icon, title, value, onChange }: { icon: React.ReactNode; title: string; value: boolean; onChange: (on: boolean) => void }) {
  return (
    <View style={styles.switchRow}>
      <Tile hue="teal">{icon}</Tile>
      <Text style={styles.switchTitle}>{keepTogether(title)}</Text>
      <Toggle value={value} onChange={onChange} label={title} />
    </View>
  )
}

export default function ProfileScreen() {
  const { signOut } = useAuth()
  const onboarding = useOnboarding()
  const { sheet } = useLocalSearchParams<{ sheet?: string }>()
  const { membership, consent, consentAt, profile } = onboarding
  const notify: Record<Channel, boolean> = { ...TOPIC_DEFAULT, ...onboarding.notify }
  const [confirm, setConfirm] = React.useState<Confirm | null>(sheet === "renew" && consent === "signed" ? "renew" : null)
  const [devices, setDevices] = React.useState(false)
  const [noFaceId, setNoFaceId] = React.useState(false)
  const name = `${profile?.firstName ?? PATIENT.firstName} ${profile?.lastName ?? PATIENT.lastName}`
  const period = onboarding.consentPeriod ?? DEFAULT_PERIOD
  const off = sharingOff(onboarding)

  async function act(what: Confirm) {
    // Stopping keeps everything collected; the day is kept for the banner
    // every tab shows (C.28).
    if (what === "withdraw") await onboarding.save({ consent: "declined", sharingOffAt: new Date().toISOString() })
    if (what === "renew") await onboarding.save({ consentAt: new Date().toISOString() })
    setConfirm(null)
    toast(what === "withdraw" ? "Sharing turned off" : "Sharing renewed")
  }

  function setTopic(id: Channel, on: boolean) {
    onboarding.save({ notify: { ...notify, [id]: on } })
  }

  /* Turning it on checks her face once, so it's known to work before the
     app starts asking for it. */
  async function setFaceId(on: boolean) {
    if (!on) return onboarding.save({ faceId: false })
    if (!(await faceIdAvailable())) return setNoFaceId(true)
    if (await checkFaceId("Turn on Face ID")) await onboarding.save({ faceId: true })
  }

  return (
    <View style={styles.fill}>
      <FlowScreen page title="Profile">
        <Card style={styles.person}>
          <Image source={require("../../assets/images/patient-avatar.jpg")} style={styles.photo} accessibilityIgnoresInvertColors />
          <View style={styles.personWords}>
            <Text style={type.section} accessibilityRole="header">
              {name}
            </Text>
            <Text style={type.label} numberOfLines={1}>
              {PATIENT.email}
            </Text>
          </View>
        </Card>

        <Block title="Your doctor and practice">
          <Group>
            <NeedsRow icon={<Glyph icon={Doctor01Icon} />} title={DOCTOR.name} meta={`${DOCTOR.role}, ${PATIENT.practice}`} />
            <NeedsRow
              icon={<RecordIcon name="clinic" size={18} color={color.primary} />}
              title={PATIENT.practice}
              meta={PATIENT.practicePhone}
              right={<SmallAction onPress={() => call(PATIENT.practicePhone)}>Call</SmallAction>}
              chevron={false}
              onPress={() => call(PATIENT.practicePhone)}
              accessibilityLabel={`Call ${PATIENT.practice}, ${PATIENT.practicePhone}`}
            />
          </Group>
        </Block>

        <Block title="Sharing your records">
          {consent === "signed" ? (
            <>
              <Card style={styles.rows}>
                <View style={[styles.status, styles.rule]}>
                  <Text style={[type.title, styles.flex]}>{`Until ${rowDate(periodEnd(period, consentAt ? new Date(consentAt) : new Date()))}`}</Text>
                  <Toggle value onChange={(on) => !on && setConfirm("withdraw")} label="Share my records" />
                </View>
                <KeyValue label="Signed" value={consentAt ? rowDate(new Date(consentAt)) : "At setup"} />
                <KeyValue label="For" value={periodLabel(period)} />
                <KeyValue label="Signed as" value={onboarding.signedAs ?? name} />
                <KeyValue label="Shared with" value={PATIENT.practice} last />
              </Card>
              <Button variant="outline" onPress={() => setConfirm("renew")}>
                Renew
              </Button>
            </>
          ) : (
            <>
              <Card style={styles.status}>
                <View style={styles.statusWords}>
                  <Text style={type.title}>Not sharing</Text>
                  {!!off?.on && <Text style={type.meta}>{`Turned off on ${off.on}`}</Text>}
                </View>
                <Toggle value={false} onChange={(on) => on && router.push("/connect")} label="Share my records" />
              </Card>
              <Text style={styles.note}>Nothing new is being collected. What was already in your record stays there.</Text>
              <Button onPress={() => router.push("/connect")}>Connect my records</Button>
            </>
          )}
        </Block>

        <Block title="Messages and notifications">
          <Group>
            {TOPICS.map((t) => (
              <SwitchRow key={t.id} icon={t.icon} title={t.label} value={notify[t.id]} onChange={(on) => setTopic(t.id, on)} />
            ))}
          </Group>
        </Block>

        <Block title="Membership">
          <MembershipGroup membership={membership} />
        </Block>

        <Block title="Devices">
          <Group>
            <NeedsRow
              icon={<IconWatch size={18} color={color.primary} />}
              title="Watch, ring or scale"
              tag={{ tone: "muted", label: "Coming soon" }}
              onPress={() => setDevices(true)}
            />
          </Group>
        </Block>

        <Block title="Security">
          <Group>
            <SwitchRow icon={<IconFaceId size={18} color={color.primary} />} title="Face ID to open the app" value={!!onboarding.faceId} onChange={setFaceId} />
          </Group>
        </Block>

        <Block title="Privacy">
          <Group>
            <NeedsRow
              icon={<IconShield size={18} color={color.primary} />}
              title="Who has looked at your record"
              onPress={() => router.push({ pathname: "/record/[kind]", params: { kind: "access" } })}
            />
            <NeedsRow icon={<Glyph icon={Download04Icon} />} title="Download my record" onPress={() => toast("We'll email you a copy.")} />
          </Group>
        </Block>

        <Button variant="destructive" onPress={signOut}>
          Sign out
        </Button>
      </FlowScreen>

      {devices && <DevicesSheet onClose={() => setDevices(false)} />}

      {noFaceId && (
        <Sheet title="Face ID isn't set up" onClose={() => setNoFaceId(false)}>
          <SheetText>Set up Face ID in your phone's settings, then turn it on here.</SheetText>
          <Button onPress={() => setNoFaceId(false)}>OK</Button>
        </Sheet>
      )}

      {confirm && (
        <Sheet title={confirm === "withdraw" ? "Stop sharing your records?" : "Renew permission?"} onClose={() => setConfirm(null)}>
          <SheetText>
            {confirm === "withdraw"
              ? "We'll stop collecting new records. What's already in your record stays, and your care team can still see it."
              : `We'll keep collecting your records for another ${periodLabel(period)}, starting today.`}
          </SheetText>
          <View style={styles.actions}>
            <Button onPress={() => act(confirm)}>{confirm === "withdraw" ? "Stop sharing" : "Renew"}</Button>
            <Button variant="outline" onPress={() => setConfirm(null)}>
              {confirm === "renew" ? "Not now" : "Keep sharing"}
            </Button>
          </View>
        </Sheet>
      )}
    </View>
  )
}

/** Her membership in one line: free, with a look at the plan (no price);
    a member, with where it stands, opening the billing page. */
function MembershipGroup({ membership }: { membership: ReturnType<typeof useOnboarding>["membership"] }) {
  const bill = billingOf(membership)
  if (bill.state === "none" || bill.state === "ended")
    return (
      <Card style={styles.linkCard}>
        <KeyValue label="Plan" value={TIERS.free.name} last />
        <View style={styles.cardLink}>
          <SeeAllRow label="See the Optimization plan" onPress={() => router.push({ pathname: "/plans", params: { from: "profile" } })} />
        </View>
      </Card>
    )
  const meta =
    bill.state === "paused"
      ? "Paused"
      : bill.state === "ending"
        ? `Ends ${bill.ends ? rowDate(bill.ends) : "this month"}`
        : bill.state === "waiting"
          ? "Active, first payment when your plan is approved"
          : `Active${bill.next ? `, next payment ${rowDate(bill.next)}` : ""}`
  return (
    <Group>
      <NeedsRow icon={<IconCard size={18} color={color.primary} />} title={TIERS.optimization.name} meta={meta} onPress={() => router.push("/membership")} />
    </Group>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },

  person: { flexDirection: "row", alignItems: "center", gap: space.lead },
  photo: { width: 56, height: 56, borderRadius: 28 },
  // Her name over her email, as a 16 pt title over its line.
  personWords: { flex: 1, gap: space.stack },

  // Rows edge to edge: each row's own room above and below makes up the
  // card's padding.
  rows: { paddingVertical: space.card - space.rowY },
  // Where her sharing stands, with its switch: a row's room above and
  // below, like the rows under it.
  status: { flexDirection: "row", alignItems: "center", gap: space.item, paddingVertical: space.rowY },
  statusWords: { flex: 1, gap: space.line },
  rule: { borderBottomWidth: 1, borderBottomColor: hairline.rule },
  note: { ...type.label },

  // The kit's row with the switch in place of the chevron.
  switchRow: { flexDirection: "row", alignItems: "center", gap: space.lead, paddingVertical: space.rowY },
  switchTitle: { ...type.title, flex: 1 },

  linkCard: { paddingVertical: 0 },
  cardLink: { borderTopWidth: 1, borderTopColor: hairline.rule },

  actions: { gap: space.item },
})
