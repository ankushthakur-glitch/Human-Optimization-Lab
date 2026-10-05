import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { Image, Pressable, StyleSheet, Text, View } from "react-native"

import { FlowScreen } from "@/components/flow"
import { PageGround, PrimaryButton } from "@/components/hol"
import { billingOf } from "@/components/plan-account-pieces"
import { DevicesSheet } from "@/components/plan-tab-devices"
import {
  Bell,
  CaretRight,
  ChatText,
  CreditCard,
  DownloadSimple,
  EnvelopeSimple,
  Hospital,
  Megaphone,
  ScanSmiley,
  ShieldCheck,
  SignOut,
  Phone,
  Stethoscope,
  Watch,
} from "@/components/ph"
import { Block, Card, SmallAction, toast } from "@/components/record-kit"
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
import { card, cardRadius, color, font, hairline, ink, space, type } from "@/lib/theme"

/* The patient's own page (FINAL-SPEC C.18), drawn as the Figma "Hol"
   Profile (5 Oct 2026, the extended frame): who she is; her doctor and
   practice, a call away; the permission she gave to collect her records
   (until when, stopped by its switch); how she wants to hear from Inlay,
   texts about her care and news and offers as two separate choices (S-57,
   Q-11); her membership, whose billing, pause and cancel live on its own
   page; a watch, ring or scale (coming, never shown as connected); Face
   ID; who has looked at her record and a copy of it; and logging out,
   asked once more in a centred dialog.

   Free, the membership card says so and offers a look at the plan (no
   price, B-06). `?sheet=renew` opens the renewal (the sharing banner's
   "Renew"). */

type Confirm = "withdraw" | "renew"

/** Each choice's icon, Phosphor at 16 in the row's tile. */
const TOPICS: { id: Channel; label: string; icon: React.ReactNode }[] = [
  { id: "push", label: "In the app", icon: <Bell size={16} color={color.primary} /> },
  { id: "sms", label: "Texts about my care", icon: <ChatText size={16} color={color.primary} /> },
  { id: "call", label: "Calls about my care", icon: <Phone size={16} color={color.primary} /> },
  { id: "news", label: "News and offers", icon: <Megaphone size={16} color={color.primary} /> },
  { id: "email", label: "Email", icon: <EnvelopeSimple size={16} color={color.primary} /> },
]

/** Texts about her care, the app and email are on until she turns them
    off; news and offers stay off until she turns them on (Q-11). */
const TOPIC_DEFAULT: Record<Channel, boolean> = { push: true, sms: true, call: true, email: true, news: false }

const DOCTOR = CARE_TEAM[0]

/* --------------------------------------------------------- pieces -- */

/** Figma's switch: a 36 by 20 track, teal when on and light grey when
    off, with a white knob lifted by the xs shadow. */
function Switch({ value, onChange, label }: { value: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      hitSlop={10}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      style={[styles.switch, value && styles.switchOn]}
    >
      <View style={[styles.knob, value && styles.knobOn]} />
    </Pressable>
  )
}

/** The round 28 tile on the teal tint, holding a 16 icon. */
function Tile({ children, tint = color.primaryTint }: { children: React.ReactNode; tint?: string }) {
  return <View style={[styles.tile, { backgroundColor: tint }]}>{children}</View>
}

/** A row in a card: the tile, the title (a line under it when given) and
    whatever sits on the right: a switch, an action, a chevron. */
function Row({
  icon,
  title,
  meta,
  right,
  onPress,
  gap = space.lead,
  regular,
  accessibilityLabel,
}: {
  icon: React.ReactNode
  title: string
  meta?: string
  right?: React.ReactNode
  onPress?: () => void
  /** Tile to words: 10 beside a two line row, 12 on one line, 8 beside a
      switch. */
  gap?: number
  /** The settings' titles are 14 regular in Grey/09; the rest 14 medium in
      Grey/08. */
  regular?: boolean
  accessibilityLabel?: string
}) {
  const body = (
    <>
      <Tile>{icon}</Tile>
      <View style={styles.rowWords}>
        <Text style={regular ? styles.rowTitleRegular : styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        {!!meta && (
          <Text style={styles.rowMeta} numberOfLines={1}>
            {meta}
          </Text>
        )}
      </View>
      {right}
    </>
  )
  if (!onPress) return <View style={[styles.row, { gap }]}>{body}</View>
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} style={({ pressed }) => [styles.row, { gap }, pressed && styles.pressed]}>
      {body}
    </Pressable>
  )
}

