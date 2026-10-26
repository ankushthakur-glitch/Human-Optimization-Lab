import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { PlanStepPage } from "@/components/plan-steps"
import { Card, Steps, Tag, type Step } from "@/components/record-kit"
import { toast } from "@/components/toast"
import { chosenAddOns, chosenTests, dollars, dollarsExact, itemOf, suggestedInsurance } from "@/lib/baseline-tests"
import { MEMBER } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { YEARLY_TEST_DISCOUNT } from "@/lib/plans"
import { card, color, font, hairline, ink, space, type } from "@/lib/theme"

/* "Your tests" (26 Oct 2026): after payment her physician sorts the
   baseline tests into insurance or Inlay before any is booked. Opened
   from the enrolled page. Until the sorting is in, the page says so with
   the steps ahead. Once in: the physician's note, the tests that go
   through her insurance (the office orders them and calls her), then those she books with Inlay. The bar over the
   button says what changes hands: a refund for the covered tests when she
   paid for all of them up front, else what the Inlay ones cost now.
   "Schedule tests" opens /schedule-tests, which lists only the Inlay ones.

   This build has no physician: the sorting arrives a moment after the page
   opens, taking AI's suggestion (every test insurance likely covers goes
   through insurance), as the plan's approval does on /plan. */

const SORT_MS = 2800

