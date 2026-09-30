import { router } from "expo-router"
import * as React from "react"
import { Image, Pressable, StyleSheet, Text, View } from "react-native"

import { ProgressChart } from "@/components/charts"
import { Badge, Chip, Section } from "@/components/flow"
import { IconCheck, IconChevronRight, IconSparkle } from "@/components/icons"
import { List, ListRow } from "@/components/list"
import { TabScreen } from "@/components/tab-bar"
import { Button } from "@/components/ui"
import { dayKey, showDate } from "@/lib/dates"
import { useOnboarding, type Plan } from "@/lib/onboarding"
import { TIERS, programName, recommend } from "@/lib/plans"
import { BUILD, MILESTONE, PROGRESS, REPEAT_TESTS, SETUP, TODAY, nextSetup, type PlanAction } from "@/lib/program"
import { color, font } from "@/lib/theme"

/* Plan: before a membership, what the record suggests; once paid, where
   the plan is: setup to finish, a draft with the doctor, or live. A live
   plan is today's actions (tick them off, see how), a check in, progress
   against the start with a forecast marked as one, the repeat tests that
   measure it, and every approved version. New information redrafts the
   plan, and the doctor approves each version before it replaces the last. */

const MARK = require("../../assets/splash-icon.png")

export default function PlanScreen() {
  const { membership, plan, setupDone = [] } = useOnboarding()
  const member = membership?.tier === "optimization"
  const setupNext = nextSetup(setupDone)

  return (
    <TabScreen tab="plan" title="Plan">
      {!member ? (
        <Suggested />
      ) : membership?.paused ? (
        <Paused />
      ) : setupNext || !plan ? (
        <Setup done={setupDone} />
      ) : plan.status === "review" ? (
        <InReview plan={plan} />
      ) : (
        <Live plan={plan} />
      )}
    </TabScreen>
  )
}

/* ------------------------------------------------------------ not paid -- */

function Suggested() {
  const suggested = React.useMemo(recommend, [])
  return (
    <>
      <Section title="Suggested for you">
        <List>
          {suggested.map((r) => (
            <ListRow
              key={r.program}
              icon={
                <View style={styles.tile}>
                  <IconSparkle color={color.primary} size={16} />
                </View>
              }
              title={programName(r.program)}
              meta={r.reasons.join(", ")}
            />
          ))}
        </List>
        <Button onPress={() => router.push("/plans")}>See suggested plans</Button>
      </Section>
      <Text style={styles.small}>Not now is fine. Your record keeps building and your doctor keeps using it.</Text>
      <Pressable onPress={() => router.push("/assistant")} accessibilityRole="button" style={({ pressed }) => [styles.ask, pressed && styles.pressed]}>
        <Image source={MARK} style={styles.mark} resizeMode="contain" />
        <View style={styles.askBody}>
          <Text style={styles.askTitle}>Not sure which plan?</Text>
          <Text style={styles.askMeta}>Tell the assistant what's bothering you</Text>
        </View>
        <IconChevronRight color={color.muted} />
      </Pressable>
    </>
  )
}

/* -------------------------------------------------------------- setup -- */

function Setup({ done }: { done: string[] }) {
  const next = nextSetup(done as never)
  return (
    <>
      <Membership />
      <Section title="Set up your plan">
        <List>
          {SETUP.map((s, i) => {
            const finished = done.includes(s.id)
            return (
              <ListRow
                key={s.id}
                icon={
                  <View style={[styles.step, finished && styles.stepDone]}>
                    {finished ? <IconCheck size={14} color={color.onPrimary} strokeWidth={2.6} /> : <Text style={styles.stepNo}>{i + 1}</Text>}
                  </View>
                }
                title={s.title}
                right={next?.id === s.id ? <Badge>Next</Badge> : undefined}
              />
            )
          })}
        </List>
        {next && <Button onPress={() => router.push(next.href)}>Continue setup</Button>}
      </Section>
    </>
  )
}

function Membership() {
  const { membership } = useOnboarding()
  return (
    <View style={styles.current}>
      <View style={styles.currentIcon}>
        <IconSparkle color={color.onPrimary} size={18} />
      </View>
      <View style={styles.askBody}>
        <Text style={styles.currentName}>{TIERS.optimization.name}</Text>
        <Text style={styles.askMeta}>{membership?.programs.map(programName).join(", ")}</Text>
      </View>
      <Badge>{membership?.paused ? "Paused" : "Active"}</Badge>
    </View>
  )
}

/** Paused or back on the free record: nothing is lost. */
function Paused() {
  const onboarding = useOnboarding()
  const { membership } = onboarding
  return (
    <>
      <Membership />
      <View style={styles.review}>
        <Text style={styles.reviewTitle}>Your plan is paused</Text>
        <Text style={styles.reviewText}>
          Your history, trends, reminders and care gaps carry on. Every version of your plan is kept for when you come back.
        </Text>
      </View>
      <Button onPress={() => membership && onboarding.save({ membership: { ...membership, paused: false } })}>Resume my plan</Button>
    </>
  )
}

