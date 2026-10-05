import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { CheckoutSheet } from "@/components/checkout-sheet"
import { Check, Sparkle } from "@/components/ph"
import { PlanShowroom } from "@/components/plan-showroom"
import { Block, Card, EmptyState, Group, Hero, NeedsRow, Quote, ReviewBanner, SmallAction, TextAction, heroText } from "@/components/record-kit"
import { TabScreen } from "@/components/tab-bar"
import { useExperience } from "@/lib/experience"
import { addDays, localDay, shortDay } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { color, font, ink, space, type } from "@/lib/theme"

/* The Plan tab for everyone who is not a member (FINAL-SPEC C.14.1):
   useful on its own first, then honest about the plan (S-03). Her one step
   from the why conversation, ticked off on a rolling week with no score,
   no logging and no reminders (a taste of the plan, free, B-07); her why
   in her own words; then the showroom: what a plan would do for her, what
   it costs and what stays free. A place she opens herself, so it is never
   capped and never badged (S-04).

   States: readiness "Not ready" or "A little" keeps the showroom folded
   behind one quiet link; a cancelled member finds her past plans above it
   and the button reads "Start again"; with sharing off the same banner as
   every tab sits on top; while the record is arriving, or when it was
   never connected, one card says when the plan options appear. It renders
   its own tab screen, so the checkout sheet passes over the tab bar. */

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const NUMBERS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 }

/** How many times a week her step asks for, from its own words ("three
    evenings a week", "twice a week", "every day"); unknown when it does
    not say. */
function timesAWeek(step: string): number | undefined {
  const s = step.toLowerCase()
  if (/\b(every|each) (day|evening|morning|night)\b|\bdaily\b/.test(s)) return 7
  if (/\btwice\b/.test(s)) return 2
  if (/\bonce\b/.test(s)) return 1
  const n = /\b(\d|one|two|three|four|five|six|seven)\s+(times|days|evenings|mornings|nights|afternoons|walks)\b[^.]*\bweek\b/.exec(s)
  if (!n) return undefined
  return NUMBERS[n[1]] ?? Number(n[1])
}

/** "1 of 3 in the last 7 days", and a word of praise at the goal. */
function countLine(done: number, target: number | undefined) {
  if (!target) return `Done on ${done} of the last 7 days`
  if (done < target) return `${done} of ${target} in the last 7 days`
  if (done === target) return `${done} of ${target} in the last 7 days. Nice work.`
  return `${done} in the last 7 days. Nice work.`
}

/** "Oct 1": the day of her why conversation, which follows the consent
    in the same sitting. */
const conversationDay = (consentAt?: string) => {
  const d = consentAt ? new Date(consentAt) : undefined
  return d && !Number.isNaN(d.getTime()) ? shortDay(d) : undefined
}

export function PlanFree() {
  const onboarding = useOnboarding()
  const { experience, readiness, sharingOff } = useExperience()
  const [checkout, setCheckout] = React.useState(false)
  // At low readiness the showroom waits behind "See what a plan includes".
  const [open, setOpen] = React.useState(false)

  if (experience === "declined" || experience === "building")
    return (
      <TabScreen tab="plan" title="Plan">
        <EmptyState title="Your plan options appear once your record is ready." />
      </TabScreen>
    )

  const past = onboarding.planHistory ?? []
  const showroom = readiness !== "low" || open
  return (
    <TabScreen tab="plan" title="Plan" overlay={checkout ? <CheckoutSheet onClose={() => setCheckout(false)} /> : undefined}>
      {sharingOff && <ReviewBanner state={{ kind: "sharing-off", since: sharingOff.on ?? "" }} onPress={() => router.push("/connect")} />}
      <StepHero />
      <WhyCard />
      {past.length > 0 && (
        <Block title="Your past plans">
          <Group>
            {past.map((v) => (
              <NeedsRow key={v.version} title={`Version ${v.version}`} meta={`Approved ${v.approved.replace(/,\s*\d{4}$/, "")}. Kept.`} />
            ))}
          </Group>
        </Block>
      )}
      {showroom ? (
        <>
          <PlanShowroom mode="tab" onStart={() => setCheckout(true)} />
          <Group>
            <NeedsRow
              icon={<Sparkle size={16} color={color.primary} />}
              hue="teal"
              title="Questions about the plan?"
              right={<SmallAction onPress={() => router.push("/assistant?topic=plan")}>Ask</SmallAction>}
              onPress={() => router.push("/assistant?topic=plan")}
              chevron={false}
            />
          </Group>
        </>
      ) : (
        <Card style={styles.ready}>
          <View style={styles.readyWords}>
            <Text style={styles.readyTitle}>When you're ready</Text>
            <Text style={styles.body}>A plan can build on your step, one change at a time. No rush.</Text>
          </View>
          <TextAction onPress={() => setOpen(true)} chevron>
            See what a plan includes
          </TextAction>
        </Card>
      )}
    </TabScreen>
  )
}

