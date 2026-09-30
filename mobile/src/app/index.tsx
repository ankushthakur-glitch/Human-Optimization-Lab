import { router } from "expo-router"
import * as React from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"

import { Badge, Section, SoftOrb } from "@/components/flow"
import { BodyLegend, BodyMap, LabTube } from "@/components/home-art"
import { IconSparkle } from "@/components/icons"
import { IconTile, List, ListRow } from "@/components/list"
import { GAP_ICON, gapStatus } from "@/components/care-gap"
import { RecordIcon } from "@/components/record-icons"
import { TabScreen } from "@/components/tab-bar"
import { Button } from "@/components/ui"
import { dayKey } from "@/lib/dates"
import { useOnboarding } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { nextSetup, TODAY } from "@/lib/program"
import {
  CARE_GAPS,
  DOCUMENTS,
  FINDINGS,
  LABS_IN_RANGE,
  MEDICATIONS,
  REVIEW,
  inlayScore,
  medDifference,
} from "@/lib/record"
import { color, font } from "@/lib/theme"

/* The dashboard a patient lands on once their record is built: the body
   with each system glowing by its results, the Inlay score and labs in
   range, then what to do (medicines to confirm, care gaps with their
   reminders), the plan, the latest labs and the results that need
   attention. Nothing is pushed at the patient; it is all here. The first
   of the four tabs. */

export default function DashboardScreen() {
  const onboarding = useOnboarding()
  const { membership, profile, why, meds = {}, booked = {}, plan, setupDone = [], log = {} } = onboarding
  const name = profile?.preferredName || profile?.firstName || PATIENT.firstName
  const initials = `${PATIENT.firstName[0]}${PATIENT.lastName[0]}`
  const declined = onboarding.consent === "declined"

  return (
    <TabScreen tab="home">
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={styles.greet}>{greeting()}</Text>
          <Text style={styles.hello} accessibilityRole="header">
            {name}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push("/profile")}
          accessibilityRole="button"
          accessibilityLabel="Your profile"
          style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </Pressable>
      </View>

      {declined ? (
        <NotConnected />
      ) : (
        <>
          {/* The body, with the two numbers set over its faded waist. */}
          <View>
            <Pressable onPress={() => router.replace("/results")} accessibilityRole="button" style={styles.body}>
              <BodyMap width={290} />
              <View style={styles.stats}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>
                    {inlayScore(why?.flourish)}
                    <Text style={styles.statOf}>/100</Text>
                  </Text>
                  <Text style={styles.statLabel}>Inlay score</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>
                    {LABS_IN_RANGE.inRange}
                    <Text style={styles.statOf}>/{LABS_IN_RANGE.total}</Text>
                  </Text>
                  <Text style={styles.statLabel}>Labs in range</Text>
                </View>
              </View>
            </Pressable>
            <BodyLegend />
          </View>

          <Review />

          <PlanCard
            member={membership?.tier === "optimization"}
            paused={!!membership?.paused}
            setupNext={nextSetup(setupDone)?.href}
            status={plan?.status}
            done={(log[dayKey()] ?? []).length}
          />

          <ToDo meds={meds} booked={booked} />

          <Section title="Needs attention" action={<Text style={styles.sectionMeta}>{`${FINDINGS.length} results`}</Text>}>
            <List>
              {FINDINGS.map((f) => (
                <ListRow
                  key={f.id}
                  title={f.name}
                  meta={`Target ${f.range.replace(/^Below/, "below")}`}
                  right={
                    <View style={styles.findingRight}>
                      <Text style={styles.findingValue}>{f.value}</Text>
                      <View style={styles.status}>
                        <View style={[styles.dot, { backgroundColor: f.flag === "high" ? color.high : color.low }]} />
                        <Text style={styles.statusText}>{f.flag === "high" ? "High" : "Low"}</Text>
                      </View>
                    </View>
                  }
                  onPress={() => router.push({ pathname: "/biomarker/[id]", params: { id: f.id } })}
                />
              ))}
            </List>
          </Section>

          <Section
            title="Latest reports"
            action={
              <Pressable onPress={() => router.replace("/results")} hitSlop={8} accessibilityRole="link">
                <Text style={styles.link}>See all</Text>
              </Pressable>
            }
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reports} style={styles.reportsRow}>
              {DOCUMENTS.slice(0, 4).map((d) => (
                <Pressable
                  key={d.id}
                  onPress={() => router.push({ pathname: "/record/[kind]", params: { kind: "documents" } })}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.report, pressed && styles.pressed]}
                >
                  <View style={styles.reportArt}>
                    {d.id === "labs" ? <LabTube size={34} /> : <RecordIcon name="documents" size={22} color={color.primary} />}
                  </View>
                  <Text style={styles.reportTitle} numberOfLines={2}>
                    {d.name}
                  </Text>
                  <Text style={styles.reportMeta}>
                    {d.where}, {d.date.replace(/, \d{4}$/, "")}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Section>
        </>
      )}
    </TabScreen>
  )
}

