import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"

import { Art } from "@/components/art"
import { useReducedMotion } from "@/components/chat"
import { planName } from "@/components/enrollment-kit"

import { Barbell, Camera, CreditCard, Heartbeat, PersonSimpleWalk, Ruler, Scales, Scan, Sparkle, Watch } from "@/components/ph"
import { DevicesSheet } from "@/components/plan-tab-devices"
import { FocusIcon, HeadCard, headText } from "@/components/plan-tab-pieces"
import { RecordIcon } from "@/components/record-icons"
import { Sheet } from "@/components/sheet"
import {
  Banner,
  Block,
  Card,
  CheckLines,
  Group,
  HUE,
  KeyValue,
  LiveDot,
  NeedsRow,
  Quote,
  ReviewBanner,
  SeeAllRow,
  Status,
  Steps,
  Tag,
  Tile,
  toast,
  type Step,
} from "@/components/record-kit"
import { keepTogether } from "@/components/care-gap"
import { TabScreen, openTab } from "@/components/tab-bar"
import { AskButton, PrimaryButton } from "@/components/hol"
import { Button, TextField } from "@/components/ui"
import { BASELINE_TESTS, type BaselineTestId } from "@/lib/baseline-tests"
import { showDate } from "@/lib/dates"
import { useExperience, useMarkers } from "@/lib/experience"
import { MEMBER, PLAN_DRAFT, WALK, WEIGH_IN, dateOfAt, dayLabel, profileOf, progress, thisWeek, weekPlan, type WeekItem } from "@/lib/member"
import { FOCUS_NAME } from "@/lib/offers"
import { useOnboarding, type Plan } from "@/lib/onboarding"
import { startingTestsLine } from "@/lib/todo"
import { planDayNow } from "@/components/plan-review"
import { YourHistory } from "@/components/plan-history"
import { PlanToday } from "@/components/plan-today"
import { CheckInSheet, type CheckInKind } from "@/components/check-in-sheet"
import { Outlook } from "@/components/plan-outlook"
import { ProgressAsk, YourProgress } from "@/components/plan-progress"
import { acceptedPlan, changeRequested, livePlan, proposedPlan } from "@/lib/plans"
import { MARKER_CARE, type Biomarker, type FocusArea } from "@/lib/record"
import { classify, valueText, withUnit } from "@/lib/trends"
import { color, font, hairline, ink, space, type } from "@/lib/theme"
import { keepEnd } from "@/lib/words"

/* The Plan tab for a member (FINAL-SPEC C.16): her approved plan as a
   document she can trust. Who approved it and when it is reviewed next;
   what it focuses on and the goal for each; her daily targets; her week;
   her check ins and the tests in the plan; why it last changed; every
   version, kept. The doctor's name belongs here: this is care, not an
   offer. Nothing on it sells, and there are no prototype controls (they
   live on /demo).

   It also draws the member's other stages (C.16.2): version 1 with
   Dr. Patel, under the Upgrade tab's name, and the plan paused. A newer version with the
   doctor shows over the live plan, which stays in place until she
   accepts it (M-55). Each version Dr. Patel sends comes to her to read in
   full: she accepts it, or requests a change, which goes back to
   Dr. Patel and comes back updated, round after round until she accepts
   (9 Oct 2026). It renders its own tab screen, so the devices sheet
   passes over the tab bar. */

type Snapshot = Parameters<ReturnType<typeof useOnboarding>["save"]>[0]
type Version = Plan["versions"][number]

/** "Sep 12, 2026" as "Sep 12". */
const dayOnly = (approved: string) => approved.replace(/,\s*\d{4}$/, "")