const Chevron = () => <CaretRight size={16} color={card.chevron} />

/** A card's rows, split by a hairline with `space` above and below it. */
function Rows({ children, space: room = space.card }: { children: React.ReactNode; space?: number }) {
  const rows = React.Children.toArray(children).filter(Boolean)
  return (
    <Card style={{ gap: room }}>
      {rows.map((row, i) => (
        <React.Fragment key={i}>
          {i > 0 && <View style={styles.rule} />}
          {row}
        </React.Fragment>
      ))}
    </Card>
  )
}

/** A label and its value on one line, as the sharing card lists them. */
function Pair({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.pair}>
      <Text style={styles.pairLabel}>{label}</Text>
      <Text style={styles.pairValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  )
}

/** A setting she turns on or off: the tile, the title, the switch. */
function SwitchRow({ icon, title, value, onChange, regular = true }: { icon: React.ReactNode; title: string; value: boolean; onChange: (on: boolean) => void; regular?: boolean }) {
  return <Row icon={icon} title={title} regular={regular} gap={regular ? space.inline : space.lead} right={<Switch value={value} onChange={onChange} label={title} />} />
}

/* ----------------------------------------------------------- screen -- */

export default function ProfileScreen() {
  const { signOut } = useAuth()
  const onboarding = useOnboarding()
  const { sheet } = useLocalSearchParams<{ sheet?: string }>()
  const { membership, consent, consentAt, profile } = onboarding
  const notify: Record<Channel, boolean> = { ...TOPIC_DEFAULT, ...onboarding.notify }
  const [confirm, setConfirm] = React.useState<Confirm | null>(sheet === "renew" && consent === "signed" ? "renew" : null)
  const [devices, setDevices] = React.useState(false)
  const [noFaceId, setNoFaceId] = React.useState(false)
  const [loggingOut, setLoggingOut] = React.useState(false)
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
        {/* Who she is, on the page's own soft gradient inside a hairline. */}
        <View style={styles.person}>
          <PageGround />
          <Image source={require("../../assets/images/patient-avatar.jpg")} style={styles.photo} accessibilityIgnoresInvertColors />
          <View style={styles.personWords}>
            <Text style={styles.name} accessibilityRole="header" numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {PATIENT.email}
            </Text>
          </View>
        </View>

        <Block title="Your doctor and practice">
          <Rows>
            <Row icon={<Stethoscope size={16} color={color.primary} />} title={DOCTOR.name} meta={`${DOCTOR.role}, ${PATIENT.practice}`} gap={10} />
            <Row
              icon={<Hospital size={16} color={color.primary} />}
              title={PATIENT.practice}
              meta={PATIENT.practicePhone}
              gap={10}
              right={<SmallAction onPress={() => call(PATIENT.practicePhone)}>Call</SmallAction>}
              onPress={() => call(PATIENT.practicePhone)}
              accessibilityLabel={`Call ${PATIENT.practice}, ${PATIENT.practicePhone}`}
            />
          </Rows>
        </Block>

        <Block title="Sharing your records">
          {consent === "signed" ? (
            <Rows>
              <View style={styles.pair}>
                <Text style={[styles.pairLabel, styles.flex]}>{`Until ${rowDate(periodEnd(period, consentAt ? new Date(consentAt) : new Date()))}`}</Text>
                <Switch value onChange={(on) => !on && setConfirm("withdraw")} label="Share my records" />
              </View>
              <Pair label="Signed" value={consentAt ? rowDate(new Date(consentAt)) : "At setup"} />
              <Pair label="For" value={periodLabel(period)} />
              <Pair label="Signed as" value={onboarding.signedAs ?? name} />
              <Pair label="Shared with" value={PATIENT.practice} />
            </Rows>
          ) : (
            <>
              <Rows>
                <View style={styles.pair}>
                  <Text style={[styles.pairLabel, styles.flex]}>Not sharing</Text>
                  <Switch value={false} onChange={(on) => on && router.push("/connect")} label="Share my records" />
                </View>
                {!!off?.on && <Pair label="Turned off" value={off.on} />}
              </Rows>
              <PrimaryButton onPress={() => router.push("/connect")}>Connect my records</PrimaryButton>
            </>
          )}
        </Block>

        <Block title="Messages and notifications">
          <Rows space={14}>
            {TOPICS.map((t) => (
              <SwitchRow key={t.id} icon={t.icon} title={t.label} value={notify[t.id]} onChange={(on) => setTopic(t.id, on)} />
            ))}
          </Rows>
        </Block>

        <Block title="Membership">
          <MembershipCard membership={membership} period={period} />
        </Block>

        <Block title="Devices">
          <Rows>
            <Row
              icon={<Watch size={16} color={color.primary} />}
              title="Watch, ring or scale"
              onPress={() => setDevices(true)}
              accessibilityLabel="Watch, ring or scale, coming soon"
              right={
                <>
                  <View style={styles.soonWrap}>
                    <View style={styles.soon}>
                      <Text style={styles.soonText}>Coming soon</Text>
                    </View>
                  </View>
                  <Chevron />
                </>
              }
            />
          </Rows>
        </Block>

        <Block title="Security">
          <Rows>
            <SwitchRow icon={<ScanSmiley size={16} color={color.primary} />} title="Face ID to open the app" value={!!onboarding.faceId} onChange={setFaceId} regular={false} />
          </Rows>
        </Block>

        <Block title="Privacy">
          <Rows>
            <Row
              icon={<ShieldCheck size={16} color={color.primary} />}
              title="Who has looked at your record"
              right={<Chevron />}
              onPress={() => router.push({ pathname: "/record/[kind]", params: { kind: "access" } })}
            />
            <Row icon={<DownloadSimple size={16} color={color.primary} />} title="Download my record" right={<Chevron />} onPress={() => toast("We'll email you a copy.")} />
          </Rows>
        </Block>

        <Pressable onPress={() => setLoggingOut(true)} accessibilityRole="button" style={({ pressed }) => [styles.logOut, pressed && styles.pressed]}>
          <Tile tint={RED.tint}>
            <SignOut size={16} color={RED.icon} />
          </Tile>
          <Text style={styles.rowTitle}>Log out</Text>
        </Pressable>
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

      {loggingOut && <LogOutDialog onLogOut={signOut} onClose={() => setLoggingOut(false)} />}
    </View>
  )
}