export default function YourTestsScreen() {
  const onboarding = useOnboarding()
  // ?now=1, from the enrolled page's secret tap: the sorting lands at once.
  const now = useLocalSearchParams<{ now?: string }>().now === "1"
  const review = onboarding.testReview
  const paid = onboarding.startingTests
  const name = onboarding.profile?.preferredName || onboarding.profile?.firstName || PATIENT.firstName
  const later = onboarding.testPay === "later"
  const yearly = (onboarding.membership?.billing ?? "yearly") === "yearly"

  // Every test she enrolled with: the ones left to book, those sent to
  // insurance, and the home sleep study.
  const testIds = [...new Set([...(paid?.ids ?? chosenTests(onboarding.baselinePicks).map((t) => t.id)), ...(review?.insurance ?? [])])]
  const all = [...testIds, ...chosenAddOns(onboarding.addOns).map((a) => a.id)]
  const items = all.map(itemOf).filter((i) => !!i)

  // The sorting reads what she has when it lands, not when the page opened.
  const latest = React.useRef({ onboarding, all, name, paid })
  React.useEffect(() => {
    latest.current = { onboarding, all, name, paid }
  })
  const loaded = onboarding.loaded
  React.useEffect(() => {
    if (review || !loaded) return
    const id = setTimeout(() => {
      const { onboarding: o, all: ids, name: who, paid: tests } = latest.current
      const insurance = suggestedInsurance(ids)
      const covered = insurance.map((i) => itemOf(i)?.name).filter(Boolean).join(" and ")
      const rest = ids.length - insurance.length
      const message = insurance.length
        ? `Hi ${who}, I went through your baseline tests. Your insurance covers the ${covered}, so my office will order ${insurance.length > 1 ? "those" : "that"} and call you. Please book the other ${rest} in the app.`
        : `Hi ${who}, I went through your baseline tests. None of them goes through your insurance this time, so please book all ${rest} in the app.`
      void o.save({
        testReview: { at: new Date().toISOString(), insurance, message },
        // Only the Inlay tests wait to be booked (To do, /schedule-tests).
        ...(tests ? { startingTests: { ...tests, ids: tests.ids.filter((t) => !insurance.includes(t)) } } : {}),
      })
    }, now ? 0 : SORT_MS)
    return () => clearTimeout(id)
  }, [review, loaded, now])

  if (!review) {
    const steps: Step[] = [
      { label: "Enrolled in Inlay", state: "done" },
      { label: `${MEMBER.doctorShort} checks your tests`, date: "Insurance or Inlay, within 2 days", state: "now" },
      { label: "Schedule your tests", date: "Only the ones booked through Inlay", state: "next" },
      { label: "Your plan is ready", date: `Built from your results, approved by ${MEMBER.doctorShort}`, state: "next" },
    ]
    return (
      <PlanStepPage
        headerTitle="Your tests"
        title={`${MEMBER.doctorShort} is checking your tests`}
        lead="Which ones your insurance covers, and which you book with Inlay. You hear back within 2 days."
        onNext={() => router.replace("/plan")}
        nextLabel="Back to my plan"
        nextWide
      >
        <View style={styles.status}>
          <Tag tone="low">In physician review</Tag>
        </View>
        <Card style={styles.card}>
          <Steps steps={steps} />
        </Card>
      </PlanStepPage>
    )
  }

  const insured = items.filter((i) => review.insurance.includes(i.id))
  const inlay = items.filter((i) => !review.insurance.includes(i.id))
  // The yearly discount came off the tests (not the sleep study) she paid for.
  const off = (i: { id: string; price: number }) => (yearly && i.id in { panel: 1, dexa: 1, rmr: 1 } ? (i.price * YEARLY_TEST_DISCOUNT) / 100 : 0)
  const refund = insured.reduce((sum, i) => sum + i.price - off(i), 0)
  const due = inlay.reduce((sum, i) => sum + i.price - off(i), 0)
  const plural = (n: number) => `${n} ${n === 1 ? "test" : "tests"}`

  function next() {
    if (later) toast(`${dollarsExact(due)} paid`)
    router.push("/schedule-tests")
  }

  return (
    <PlanStepPage
      headerTitle="Your tests"
      title={`${MEMBER.doctorShort} checked your tests`}
      onNext={next}
      nextLabel={later ? `Pay ${dollarsExact(due)} and schedule` : "Schedule tests"}
      nextWide
      aboveFoot={
        <View style={styles.summary} accessibilityLiveRegion="polite">
          <View style={styles.summaryWords}>
            <Text style={styles.summaryText}>{later ? `Due for ${plural(inlay.length)}` : refund ? "Refund to your card" : "Nothing to refund"}</Text>
            {!later && refund > 0 && <Text style={styles.summaryMeta}>In 5 to 7 days</Text>}
          </View>
          <Text style={styles.totalValue}>{dollarsExact(later ? due : refund)}</Text>
        </View>
      }
    >
      <Card style={styles.card}>
        <Text style={styles.from}>{`${MEMBER.doctor} · ${new Date(review.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}</Text>
        <Text style={styles.message}>{review.message}</Text>
      </Card>

      {insured.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label} accessibilityRole="header">
            Through your insurance
          </Text>
          <View style={styles.group}>
            {insured.map((i, n) => (
              <View key={i.id} style={[styles.row, n > 0 && styles.rule]}>
                <Text style={styles.name}>{i.name}</Text>
                <Text style={styles.meta}>Office calls you</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.label} accessibilityRole="header">
          Book with Inlay
        </Text>
        <View style={styles.group}>
          {inlay.map((i, n) => (
            <View key={i.id} style={[styles.row, n > 0 && styles.rule]}>
              <Text style={styles.name}>{i.name}</Text>
              <Text style={styles.price}>{dollars(i.price)}</Text>
            </View>
          ))}
        </View>
      </View>
    </PlanStepPage>
  )
}

const styles = StyleSheet.create({
  status: { flexDirection: "row" },
  card: { gap: space.inline },
  from: { ...type.title, fontSize: 13, color: ink.strong },
  message: { ...type.body, fontSize: 14, lineHeight: 21 },

  // Two plain lists under a label: who books them, then the tests.
  section: { gap: space.inline },
  label: { ...type.title, fontSize: 13, color: ink.secondary },
  group: {
    overflow: "hidden",
    borderRadius: 12,
    backgroundColor: color.background,
    boxShadow: card.shadow,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.item,
    paddingVertical: space.rowY,
    paddingHorizontal: space.rowX,
  },
  rule: { borderTopWidth: 1, borderTopColor: hairline.rule },
  name: { ...type.title, flex: 1, fontSize: 14, color: ink.strong },
  // Digits of one width, so the prices line up down the column.
  price: { ...type.value, fontVariant: ["tabular-nums"] },
  meta: { ...type.meta },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.item,
    padding: space.item,
    borderRadius: 12,
    backgroundColor: color.primarySoft,
    borderWidth: 1,
    borderColor: color.primaryEdge,
  },
  summaryWords: { flex: 1, gap: 2 },
  summaryMeta: { ...type.meta, fontSize: 12 },
  summaryText: { ...type.label, fontFamily: font.medium, fontSize: 13, color: color.primaryText },
  totalValue: {
    fontFamily: font.semibold,
    fontSize: 18,
    lineHeight: 24,
    fontVariant: ["tabular-nums"],
    color: color.primaryText,
  },
})
