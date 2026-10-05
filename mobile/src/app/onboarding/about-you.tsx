import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { FlowScreen } from "@/components/flow"
import { Buildings, CalendarBlank, EnvelopeSimple, MapPin, Phone } from "@/components/ph"
import { Group, Tag, Tile } from "@/components/record-kit"
import { Button } from "@/components/ui"
import { useOnboarding } from "@/lib/onboarding"
import { DEMOGRAPHICS, PATIENT } from "@/lib/patient"
import { card, cardRadius, color, font, hairline, ink, space, type } from "@/lib/theme"

/* Step 1: "Is this you?" The demographics the practice holds, view only,
   laid out as the patient would recognise themselves: who they are first,
   then how to reach them and where they live. They are what the national
   networks match the patient on, so they come from the practice's records. */

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
      hol
      title="Is this you?"
      back={false}
      footer={
        <Button onPress={onConfirm} pending={pending}>
          Continue
        </Button>
      }
    >
      {/* Who they are, as the Profile's identity card (Figma "Hol"). */}
      <View style={styles.identity}>
        <Avatar initials={`${d.firstName[0]}${d.lastName[0]}`} />
        <View style={styles.identityWords}>
          <Text style={styles.name}>
            {d.firstName} {d.lastName}
          </Text>
          <Text style={styles.meta}>
            {[d.preferredName ? `Goes by ${d.preferredName}` : null, SEX[d.sex], `${born.age} years`].filter(Boolean).join(" \u2022 ")}
          </Text>
        </View>
        <Tag tone="primary">From your clinic</Tag>
      </View>

      {/* How to reach them and where they live. */}
      <View style={styles.section}>
        <Text style={styles.label}>Your details</Text>
        <Group>
          <Detail icon={<CalendarBlank />} label="Date of birth" value={born.long} />
          <Detail icon={<Phone />} label="Mobile phone" value={d.phone} />
          <Detail icon={<EnvelopeSimple />} label="Email" value={PATIENT.email} />
          <Detail icon={<MapPin />} label="Home address" value={`${d.street}\n${d.city}, ${d.state} ${d.zip}`} />
        </Group>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Your clinic</Text>
        <Group>
          <Detail icon={<Buildings />} label="Shares your record with you" value={PATIENT.practice} />
        </Group>
      </View>
    </FlowScreen>
  )
}

/** Initials on a teal disc, the size of the Profile's photo. */
function Avatar({ initials }: { initials: string }) {
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  )
}

/** A detail row: a round teal tile, the label over its value. */
function Detail({ icon, label, value }: { icon: React.ReactElement<{ size?: number; color?: string }>; label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Tile>{React.cloneElement(icon, { size: 16, color: color.primary })}</Tile>
      <View style={styles.detailBody}>
        <Text style={styles.meta}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  // Figma "Hol" Profile identity card: the white card, a 40 photo, the name
  // 16 medium over a 12 meta line.
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lead,
    backgroundColor: card.fill,
    borderRadius: cardRadius,
    borderWidth: 1,
    borderColor: hairline.edge,
    padding: space.card,
    boxShadow: card.shadow,
  },
  identityWords: { flex: 1, gap: space.line },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: font.semibold, fontSize: 14, color: color.onPrimary },
  name: { ...type.section, color: ink.content },
  meta: { ...type.label },
  section: { gap: space.item },
  label: { ...type.sectionLabel },
  detail: { flexDirection: "row", alignItems: "flex-start", gap: space.lead, paddingVertical: space.rowY },
  detailBody: { flex: 1, gap: space.stack },
  value: { ...type.title },
})