/** Her membership in one card. Free: the plan she is on and a look at the
    Optimization plan (no price). A member: where it stands, opening the
    billing page. */
function MembershipCard({ membership, period }: { membership: ReturnType<typeof useOnboarding>["membership"]; period: string }) {
  const bill = billingOf(membership)
  if (bill.state === "none" || bill.state === "ended")
    return (
      <View style={styles.plan}>
        <PageGround />
        <View style={styles.planWords}>
          <Text style={styles.planLabel}>Plan</Text>
          <View style={styles.planLine}>
            <Text style={styles.planValue}>{TIERS.free.name}</Text>
            <View style={styles.planDot} />
            <Text style={styles.planValue}>{periodLabel(period)}</Text>
          </View>
        </View>
        <Pressable
          onPress={() => router.push({ pathname: "/plans", params: { from: "profile" } })}
          accessibilityRole="button"
          style={({ pressed }) => [styles.planLink, pressed && styles.pressed]}
        >
          <Text style={styles.planLinkText}>See the Optimization plan</Text>
        </Pressable>
      </View>
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
    <Rows>
      <Row icon={<CreditCard size={16} color={color.primary} />} title={TIERS.optimization.name} meta={meta} gap={10} right={<Chevron />} onPress={() => router.push("/membership")} />
    </Rows>
  )
}

/** "Are you sure you want to log out?", centred over the page: the red
    tile, the question, what signing in again takes, a red "Log Out" and
    "Not now". */