/* ------------------------------------------------------------- review -- */

function InReview({ plan }: { plan: Plan }) {
  const onboarding = useOnboarding()
  const redraft = plan.versions.length > 0
  async function approve() {
    const why = redraft ? "New blood pressure readings from your cuff" : "Your first plan"
    await onboarding.save({
      plan: { status: "live", version: plan.version, versions: [{ version: plan.version, approved: showDate(), why }, ...plan.versions] },
    })
  }
  return (
    <>
      <Membership />
      <View style={styles.review}>
        <Text style={styles.reviewTitle}>{redraft ? `Version ${plan.version} is with Dr. Patel` : "Your plan is with Dr. Patel"}</Text>
        <Text style={styles.reviewText}>
          {redraft
            ? "New readings came in, so your plan was redrafted. Your current plan stays in place until Dr. Patel approves the new one."
            : "It stays a draft until your doctor approves it. We'll let you know when it's ready."}
        </Text>
      </View>
      <Section title="How it was built">
        <List>
          {BUILD.map((b, i) => {
            const last = i === BUILD.length - 1
            return (
              <ListRow
                key={b.title}
                icon={
                  <View style={[styles.step, !last && styles.stepDone]}>
                    {!last ? <IconCheck size={14} color={color.onPrimary} strokeWidth={2.6} /> : <View style={styles.pulse} />}
                  </View>
                }
                title={b.title}
                meta={b.detail}
                right={last ? <Badge tone="low">In review</Badge> : undefined}
              />
            )
          })}
        </List>
      </Section>
      {/* Prototype reviews: stand in for the doctor's approval in the portal. */}
      <Button variant="outline" onPress={approve}>
        Preview the approved plan
      </Button>
    </>
  )
}

/* --------------------------------------------------------------- live -- */

function Live({ plan }: { plan: Plan }) {
  const onboarding = useOnboarding()
  const today = dayKey()
  const done = onboarding.log?.[today] ?? []
  const checkIn = onboarding.checkIn?.[today]
  const [open, setOpen] = React.useState<string | null>(null)

  const toggle = (id: string) =>
    onboarding.save({ log: { ...onboarding.log, [today]: done.includes(id) ? done.filter((x) => x !== id) : [...done, id] } })

  return (
    <>
      <View style={styles.version}>
        <View style={styles.askBody}>
          <Text style={styles.currentName}>Version {plan.version}</Text>
          <Text style={styles.askMeta}>Approved by Dr. Maya Patel, {plan.versions[0]?.approved}</Text>
        </View>
        <Badge tone="ok">Live</Badge>
      </View>

      <Section title="Today" action={<Text style={styles.count}>{`${done.length} of ${TODAY.length} done`}</Text>}>
        <View style={styles.actions}>
          {TODAY.map((a) => (
            <Action
              key={a.id}
              action={a}
              done={done.includes(a.id)}
              open={open === a.id}
              onToggle={() => toggle(a.id)}
              onOpen={() => setOpen(open === a.id ? null : a.id)}
            />
          ))}
        </View>
      </Section>

      <Section title="How did today go?">
        <View style={styles.chips}>
          {["Went well", "Partly", "Didn't happen"].map((c) => (
            <Chip key={c} label={c} selected={checkIn === c} onPress={() => onboarding.save({ checkIn: { ...onboarding.checkIn, [today]: c } })} />
          ))}
        </View>
        {checkIn === "Didn't happen" && <Text style={styles.small}>That's part of it. Tomorrow's list starts fresh.</Text>}
        <Text style={styles.small}>Miss three days in a row and we'll check in, then let Dr. Patel know.</Text>
      </Section>

      <View style={styles.milestone}>
        <Text style={styles.milestoneTitle}>{MILESTONE.title}</Text>
        <Text style={styles.milestoneText}>{MILESTONE.body}</Text>
      </View>

      <Section title="Progress since you started">
        {PROGRESS.map((p) => (
          <View key={p.id} style={styles.progress}>
            <View style={styles.progressHead}>
              <Text style={styles.progressName}>{p.name}</Text>
              <Text style={styles.progressValue}>
                {p.now.toLocaleString("en-US")} <Text style={styles.progressUnit}>{p.unit}</Text>
              </Text>
            </View>
            <Text style={styles.askMeta}>
              Started at {p.start.toLocaleString("en-US")}, goal {p.goal.toLocaleString("en-US")}
            </Text>
            <ProgressChart points={p.points} forecast={p.forecast} goal={p.goal} />
          </View>
        ))}
        <Text style={styles.small}>The dashed line is a forecast from your first weeks, not a promise.</Text>
      </Section>

      <Section title="Repeat tests">
        <List>
          {REPEAT_TESTS.map((t) => (
            <ListRow key={t.name} title={t.name} meta={`${t.when}, ${t.where}`} right={<Badge>Booked</Badge>} />
          ))}
        </List>
      </Section>

      <Section title="Plan versions">
        <List>
          {plan.versions.map((v) => (
            <ListRow key={v.version} title={`Version ${v.version}`} meta={`${v.why}. Approved ${v.approved}`} right={v.version === plan.version ? <Badge tone="ok">Current</Badge> : <Badge tone="ink">Kept</Badge>} />
          ))}
        </List>
        {/* Prototype reviews: new data arriving, e.g. from the cuff, redrafts
            the plan for the doctor. */}
        <Button variant="outline" onPress={() => onboarding.save({ plan: { ...plan, status: "review", version: plan.version + 1 } })}>
          New readings arrive
        </Button>
      </Section>
    </>
  )
}

