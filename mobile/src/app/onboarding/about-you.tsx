import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg"

import { FlowScreen } from "@/components/flow"
import { IconCalendar, IconMail, IconPhone, IconPin, IconShield } from "@/components/icons"
import { RecordIcon } from "@/components/record-icons"
import { Button } from "@/components/ui"
import { useOnboarding } from "@/lib/onboarding"
import { DEMOGRAPHICS, PATIENT } from "@/lib/patient"
import { color, font } from "@/lib/theme"

/* Step 1: "Is this you?" The demographics the practice holds, view only,
   laid out as the patient would recognise themselves: who they are first,
   then how to reach them and where they live. They are what the national
   networks match the patient on, so they come from the practice's records;
   a patient who spots a mistake is pointed to the clinic to fix it. */

const SEX = { female: "Female", male: "Male" } as const
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

/** "03/14/1981" → "March 14, 1981" and the age today. */
function birth(mmddyyyy: string) {
  const [m, d, y] = mmddyyyy.split("/").map(Number)
  const now = new Date()
  const age = now.getFullYear() - y - (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d) ? 1 : 0)
  return { long: `${MONTHS[m - 1]} ${d}, ${y}`, age }
}

export default function AboutYouScreen() {
  const onboarding = useOnboarding()
  const [pending, setPending] = React.useState(false)
  const [wrong, setWrong] = React.useState(false)
  const d = DEMOGRAPHICS
  const born = birth(d.dateOfBirth)

  async function onConfirm() {
    setPending(true)
    await onboarding.save({ profile: { ...d }, step: onboarding.step === "about" ? "consent" : onboarding.step })
    setPending(false)
    router.push("/onboarding/consent")
  }

  return (
    <FlowScreen
      title="Is this you?"
      back={false}
      footer={
        <>
          {wrong && (
            <View style={styles.notice} accessibilityRole="alert">
              <Text style={styles.noticeText}>
                Call {PATIENT.practice} at <Text style={styles.noticeStrong}>{PATIENT.practicePhone.replace("-", "\u2011")}</Text> and
                they'll update your details.
              </Text>
            </View>
          )}
          <Button onPress={onConfirm} pending={pending}>
            Yes, this is me
          </Button>
          <Pressable
            onPress={() => setWrong((v) => !v)}
            hitSlop={6}
            accessibilityRole="button"
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryText}>Something's not right</Text>
          </Pressable>
        </>
      }
    >
      {/* Who they are. */}
      <View style={styles.profile}>
        <View style={styles.source}>
          <IconShield size={14} color={color.primary} />
          <Text style={styles.sourceText}>From your clinic</Text>
        </View>
        <Avatar initials={`${d.firstName[0]}${d.lastName[0]}`} />
        <Text style={styles.name}>
          {d.firstName} {d.lastName}
        </Text>
        {!!d.preferredName && <Text style={styles.goesBy}>Goes by {d.preferredName}</Text>}
        <View style={styles.chips}>
          <Text style={styles.chip}>{SEX[d.sex]}</Text>
          <Text style={styles.chip}>{born.age} years</Text>
        </View>
      </View>

      {/* How to reach them and where they live. */}
      <View style={styles.list}>
        <Detail icon={<IconCalendar color={color.primary} />} label="Date of birth" value={born.long} />
        <Detail icon={<IconPhone color={color.primary} />} label="Mobile phone" value={d.phone} />
        <Detail icon={<IconMail color={color.primary} />} label="Email" value={PATIENT.email} />
        <Detail
          icon={<IconPin color={color.primary} />}
          label="Home address"
          value={`${d.street}\n${d.city}, ${d.state} ${d.zip}`}
          last
        />
      </View>

      <View style={styles.clinic}>
        <View style={styles.clinicIcon}>
          <RecordIcon name="clinic" size={20} color={color.onPrimary} />
        </View>
        <View style={styles.detailBody}>
          <Text style={styles.detailLabel}>Your clinic</Text>
          <Text style={styles.detailValue}>{PATIENT.practice}</Text>
        </View>
      </View>
    </FlowScreen>
  )
}

/** Initials on a teal gradient disc, with a soft halo. */
function Avatar({ initials }: { initials: string }) {
  return (
    <View style={styles.avatarHalo}>
      <View style={styles.avatar}>
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 76 76">
          <Defs>
            <LinearGradient id="avatarFill" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#1FA59F" />
              <Stop offset="1" stopColor="#015E5A" />
            </LinearGradient>
          </Defs>
          <Rect width="76" height="76" rx="38" fill="url(#avatarFill)" />
        </Svg>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
    </View>
  )
}

function Detail({ icon, label, value, last }: { icon: React.ReactNode; label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.detail, !last && styles.rule]}>
      <View style={styles.detailIcon}>{icon}</View>
      <View style={styles.detailBody}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.6 },

  profile: {
    alignItems: "center",
    backgroundColor: color.canvas,
    borderRadius: 24,
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 16,
  },
  source: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: color.background,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  sourceText: { fontFamily: font.medium, fontSize: 12, color: color.primary },
  avatarHalo: { padding: 6, borderRadius: 50, backgroundColor: color.primaryTint },
  avatar: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarText: { fontFamily: font.semibold, fontSize: 26, letterSpacing: -0.5, color: color.onPrimary },
  name: { fontFamily: font.semibold, fontSize: 22, letterSpacing: -0.5, color: color.text, marginTop: 14 },
  goesBy: { fontFamily: font.regular, fontSize: 15, color: color.muted, marginTop: 2 },
  chips: { flexDirection: "row", gap: 8, marginTop: 14 },
  chip: {
    fontFamily: font.medium,
    fontSize: 13,
    color: color.text,
    backgroundColor: color.background,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    overflow: "hidden",
  },

  list: { borderWidth: 1, borderColor: color.border, borderRadius: 20, paddingHorizontal: 16 },
  rule: { borderBottomWidth: 1, borderBottomColor: color.border },
  detail: { flexDirection: "row", alignItems: "flex-start", gap: 14, paddingVertical: 14 },
  detailIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: color.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  detailBody: { flex: 1, gap: 2, justifyContent: "center", minHeight: 38 },
  detailLabel: { fontFamily: font.regular, fontSize: 13, color: color.muted },
  detailValue: { fontFamily: font.medium, fontSize: 15, lineHeight: 21, color: color.text },

  clinic: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: color.primaryTint,
    borderRadius: 20,
    padding: 16,
  },
  clinicIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: color.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  notice: { backgroundColor: color.canvas, borderRadius: 14, padding: 12 },
  noticeText: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.text, textAlign: "center" },
  noticeStrong: { fontFamily: font.semibold, color: color.primary },
  secondary: { alignItems: "center", paddingVertical: 8 },
  secondaryText: { fontFamily: font.semibold, fontSize: 15, color: color.primary },
})
