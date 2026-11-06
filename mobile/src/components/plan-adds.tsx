import { router } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { CaretRight, ChartLine, ClipboardText, Flask, Heart, Moon, ShieldCheck, Smiley } from "@/components/ph"
import { Group, NeedsRow, Tag } from "@/components/record-kit"
import { TabScreen } from "@/components/tab-bar"
import { Button } from "@/components/ui"
import { FLOURISH } from "@/lib/conversation"
import { flourishingHref, questionsLeft } from "@/lib/flourishing"
import { logEvent, useOffer, useShown } from "@/lib/offers"
import { useOnboarding } from "@/lib/onboarding"
import { STOP } from "@/lib/sleep-screen"
import { color, font, hairline, ink, space, type } from "@/lib/theme"

/* "What an optimization plan adds" (client deck, screen 20 of 56, 27 Oct
   2026): the free plan's upgrade moment, saying what the membership
   actually buys: plans built from the record, tests ordered and scheduled, a
   daily plan, progress against day one, and everything going to the
   physician. The Ask Inlay card left on 2 Nov 2026 (free patients have the
   chat again). Stated at the foot: the record, medications and appointments
   stay free whether or not anyone ever takes a plan; the upgrade adds, it
   does not withhold. The call to action is "See what we found", not
   "Subscribe": the next screen is the argument.

   It is the free Plan tab, and where every offer in the app leads (/plans);
   a cancelled member finds her past plans above it.

   The gate (5 Nov 2026 call): what we found is built from her answers as
   well as her record (sleep and how her life is going never show in a lab
   result), so while the flourishing or sleep questions are open they sit
   up front, above what the plan adds (6 Nov 2026), and the button starts
   the next one instead of "See what we found". Each questionnaire's result
   comes back here. */

type Icon = typeof Heart

const ADDS: { key: string; title: string; says: string; Icon: Icon }[] = [
  {
    key: "plans",
    title: "Optimization plans built from your record",
    says: "Every opportunity your results and your answers reveal, ranked by what matters most",
    Icon: Heart,
  },
  {
    key: "tests",
    title: "Tests ordered, scheduled and tracked",
    says: "Priced before you buy, booked in the app, and never re-ordered if we already hold it",
    Icon: Flask,
  },
  {
    key: "daily",
    title: "A daily plan you can answer",
    says: "Six topics a day, each with four ways to answer and a score that follows what you did",
    Icon: ClipboardText,
  },
  {
    key: "progress",
    title: "Progress measured against day one",
    says: "Week, month, six months and year, with every number paired to the point it moved from",
    Icon: ChartLine,
  },
  {
    key: "physician",
    title: "Your physician sees all of it",
    says: "Every result and every change goes to their file, in a form they can keep",
    Icon: ShieldCheck,
  },
]

