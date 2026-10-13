import * as React from "react"
import { StyleSheet, Text, View } from "react-native"
import Svg, { Circle, Path } from "react-native-svg"

import { CompositionBar, ProgressChart, RangeBar, WeekBars, formatNumber } from "@/components/charts"
import {
  Barbell,
  Bone,
  BowlFood,
  CalendarCheck,
  CheckCircle,
  Clock,
  Flame,
  Heartbeat,
  Lightbulb,
  PersonSimpleRun,
  PersonSimpleWalk,
  Scales,
  ShieldCheck,
  Trophy,
  TrendDown,
  TrendUp,
  WarningCircle,
} from "@/components/ph"
import { GoalTile } from "@/components/home-optimized"
import { Block, Card, DateBlock, Group, NeedsRow, Status, Tag, TickCircle, type Level } from "@/components/record-kit"
import { reviewDay, type GoalDay, type ReviewDay, type ReviewGoalId } from "@/lib/daily-review"
import { useMarkers } from "@/lib/experience"
import { DEXA_SCANS, pressureReadingsOf, profileOf, progress, progressChartOf, today, type TodayAction } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import type { Biomarker } from "@/lib/record"
import { comingUp } from "@/lib/todo"
import { classify } from "@/lib/trends"
import { chart, color, font, ink, space, type } from "@/lib/theme"

/* Fifty ways to show a member's plan data (rebuilt 12 Oct 2026 with the
   dataviz method). Form first: most of these are not charts at all, but a
   hero number, a KPI row, a meter, a badge, a checklist, a table, a
   before and after, a waffle, a timeline; a chart only where the job is a
   trend or a comparison.

   Colour by the job it does, never by taste:
   - identity (which goal): one fixed hue per goal, validated as a set for
     colour blind readers on every pair (validate_palette.js, all pairs:
     pass): deficit orange, protein blue, calcium indigo, exercise aqua.
     Aqua sits under 3:1 on white, so it always has a visible label;
   - magnitude: one hue, light to dark (the brand teal);
   - above or below a goal: two poles, blue and red, with a grey midline;
   - status (met, close, below): the reserved green, orange and red, always
     with an icon and a word, never colour alone.
   Words stay in the text inks; a hue only colours the mark beside them. */

/* ------------------------------------------------------------- colour -- */

export const GOAL_HUE: Record<ReviewGoalId, string> = {
  energy: "#eb6834",
  protein: "#2a78d6",
  calcium: "#4a3aa7",
  exercise: "#1baf7a",
}
export const tint = (hex: string, alpha = "1A") => `${hex}${alpha}`

/** The brand teal as a one hue ramp, light to dark, for magnitude. */
export const TEAL_RAMP = ["#E6F3F2", "#B9E0DD", "#7FC6C1", "#3FA39D", "#01837E", "#015D59"]
export const rampOf = (share: number) => TEAL_RAMP[Math.max(0, Math.min(TEAL_RAMP.length - 1, Math.round(share * (TEAL_RAMP.length - 1))))]

/** Above and below a goal: blue and red poles, a grey midline. */
export const DIVERGE = { above: "#2a78d6", below: "#e34948", mid: "#D9D8D3" }

/** The reserved status colours, each with its icon. */
export const STATUS: Record<Level, { mark: string; ink: string; tint: string; word: string; Icon: React.ComponentType<{ size?: number; color?: string; weight?: "fill" | "regular" | "bold" }> }> = {
  in: { mark: chart.inRange, ink: ink.good, tint: color.okTint, word: "Goal met", Icon: CheckCircle },
  borderline: { mark: chart.borderline, ink: "#A95413", tint: "#FFF4E8", word: "Close", Icon: WarningCircle },
  out: { mark: chart.outside, ink: "#B42318", tint: color.highTint, word: "Below goal", Icon: WarningCircle },
}

export const GOAL_ICON: Record<ReviewGoalId, React.ComponentType<{ size?: number; color?: string }>> = {
  energy: Flame,
  protein: BowlFood,
  calcium: Bone,
  exercise: PersonSimpleRun,
}
export const GOAL_NAME: Record<ReviewGoalId, string> = { energy: "Calorie deficit", protein: "Protein", calcium: "Calcium", exercise: "Exercise" }
export const SHORT: Record<ReviewGoalId, string> = { energy: "Deficit", protein: "Protein", calcium: "Calcium", exercise: "Exercise" }

export const levelOf = (g: GoalDay): Level => (g.value === undefined || g.state === "under" || g.state === "none" ? "out" : g.state === "close" ? "borderline" : "in")
export const shareOf = (g: GoalDay) => (g.value !== undefined ? Math.max(0, Math.min(g.value / g.goal.target, 1)) : 0)
export const amount = (g: GoalDay) => (g.value === undefined ? "No log" : formatNumber(g.value))
export const label = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
export const weekday = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short" })

/* --------------------------------------------------------------- data -- */

export type Data = {
  s: ReturnType<typeof useOnboarding>
  d: ReviewDay
  week: ReviewDay[]
  month: ReviewDay[]
  p: ReturnType<typeof progress>
  t: ReturnType<typeof today>
  markers: Biomarker[]
}

export function useData(): Data {
  const s = useOnboarding()
  const markers = useMarkers()
  return React.useMemo(() => {
    const month = Array.from({ length: 30 }, (_, i) => reviewDay(s, 30 - i))
    return { s, d: month[29], week: month.slice(-7), month, p: progress(s), t: today(s), markers }
  }, [s, markers])
}

/* --------------------------------------------------------- primitives -- */

/** A status as the kit draws it: the icon, the word, in its own ink. */
export function StatusWord({ level, word }: { level: Level; word?: string }) {
  const st = STATUS[level]
  return (
    <View style={[styles.statusChip, { backgroundColor: st.tint }]}>
      <st.Icon size={14} color={st.mark} weight="fill" />
      <Text style={[type.metaStrong, { color: st.ink }]}>{word ?? st.word}</Text>
    </View>
  )
}

/** A meter: a share of a limit on a track of its own hue. */
export function Meter({ share, hue, h = 8 }: { share: number; hue: string; h?: number }) {
  return (
    <View style={[styles.meter, { height: h, borderRadius: h / 2, backgroundColor: tint(hue, "24") }]}>
      <View style={{ width: `${Math.min(Math.max(share, 0), 1) * 100}%`, height: h, borderRadius: h / 2, backgroundColor: hue }} />
    </View>
  )
}

/** The goal's identity: its icon on a tint of its hue. */
export function GoalIcon({ id, size = 32 }: { id: ReviewGoalId; size?: number }) {
  const Icon = GOAL_ICON[id]
  return (
    <View style={[styles.icon, { width: size, height: size, borderRadius: size / 2, backgroundColor: tint(GOAL_HUE[id]) }]}>
      <Icon size={size * 0.5} color={GOAL_HUE[id]} />
    </View>
  )
}

export function Ring({ size, stroke, share, hue, children }: { size: number; stroke: number; share: number; hue: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={tint(hue, "24")} strokeWidth={stroke} fill="none" />
        {share > 0 && (
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={hue} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c * Math.min(share, 1)} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        )}
      </Svg>
      {children && <View style={styles.fillCenter}>{children}</View>}
    </View>
  )
}

