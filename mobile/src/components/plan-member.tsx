import { router } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { Art } from "@/components/art"
import { IconBloodPressure, IconCard, IconDumbbell, IconScale, IconScan, IconSparkle, IconTape, IconWalk, IconWatch } from "@/components/icons"
import { DevicesSheet } from "@/components/plan-tab-devices"
import { FocusIcon } from "@/components/plan-tab-pieces"
import { RecordIcon } from "@/components/record-icons"
import {
  Banner,
  Block,
  Card,
  CheckLines,
  EmptyState,
  Group,
  HUE,
  KeyValue,
  NeedsRow,
  ReviewBanner,
  SeeAllRow,
  SmallAction,
  Steps,
  Tag,
  type Step,
} from "@/components/record-kit"
import { TabScreen } from "@/components/tab-bar"
import { Button } from "@/components/ui"
import { relativeDay } from "@/lib/dates"
import { useExperience, useMarkers } from "@/lib/experience"
import { MEMBER, NEXT_REVIEW, PLAN_DRAFT, WALK, profileOf, progress, shortDay, thisWeek, weekPlan, type WeekItem } from "@/lib/member"
import { FOCUS_NAME } from "@/lib/offers"
import { useOnboarding, type Plan } from "@/lib/onboarding"
import { livePlan } from "@/lib/plans"
import { BUILD, SETUP, nextSetup } from "@/lib/program"
import { MARKER_CARE, type Biomarker, type FocusArea } from "@/lib/record"
import { classify, valueText, withUnit } from "@/lib/trends"
import { color, font, hairline, ink, space, type } from "@/lib/theme"

/* The Plan tab for a member (FINAL-SPEC C.16): her approved plan as a
   document she can trust. Who approved it and when it is reviewed next;
   what it focuses on and the goal for each; her daily targets; her week;
   her check ins and the tests in the plan; why it last changed; every
   version, kept. The doctor's name belongs here: this is care, not an
   offer. Nothing on it sells, and there are no prototype controls (they
   live on /demo).

   It also draws the member's other stages (C.16.2): setup still to finish,
   version 1 with Dr. Patel, and the plan paused. A newer version with the
   doctor shows over the live plan, which stays in place until it is
   approved (M-55). It renders its own tab screen, so the devices sheet
   passes over the tab bar. */

type Snapshot = Parameters<ReturnType<typeof useOnboarding>["save"]>[0]
type Version = Plan["versions"][number]

/** "Sep 12, 2026" as "Sep 12". */
const dayOnly = (approved: string) => approved.replace(/,\s*\d{4}$/, "")