/** "Good morning" and so on, by the hour. */
function greeting() {
  const h = new Date().getHours()
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"
}

/** Said no to the consent: nothing is collected, and connecting is one
    tap away. */
function NotConnected() {
  return (
    <View style={styles.connect}>
      <SoftOrb size={120} />
      <Text style={styles.connectTitle}>Your records aren't connected</Text>
      <Text style={styles.connectText}>
        Nothing has been collected. Connect when you're ready and we'll bring your history together from every provider.
      </Text>
      <View style={styles.connectAction}>
        <Button onPress={() => router.push("/connect")}>Connect my records</Button>
      </View>
    </View>
  )
}

/** The doctor confirms the assembled record, medicines above all, then
    reviews it every quarter. */
function Review() {
  return (
    <View style={styles.review}>
      <IconTile tone="solid" size={40}>
        <RecordIcon name="clinic" size={20} color={color.onPrimary} />
      </IconTile>
      <View style={styles.reviewBody}>
        <Text style={styles.reviewTitle}>{REVIEW.by} is checking your record</Text>
        <Text style={styles.reviewMeta}>Then {REVIEW.every.toLowerCase()}</Text>
      </View>
      <Badge>In review</Badge>
    </View>
  )
}

/** Medicines to confirm, then the care gaps, each with where its
    reminders have got to. */
function ToDo({ meds, booked }: { meds: Record<string, string>; booked: Record<string, string> }) {
  const unconfirmed = MEDICATIONS.filter((m) => !m.resolved && !meds[m.id]).length
  const differences = MEDICATIONS.filter((m) => medDifference(m)).length
  return (
    <Section title="For you to do" action={<Text style={styles.sectionMeta}>{`${CARE_GAPS.length + (unconfirmed ? 1 : 0)} open`}</Text>}>
      <List>
        {unconfirmed > 0 && (
          <ListRow
            icon={
              <IconTile tone="low">
                <RecordIcon name="medications" size={18} color={color.low} />
              </IconTile>
            }
            title="Confirm your medicines"
            meta={`${unconfirmed} to confirm, ${differences} lists differ`}
            onPress={() => router.push("/medications")}
          />
        )}
        {CARE_GAPS.map((g) => (
          <ListRow
            key={g.id}
            icon={
              <IconTile tone={booked[g.id] ? "primary" : g.reminders >= 3 ? "high" : "muted"}>
                <RecordIcon
                  name={GAP_ICON[g.kind]}
                  size={18}
                  color={booked[g.id] ? color.primary : g.reminders >= 3 ? color.high : color.text}
                />
              </IconTile>
            }
            title={g.title}
            meta={gapStatus(g.reminders, booked[g.id])}
            onPress={() => router.push({ pathname: "/task/[id]", params: { id: g.id } })}
          />
        ))}
      </List>
    </Section>
  )
}

/** Where the plan is: an offer, setup to finish, with the doctor, or
    today's list. */