/** A small line, no axes: the shape of the last days. */
export function Spark({ values, w, h, hue }: { values: (number | undefined)[]; w: number; h: number; hue: string }) {
  const known = values.filter((v): v is number => v !== undefined)
  if (known.length < 2) return null
  const max = Math.max(...known)
  const min = Math.min(...known)
  const span = max - min || 1
  const pts = values
    .map((v, i) => (v === undefined ? undefined : ([4 + (i * (w - 8)) / (values.length - 1), h - 4 - ((v - min) / span) * (h - 8)] as const)))
    .filter((p): p is readonly [number, number] => !!p)
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")
  const last = pts[pts.length - 1]
  return (
    <Svg width={w} height={h}>
      <Path d={d} stroke={hue} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={last[0]} cy={last[1]} r={4} fill={hue} stroke={color.background} strokeWidth={2} />
    </Svg>
  )
}

export function Delta({ value, unit = "", goodWhenUp = true, words }: { value: number; unit?: string; goodWhenUp?: boolean; words?: string }) {
  const up = value > 0
  const good = value === 0 ? undefined : up === goodWhenUp
  const Icon = up ? TrendUp : TrendDown
  return (
    <View style={styles.delta}>
      {value !== 0 && <Icon size={14} color={good ? chart.inRange : ink.secondary} />}
      <Text style={[type.metaStrong, { color: good ? ink.good : ink.secondary }]}>
        {value === 0 ? "No change" : `${up ? "+" : "−"}${formatNumber(Math.abs(value), Number.isInteger(value) ? 0 : 1)}${unit}`}
        {words ? ` ${words}` : ""}
      </Text>
    </View>
  )
}

export const Big = ({ value, unit, size = 28 }: { value: string | number; unit?: string; size?: number }) => (
  <Text style={[styles.big, { fontSize: size, lineHeight: size + 6 }]}>
    {value}
    {!!unit && <Text style={type.unitLarge}>{` ${unit}`}</Text>}
  </Text>
)

/* ---------------------------------------------------------- the fifty -- */

export type El = { group: string; name: string; form: string; Draw: (x: Data) => React.ReactElement | null }

const TODAY_ICON: Record<TodayAction["id"], React.ComponentType<{ size?: number; color?: string }>> = {
  diet: BowlFood,
  meal: BowlFood,
  strength: Barbell,
  walk: PersonSimpleWalk,
  bp: Heartbeat,
  weigh: Scales,
}