export function PlanMember() {
  const { experience, sharingOff } = useExperience()
  const [devices, setDevices] = React.useState(false)
  return (
    <TabScreen tab="plan" title="Plan" overlay={devices ? <DevicesSheet onClose={() => setDevices(false)} /> : undefined}>
      {sharingOff && <ReviewBanner state={{ kind: "sharing-off", since: sharingOff.on ?? "" }} onPress={() => router.push("/connect")} />}
      {experience === "member-setup" ? (
        <SetupStage />
      ) : experience === "member-review" ? (
        <ReviewStage />
      ) : experience === "paused" ? (
        <PausedStage />
      ) : (
        <LivePlan onDevices={() => setDevices(true)} />
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

function LivePlan({ onDevices }: { onDevices: () => void }) {
  const onboarding = useOnboarding()
  const markers = useMarkers()
  const now = new Date()
  const profile = profileOf(onboarding)
  const versions = onboarding.plan?.versions ?? []
  // The version she follows, and a newer one while it is with the doctor.
  const live = livePlan(onboarding)
  const reviewing = live?.reviewing
  // The version's own words where the sample plan has them; a version
  // approved on this device (from /demo) has its one line.
  const details = profile.versions.find((v) => v.version === live?.version)
  const week = thisWeek(onboarding, now)
  const labs = week.find((w) => w.kind === "test")
  const bone = profile.focus === "bone"

  return (
    <>
      <Card style={styles.header}>
        <View style={styles.headerWords}>
          <Text style={styles.cardTitle} accessibilityRole="header">
            Your plan
          </Text>
          {live && (
            <View style={styles.versionLine}>
              <Text style={styles.version}>{`Version ${live.version}`}</Text>
              <Tag tone="ok">Active</Tag>
            </View>
          )}
          <View style={styles.headerMeta}>
            {live && <Text style={styles.meta}>{`Approved by ${MEMBER.doctor}, ${live.on}`}</Text>}
            <Text style={styles.meta}>{NEXT_REVIEW.words}</Text>
          </View>
        </View>
        <Art name="target" size={64} />
      </Card>

      {reviewing !== undefined && live && (
        <View style={styles.redraft}>
          <Banner
            hue="teal"
            live
            icon={<RecordIcon name="documents" size={18} color={HUE.teal.ink} />}
            title={`Version ${reviewing} is with ${live.by}`}
            meta={`Version ${live.version} stays in place until it's approved.`}
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
        </View>
      )}

      <Block title="What it focuses on" variant="title">
        <Group>
          {profile.areas.map((area) => (
            <NeedsRow key={area} icon={<FocusIcon area={area} />} hue="teal" title={FOCUS_NAME[area]} meta={focusLine(area, onboarding, markers, week, now)} />
          ))}
        </Group>
      </Block>

      <Block title="Daily targets" variant="title">
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

      <YourWeek />

      <Block title="Check ins" variant="title">
        <Group>
          <NeedsRow icon={<IconScale size={18} color={color.primary} />} hue="teal" title="Weigh in" meta="Thursday mornings" />
          {bone ? (
            <NeedsRow icon={<IconDumbbell size={18} color={color.primary} />} hue="teal" title="Chair stands" meta="Once a month" />
          ) : (
            <NeedsRow icon={<IconBloodPressure size={18} color={color.primary} />} hue="teal" title="Blood pressure" meta="Every evening" />
          )}
          {!bone && <NeedsRow icon={<IconTape size={18} color={color.primary} />} hue="teal" title="Waist" meta="Once a month" />}
        </Group>
      </Block>

      <Block title="Tests in your plan" variant="title">
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
          <NeedsRow icon={<IconScan size={18} color={color.primary} />} hue="teal" title="DEXA scan" meta={bone ? "May 2027" : "January"} />
          {!bone && <NeedsRow icon={<RecordIcon name="labs" size={18} color={color.primary} />} hue="teal" title="Next labs" meta="January" />}
        </Group>
      </Block>

      {live && (
        <Block title="Why your plan changed" variant="title">
          <Card style={styles.card}>
            <Text style={styles.cardSubtitle}>{`Version ${live.version}, ${live.on}`}</Text>
            <Text style={styles.body}>{details?.why ?? `${live.why}.`}</Text>
            {!!details?.changes.length && <CheckLines lines={details.changes} />}
          </Card>
        </Block>
      )}

      <Versions versions={versions} />

      <Group>
        <NeedsRow
          icon={<IconWatch size={18} color={color.primary} />}
          hue="teal"
          title="Watch, ring or scale"
          tag={{ tone: "muted", label: "Coming soon" }}
          onPress={onDevices}
        />
        <NeedsRow icon={<IconSparkle size={18} color={color.primary} />} hue="teal" title="Ask about your plan" onPress={() => router.push("/assistant?topic=plan")} />
        <NeedsRow icon={<IconCard size={18} color={color.primary} />} hue="teal" title="Membership and billing" onPress={() => router.push("/membership")} />
      </Group>
    </>
  )
}

/** "A" or "B" for the weight plan's two strength sessions; nothing when
    the plan has one kind of session. */
const letterOf = (title: string) => /^Strength ([A-Z])$/.exec(title)?.[1]

/** The plan's week, Monday to Sunday: a dumbbell on a strength day,
    footprints on a walk only day, filled once done, today ringed. Tap a
    day to see what it holds. */
function YourWeek() {
  const onboarding = useOnboarding()
  const week = weekPlan(onboarding)
  const todayAt = Math.max(0, week.findIndex((d) => d.today))
  const [selected, setSelected] = React.useState(todayAt)
  const day = week[selected] ?? week[todayAt]
  const letters = week.some((d) => d.session && letterOf(d.session.title))
  const when = day.today ? "Today" : relativeDay(day.date)
  const what = day.session
    ? `${day.session.title}, ${day.session.focus.toLowerCase()}, ${day.session.exercises.length} moves, about ${day.session.minutes} minutes`
    : `${WALK.title}, ${WALK.minutes} minutes`

  return (
    <Block title="Your week" variant="title">
      <Card style={styles.card}>
        <View style={styles.week} accessibilityRole="radiogroup">
          {week.map((d, i) => {
            const done = d.session ? d.sessionDone : d.walked
            const on = i === selected
            const Glyph = d.session ? IconDumbbell : IconWalk
            return (
              <Pressable
                key={d.day}
                onPress={() => setSelected(i)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${relativeDay(d.date)}, ${d.line}${done ? ", done" : ""}`}
                hitSlop={4}
                style={({ pressed }) => [styles.weekDay, pressed && styles.pressed]}
              >
                <Text style={[styles.weekName, on && styles.weekNameOn]}>{d.weekday}</Text>
                <View style={[styles.weekRing, d.today && styles.weekRingToday]}>
                  <View style={[styles.weekDot, done && styles.weekDotDone]}>
                    <Glyph size={16} color={done ? color.onPrimary : color.primary} />
                  </View>
                </View>
                {letters && <Text style={styles.weekLetter}>{d.session ? (letterOf(d.session.title) ?? "") : "Walk"}</Text>}
              </Pressable>
            )
          })}
        </View>
        <View style={styles.dayLine}>
          <Text style={[styles.body, styles.dayText]}>
            <Text style={styles.dayWhen}>{`${when}: `}</Text>
            {what}
          </Text>
          {day.today && day.session && <SmallAction onPress={() => router.push("/exercise")}>Open</SmallAction>}
        </View>
      </Card>
    </Block>
  )
}

/** Every version of her plan, the current one first; none is ever lost. */
function Versions({ versions }: { versions: Version[] }) {
  const sorted = [...versions].sort((a, b) => b.version - a.version)
  if (!sorted.length) return null
  return (
    <Block title="Plan versions" variant="title">
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

/** Joined, setup not finished: the steps done and the next one. */
function SetupStage() {
  const { setupDone = [], membership } = useOnboarding()
  const next = nextSetup(setupDone)
  const at = next ? SETUP.findIndex((s) => s.id === next.id) : SETUP.length - 1
  const started = membership?.startedAt ? new Date(membership.startedAt) : undefined
  const steps: Step[] = SETUP.map((s) => ({
    label: s.title,
    state: setupDone.includes(s.id) ? "done" : s.id === next?.id ? "now" : "next",
  }))
  return (
    <>
      <Card style={styles.titled}>
        <View style={styles.versionLine}>
          <Text style={[styles.cardTitle, styles.flex]}>Optimization membership</Text>
          <Tag tone="ok">Active</Tag>
        </View>
        {started && !Number.isNaN(started.getTime()) && <Text style={styles.meta}>{`Started ${shortDay(started)}`}</Text>}
      </Card>
      <Block title="Set up your plan" variant="title" meta={`Step ${at + 1} of ${SETUP.length}`}>
        <Card style={styles.steps}>
          <Steps steps={steps} />
        </Card>
      </Block>
      {next && <Button onPress={() => router.push(next.href)}>Continue setup</Button>}
    </>
  )
}

/** Version 1 with Dr. Patel: a draft until it is approved. */
function ReviewStage() {
  const steps: Step[] = [
    ...BUILD.slice(0, -1).map((b): Step => ({ label: b.title, date: b.detail, state: "done" })),
    { label: `With ${MEMBER.doctorShort}`, state: "alert" },
  ]
  return (
    <>
      {/* The kit's centred state card: the object, a title and its line. */}
      <EmptyState
        art="document"
        artSize={96}
        title={`Your plan is with ${MEMBER.doctorShort}`}
        line={`It stays a draft until ${MEMBER.doctorShort} approves it. We'll let you know.`}
      />
      <Block title="How it was built" variant="title">
        <Card style={styles.steps}>
          <Steps steps={steps} />
        </Card>
      </Block>
    </>
  )
}

/** Paused: the daily plan and billing stop, the record carries on, every
    version is kept. */
function PausedStage() {
  const { plan, planHistory } = useOnboarding()
  return (
    <>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerWords}>
            <Text style={styles.cardTitle}>Your plan is paused</Text>
            <Text style={styles.body}>Your daily plan and billing are stopped. Your record, trends and reminders carry on.</Text>
          </View>
          <Art name="target" size={64} />
        </View>
        <Button onPress={() => router.push("/membership?sheet=resume")}>Resume my plan</Button>
      </Card>
      <Versions versions={plan?.versions?.length ? plan.versions : (planHistory ?? [])} />
    </>
  )
}

/** A bullet's size: it sits on the middle of the first line of its
    sentence, however the sentence wraps. */
const BULLET = 6

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.8 },
  cardTitle: { ...type.section },
  cardSubtitle: { ...type.title },
  body: { ...type.body },
  meta: { ...type.meta },
  // A card's heading and what it holds.
  card: { gap: space.item },
  // A card whose title has only its lines under it.
  titled: { gap: space.stack },

  header: { flexDirection: "row", alignItems: "flex-start", gap: space.lead },
  headerWords: { flex: 1, gap: space.stack },
  headerMeta: { gap: space.line },
  versionLine: { flexDirection: "row", alignItems: "center", gap: space.inline },
  version: { ...type.title },

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

  week: { flexDirection: "row", justifyContent: "space-between" },
  weekDay: { alignItems: "center", gap: space.inline },
  // Weekdays as the chart kit labels a week (type.axis); the chosen day's
  // in the title weight and the strongest ink, as a chart's selected day.
  weekName: { ...type.axis },
  weekNameOn: { fontFamily: font.medium, color: ink.strong },
  // The same outer ring on every day, so today's does not shift the row.
  weekRing: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: "transparent", padding: 1 },
  weekRingToday: { borderColor: color.primary },
  weekDot: { flex: 1, borderRadius: 18, backgroundColor: color.primaryTint, alignItems: "center", justifyContent: "center" },
  weekDotDone: { backgroundColor: color.primary },
  // The session's letter: a small group label, one grey lighter than the
  // chosen weekday.
  weekLetter: { ...type.metaStrong, color: ink.detail },
  dayLine: { flexDirection: "row", alignItems: "center", gap: space.item, paddingTop: space.rowY, borderTopWidth: 1, borderTopColor: hairline.rule },
  dayText: { flex: 1 },
  // "Today:" leads the sentence in the title weight.
  dayWhen: { fontFamily: font.medium, color: ink.strong },

  // The last step keeps its own space below (the kit's space.item), so the
  // card's is trimmed to make up its padding.
  steps: { paddingBottom: space.card - space.item },
})