function Action({
  action,
  done,
  open,
  onToggle,
  onOpen,
}: {
  action: PlanAction
  done: boolean
  open: boolean
  onToggle: () => void
  onOpen: () => void
}) {
  return (
    <View style={[styles.action, done && styles.actionDone]}>
      <View style={styles.actionTop}>
        <Pressable
          onPress={onToggle}
          hitSlop={8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={action.title}
          style={[styles.tick, done && styles.tickOn]}
        >
          {done && <IconCheck size={14} color={color.onPrimary} strokeWidth={2.6} />}
        </Pressable>
        <Pressable onPress={onOpen} accessibilityRole="button" accessibilityState={{ expanded: open }} style={styles.actionBody}>
          <Text style={[styles.actionTitle, done && styles.actionTitleDone]}>{action.title}</Text>
          <Text style={styles.askMeta}>{action.detail}</Text>
        </Pressable>
        <Pressable onPress={onOpen} hitSlop={8} style={{ transform: [{ rotate: open ? "90deg" : "0deg" }] }}>
          <IconChevronRight size={16} color={color.muted} />
        </Pressable>
      </View>
      {action.target !== undefined && (
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${Math.min(100, ((action.sofar ?? 0) / action.target) * 100)}%` }]} />
        </View>
      )}
      {open && (
        <View style={styles.how}>
          {action.how.map((h) => (
            <View key={h} style={styles.howRow}>
              <View style={styles.howDot} />
              <Text style={styles.howText}>{h}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },
  small: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: color.muted },
  count: { fontFamily: font.medium, fontSize: 13, color: color.muted },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  tile: { width: 36, height: 36, borderRadius: 12, backgroundColor: color.primaryTint, alignItems: "center", justifyContent: "center" },
  ask: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: color.canvas, borderRadius: 18, padding: 14 },
  mark: { width: 32, height: 32 },
  askBody: { flex: 1, gap: 2 },
  askTitle: { fontFamily: font.medium, fontSize: 15, color: color.text },
  askMeta: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.muted },

  current: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: color.primaryTint, borderRadius: 20, padding: 14 },
  currentIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: color.primary, alignItems: "center", justifyContent: "center" },
  currentName: { fontFamily: font.semibold, fontSize: 16, color: color.text },

  step: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: color.border, alignItems: "center", justifyContent: "center" },
  stepDone: { backgroundColor: color.primary, borderColor: color.primary },
  stepNo: { fontFamily: font.semibold, fontSize: 12, color: color.muted },
  pulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.low },

  review: { backgroundColor: color.canvas, borderRadius: 20, padding: 16, gap: 6 },
  reviewTitle: { fontFamily: font.semibold, fontSize: 17, color: color.text },
  reviewText: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: color.text },

  version: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: color.primaryTint, borderRadius: 20, padding: 14 },

  actions: { gap: 10 },
  action: { borderWidth: 1, borderColor: color.border, borderRadius: 18, padding: 14, gap: 12 },
  actionDone: { backgroundColor: color.canvas, borderColor: color.canvas },
  actionTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  tick: { width: 26, height: 26, borderRadius: 8, borderWidth: 1.5, borderColor: color.inputBorder, alignItems: "center", justifyContent: "center" },
  tickOn: { backgroundColor: color.primary, borderColor: color.primary },
  actionBody: { flex: 1, gap: 2 },
  actionTitle: { fontFamily: font.semibold, fontSize: 15, color: color.text },
  actionTitleDone: { color: color.muted, textDecorationLine: "line-through" },
  bar: { height: 6, borderRadius: 3, backgroundColor: color.canvas, overflow: "hidden", marginLeft: 38 },
  barFill: { height: "100%", borderRadius: 3, backgroundColor: color.primary },
  how: { marginLeft: 38, gap: 8 },
  howRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  howDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: color.primary, marginTop: 8 },
  howText: { flex: 1, fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.text },

  milestone: { backgroundColor: color.primary, borderRadius: 20, padding: 16, gap: 4 },
  milestoneTitle: { fontFamily: font.semibold, fontSize: 17, color: color.onPrimary },
  milestoneText: { fontFamily: font.regular, fontSize: 14, color: "rgba(255,255,255,0.8)" },

  progress: { gap: 4 },
  progressHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  progressName: { fontFamily: font.semibold, fontSize: 15, color: color.text },
  progressValue: { fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.4, color: color.text },
  progressUnit: { fontFamily: font.regular, fontSize: 13, color: color.muted },
})