export function PlanMember() {
  const { experience, sharingOff } = useExperience()
  const [devices, setDevices] = React.useState(false)
  const [asking, setAsking] = React.useState(false)
  // The open section survives a refresh on the web build (per tab).
  const [section, setSectionState] = React.useState<Section>(() => {
    try {
      const saved = sessionStorage.getItem("hol.planSection") as Section | null
      if (saved && SECTIONS.some((o) => o.value === saved)) return saved
    } catch {}
    return "today"
  })
  const setSection = (s: Section) => {
    setSectionState(s)
    try {
      sessionStorage.setItem("hol.planSection", s)
    } catch {}
  }
  const [checkIn, setCheckIn] = React.useState<CheckInKind>()
  const onboarding = useOnboarding()
  // Walked on from the enrolled page: with no portal in this build,
  // Dr. Patel sends the plan after a moment, and again after each change
  // she requests.
  const { walk, section: asked } = useLocalSearchParams<{ walk?: string; section?: string }>()
  useDoctorReply(walk)
  // Home's See more opens Plan straight on a section (Today's goals → Today).
  React.useEffect(() => {
    if (asked && SECTIONS.some((o) => o.value === asked)) setSection(asked as Section)
  }, [asked])
  // Version 1, once Dr. Patel sends it, opens "Your personalized plan is
  // ready" once; "View my plan" comes back to it here to accept.
  const firstReady = experience === "member-review" && onboarding.plan?.status === "proposed" && onboarding.plan.version === 1 && !onboarding.planReadySeen
  React.useEffect(() => {
    if (onboarding.loaded && firstReady) router.push("/plan-ready")
  }, [onboarding.loaded, firstReady])
  // A version Dr. Patel sent: accept it or request a change, pinned over
  // the tab bar while she reads.
  const proposed = experience !== "paused" && onboarding.plan?.status === "proposed"
  const overlay = asking ? (
    <RequestSheet onClose={() => setAsking(false)} />
  ) : devices ? (
    <DevicesSheet onClose={() => setDevices(false)} />
  ) : checkIn ? (
    <CheckInSheet kind={checkIn} onClose={() => setCheckIn(undefined)} />
  ) : undefined
  // The live plan reads in four sections under the header: Today first.
  const live = experience !== "member-review" && experience !== "paused"
  return (
    <TabScreen
      tab="plan"
      title="Plan"
      headerRight={live ? <Text style={styles.day}>{`Day ${Math.max(1, planDayNow(onboarding))}`}</Text> : undefined}
      pinned={live ? <SectionTabs value={section} onChange={setSection} /> : undefined}
      headless={experience === "member-review"}
      overlay={overlay}
      footer={proposed ? <ReviewActions onRequest={() => setAsking(true)} /> : live && section === "progress" ? <ProgressAsk /> : undefined}
    >
      {sharingOff && <ReviewBanner state={{ kind: "sharing-off", since: sharingOff.on ?? "" }} onPress={() => router.push("/connect")} />}
      {experience === "member-review" ? (
        proposed ? <ProposedStage /> : <ReviewStage />
      ) : experience === "paused" ? (
        <PausedStage />
      ) : (
        <LivePlan section={section} onDevices={() => setDevices(true)} onAdd={setCheckIn} />
      )}
    </TabScreen>
  )
}

/* ---------------------------------------------------------------- live -- */

/** The goal and the latest for each focus area, from her record and her
    weigh ins: "Goal: A1c below 5.7. Latest 5.9%, next test Tue, Oct 6." */
function focusLine(area: FocusArea, s: Snapshot, markers: Biomarker[], week: WeekItem[], now: Date): string {
  const marker = (id: string) => markers.find((m) => m.id === id)
  const latest = (b?: Biomarker) => {
    const p = b ? classify(b).latest : undefined
    return b && p ? valueText(b, p) : undefined
  }
  const nextTest = (id: string) => {
    const orders = MARKER_CARE[id]?.orders ?? []
    return week.find((w) => w.kind === "test" && w.orders?.some((o) => orders.includes(o)))
  }
  if (area === "blood sugar") {
    const a1c = marker("a1c")
    const value = latest(a1c)
    const next = nextTest("a1c")
    const latestWords = a1c && value ? ` Latest ${withUnit(a1c, value)}${next ? `, next test ${next.day}` : ""}.` : ""
    return `Goal: A1c below ${a1c?.high ?? 5.7}.${latestWords}`
  }
  if (area === "weight") {
    const p = progress(s, now)
    return `Goal: ${MEMBER.goalWeight} lb. Now ${p.weight.now.toFixed(1)} lb.`
  }
  if (area === "heart") {
    const ldl = marker("ldl")
    const bp = marker("bp")
    const value = latest(ldl)
    return `Goal: LDL below ${ldl?.high ?? 100} and blood pressure below ${bp?.high ?? 120}/${bp?.high2 ?? 80}.${value ? ` Latest LDL ${value}.` : ""}`
  }
  return "Goal: keep your bone density steady. Next scan May 2027."
}

type Section = "today" | "history" | "progress" | "outlook"
const SECTIONS: { value: Section; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "history", label: "History" },
  { value: "progress", label: "Progress" },
  { value: "outlook", label: "Outlook" },
]

/** The plan's four sections as one segmented control, pinned under the
    header: equal cells in a single outlined frame, the open one tinted teal
    with teal words, the rest grey. */
