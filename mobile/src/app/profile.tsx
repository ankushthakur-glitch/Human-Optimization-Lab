import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { Badge, Card, FlowScreen, Row, Section } from "@/components/flow"
import { List, ListRow } from "@/components/list"
import { Sheet, SheetText } from "@/components/sheet"
import { Button } from "@/components/ui"
import { addMonths, showDate } from "@/lib/dates"
import { useAuth } from "@/lib/auth"
import { useOnboarding } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { TIERS, programName } from "@/lib/plans"
import { ACCESS_LOG } from "@/lib/record"
import { color, font } from "@/lib/theme"

/* The patient's own settings: the consent they signed (when, and what it
   covers, with withdraw a tap away), their membership (pause or cancel
   takes them back to the free record, which carries on), who has looked
   at their record, and signing out. */

type Confirm = "withdraw" | "pause" | "cancel"

export default function ProfileScreen() {
  const { signOut, forget } = useAuth()
  const onboarding = useOnboarding()
  const { membership, consent, consentAt, profile } = onboarding
  const [confirm, setConfirm] = React.useState<Confirm | null>(null)
  const member = membership?.tier === "optimization"
  const name = `${profile?.firstName ?? PATIENT.firstName} ${profile?.lastName ?? PATIENT.lastName}`

  async function act(what: Confirm) {
    if (what === "withdraw") await onboarding.save({ consent: "declined" })
    if (what === "pause" && membership) await onboarding.save({ membership: { ...membership, paused: true } })
    if (what === "cancel" && membership) await onboarding.save({ membership: { ...membership, tier: "free", paused: false } })
    setConfirm(null)
  }

  return (
    <View style={styles.fill}>
      <FlowScreen title={name}>
        <Card style={styles.rows}>
          <Row label="Email" value={PATIENT.email} />
          <Row label="Clinic" value={PATIENT.practice} last />
        </Card>

        <Section title="Sharing your records" action={<Badge tone={consent === "signed" ? "ok" : "low"}>{consent === "signed" ? "On" : "Off"}</Badge>}>
          {consent === "signed" ? (
            <>
              <Card style={styles.rows}>
                <Row label="Signed" value={consentAt ? showDate(new Date(consentAt)) : "At setup"} />
                <Row
                  label="Lasts until"
                  value={showDate(addMonths(consentAt ? new Date(consentAt) : new Date(), onboarding.consentMonths ?? 6))}
                />
                <Row label="Signed as" value={onboarding.signedAs ?? name} />
                <Row label="Covers" value="Visits, labs, medicines, conditions, allergies, procedures, reports" />
                <Row label="Shared with" value={PATIENT.practice} last />
              </Card>
              <Button variant="outline" onPress={() => setConfirm("withdraw")}>
                Withdraw permission
              </Button>
            </>
          ) : (
            <>
              <Text style={styles.text}>Nothing new is being collected. What was already in your record stays there.</Text>
              <Button onPress={() => router.push("/connect")}>Connect my records</Button>
            </>
          )}
        </Section>

        <Section title="Membership">
          <Card style={styles.rows}>
            <Row label="Plan" value={member ? (membership?.paused ? `${TIERS.optimization.name}, paused` : TIERS.optimization.name) : TIERS.free.name} />
            {member && <Row label="Programs" value={membership!.programs.map(programName).join(", ")} />}
            <Row label="Billed" value={member && !membership?.paused ? `${TIERS.optimization.price} ${TIERS.optimization.per}` : "Nothing"} last />
          </Card>
          {member ? (
            membership?.paused ? (
              <Button onPress={() => onboarding.save({ membership: { ...membership, paused: false } })}>Resume my plan</Button>
            ) : (
              <>
                <Button variant="outline" onPress={() => setConfirm("pause")}>
                  Pause my plan
                </Button>
                <Button variant="outline" onPress={() => setConfirm("cancel")}>
                  Cancel my plan
                </Button>
              </>
            )
          ) : (
            <Button onPress={() => router.push("/plans")}>See plan options</Button>
          )}
        </Section>

        <Section title="Who has seen your record">
          <List>
            {ACCESS_LOG.map((a, i) => (
              <ListRow key={i} title={a.what} meta={`${a.who}, ${a.role}. ${a.when}`} />
            ))}
          </List>
        </Section>

        <Section title="Account">
          <View style={styles.actions}>
            <Button variant="outline" onPress={signOut}>
              Sign out
            </Button>
            {/* Prototype reviews: start again as a first-time patient, from
                the activation code in the invitation. */}
            <Button
              variant="outline"
              onPress={async () => {
                await onboarding.reset()
                await forget()
              }}
            >
              Start over as a new patient
            </Button>
          </View>
        </Section>
      </FlowScreen>

      {confirm && (
        <Sheet
          title={{ withdraw: "Withdraw permission?", pause: "Pause your plan?", cancel: "Cancel your plan?" }[confirm]}
          onClose={() => setConfirm(null)}
        >
          <SheetText>
            {
              {
                withdraw: "We'll stop collecting new records. What's already in your record stays, and your care team can still see it.",
                pause: "Your daily plan and billing stop. Your record, trends, reminders and care gaps carry on, and you can pick up where you left off.",
                cancel: "You'll go back to the free record. Your history, trends, reminders and care gaps carry on, and every version of your plan is kept.",
              }[confirm]
            }
          </SheetText>
          <View style={styles.actions}>
            <Button onPress={() => act(confirm)}>
              {{ withdraw: "Withdraw", pause: "Pause my plan", cancel: "Cancel my plan" }[confirm]}
            </Button>
            <Button variant="outline" onPress={() => setConfirm(null)}>
              Keep it
            </Button>
          </View>
        </Sheet>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  rows: { paddingVertical: 2 },
  text: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: color.text },
  actions: { gap: 10 },
})
