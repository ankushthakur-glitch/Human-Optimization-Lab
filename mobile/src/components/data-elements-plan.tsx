import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { formatNumber } from "@/components/charts"
import {
  Big,
  DIVERGE,
  Delta,
  GOAL_HUE,
  GOAL_NAME,
  GoalIcon,
  Ring,
  SHORT,
  STATUS,
  StatusWord,
  TEAL_RAMP,
  type Data,
  type El,
} from "@/components/data-elements"
import {
  ArrowDown,
  ArrowUp,
  Barbell,
  Bone,
  CalendarCheck,
  ChatText,
  CheckCircle,
  Clock,
  CrownSimple,
  Drop,
  Flask,
  Gauge,
  Heartbeat,
  MapPin,
  Minus,
  PersonSimpleWalk,
  Pill,
  Plus,
  Ruler,
  Scales,
  ShieldCheck,
  Stethoscope,
  Trophy,
  WarningCircle,
} from "@/components/ph"
import { RecordIcon } from "@/components/record-icons"
import { Card, DateTrack, KeyValue, Status, Steps, Tag, Tile, type Level, type Mark, type Tone } from "@/components/record-kit"
import { useAllowance } from "@/lib/allowance"
import type { ReviewDay, ReviewGoalId } from "@/lib/daily-review"
import {
  CHECK_IN,
  MEMBER,
  NEXT_REVIEW,
  PLAN_DRAFT,
  PLAN_LINES,
  adherence,
  dateOfAt,
  dayFrom,
  dayLabel,
  daysBetween,
  milestones,
  profileOf,
  shortDay,
  thisWeek,
  weekCheckIn,
  weekNumber,
  type Milestone,
} from "@/lib/member"
import { priceLabel } from "@/lib/plans"
import { APPOINTMENTS, CARE_GAPS, MEDICATIONS, ORDERS, ORIGIN_LABEL, medDifference, type FocusArea, type Origin } from "@/lib/record"
import { bookingOf, bookingPast, orderStatus, todo, yourMedicines, type OrderTone } from "@/lib/todo"
import { chart, color, ink, space, type } from "@/lib/theme"

/* Twenty five ways to show the member's plan, care and engagement (12 Oct
   2026), on the same method as data-elements.tsx: form first, and colour
   by the job it does. Most are not charts: a version timeline, a stamp, a
   tracker, a countdown, a calendar, an agenda, a side by side, a report
   card. A chart only where the job is a comparison. The muted red of the
   "needs you" card is the only attention colour; status keeps its icon and
   word; goal hues mark goals and nothing else. */

/* ------------------------------------------------------------ helpers -- */

/** The muted red the home's "needs you" card is drawn in. */
const ATTENTION = { ink: color.high, tint: color.highTint, edge: "#F5C6CA" }

const FOCUS_ICON: Record<FocusArea, React.ComponentType<{ size?: number; color?: string }>> = {
  "blood sugar": Drop,
  weight: Scales,
  heart: Heartbeat,
  bone: Bone,
}
const FOCUS_NAME: Record<FocusArea, string> = { "blood sugar": "Blood sugar", weight: "Weight", heart: "Heart", bone: "Bone" }
const FOCUS_MARKER: Partial<Record<FocusArea, string>> = { "blood sugar": "a1c", weight: "bmi", heart: "bp" }

const MILESTONE_ICON: Record<Milestone["kind"], React.ComponentType<{ size?: number; color?: string }>> = {
  weight: Scales,
  waist: Ruler,
  habit: CalendarCheck,
  strength: Barbell,
}