export const ELEMENTS: El[] = [
  /* ===== headline numbers ===== */
  {
    group: "Headline numbers",
    form: "Hero number",
    name: "Yesterday's score as the one big number",
    Draw: ({ d }) => (
      <Card style={styles.pad}>
        <Text style={type.label}>{`Yesterday, ${label(d.date)}`}</Text>
        <Big value={`${d.percent ?? 0}%`} size={48} />
        <View style={styles.row}>
          <StatusWord level={(d.percent ?? 0) >= 95 ? "in" : (d.percent ?? 0) >= 85 ? "borderline" : "out"} word={`${d.met} of ${d.total} goals met`} />
        </View>
      </Card>
    ),
  },
  {
    group: "Headline numbers",
    form: "KPI row",
    name: "Three numbers side by side",
    Draw: ({ d }) => (
      <View style={styles.kpis}>
        {[
          { k: "Score", v: `${d.percent ?? 0}%` },
          { k: "Goals met", v: `${d.met}/${d.total}` },
          { k: "7 day average", v: `${d.weekAverage ?? 0}%` },
        ].map((x) => (
          <Card key={x.k} style={styles.kpi}>
            <Text style={type.label}>{x.k}</Text>
            <Text style={type.hero}>{x.v}</Text>
          </Card>
        ))}
      </View>
    ),
  },
  {
    group: "Headline numbers",
    form: "Stat tile with a sparkline",
    name: "Score with its change and the week's shape",
    Draw: ({ d, week, month }) => {
      const before = month[month.length - 8]?.percent ?? 0
      return (
        <Card style={[styles.pad, styles.row]}>
          <View style={styles.fill}>
            <Text style={type.label}>Daily score</Text>
            <Big value={`${d.percent ?? 0}%`} />
            <Delta value={(d.percent ?? 0) - before} unit=" pts" words="vs last week" />
          </View>
          <Spark values={week.map((x) => x.percent)} w={110} h={44} hue={color.primary} />
        </Card>
      )
    },
  },
  {
    group: "Headline numbers",
    form: "Comparison",
    name: "Yesterday against your average",
    Draw: ({ d }) => (
      <Card style={[styles.pad, styles.compare]}>
        <View style={styles.compareCol}>
          <Text style={type.label}>Yesterday</Text>
          <Big value={`${d.percent ?? 0}%`} />
        </View>
        <View style={styles.vs}>
          <Text style={type.metaStrong}>vs</Text>
        </View>
        <View style={styles.compareCol}>
          <Text style={type.label}>7 day average</Text>
          <Big value={`${d.weekAverage ?? 0}%`} />
        </View>
      </Card>
    ),
  },
  {
    group: "Headline numbers",
    form: "Sentence with numbers",
    name: "The day in one sentence",
    Draw: ({ d }) => (
      <Card style={styles.pad}>
        <Text style={styles.sentence}>
          {"You met "}
          <Text style={styles.sentenceStrong}>{`${d.met} of ${d.total}`}</Text>
          {" goals yesterday, for a score of "}
          <Text style={styles.sentenceStrong}>{`${d.percent ?? 0}%`}</Text>
          {". Your week is averaging "}
          <Text style={styles.sentenceStrong}>{`${d.weekAverage ?? 0}%`}</Text>
          {"."}
        </Text>
      </Card>
    ),
  },
  {
    group: "Headline numbers",
    form: "Streak",
    name: "Days fully logged in a row",
    Draw: ({ month }) => {
      let streak = 0
      for (let i = month.length - 1; i >= 0 && month[i].status === "complete"; i--) streak++
      return (
        <Card style={[styles.pad, styles.row]}>
          <View style={[styles.icon, { width: 48, height: 48, borderRadius: 24, backgroundColor: tint(GOAL_HUE.energy) }]}>
            <Flame size={26} color={GOAL_HUE.energy} />
          </View>
          <View style={styles.fill}>
            <Big value={streak} unit={streak === 1 ? "day" : "days"} />
            <Text style={type.label}>Every meal logged, in a row</Text>
          </View>
        </Card>
      )
    },
  },

  /* ===== goal status ===== */
  {
    group: "Goal status",
    form: "Status badges",
    name: "Each goal as a badge",
    Draw: ({ d }) => (
      <View style={styles.wrap}>
        {d.goals.map((g) => {
          const st = STATUS[levelOf(g)]
          return (
            <View key={g.goal.id} style={[styles.badge, { backgroundColor: st.tint }]}>
              <st.Icon size={14} color={st.mark} weight="fill" />
              <Text style={[type.metaStrong, { color: st.ink }]}>{SHORT[g.goal.id]}</Text>
            </View>
          )
        })}
      </View>
    ),
  },
  {
    group: "Goal status",
    form: "Checklist",
    name: "Goals as a ticked list",
    Draw: ({ d }) => (
      <Group>
        {d.goals.map((g) => (
          <NeedsRow
            key={g.goal.id}
            icon={<TickCircle done={g.state === "met"} />}
            title={GOAL_NAME[g.goal.id]}
            meta={g.state === "met" ? "Done" : g.gapWords}
            right={<Text style={type.value}>{`${amount(g)} ${g.goal.unit}`}</Text>}
            chevron={false}
          />
        ))}
      </Group>
    ),
  },
  {
    group: "Goal status",
    form: "Chips",
    name: "Each goal as amount over target",
    Draw: ({ d }) => (
      <View style={styles.wrap}>
        {d.goals.map((g) => (
          <View key={g.goal.id} style={styles.chip}>
            <View style={[styles.dot, { backgroundColor: GOAL_HUE[g.goal.id] }]} />
            <Text style={type.metaStrong}>{`${SHORT[g.goal.id]} ${amount(g)}/${formatNumber(g.goal.target)}`}</Text>
          </View>
        ))}
      </View>
    ),
  },
  {
    group: "Goal status",
    form: "Icon tiles",
    name: "Goal tiles with the status word",
    Draw: ({ d }) => (
      <View style={styles.grid}>
        {d.goals.map((g) => (
          <Card key={g.goal.id} style={[styles.half, styles.pad]}>
            <View style={styles.between}>
              <GoalIcon id={g.goal.id} />
              <StatusWord level={levelOf(g)} word={levelOf(g) === "in" ? "Met" : levelOf(g) === "borderline" ? "Close" : "Short"} />
            </View>
            <Text style={type.label}>{GOAL_NAME[g.goal.id]}</Text>
            <Big value={amount(g)} unit={g.goal.unit} size={22} />
          </Card>
        ))}
      </View>
    ),
  },
  {
    group: "Goal status",
    form: "Meters",
    name: "Each goal as a meter to its target",
    Draw: ({ d }) => (
      <Card style={styles.pad}>
        {d.goals.map((g) => (
          <View key={g.goal.id} style={styles.stackSm}>
            <View style={styles.between}>
              <View style={styles.row}>
                <View style={[styles.dot, { backgroundColor: GOAL_HUE[g.goal.id] }]} />
                <Text style={type.title}>{GOAL_NAME[g.goal.id]}</Text>
              </View>
              <Text style={type.value}>
                {amount(g)}
                <Text style={type.unit}>{` / ${formatNumber(g.goal.target)} ${g.goal.unit}`}</Text>
              </Text>
            </View>
            <Meter share={shareOf(g)} hue={GOAL_HUE[g.goal.id]} />
          </View>
        ))}
      </Card>
    ),
  },
  {
    group: "Goal status",
    form: "Rings",
    name: "A ring per goal",
    Draw: ({ d }) => (
      <View style={styles.grid}>
        {d.goals.map((g) => (
          <Card key={g.goal.id} style={[styles.half, styles.padCenter]}>
            <Ring size={72} stroke={8} share={shareOf(g)} hue={GOAL_HUE[g.goal.id]}>
              <Text style={type.value}>{`${Math.round(shareOf(g) * 100)}%`}</Text>
            </Ring>
            <Text style={type.title}>{GOAL_NAME[g.goal.id]}</Text>
            <Text style={type.meta}>{`${amount(g)} of ${formatNumber(g.goal.target)} ${g.goal.unit}`}</Text>
          </Card>
        ))}
      </View>
    ),
  },
  {
    group: "Goal status",
    form: "Table",
    name: "Yesterday, average and target in a table",
    Draw: ({ d }) => (
      <Card style={styles.pad}>
        <View style={styles.tr}>
          <Text style={[type.metaStrong, styles.fill]}>Goal</Text>
          <Text style={[type.metaStrong, styles.td]}>Yesterday</Text>
          <Text style={[type.metaStrong, styles.td]}>Average</Text>
          <Text style={[type.metaStrong, styles.td]}>Target</Text>
        </View>
        {d.goals.map((g) => {
          const v = g.week.filter((w) => w.value !== undefined && !w.partial).map((w) => w.value!)
          const avg = v.length ? Math.round(v.reduce((a, x) => a + x, 0) / v.length) : undefined
          return (
            <View key={g.goal.id} style={[styles.tr, styles.trRule]}>
              <View style={[styles.row, styles.fill]}>
                <View style={[styles.dot, { backgroundColor: GOAL_HUE[g.goal.id] }]} />
                <Text style={type.label}>{SHORT[g.goal.id]}</Text>
              </View>
              <Text style={[type.value, styles.td]}>{amount(g)}</Text>
              <Text style={[type.label, styles.td]}>{avg !== undefined ? formatNumber(avg) : "No log"}</Text>
              <Text style={[type.label, styles.td]}>{formatNumber(g.goal.target)}</Text>
            </View>
          )
        })}
      </Card>
    ),
  },
  {
    group: "Goal status",
    form: "What is left",
    name: "Only the goals still to close, as amounts to go",
    Draw: ({ d }) => {
      const open = d.goals.filter((g) => g.state !== "met" && g.value !== undefined)
      return (
        <Card style={styles.pad}>
          <Text style={type.section}>{open.length ? `${open.length} goals to close` : "Every goal met"}</Text>
          {open.map((g) => (
            <View key={g.goal.id} style={styles.row}>
              <GoalIcon id={g.goal.id} size={28} />
              <Text style={[type.body, styles.fill]}>{GOAL_NAME[g.goal.id]}</Text>
              <Text style={type.value}>{`${formatNumber(g.goal.target - (g.value ?? 0))} ${g.goal.unit} to go`}</Text>
            </View>
          ))}
        </Card>
      )
    },
  },

  /* ===== this week ===== */
  {
    group: "This week",
    form: "Day dots",
    name: "Seven days, filled when the day was fully logged",
    Draw: ({ week }) => (
      <Card style={styles.pad}>
        <View style={styles.between}>
          {week.map((x) => {
            const full = x.status === "complete"
            return (
              <View key={x.day} style={styles.dayCol}>
                <View style={[styles.dayDot, { backgroundColor: full ? color.primary : x.status === "partial" ? TEAL_RAMP[1] : "#EEF1F4" }]}>
                  {full && <CheckCircle size={18} color={color.background} weight="fill" />}
                </View>
                <Text style={type.caption}>{weekday(x.date).slice(0, 1)}</Text>
              </View>
            )
          })}
        </View>
        <Text style={type.meta}>Filled: every meal logged. Pale: some meals logged.</Text>
      </Card>
    ),
  },
  {
    group: "This week",
    form: "Columns",
    name: "Daily score, Monday to Sunday",
    Draw: ({ week }) => (
      <Card style={styles.pad}>
        <WeekBars days={week.map((x) => ({ label: weekday(x.date), value: x.percent, partial: x.status === "partial" }))} goal={95} unit="%" name="Daily score" emptyWord="Nothing logged" playKey="d17" />
      </Card>
    ),
  },
  {
    group: "This week",
    form: "Heat strip",
    name: "Last 30 days, darker is a better day",
    Draw: ({ month }) => (
      <Card style={styles.pad}>
        <View style={styles.heat}>
          {month.map((x) => (
            <View key={x.day} style={[styles.heatCell, { backgroundColor: x.percent === undefined ? "#F2F2F0" : rampOf((x.percent - 70) / 30) }]} />
          ))}
        </View>
        <View style={styles.row}>
          <Text style={type.meta}>Lower</Text>
          {TEAL_RAMP.map((c) => (
            <View key={c} style={[styles.key, { backgroundColor: c }]} />
          ))}
          <Text style={type.meta}>Higher</Text>
          <View style={[styles.key, { backgroundColor: "#F2F2F0", marginLeft: space.inline }]} />
          <Text style={type.meta}>No log</Text>
        </View>
      </Card>
    ),
  },
  {
    group: "This week",
    form: "Heat grid",
    name: "Goals by day, darker is closer to the goal",
    Draw: ({ d }) => (
      <Card style={styles.pad}>
        <View style={styles.tr}>
          <View style={styles.rowHead} />
          {d.goals[0].week.map((w, i) => (
            <Text key={i} style={[type.caption, styles.cellHead]}>
              {w.label.slice(0, 1)}
            </Text>
          ))}
        </View>
        {d.goals.map((g) => (
          <View key={g.goal.id} style={styles.tr}>
            <Text style={[type.label, styles.rowHead]}>{SHORT[g.goal.id]}</Text>
            {g.week.map((w, i) => (
              <View key={i} style={[styles.cell, { backgroundColor: w.value === undefined ? "#F2F2F0" : rampOf(Math.min(w.value / g.goal.target, 1.1) - 0.1) }]} />
            ))}
          </View>
        ))}
      </Card>
    ),
  },
  {
    group: "This week",
    form: "Weekly total meter",
    name: "Calcium for the week, against seven days of the goal",
    Draw: ({ week }) => {
      const total = week.reduce((a, x) => a + (x.goals.find((y) => y.goal.id === "calcium")?.value ?? 0), 0)
      const target = 7000
      return (
        <Card style={styles.pad}>
          <View style={styles.between}>
            <Text style={type.title}>Calcium this week</Text>
            <StatusWord level={total >= target ? "in" : total >= target * 0.9 ? "borderline" : "out"} word={total >= target ? "On track" : `${formatNumber(target - total)} mg to go`} />
          </View>
          <Big value={formatNumber(total)} unit={`of ${formatNumber(target)} mg`} size={22} />
          <Meter share={total / target} hue={GOAL_HUE.calcium} h={10} />
          <Text style={type.meta}>Calcium balances over the week, so a low day can be made up.</Text>
        </Card>
      )
    },
  },
  {
    group: "This week",
    form: "Above or below the goal",
    name: "Deficit each day, above or below 300 kcal",
    Draw: ({ d }) => {
      const g = d.goals.find((x) => x.goal.id === "energy")
      if (!g) return null
      const vals = g.week.map((w) => (w.partial ? undefined : w.value))
      const span = Math.max(...vals.map((v) => Math.abs((v ?? g.goal.target) - g.goal.target)), 60)
      return (
        <Card style={styles.pad}>
          <View style={styles.diverge}>
            <View style={[styles.midline, { backgroundColor: DIVERGE.mid }]} />
            {vals.map((v, i) => {
              const diff = v !== undefined ? v - g.goal.target : 0
              const h = Math.max((Math.abs(diff) / span) * 40, 2)
              return (
                <View key={i} style={styles.divCol}>
                  {v !== undefined && <View style={[styles.divBar, { height: h, backgroundColor: diff >= 0 ? DIVERGE.above : DIVERGE.below }, diff >= 0 ? { bottom: 104 - 44 } : { top: 46 }]} />}
                  <Text style={[type.caption, styles.divLabel]}>{g.week[i].label.slice(0, 1)}</Text>
                </View>
              )
            })}
          </View>
          <View style={styles.row}>
            <View style={[styles.key, { backgroundColor: DIVERGE.above }]} />
            <Text style={type.meta}>Above goal</Text>
            <View style={[styles.key, { backgroundColor: DIVERGE.below, marginLeft: space.inline }]} />
            <Text style={type.meta}>Below goal</Text>
          </View>
        </Card>
      )
    },
  },
  {
    group: "This week",
    form: "Emphasis bars",
    name: "Protein: yesterday in colour, the week in grey",
    Draw: ({ d }) => {
      const g = d.goals.find((x) => x.goal.id === "protein")
      if (!g) return null
      const vals = g.week.map((w) => w.value ?? 0)
      const max = Math.max(...vals, g.goal.target) * 1.1
      const H = 100
      return (
        <Card style={styles.pad}>
          <View style={[styles.emph, { height: H }]}>
            <View style={[styles.goalRule, { bottom: (H * g.goal.target) / max }]} />
            {vals.map((v, i) => {
              const last = i === vals.length - 1
              return (
                <View key={i} style={styles.emphCol}>
                  {last && <Text style={type.metaStrong}>{`${v} g`}</Text>}
                  <View style={[styles.emphBar, { height: (H * v) / max, backgroundColor: last ? GOAL_HUE.protein : "#D9D8D3" }]} />
                </View>
              )
            })}
          </View>
          <View style={styles.emphLabels}>
            {g.week.map((w, i) => (
              <Text key={i} style={[type.caption, styles.emphLabel, i === g.week.length - 1 && { color: ink.strong, fontFamily: font.semibold }]}>
                {w.label.slice(0, 1)}
              </Text>
            ))}
          </View>
          <Text style={type.meta}>{`Line: your goal of ${g.goal.target} g`}</Text>
        </Card>
      )
    },
  },
  {
    group: "This week",
    form: "Small multiples",
    name: "Every goal's week, one small line each",
    Draw: ({ d }) => (
      <View style={styles.grid}>
        {d.goals.map((g) => (
          <Card key={g.goal.id} style={[styles.half, styles.pad]}>
            <Text style={type.label}>{GOAL_NAME[g.goal.id]}</Text>
            <Text style={type.value}>{`${amount(g)} ${g.goal.unit}`}</Text>
            <Spark values={g.week.map((w) => (w.partial ? undefined : w.value))} w={130} h={36} hue={GOAL_HUE[g.goal.id]} />
          </Card>
        ))}
      </View>
    ),
  },

  /* ===== energy ===== */
  {
    group: "Energy",
    form: "Equation",
    name: "Burned minus eaten, as a sum",
    Draw: ({ d }) => {
      const e = d.energy
      if (!e) return null
      const part = (v: number, k: string, strong?: boolean) => (
        <View style={styles.sumPart}>
          <Text style={strong ? type.hero : type.stat}>{formatNumber(v)}</Text>
          <Text style={type.caption}>{k}</Text>
        </View>
      )
      return (
        <Card style={[styles.pad, styles.sum]}>
          {part(e.resting, "Resting")}
          <Text style={type.section}>+</Text>
          {part(e.active, "Active")}
          <Text style={type.section}>−</Text>
          {part(e.food, "Food")}
          <Text style={type.section}>=</Text>
          {part(e.deficit, "Deficit", true)}
        </Card>
      )
    },
  },
  {
    group: "Energy",
    form: "Two KPIs",
    name: "Eaten and burned",
    Draw: ({ d }) => {
      const e = d.energy
      if (!e) return null
      return (
        <View style={styles.kpis}>
          <Card style={styles.kpi}>
            <View style={styles.row}>
              <BowlFood size={16} color={GOAL_HUE.protein} />
              <Text style={type.label}>Eaten</Text>
            </View>
            <Big value={formatNumber(e.food)} unit="kcal" size={22} />
          </Card>
          <Card style={styles.kpi}>
            <View style={styles.row}>
              <Flame size={16} color={GOAL_HUE.energy} />
              <Text style={type.label}>Burned</Text>
            </View>
            <Big value={formatNumber(e.out)} unit="kcal" size={22} />
          </Card>
        </View>
      )
    },
  },
  {
    group: "Energy",
    form: "Part to whole",
    name: "Where the burn came from, against what you ate",
    Draw: ({ d }) => {
      const e = d.energy
      if (!e) return null
      return (
        <Card style={styles.pad}>
          <Text style={type.label}>Burned</Text>
          <View style={styles.stackBar}>
            <View style={{ flex: e.resting, height: 16, backgroundColor: TEAL_RAMP[2] }} />
            <View style={{ flex: e.active, height: 16, backgroundColor: TEAL_RAMP[4] }} />
          </View>
          <Text style={type.label}>Eaten</Text>
          <View style={styles.stackBar}>
            <View style={{ flex: e.food, height: 16, backgroundColor: GOAL_HUE.protein }} />
            <View style={{ flex: Math.max(e.deficit, 0), height: 16 }} />
          </View>
          <View style={styles.wrap}>
            {[
              { c: TEAL_RAMP[2], t: `Resting ${formatNumber(e.resting)}` },
              { c: TEAL_RAMP[4], t: `Active ${formatNumber(e.active)}` },
              { c: GOAL_HUE.protein, t: `Food ${formatNumber(e.food)}` },
            ].map((x) => (
              <View key={x.t} style={styles.row}>
                <View style={[styles.key, { backgroundColor: x.c }]} />
                <Text style={type.meta}>{x.t}</Text>
              </View>
            ))}
          </View>
        </Card>
      )
    },
  },
  {
    group: "Energy",
    form: "Key and value rows",
    name: "Energy as a receipt",
    Draw: ({ d }) => {
      const e = d.energy
      if (!e) return null
      return (
        <Card style={styles.pad}>
          {[
            { k: "Resting burn (RMR)", v: formatNumber(e.resting) },
            { k: "Active energy, from your watch", v: `+${formatNumber(e.active)}` },
            { k: "Food, from your logs", v: `−${formatNumber(e.food)}` },
          ].map((x) => (
            <View key={x.k} style={styles.between}>
              <Text style={type.label}>{x.k}</Text>
              <Text style={type.value}>{x.v}</Text>
            </View>
          ))}
          <View style={[styles.between, styles.totalRule]}>
            <Text style={type.title}>Deficit</Text>
            <Text style={type.stat}>{`${formatNumber(e.deficit)} kcal`}</Text>
          </View>
        </Card>
      )
    },
  },

  /* ===== today ===== */
  {
    group: "Today",
    form: "Timeline",
    name: "Today's plan on a timeline",
    Draw: ({ t }) => (
      <Card style={styles.pad}>
        {t.actions.map((a, i) => {
          const Icon = TODAY_ICON[a.id]
          return (
            <View key={a.id} style={styles.timeRow}>
              <Text style={[type.meta, styles.time]}>{a.time}</Text>
              <View style={styles.rail}>
                <View style={[styles.railDot, a.status === "done" && { backgroundColor: color.primary, borderColor: color.primary }]} />
                {i < t.actions.length - 1 && <View style={styles.railLine} />}
              </View>
              <View style={[styles.row, styles.fill]}>
                <Icon size={16} color={ink.secondary} />
                <Text style={type.label}>{a.title}</Text>
              </View>
            </View>
          )
        })}
      </Card>
    ),
  },
  {
    group: "Today",
    form: "Next up",
    name: "The one thing to do next",
    Draw: ({ t }) => {
      const a = t.actions.find((x) => x.counts && x.status !== "done") ?? t.actions[0]
      const Icon = TODAY_ICON[a.id]
      return (
        <Card style={[styles.pad, styles.row]}>
          <View style={[styles.icon, { width: 44, height: 44, borderRadius: 22, backgroundColor: color.primaryTint }]}>
            <Icon size={22} color={color.primary} />
          </View>
          <View style={styles.fill}>
            <Text style={type.label}>Next</Text>
            <Text style={type.section}>{a.title}</Text>
            <View style={styles.row}>
              <Clock size={12} color={ink.tertiary} />
              <Text style={type.meta}>{a.time}</Text>
            </View>
          </View>
        </Card>
      )
    },
  },
  {
    group: "Today",
    form: "Segmented progress",
    name: "Today's tasks as segments",
    Draw: ({ t }) => {
      const counted = t.actions.filter((a) => a.counts)
      return (
        <Card style={styles.pad}>
          <View style={styles.between}>
            <Text style={type.title}>Today</Text>
            <Text style={type.metaStrong}>{t.words}</Text>
          </View>
          <View style={styles.segments}>
            {counted.map((a) => (
              <View key={a.id} style={[styles.segment, { backgroundColor: a.status === "done" ? color.primary : a.status === "progress" ? TEAL_RAMP[2] : "#EEF1F4" }]} />
            ))}
          </View>
          <View style={styles.between}>
            {counted.map((a) => (
              <Text key={a.id} style={[type.caption, styles.fill, styles.center]} numberOfLines={1}>
                {a.title.split(",")[0]}
              </Text>
            ))}
          </View>
        </Card>
      )
    },
  },
  {
    group: "Today",
    form: "Ring with three numbers",
    name: "Today at a glance",
    Draw: ({ t }) => (
      <Card style={[styles.pad, styles.row]}>
        <Ring size={84} stroke={10} share={t.share} hue={color.primary}>
          <Text style={type.value}>{`${Math.round(t.share * 100)}%`}</Text>
        </Ring>
        <View style={[styles.fill, styles.stackSm]}>
          {t.actions
            .filter((a) => a.counts)
            .slice(0, 3)
            .map((a) => (
              <View key={a.id} style={styles.between}>
                <Text style={type.label}>{a.title.split(",")[0]}</Text>
                <Text style={type.metaStrong}>{a.progress?.words ?? (a.status === "done" ? "Done" : "To do")}</Text>
              </View>
            ))}
        </View>
      </Card>
    ),
  },
  {
    group: "Today",
    form: "Insight",
    name: "The one fix, from yesterday",
    Draw: ({ d }) => (
      <View style={styles.insight}>
        <Lightbulb size={18} color={color.amber} />
        <Text style={[type.body, styles.fill]}>{d.insight}</Text>
      </View>
    ),
  },

  /* ===== body ===== */
  {
    group: "Body",
    form: "Hero number with context",
    name: "Weight lost since you started",
    Draw: ({ p }) => (
      <Card style={styles.pad}>
        <Text style={type.label}>{`Since ${p.start.label}`}</Text>
        <Big value={formatNumber(p.weight.start - p.weight.now, 1)} unit="lb lost" size={40} />
        <Text style={type.label}>{`${formatNumber(p.weight.now, 1)} lb now, ${formatNumber(Math.max(p.weight.now - p.weight.goal, 0), 1)} lb to your goal`}</Text>
      </Card>
    ),
  },
  {
    group: "Body",
    form: "Journey meter",
    name: "Start, now and goal on one line",
    Draw: ({ p }) => {
      const share = (p.weight.start - p.weight.now) / (p.weight.start - p.weight.goal)
      return (
        <Card style={styles.pad}>
          <Text style={type.title}>{`${Math.round(Math.min(share, 1) * 100)}% of the way to your goal`}</Text>
          <View style={styles.track}>
            <View style={[styles.trackFill, { width: `${Math.min(share, 1) * 100}%` }]} />
            <View style={[styles.trackNow, { left: `${Math.min(share, 1) * 100}%` }]} />
          </View>
          <View style={styles.between}>
            <Text style={type.meta}>{`${p.weight.start} lb`}</Text>
            <Text style={type.metaStrong}>{`${formatNumber(p.weight.now, 1)} lb`}</Text>
            <Text style={type.meta}>{`${p.weight.goal} lb`}</Text>
          </View>
        </Card>
      )
    },
  },
  {
    group: "Body",
    form: "Line with forecast",
    name: "Weight since the start, and where it is heading",
    Draw: ({ p, s }) =>
      s.memberFocus === "bone" ? null : (
        <Card style={styles.pad}>
          <ProgressChart {...progressChartOf(p)} compact playKey="d36" />
        </Card>
      ),
  },
  {
    group: "Body",
    form: "Before and after",
    name: "Body composition, first scan and latest",
    Draw: () => {
      const a = DEXA_SCANS[0]
      const b = DEXA_SCANS[DEXA_SCANS.length - 1]
      const rows = [
        { k: "Body fat", x: `${a.fatPct}%`, y: `${b.fatPct}%`, d: b.fatPct - a.fatPct, up: false },
        { k: "Fat mass", x: `${a.fatLb} lb`, y: `${b.fatLb} lb`, d: b.fatLb - a.fatLb, up: false },
        { k: "Lean mass", x: `${a.leanLb} lb`, y: `${b.leanLb} lb`, d: b.leanLb - a.leanLb, up: true },
      ]
      return (
        <Card style={styles.pad}>
          <View style={styles.tr}>
            <Text style={[type.metaStrong, styles.fill]} />
            <Text style={[type.metaStrong, styles.td]}>May</Text>
            <Text style={[type.metaStrong, styles.td]}>Sep</Text>
            <Text style={[type.metaStrong, styles.tdWide]}>Change</Text>
          </View>
          {rows.map((r) => (
            <View key={r.k} style={[styles.tr, styles.trRule]}>
              <Text style={[type.label, styles.fill]}>{r.k}</Text>
              <Text style={[type.label, styles.td]}>{r.x}</Text>
              <Text style={[type.value, styles.td]}>{r.y}</Text>
              <View style={styles.tdWide}>
                <Delta value={Math.round(r.d * 10) / 10} goodWhenUp={r.up} />
              </View>
            </View>
          ))}
        </Card>
      )
    },
  },
  {
    group: "Body",
    form: "Waffle",
    name: "Body fat as 100 squares",
    Draw: () => {
      const last = DEXA_SCANS[DEXA_SCANS.length - 1]
      const fat = Math.round(last.fatPct)
      return (
        <Card style={[styles.pad, styles.row]}>
          <View style={styles.waffle}>
            {Array.from({ length: 100 }, (_, i) => (
              <View key={i} style={[styles.waffleCell, { backgroundColor: i < fat ? GOAL_HUE.energy : TEAL_RAMP[1] }]} />
            ))}
          </View>
          <View style={[styles.fill, styles.stackSm]}>
            <Big value={`${last.fatPct}%`} size={24} />
            <Text style={type.label}>body fat</Text>
            <View style={styles.row}>
              <View style={[styles.key, { backgroundColor: GOAL_HUE.energy }]} />
              <Text style={type.meta}>Fat</Text>
            </View>
            <View style={styles.row}>
              <View style={[styles.key, { backgroundColor: TEAL_RAMP[1] }]} />
              <Text style={type.meta}>Everything else</Text>
            </View>
          </View>
        </Card>
      )
    },
  },
  {
    group: "Body",
    form: "Dumbbell",
    name: "Where each measure started and where it is now",
    Draw: ({ p }) => {
      const a = DEXA_SCANS[0]
      const b = DEXA_SCANS[DEXA_SCANS.length - 1]
      const rows = [
        { k: "Weight", from: p.weight.start, to: p.weight.now, unit: "lb" },
        { k: "Waist", from: p.waist.start, to: p.waist.now, unit: "in" },
        { k: "Body fat", from: a.fatPct, to: b.fatPct, unit: "%" },
      ]
      return (
        <Card style={styles.pad}>
          {rows.map((r) => {
            const lo = Math.min(r.from, r.to) * 0.97
            const hi = Math.max(r.from, r.to) * 1.01
            const x = (v: number) => `${((v - lo) / (hi - lo)) * 100}%` as const
            return (
              <View key={r.k} style={styles.stackSm}>
                <View style={styles.between}>
                  <Text style={type.title}>{r.k}</Text>
                  <Text style={type.label}>{`${formatNumber(r.from, 1)} to ${formatNumber(r.to, 1)} ${r.unit}`}</Text>
                </View>
                <View style={styles.dumb}>
                  <View style={[styles.dumbLine, { left: x(Math.min(r.from, r.to)), right: `${100 - ((Math.max(r.from, r.to) - lo) / (hi - lo)) * 100}%` }]} />
                  <View style={[styles.dumbStart, { left: x(r.from) }]} />
                  <View style={[styles.dumbEnd, { left: x(r.to) }]} />
                </View>
              </View>
            )
          })}
          <View style={styles.row}>
            <View style={styles.dumbStartKey} />
            <Text style={type.meta}>When you started</Text>
            <View style={[styles.key, { backgroundColor: color.primary, borderRadius: 5, marginLeft: space.inline }]} />
            <Text style={type.meta}>Now</Text>
          </View>
        </Card>
      )
    },
  },
  {
    group: "Body",
    form: "Milestones",
    name: "Milestones reached and coming",
    Draw: ({ p }) => {
      const lost = p.weight.start - p.weight.now
      const list = [
        { k: "First week logged", done: true },
        { k: "5 lb lost", done: lost >= 5 },
        { k: "10 lb lost", done: lost >= 10 },
        { k: "Goal weight", done: p.weight.now <= p.weight.goal },
      ]
      return (
        <View style={styles.grid}>
          {list.map((m) => (
            <Card key={m.k} style={[styles.half, styles.padCenter, !m.done && styles.locked]}>
              <View style={[styles.icon, { width: 44, height: 44, borderRadius: 22, backgroundColor: m.done ? tint(GOAL_HUE.energy) : "#F2F2F0" }]}>
                <Trophy size={22} color={m.done ? GOAL_HUE.energy : ink.tertiary} />
              </View>
              <Text style={type.title}>{m.k}</Text>
              <Text style={type.meta}>{m.done ? "Reached" : "Coming up"}</Text>
            </Card>
          ))}
        </View>
      )
    },
  },
  {
    group: "Body",
    form: "Stat tile with a sparkline",
    name: "Waist with its change",
    Draw: ({ p }) => (
      <Card style={[styles.pad, styles.row]}>
        <View style={styles.fill}>
          <Text style={type.label}>Waist</Text>
          <Big value={formatNumber(p.waist.now, 1)} unit="in" />
          <Delta value={p.waist.change} unit=" in" goodWhenUp={false} words="since you started" />
        </View>
        <Spark values={p.waist.series.map((m) => m.value)} w={110} h={44} hue={color.primary} />
      </Card>
    ),
  },

  /* ===== blood pressure ===== */
  {
    group: "Blood pressure",
    form: "Reading card",
    name: "Your home average, both numbers",
    Draw: ({ p }) => {
      const avg = p.pressure.average
      if (!avg) return null
      const level: Level = avg.value >= 130 || avg.value2 >= 80 ? "out" : avg.value >= 120 ? "borderline" : "in"
      return (
        <Card style={styles.pad}>
          <View style={styles.between}>
            <Text style={type.label}>{`Last ${avg.readings} evenings at home`}</Text>
            <Status level={level} tinted />
          </View>
          <View style={styles.bpRow}>
            <View>
              <Big value={avg.value} size={36} />
              <Text style={type.caption}>Top number</Text>
            </View>
            <Text style={styles.bpSlash}>/</Text>
            <View>
              <Big value={avg.value2} size={36} />
              <Text style={type.caption}>Bottom number</Text>
            </View>
            <Text style={[type.unitLarge, styles.bpUnit]}>mmHg</Text>
          </View>
          <Text style={type.meta}>{`Target below 120/80. When you started: ${p.pressure.start}.`}</Text>
        </Card>
      )
    },
  },
  {
    group: "Blood pressure",
    form: "Table",
    name: "The last five evenings",
    Draw: ({ p }) => {
      const list = pressureReadingsOf(p.pressure.series).slice(-5).reverse()
      return (
        <Card style={styles.pad}>
          {list.map((r) => {
            const level: Level = r.systolic >= 130 || r.diastolic >= 80 ? "out" : r.systolic >= 120 ? "borderline" : "in"
            return (
              <View key={String(r.date)} style={[styles.tr, styles.trRule]}>
                <Text style={[type.label, styles.fill]}>{label(new Date(`${String(r.date).slice(0, 10)}T12:00:00`))}</Text>
                <Text style={[type.value, styles.tdWide]}>{`${r.systolic}/${r.diastolic}`}</Text>
                <View style={styles.tdWide}>
                  <StatusWord level={level} word={level === "in" ? "In range" : level === "borderline" ? "Raised" : "High"} />
                </View>
              </View>
            )
          })}
        </Card>
      )
    },
  },

  /* ===== labs ===== */
  {
    group: "Lab results",
    form: "Before and after list",
    name: "The labs your plan works on, first and latest",
    Draw: ({ markers }) => (
      <Card style={styles.pad}>
        {["a1c", "ldl", "tg"]
          .map((id) => markers.find((m) => m.id === id))
          .filter((m): m is Biomarker => !!m && m.points.length > 1)
          .map((m) => {
            const t = classify(m)
            const first = m.points[0].value
            const last = m.points[m.points.length - 1].value
            return (
              <View key={m.id} style={[styles.tr, styles.trRule]}>
                <View style={styles.fill}>
                  <Text style={type.title}>{m.name}</Text>
                  <Text style={type.meta}>{`From ${formatNumber(first)} ${m.unit}`}</Text>
                </View>
                <Text style={[type.stat, styles.tdWide]}>{`${formatNumber(last)}`}</Text>
                <View style={styles.tdWide}>
                  <Status level={t.status} tinted />
                </View>
              </View>
            )
          })}
      </Card>
    ),
  },
  {
    group: "Lab results",
    form: "Range bar",
    name: "A1c against its range, and where it started",
    Draw: ({ markers }) => {
      const m = markers.find((x) => x.id === "a1c")
      if (!m || !m.points.length) return null
      const t = classify(m)
      return (
        <Card style={styles.pad}>
          <View style={styles.between}>
            <Text style={type.title}>{m.name}</Text>
            <Status level={t.status} tinted />
          </View>
          <RangeBar value={m.points[m.points.length - 1].value} high={m.high} start={m.points[0].value} status={t.status} unit={m.unit} range={m.target} playKey="d44" />
        </Card>
      )
    },
  },
  {
    group: "Lab results",
    form: "Counts",
    name: "Your record in three counts",
    Draw: ({ markers }) => {
      const c = { in: 0, borderline: 0, out: 0 }
      for (const t of markers.map(classify)) if (t.latest) c[t.status]++
      return (
        <View style={styles.kpis}>
          {(["in", "borderline", "out"] as Level[]).map((l) => (
            <Card key={l} style={styles.kpi}>
              <View style={styles.row}>
                {React.createElement(STATUS[l].Icon, { size: 14, color: STATUS[l].mark, weight: "fill" })}
                <Text style={type.label}>{l === "in" ? "In range" : l === "borderline" ? "Borderline" : "Out of range"}</Text>
              </View>
              <Text style={type.hero}>{c[l]}</Text>
            </Card>
          ))}
        </View>
      )
    },
  },
  {
    group: "Lab results",
    form: "Part to whole",
    name: "Your whole record in one bar",
    Draw: ({ markers }) => {
      const c = { in: 0, borderline: 0, out: 0 }
      for (const t of markers.map(classify)) if (t.latest) c[t.status]++
      return (
        <Card style={styles.pad}>
          <CompositionBar inRange={c.in} borderline={c.borderline} out={c.out} playKey="d47" />
        </Card>
      )
    },
  },

  /* ===== plan and what is next ===== */
  {
    group: "Plan and what is next",
    form: "Approval card",
    name: "Your plan, who approved it and when",
    Draw: ({ s }) => {
      const v = profileOf(s).versions[0]
      return (
        <Card style={styles.pad}>
          <View style={styles.row}>
            <View style={[styles.icon, { width: 40, height: 40, borderRadius: 20, backgroundColor: color.okTint }]}>
              <ShieldCheck size={20} color={chart.inRange} />
            </View>
            <View style={styles.fill}>
              <Text style={type.section}>{`Plan version ${v.version}`}</Text>
              <Text style={type.label}>{`Approved by ${v.by}, ${v.approved}`}</Text>
            </View>
          </View>
          <Text style={type.body}>{v.why}</Text>
        </Card>
      )
    },
  },
  {
    group: "Plan and what is next",
    form: "Date list",
    name: "What is coming up",
    Draw: ({ s }) => {
      const list = comingUp(s).slice(0, 3)
      if (!list.length) return null
      return (
        <Group>
          {list.map((i) => (
            <NeedsRow key={i.id} date={i.date} icon={i.date ? undefined : <CalendarCheck size={16} color={color.primary} />} title={i.title} meta={i.meta} tag={i.tag} chevron={false} />
          ))}
        </Group>
      )
    },
  },
  {
    group: "Plan and what is next",
    form: "Schedule",
    name: "Measurements and when they are next due",
    Draw: () => {
      const rows = [
        { k: "Weigh in", every: "Every Monday", next: "Mon, Oct 19", Icon: Scales },
        { k: "Waist", every: "Every 2 weeks", next: "Mon, Oct 26", Icon: PersonSimpleRun },
        { k: "Blood pressure", every: "Every evening", next: "Tonight", Icon: Heartbeat },
        { k: "DEXA scan", every: "Every 6 months", next: "Mar 2027", Icon: CalendarCheck },
      ]
      return (
        <Card style={styles.pad}>
          {rows.map((r) => (
            <View key={r.k} style={[styles.tr, styles.trRule]}>
              <r.Icon size={16} color={ink.secondary} />
              <View style={styles.fill}>
                <Text style={type.title}>{r.k}</Text>
                <Text style={type.meta}>{r.every}</Text>
              </View>
              <Tag tone="primary">{r.next}</Tag>
            </View>
          ))}
        </Card>
      )
    },
  },
  {
    group: "Plan and what is next",
    form: "Forecast",
    name: "Where your pace is heading, with how likely it is",
    Draw: ({ p }) => (
      <Card style={styles.pad}>
        <View style={styles.between}>
          <Text style={type.label}>If you keep this pace</Text>
          <Tag tone="muted">Estimate</Tag>
        </View>
        <Big value={`${p.weight.goal} lb`} unit="by late November" size={26} />
        <View style={styles.likely}>
          {Array.from({ length: 10 }, (_, i) => (
            <View key={i} style={[styles.likelyCell, { backgroundColor: i < 8 ? color.primary : TEAL_RAMP[0] }]} />
          ))}
        </View>
        <Text style={type.meta}>About 8 in 10 people with plans like yours got there. An estimate, not a guarantee.</Text>
      </Card>
    ),
  },
  {
    group: "Plan and what is next",
    form: "Plan focus",
    name: "What your plan works on",
    Draw: ({ d }) => (
      <Card style={styles.pad}>
        <Text style={type.section}>Your plan works on</Text>
        {d.goals.map((g) => (
          <View key={g.goal.id} style={styles.row}>
            <GoalIcon id={g.goal.id} size={28} />
            <Text style={[type.body, styles.fill]}>{GOAL_NAME[g.goal.id]}</Text>
            <Text style={type.label}>{g.goal.targetWords.replace("Goal: ", "")}</Text>
          </View>
        ))}
      </Card>
    ),
  },
]