function SectionTabs({ value, onChange }: { value: Section; onChange: (s: Section) => void }) {
  return (
    <View style={styles.sectionTabs} accessibilityRole="tablist">
      {SECTIONS.map((o, i) => {
        const on = o.value === value
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={({ pressed }) => [styles.sectionTab, i > 0 && styles.sectionTabRule, on && styles.sectionTabOn, pressed && styles.pressed]}
          >
            <Text style={[styles.sectionTabText, on && styles.sectionTabTextOn]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
              {o.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function LivePlan({
  section,
  onDevices,
  onAdd,
}: {
  section: Section
  onDevices: () => void
  onAdd: (kind: CheckInKind) => void
}) {
  const onboarding = useOnboarding()
  const versions = onboarding.plan?.versions ?? []
  // The version she follows, and a newer one while it is with the doctor
  // or with her to accept.
  const live = livePlan(onboarding)
  const reviewing = live?.reviewing
  const proposed = onboarding.plan?.status === "proposed"
  const asked = !!onboarding.plan?.requests?.length
  // The version's own words where the sample plan has them; a version
  // accepted on this device (from /demo) has its one line.
  const details = profileOf(onboarding).versions.find((v) => v.version === live?.version)

  return (
    <>
      {reviewing !== undefined && live && (
        <View style={styles.redraft}>
          <Banner
            hue="teal"
            live={!proposed}
            icon={<RecordIcon name="documents" size={18} color={HUE.teal.ink} />}
            title={proposed ? `Version ${reviewing} is ready for you` : asked ? `Your change is with ${live.by}` : `Version ${reviewing} is with ${live.by}`}
            meta={`Version ${live.version} stays in place until you accept the new one.`}
          />
          <Card style={styles.card}>
            <Text style={styles.cardSubtitle}>What's changing</Text>
            <View style={styles.changes}>
              {PLAN_DRAFT.changes.map((c) => (
                <View key={c} style={styles.change}>
                  <View style={styles.changeDot} />
                  <Text style={styles.body}>{c}</Text>
                </View>
              ))}
            </View>
          </Card>
          <Requests requests={onboarding.plan?.requests} />
        </View>
      )}

      {section === "today" && <PlanToday />}

      {section === "progress" && <YourProgress onAdd={onAdd} />}


      {section === "history" && <YourHistory />}

      {section === "outlook" && <Outlook />}
    </>
  )
}

/** The live plan at a glance, on top: its name, who approved it and when,
    then three figures she checks most (weight against her goal, today's
    session, the next test) and a bar for how far she is to her goal. */
function PlanSummary({ version, approved, by }: { version: number; approved: string; by: string }) {
  const onboarding = useOnboarding()
  const now = new Date()
  const p = progress(onboarding, now)
  const week = thisWeek(onboarding, now)
  const test = week.find((w) => w.kind === "test")
  const session = weekPlan(onboarding).find((d) => d.today)?.session
  const start = p.weight.series[0]?.value ?? p.weight.now
  const span = start - MEMBER.goalWeight
  const done = span > 0 ? Math.min(1, Math.max(0, (start - p.weight.now) / span)) : 0
  return (
    <HeadCard>
      <View style={styles.summaryTop}>
        <View style={styles.headerWords}>
          <Text style={headText.title}>{planName(onboarding.goals)}</Text>
          <Text style={headText.meta}>{`Version ${version}, approved by ${by} on ${approved}`}</Text>
        </View>
        <Tag tone="ok">Active</Tag>
      </View>
      <View style={styles.stats}>
        <Stat label="Weight" value={`${p.weight.now.toFixed(1)} lb`} note={`Goal ${MEMBER.goalWeight}`} />
        <Stat label="Today" value={session ? `${session.minutes} min` : "Rest"} note={session ? session.title : "Walk only"} />
        <Stat label="Next test" value={test?.day ?? "None"} note={test ? "Booked" : "Nothing due"} />
      </View>
      <View style={styles.track} accessibilityRole="progressbar" accessibilityLabel={`${Math.round(done * 100)} percent of the way to your goal weight`}>
        <View style={[styles.fill, { width: `${Math.round(done * 100)}%` }]} />
      </View>
      <Text style={headText.meta}>{`${Math.round(done * 100)}% of the way to ${MEMBER.goalWeight} lb`}</Text>
    </HeadCard>
  )
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <View style={styles.stat}>
      <Text style={headText.meta}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={headText.meta} numberOfLines={1}>
        {note}
      </Text>
    </View>
  )
}

/** Everything the live plan holds: what it focuses on and the goal for
    each, the daily targets, the week, the check ins and the tests. */
function PlanSections() {
  const onboarding = useOnboarding()
  const markers = useMarkers()
  const now = new Date()
  const profile = profileOf(onboarding)
  const week = thisWeek(onboarding, now)
  const labs = week.find((w) => w.kind === "test")
  const bone = profile.focus === "bone"

  return (
    <>
      <Block title="What it focuses on">
        <Group>
          {profile.areas.map((area) => (
            <NeedsRow key={area} icon={<FocusIcon area={area} />} hue="teal" title={FOCUS_NAME[area]} meta={focusLine(area, onboarding, markers, week, now)} />
          ))}
        </Group>
      </Block>

      <Block title="Daily targets">
        <Card style={styles.targets}>
          <View>
            {profile.goals.map((g, i) => (
              <KeyValue key={g.id} label={g.name} value={g.words} last={i === profile.goals.length - 1} />
            ))}
          </View>
          {!!profile.diet.deficit && <Text style={styles.meta}>{`${profile.diet.deficit}.`}</Text>}
          <View style={styles.cardLink}>
            <SeeAllRow label="See today's diet plan" onPress={() => router.push("/diet")} />
          </View>
        </Card>
      </Block>

      <Workouts />

      <Block title="Check ins">
        <Group>
          <NeedsRow icon={<Scales size={16} color={color.primary} />} hue="teal" title="Weigh in" meta={WEIGH_IN.often} />
          {bone ? (
            <NeedsRow icon={<Barbell size={16} color={color.primary} />} hue="teal" title="Chair stands" meta="Once a month" />
          ) : (
            <NeedsRow icon={<Heartbeat size={16} color={color.primary} />} hue="teal" title="Blood pressure" meta="Every evening" />
          )}
          {!bone && <NeedsRow icon={<Ruler size={16} color={color.primary} />} hue="teal" title="Waist" meta="Once a month" />}
        </Group>
      </Block>

      <Block title="Tests in your plan">
        <Group>
          {labs && (
            <NeedsRow
              icon={<RecordIcon name="labs" size={18} color={color.primary} />}
              hue="teal"
              title={labs.title}
              meta={labs.when}
              tag={{ tone: "primary", label: "Booked" }}
              onPress={() => router.push({ pathname: "/order/[id]", params: { id: labs.orders?.[0] ?? "labs-nov" } })}
            />
          )}
          <NeedsRow icon={<Scan size={16} color={color.primary} />} hue="teal" title="DEXA scan" meta={bone ? "May 2027" : "January"} />
          {!bone && <NeedsRow icon={<RecordIcon name="labs" size={18} color={color.primary} />} hue="teal" title="Next labs" meta="January" />}
        </Group>
      </Block>
    </>
  )
}

/* -------------------------------------------------------------- review -- */

/** With no portal in this build, Dr. Patel answers on the walk through:
    the version with the doctor comes to her after a moment, the first
    time and after each change she requests. */
function useDoctorReply(walk?: string) {
  const { plan, save } = useOnboarding()
  const asked = !!plan?.requests?.length
  React.useEffect(() => {
    if (plan?.status !== "review" || !(walk || asked)) return
    // Day one: the first plan goes straight to the live Plan tab, with no
    // review step to accept.
    if (walk && !asked && !plan.versions.length) {
      save({ plan: acceptedPlan(plan), planReadySeen: true })
      return
    }
    const t = setTimeout(() => save({ plan: proposedPlan(plan) }), WALK_REVIEW_MS)
    return () => clearTimeout(t)
  }, [walk, asked, plan, save])
}

/** The version Dr. Patel sent, on the Upgrade tab, drawn as the
    physician's care plan reads in the portal (16 Oct 2026): where it
    stands, then each optimization plan with where it came from, its Why
    and its items by area with how often, then the baseline tests the
    physician approved. She accepts it or requests a change (the pinned
    footer). */
function ProposedStage() {
  const onboarding = useOnboarding()
  const plan = onboarding.plan
  const asked = plan?.requests?.at(-1)
  const plans = useOptimizationPlans(onboarding)
  const items = plans.reduce((n, p) => n + p.items.length, 0)
  return (
    <>
      <HeadCard style={styles.card}>
        <View style={styles.summaryTop}>
          <View style={styles.headerWords}>
            <Text style={headText.title}>{planName(onboarding.goals)}</Text>
            <Text style={headText.meta}>{`Version ${plan?.version ?? 1}, approved by ${MEMBER.doctorShort}`}</Text>
          </View>
          <Tag tone="primary">Ready for you</Tag>
        </View>
        {asked && <Quote text={asked.text} meta={`You asked on ${showDate(new Date(asked.at))}. This version has the change.`} />}
      </HeadCard>

      <Block title="Optimization plans" meta={`${plans.length} plans · ${items} items`}>
        <View style={styles.plans}>
          {plans.map((p) => (
            <PlanCard key={p.area} plan={p} />
          ))}
        </View>
      </Block>

      <BaselineTests plans={plans} />
    </>
  )
}

type PlanItem = { area: "Nutrition" | "Exercise" | "Check in" | "Tests"; text: string; often: string }
type OptimizationPlan = { area: FocusArea; why: string; items: PlanItem[] }

/** Her plans as the physician approved them: one per focus area, its Why
    from her record, and what she does for it, nutrition first, tests
    last (the portal's order). */
function useOptimizationPlans(s: Snapshot): OptimizationPlan[] {
  const markers = useMarkers()
  const now = new Date()
  const profile = profileOf(s)
  const week = thisWeek(s, now)
  const strength = weekPlan(s).filter((d) => d.session)
  const minutes = strength[0]?.session?.minutes
  const bone = profile.focus === "bone"
  const food = (area: FocusArea): PlanItem[] =>
    profile.goals.filter((g) => g.focus === area).map((g) => ({ area: "Nutrition", text: `${g.name} ${g.words.toLowerCase()}`, often: "Daily" }))
  const workout: PlanItem = {
    area: "Exercise",
    text: `${bone ? "Strength and balance" : "Strength workout"}${minutes ? `, about ${minutes} minutes` : ""}`,
    often: `${strength.length} days a week`,
  }
  const walk: PlanItem = { area: "Exercise", text: `${WALK.title}, ${WALK.detail}`, often: "Daily" }
  const ITEMS: Record<FocusArea, PlanItem[]> = {
    "blood sugar": [...food("blood sugar"), walk, { area: "Tests", text: "Repeat A1c", often: "January" }],
    weight: [
      ...food("weight"),
      { area: "Nutrition", text: "Log breakfast, lunch and dinner", often: "Daily" },
      workout,
      { area: "Check in", text: "Weigh in, before breakfast", often: "Daily" },
      { area: "Check in", text: "Waist", often: "Once a month" },
    ],
    heart: [...food("heart"), { area: "Check in", text: "Blood pressure, seated", often: "Every evening" }, { area: "Tests", text: "Repeat lipid panel", often: "January" }],
    bone: [
      ...food("bone"),
      workout,
      walk,
      { area: "Check in", text: "Chair stands", often: "Once a month" },
      { area: "Tests", text: "Repeat DEXA scan", often: "May 2027" },
    ],
  }
  return profile.areas.map((area) => ({ area, why: focusLine(area, s, markers, week, now), items: ITEMS[area] }))
}

/** One plan, as the portal's plan card: its name and where it came from
    on top, its Why under them, then its items with how often. */
function PlanCard({ plan }: { plan: OptimizationPlan }) {
  return (
    <Card style={styles.planCard}>
      <View style={styles.planHead}>
        <Tile hue="teal" size={32}>
          <FocusIcon area={plan.area} />
        </Tile>
        <View style={styles.headerWords}>
          <View style={styles.planTitleLine}>
            <Text style={styles.planName}>{FOCUS_NAME[plan.area]}</Text>
            <Tag tone="muted">From your record</Tag>
          </View>
          <Text style={styles.meta}>{`Why: ${plan.why.replace(/^Goal: /, "goal ")}`}</Text>
        </View>
      </View>
      {plan.items.map((item) => (
        <View key={item.text} style={styles.item}>
          <Text style={styles.itemArea}>{item.area}</Text>
          <View style={styles.itemWords}>
            <Text style={styles.itemText}>{item.text}</Text>
            <Text style={styles.meta}>{item.often}</Text>
          </View>
        </View>
      ))}
    </Card>
  )
}

/** The plans each starting test serves, by focus area. */
const TEST_FOR: Record<BaselineTestId, FocusArea[]> = {
  panel: ["blood sugar", "heart"],
  dexa: ["weight", "bone"],
  rmr: ["weight"],
}

/** The baseline tests Dr. Patel approved for her plans: each one, the
    plans it is for and its decision, as the portal's baseline table. */
function BaselineTests({ plans }: { plans: OptimizationPlan[] }) {
  const { startingTests } = useOnboarding()
  const ids = (startingTests?.ids ?? ["panel", "dexa", "rmr"]).filter((id): id is BaselineTestId => id in BASELINE_TESTS)
  const areas = plans.map((p) => p.area)
  if (!ids.length) return null
  return (
    <Block title="Baseline tests" meta={`${ids.length} approved`}>
      <Group>
        {ids.map((id) => {
          const forPlans = TEST_FOR[id].filter((a) => areas.includes(a)).map((a) => FOCUS_NAME[a])
          return (
            <NeedsRow
              key={id}
              icon={<RecordIcon name="labs" size={18} color={color.primary} />}
              hue="teal"
              title={BASELINE_TESTS[id].name}
              meta={forPlans.length ? `For ${forPlans.join(", ").replace(/, ([^,]*)$/, " and $1").toLowerCase()}` : "For your plan"}
              right={<Status tone="ok" bare>Approved</Status>}
            />
          )
        })}
      </Group>
    </Block>
  )
}

/** The changes she asked for on this version, in her words, oldest
    first. */
function Requests({ requests }: { requests?: Plan["requests"] }) {
  if (!requests?.length) return null
  return (
    <Block title="What you asked for">
      <Group>
        {requests.map((r) => (
          <NeedsRow key={r.at} title={r.text} meta={showDate(new Date(r.at))} />
        ))}
      </Group>
    </Block>
  )
}

/** Accept the version Dr. Patel sent, or request a change. */
function ReviewActions({ onRequest }: { onRequest: () => void }) {
  const { plan, save } = useOnboarding()
  const [saving, setSaving] = React.useState(false)
  async function accept() {
    if (plan?.status !== "proposed") return
    setSaving(true)
    await save({ plan: acceptedPlan(plan) })
    toast(plan.version > 1 ? `Version ${plan.version} accepted` : "Plan accepted")
  }
  return (
    <View style={styles.actions}>
      <View style={styles.actionWide}>
        <Button variant="outline" oneLine onPress={onRequest}>
          Request a change
        </Button>
      </View>
      <View style={styles.flex}>
        <Button pending={saving} oneLine onPress={accept}>
          Accept plan
        </Button>
      </View>
    </View>
  )
}

/** What she would like changed, in her words, sent to Dr. Patel. The
    sheet rises with the keyboard on an iPhone so the field and Send stay
    in sight. */
function RequestSheet({ onClose }: { onClose: () => void }) {
  const { plan, save } = useOnboarding()
  const [text, setText] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  async function send() {
    const words = text.trim()
    if (!words || plan?.status !== "proposed") return
    setSaving(true)
    await save({ plan: changeRequested(plan, words) })
    toast(`Sent to ${MEMBER.doctorShort}`)
    onClose()
  }
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={styles.flex} pointerEvents="box-none">
        <Sheet title="Request a change" onClose={onClose}>
          <TextField label="What would you like changed?" value={text} onChangeText={setText} multiline autoFocus />
          <Button disabled={!text.trim()} pending={saving} onPress={send}>
            {`Send to ${MEMBER.doctorShort}`}
          </Button>
        </Sheet>
      </View>
    </KeyboardAvoidingView>
  )
}

/** The plan's workouts at a glance, not day by day: each session with
    its days, its length and its moves, then the daily walk. Today's
    session is marked and opens the workout. */
function Workouts() {
  const onboarding = useOnboarding()
  const week = weekPlan(onboarding)
  const sessions = new Map<string, { session: NonNullable<(typeof week)[number]["session"]>; days: string[]; today: boolean }>()
  for (const d of week) {
    if (!d.session) continue
    const entry = sessions.get(d.session.id) ?? { session: d.session, days: [], today: false }
    entry.days.push(d.weekday)
    entry.today ||= d.today
    sessions.set(d.session.id, entry)
  }
  return (
    <Block title="Your workouts">
      <Group>
        {[...sessions.values()].map(({ session, days, today }) => {
          const live = today
          return (
            <NeedsRow
              key={session.id}
              icon={<Barbell size={16} color={color.primary} />}
              hue="teal"
              title={`${session.title}, ${session.focus.toLowerCase()}`}
              meta={`${days.join(", ")}. About ${session.minutes} minutes, ${session.exercises.length} moves: ${session.exercises.map((e) => e.name.toLowerCase()).join(", ")}.`}
              tag={live ? { tone: "primary", label: "Today" } : undefined}
              onPress={live ? () => router.push({ pathname: "/topic/[id]", params: { id: "exercise" } }) : undefined}
            />
          )
        })}
        <NeedsRow icon={<PersonSimpleWalk size={16} color={color.primary} />} hue="teal" title={WALK.title} meta={`Every day, ${WALK.detail}. ${WALK.how[0]}.`} />
      </Group>
    </Block>
  )
}

/** Every version of her plan, the current one first; none is ever lost. */
function Versions({ versions }: { versions: Version[] }) {
  const sorted = [...versions].sort((a, b) => b.version - a.version)
  if (!sorted.length) return null
  return (
    <Block title="Plan versions">
      <Group>
        {sorted.map((v, i) => (
          <NeedsRow
            key={v.version}
            title={`Version ${v.version}`}
            meta={`Approved ${dayOnly(v.approved)}. ${v.why.replace(/\.$/, "")}.`}
            right={i === 0 ? <Tag tone="ok">Current</Tag> : <Tag tone="muted">Kept</Tag>}
          />
        ))}
      </Group>
    </Block>
  )
}

/* -------------------------------------------------------------- stages -- */

/** "Tue, Oct 6" from a booked slot ("Tue, Oct 6, 7:30 AM" or an ISO time). */
function slotDay(slot: string) {
  if (/^\d{4}-\d{2}-\d{2}/.test(slot)) return dayLabel(dateOfAt(slot))
  return slot.split(",").slice(0, 2).join(",").trim()
}

/** "Blood panel Tue, Oct 6. DEXA Wed, Oct 7." from the starting tests'
    bookings, each test's day kept whole on its line. */
function testsLine(bookings: Snapshot["bookings"]) {
  const blood = bookings?.blood?.when
  const dexa = bookings?.dexa?.when
  const parts = [blood && keepTogether(`Blood panel ${slotDay(blood)}`), dexa && keepTogether(`DEXA ${slotDay(dexa)}`)].filter(Boolean)
  return parts.length ? `${parts.join(". ")}.` : "See them in To do"
}

/** Version 1 with Dr. Patel (Journey_7 "Your plan is being reviewed"), on
    the Upgrade tab: the one place a member in review sees her upgrade,
    since the rest of her app is the free one (9 Oct 2026). Where the plan
    is, as one card with its steps; what she can do meanwhile; and
    billing, which starts with the approval. */
function ReviewStage() {
  const onboarding = useOnboarding()
  const { membership, bookings, plan } = onboarding
  const generated = membership?.startedAt ? showDate(new Date(membership.startedAt)) : undefined
  const asked = plan?.requests?.at(-1)
  const steps: Step[] = asked
    ? [
        { label: "Built from your results", date: generated, state: "done" },
        { label: `Reviewed by ${MEMBER.doctorShort}`, state: "done" },
        { label: "You requested a change", date: showDate(new Date(asked.at)), state: "done" },
        { label: `Updates by ${MEMBER.doctorShort}`, date: "In progress", state: "now" },
        { label: "Ready for you to accept", date: "We'll let you know", state: "next" },
      ]
    : [
        { label: "Built from your results", date: generated, state: "done" },
        { label: `Review by ${MEMBER.doctorShort}`, date: "In progress · No appointment needed", state: "now" },
        { label: "Ready for you to accept", date: "We'll let you know", state: "next" },
      ]
  return (
    <>
      <ReviewHero name={planName(onboarding.goals)} />

      <Card style={styles.steps}>
        <Steps steps={steps} />
      </Card>

      <Requests requests={plan?.requests} />

      <Block title="While you wait">
        <Group>
          <NeedsRow
            icon={<RecordIcon name="labs" size={18} color={color.primary} />}
            hue="teal"
            title="Your starting tests"
            meta={onboarding.startingTests ? startingTestsLine(onboarding).line : testsLine(bookings)}
            onPress={() => openTab("/gaps", "plan")}
          />
        </Group>
        <AskButton about="your plan" onPress={() => router.push("/assistant?topic=plan")} />
      </Block>

      <Group>
        <NeedsRow icon={<CreditCard size={16} color={color.primary} />} hue="teal" title="Membership and billing" onPress={() => router.push("/membership")} />
      </Group>
    </>
  )
}

/** The review's hero, on the page itself, not in a card: the plan's one
    soft object floating over a teal halo that breathes while Dr. Patel has
    it, the live pill, a short title and the plan's name, centred. The
    steps follow on their own card. */
function ReviewHero({ name }: { name: string }) {
  const still = useReducedMotion()
  const t = React.useRef(new Animated.Value(0)).current
  React.useEffect(() => {
    if (still) return
    const ease = Easing.inOut(Easing.sin)
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 1800, easing: ease, useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 1800, easing: ease, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [still, t])
  const float = t.interpolate({ inputRange: [0, 1], outputRange: [0, -4] })
  const grow = t.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.06] })
  const fade = t.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0.5] })

  return (
    <View style={styles.hero}>
      <View style={styles.heroArt}>
        <Animated.View style={[styles.halo, { opacity: fade, transform: [{ scale: grow }] }]} />
        <View style={styles.haloInner} />
        <Animated.View style={{ transform: [{ translateY: float }] }}>
          <Art name="document" size={56} />
        </Animated.View>
      </View>
      <View style={styles.livePill}>
        <LiveDot size={7} />
        <Text style={styles.livePillText}>{`With ${MEMBER.doctorShort} now`}</Text>
      </View>
      <Text style={styles.heroTitle} accessibilityRole="header">
        Your plan is being reviewed
      </Text>
      <Text style={styles.heroName}>{name}</Text>
    </View>
  )
}

