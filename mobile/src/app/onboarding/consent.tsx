import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { Card, Checkbox, FlowScreen, Section, SoftOrb } from "@/components/flow"
import { IconChevronRight, IconShield } from "@/components/icons"
import { RecordIcon } from "@/components/record-icons"
import { Button } from "@/components/ui"
import { useOnboarding } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { DATA_TYPES } from "@/lib/record"
import { color, font } from "@/lib/theme"

/* Step 2: the one consent. What HOL collects and from where, in plain words,
   the full authorization a tap away, and a tick that signs it as the
   signed-in patient. Nothing
   medical is read before this is signed. Sample wording until HOL's lawyer
   returns the final form (same text as the web prototype's consent). */

const LEGAL = [
  `I authorize Human Optimization Lab (HOL) to request, receive and store my health records from my healthcare providers, hospitals, laboratories and imaging centers, through national health information networks, and to share them with ${PATIENT.practice} for my care.`,
  "This includes visit notes, lab results, medications, conditions, allergies, procedures, immunizations and reports. It may include sensitive information such as mental health or substance use records where the law allows.",
  "HOL protects this information as required by HIPAA. Information shared under this authorization may no longer be protected by federal privacy law if it is disclosed again by the recipient.",
  "This authorization stays in effect until I withdraw it. I can withdraw it at any time in the app, which stops future collection but does not undo information already shared.",
  "My treatment by my practice does not depend on signing this authorization.",
]

export default function ConsentScreen() {
  const onboarding = useOnboarding()
  const [agreed, setAgreed] = React.useState(false)
  const [full, setFull] = React.useState(false)
  // Tapped Sign without ticking the box: say so beside it.
  const [missing, setMissing] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const legalName = `${onboarding.profile?.firstName ?? PATIENT.firstName} ${onboarding.profile?.lastName ?? PATIENT.lastName}`

  async function onSign() {
    if (!agreed) {
      setMissing(true)
      return
    }
    setPending(true)
    await onboarding.save({ signedAs: legalName, step: "records" })
    // No way back to an unsigned form: the record starts building.
    router.replace("/onboarding/syncing")
  }

  return (
    <FlowScreen
      step={2}
      title="Connect your health records"
      art={<SoftOrb size={140} />}
      footer={
        <>
          {/* In the pinned footer, so signing never needs a scroll. */}
          <Checkbox
            checked={agreed}
            onChange={(v) => {
              setAgreed(v)
              setMissing(false)
            }}
          >
            I agree to share my health records with my care team
          </Checkbox>
          {missing && (
            <Text style={styles.missing} accessibilityRole="alert">
              Tick the box to agree first.
            </Text>
          )}
          <Button onPress={onSign} pending={pending}>
            Agree and connect
          </Button>
        </>
      }
    >
      <Card>
        <View style={styles.promise}>
          <IconShield color={color.primary} size={22} />
          <Text style={styles.promiseText}>
            Only you and your care team at {PATIENT.practice} see your records. HOL never sells your data, and you can
            withdraw at any time.
          </Text>
        </View>
      </Card>

      <Section title="What we collect">
        <View style={styles.grid}>
          {DATA_TYPES.map((t) => (
            <View key={t.key} style={styles.gridItem}>
              <View style={styles.tick}>
                <RecordIcon name={t.icon} size={16} color={color.primary} />
              </View>
              <Text style={styles.gridText}>{t.label}</Text>
            </View>
          ))}
        </View>
      </Section>

      {/* The full text, one tap away. Ticking the box below is the signature,
          made as the signed-in patient. */}
      <View style={styles.doc}>
        <Pressable
          onPress={() => setFull((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: full }}
          style={({ pressed }) => [styles.docRow, pressed && { opacity: 0.7 }]}
        >
          <View style={styles.docIcon}>
            <RecordIcon name="documents" size={18} color={color.primary} />
          </View>
          <View style={styles.docBody}>
            <Text style={styles.docTitle}>HIPAA authorization</Text>
            <Text style={styles.docMeta}>{full ? "Hide" : "Read in full"}</Text>
          </View>
          <View style={{ transform: [{ rotate: full ? "90deg" : "0deg" }] }}>
            <IconChevronRight color={color.muted} />
          </View>
        </Pressable>
        {full && (
          <View style={styles.legal}>
            {LEGAL.map((p) => (
              <Text key={p} style={styles.legalText}>
                {p}
              </Text>
            ))}
          </View>
        )}
      </View>
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  promise: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  promiseText: { flex: 1, fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: color.text },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: 12 },
  gridItem: { width: "50%", flexDirection: "row", alignItems: "center", gap: 10 },
  tick: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: color.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  gridText: { fontFamily: font.regular, fontSize: 15, color: color.text },
  missing: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.error, marginTop: -4 },
  doc: { borderWidth: 1, borderColor: color.border, borderRadius: 18, overflow: "hidden" },
  docRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  docIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: color.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  docBody: { flex: 1, gap: 2 },
  docTitle: { fontFamily: font.medium, fontSize: 15, color: color.text },
  docMeta: { fontFamily: font.medium, fontSize: 13, color: color.primary },
  legal: { borderTopWidth: 1, borderTopColor: color.border, backgroundColor: color.canvas, padding: 16, gap: 10 },
  legalText: { fontFamily: font.regular, fontSize: 13, lineHeight: 20, color: color.muted },
})
