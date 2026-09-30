import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { Linking, StyleSheet, Text, View } from "react-native"

import { gapStatus } from "@/components/care-gap"
import { PageNotFoundState } from "@/components/error-state"
import { Badge, Card, FlowScreen, Section } from "@/components/flow"
import { IconCheck, IconPhone } from "@/components/icons"
import { Button } from "@/components/ui"
import { showDate } from "@/lib/dates"
import { useOnboarding } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { CARE_GAPS, GAP_LABEL } from "@/lib/record"
import { color, font } from "@/lib/theme"

/* One care gap: why it is open, where its reminders have got to (three,
   then the doctor and the practice follow up so nothing is quietly
   missed), and what to do. A test the order leaves open can be booked
   with a cash price partner. Saying it is booked does not close it; the result reaching the
   record does. */

export default function CareGapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const onboarding = useOnboarding()
  const gap = CARE_GAPS.find((g) => g.id === id)
  const [picked, setPicked] = React.useState(0)
  if (!gap) return <PageNotFoundState />

  const booked = onboarding.booked?.[gap.id]
  const book = () => onboarding.save({ booked: { ...onboarding.booked, [gap.id]: showDate() } })
  const partner = gap.partners?.[picked]
  const call = () => Linking.openURL(`tel:${PATIENT.practicePhone.replace(/\D/g, "")}`)

  return (
    <FlowScreen
      title={gap.title}
      footer={
        booked ? (
          <Button variant="outline" onPress={() => router.back()}>
            Done
          </Button>
        ) : gap.action === "book" ? (
          <>
            <Button onPress={book}>{partner ? `Book at ${partner.name.split(",")[0]}, ${partner.price}` : "Book it"}</Button>
            <Button variant="outline" onPress={book}>
              I've already booked it
            </Button>
          </>
        ) : gap.action === "call" ? (
          <>
            <Button icon={IconPhone} variant="outline" onPress={call}>
              {`Call ${PATIENT.practice.split(" ")[0]}`}
            </Button>
            <Button onPress={book}>I've booked a visit</Button>
          </>
        ) : (
          <>
            <Button
              onPress={() => router.push({ pathname: "/assistant", params: { ask: `What should I ask my doctor about ${gap.title.toLowerCase()}?` } })}
            >
              Prepare questions for my doctor
            </Button>
            <Button variant="outline" onPress={book}>
              I've booked a visit
            </Button>
          </>
        )
      }
    >
      <View style={styles.top}>
        <Badge tone={gap.reminders >= 3 ? "high" : "low"}>{GAP_LABEL[gap.kind]}</Badge>
        <Text style={styles.why}>{gap.why}</Text>
      </View>

      {booked && (
        <View style={styles.booked}>
          <Text style={styles.bookedTitle}>You booked this on {booked}</Text>
          <Text style={styles.bookedText}>It closes when the result reaches your record, and the reminders stop.</Text>
        </View>
      )}

      {!booked && gap.partners && (
        <Section title="Book with a partner">
          <View style={styles.partners}>
            {gap.partners.map((p, i) => (
              <Card key={p.name} selected={i === picked} onPress={() => setPicked(i)}>
                <View style={styles.partner}>
                  <View style={styles.partnerBody}>
                    <Text style={styles.partnerName}>{p.name}</Text>
                    <Text style={styles.partnerMeta}>Soonest {p.soonest}</Text>
                  </View>
                  <Text style={styles.price}>{p.price}</Text>
                </View>
              </Card>
            ))}
          </View>
        </Section>
      )}

      {gap.reminders > 0 && (
        <Section title="Reminders" action={<Text style={styles.status}>{gapStatus(gap.reminders, booked)}</Text>}>
          <View style={styles.steps}>
            {[0, 1, 2].map((i) => {
              const sent = gap.sent[i]
              return (
                <View key={i} style={styles.step}>
                  <View style={[styles.dot, sent && styles.dotOn]}>{sent && <IconCheck size={12} color={color.onPrimary} strokeWidth={2.6} />}</View>
                  <Text style={[styles.stepText, !sent && styles.muted]}>
                    Reminder {i + 1}
                    {sent ? `, ${sent}` : ""}
                  </Text>
                </View>
              )
            })}
            <View style={styles.step}>
              <View style={[styles.dot, gap.reminders >= 3 && styles.dotHigh]} />
              <Text style={[styles.stepText, gap.reminders < 3 && styles.muted]}>Then Dr. Patel and your clinic follow up</Text>
            </View>
          </View>
        </Section>
      )}
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  top: { gap: 12, marginTop: -12 },
  why: { fontFamily: font.regular, fontSize: 16, lineHeight: 24, color: color.text },
  booked: { backgroundColor: color.primaryTint, borderRadius: 18, padding: 14, gap: 4 },
  bookedTitle: { fontFamily: font.semibold, fontSize: 15, color: color.text },
  bookedText: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.text },
  partners: { gap: 8 },
  partner: { flexDirection: "row", alignItems: "center", gap: 12 },
  partnerBody: { flex: 1, gap: 2 },
  partnerName: { fontFamily: font.medium, fontSize: 15, color: color.text },
  partnerMeta: { fontFamily: font.regular, fontSize: 13, color: color.muted },
  price: { fontFamily: font.semibold, fontSize: 17, color: color.text },
  status: { fontFamily: font.medium, fontSize: 13, color: color.muted },
  steps: { gap: 14 },
  step: { flexDirection: "row", alignItems: "center", gap: 12 },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: color.border, alignItems: "center", justifyContent: "center" },
  dotOn: { backgroundColor: color.primary, borderColor: color.primary },
  dotHigh: { backgroundColor: color.high, borderColor: color.high },
  stepText: { fontFamily: font.medium, fontSize: 15, color: color.text },
  muted: { color: color.muted },
})
