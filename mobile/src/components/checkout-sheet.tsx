import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { ChoiceRow } from "@/components/care-orders-rows"
import { Checkbox } from "@/components/flow"
import { Card, Group, KeyValue, SmallAction, TextAction } from "@/components/record-kit"
import { Sheet } from "@/components/sheet"
import { showToast } from "@/components/toast"
import { Button } from "@/components/ui"
import { cancelledRecently, useMarkers } from "@/lib/experience"
import { logEvent, planFocus } from "@/lib/offers"
import { useOnboarding } from "@/lib/onboarding"
import { CADENCES, TIERS, priceLabel, type Cadence, type ProgramId } from "@/lib/plans"
import type { FocusArea } from "@/lib/record"
import { space, type } from "@/lib/theme"

/* Starting the membership (FINAL-SPEC C.15): the approved Sheet, short
   enough to read without scrolling, in Inlay's voice only (no doctor's
   name anywhere near the price, B-03). Everything the 22 Sep spec asks for
   before she pays (S-66, S-70): how she pays, monthly and cancel anytime
   or yearly for less (6 Oct 2026), when the first charge comes, how it
   renews, what is included and what is not, the card, and her own
   unticked agreement to the recurring charge, with the amount inside the
   button (S-69). "Not now" simply closes it; nothing counts down, nothing
   is ticked for her.

   Two steps (6 Oct 2026): first she picks how she pays, then the card,
   the summary and her agreement. "Change" on the plan row and "Back"
   take her to the first step with her choice kept.

   On confirm the membership is saved, every earlier plan version is kept,
   and she lands on the first setup step over the Plan tab, so the swipe
   back from the questionnaire returns to the tab in its setup state. */

/** The prototype's sample card, filled by "Add a card". */
const SAMPLE_CARD = "Visa ending 4242"

/** The payment button's pending state (C.0.8). */
const PAYING_MS = 1000

/** What each focus area is called among the plan's programs. */
const PROGRAM_OF: Record<FocusArea, ProgramId> = {
  "blood sugar": "metabolic",
  weight: "weight",
  heart: "heart",
  bone: "bone",
}

export function CheckoutSheet({ onClose }: { onClose: () => void }) {
  const onboarding = useOnboarding()
  const markers = useMarkers()
  const [cadence, setCadence] = React.useState<Cadence>(onboarding.membership?.billing ?? "monthly")
  const price = priceLabel(cadence)
  const [card, setCard] = React.useState(onboarding.membership?.card)
  // When she ticked the renewal box, kept as her consent (S-70).
  const [agreedAt, setAgreedAt] = React.useState<string>()
  const [terms, setTerms] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [step, setStep] = React.useState<"plan" | "pay">("plan")

  async function start() {
    if (!card || !agreedAt) return
    setPending(true)
    await new Promise((done) => setTimeout(done, PAYING_MS))
    const now = new Date()
    // Back within 90 days of cancelling: her questionnaire answers are kept
    // and setup opens at the medicines check (C.15).
    const rejoin = cancelledRecently(onboarding, now)
    // Every version she ever had stays hers (A-45).
    const kept = [...(onboarding.planHistory ?? []), ...(onboarding.plan?.versions ?? [])]
      .filter((v, i, all) => all.findIndex((w) => w.version === v.version) === i)
      .sort((a, b) => b.version - a.version)
    const programs = [...new Set(planFocus(onboarding, markers, 3).areas.map((a) => PROGRAM_OF[a]))]
    await onboarding.save({
      membership: { tier: "optimization", programs, startedAt: now.toISOString(), card, billing: cadence, renewalConsentAt: agreedAt },
      plan: undefined,
      planHistory: kept.length ? kept : undefined,
      setupDone: rejoin ? ["questionnaire"] : [],
    })
    logEvent(onboarding, "checkout_completed")
    setPending(false)
    showToast("Welcome in. Let's get to know you.")
    onClose()
    router.dismissTo("/plan")
    router.push(rejoin ? "/optimize/medicines" : "/optimize/questionnaire")
  }

  if (step === "plan")
    return (
      <Sheet title="Choose your plan" onClose={onClose}>
        <Text style={styles.lead}>Your plan, your doctor and your daily check-ins start here.</Text>

        <View accessibilityRole="radiogroup" accessibilityLabel="How you pay">
          <Group>
            {CADENCES.map((c) => {
              const b = TIERS.optimization.billing[c]
              return <ChoiceRow key={c} title={priceLabel(c)} meta={[b.name, ...[b.note, b.save].filter(Boolean).map((w) => w!.charAt(0).toLowerCase() + w!.slice(1))].join(", ")} selected={cadence === c} onPress={() => setCadence(c)} />
            })}
          </Group>
        </View>

        <View style={styles.actions}>
          <Button onPress={() => setStep("pay")}>Continue</Button>
          <View style={styles.quiet}>
            <TextAction tone="muted" onPress={onClose}>
              Not now
            </TextAction>
          </View>
        </View>
      </Sheet>
    )

  return (
    <Sheet title="Start your membership" onClose={onClose}>
      <Card style={styles.rows}>
        <KeyValue label="Plan" value={TIERS.optimization.billing[cadence].name} action={<SmallAction onPress={() => setStep("plan")}>Change</SmallAction>} />
        <KeyValue label="Price" value={price} />
        <KeyValue label="First charge" value="When your doctor approves your plan" />
        <KeyValue label="Renews" value={cadence === "yearly" ? "Every year, until you cancel" : "Every month, cancel anytime"} />
        <KeyValue label="Included" value="Your plan, your doctor's reviews, unlimited questions" />
        <KeyValue label="Not included" value="Tests, imaging and medicines" />
        {card ? (
          <KeyValue label="Payment" value={card} last />
        ) : (
          <KeyValue label="Payment" action={<SmallAction onPress={() => setCard(SAMPLE_CARD)}>Add a card</SmallAction>} last />
        )}
      </Card>

      <Checkbox checked={Boolean(agreedAt)} onChange={(on) => setAgreedAt(on ? new Date().toISOString() : undefined)}>
        {`I agree to be charged ${price}, starting when my plan is approved, until I cancel. I can cancel anytime in Profile.`}
      </Checkbox>

      <View style={styles.terms}>
        <TextAction onPress={() => setTerms((open) => !open)}>Membership terms</TextAction>
        {terms && <Text style={styles.termsText}>Full terms come from Inlay before launch.</Text>}
      </View>

      <View style={styles.actions}>
        <Button onPress={start} pending={pending} disabled={!card || !agreedAt}>
          {`Start for ${price}`}
        </Button>
        <View style={styles.quiet}>
          <TextAction tone="muted" onPress={() => setStep("plan")}>
            Back
          </TextAction>
        </View>
      </View>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  // Rows edge to edge: each row's own space above and below makes up the
  // card's padding.
  rows: { paddingVertical: space.card - space.rowY },
  lead: { ...type.body },
  // The card's last row until the kit's KeyValue takes an action (see
  // scratchpad/build/requests-plan-tab.md): the label as KeyValue draws it,
  // the action on the right, the row as tall as a KeyValue row.
  // Pulled up by the text action's own room above its word (32 pt for a
  // 20 pt line), so the link sits the sheet's gap under the agreement.
  terms: { gap: space.line, marginTop: -(32 - type.link.lineHeight) / 2 },
  termsText: { ...type.meta },
  // The quiet answer sits right under the button; its own height spaces it.
  actions: { gap: space.stack },
  quiet: { alignItems: "center" },
})

