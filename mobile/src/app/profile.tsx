import { router } from "expo-router"
import * as React from "react"
import { Image, Pressable, StyleSheet, Text, View } from "react-native"

import { ChangePasswordSheet } from "@/components/change-password-sheet"
import { FlowScreen } from "@/components/flow"
import { PageGround } from "@/components/hol"
import { billingOf } from "@/components/plan-account-pieces"
import { DevicesSheet } from "@/components/plan-tab-devices"
import {
  BellSimple,
  CreditCard,
  DownloadSimple,
  Heart,
  Hospital,
  Key,
  Lock,
  Plus,
  ScanSmiley,
  SignOut,
  Stethoscope,
  Watch,
} from "@/components/ph"
import { Block, SmallAction, Tag, toast } from "@/components/record-kit"
import { Chevron, Row, Rows, SwitchRow, Tile, rowTitle } from "@/components/settings-rows"
import { Sheet, SheetText } from "@/components/sheet"
import { Button } from "@/components/ui"
import { useAuth } from "@/lib/auth"
import { connectedCount, connectionsOf } from "@/lib/access"
import { DEFAULT_PERIOD, periodLabel } from "@/lib/consent"
import { rowDate } from "@/lib/dates"
import { checkFaceId, faceIdAvailable } from "@/lib/face-id"
import { call } from "@/lib/links"
import { useOnboarding } from "@/lib/onboarding"
import { CARE_TEAM, PATIENT } from "@/lib/patient"
import { TIERS } from "@/lib/plans"
import { card, cardRadius, color, font, hairline, ink, space, type } from "@/lib/theme"

/* The patient's own page (FINAL-SPEC C.18), drawn as the Figma "Hol"
   Profile (5 Oct 2026, the extended frame): who she is; her doctor and
   practice, a call away; how she wants to hear from Inlay,
   texts about her care and news and offers as two separate choices (S-57,
   Q-11); her membership, whose billing, pause and cancel live on its own
   page, and her plan settings one tap deeper; for a member her devices (Apple Health, her watch, any ring or
   scale) and "Add a device" (29 Oct 2026); change password; Face
   ID; Access, one tap deeper, where the permission to collect her records
   and everything connected live (5 Oct 2026 call); who has looked at her
   record and a copy of it; and logging out, asked once more in a centred
   dialog.

   Free, the membership card says so and offers a look at the plan (no
   price, B-06). */

const DOCTOR = CARE_TEAM[0]

/* ----------------------------------------------------------- screen -- */

export default function ProfileScreen() {
  const { signOut } = useAuth()
  const onboarding = useOnboarding()
  const { membership, consent, profile } = onboarding
  const bill = billingOf(membership)
  const paid = bill.state !== "none" && bill.state !== "ended"
  const [devices, setDevices] = React.useState(false)
  const [password, setPassword] = React.useState(false)
  const [noFaceId, setNoFaceId] = React.useState(false)
  const [loggingOut, setLoggingOut] = React.useState(false)
  const name = `${profile?.firstName ?? PATIENT.firstName} ${profile?.lastName ?? PATIENT.lastName}`
  const period = onboarding.consentPeriod ?? DEFAULT_PERIOD
  const access = consent !== "signed" ? "Not sharing" : `${connectedCount(onboarding, paid)} connected`

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

        <Block title="Membership">
          <MembershipCard membership={membership} period={period} />
        </Block>

        {/* Devices are part of the paid plan (user, 5 Oct 2026): a member
            connects them here; a free patient sees the row with its badge,
            which opens what the plan adds (29 Oct 2026). */}
        <Block title="Devices">
          {paid ? (
            <Rows>
              {connectionsOf(onboarding, paid)
                .filter((c) => c.kind === "device")
                .map((c) => {
                  const Icon = c.id === "apple-health" ? Heart : Watch
                  return <Row key={c.id} icon={<Icon size={16} color={color.primary} />} title={c.name} meta={c.via} gap={10} />
                })}
              <Row icon={<Plus size={16} color={color.primary} />} title="Add a device" right={<Chevron />} onPress={() => setDevices(true)} />
            </Rows>
          ) : (
            <Rows>
              <Row
                icon={<Watch size={16} color={color.primary} />}
                title="Watch, ring or scale"
                gap={10}
                onPress={() => setDevices(true)}
                accessibilityLabel="Watch, ring or scale, included in paid plan"
                right={
                  <>
                    {/* Tag sits at the top of its column; the View centres it on the row. */}
                    <View>
                      <Tag tone="primary">Included in paid plan</Tag>
                    </View>
                    <Chevron />
                  </>
                }
              />
            </Rows>
          )}
        </Block>

        <Block title="Security">
          <Rows>
            <Row icon={<Key size={16} color={color.primary} />} title="Change password" right={<Chevron />} onPress={() => setPassword(true)} />
            <SwitchRow icon={<ScanSmiley size={16} color={color.primary} />} title="Face ID to open the app" value={!!onboarding.faceId} onChange={setFaceId} regular={false} />
          </Rows>
        </Block>

        <Block title="Privacy">
          <Rows>
            <Row icon={<Lock size={16} color={color.primary} />} title="Access" meta={access} gap={10} right={<Chevron />} onPress={() => router.push("/access")} accessibilityLabel={`Access, ${access}`} />
            <Row icon={<DownloadSimple size={16} color={color.primary} />} title="Download my record" right={<Chevron />} onPress={() => toast("We'll email you a copy.")} />
          </Rows>
        </Block>

        <Pressable onPress={() => setLoggingOut(true)} accessibilityRole="button" style={({ pressed }) => [styles.logOut, pressed && styles.pressed]}>
          <Tile tint={RED.tint}>
            <SignOut size={16} color={RED.icon} />
          </Tile>
          <Text style={rowTitle}>Log out</Text>
        </Pressable>
      </FlowScreen>

      {devices && <DevicesSheet onClose={() => setDevices(false)} />}
      {password && <ChangePasswordSheet onClose={() => setPassword(false)} />}

      {noFaceId && (
        <Sheet title="Face ID isn't set up" onClose={() => setNoFaceId(false)}>
          <SheetText>Set up Face ID in your phone's settings, then turn it on here.</SheetText>
          <Button onPress={() => setNoFaceId(false)}>OK</Button>
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
          onPress={() => router.push("/plan")}
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
      <Row icon={<BellSimple size={16} color={color.primary} />} title="Plan settings" meta="Reminders, notifications and units" gap={10} right={<Chevron />} onPress={() => router.push("/plan-settings")} />
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
            <Text style={styles.dialogDangerText}>Log out</Text>
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