/* --------------------------------------------------------------- page -- */

export function DataElementsGallery({ extra = [] }: { extra?: El[] } = {}) {
  const data = useData()
  const all = [...ELEMENTS, ...extra]
  let group = ""
  return (
    <View style={styles.page}>
      <Text style={type.label}>
        Colour carries one job each. Goal colours (identity): deficit orange, protein blue, calcium indigo, exercise aqua. Magnitude: teal, light to dark. Status: green, orange and red, always with an icon and a word.
      </Text>
      <View style={styles.item}>
        <Text style={styles.group}>Kept</Text>
        <View style={styles.itemHead}>
          <View style={[styles.num, styles.kept]}>
            <CheckCircle size={16} color={ink.onColor} weight="fill" />
          </View>
          <View style={styles.fill}>
            <Text style={type.title}>Yesterday's goals tiles, as on the member home</Text>
            <Text style={type.meta}>Approved, kept as it is</Text>
          </View>
        </View>
        <View style={styles.keptGrid}>
          {data.d.goals.map((g) => (
            <GoalTile key={g.goal.id} goal={g} />
          ))}
        </View>
      </View>
      {all.map((el, i) => {
        const head = el.group !== group
        group = el.group
        return (
          <View key={el.name} style={styles.item}>
            {head && <Text style={styles.group}>{el.group}</Text>}
            <View style={styles.itemHead}>
              <View style={styles.num}>
                <Text style={styles.numText}>{i + 1}</Text>
              </View>
              <View style={styles.fill}>
                <Text style={type.title}>{el.name}</Text>
                <Text style={type.meta}>{el.form}</Text>
              </View>
            </View>
            <el.Draw {...data} />
          </View>
        )
      })}
      <Text style={type.meta}>{`${all.length} elements. Pick by number.`}</Text>
    </View>
  )
}

