import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"

import { planName } from "@/components/enrollment-kit"

import { Barbell, Camera, Heartbeat, PersonSimpleWalk, Ruler, Scales, Scan, Sparkle, Watch } from "@/components/ph"
import { DevicesSheet } from "@/components/plan-tab-devices"
import { FocusIcon, HeadCard, headText } from "@/components/plan-tab-pieces"
import { RecordIcon } from "@/components/record-icons"
import {
  Block,
  Card,
  CheckLines,
  Group,
  KeyValue,
  NeedsRow,
  ReviewBanner,
  SeeAllRow,
  Tag,
} from "@/components/record-kit"
import { TabScreen } from "@/components/tab-bar"
import { PrimaryButton } from "@/components/hol"
import { useExperience, useMarkers } from "@/lib/experience"
import { MEMBER, WALK, WEIGH_IN, profileOf, progress, thisWeek, weekPlan, type WeekItem } from "@/lib/member"
import { FOCUS_NAME } from "@/lib/offers"
import { useOnboarding, type Plan } from "@/lib/onboarding"
import { planDayNow } from "@/components/plan-review"
import { YourHistory } from "@/components/plan-history"
import { PlanToday } from "@/components/plan-today"
import { CheckInSheet, type CheckInKind } from "@/components/check-in-sheet"
import { Outlook } from "@/components/plan-outlook"
import { ProgressAsk, YourProgress } from "@/components/plan-progress"
import { livePlan } from "@/lib/plans"
import { MARKER_CARE, type Biomarker, type FocusArea } from "@/lib/record"
import { classify, valueText, withUnit } from "@/lib/trends"
import { color, font, hairline, ink, space, type } from "@/lib/theme"
import { keepEnd } from "@/lib/words"

/* The Plan tab for a member (FINAL-SPEC C.16): her approved plan as a
   document she can trust. When it started;
   what it focuses on and the goal for each; her daily targets; her week;
   her check ins and the tests in the plan; why it last changed; every
   version, kept. The doctor's name belongs here: this is care, not an
   offer. Nothing on it sells, and there are no prototype controls (they
   live on /demo).

   It also draws the plan paused. The plan is live from the moment she
   enrolls: nothing goes to her physician for review, so there is no
   version to wait on or accept (27 Oct 2026). It renders its own tab
   screen, so the devices sheet passes over the tab bar. */

type Snapshot = Parameters<ReturnType<typeof useOnboarding>["save"]>[0]
type Version = Plan["versions"][number]

/** "Sep 12, 2026" as "Sep 12". */
const dayOnly = (approved: string) => approved.replace(/,\s*\d{4}$/, "")

export function PlanMember() {
  const { experience, sharingOff } = useExperience()
  const [devices, setDevices] = React.useState(false)
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
  const { section: asked } = useLocalSearchParams<{ section?: string }>()
  // Home's See more opens Plan straight on a section (Today's goals → Today).
  React.useEffect(() => {
    if (asked && SECTIONS.some((o) => o.value === asked)) setSection(asked as Section)
  }, [asked])
  const overlay = devices ? (
    <DevicesSheet onClose={() => setDevices(false)} />
  ) : checkIn ? (
    <CheckInSheet kind={checkIn} onClose={() => setCheckIn(undefined)} />
  ) : undefined
  // The live plan reads in four sections under the header: Today first.
  const live = experience !== "paused"
  return (
    <TabScreen
      tab="plan"
      title="Your personalized care plan"
      headerRight={live ? <Text style={styles.day}>{`Day ${Math.max(1, planDayNow(onboarding))}`}</Text> : undefined}
      pinned={live ? <SectionTabs value={section} onChange={setSection} /> : undefined}
      overlay={overlay}
      footer={live && section === "progress" ? <ProgressAsk /> : undefined}
    >
      {sharingOff && <ReviewBanner state={{ kind: "sharing-off", since: sharingOff.on ?? "" }} onPress={() => router.push("/connect")} />}
      {experience === "paused" ? (
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
  const live = livePlan(onboarding)
  // The version's own words where the sample plan has them; a version
  // accepted on this device (from /demo) has its one line.
  const details = profileOf(onboarding).versions.find((v) => v.version === live?.version)

  return (
    <>
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
          <Text style={headText.meta}>{`Version ${version}, since ${approved}`}</Text>
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
            meta={`Started ${dayOnly(v.approved)}. ${v.why.replace(/\.$/, "")}.`}
            right={i === 0 ? <Tag tone="ok">Current</Tag> : <Tag tone="muted">Kept</Tag>}
          />
        ))}
      </Group>
    </Block>
  )
}

/* -------------------------------------------------------------- stages -- */

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


const styles = StyleSheet.create({
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
  pressed: { opacity: 0.8 },
  strong: { fontFamily: font.semibold },
  // The Outlook's four horizons, two across over two, the likelihood last.
  horizons: { flexDirection: "row", flexWrap: "wrap", gap: space.item },
  horizon: { flexBasis: "47%", flexGrow: 1, gap: 2, paddingVertical: space.inline },
  horizonValue: { ...type.stat },
  likely: { ...type.label, fontFamily: font.medium, color: color.primary, marginTop: space.stack },
  chartCard: { gap: space.card },
  meta: { ...type.meta },
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


  // Rows edge to edge like a Group's: the first row's own space above
  // makes up the card's padding, and the link row ends the card.
  targets: { paddingHorizontal: space.rowX, paddingTop: space.card - space.rowY, paddingBottom: 0, gap: space.inline },
  cardLink: { borderTopWidth: 1, borderTopColor: hairline.rule },


})