/** "in 3 days", "tomorrow", "today" */
const inDays = (n: number) => (n <= 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`)

/** An ISO day as "Sep 12, 2026" without the weekday. */
const longDay = (at: string) => dayFrom(at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

/** The average of a goal over some days: scored days only, exercise on any
    day the watch counted. */
function goalAverage(days: ReviewDay[], id: ReviewGoalId): number | undefined {
  const v = days
    .map((x) => {
      const g = x.goals.find((y) => y.goal.id === id)
      if (!g || g.value === undefined) return undefined
      return id === "exercise" || x.status === "complete" ? g.value : undefined
    })
    .filter((x): x is number => x !== undefined)
  return v.length ? Math.round(v.reduce((a, x) => a + x, 0) / v.length) : undefined
}

function scoreAverage(days: ReviewDay[]): number | undefined {
  const v = days.map((x) => x.percent).filter((x): x is number => x !== undefined)
  return v.length ? Math.floor(v.reduce((a, x) => a + x, 0) / v.length) : undefined
}

type Ev = { date: Date; title: string; kind: "test" | "visit" | "review" | "due"; overdue?: boolean; time?: string; where?: string; prep?: string }

/** Everything dated ahead of her, and open orders by their due date. */
function eventsOf(s: Data["s"], now: Date): Ev[] {
  const list: Ev[] = []
  const week = thisWeek(s, now)
  for (const w of week) list.push({ date: w.date, title: w.title, kind: w.kind === "test" ? "test" : "visit", time: w.time, where: w.where, prep: w.prep })
  const covered = new Set(week.flatMap((w) => w.orders ?? []))
  for (const o of ORDERS) {
    if (o.state === "done" || o.completed || covered.has(o.id)) continue
    const b = bookingOf(o.id, s, now)
    if (b) {
      if (!bookingPast(b, now)) list.push({ date: b.date, title: o.name, kind: "test", time: b.time, where: b.where, prep: b.prep ?? o.prep })
      continue
    }
    const due = dayFrom(o.dueAt)
    list.push({ date: due, title: o.name, kind: "due", overdue: daysBetween(due, now) > 0 })
  }
  for (const a of APPOINTMENTS) {
    if (week.some((w) => w.id === a.id)) continue
    const review = a.kind === "review"
    list.push({ date: review ? dayFrom(NEXT_REVIEW.at) : dateOfAt(a.at), title: a.name, kind: review ? "review" : "visit", where: a.place })
  }
  return list.sort((x, y) => x.date.getTime() - y.date.getTime())
}

const EV_ICON: Record<Ev["kind"], React.ComponentType<{ size?: number; color?: string }>> = {
  test: Flask,
  visit: Stethoscope,
  review: ShieldCheck,
  due: Clock,
}

/** An order's state as the record kit marks it (C.0.4). */
const ORDER_MARK: Record<OrderTone, { tone: Tone; mark?: Mark }> = {
  neutral: { tone: "muted" },
  attention: { tone: "low", mark: "dot" },
  booked: { tone: "primary" },
  waiting: { tone: "primary", mark: "ring" },
  done: { tone: "ok", mark: "check" },
}

/** "20 mg" from "20 mg once a day". */
const doseShort = (dose: string) => dose.split(" ").slice(0, 2).join(" ")

const Legend = ({ items }: { items: { c: string; t: string; ring?: boolean }[] }) => (
  <View style={styles.wrap}>
    {items.map((x) => (
      <View key={x.t} style={styles.row}>
        <View style={[styles.key, x.ring ? { borderWidth: 2, borderColor: x.c } : { backgroundColor: x.c }]} />
        <Text style={type.meta}>{x.t}</Text>
      </View>
    ))}
  </View>
)

/* ------------------------------------------------------- hook elements -- */

/** This week's AI credit as a ring: the share used, the day it resets. */
function CreditRing() {
  const a = useAllowance()
  const level: Level = a.share > 0.9 ? "out" : a.share > 0.6 ? "borderline" : "in"
  const word = a.out ? "All used" : level === "out" ? "Almost used" : level === "borderline" ? "Over half used" : "Plenty left"
  return (
    <Card style={[styles.pad, styles.row]}>
      <Ring size={92} stroke={10} share={a.share} hue={STATUS[level].mark}>
        <Text style={type.hero}>{`${a.percent}%`}</Text>
        <Text style={type.caption}>used</Text>
      </Ring>
      <View style={[styles.fill, styles.stackSm]}>
        <Text style={type.title}>{"This week's AI credit"}</Text>
        <StatusWord level={level} word={word} />
        <Text style={type.meta}>{a.out ? a.line : `Resets ${a.resetsOn}. A chat already going can finish, even at 100%.`}</Text>
      </View>
    </Card>
  )
}

/* --------------------------------------------------------- the twenty five -- */

export const ELEMENTS_PLAN: El[] = [
  /* ===== your plan ===== */
  {
    group: "Your plan",
    form: "Version timeline",
    name: "Every version of your plan, newest first",
    Draw: ({ s }) => {
      const versions = profileOf(s).versions
      return (
        <Card style={styles.pad}>
          {versions.map((v, i) => {
            const live = v.status === "Active"
            return (
              <View key={v.version} style={styles.vRow}>
                <View style={styles.vRail}>
                  <View style={[styles.vNode, live ? styles.vNodeLive : styles.vNodePast]}>
                    <Text style={[type.captionStrong, { color: live ? ink.onColor : ink.secondary }]}>{v.version}</Text>
                  </View>
                  {i < versions.length - 1 && <View style={styles.vLine} />}
                </View>
                <View style={[styles.fill, styles.vBody]}>
                  <View style={styles.between}>
                    <Text style={type.title}>{`Version ${v.version}: ${v.short}`}</Text>
                    <Tag tone={live ? "primary" : "muted"}>{live ? "In use" : "Earlier"}</Tag>
                  </View>
                  <Text style={type.meta}>{`Approved by ${MEMBER.doctorShort}, ${v.approved}`}</Text>
                  <Text style={type.body}>{v.why}</Text>
                </View>
              </View>
            )
          })}
        </Card>
      )
    },
  },
  {
    group: "Your plan",
    form: "Change list",
    name: "What the latest version added, and why",
    Draw: ({ s }) => {
      const [now, before] = profileOf(s).versions
      return (
        <Card style={styles.pad}>
          <View style={styles.between}>
            <Text style={type.section}>{`What changed in version ${now.version}`}</Text>
            <Text style={type.meta}>{now.approved.replace(/, \d{4}$/, "")}</Text>
          </View>
          <View style={styles.why}>
            <Text style={type.label}>Why</Text>
            <Text style={type.body}>{now.why}</Text>
          </View>
          {now.changes.map((c) => (
            <View key={c} style={styles.row}>
              <View style={[styles.mini, { backgroundColor: color.primarySoft }]}>
                <Plus size={12} color={color.primary} weight="bold" />
              </View>
              <Text style={[type.body, styles.fill]}>{c}</Text>
            </View>
          ))}
          {before && <Text style={type.meta}>{`Everything else carries on from version ${before.version}.`}</Text>}
        </Card>
      )
    },
  },
  {
    group: "Your plan",
    form: "Approval stamp",
    name: "The seal on the plan in use, and how long it has run",
    Draw: ({ s }) => {
      const v = profileOf(s).versions[0]
      const days = daysBetween(dayFrom(v.at), new Date())
      return (
        <Card style={[styles.pad, styles.row]}>
          <View style={styles.stamp}>
            <View style={styles.stampInner}>
              <ShieldCheck size={22} color={chart.inRange} weight="fill" />
              <Text style={[type.captionStrong, { color: ink.good }]}>Approved</Text>
            </View>
          </View>
          <View style={[styles.fill, styles.stackSm]}>
            <Text style={type.section}>{MEMBER.doctor}</Text>
            <Text style={type.label}>{`Signed version ${v.version} on ${v.approved}`}</Text>
            <View style={styles.row}>
              <Big value={days} unit={days === 1 ? "day in use" : "days in use"} size={22} />
            </View>
          </View>
        </Card>
      )
    },
  },
  {
    group: "Your plan",
    form: "Focus area cards",
    name: "The areas your plan works on, and how",
    Draw: ({ s }) => {
      const p = profileOf(s)
      return (
        <View style={styles.grid}>
          {p.areas.map((a) => {
            const Icon = FOCUS_ICON[a]
            const marker = FOCUS_MARKER[a]
            return (
              <Card key={a} style={[styles.half, styles.pad]}>
                <Tile size={36}>
                  <Icon size={20} color={color.primary} />
                </Tile>
                <Text style={type.title}>{FOCUS_NAME[a]}</Text>
                <Text style={type.label}>{(marker && PLAN_LINES[marker]) || p.diet.summary}</Text>
              </Card>
            )
          })}
        </View>
      )
    },
  },
  {
    group: "Your plan",
    form: "Floors and ceilings",
    name: "Daily targets: what to reach and what to stay under",
    Draw: ({ s }) => {
      const goals = profileOf(s).goals
      const floors = goals.filter((g) => g.kind === "atLeast")
      const ceilings = goals.filter((g) => g.kind === "atMost")
      const col = (title: string, up: boolean, list: typeof goals) => (
        <View style={[styles.fill, styles.stackSm]}>
          <View style={styles.row}>
            {up ? <ArrowUp size={14} color={ink.secondary} weight="bold" /> : <ArrowDown size={14} color={ink.secondary} weight="bold" />}
            <Text style={type.sectionLabel}>{title}</Text>
          </View>
          {list.map((g) => (
            <View key={g.id} style={[styles.limit, up ? styles.limitFloor : styles.limitCeiling]}>
              <Text style={type.label}>{g.name}</Text>
              <Text style={type.value}>{`${formatNumber(g.target)} ${g.unit}`}</Text>
            </View>
          ))}
        </View>
      )
      return (
        <Card style={[styles.pad, styles.rowTop]}>
          {col("Reach at least", true, floors)}
          {col("Stay at most", false, ceilings)}
        </Card>
      )
    },
  },
  {
    group: "Your plan",
    form: "Pending version with steps",
    name: "The next version, while Dr. Patel reviews it",
    Draw: ({ s }) => {
      const next = profileOf(s).versions[0].version + 1
      return (
        <Card style={styles.pad}>
          <View style={styles.between}>
            <Text style={type.section}>{`Version ${next}`}</Text>
            <Tag tone="soon">With Dr. Patel</Tag>
          </View>
          <Steps
            steps={[
              { label: "Drafted from your last month", state: "done" },
              { label: `${MEMBER.doctorShort} reviews it`, state: "now" },
              { label: "Your plan updates once approved", state: "next" },
            ]}
          />
          <Text style={type.label}>What would change</Text>
          {PLAN_DRAFT.changes.map((c) => (
            <View key={c} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: color.primary }]} />
              <Text style={[type.body, styles.fill]}>{c}</Text>
            </View>
          ))}
          <Text style={type.meta}>Nothing changes until it is approved. Your current plan stays in use.</Text>
        </Card>
      )
    },
  },

  /* ===== care to do ===== */
  {
    group: "Care to do",
    form: "Attention card",
    name: "Things that need you, in the muted red",
    Draw: ({ s }) => {
      const needs = todo(s).needs
      if (!needs.length)
        return (
          <Card style={[styles.pad, styles.row]}>
            <CheckCircle size={22} color={chart.inRange} weight="fill" />
            <Text style={type.title}>{"You're all caught up"}</Text>
          </Card>
        )
      return (
        <View style={styles.alert}>
          <View style={styles.between}>
            <Text style={[type.section, { color: ATTENTION.ink }]}>{needs.length === 1 ? "1 thing needs you" : `${needs.length} things need you`}</Text>
            <WarningCircle size={20} color={ATTENTION.ink} />
          </View>
          {needs.slice(0, 3).map((n) => (
            <View key={n.id} style={styles.alertRow}>
              <View style={[styles.mini28, { backgroundColor: color.background }]}>
                <RecordIcon name={n.icon} size={16} color={ATTENTION.ink} />
              </View>
              <View style={styles.fill}>
                <Text style={type.title}>{n.title}</Text>
                <Text style={type.meta} numberOfLines={2}>
                  {n.meta}
                </Text>
              </View>
            </View>
          ))}
          {needs.length > 3 && <Text style={type.metaStrong}>{`${needs.length - 3} more in To do`}</Text>}
        </View>
      )
    },
  },
  {
    group: "Care to do",
    form: "Order tracker",
    name: "Each test from ordered to booked to done",
    Draw: ({ s }) => {
      const now = new Date()
      return (
        <Card style={styles.pad}>
          {ORDERS.map((o, i) => {
            const st = orderStatus(o, s, now)
            const b = bookingOf(o.id, s, now)
            const done = o.completed ?? (st.on ? shortDay(st.on) : b && bookingPast(b, now) ? shortDay(b.date) : undefined)
            const m = ORDER_MARK[st.tone]
            return (
              <View key={o.id} style={[styles.stackSm, i > 0 && styles.rule]}>
                <View style={styles.between}>
                  <Text style={[type.title, styles.fill]}>{o.name}</Text>
                </View>
                <Status tone={m.tone} mark={m.mark}>
                  {st.word}
                </Status>
                <DateTrack
                  mini
                  late={st.tone === "attention"}
                  dates={[
                    { label: "Ordered", date: o.ordered.replace(/, \d{4}$/, "") },
                    { label: "Booked", date: b ? shortDay(b.date) : o.scheduled?.replace(/, \d{4}$/, "") },
                    { label: "Done", date: done?.replace(/, \d{4}$/, "") },
                  ]}
                />
              </View>
            )
          })}
        </Card>
      )
    },
  },
  {
    group: "Care to do",
    form: "Countdown",
    name: "Days until the next test or visit",
    Draw: ({ s }) => {
      const now = new Date()
      const next = eventsOf(s, now).find((e) => e.kind !== "due" && daysBetween(now, e.date) >= 0)
      if (!next) return null
      const n = daysBetween(now, next.date)
      const Icon = EV_ICON[next.kind]
      return (
        <Card style={styles.pad}>
          <View style={styles.row}>
            <View style={styles.count}>
              {n <= 1 ? <Text style={type.hero}>{n === 0 ? "Today" : "1"}</Text> : <Big value={n} size={36} />}
              {n >= 1 && <Text style={type.caption}>{n === 1 ? "day" : "days"}</Text>}
            </View>
            <View style={[styles.fill, styles.stackSm]}>
              <View style={styles.row}>
                <Icon size={16} color={color.primary} />
                <Text style={type.section}>{next.title}</Text>
              </View>
              <Text style={type.label}>{`${dayLabel(next.date)}${next.time ? `, ${next.time}` : ""}, ${inDays(n)}`}</Text>
              {!!next.where && (
                <View style={styles.row}>
                  <MapPin size={12} color={ink.tertiary} />
                  <Text style={type.meta}>{next.where}</Text>
                </View>
              )}
            </View>
          </View>
          {!!next.prep && (
            <View style={styles.why}>
              <Text style={type.label}>Before you go</Text>
              <Text style={type.body}>{next.prep}</Text>
            </View>
          )}
        </Card>
      )
    },
  },
  {
    group: "Care to do",
    form: "Month calendar",
    name: "This month with every booked and due date marked",
    Draw: ({ s }) => {
      const now = new Date()
      const first = new Date(now.getFullYear(), now.getMonth(), 1, 12)
      const daysIn = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      const evs = eventsOf(s, now).filter((e) => e.date.getMonth() === now.getMonth() && e.date.getFullYear() === now.getFullYear())
      const cells: (number | undefined)[] = [...Array.from({ length: first.getDay() }, () => undefined), ...Array.from({ length: daysIn }, (_, i) => i + 1)]
      while (cells.length % 7) cells.push(undefined)
      return (
        <Card style={styles.pad}>
          <Text style={type.section}>{now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</Text>
          <View style={styles.calRow}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <Text key={i} style={[type.caption, styles.calHead]}>
                {d}
              </Text>
            ))}
          </View>
          {Array.from({ length: cells.length / 7 }, (_, r) => (
            <View key={r} style={styles.calRow}>
              {cells.slice(r * 7, r * 7 + 7).map((day, i) => {
                const on = day ? evs.filter((e) => e.date.getDate() === day) : []
                const booked = on.some((e) => e.kind !== "due")
                const due = on.some((e) => e.kind === "due")
                const isToday = day === now.getDate()
                return (
                  <View key={i} style={styles.calCell}>
                    {!!day && (
                      <>
                        <View style={[styles.calDay, isToday && styles.calToday, booked && { backgroundColor: color.primary }]}>
                          <Text style={[type.metaStrong, booked && { color: ink.onColor }]}>{day}</Text>
                        </View>
                        <View style={[styles.calMark, due && { borderColor: ink.tertiary }]} />
                      </>
                    )}
                  </View>
                )
              })}
            </View>
          ))}
          <Legend
            items={[
              { c: color.primary, t: "Booked" },
              { c: ink.tertiary, t: "Due by", ring: true },
            ]}
          />
        </Card>
      )
    },
  },
  {
    group: "Care to do",
    form: "Agenda",
    name: "What is ahead, grouped by when",
    Draw: ({ s }) => {
      const now = new Date()
      const evs = eventsOf(s, now)
      const bucket = (e: Ev) => {
        const n = daysBetween(now, e.date)
        if (n < 0) return "Waiting to be booked"
        if (n <= 7) return "This week"
        return e.date.toLocaleDateString("en-US", { month: "long" })
      }
      const groups: { k: string; list: Ev[] }[] = []
      for (const e of evs) {
        const k = bucket(e)
        const g = groups.find((x) => x.k === k)
        if (g) g.list.push(e)
        else groups.push({ k, list: [e] })
      }
      return (
        <Card style={styles.pad}>
          {groups.map((g) => (
            <View key={g.k} style={styles.stackSm}>
              <Text style={type.sectionLabel}>{g.k}</Text>
              {g.list.map((e) => {
                const Icon = EV_ICON[e.kind]
                return (
                  <View key={`${e.title}${e.date.getTime()}`} style={styles.agendaRow}>
                    <View style={styles.agendaDate}>
                      <Text style={type.value}>{shortDay(e.date)}</Text>
                      <Text style={type.caption}>{e.time ?? (e.kind === "due" ? "Due by" : "")}</Text>
                    </View>
                    <Icon size={16} color={e.overdue ? ATTENTION.ink : ink.secondary} />
                    <View style={styles.fill}>
                      <Text style={type.title}>{e.title}</Text>
                      {e.kind === "due" ? (
                        <Text style={[type.meta, e.overdue && { color: ATTENTION.ink }]}>{e.overdue ? "Past its due date, not booked yet" : "Not booked yet"}</Text>
                      ) : (
                        !!e.where && <Text style={type.meta}>{e.where}</Text>
                      )}
                    </View>
                  </View>
                )
              })}
            </View>
          ))}
        </Card>
      )
    },
  },
  {
    group: "Care to do",
    form: "Reminder pips",
    name: "Care gaps and the reminders sent for each",
    Draw: () => (
      <Card style={styles.pad}>
        {CARE_GAPS.map((g, i) => (
          <View key={g.id} style={[styles.stackSm, i > 0 && styles.rule]}>
            <View style={styles.between}>
              <Text style={[type.title, styles.fill]}>{g.title}</Text>
              <View style={styles.pips}>
                {[0, 1, 2].map((p) => (
                  <View key={p} style={[styles.pip, p < g.reminders ? { backgroundColor: g.reminders >= 3 ? ATTENTION.ink : ink.tertiary } : styles.pipOff]} />
                ))}
              </View>
            </View>
            <Text style={type.label}>{g.why}</Text>
            <Text style={[type.meta, g.reminders >= 3 && { color: ATTENTION.ink }]}>
              {`Reminder ${g.reminders} of 3, last on ${g.sent[g.sent.length - 1]}${g.reminders >= 3 ? ". Dr. Patel's team will reach out." : ""}`}
            </Text>
          </View>
        ))}
      </Card>
    ),
  },
  {
    group: "Care to do",
    form: "Runway",
    name: "Due dates on one line from today to your review",
    Draw: ({ s }) => {
      const now = new Date()
      const evs = eventsOf(s, now)
      const ahead = evs.filter((e) => daysBetween(now, e.date) >= 0)
      const late = evs.filter((e) => e.overdue)
      const span = Math.max(...ahead.map((e) => daysBetween(now, e.date)), 1)
      return (
        <Card style={styles.pad}>
          <View style={styles.runway}>
            <View style={styles.runLine} />
            <View style={[styles.runNow, { left: 0 }]} />
            {ahead.map((e, i) => (
              <View key={i} style={[styles.runPin, { left: `${(daysBetween(now, e.date) / span) * 100}%` }, e.kind === "due" ? styles.runPinDue : { backgroundColor: color.primary }]}>
                <Text style={[type.captionStrong, { color: e.kind === "due" ? ink.content : ink.onColor }]}>{i + 1}</Text>
              </View>
            ))}
          </View>
          <View style={styles.between}>
            <Text style={type.meta}>Today</Text>
            <Text style={type.meta}>{shortDay(ahead[ahead.length - 1]?.date ?? now)}</Text>
          </View>
          {ahead.map((e, i) => (
            <View key={i} style={styles.row}>
              <Text style={[type.metaStrong, styles.runNum]}>{i + 1}</Text>
              <Text style={[type.label, styles.fill]}>{e.title}</Text>
              <Text style={type.value}>{`${shortDay(e.date)}${e.kind === "due" ? ", due" : ""}`}</Text>
            </View>
          ))}
          {late.map((e) => (
            <View key={e.title} style={[styles.row, styles.lateRow]}>
              <WarningCircle size={14} color={ATTENTION.ink} />
              <Text style={[type.label, styles.fill, { color: ATTENTION.ink }]}>{`${e.title}: due ${shortDay(e.date)}, not booked yet`}</Text>
            </View>
          ))}
          <Legend
            items={[
              { c: color.primary, t: "Booked" },
              { c: ink.tertiary, t: "Due by", ring: true },
            ]}
          />
        </Card>
      )
    },
  },

  /* ===== medicines ===== */
  {
    group: "Medicines",
    form: "Side by side sources",
    name: "Where your records differ, each list next to the other",
    Draw: ({ s }) => {
      const mine = yourMedicines(s, 10)
      const differ = MEDICATIONS.filter((m) => medDifference(m) && mine.rows.some((r) => r.id === m.id && r.differs))
      if (!differ.length)
        return (
          <Card style={[styles.pad, styles.row]}>
            <CheckCircle size={20} color={chart.inRange} weight="fill" />
            <Text style={type.title}>Your medicine lists agree</Text>
          </Card>
        )
      return (
        <View style={styles.stack}>
          {differ.map((m) => {
            const doc = m.lists.find((l) => l.origin === "doctor")
            const other = m.lists.find((l) => l.origin !== "doctor")
            return (
              <Card key={m.id} style={styles.pad}>
                <View style={styles.between}>
                  <View style={styles.row}>
                    <Pill size={16} color={ink.secondary} />
                    <Text style={type.section}>{m.name}</Text>
                  </View>
                  <Tag tone="low">{medDifference(m) ?? "Records differ"}</Tag>
                </View>
                <View style={styles.sides}>
                  <View style={styles.side}>
                    <Text style={type.label}>{"Dr. Patel's list"}</Text>
                    <Text style={type.value}>{doc ? doc.dose : "Not listed"}</Text>
                    {doc && <Text style={type.meta}>{doc.date}</Text>}
                  </View>
                  <View style={styles.side}>
                    <Text style={type.label}>{other ? ORIGIN_LABEL[other.origin] : "Other lists"}</Text>
                    <Text style={type.value}>{other ? other.dose : "Not listed"}</Text>
                    {other && <Text style={type.meta}>{other.date}</Text>}
                  </View>
                </View>
                <Text style={type.meta}>Tell us what you take. Dr. Patel settles which list is right.</Text>
              </Card>
            )
          })}
        </View>
      )
    },
  },
  {
    group: "Medicines",
    form: "Source matrix",
    name: "Every medicine and supplement against each list it is on",
    Draw: () => {
      const cols: { o: Origin; k: string }[] = [
        { o: "doctor", k: "Dr. Patel" },
        { o: "hospital", k: "Hospital" },
        { o: "you", k: "You" },
      ]
      const meds = MEDICATIONS.filter((m) => !m.resolved)
      return (
        <Card style={styles.pad}>
          <View style={styles.tr}>
            <View style={styles.fill} />
            {cols.map((c) => (
              <Text key={c.o} style={[type.metaStrong, styles.mCol]}>
                {c.k}
              </Text>
            ))}
          </View>
          {meds.map((m) => {
            const differs = !!medDifference(m)
            return (
              <View key={m.id} style={[styles.tr, styles.trRule]}>
                <View style={styles.fill}>
                  <Text style={type.title}>{m.name}</Text>
                  <Text style={type.meta}>{m.kind === "supplement" ? "Supplement" : "Medicine"}</Text>
                </View>
                {cols.map((c) => {
                  const l = m.lists.find((x) => x.origin === c.o)
                  return (
                    <View key={c.o} style={[styles.mCol, styles.mCell, l && differs && styles.mCellDiffer]}>
                      {l ? <Text style={type.value}>{doseShort(l.dose)}</Text> : <Minus size={12} color={ink.tertiary} />}
                    </View>
                  )
                })}
              </View>
            )
          })}
          <View style={styles.row}>
            <View style={[styles.key, styles.mCellDiffer]} />
            <Text style={type.meta}>Outlined: the lists do not match yet</Text>
          </View>
        </Card>
      )
    },
  },
  {
    group: "Medicines",
    form: "Pill organizer",
    name: "Your lists as one tray, the ones to check marked",
    Draw: ({ s }) => {
      const mine = yourMedicines(s, 10)
      const meds = MEDICATIONS.filter((m) => !m.resolved)
      return (
        <Card style={styles.pad}>
          <View style={styles.between}>
            <Text style={type.section}>Your medicines</Text>
            <Text style={type.metaStrong}>{mine.line}</Text>
          </View>
          <View style={styles.tray}>
            {meds.map((m) => {
              const check = mine.rows.some((r) => r.id === m.id && r.differs)
              const supp = m.kind === "supplement"
              return (
                <View key={m.id} style={styles.slot}>
                  <View style={[styles.capsule, check ? styles.capsuleCheck : { backgroundColor: supp ? TEAL_RAMP[1] : color.primary }]}>
                    {check && <WarningCircle size={14} color={chart.borderline} weight="fill" />}
                  </View>
                  <Text style={[type.caption, styles.center]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                    {m.name}
                  </Text>
                </View>
              )
            })}
          </View>
          <View style={styles.wrap}>
            <View style={styles.row}>
              <View style={[styles.key, { backgroundColor: color.primary }]} />
              <Text style={type.meta}>Prescribed</Text>
            </View>
            <View style={styles.row}>
              <View style={[styles.key, { backgroundColor: TEAL_RAMP[1] }]} />
              <Text style={type.meta}>Supplement</Text>
            </View>
            <View style={styles.row}>
              <WarningCircle size={12} color={chart.borderline} weight="fill" />
              <Text style={type.meta}>To check: your lists differ</Text>
            </View>
          </View>
        </Card>
      )
    },
  },

  /* ===== your month ===== */
  {
    group: "Your month",
    form: "Month in review",
    name: "The last 30 days in five facts",
    Draw: ({ s }) => {
      const a = adherence(s)
      const now = new Date()
      const recent = milestones(s, now).filter((m) => daysBetween(dayFrom(m.at), now) <= 30)
      const facts = [
        { Icon: CalendarCheck, v: `${a.logged} of ${a.of}`, k: "Days with something logged" },
        { Icon: Gauge, v: a.average !== undefined ? `${a.average}%` : "No score", k: "Average daily score" },
        { Icon: Barbell, v: `${a.strength.done} of ${a.strength.planned}`, k: "Strength sessions done" },
        { Icon: PersonSimpleWalk, v: `${a.walks.done} of ${a.walks.planned}`, k: "Evening walks" },
        { Icon: Trophy, v: `${recent.length}`, k: recent.length === 1 ? "Milestone reached" : "Milestones reached" },
      ]
      return (
        <Card style={styles.pad}>
          <Text style={type.section}>Your last 30 days</Text>
          <View style={styles.facts}>
            {facts.map((f) => (
              <View key={f.k} style={styles.fact}>
                <Tile size={32}>
                  <f.Icon size={18} color={color.primary} />
                </Tile>
                <Text style={type.hero}>{f.v}</Text>
                <Text style={type.label}>{f.k}</Text>
              </View>
            ))}
          </View>
        </Card>
      )
    },
  },
  {
    group: "Your month",
    form: "Report card",
    name: "Each goal: how many scored days it was met",
    Draw: ({ month, d }) => {
      const scored = month.filter((x) => x.percent !== undefined)
      return (
        <Card style={styles.pad}>
          <View style={styles.between}>
            <Text style={type.section}>Goals met, last 30 days</Text>
            <Text style={type.meta}>{`${scored.length} scored days`}</Text>
          </View>
          {d.goals.map((g) => {
            const met = scored.filter((x) => x.goals.find((y) => y.goal.id === g.goal.id)?.state === "met").length
            const share = scored.length ? met / scored.length : 0
            const level: Level = share >= 0.8 ? "in" : share >= 0.5 ? "borderline" : "out"
            return (
              <View key={g.goal.id} style={[styles.tr, styles.trRule]}>
                <GoalIcon id={g.goal.id} size={28} />
                <Text style={[type.title, styles.fill]}>{GOAL_NAME[g.goal.id]}</Text>
                <Text style={[type.value, styles.td]}>{`${met} of ${scored.length}`}</Text>
                <View style={styles.tdWide}>
                  <StatusWord level={level} word={level === "in" ? "Most days" : level === "borderline" ? "About half" : "Few days"} />
                </View>
              </View>
            )
          })}
        </Card>
      )
    },
  },
  {
    group: "Your month",
    form: "Comparison table",
    name: "This week, last week and the last 30 days",
    Draw: ({ week, month, d }) => {
      const last = month.slice(16, 23)
      const full = (days: ReviewDay[]) => days.filter((x) => x.status === "complete").length
      const rows = [
        { k: "Daily score", unit: " pts", pct: true, a: scoreAverage(week), b: scoreAverage(last), c: scoreAverage(month) },
        ...d.goals.map((g) => ({
          k: SHORT[g.goal.id],
          unit: ` ${g.goal.unit}`,
          pct: false,
          a: goalAverage(week, g.goal.id),
          b: goalAverage(last, g.goal.id),
          c: goalAverage(month, g.goal.id),
        })),
      ]
      const cell = (v: number | undefined, pct: boolean) => (v === undefined ? "No log" : `${formatNumber(v)}${pct ? "%" : ""}`)
      return (
        <Card style={styles.pad}>
          <View style={styles.tr}>
            <Text style={[type.metaStrong, styles.fill]}>Average</Text>
            <Text style={[type.metaStrong, styles.td]}>This week</Text>
            <Text style={[type.metaStrong, styles.td]}>Last week</Text>
            <Text style={[type.metaStrong, styles.td]}>30 days</Text>
          </View>
          {rows.map((r) => (
            <View key={r.k} style={[styles.tr, styles.trRule]}>
              <View style={styles.fill}>
                <Text style={type.title}>{r.k}</Text>
                {r.a !== undefined && r.b !== undefined && <Delta value={r.a - r.b} unit={r.unit} words="vs last week" />}
              </View>
              <Text style={[type.value, styles.td]}>{cell(r.a, r.pct)}</Text>
              <Text style={[type.label, styles.td]}>{cell(r.b, r.pct)}</Text>
              <Text style={[type.label, styles.td]}>{cell(r.c, r.pct)}</Text>
            </View>
          ))}
          <Text style={type.meta}>{`Fully logged days: ${full(week)} this week, ${full(last)} last week, ${full(month)} in 30 days.`}</Text>
        </Card>
      )
    },
  },
  {
    group: "Your month",
    form: "Paired bars",
    name: "Each goal this week against last week, as a share of the goal",
    Draw: ({ week, month, d }) => {
      const last = month.slice(16, 23)
      const MAX = 1.25
      return (
        <Card style={styles.pad}>
          {d.goals.map((g) => {
            const a = goalAverage(week, g.goal.id)
            const b = goalAverage(last, g.goal.id)
            const w = (v?: number) => `${(Math.min((v ?? 0) / g.goal.target, MAX) / MAX) * 100}%` as const
            return (
              <View key={g.goal.id} style={styles.stackSm}>
                <View style={styles.between}>
                  <View style={styles.row}>
                    <View style={[styles.dot, { backgroundColor: GOAL_HUE[g.goal.id] }]} />
                    <Text style={type.title}>{GOAL_NAME[g.goal.id]}</Text>
                  </View>
                  <Text style={type.label}>{`${a !== undefined ? formatNumber(a) : "No log"} vs ${b !== undefined ? formatNumber(b) : "No log"} ${g.goal.unit}`}</Text>
                </View>
                <View style={styles.pair}>
                  <View style={[styles.goalTick, { left: `${(1 / MAX) * 100}%` }]} />
                  <View style={[styles.pairBar, { width: w(a), backgroundColor: color.primary }]} />
                  <View style={[styles.pairBar, { width: w(b), backgroundColor: DIVERGE.mid }]} />
                </View>
              </View>
            )
          })}
          <View style={styles.wrap}>
            <View style={styles.row}>
              <View style={[styles.key, { backgroundColor: color.primary }]} />
              <Text style={type.meta}>This week</Text>
            </View>
            <View style={styles.row}>
              <View style={[styles.key, { backgroundColor: DIVERGE.mid }]} />
              <Text style={type.meta}>Last week</Text>
            </View>
            <View style={styles.row}>
              <View style={styles.keyTick} />
              <Text style={type.meta}>Your goal</Text>
            </View>
          </View>
        </Card>
      )
    },
  },
  {
    group: "Your month",
    form: "Milestone path",
    name: "Milestones in the order you reached them",
    Draw: ({ s }) => {
      const list = [...milestones(s)].reverse()
      if (!list.length) return null
      return (
        <Card style={styles.pad}>
          {list.map((m, i) => {
            const Icon = MILESTONE_ICON[m.kind]
            const latest = i === list.length - 1
            return (
              <View key={m.id} style={styles.vRow}>
                <Text style={[type.meta, styles.msDate]}>{m.label}</Text>
                <View style={styles.vRail}>
                  <View style={[styles.msNode, latest && { backgroundColor: color.primary, borderColor: color.primary }]}>
                    <Icon size={14} color={latest ? ink.onColor : color.primary} />
                  </View>
                  {i < list.length - 1 && <View style={styles.vLine} />}
                </View>
                <View style={[styles.fill, styles.msBody]}>
                  <Text style={latest ? type.value : type.title}>{m.title}</Text>
                  {!!m.meta && <Text style={type.meta}>{m.meta}</Text>}
                </View>
              </View>
            )
          })}
        </Card>
      )
    },
  },

  /* ===== check ins and reviews ===== */
  {
    group: "Check ins and reviews",
    form: "Check in card",
    name: "The weekly check in, with the week it asks about",
    Draw: ({ s }) => {
      const c = weekCheckIn(s)
      return (
        <Card style={styles.pad}>
          <View style={styles.between}>
            <Text style={type.section}>{CHECK_IN.question}</Text>
            <Text style={type.meta}>{c.range}</Text>
          </View>
          <View style={styles.row}>
            <Text style={type.label}>{`${c.summary.daysLogged} of ${c.summary.days} days logged${c.summary.average !== undefined ? `, average ${c.summary.average}%` : ""}`}</Text>
          </View>
          <View style={styles.options}>
            {CHECK_IN.options.map((o) => {
              const chosen = c.answer === o
              return (
                <View key={o} style={[styles.option, chosen && styles.optionOn]}>
                  {chosen && <CheckCircle size={14} color={ink.primary} weight="fill" />}
                  <Text style={[type.metaStrong, chosen && { color: ink.primary }]}>{o}</Text>
                </View>
              )
            })}
          </View>
          <Text style={type.meta}>{c.answer === CHECK_IN.options[2] ? CHECK_IN.reassurance : c.answer ? "Thanks. Dr. Patel sees your answers before your review." : "One tap. Dr. Patel sees your answers before your review."}</Text>
        </Card>
      )
    },
  },
  {
    group: "Check ins and reviews",
    form: "Progress to next review",
    name: "Where you are between plan approval and the next physician review",
    Draw: ({ s }) => {
      const now = new Date()
      const v = profileOf(s).versions[0]
      const start = dayFrom(v.at)
      const end = dayFrom(NEXT_REVIEW.at)
      const total = Math.max(daysBetween(start, end), 1)
      const done = Math.max(0, Math.min(daysBetween(start, now), total))
      const labs = ORDERS.find((o) => o.id === "labs-nov")
      return (
        <Card style={styles.pad}>
          <View style={styles.between}>
            <Text style={type.title}>Next review with Dr. Patel</Text>
            <Tag tone="primary">{inDays(total - done)}</Tag>
          </View>
          <Big value={dayLabel(end)} size={22} />
          <View style={styles.track}>
            <View style={[styles.trackFill, { width: `${(done / total) * 100}%` }]} />
            {labs && <View style={[styles.trackMark, { left: `${(Math.min(Math.max(daysBetween(start, dayFrom(labs.dueAt)), 0), total) / total) * 100}%` }]} />}
          </View>
          <View style={styles.between}>
            <Text style={type.meta}>{`Approved ${shortDay(start)}`}</Text>
            <Text style={type.metaStrong}>{`Day ${done} of ${total}`}</Text>
            <Text style={type.meta}>{shortDay(end)}</Text>
          </View>
          {labs && <Text style={type.meta}>{`Grey mark: your repeat labs, due ${shortDay(dayFrom(labs.dueAt))}, so Dr. Patel has fresh results for the review.`}</Text>}
        </Card>
      )
    },
  },

  /* ===== assistant ===== */
  {
    group: "Assistant",
    form: "Credit ring",
    name: "AI credit used this week, as a percentage",
    Draw: () => <CreditRing />,
  },

  /* ===== membership ===== */
  {
    group: "Membership",
    form: "Membership card",
    name: "Your membership, who looks after it and what it costs",
    Draw: ({ s }) => {
      const since = s.membership?.startedAt ? longDay(s.membership.startedAt) : MEMBER.startLabel
      return (
        <Card style={styles.pad}>
          <View style={styles.row}>
            <Tile size={40}>
              <CrownSimple size={22} color={color.primary} />
            </Tile>
            <View style={styles.fill}>
              <Text style={type.section}>Optimization membership</Text>
              <Text style={type.label}>{`Week ${weekNumber()} of your plan`}</Text>
            </View>
          </View>
          <View>
            <KeyValue label="Your physician" value={MEMBER.doctor} />
            <KeyValue label="Member since" value={since} />
            <KeyValue label="Price" value={priceLabel(s.membership?.billing ?? "monthly")} />
            <KeyValue label="Next review" value={`${dayLabel(dayFrom(NEXT_REVIEW.at))}`} last />
          </View>
          <View style={styles.row}>
            <ChatText size={14} color={ink.tertiary} />
            <Text style={[type.meta, styles.fill]}>Your plan, reviews, care tracking and Ask Inlay are part of it.</Text>
          </View>
        </Card>
      )
    },
  },
]

/* ------------------------------------------------------------- styles -- */

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: space.inline },
  rowTop: { flexDirection: "row", alignItems: "flex-start", gap: space.item },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.inline },
  stack: { gap: space.item },
  stackSm: { gap: space.stack },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.item },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.item },
  half: { flexBasis: "47%", flexGrow: 1, maxWidth: "49%" },
  pad: { gap: space.item, padding: space.gutter },
  rule: { borderTopWidth: 1, borderTopColor: "#F2F2F7", paddingTop: space.item },
  dot: { width: 8, height: 8, borderRadius: 4 },
  key: { width: 10, height: 10, borderRadius: 2 },
  keyTick: { width: 2, height: 12, backgroundColor: ink.tertiary },
  mini: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  mini28: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  why: { gap: space.stack, padding: space.card, borderRadius: 8, backgroundColor: color.primaryTint },

  vRow: { flexDirection: "row", alignItems: "stretch", gap: space.item },
  vRail: { alignItems: "center", width: 28 },
  vNode: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  vNodeLive: { backgroundColor: color.primary },
  vNodePast: { backgroundColor: color.background, borderWidth: 2, borderColor: "#C9CDD3" },
  vLine: { width: 2, flex: 1, minHeight: 16, backgroundColor: "#E5E7EB", marginVertical: 2 },
  vBody: { gap: space.stack, paddingBottom: space.item },

  stamp: { width: 84, height: 84, borderRadius: 42, borderWidth: 2, borderColor: chart.inRange, alignItems: "center", justifyContent: "center", backgroundColor: color.okTint },
  stampInner: { width: 70, height: 70, borderRadius: 35, borderWidth: 1, borderStyle: "dashed", borderColor: chart.inRange, alignItems: "center", justifyContent: "center", gap: 2 },

  limit: { paddingVertical: space.inline, paddingHorizontal: space.card, borderRadius: 8, backgroundColor: "#F7F7FA", gap: 2 },
  limitFloor: { borderBottomWidth: 3, borderBottomColor: TEAL_RAMP[3] },
  limitCeiling: { borderTopWidth: 3, borderTopColor: TEAL_RAMP[3] },

  alert: { gap: space.item, padding: space.gutter, borderRadius: 8, backgroundColor: ATTENTION.tint, borderWidth: StyleSheet.hairlineWidth, borderColor: ATTENTION.edge },
  alertRow: { flexDirection: "row", alignItems: "center", gap: space.item },

  count: { width: 72, height: 72, borderRadius: 12, backgroundColor: color.primarySoft, alignItems: "center", justifyContent: "center" },

  calRow: { flexDirection: "row" },
  calHead: { flex: 1, textAlign: "center" },
  calCell: { flex: 1, alignItems: "center", gap: 2, paddingVertical: 2 },
  calDay: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  calToday: { borderWidth: 1.5, borderColor: ink.strong },
  calMark: { width: 6, height: 6, borderRadius: 3, borderWidth: 1.5, borderColor: "transparent" },

  agendaRow: { flexDirection: "row", alignItems: "flex-start", gap: space.item, paddingVertical: space.stack },
  agendaDate: { width: 64 },

  pips: { flexDirection: "row", gap: 4 },
  pip: { width: 18, height: 6, borderRadius: 3 },
  pipOff: { backgroundColor: "#EEF1F4" },

  runway: { height: 28, justifyContent: "center", marginHorizontal: 12 },
  runLine: { position: "absolute", left: 0, right: 0, height: 2, backgroundColor: "#E5E7EB" },
  runNow: { position: "absolute", width: 10, height: 10, marginLeft: -5, borderRadius: 5, backgroundColor: ink.strong },
  runPin: { position: "absolute", width: 22, height: 22, marginLeft: -11, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  runPinDue: { backgroundColor: color.background, borderWidth: 2, borderColor: ink.tertiary },
  runNum: { width: 16, textAlign: "center" },
  lateRow: { padding: space.inline, borderRadius: 8, backgroundColor: ATTENTION.tint },

  sides: { flexDirection: "row", gap: space.inline },
  side: { flex: 1, gap: 2, padding: space.card, borderRadius: 8, backgroundColor: "#F7F7FA" },

  tr: { flexDirection: "row", alignItems: "center", gap: space.inline, paddingVertical: space.stack },
  trRule: { borderTopWidth: 1, borderTopColor: "#F2F2F7", paddingTop: space.inline },
  td: { width: 60, textAlign: "right" },
  tdWide: { width: 96, alignItems: "flex-end" },
  mCol: { width: 64, textAlign: "center", alignItems: "center" },
  mCell: { paddingVertical: space.stack, borderRadius: 6, borderWidth: 1.5, borderColor: "transparent" },
  mCellDiffer: { borderColor: chart.borderline, borderWidth: 1.5, borderRadius: 3 },

  tray: { flexDirection: "row", gap: space.inline, padding: space.card, borderRadius: 12, backgroundColor: "#F7F7FA" },
  slot: { flex: 1, alignItems: "center", gap: space.mark },
  capsule: { width: 40, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  capsuleCheck: { backgroundColor: color.background, borderWidth: 2, borderColor: chart.borderline },

  facts: { flexDirection: "row", flexWrap: "wrap", rowGap: space.section, columnGap: space.item },
  fact: { flexBasis: "47%", flexGrow: 1, gap: space.stack },

  pair: { gap: 3, position: "relative" },
  pairBar: { height: 10, borderRadius: 5 },
  goalTick: { position: "absolute", top: -3, bottom: -3, width: 2, backgroundColor: ink.tertiary, zIndex: 1 },

  msDate: { width: 48, paddingTop: 5, textAlign: "right" },
  msNode: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: color.primaryEdge, backgroundColor: color.primaryTint, alignItems: "center", justifyContent: "center" },
  msBody: { paddingTop: 3, paddingBottom: space.item, gap: 2 },

  options: { flexDirection: "row", flexWrap: "wrap", gap: space.inline },
  option: { flexDirection: "row", alignItems: "center", gap: space.stack, borderRadius: 999, borderWidth: 1, borderColor: "#DFDFE4", paddingHorizontal: space.item, paddingVertical: space.mark },
  optionOn: { borderColor: color.primaryEdge, backgroundColor: color.primarySoft },

  track: { height: 10, borderRadius: 5, backgroundColor: TEAL_RAMP[0], position: "relative" },
  trackFill: { height: 10, borderRadius: 5, backgroundColor: color.primary },
  trackMark: { position: "absolute", top: -4, width: 4, height: 18, marginLeft: -2, borderRadius: 2, backgroundColor: ink.tertiary },
})