function PlanCard({
  member,
  paused,
  setupNext,
  status,
  done,
}: {
  member: boolean
  paused: boolean
  setupNext?: string
  status?: "review" | "live"
  done: number
}) {
  const [title, meta, href, cta] = !member
    ? ["Want a plan built around you?", "From your record and your why, approved by your doctor", "/plans", "See your options"]
    : paused
      ? ["Your plan is paused", "Your record, trends and reminders carry on", "/plan", "Open"]
      : setupNext
        ? ["Finish setting up your plan", "A few steps before your plan is built", setupNext, "Continue"]
        : status === "review"
          ? ["Your plan is with Dr. Patel", "It goes live once your doctor approves it", "/plan", "Open"]
          : [`${done} of ${TODAY.length} done today`, "Your plan for today", "/plan", "Open"]
  const open = () => (href === "/plan" ? router.replace("/plan") : router.push(href as "/plans"))
  return (
    <Pressable onPress={open} accessibilityRole="button" style={({ pressed }) => [styles.plan, pressed && styles.pressed]}>
      <View style={styles.planTop}>
        <View style={styles.planIcon}>
          <IconSparkle color={color.onPrimary} size={16} />
        </View>
        <View style={styles.planBody}>
          <Text style={styles.planTitle}>{title}</Text>
          <Text style={styles.planMeta}>{meta}</Text>
        </View>
      </View>
      <View style={styles.planCta}>
        <Text style={styles.planCtaText}>{cta}</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },

  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  headText: { flex: 1, gap: 2 },
  greet: { fontFamily: font.regular, fontSize: 15, color: color.muted },
  hello: { fontFamily: font.semibold, fontSize: 28, lineHeight: 34, letterSpacing: -0.8, color: color.text },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.canvas,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: font.semibold, fontSize: 14, color: color.text },
  sectionMeta: { fontFamily: font.regular, fontSize: 13, color: color.muted },
  link: { fontFamily: font.medium, fontSize: 13, color: color.primary },

  body: { alignItems: "center", marginTop: -8, marginBottom: -16 },
  stats: { position: "absolute", left: 8, right: 8, bottom: 16, flexDirection: "row", justifyContent: "space-between" },
  stat: { alignItems: "center", gap: 2, minWidth: 100 },
  statValue: { fontFamily: font.semibold, fontSize: 30, letterSpacing: -0.8, color: color.text },
  statOf: { fontFamily: font.regular, fontSize: 15, letterSpacing: 0, color: color.muted },
  statLabel: { fontFamily: font.regular, fontSize: 13, color: color.muted },

  connect: { alignItems: "center", backgroundColor: color.canvas, borderRadius: 24, padding: 20, gap: 10 },
  connectTitle: { fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.4, color: color.text, textAlign: "center" },
  connectText: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: color.muted, textAlign: "center" },
  connectAction: { alignSelf: "stretch", marginTop: 8 },

  review: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: color.primaryTint,
    borderRadius: 20,
    padding: 14,
  },
  reviewBody: { flex: 1, gap: 2 },
  reviewTitle: { fontFamily: font.semibold, fontSize: 15, lineHeight: 20, color: color.text },
  reviewMeta: { fontFamily: font.regular, fontSize: 13, color: color.muted },

  plan: { backgroundColor: color.primary, borderRadius: 22, padding: 16, gap: 14 },
  planTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  planIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  planBody: { flex: 1, gap: 3 },
  planTitle: { fontFamily: font.semibold, fontSize: 16, lineHeight: 21, letterSpacing: -0.2, color: color.onPrimary },
  planMeta: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: "rgba(255,255,255,0.72)" },
  planCta: { alignSelf: "flex-start", backgroundColor: color.background, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginLeft: 46 },
  planCtaText: { fontFamily: font.semibold, fontSize: 13, color: color.primary },

  reportsRow: { marginHorizontal: -24 },
  reports: { gap: 10, paddingHorizontal: 24 },
  report: { width: 148, backgroundColor: color.canvas, borderRadius: 20, padding: 14, gap: 4 },
  reportArt: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: color.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  reportTitle: { fontFamily: font.semibold, fontSize: 14, lineHeight: 19, letterSpacing: -0.1, color: color.text, minHeight: 38 },
  reportMeta: { fontFamily: font.regular, fontSize: 12, color: color.muted },

  findingRight: { alignItems: "flex-end", gap: 3 },
  findingValue: { fontFamily: font.semibold, fontSize: 15, color: color.text },
  status: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: font.regular, fontSize: 12, color: color.muted },
})
