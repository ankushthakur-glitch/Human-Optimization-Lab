import * as React from "react"
import { StyleSheet, Text, View } from "react-native"
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg"

import {
  Big,
  DIVERGE,
  GOAL_HUE,
  GoalIcon,
  Meter,
  StatusWord,
  TEAL_RAMP,
  label,
  rampOf,
  weekday,
  type Data,
  type El,
} from "@/components/data-elements"
import { formatNumber } from "@/components/charts"
import { ArrowUp, Barbell, Check, Clock, Flame, PersonSimpleWalk, Target, Trophy, Watch } from "@/components/ph"
import { Card, Group, NeedsRow, Tag, TickCircle, Tile, type Level } from "@/components/record-kit"
import type { ReviewDay } from "@/lib/daily-review"
import {
  BONE_VERSIONS,
  PLAN_DRAFT,
  PLAN_VERSIONS,
  WALK,
  addDays,
  dateOfAt,
  daysBetween,
  localDay,
  moveDone,
  prescription,
  profileOf,
  sessionDone,
  weekPlan,
  type Exercise,
  type Session,
} from "@/lib/member"
import { chart, color, font, ink, space, type } from "@/lib/theme"

/* Twenty five ways to show movement on the member plan (12 Oct 2026):
   strength sessions and their moves, sets and reps, the walk after
   dinner, exercise minutes and active energy from the watch, the week's
   plan, how steady it has been, and the chair stands check.

   Colour follows data-elements.tsx: exercise aqua only as the goal's
   identity, always labelled; teal light to dark for magnitude; blue and
   red for above or below the goal; green, orange and red only for status,
   with an icon and a word. Words stay in the text inks. */

/* ------------------------------------------------------------ helpers -- */

type Snap = Data["s"]

/** The session on today or the next day that has one. */
function nextSession(s: Snap): { session: Session; date: Date; inDays: number } | undefined {
  const profile = profileOf(s)
  const now = new Date()
  for (let i = 0; i < 8; i++) {
    const date = addDays(now, i)
    const session = profile.sessionOn(date)
    if (session) return { session, date, inDays: i }
  }
  return undefined
}

/** What she logged for each move on a day. */
const logOn = (s: Snap, date: Date) => s.exercises?.[localDay(date)] ?? {}

/** Sets ticked for a move on a day. */
const setsTicked = (s: Snap, date: Date, e: Exercise) => {
  const log = logOn(s, date)[e.id]
  if (!log) return 0
  return moveDone(log, e) ? e.sets : Math.min(log.sets ?? 0, e.sets)
}

/** A finished day's movement: the planned session and whether it was
    done, the walk, and the watch's minutes and active burn. Her own log
    wins; before it, the sample history (yesterday carries the sample on). */
type MoveDay = { date: Date; session?: Session; done: boolean; walked: boolean; minutes?: number; active?: number }

function movesOf(s: Snap, days: ReviewDay[]): MoveDay[] {
  const profile = profileOf(s)
  const now = new Date()
  return days.map((x) => {
    const offset = daysBetween(now, x.date)
    const own = s.exercises?.[localDay(x.date)]
    const sample: { status: string; walk?: boolean } | undefined = profile.sampleDays.find((y) => y.day === offset) ?? (offset === -1 ? { status: "complete" } : undefined)
    const session = profile.sessionOn(x.date)
    const done = !!session && (own ? Boolean(sessionDone(s, x.date)) : sample ? sample.status !== "none" : false)
    const walked = own?.walk ? true : sample ? sample.walk !== false && sample.status !== "none" : false
    return { date: x.date, session, done, walked, minutes: x.goals.find((g) => g.goal.id === "exercise")?.value, active: x.energy?.active }
  })
}

const exerciseOf = (d: ReviewDay) => d.goals.find((g) => g.goal.id === "exercise")

/** "A", "B", or the bone plan's one session. */
const letterOf = (session: Session) => (session.id === "strength-a" ? "A" : session.id === "strength-b" ? "B" : "S")

/** Reps in a move, both sides counted; undefined for a hold. */
const repsOf = (e: Exercise) => (e.reps !== undefined ? e.sets * e.reps * (e.side ? 2 : 1) : undefined)

/** What each move works, from the library's cues. */
const AREA: Record<string, string> = {
  "sit-to-stand": "Thighs",
  "glute-bridge": "Hips",
  "step-up": "Thighs",
  "calf-raise": "Calves",
  "bird-dog": "Core",
  "wall-push-up": "Chest and arms",
  "band-row": "Upper back",
  "overhead-press": "Shoulders",
  "single-leg-stand": "Balance",
  "dead-bug": "Core",
}

/** Working time for a move, an estimate: about 3 seconds a rep, or the
    hold, on each side. */
const workSeconds = (e: Exercise) => e.sets * (e.reps !== undefined ? e.reps * 3 : (e.seconds ?? 0)) * (e.side ? 2 : 1)
const restSeconds = (e: Exercise) => (e.sets - 1) * e.rest