/** Paused: the daily plan and billing stop, the record carries on, every
    version is kept. */
function PausedStage() {
  const { plan, planHistory } = useOnboarding()
  return (
    <>
      <HeadCard style={styles.card}>
        <View style={styles.headerWords}>
          <Text style={headText.title}>Your plan is paused</Text>
          <Text style={headText.line}>Your daily plan and billing are stopped. Your record, trends and reminders carry on.</Text>
        </View>
        <PrimaryButton onPress={() => router.push("/membership?sheet=resume")}>Resume my plan</PrimaryButton>
      </HeadCard>
      <Versions versions={plan?.versions?.length ? plan.versions : (planHistory ?? [])} />
    </>
  )
}

/** How long the walked through review lasts before the approval. */
const WALK_REVIEW_MS = 4000

/** The review hero's halo, across. */
const HALO = 96

/** A bullet's size: it sits on the middle of the first line of its
    sentence, however the sentence wraps. */
const BULLET = 6

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // The header's day of the plan, right of "Plan".
  day: { ...type.meta },
  sectionTabs: { flexDirection: "row", borderRadius: 8, borderWidth: 1, borderColor: hairline.outline, backgroundColor: color.background, overflow: "hidden" },
  // Five equal cells: a slightly smaller label and tighter side padding keep
  // every word on one line down to a small phone.
  sectionTab: { flex: 1, minWidth: 0, minHeight: 44, paddingHorizontal: 4, alignItems: "center", justifyContent: "center" },
  sectionTabRule: { borderLeftWidth: 1, borderLeftColor: hairline.outline },
  sectionTabOn: { backgroundColor: color.primaryTint },
  sectionTabText: { ...type.title, fontSize: 13, color: ink.secondary, textAlign: "center" },
  sectionTabTextOn: { color: color.primary },
  photos: { alignItems: "center", gap: space.inline, paddingVertical: space.card * 1.5 },
  photosText: { textAlign: "center" },
  // The longer label gets the wider half, so both stay on one line.
  actionWide: { flex: 1.25 },
  // Request a change and Accept plan, side by side over the tab bar.
  actions: { flexDirection: "row", gap: space.item },
  pressed: { opacity: 0.8 },
  cardSubtitle: { ...type.title },
  body: { ...type.body },
  strong: { fontFamily: font.semibold },
  // The Outlook's four horizons, two across over two, the likelihood last.
  horizons: { flexDirection: "row", flexWrap: "wrap", gap: space.item },
  horizon: { flexBasis: "47%", flexGrow: 1, gap: 2, paddingVertical: space.inline },
  horizonValue: { ...type.stat },
  likely: { ...type.label, fontFamily: font.medium, color: color.primary, marginTop: space.stack },
  chartCard: { gap: space.card },
  meta: { ...type.meta },
  // The proposed plan's cards, one per plan: the head over a hairline,
  // then each item with its area in a column on the left.
  plans: { gap: space.item },
  planCard: { gap: 0, paddingVertical: 0 },
  planHead: { flexDirection: "row", alignItems: "flex-start", gap: space.inline, paddingVertical: space.card, borderBottomWidth: 1, borderBottomColor: hairline.rule },
  planTitleLine: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: space.inline },
  planName: { ...type.section },
  item: { flexDirection: "row", alignItems: "flex-start", gap: space.inline, paddingVertical: space.inline },
  itemArea: { ...type.meta, width: 72, paddingTop: 2 },
  itemWords: { flex: 1, gap: 2 },
  itemText: { ...type.title },
  // A card's heading and what it holds.
  card: { gap: space.item },

  headerWords: { flex: 1, gap: space.stack },

  // The plan summary: figures side by side over a goal bar.
  summaryTop: { flexDirection: "row", alignItems: "flex-start", gap: space.item },
  stats: { flexDirection: "row", gap: space.item },
  stat: { flex: 1, gap: 2, padding: space.inline, borderRadius: 8, backgroundColor: color.background, borderWidth: 1, borderColor: color.primaryEdge },
  statValue: { ...type.stat },
  track: { height: 6, borderRadius: 3, backgroundColor: color.primaryEdge, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3, backgroundColor: color.primary },

  // The version with the doctor and what it changes read as one group.
  redraft: { gap: space.item },
  // Spaced as the plan's ticked lines (the record kit's CheckLines).
  changes: { gap: space.mark },
  change: { flexDirection: "row", alignItems: "flex-start", gap: space.inline },
  changeDot: { width: BULLET, height: BULLET, borderRadius: BULLET / 2, marginTop: (type.body.lineHeight - BULLET) / 2, backgroundColor: color.primary },

  // Rows edge to edge like a Group's: the first row's own space above
  // makes up the card's padding, and the link row ends the card.
  targets: { paddingHorizontal: space.rowX, paddingTop: space.card - space.rowY, paddingBottom: 0, gap: space.inline },
  cardLink: { borderTopWidth: 1, borderTopColor: hairline.rule },

  // The review card: its title, then the steps under a hairline. The last
  // step keeps its own space below (the kit's space.item), so the card's
  // is trimmed to make up its padding.
  // The review hero: centred on the page, the object over two teal rings.
  // The last step keeps its own space below, so the card trims its padding.
  steps: { paddingBottom: space.card - space.item },
  hero: { alignItems: "center", gap: space.inline, paddingTop: space.item },
  heroArt: { width: HALO, height: HALO, alignItems: "center", justifyContent: "center", marginBottom: space.inline },
  halo: { position: "absolute", width: HALO, height: HALO, borderRadius: HALO / 2, backgroundColor: color.primaryTint, borderWidth: 1, borderColor: color.primaryEdge },
  haloInner: { position: "absolute", width: HALO * 0.72, height: HALO * 0.72, borderRadius: HALO * 0.36, backgroundColor: "#E3F1F0" },
  livePill: { flexDirection: "row", alignItems: "center", gap: space.inline, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: color.primaryTint, borderWidth: 1, borderColor: color.primaryEdge },
  livePillText: { ...type.label, fontFamily: font.medium, color: color.primary },
  heroTitle: { fontFamily: font.semibold, fontSize: 20, lineHeight: 26, letterSpacing: -0.3, color: ink.strong, textAlign: "center", marginTop: space.stack },
  heroName: { ...type.label, textAlign: "center" },

})