/* ------------------------------------------------------------- styles -- */

const styles = StyleSheet.create({
  page: { gap: space.section, paddingBottom: space.section },
  item: { gap: space.inline },
  group: { ...type.section, color: ink.strong, marginTop: space.inline },
  itemHead: { flexDirection: "row", alignItems: "center", gap: space.inline },
  num: { width: 26, height: 26, borderRadius: 13, backgroundColor: color.primary, alignItems: "center", justifyContent: "center" },
  numText: { ...type.metaStrong, color: ink.onColor },
  kept: { backgroundColor: chart.inRange },
  keptGrid: { gap: space.item },

  fill: { flex: 1 },
  center: { textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: space.inline },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.inline },
  stackSm: { gap: space.stack },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.inline },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.item },
  half: { flexBasis: "47%", flexGrow: 1, maxWidth: "49%" },
  pad: { gap: space.item, padding: space.gutter },
  padCenter: { gap: space.stack, padding: space.gutter, alignItems: "center" },
  locked: { opacity: 0.7 },
  icon: { alignItems: "center", justifyContent: "center" },
  fillCenter: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  key: { width: 10, height: 10, borderRadius: 2 },

  big: { fontFamily: font.semibold, color: ink.strong },
  statusChip: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, paddingHorizontal: space.inline, paddingVertical: 3, alignSelf: "flex-start" },
  delta: { flexDirection: "row", alignItems: "center", gap: 4 },
  meter: { overflow: "hidden" },

  kpis: { flexDirection: "row", gap: space.inline },
  kpi: { flex: 1, gap: space.stack, padding: space.compact },
  compare: { flexDirection: "row", alignItems: "center" },
  compareCol: { flex: 1, gap: space.stack },
  vs: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#F2F2F0", alignItems: "center", justifyContent: "center", marginHorizontal: space.inline },
  sentence: { ...type.body, fontSize: 16, lineHeight: 26, color: ink.content },
  sentenceStrong: { fontFamily: font.semibold, color: ink.strong },

  badge: { flexDirection: "row", alignItems: "center", gap: space.mark, borderRadius: 999, paddingHorizontal: space.item, paddingVertical: space.mark },
  chip: { flexDirection: "row", alignItems: "center", gap: space.mark, borderRadius: 999, borderWidth: 1, borderColor: "#E5E5E5", backgroundColor: color.background, paddingHorizontal: space.item, paddingVertical: space.mark },

  tr: { flexDirection: "row", alignItems: "center", gap: space.inline, paddingVertical: space.stack },
  trRule: { borderTopWidth: 1, borderTopColor: "#F2F2F7", paddingTop: space.inline },
  td: { width: 64, textAlign: "right" },
  tdWide: { width: 84, alignItems: "flex-end", textAlign: "right" },
  totalRule: { borderTopWidth: 1, borderTopColor: "#E5E5E5", paddingTop: space.inline },

  dayCol: { alignItems: "center", gap: space.stack },
  dayDot: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  heat: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  heatCell: { width: 30, height: 30, borderRadius: 6 },
  rowHead: { width: 64 },
  cellHead: { flex: 1, textAlign: "center" },
  cell: { flex: 1, height: 24, borderRadius: 5 },

  diverge: { height: 104, flexDirection: "row", position: "relative" },
  midline: { position: "absolute", left: 0, right: 0, top: 44, height: 2 },
  divCol: { flex: 1, alignItems: "center", position: "relative" },
  divBar: { position: "absolute", width: 14, borderRadius: 4 },
  divLabel: { position: "absolute", bottom: 0 },

  emph: { flexDirection: "row", alignItems: "flex-end", gap: space.inline, position: "relative" },
  emphLabels: { flexDirection: "row", gap: space.inline },
  emphLabel: { flex: 1, textAlign: "center" },
  emphCol: { flex: 1, alignItems: "center", gap: 2 },
  emphBar: { width: "70%", borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  goalRule: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: ink.tertiary },

  sum: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sumPart: { alignItems: "center" },
  stackBar: { flexDirection: "row", gap: 2, borderRadius: 4, overflow: "hidden" },

  timeRow: { flexDirection: "row", alignItems: "flex-start", gap: space.inline, minHeight: 36 },
  time: { width: 62, paddingTop: 2 },
  rail: { alignItems: "center", width: 14 },
  railDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: "#C9CDD3", backgroundColor: color.background, marginTop: 4 },
  railLine: { width: 2, flex: 1, minHeight: 22, backgroundColor: "#E5E7EB", marginTop: 2 },
  segments: { flexDirection: "row", gap: 4 },
  segment: { flex: 1, height: 10, borderRadius: 5 },
  insight: { flexDirection: "row", gap: space.inline, padding: space.card, borderRadius: 8, backgroundColor: color.amberTint },

  track: { height: 10, borderRadius: 5, backgroundColor: TEAL_RAMP[0], position: "relative" },
  trackFill: { height: 10, borderRadius: 5, backgroundColor: color.primary },
  trackNow: { position: "absolute", top: -5, width: 20, height: 20, marginLeft: -10, borderRadius: 10, backgroundColor: color.background, borderWidth: 4, borderColor: color.primary },

  waffle: { width: 140, flexDirection: "row", flexWrap: "wrap", gap: 2 },
  waffleCell: { width: 12, height: 12, borderRadius: 2 },

  dumb: { height: 16, position: "relative", justifyContent: "center" },
  dumbLine: { position: "absolute", height: 2, backgroundColor: "#C9CDD3" },
  dumbStart: { position: "absolute", width: 14, height: 14, marginLeft: -7, borderRadius: 7, borderWidth: 2, borderColor: ink.tertiary, backgroundColor: color.background },
  dumbEnd: { position: "absolute", width: 14, height: 14, marginLeft: -7, borderRadius: 7, backgroundColor: color.primary },
  dumbStartKey: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: ink.tertiary },

  bpRow: { flexDirection: "row", alignItems: "flex-start", gap: space.inline },
  bpSlash: { ...type.display, color: ink.tertiary },
  bpUnit: { marginTop: 14 },

  likely: { flexDirection: "row", gap: 4 },
  likelyCell: { flex: 1, height: 12, borderRadius: 3 },
})