/** A point on a circle, 0 degrees at the top, clockwise. */
const pt = (cx: number, cy: number, r: number, deg: number) => {
  const a = (deg * Math.PI) / 180
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)] as const
}
const arc = (cx: number, cy: number, r: number, from: number, to: number) => {
  const [x0, y0] = pt(cx, cy, r, from)
  const [x1, y1] = pt(cx, cy, r, to)
  return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`
}

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

const SetDots = ({ of, done }: { of: number; done: number }) => (
  <View style={styles.setDots}>
    {Array.from({ length: of }, (_, i) => (
      <View key={i} style={[styles.setDot, i < done ? { backgroundColor: color.primary, borderColor: color.primary } : null]} />
    ))}
  </View>
)

/* ---------------------------------------------------- the twenty five -- */

export const ELEMENTS_MOVE: El[] = [
  /* ===== training ===== */
  {
    group: "Training",
    form: "Session card",
    name: "The next session, every move with its sets as dots",
    Draw: ({ s }) => {
      const next = nextSession(s)
      if (!next) return null
      const { session, date, inDays } = next
      const ticked = session.exercises.map((e) => (inDays === 0 ? setsTicked(s, date, e) : 0))
      const movesDone = session.exercises.filter((e, i) => ticked[i] >= e.sets).length
      return (
        <Card style={styles.pad}>
          <View style={styles.row}>
            <Tile size={40}>
              <Barbell color={color.primary} />
            </Tile>
            <View style={styles.fill}>
              <Text style={type.section}>{session.title}</Text>
              <Text style={type.label}>{`${session.focus}, about ${session.minutes} minutes`}</Text>
            </View>
            <Tag tone="primary">{inDays === 0 ? "Today" : inDays === 1 ? "Tomorrow" : weekday(date)}</Tag>
          </View>
          <View>
            {session.exercises.map((e, i) => (
              <View key={e.id} style={[styles.tr, i > 0 && styles.trRule]}>
                <View style={styles.fill}>
                  <Text style={type.title}>{e.name}</Text>
                  <Text style={type.meta}>{prescription(e)}</Text>
                </View>
                <SetDots of={e.sets} done={ticked[i]} />
              </View>
            ))}
          </View>
          <Text style={type.meta}>{inDays === 0 ? `${movesDone} of ${session.exercises.length} moves done. A filled dot is a set ticked.` : "A dot is a set. They fill as you tick them."}</Text>
        </Card>
      )
    },
  },
  {
    group: "Training",
    form: "Set tracker",
    name: "The move you are on: its sets around a ring, the reps in the middle",
    Draw: ({ s }) => {
      const next = nextSession(s)
      if (!next) return null
      const { session, date, inDays } = next
      const e = session.exercises.find((x) => inDays !== 0 || setsTicked(s, date, x) < x.sets) ?? session.exercises[0]
      const done = inDays === 0 ? setsTicked(s, date, e) : 0
      const size = 132
      const r = 56
      const gap = 10
      const seg = 360 / e.sets
      return (
        <Card style={[styles.pad, styles.row]}>
          <View style={{ width: size, height: size }}>
            <Svg width={size} height={size}>
              {Array.from({ length: e.sets }, (_, i) => (
                <Path key={i} d={arc(size / 2, size / 2, r, i * seg + gap / 2, (i + 1) * seg - gap / 2)} stroke={i < done ? color.primary : chart.track} strokeWidth={10} strokeLinecap="round" fill="none" />
              ))}
            </Svg>
            <View style={styles.fillCenter}>
              <Big value={e.reps ?? e.seconds ?? 0} size={32} />
              <Text style={type.label}>{e.reps !== undefined ? "reps" : "seconds"}</Text>
            </View>
          </View>
          <View style={[styles.fill, styles.stackSm]}>
            <Text style={type.label}>{session.title}</Text>
            <Text style={type.section}>{e.name}</Text>
            <Text style={type.value}>{`Set ${Math.min(done + 1, e.sets)} of ${e.sets}${e.side ? `, ${e.side}` : ""}`}</Text>
            <View style={styles.row}>
              <Clock size={14} color={ink.tertiary} />
              <Text style={type.meta}>{`Rest ${e.rest} seconds between sets`}</Text>
            </View>
          </View>
        </Card>
      )
    },
  },
  {
    group: "Training",
    form: "KPI strip with dividers",
    name: "The session in four numbers",
    Draw: ({ s }) => {
      const next = nextSession(s)
      if (!next) return null
      const { session } = next
      const sets = session.exercises.reduce((a, e) => a + e.sets, 0)
      const reps = session.exercises.reduce((a, e) => a + (repsOf(e) ?? 0), 0)
      const holds = session.exercises.filter((e) => e.seconds !== undefined)
      const cells = [
        { k: "Moves", v: session.exercises.length },
        { k: "Sets", v: sets },
        { k: "Reps", v: reps },
        { k: "Minutes", v: session.minutes },
      ]
      return (
        <Card style={styles.pad}>
          <Text style={type.title}>{`${session.title}, ${session.focus.toLowerCase()}`}</Text>
          <View style={styles.strip}>
            {cells.map((c, i) => (
              <View key={c.k} style={[styles.stripCell, i > 0 && styles.stripRule]}>
                <Text style={type.hero}>{formatNumber(c.v)}</Text>
                <Text style={type.label}>{c.k}</Text>
              </View>
            ))}
          </View>
          {holds.length > 0 && <Text style={type.meta}>{`Reps count both sides. ${holds.map((h) => `${h.name} is a hold: ${prescription(h)}`).join(". ")}.`}</Text>}
        </Card>
      )
    },
  },
  {
    group: "Training",
    form: "Body part chips",
    name: "What your week trains, darker for more sessions",
    Draw: ({ s }) => {
      const profile = profileOf(s)
      const monday = weekPlan(s)[0].date
      const count: Record<string, number> = {}
      for (let i = 0; i < 7; i++) {
        const session = profile.sessionOn(addDays(monday, i))
        if (!session) continue
        const areas = new Set(session.exercises.map((e) => AREA[e.id]).filter(Boolean))
        areas.forEach((a) => (count[a] = (count[a] ?? 0) + 1))
      }
      const list = Object.entries(count).sort((a, b) => b[1] - a[1])
      const max = Math.max(...list.map((x) => x[1]), 1)
      return (
        <Card style={styles.pad}>
          <Text style={type.title}>Sessions a week, by body part</Text>
          <View style={styles.wrap}>
            {list.map(([area, n]) => {
              const share = n / max
              const fill = rampOf(0.2 + share * 0.8)
              const dark = share > 0.6
              return (
                <View key={area} style={[styles.areaChip, { backgroundColor: fill }]}>
                  <Text style={[type.metaStrong, dark && { color: ink.onColor }]}>{area}</Text>
                  <Text style={[type.value, dark && { color: ink.onColor }]}>{n}</Text>
                </View>
              )
            })}
          </View>
          <View style={styles.row}>
            <Text style={type.meta}>Fewer</Text>
            {TEAL_RAMP.slice(1).map((c) => (
              <View key={c} style={[styles.key, { backgroundColor: c }]} />
            ))}
            <Text style={type.meta}>More sessions</Text>
          </View>
        </Card>
      )
    },
  },
  {
    group: "Training",
    form: "Effort scale",
    name: "How hard each move should feel, out of 10",
    Draw: ({ s }) => {
      const next = nextSession(s)
      if (!next) return null
      const { session } = next
      return (
        <Card style={styles.pad}>
          <View style={styles.between}>
            <Text style={type.title}>{session.title}</Text>
            <Text style={type.metaStrong}>{session.effort}</Text>
          </View>
          {session.exercises.map((e) => (
            <View key={e.id} style={styles.stackSm}>
              <View style={styles.between}>
                <Text style={type.label}>{e.name}</Text>
                <Text style={type.value}>
                  {e.effort}
                  <Text style={type.unit}> of 10</Text>
                </Text>
              </View>
              <View style={styles.effort}>
                {Array.from({ length: 10 }, (_, i) => (
                  <View key={i} style={[styles.effortCell, { backgroundColor: i < e.effort ? TEAL_RAMP[Math.min(1 + Math.floor(i / 2), 5)] : chart.track }]} />
                ))}
              </View>
            </View>
          ))}
          <View style={styles.between}>
            <Text style={type.meta}>1, very easy</Text>
            <Text style={type.meta}>10, as hard as you can</Text>
          </View>
        </Card>
      )
    },
  },
  {
    group: "Training",
    form: "Time budget",
    name: "Where the session's minutes go: working and resting",
    Draw: ({ s }) => {
      const next = nextSession(s)
      if (!next) return null
      const { session } = next
      const rows = session.exercises.map((e) => ({ e, work: workSeconds(e), rest: restSeconds(e) }))
      const max = Math.max(...rows.map((r) => r.work + r.rest))
      const total = rows.reduce((a, r) => a + r.work + r.rest, 0)
      return (
        <Card style={styles.pad}>
          <View style={styles.between}>
            <Text style={type.title}>{`About ${Math.round(total / 60)} of ${session.minutes} minutes in the moves`}</Text>
            <Tag tone="muted">Estimate</Tag>
          </View>
          {rows.map((r) => (
            <View key={r.e.id} style={styles.stackSm}>
              <View style={styles.between}>
                <Text style={type.label}>{r.e.name}</Text>
                <Text style={type.meta}>{`${formatNumber((r.work + r.rest) / 60, 1)} min`}</Text>
              </View>
              <View style={[styles.budget, { width: `${((r.work + r.rest) / max) * 100}%` }]}>
                <View style={{ flex: r.work, height: 10, borderRadius: 5, backgroundColor: TEAL_RAMP[4] }} />
                <View style={{ flex: r.rest, height: 10, borderRadius: 5, backgroundColor: TEAL_RAMP[1] }} />
              </View>
            </View>
          ))}
          <Legend items={[{ c: TEAL_RAMP[4], t: "Working, about 3 seconds a rep" }, { c: TEAL_RAMP[1], t: "Resting between sets" }]} />
          <Text style={type.meta}>The rest of the time is getting set up and moving between moves.</Text>
        </Card>
      )
    },
  },
  {
    group: "Training",
    form: "Checklist",
    name: "What to have ready before you start",
    Draw: ({ s }) => {
      const next = nextSession(s)
      if (!next) return null
      const kit = new Map<string, string[]>()
      for (const e of next.session.exercises) kit.set(e.equipment, [...(kit.get(e.equipment) ?? []), e.name])
      return (
        <Group>
          {[...kit.entries()].map(([what, moves]) => (
            <NeedsRow key={what} icon={<TickCircle done={false} />} title={what} meta={`For ${moves.join(" and ").toLowerCase()}`} chevron={false} />
          ))}
        </Group>
      )
    },
  },
  {
    group: "Training",
    form: "Side by side table",
    name: "Your sessions compared",
    Draw: ({ s }) => {
      const profile = profileOf(s)
      const monday = weekPlan(s)[0].date
      const list = Object.values(profile.sessions)
      const days = (x: Session) =>
        Array.from({ length: 7 }, (_, i) => addDays(monday, i))
          .filter((d) => profile.sessionOn(d)?.id === x.id)
          .map((d) => weekday(d))
          .join(", ")
      const rows: { k: string; v: (x: Session) => string }[] = [
        { k: "Works on", v: (x) => x.focus },
        { k: "Days", v: days },
        { k: "Moves", v: (x) => String(x.exercises.length) },
        { k: "Sets", v: (x) => String(x.exercises.reduce((a, e) => a + e.sets, 0)) },
        { k: "Minutes", v: (x) => String(x.minutes) },
        { k: "Effort", v: (x) => x.effort },
      ]
      return (
        <Card style={styles.pad}>
          <View style={styles.tr}>
            <View style={styles.tableHead} />
            {list.map((x) => (
              <View key={x.id} style={[styles.fill, styles.row]}>
                <View style={[styles.letter, x.id === "strength-b" ? styles.letterOutline : styles.letterFill]}>
                  <Text style={[type.captionStrong, x.id !== "strength-b" && { color: ink.onColor }]}>{letterOf(x)}</Text>
                </View>
                <Text style={type.title}>{x.title}</Text>
              </View>
            ))}
          </View>
          {rows.map((r) => (
            <View key={r.k} style={[styles.tr, styles.trRule, styles.top]}>
              <Text style={[type.label, styles.tableHead]}>{r.k}</Text>
              {list.map((x) => (
                <Text key={x.id} style={[type.value, styles.fill]}>
                  {r.v(x)}
                </Text>
              ))}
            </View>
          ))}
        </Card>
      )
    },
  },

  /* ===== the week's plan ===== */
  {
    group: "This week's training",
    form: "Week calendar",
    name: "Monday to Sunday: sessions, rest days and what is done",
    Draw: ({ s }) => {
      const week = weekPlan(s)
      return (
        <Card style={styles.pad}>
          <View style={styles.between}>
            {week.map((d) => {
              const done = d.session ? d.sessionDone : d.walked
              return (
                <View key={d.day} style={styles.calCol}>
                  <Text style={[type.caption, d.today && styles.strongCaption]}>{d.weekday}</Text>
                  <View
                    style={[
                      styles.calTile,
                      done ? { backgroundColor: color.primary } : d.session ? { backgroundColor: color.primarySoft } : { backgroundColor: "#F2F2F0" },
                      d.today && styles.calToday,
                    ]}
                  >
                    {done ? <Check size={16} color={ink.onColor} weight="bold" /> : d.session ? <Barbell size={16} color={color.primary} /> : <PersonSimpleWalk size={16} color={ink.tertiary} />}
                  </View>
                  <Text style={type.captionStrong}>{d.session ? letterOf(d.session) : "Rest"}</Text>
                </View>
              )
            })}
          </View>
          <Legend items={[{ c: color.primary, t: "Done" }, { c: color.primarySoft, t: "Strength session" }, { c: "#F2F2F0", t: "Rest day, a walk" }]} />
          <Text style={type.meta}>{`Today: ${week.find((d) => d.today)?.line ?? "rest"}. The walk after dinner is every day.`}</Text>
        </Card>
      )
    },
  },
  {
    group: "This week's training",
    form: "Rotation strip",
    name: "How the sessions take turns over two weeks",
    Draw: ({ s }) => {
      const profile = profileOf(s)
      const monday = weekPlan(s)[0].date
      const weeks = [0, 1].map((w) => Array.from({ length: 7 }, (_, i) => addDays(monday, w * 7 + i)))
      const today = localDay(new Date())
      return (
        <Card style={styles.pad}>
          {weeks.map((days, w) => (
            <View key={w} style={styles.stackSm}>
              <Text style={type.label}>{w === 0 ? "This week" : "Next week"}</Text>
              <View style={styles.rotation}>
                {days.map((d) => {
                  const session = profile.sessionOn(d)
                  const b = session?.id === "strength-b"
                  return (
                    <View key={localDay(d)} style={styles.calCol}>
                      <View style={[styles.rotCell, session ? (b ? styles.letterOutline : styles.letterFill) : styles.rotRest, localDay(d) === today && styles.calToday]}>
                        <Text style={[type.metaStrong, session && !b && { color: ink.onColor }]}>{session ? letterOf(session) : ""}</Text>
                      </View>
                      <Text style={type.caption}>{weekday(d).slice(0, 1)}</Text>
                    </View>
                  )
                })}
              </View>
            </View>
          ))}
          <View style={styles.wrap}>
            {Object.values(profile.sessions).map((x) => (
              <View key={x.id} style={styles.row}>
                <View style={[styles.keyLetter, x.id === "strength-b" ? styles.letterOutline : styles.letterFill]} />
                <Text style={type.meta}>{`${letterOf(x)}: ${x.focus.toLowerCase()}`}</Text>
              </View>
            ))}
            <View style={styles.row}>
              <View style={[styles.keyLetter, styles.rotRest]} />
              <Text style={type.meta}>Rest day</Text>
            </View>
          </View>
        </Card>
      )
    },
  },

  /* ===== activity ===== */
  {
    group: "Activity",
    form: "Hero number with goal meter",
    name: "Exercise minutes yesterday, against your goal",
    Draw: ({ d }) => {
      const g = exerciseOf(d)
      if (!g || g.value === undefined) return null
      const level: Level = g.value >= g.goal.target ? "in" : g.value >= g.goal.target * 0.9 ? "borderline" : "out"
      return (
        <Card style={styles.pad}>
          <View style={styles.between}>
            <View style={styles.row}>
              <GoalIcon id="exercise" size={28} />
              <Text style={type.title}>Exercise</Text>
            </View>
            <StatusWord level={level} word={level === "in" ? "Goal met" : `${g.goal.target - g.value} min short`} />
          </View>
          <Big value={g.value} unit={`of ${g.goal.target} min`} size={40} />
          <View>
            <Meter share={Math.min(g.value / (g.goal.target * 1.4), 1)} hue={GOAL_HUE.exercise} h={10} />
            <View style={[styles.goalTick, { left: `${(1 / 1.4) * 100}%` }]} />
          </View>
          <Text style={type.meta}>{`Line: your goal of ${g.goal.target} minutes. From your watch, ${label(d.date)}.`}</Text>
        </Card>
      )
    },
  },
  {
    group: "Activity",
    form: "Part to whole",
    name: "Where yesterday's minutes came from",
    Draw: ({ s, d, month }) => {
      const g = exerciseOf(d)
      if (!g || g.value === undefined) return null
      const day = movesOf(s, month.slice(-1))[0]
      const strength = day.done && day.session ? day.session.minutes : 0
      const walk = day.walked ? WALK.minutes : 0
      const other = Math.max(g.value - strength - walk, 0)
      const parts = [
        { k: "Strength session", v: strength, c: TEAL_RAMP[5] },
        { k: "Walk after dinner", v: walk, c: TEAL_RAMP[3] },
        { k: "Other movement", v: other, c: TEAL_RAMP[1] },
      ].filter((x) => x.v > 0)
      return (
        <Card style={styles.pad}>
          <View style={styles.between}>
            <Text style={type.title}>{`${g.value} minutes, ${label(d.date)}`}</Text>
            <Text style={type.meta}>{day.session ? day.session.title : "Rest day"}</Text>
          </View>
          <View style={styles.stack}>
            {parts.map((x) => (
              <View key={x.k} style={{ flex: x.v, height: 16, borderRadius: 8, backgroundColor: x.c }} />
            ))}
          </View>
          {parts.map((x) => (
            <View key={x.k} style={styles.between}>
              <View style={styles.row}>
                <View style={[styles.key, { backgroundColor: x.c }]} />
                <Text style={type.label}>{x.k}</Text>
              </View>
              <Text style={type.value}>{`${x.v} min`}</Text>
            </View>
          ))}
          <Text style={type.meta}>Other movement is what your watch counted outside the plan.</Text>
        </Card>
      )
    },
  },
  {
    group: "Activity",
    form: "Lollipops from the goal line",
    name: "Exercise minutes each day, above or below the goal",
    Draw: ({ d }) => {
      const g = exerciseOf(d)
      if (!g) return null
      const W = 300
      const H = 140
      const mid = 64
      const vals = g.week.map((w) => w.value)
      const span = Math.max(...vals.map((v) => Math.abs((v ?? g.goal.target) - g.goal.target)), 10)
      const x = (i: number) => 20 + (i * (W - 40)) / 6
      const y = (v: number) => mid - ((v - g.goal.target) / span) * 48
      return (
        <Card style={styles.pad}>
          <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
            <Line x1={0} x2={W} y1={mid} y2={mid} stroke={DIVERGE.mid} strokeWidth={2} />
            <SvgText x={W} y={12} fontSize={10} fill={ink.secondary} textAnchor="end" fontFamily={font.regular}>
              {`Goal ${g.goal.target} min`}
            </SvgText>
            {vals.map((v, i) => {
              if (v === undefined) return null
              const hue = v > g.goal.target ? DIVERGE.above : v < g.goal.target ? DIVERGE.below : ink.tertiary
              return (
                <React.Fragment key={i}>
                  <Line x1={x(i)} x2={x(i)} y1={mid} y2={y(v)} stroke={hue} strokeWidth={2} strokeLinecap="round" />
                  <Circle cx={x(i)} cy={y(v)} r={6} fill={hue} stroke={color.background} strokeWidth={2} />
                  <SvgText x={x(i)} y={v >= g.goal.target ? y(v) - 10 : y(v) + 18} fontSize={10} fill={ink.content} textAnchor="middle" fontFamily={font.semibold}>
                    {String(v)}
                  </SvgText>
                  <SvgText x={x(i)} y={H - 4} fontSize={10} fill={ink.secondary} textAnchor="middle" fontFamily={font.regular}>
                    {g.week[i].label.slice(0, 3)}
                  </SvgText>
                </React.Fragment>
              )
            })}
          </Svg>
          <Legend items={[{ c: DIVERGE.above, t: "Above goal" }, { c: DIVERGE.below, t: "Below goal" }]} />
        </Card>
      )
    },
  },
  {
    group: "Activity",
    form: "Device readout with range",
    name: "Active energy from your watch, with the week's low and high",
    Draw: ({ d, week }) => {
      const now = d.energy?.active
      const list = week.map((x) => x.energy?.active).filter((v): v is number => v !== undefined)
      if (now === undefined || list.length < 2) return null
      const lo = Math.min(...list)
      const hi = Math.max(...list)
      const avg = Math.round(list.reduce((a, v) => a + v, 0) / list.length)
      const at = (v: number) => `${((v - lo) / (hi - lo || 1)) * 100}%` as const
      return (
        <Card style={styles.pad}>
          <View style={styles.row}>
            <Tile size={36}>
              <Watch color={color.primary} />
            </Tile>
            <View style={styles.fill}>
              <Text style={type.title}>Active energy</Text>
              <Text style={type.meta}>{d.energy?.source}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <Flame size={18} color={ink.secondary} />
            <Big value={formatNumber(now)} unit={`kcal, ${label(d.date)}`} size={32} />
          </View>
          <View style={styles.rangeTrack}>
            <View style={[styles.rangeAvg, { left: at(avg) }]} />
            <View style={[styles.rangeNow, { left: at(now) }]} />
          </View>
          <View style={styles.between}>
            <Text style={type.meta}>{`Low ${formatNumber(lo)}`}</Text>
            <Text style={type.metaStrong}>{`Average ${formatNumber(avg)}`}</Text>
            <Text style={type.meta}>{`High ${formatNumber(hi)}`}</Text>
          </View>
          <Text style={type.meta}>{`The last ${list.length} fully logged days. The ring is ${label(d.date)}.`}</Text>
        </Card>
      )
    },
  },
  {
    group: "Activity",
    form: "Scatter",
    name: "More minutes, more active energy: the last 30 days",
    Draw: ({ month }) => {
      const pts = month.map((x) => ({ m: exerciseOf(x)?.value, a: x.energy?.active, day: x.day })).filter((p): p is { m: number; a: number; day: string } => p.m !== undefined && p.a !== undefined)
      if (pts.length < 3) return null
      const W = 300
      const H = 170
      const L = 36
      const B = 28
      const mLo = 20
      const mHi = 70
      const aLo = 250
      const aHi = 500
      const x = (v: number) => L + ((v - mLo) / (mHi - mLo)) * (W - L - 8)
      const y = (v: number) => H - B - ((v - aLo) / (aHi - aLo)) * (H - B - 8)
      const last = pts[pts.length - 1]
      return (
        <Card style={styles.pad}>
          <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
            {[300, 400, 500].map((v) => (
              <React.Fragment key={v}>
                <Line x1={L} x2={W} y1={y(v)} y2={y(v)} stroke={chart.track} strokeWidth={1} />
                <SvgText x={L - 6} y={y(v) + 3} fontSize={10} fill={ink.secondary} textAnchor="end" fontFamily={font.regular}>
                  {String(v)}
                </SvgText>
              </React.Fragment>
            ))}
            {[30, 45, 60].map((v) => (
              <SvgText key={v} x={x(v)} y={H - B + 14} fontSize={10} fill={ink.secondary} textAnchor="middle" fontFamily={font.regular}>
                {String(v)}
              </SvgText>
            ))}
            <SvgText x={W} y={H - 2} fontSize={10} fill={ink.secondary} textAnchor="end" fontFamily={font.regular}>
              Exercise minutes
            </SvgText>
            {pts.map((p) => (
              <Circle key={p.day} cx={x(p.m)} cy={y(p.a)} r={5} fill={chart.history} fillOpacity={0.7} />
            ))}
            <Circle cx={x(last.m)} cy={y(last.a)} r={7} fill={chart.dataStrong} stroke={color.background} strokeWidth={2} />
          </Svg>
          <Legend items={[{ c: chart.history, t: "A day" }, { c: chart.dataStrong, t: "Yesterday" }]} />
          <Text style={type.meta}>Up the side: active kcal, from your watch. Fully logged days only.</Text>
        </Card>
      )
    },
  },
  {
    group: "Activity",
    form: "Pace scale",
    name: "How brisk the walk should be: the talk test",
    Draw: () => {
      const steps = [
        { k: "Easy", v: "You can sing" },
        { k: "Brisk", v: "You can talk, but not sing", you: true },
        { k: "Hard", v: "You can't say more than a few words" },
      ]
      return (
        <Card style={styles.pad}>
          <View style={styles.row}>
            <Tile size={36}>
              <PersonSimpleWalk color={color.primary} />
            </Tile>
            <View style={styles.fill}>
              <Text style={type.title}>{WALK.title}</Text>
              <Text style={type.label}>{WALK.detail}</Text>
            </View>
          </View>
          <View style={styles.pace}>
            {steps.map((x, i) => (
              <View key={x.k} style={[styles.paceCell, { backgroundColor: TEAL_RAMP[1 + i * 2] }]} />
            ))}
          </View>
          <View style={styles.paceLabels}>
            {steps.map((x) => (
              <View key={x.k} style={[styles.fill, styles.paceLabel]}>
                {x.you ? (
                  <View style={styles.row}>
                    <Target size={14} color={color.primary} />
                    <Text style={type.title}>{x.k}</Text>
                  </View>
                ) : (
                  <Text style={type.label}>{x.k}</Text>
                )}
                <Text style={type.meta}>{x.v}</Text>
              </View>
            ))}
          </View>
          <Text style={type.meta}>Your plan asks for brisk: the middle of the scale.</Text>
        </Card>
      )
    },
  },
  {
    group: "Activity",
    form: "Icon grid",
    name: "Evening walks over the last 30 days",
    Draw: ({ s, month }) => {
      const days = movesOf(s, month)
      const walked = days.filter((x) => x.walked).length
      return (
        <Card style={styles.pad}>
          <Big value={walked} unit={`of ${days.length} evenings walked`} size={28} />
          <View style={styles.iconGrid}>
            {days.map((x) => (
              <View key={localDay(x.date)} style={[styles.iconCell, { backgroundColor: x.walked ? color.primarySoft : "#F2F2F0" }]}>
                <PersonSimpleWalk size={16} color={x.walked ? color.primary : "#B8B8B8"} weight={x.walked ? "fill" : "regular"} />
              </View>
            ))}
          </View>
          <View style={styles.between}>
            <Text style={type.meta}>{label(days[0].date)}</Text>
            <Text style={type.meta}>{label(days[days.length - 1].date)}</Text>
          </View>
          <Legend items={[{ c: color.primary, t: "Walked" }, { c: "#D9D8D3", t: "No walk logged" }]} />
        </Card>
      )
    },
  },
  {
    group: "Activity",
    form: "Gauge",
    name: "This week's minutes against seven days of your goal",
    Draw: ({ d, week }) => {
      const g = exerciseOf(d)
      if (!g) return null
      const total = week.reduce((a, x) => a + (exerciseOf(x)?.value ?? 0), 0)
      const target = g.goal.target * 7
      const share = Math.min(total / target, 1)
      const W = 220
      const r = 88
      const cx = W / 2
      const cy = 100
      return (
        <Card style={[styles.pad, styles.center]}>
          <View style={{ width: W, height: 116 }}>
            <Svg width={W} height={116}>
              <Path d={arc(cx, cy, r, -90, 90)} stroke={chart.dataTrack} strokeWidth={14} strokeLinecap="round" fill="none" />
              {share > 0 && <Path d={arc(cx, cy, r, -90, -90 + 180 * share)} stroke={color.primary} strokeWidth={14} strokeLinecap="round" fill="none" />}
            </Svg>
            <View style={styles.gaugeCenter}>
              <Big value={formatNumber(total)} unit="min" size={30} />
              <Text style={type.label}>{`of ${formatNumber(target)} this week`}</Text>
            </View>
          </View>
          <View style={[styles.between, { width: W }]}>
            <Text style={type.meta}>0</Text>
            <Text style={type.meta}>{formatNumber(target)}</Text>
          </View>
          <Text style={[type.meta, styles.textCenter]}>{`${g.goal.target} minutes a day, 7 days ending ${label(d.date)}. Your watch counts every day, logged or not.`}</Text>
        </Card>
      )
    },
  },

  /* ===== consistency ===== */
  {
    group: "Consistency",
    form: "Tally",
    name: "Strength sessions done of those planned, last 30 days",
    Draw: ({ s, month }) => {
      const days = movesOf(s, month).filter((x) => x.session)
      const done = days.filter((x) => x.done).length
      return (
        <Card style={styles.pad}>
          <View style={styles.row}>
            <Tile size={36}>
              <Barbell color={color.primary} />
            </Tile>
            <View style={styles.fill}>
              <Big value={`${done} of ${days.length}`} unit="sessions" size={26} />
            </View>
          </View>
          <View style={styles.tally}>
            {days.map((x) => (
              <View key={localDay(x.date)} style={[styles.tallyCell, x.done ? { backgroundColor: color.primary } : styles.tallyMissed]} />
            ))}
          </View>
          <Legend items={[{ c: color.primary, t: "Done" }, { c: "#C9CDD3", t: "Not done", ring: true }]} />
          <Text style={type.meta}>{`${days.length - done === 0 ? "Every planned session done." : `${days.length - done} planned ${days.length - done === 1 ? "day" : "days"} with nothing logged.`} One square for each planned day.`}</Text>
        </Card>
      )
    },
  },
  {
    group: "Consistency",
    form: "Calendar",
    name: "Four weeks of training, day by day",
    Draw: ({ s, month }) => {
      const days = movesOf(s, month.slice(-28))
      const weeks = [0, 1, 2, 3].map((w) => days.slice(w * 7, w * 7 + 7))
      return (
        <Card style={styles.pad}>
          <View style={styles.calRow}>
            {weeks[0].map((x) => (
              <Text key={localDay(x.date)} style={[type.caption, styles.calHead]}>
                {weekday(x.date).slice(0, 1)}
              </Text>
            ))}
          </View>
          {weeks.map((row, w) => (
            <View key={w} style={styles.calRow}>
              {row.map((x) => {
                const missed = x.session && !x.done
                return (
                  <View key={localDay(x.date)} style={[styles.calCell, x.done ? { backgroundColor: color.primary } : missed ? styles.calMissed : { backgroundColor: "#ECECE9" }]}>
                    <Text style={[type.captionStrong, x.done ? { color: ink.onColor } : { color: ink.secondary }]}>{x.date.getDate()}</Text>
                  </View>
                )
              })}
            </View>
          ))}
          <Legend items={[{ c: color.primary, t: "Session done" }, { c: "#C9CDD3", t: "Session missed", ring: true }, { c: "#ECECE9", t: "Rest day" }]} />
          <Text style={type.meta}>{`${label(days[0].date)} to ${label(days[days.length - 1].date)}`}</Text>
        </Card>
      )
    },
  },
  {
    group: "Consistency",
    form: "Dot matrix",
    name: "Each weekday over four weeks: which ones slip",
    Draw: ({ s, month }) => {
      const days = movesOf(s, month.slice(-28))
      const order = [1, 2, 3, 4, 5, 6, 0]
      return (
        <Card style={styles.pad}>
          <View style={styles.tr}>
            <View style={styles.dayHead} />
            <Text style={[type.metaStrong, styles.fill]}>Strength</Text>
            <Text style={[type.metaStrong, styles.walkHead]}>Walks</Text>
          </View>
          {order.map((wd) => {
            const list = days.filter((x) => x.date.getDay() === wd)
            const planned = list.filter((x) => x.session)
            const walks = list.filter((x) => x.walked).length
            return (
              <View key={wd} style={[styles.tr, styles.trRule]}>
                <Text style={[type.label, styles.dayHead]}>{weekday(list[0]?.date ?? new Date())}</Text>
                <View style={[styles.fill, styles.row]}>
                  {planned.length ? (
                    <>
                      <View style={styles.setDots}>
                        {planned.map((x) => (
                          <View key={localDay(x.date)} style={[styles.setDot, x.done && { backgroundColor: color.primary, borderColor: color.primary }]} />
                        ))}
                      </View>
                      <Text style={type.meta}>{`${planned.filter((x) => x.done).length} of ${planned.length}`}</Text>
                    </>
                  ) : (
                    <Text style={type.meta}>Rest day</Text>
                  )}
                </View>
                <Text style={[type.value, styles.walkHead]}>{`${walks} of ${list.length}`}</Text>
              </View>
            )
          })}
          <Legend items={[{ c: color.primary, t: "Session done" }, { c: "#C9CDD3", t: "Not done", ring: true }]} />
        </Card>
      )
    },
  },
  {
    group: "Consistency",
    form: "Status list",
    name: "The movement goals for the last 7 days, each with its status",
    Draw: ({ s, d, week }) => {
      const days = movesOf(s, week)
      const g = exerciseOf(d)
      const planned = days.filter((x) => x.session)
      const sessions = planned.filter((x) => x.done).length
      const walks = days.filter((x) => x.walked).length
      const minuteDays = week.filter((x) => (exerciseOf(x)?.value ?? 0) >= (g?.goal.target ?? 45)).length
      const levelFor = (n: number, of: number): Level => (n >= of ? "in" : n >= of - 1 ? "borderline" : "out")
      const rows = [
        { k: "Strength sessions", n: sessions, of: planned.length, Icon: Barbell },
        { k: "Walks after dinner", n: walks, of: 7, Icon: PersonSimpleWalk },
        { k: `Days with ${g?.goal.target ?? 45} minutes`, n: minuteDays, of: 7, Icon: Clock },
      ]
      return (
        <Card style={styles.pad}>
          {rows.map((r, i) => {
            const level = levelFor(r.n, r.of)
            return (
              <View key={r.k} style={[styles.tr, i > 0 && styles.trRule]}>
                <r.Icon size={18} color={ink.secondary} />
                <View style={styles.fill}>
                  <Text style={type.title}>{r.k}</Text>
                  <Text style={type.meta}>{`${r.n} of ${r.of}`}</Text>
                </View>
                <StatusWord level={level} word={level === "in" ? "All done" : `${r.of - r.n} short`} />
              </View>
            )
          })}
          <Text style={type.meta}>{`${label(week[0].date)} to ${label(week[week.length - 1].date)}. Green: all done. Orange: one short. Red: two or more short.`}</Text>
        </Card>
      )
    },
  },

  /* ===== progress ===== */
  {
    group: "Strength progress",
    form: "Staircase",
    name: "Chair stands each month, climbing toward 15",
    Draw: ({ p }) => {
      const list = p.stands.series
      if (!list.length) return null
      const H = 120
      const bar = (v: number) => ((H - 22) * v) / p.stands.goal
      return (
        <Card style={styles.pad}>
          <View style={styles.between}>
            <Text style={type.title}>Chair stands in 30 seconds</Text>
            <Text style={type.meta}>{`Line: goal of ${p.stands.goal}`}</Text>
          </View>
          <View style={[styles.stairs, { height: H }]}>
            <View style={[styles.goalRule, { bottom: bar(p.stands.goal) }]} />
            {list.map((m, i) => {
              const last = i === list.length - 1
              return (
                <View key={m.at} style={styles.stairCol}>
                  <Text style={type.metaStrong}>{m.value}</Text>
                  <View style={[styles.stair, { height: bar(m.value), backgroundColor: last ? color.primary : TEAL_RAMP[2] }]} />
                </View>
              )
            })}
          </View>
          <View style={styles.stairLabels}>
            {list.map((m) => (
              <Text key={m.at} style={[type.caption, styles.fill, styles.textCenter]}>
                {dateOfAt(m.at).toLocaleDateString("en-US", { month: "short" })}
              </Text>
            ))}
          </View>
          <Text style={type.meta}>Entered by you, once a month. Each step is one check.</Text>
        </Card>
      )
    },
  },
  {
    group: "Strength progress",
    form: "Personal best",
    name: "Your best chair stand count, and what is left to the goal",
    Draw: ({ p }) => {
      const list = p.stands.series
      if (!list.length) return null
      const best = list.reduce((a, m) => (m.value > a.value ? m : a), list[0])
      const first = list[0]
      const left = Math.max(p.stands.goal - best.value, 0)
      return (
        <Card style={[styles.pad, styles.row, styles.topRow]}>
          <View style={[styles.icon, { width: 52, height: 52, borderRadius: 26, backgroundColor: color.amberTint }]}>
            <Trophy size={28} color={color.amber} weight="fill" />
          </View>
          <View style={[styles.fill, styles.stackSm]}>
            <Text style={type.label}>Personal best</Text>
            <Big value={best.value} unit="chair stands in 30 seconds" size={34} />
            <Text style={type.body}>{`On ${label(dateOfAt(best.at))}, up ${best.value - first.value} from ${first.value} in ${dateOfAt(first.at).toLocaleDateString("en-US", { month: "long" })}.`}</Text>
            <View style={styles.bestBar}>
              {Array.from({ length: p.stands.goal }, (_, i) => (
                <View key={i} style={[styles.bestCell, { backgroundColor: i < best.value ? color.primary : chart.track }]} />
              ))}
            </View>
            <Text style={type.meta}>{left ? `${left} more ${left === 1 ? "stand reaches" : "stands reach"} your goal of ${p.stands.goal}.` : "You have reached your goal."}</Text>
          </View>
        </Card>
      )
    },
  },
  {
    group: "Strength progress",
    form: "Before, now and next",
    name: "How your movement plan has grown since May",
    Draw: ({ s }) => {
      const bone = profileOf(s).focus === "bone"
      const versions = bone ? BONE_VERSIONS : PLAN_VERSIONS
      const first = versions[versions.length - 1]
      const now = versions[0]
      const rows: { k: string; a: string; b: string; up?: boolean; next?: string }[] = bone
        ? [
            { k: "Strength and balance", a: "3 a week", b: "3 a week" },
            { k: "Moves a session", a: "4", b: "5", up: true },
            { k: "Minutes a session", a: "25", b: "25" },
            { k: "Walks after dinner", a: "Every day", b: "Every day" },
          ]
        : [
            { k: "Strength sessions", a: "3 a week", b: "6 a week", up: true },
            { k: "Minutes a session", a: "20", b: "20", next: "25" },
            { k: "Walks after dinner", a: "3 a week", b: "Every day", up: true },
          ]
      const draft = !bone && PLAN_DRAFT.changes.some((c) => c.toLowerCase().includes("strength"))
      return (
        <Card style={styles.pad}>
          <View style={styles.tr}>
            <View style={styles.fill} />
            <Text style={[type.metaStrong, styles.planCol]}>{`Version ${first.version}`}</Text>
            <Text style={[type.metaStrong, styles.planCol]}>{`Version ${now.version}`}</Text>
            {draft && <Text style={[type.metaStrong, styles.planCol]}>Proposed</Text>}
          </View>
          {rows.map((r) => (
            <View key={r.k} style={[styles.tr, styles.trRule]}>
              <Text style={[type.label, styles.fill]}>{r.k}</Text>
              <Text style={[type.label, styles.planCol]}>{r.a}</Text>
              <View style={[styles.planCol, styles.row]}>
                <Text style={type.value}>{r.b}</Text>
                {r.up && <ArrowUp size={12} color={ink.secondary} />}
              </View>
              {draft && <Text style={[type.label, styles.planCol]}>{r.next ?? ""}</Text>}
            </View>
          ))}
          <Text style={type.meta}>{`Version ${first.version}: ${first.approved}. Version ${now.version}: ${now.approved}, by ${now.by}.${draft ? " Proposed: with your doctor now, not yet approved." : ""}`}</Text>
        </Card>
      )
    },
  },
]

/* ------------------------------------------------------------- styles -- */

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: "center" },
  textCenter: { textAlign: "center" },
  top: { alignItems: "flex-start" },
  topRow: { alignItems: "flex-start" },
  row: { flexDirection: "row", alignItems: "center", gap: space.inline },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.inline },
  stackSm: { gap: space.stack },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.inline },
  pad: { gap: space.item, padding: space.gutter },
  icon: { alignItems: "center", justifyContent: "center" },
  fillCenter: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center" },
  key: { width: 10, height: 10, borderRadius: 2 },

  tr: { flexDirection: "row", alignItems: "center", gap: space.inline, paddingVertical: space.stack },
  trRule: { borderTopWidth: 1, borderTopColor: "#F2F2F7", paddingTop: space.inline },

  setDots: { flexDirection: "row", gap: 4 },
  setDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: "#C9CDD3" },

  strip: { flexDirection: "row" },
  stripCell: { flex: 1, gap: space.line, paddingHorizontal: space.inline },
  stripRule: { borderLeftWidth: 1, borderLeftColor: "#ECECEC" },

  areaChip: { flexDirection: "row", alignItems: "center", gap: space.mark, borderRadius: 999, paddingHorizontal: space.item, paddingVertical: space.mark },

  effort: { flexDirection: "row", gap: 2 },
  effortCell: { flex: 1, height: 10, borderRadius: 5 },

  budget: { flexDirection: "row", gap: 2 },

  tableHead: { width: 64 },
  letter: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  letterFill: { backgroundColor: color.primary, borderWidth: 2, borderColor: color.primary },
  letterOutline: { backgroundColor: color.background, borderWidth: 2, borderColor: color.primary },

  calCol: { alignItems: "center", gap: space.stack, flex: 1 },
  calTile: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  calToday: { borderWidth: 2, borderColor: chart.dataStrong },
  strongCaption: { color: ink.strong, fontFamily: font.semibold },

  rotation: { flexDirection: "row", gap: 2 },
  rotCell: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  rotRest: { backgroundColor: "#F2F2F0", borderWidth: 2, borderColor: "#F2F2F0" },
  keyLetter: { width: 12, height: 12, borderRadius: 6 },

  goalTick: { position: "absolute", top: -4, width: 2, height: 18, marginLeft: -1, backgroundColor: ink.secondary, borderRadius: 1 },

  stack: { flexDirection: "row", gap: 2 },

  rangeTrack: { height: 10, borderRadius: 5, backgroundColor: TEAL_RAMP[0], position: "relative", marginHorizontal: 8 },
  rangeAvg: { position: "absolute", top: -3, width: 2, height: 16, marginLeft: -1, backgroundColor: ink.secondary },
  rangeNow: { position: "absolute", top: -5, width: 20, height: 20, marginLeft: -10, borderRadius: 10, backgroundColor: color.background, borderWidth: 4, borderColor: color.primary },

  pace: { flexDirection: "row", gap: 2 },
  paceCell: { flex: 1, height: 12, borderRadius: 6 },
  paceLabels: { flexDirection: "row", gap: space.inline },
  paceLabel: { gap: space.line },

  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  iconCell: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },

  gaugeCenter: { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center" },

  tally: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  tallyCell: { width: 20, height: 20, borderRadius: 4 },
  tallyMissed: { borderWidth: 2, borderColor: "#C9CDD3", backgroundColor: color.background },

  calRow: { flexDirection: "row", gap: 4 },
  calHead: { flex: 1, textAlign: "center" },
  calCell: { flex: 1, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  calMissed: { borderWidth: 2, borderColor: "#C9CDD3", backgroundColor: color.background },

  dayHead: { width: 40 },
  walkHead: { width: 56, textAlign: "right" },

  stairs: { flexDirection: "row", alignItems: "flex-end", gap: 2, position: "relative" },
  stairCol: { flex: 1, alignItems: "center", gap: 2 },
  stair: { width: "100%", borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  stairLabels: { flexDirection: "row", gap: 2 },
  goalRule: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: chart.goal },

  bestBar: { flexDirection: "row", gap: 2 },
  bestCell: { flex: 1, height: 8, borderRadius: 4 },


  planCol: { width: 72 },
})