export function PlanAdds() {
  const onboarding = useOnboarding()
  const offer = useOffer("plan-tab", { key: "tab" })
  useShown(offer)
  // The plan seen, and from where (D.7), once each time the page opens.
  const viewed = React.useRef(false)
  React.useEffect(() => {
    if (viewed.current || !onboarding.loaded) return
    viewed.current = true
    logEvent(onboarding, "plan_viewed", { from: "tab" })
  }, [onboarding])

  const past = onboarding.planHistory ?? []
  const left = questionsLeft(onboarding)
  const open = left.flourishing || left.sleep

  function seeWhatWeFound() {
    offer.markOpened()
    logEvent(onboarding, "checkout_started", { from: "tab" })
    router.push("/opportunities")
  }

  // Each questionnaire comes back here when its result is seen.
  async function start(part: "flourishing" | "sleep") {
    await onboarding.save({ questionsThen: "/plans" })
    router.push(part === "flourishing" ? flourishingHref(onboarding) : "/sleep-questions")
  }

  return (
    <TabScreen
      tab="plan"
      back
      title="What an optimization plan adds"
      solidFooter
      footer={
        open ? (
          <Button onPress={() => void start(left.flourishing ? "flourishing" : "sleep")} trailing={({ color: c }) => <CaretRight size={16} weight="bold" color={c} />}>
            {`${(left.flourishing ? left.flourishingGiven : left.sleepGiven) > 0 ? "Continue" : "Start"} the ${left.flourishing ? "flourishing" : "sleep"} questions`}
          </Button>
        ) : (
          <Button onPress={seeWhatWeFound} trailing={({ color: c }) => <CaretRight size={16} weight="bold" color={c} />}>
            See what we found
          </Button>
        )
      }
    >
      {open && <QuestionsFirst left={left} onStart={(part) => void start(part)} />}
      {past.length > 0 && (
        <View style={styles.past}>
          <Text style={styles.pastHead}>Your past plans</Text>
          {past.map((v) => (
            <NeedsRow key={v.version} title={`Version ${v.version}`} meta={`Started ${v.approved.replace(/,\s*\d{4}$/, "")}. Kept.`} />
          ))}
        </View>
      )}
      <View style={styles.list}>
        {ADDS.map((a) => (
          <View key={a.key} style={styles.item} accessible accessibilityLabel={`${a.title}. ${a.says}`}>
            <View style={styles.tile}>
              <a.Icon size={18} color={a.key === "plans" ? color.high : ink.primary} />
            </View>
            <View style={styles.words}>
              <Text style={styles.name}>{a.title}</Text>
              <Text style={styles.says}>{a.says}</Text>
            </View>
          </View>
        ))}
      </View>
    </TabScreen>
  )
}

/** Up front on the upgrade page while either questionnaire is open: why
    first, then each with its Start, or Done once answered. */
function QuestionsFirst({ left, onStart }: { left: ReturnType<typeof questionsLeft>; onStart: (part: "flourishing" | "sleep") => void }) {
  const parts = [
    {
      key: "flourishing" as const,
      Icon: Smiley,
      title: "Flourishing questions",
      open: left.flourishing,
      started: left.flourishingGiven > 0,
      meta: left.flourishingGiven > 0 ? `${left.flourishingGiven} of ${FLOURISH.length} answered` : `${FLOURISH.length} questions, about 5 minutes`,
    },
    {
      key: "sleep" as const,
      Icon: Moon,
      title: "Sleep questions",
      open: left.sleep,
      started: left.sleepGiven > 0,
      meta: left.sleepGiven > 0 ? `${left.sleepGiven} of ${STOP.length} answered` : `${STOP.length} questions, about 1 minute`,
    },
  ]
  return (
    <View style={styles.first}>
      <Text style={styles.pastHead} accessibilityRole="header">
        First, answer these
      </Text>
      <Text style={styles.firstLead}>What we found comes from your record and your answers. How you sleep and how your life is going never show in a lab result.</Text>
      <Group>
        {parts.map((p) => (
          <NeedsRow
            key={p.key}
            icon={<p.Icon size={16} color={color.primary} />}
            title={p.title}
            meta={p.open ? p.meta : undefined}
            action={
              p.open
                ? {
                    label: p.started ? "Continue" : "Start",
                    onPress: () => onStart(p.key),
                  }
                : undefined
            }
            right={p.open ? undefined : <Tag tone="ok">Done</Tag>}
            chevron={false}
            onPress={p.open ? () => onStart(p.key) : undefined}
            accessibilityLabel={`${p.title}. ${p.open ? p.meta : "Done"}`}
          />
        ))}
      </Group>
    </View>
  )
}

const styles = StyleSheet.create({
  first: { gap: space.inline, marginBottom: space.section },
  firstLead: { ...type.label, color: ink.secondary, lineHeight: 17 },
  // The cards sit 8 apart, as in every list; the page's 20 is for between sections.
  list: { gap: space.inline },
  past: { gap: space.inline, marginBottom: space.inline },
  pastHead: { ...type.sectionLabel },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.lead,
    paddingVertical: space.item,
    paddingHorizontal: space.rowX,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: hairline.edge,
    backgroundColor: color.background,
  },
  tile: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surface,
  },
  words: { flex: 1, gap: 2 },
  name: { ...type.title, fontFamily: font.semibold, color: ink.strong },
  says: { ...type.label, color: ink.secondary, lineHeight: 17 },
})