function LogOutDialog({ onLogOut, onClose }: { onLogOut: () => void; onClose: () => void }) {
  return (
    <View style={styles.dialogLayer}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.dialog} accessibilityViewIsModal>
        <View style={styles.dialogHead}>
          <View style={styles.dialogTile}>
            <SignOut size={18.3} color={RED.icon} />
          </View>
          <Text style={styles.dialogTitle} accessibilityRole="header">
            Are you sure you want to log out?
          </Text>
          <Text style={styles.dialogText}>You'll need to verify your identity using an OTP the next time you sign in.</Text>
        </View>
        <View style={styles.dialogActions}>
          <Pressable onPress={onLogOut} accessibilityRole="button" style={({ pressed }) => [styles.dialogButton, styles.dialogDanger, pressed && styles.pressed]}>
            <Text style={styles.dialogDangerText}>Log Out</Text>
          </Pressable>
          <Pressable onPress={onClose} accessibilityRole="button" style={({ pressed }) => [styles.dialogButton, pressed && styles.pressed]}>
            <Text style={styles.dialogQuietText}>Not now</Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

/** Figma's error ramp: the log out row's tint and edge, its tile and icon,
    and the dialog's button. */
const RED = { ground: "#FFF9F9", edge: "#F8D7DA", tint: color.highTint, icon: "#D9363E", button: "#C72B32" } as const

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },

  // Her card: a 1 pt hairline, radius 12, 12 inside it.
  person: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: hairline.edge,
    overflow: "hidden",
  },
  photo: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: hairline.rule },
  personWords: { flex: 1, gap: space.line },
  name: { ...type.section },
  email: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: ink.secondary },

  rule: { height: 0.8, backgroundColor: hairline.rule },

  row: { flexDirection: "row", alignItems: "center" },
  tile: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  rowWords: { flex: 1, gap: space.stack },
  rowTitle: { ...type.title, color: ink.detail },
  rowTitleRegular: { ...type.body, color: ink.content },
  rowMeta: { ...type.label },

  pair: { flexDirection: "row", alignItems: "center", gap: space.inline, minHeight: type.body.lineHeight },
  pairLabel: { flex: 1, ...type.body },
  pairValue: { flexShrink: 1, ...type.title, color: ink.detail, textAlign: "right" },

  switch: { width: 36, height: 20, borderRadius: 10, backgroundColor: "#EBEBEB", padding: 2 },
  switchOn: { backgroundColor: color.primary },
  knob: { width: 16, height: 16, borderRadius: 8, backgroundColor: color.background, boxShadow: "0 1px 3px rgba(16, 24, 40, 0.1), 0 1px 2px rgba(16, 24, 40, 0.06)" },
  knobOn: { transform: [{ translateX: 16 }] },

  // "Coming soon" right after the title, the chevron at the far end.
  soonWrap: { flex: 1, alignItems: "flex-start" },
  soon: { paddingHorizontal: space.inline, paddingVertical: space.line, borderRadius: 16, borderWidth: 1, borderColor: "rgba(80, 80, 80, 0.04)", backgroundColor: "#F7F7F7" },
  soonText: { ...type.tag, color: ink.secondary },

  // Free: the plan on the page's gradient inside a hairline, its link a
  // lifted white pill.
  plan: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.item,
    minHeight: 53,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: hairline.edge,
    overflow: "hidden",
  },
  planWords: { flex: 1, gap: space.stack },
  planLabel: { ...type.label, color: ink.detail },
  planLine: { flexDirection: "row", alignItems: "center", gap: space.mark },
  planValue: { ...type.metaStrong, color: ink.strong },
  planDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#BEBEC2" },
  planLink: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: "rgba(255, 255, 255, 0.7)", boxShadow: "2px 4px 12px rgba(0, 0, 0, 0.06)" },
  planLinkText: { ...type.action },

  logOut: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inline,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: RED.edge,
    backgroundColor: RED.ground,
    boxShadow: card.shadowXs,
  },

  actions: { gap: space.item },

  dialogLayer: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", paddingHorizontal: 26 },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0, 0, 0, 0.3)" },
  dialog: {
    width: "100%",
    maxWidth: 340,
    gap: space.section,
    paddingTop: space.gutter,
    paddingBottom: space.section,
    paddingHorizontal: space.gutter,
    borderRadius: cardRadius,
    backgroundColor: color.background,
  },
  dialogHead: { alignItems: "center", gap: space.inline },
  dialogTile: { width: 32, height: 32, borderRadius: 16, backgroundColor: RED.tint, alignItems: "center", justifyContent: "center" },
  dialogTitle: { ...type.section, textAlign: "center" },
  dialogText: { ...type.body, color: ink.secondary, textAlign: "center" },
  dialogActions: { gap: space.item },
  dialogButton: { height: 40, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  dialogDanger: { backgroundColor: RED.button, borderWidth: 1, borderColor: RED.button, boxShadow: card.shadowXs },
  dialogDangerText: { fontFamily: font.medium, fontSize: 16, lineHeight: 20, color: color.onPrimary },
  dialogQuietText: { fontFamily: font.medium, fontSize: 16, lineHeight: 20, color: ink.detail },
})