/** Her one step this month, on the screen's one accent: the step, when she
    chose it, the last seven days ending today (tap a day to tick it), and
    how many she has done. A rolling week, so a Monday never starts empty. */
function StepHero() {
  const onboarding = useOnboarding()
  const step = onboarding.why?.step
  if (!step) return null
  const today = new Date()
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
  const ticked = new Set(onboarding.oneStep ?? [])
  const done = days.filter((d) => ticked.has(localDay(d))).length
  const chosen = conversationDay(onboarding.consentAt)

  const toggle = (key: string) => {
    const next = ticked.has(key) ? [...ticked].filter((k) => k !== key) : [...ticked, key]
    onboarding.save({ oneStep: next })
  }

  return (
    <Hero>
      <Text style={heroText.title} accessibilityRole="header">
        Your step this month
      </Text>
      <View style={styles.stepWords}>
        <Text style={styles.step}>{step}</Text>
        {!!chosen && <Text style={heroText.line}>{`You chose this on ${chosen}`}</Text>}
      </View>
      <View style={styles.week}>
        {days.map((d, i) => {
          const key = localDay(d)
          const on = ticked.has(key)
          const isToday = i === 6
          return (
            <Pressable
              key={key}
              onPress={() => toggle(key)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${isToday ? "Today, " : ""}${WEEKDAYS[d.getDay()]}, ${shortDay(d)}`}
              hitSlop={4}
              style={({ pressed }) => [styles.day, pressed && styles.pressed]}
            >
              <Text style={[styles.dayName, isToday && styles.dayNameToday]}>{WEEKDAYS[d.getDay()].slice(0, 3)}</Text>
              <View style={[styles.ring, isToday && styles.ringToday]}>
                <View style={[styles.dot, on && styles.dotOn]}>{on && <Check size={16} color={color.primary} weight="bold" />}</View>
              </View>
            </Pressable>
          )
        })}
      </View>
      <Text style={heroText.meta}>{countLine(done, timesAWeek(step))}</Text>
    </Hero>
  )
}

/** Her why, in her own words, from the conversation she had at setup. */
function WhyCard() {
  const { why, consentAt } = useOnboarding()
  if (!why?.reason) return null
  const on = conversationDay(consentAt)
  return (
    <Block title="Your why">
      <Card>
        <Quote text={why.reason} meta={on ? `From your conversation on ${on}` : undefined} />
      </Card>
    </Block>
  )
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.8 },
  body: { ...type.body },

  // The step is the hero's primary line: a block title's size in the title
  // weight, under the semibold hero title, with the day she chose it (the
  // hero's line) and the count (the hero's meta).
  stepWords: { gap: space.stack },
  step: { ...type.section, color: ink.onColor },
  week: { flexDirection: "row", justifyContent: "space-between", marginTop: space.stack },
  day: { alignItems: "center", gap: space.inline },
  // Weekdays as the chart kit labels a week (type.axis), in the hero's
  // line white; today's in the title weight, as a chart's selected day.
  dayName: { ...type.axis, color: heroText.line.color },
  dayNameToday: { fontFamily: font.medium, color: ink.onColor },
  // Every day keeps the same outer ring, so today's white ring does not
  // move the row; inside it the day itself, white with a check once done.
  ring: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: "transparent", padding: 1 },
  ringToday: { borderColor: color.onPrimary },
  dot: { flex: 1, borderRadius: 16, backgroundColor: "rgba(255, 255, 255, 0.16)", alignItems: "center", justifyContent: "center" },
  dotOn: { backgroundColor: color.onPrimary },

  ready: { gap: space.inline },
  readyWords: { gap: space.stack },
  readyTitle: { ...type.section },
})
