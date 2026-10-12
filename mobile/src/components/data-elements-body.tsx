import * as React from "react"
import { StyleSheet, Text, View, type LayoutChangeEvent } from "react-native"
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Line,
  Path,
  Rect,
} from "react-native-svg"

import { RangeBar, formatNumber } from "@/components/charts"
import {
  Big,
  DIVERGE,
  Delta,
  StatusWord,
  TEAL_RAMP,
  label,
  rampOf,
  tint,
  type El,
} from "@/components/data-elements"
import {
  ArrowRight,
  CalendarCheck,
  Heartbeat,
  Ruler,
  Scales,
  TrendDown,
  TrendUp,
} from "@/components/ph"
import {
  Card,
  Dot,
  LEVEL_COLOR,
  LEVEL_TEXT,
  LEVEL_WORD,
  Status,
  Tag,
  type Level,
} from "@/components/record-kit"
import {
  BASELINE,
  BODY_GOALS,
  DEXA_SCANS,
  MEMBER,
  PLAN_START_RESULTS,
  dayFrom,
  pressureReadingsOf,
  sinceStart,
} from "@/lib/member"
import { BODY_SYSTEMS, PLACE_NAME, type Biomarker } from "@/lib/record"
import {
  byBodySystem,
  classify,
  directionWords,
  pointStatus,
  precisionOf,
  type Trend,
} from "@/lib/trends"
import { chart, color, font, hairline, ink, space, type } from "@/lib/theme"

/* Twenty five more ways to show the body, the vitals and the lab results
   (12 Oct 2026), on the same rules as data-elements.tsx: form first, colour
   by its job (magnitude teal light to dark, inside or outside a limit blue
   and red around a grey midline, status green, orange and red with a mark
   and a word), words in the text inks. */

/* ------------------------------------------------------------ helpers -- */

const LEVELS: Level[] = ["in", "borderline", "out"]
const ZONE_FILL: Record<Level | "none", string> = {
  in: chart.zoneIn,
  borderline: chart.zoneBorderline,
  out: chart.zoneOut,
  none: chart.track,
}
const fmt = (b: Biomarker, v: number) => formatNumber(v, precisionOf(b))
const one = (v: number) => formatNumber(Math.round(v * 10) / 10, 1)
const latestScan = () => DEXA_SCANS[DEXA_SCANS.length - 1]
const firstScan = () => DEXA_SCANS[0]
const scanDay = (at: string) => label(dayFrom(at))

/** Home blood pressure as the existing elements read it. */
const bpLevel = (s: number, d: number): Level =>
  s >= 130 || d >= 80 ? "out" : s >= 120 ? "borderline" : "in"

/** The estimate of BMI from a weight at her height. */
const bmiOf = (lb: number) => (703 * lb) / (MEMBER.heightIn * MEMBER.heightIn)

function useWidth(initial = 300) {
  const [width, setWidth] = React.useState(initial)
  const onLayout = React.useCallback(
    (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width)),
    []
  )
  return { width, onLayout }
}

/** The direction badge from the result page: a grey arrow, teal words. */
function DirectionPill({ t, words }: { t?: Trend; words?: string }) {
  const Arrow = t
    ? t.movement === "rising"
      ? TrendUp
      : t.movement === "falling"
        ? TrendDown
        : t.movement === "steady"
          ? ArrowRight
          : undefined
    : TrendDown
  return (
    <View style={styles.pill}>
      {Arrow && <Arrow size={12} color={color.primaryText} />}
      <Text style={styles.pillText}>
        {words ?? (t ? directionWords(t) : "")}
      </Text>
    </View>
  )
}

type Zone = { range: string; name?: string; to: number; level: Level | "none" }

/** A soft zone scale to scale: one segment per range, 2 apart with round
    ends, the value as a ring in its status colour, an optional hollow start
    mark, and each range's words under it, the one she is in bold. */
function ZoneScale({
  zones,
  lo,
  value,
  level,
  start,
}: {
  zones: Zone[]
  lo: number
  value: number
  level: Level
  start?: number
}) {
  const hi = zones[zones.length - 1].to
  const at = (v: number) =>
    `${Math.min(Math.max((v - lo) / (hi - lo), 0.02), 0.98) * 100}%` as const
  const here = zones.findIndex((z) => value < z.to)
  return (
    <View style={styles.zones}>
      <View style={styles.zoneTrack}>
        {zones.map((z, k) => {
          const from = k ? zones[k - 1].to : lo
          return (
            <View
              key={z.range}
              style={[
                styles.zoneFill,
                { flex: z.to - from, backgroundColor: ZONE_FILL[z.level] },
                k === 0 && styles.zoneStart,
                k === zones.length - 1 && styles.zoneEnd,
              ]}
            />
          )
        })}
        {start !== undefined && (
          <View style={[styles.zoneStartMark, { left: at(start) }]} />
        )}
        <View
          style={[
            styles.zoneMark,
            { left: at(value), borderColor: LEVEL_COLOR[level] },
          ]}
        />
      </View>
      <View style={styles.zoneNames}>
        {zones.map((z, k) => {
          const from = k ? zones[k - 1].to : lo
          return (
            <Text
              key={z.range}
              style={[
                styles.zoneName,
                {
                  flex: z.to - from,
                  textAlign:
                    k === 0
                      ? "left"
                      : k === zones.length - 1
                        ? "right"
                        : "center",
                },
                z.level !== "none" && { color: LEVEL_TEXT[z.level] },
                k === (here < 0 ? zones.length - 1 : here) && {
                  fontFamily: font.semibold,
                },
              ]}
            >
              {z.name ? `${z.name}\n${z.range}` : z.range}
            </Text>
          )
        })}
      </View>
    </View>
  )
}

/** A simple standing figure in a 90 by 180 box. */
function FigureShapes({ fill }: { fill: string }) {
  return (
    <G>
      <Circle cx={45} cy={16} r={13} fill={fill} />
      <Rect x={25} y={32} width={40} height={72} rx={16} fill={fill} />
      <Rect x={12} y={36} width={11} height={64} rx={5.5} fill={fill} />
      <Rect x={67} y={36} width={11} height={64} rx={5.5} fill={fill} />
      <Rect x={27} y={98} width={16} height={80} rx={8} fill={fill} />
      <Rect x={47} y={98} width={16} height={80} rx={8} fill={fill} />
    </G>
  )
}

/** The figure filled from the feet up to a share, with a goal line. */
function FilledFigure({
  id,
  share,
  goal,
  scale = 1,
}: {
  id: string
  share: number
  goal?: number
  scale?: number
}) {
  const top = 180 * (1 - share)
  return (
    <Svg width={90 * scale} height={180 * scale} viewBox="0 0 90 180">
      <Defs>
        <ClipPath id={id}>
          <Circle cx={45} cy={16} r={13} />
          <Rect x={25} y={32} width={40} height={72} rx={16} />
          <Rect x={12} y={36} width={11} height={64} rx={5.5} />
          <Rect x={67} y={36} width={11} height={64} rx={5.5} />
          <Rect x={27} y={98} width={16} height={80} rx={8} />
          <Rect x={47} y={98} width={16} height={80} rx={8} />
        </ClipPath>
      </Defs>
      <FigureShapes fill={TEAL_RAMP[0]} />
      <Rect
        x={0}
        y={top}
        width={90}
        height={180 - top}
        fill={TEAL_RAMP[3]}
        clipPath={`url(#${id})`}
      />
      {goal !== undefined && (
        <Line
          x1={4}
          x2={86}
          y1={180 * (1 - goal)}
          y2={180 * (1 - goal)}
          stroke={ink.secondary}
          strokeWidth={1}
          strokeDasharray="3 3"
        />
      )}
    </Svg>
  )
}

/** A marker's latest result the way its result page reads: the status and
    direction pills, the value in its status colour, one sentence. */
function Readout({
  b,
  t,
  children,
}: {
  b: Biomarker
  t: Trend
  children?: React.ReactNode
}) {
  const since = sinceStart(b)
  return (
    <Card style={styles.pad}>
      <View style={styles.between}>
        <Text style={type.title}>{b.name}</Text>
        <Text style={type.meta}>
          {t.latest ? `${t.latest.date}, ${PLACE_NAME[t.latest.origin]}` : ""}
        </Text>
      </View>
      <View style={styles.wrap}>
        <Status level={t.status} tinted />
        <DirectionPill t={t} />
      </View>
      <View style={styles.valueRow}>
        <Text style={[styles.readoutValue, { color: LEVEL_TEXT[t.status] }]}>
          {t.value}
        </Text>
        <Text style={type.unitLarge}>{b.unit}</Text>
      </View>
      <Text style={styles.takeaway}>
        {since
          ? `${t.takeaway.replace(/\.$/, "")}. ${since.words}.`
          : t.takeaway}
      </Text>
      {children}
    </Card>
  )
}

const legendKey = (fill: string, ring?: boolean) => (
  <View
    style={[
      styles.key,
      ring ? { borderWidth: 2, borderColor: fill } : { backgroundColor: fill },
    ]}
  />
)

/* ----------------------------------------------- components with hooks -- */

/** Where each body system's results sit, on a figure. */
function BodyMap({ markers }: { markers: Biomarker[] }) {
  const { width, onLayout } = useWidth()
  const groups = byBodySystem(markers)
  const worst = (list: Biomarker[]): Level => {
    const ls = list
      .map((m) => classify(m))
      .filter((t) => t.latest)
      .map((t) => t.status)
    return ls.includes("out")
      ? "out"
      : ls.includes("borderline")
        ? "borderline"
        : "in"
  }
  // Where each system points on the 90 by 180 figure, and which side its words sit.
  const SPOT: Record<string, { x: number; y: number; left: boolean }> = {
    Thyroid: { x: 45, y: 30, left: true },
    Cholesterol: { x: 52, y: 50, left: false },
    "Blood sugar": { x: 38, y: 74, left: true },
    "Kidney and liver": { x: 54, y: 80, left: false },
    "Blood pressure and weight": { x: 45, y: 96, left: true },
    "Blood count": { x: 72, y: 92, left: false },
    "Vitamins and minerals": { x: 35, y: 140, left: true },
  }
  const scale = 1
  const figW = 90 * scale
  const H = 180 * scale + 8
  const fx = (width - figW) / 2
  const rowsLeft = groups.filter((g) => SPOT[g.group]?.left)
  const rowsRight = groups.filter((g) => SPOT[g.group] && !SPOT[g.group].left)
  const yOf = (i: number, n: number) => 10 + (i * (H - 40)) / Math.max(n - 1, 1)
  const colW = fx - 6
  return (
    <View onLayout={onLayout} style={{ height: H }}>
      <Svg width={width} height={H} style={StyleSheet.absoluteFill}>
        <G transform={`translate(${fx} 4) scale(${scale})`}>
          <FigureShapes fill={chart.track} />
        </G>
        {[rowsLeft, rowsRight].map((list, side) =>
          list.map((g, i) => {
            const spot = SPOT[g.group]
            const px = fx + spot.x * scale
            const py = 4 + spot.y * scale
            const y = yOf(i, list.length) + 8
            const x = side === 0 ? colW : width - colW
            return (
              <G key={g.group}>
                <Line
                  x1={x}
                  y1={y}
                  x2={px}
                  y2={py}
                  stroke={chart.rule}
                  strokeWidth={1}
                />
                <Circle
                  cx={px}
                  cy={py}
                  r={5}
                  fill={LEVEL_COLOR[worst(g.markers)]}
                  stroke={color.background}
                  strokeWidth={2}
                />
              </G>
            )
          })
        )}
      </Svg>
      {[rowsLeft, rowsRight].map((list, side) =>
        list.map((g, i) => {
          const tr = g.markers.map(classify).filter((t) => t.latest)
          const inCount = tr.filter((t) => t.status === "in").length
          return (
            <View
              key={g.group}
              style={[
                styles.mapLabel,
                { top: yOf(i, list.length), width: colW - 4 },
                side === 0 ? { left: 0 } : { right: 0, alignItems: "flex-end" },
              ]}
            >
              <Text
                style={[type.metaStrong, side === 1 && styles.right]}
                numberOfLines={2}
              >
                {g.group}
              </Text>
              <Text
                style={[type.caption, side === 1 && styles.right]}
              >{`${inCount} of ${tr.length} in range`}</Text>
            </View>
          )
        })
      )}
    </View>
  )
}

/** The forecast's month as a calendar, the day circled. */
function ForecastCalendar({ date }: { date: Date }) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1)
  const days = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const cells: (number | undefined)[] = [
    ...Array.from({ length: first.getDay() }, () => undefined),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ]
  const near = (n: number) => Math.abs(n - date.getDate()) <= 4
  return (
    <View style={styles.stackSm}>
      <View style={styles.calRow}>
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <Text key={d} style={[type.caption, styles.calCell, styles.center]}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.calGrid}>
        {cells.map((n, i) => {
          const day = n === date.getDate()
          return (
            <View key={i} style={styles.calCell}>
              {n !== undefined && (
                <View
                  style={[
                    styles.calDay,
                    near(n) && { backgroundColor: TEAL_RAMP[0] },
                    day && { backgroundColor: color.primary },
                  ]}
                >
                  <Text
                    style={[type.metaStrong, day && { color: ink.onColor }]}
                  >
                    {n}
                  </Text>
                </View>
              )}
            </View>
          )
        })}
      </View>
    </View>
  )
}

/* --------------------------------------------------------- the twenty five -- */

export const ELEMENTS_BODY: El[] = [
  /* ===== weight and shape ===== */
  {
    group: "Weight and shape",
    form: "Result readout",
    name: "Weight read like a lab result, with its goal scale",
    Draw: ({ p }) => {
      const lost = p.weight.start - p.weight.now
      const pace = p.weight.forecast?.perWeek
      return (
        <Card style={styles.pad}>
          <View style={styles.between}>
            <Text style={type.title}>Weight</Text>
            <Text
              style={type.meta}
            >{`Weigh in, ${label(dayFrom(p.weight.latestAt.slice(0, 10)))}`}</Text>
          </View>
          <View style={styles.wrap}>
            <Tag tone="primary">{`Week ${p.week}`}</Tag>
            <DirectionPill
              words={lost > 0 ? "Trending down, toward your goal" : "Steady"}
            />
          </View>
          <View style={styles.valueRow}>
            <Text style={styles.readoutValue}>{one(p.weight.now)}</Text>
            <Text style={type.unitLarge}>lb</Text>
          </View>
          <Text style={styles.takeaway}>
            {`Down ${one(lost)} lb since ${p.start.label.replace(/, \d{4}$/, "")}${pace ? `, about ${formatNumber(pace, 1)} lb a week over the last 8 weeks` : ""}.`}
          </Text>
          <RangeBar
            value={p.weight.now}
            high={p.weight.goal}
            start={p.weight.start}
            status="neutral"
            unit=" lb"
            zoneLabel="Goal"
            range={`${p.weight.goal} lb or less`}
            playKey="b1"
          />
        </Card>
      )
    },
  },
  {
    group: "Weight and shape",
    form: "Pound blocks",
    name: "Every pound between the start and the goal, one block each",
    Draw: ({ p }) => {
      const total = Math.round(p.weight.start - p.weight.goal)
      const lost = Math.min(Math.floor(p.weight.start - p.weight.now), total)
      return (
        <Card style={styles.pad}>
          <View style={styles.between}>
            <Big value={`${lost} of ${total}`} unit="lb" />
            <Text style={type.label}>{`${total - lost} to go`}</Text>
          </View>
          <View style={styles.blocks}>
            {Array.from({ length: total }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.block,
                  i < lost
                    ? { backgroundColor: color.primary }
                    : styles.blockOpen,
                ]}
              >
                <Text
                  style={[type.caption, i < lost && { color: ink.onColor }]}
                >
                  {p.weight.start - i - 1}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.row}>
            {legendKey(color.primary)}
            <Text style={type.meta}>Lost</Text>
            <View style={[styles.key, styles.blockOpen, styles.keyGap]} />
            <Text style={type.meta}>Still to go</Text>
          </View>
        </Card>
      )
    },
  },
  {
    group: "Weight and shape",
    form: "Calendar estimate",
    name: "The month you may reach your goal weight",
    Draw: ({ p }) => {
      const f = p.weight.forecast
      if (!f)
        return (
          <Card style={styles.pad}>
            <Text style={type.title}>{p.weight.note ?? "No forecast yet"}</Text>
          </Card>
        )
      return (
        <Card style={styles.pad}>
          <View style={styles.between}>
            <View style={styles.row}>
              <CalendarCheck size={18} color={color.primary} />
              <Text style={type.section}>
                {f.date.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            </View>
            <Tag tone="muted">Estimate</Tag>
          </View>
          <ForecastCalendar date={f.date} />
          <Text
            style={type.meta}
          >{`${f.label}, at about ${formatNumber(f.perWeek, 1)} lb a week. The shaded days show the likely spread. An estimate, not a guarantee.`}</Text>
        </Card>
      )
    },
  },
  {
    group: "Weight and shape",
    form: "Tape measure",
    name: "Waist on a tape, from where it started to below 35 in",
    Draw: ({ p }) => {
      const lo = 34
      const hi = 39
      const x = (v: number) => `${((v - lo) / (hi - lo)) * 100}%` as const
      const ticks = Array.from(
        { length: (hi - lo) * 4 + 1 },
        (_, i) => lo + i / 4
      )
      return (
        <Card style={styles.pad}>
          <View style={styles.between}>
            <View style={styles.row}>
              <Ruler size={18} color={ink.secondary} />
              <Text style={type.title}>Waist</Text>
            </View>
            <Big value={one(p.waist.now)} unit="in" size={22} />
          </View>
          <View style={styles.tape}>
            <View
              style={[
                styles.tapeGoal,
                { left: 0, width: x(BODY_GOALS.waistIn.high) },
              ]}
            />
            {ticks.map((v) => (
              <View
                key={v}
                style={[
                  styles.tick,
                  {
                    left: x(v),
                    height: Number.isInteger(v) ? 18 : v % 0.5 === 0 ? 12 : 7,
                  },
                ]}
              />
            ))}
            <View style={[styles.tapeStart, { left: x(p.waist.start) }]} />
            <View style={[styles.tapeNow, { left: x(p.waist.now) }]} />
          </View>
          <View style={styles.tapeNums}>
            {ticks
              .filter((v) => Number.isInteger(v))
              .map((v) => (
                <Text
                  key={v}
                  style={[type.axis, styles.tapeNum, { left: x(v) }]}
                >
                  {v}
                </Text>
              ))}
          </View>
          <View style={styles.wrap}>
            <View style={styles.row}>
              <View
                style={[styles.key, { backgroundColor: chart.targetZone }]}
              />
              <Text style={type.meta}>{BODY_GOALS.waistIn.words}</Text>
            </View>
            <View style={styles.row}>
              <View style={styles.ringKey} />
              <Text style={type.meta}>{`Start, ${p.waist.start} in`}</Text>
            </View>
            <View style={styles.row}>
              <View style={[styles.key, styles.dotKey]} />
              <Text style={type.meta}>Now</Text>
            </View>
          </View>
          <Text
            style={styles.takeaway}
          >{`${one(Math.abs(p.waist.change))} in smaller since May, ${one(p.waist.now - BODY_GOALS.waistIn.high)} in from your goal.`}</Text>
        </Card>
      )
    },
  },
  {
    group: "Weight and shape",
    form: "Ranked bars",
    name: "Each month's weight change, the biggest drop first",
    Draw: ({ p }) => {
      const months = new Map<string, number[]>()
      for (const m of p.weight.series) {
        const k = m.at.slice(0, 7)
        months.set(k, [...(months.get(k) ?? []), m.value])
      }
      const keys = [...months.keys()]
      const rows = keys
        .map((k, i) => {
          const list = months.get(k)!
          const end =
            i < keys.length - 1
              ? months.get(keys[i + 1])![0]
              : list[list.length - 1]
          return {
            k,
            lost: Math.round((list[0] - end) * 10) / 10,
            partial: i === keys.length - 1,
          }
        })
        .sort((a, b) => b.lost - a.lost)
      const max = Math.max(...rows.map((r) => r.lost), 0.1)
      return (
        <Card style={styles.pad}>
          {rows.map((r, i) => (
            <View key={r.k} style={styles.rankRow}>
              <Text style={[type.metaStrong, styles.rankNum]}>{i + 1}</Text>
              <Text style={[type.label, styles.rankName]}>
                {`${dayFrom(`${r.k}-01`).toLocaleDateString("en-US", { month: "long" })}${r.partial ? " so far" : ""}`}
              </Text>
              <View style={styles.fill}>
                <View
                  style={[
                    styles.rankBar,
                    {
                      width: `${Math.max(r.lost / max, 0.02) * 100}%`,
                      backgroundColor: rampOf(0.3 + 0.7 * (r.lost / max)),
                    },
                  ]}
                />
              </View>
              <Text style={[type.value, styles.rankVal]}>
                {r.lost > 0 ? `${formatNumber(r.lost, 1)} lb` : "No drop"}
              </Text>
            </View>
          ))}
          <Text style={type.meta}>
            {
              "Darker is a bigger drop. Each month runs from its first weigh in to the next month's first."
            }
          </Text>
        </Card>
      )
    },
  },
  {
    group: "Weight and shape",
    form: "Zone scale with two marks",
    name: "BMI from your latest weigh in, against its ranges",
    Draw: ({ p }) => {
      const now = bmiOf(p.weight.now)
      const start = PLAN_START_RESULTS.bmi?.value ?? bmiOf(BASELINE.weight)
      const level: Level =
        now >= 25
          ? "out"
          : now < 18.5
            ? "out"
            : now > 24.4
              ? "borderline"
              : "in"
      return (
        <Card style={styles.pad}>
          <View style={styles.between}>
            <Text style={type.title}>Body mass index</Text>
            <Tag tone="muted">Estimate</Tag>
          </View>
          <View style={styles.wrap}>
            <Status level={level} tinted />
            <DirectionPill words="Trending down, improving" />
          </View>
          <View style={styles.valueRow}>
            <Text style={[styles.readoutValue, { color: LEVEL_TEXT[level] }]}>
              {one(now)}
            </Text>
            <Text style={type.unitLarge}>kg/m²</Text>
          </View>
          <ZoneScale
            lo={16}
            value={now}
            start={start}
            level={level}
            zones={[
              { range: "Below 18.5", to: 18.5, level: "borderline" },
              { range: "18.5 to 24.9", to: 25, level: "in" },
              { range: "25 to 29.9", to: 30, level: "borderline" },
              { range: "30 and up", to: 36, level: "out" },
            ]}
          />
          <Text
            style={type.meta}
          >{`Worked out from ${one(p.weight.now)} lb at your height, down from ${one(start)} in May. BMI is a rough guide: your waist and body makeup say more.`}</Text>
        </Card>
      )
    },
  },

  /* ===== body composition ===== */
  {
    group: "Body composition",
    form: "Body silhouettes",
    name: "Body fat as a fill level, first scan and latest",
    Draw: () => {
      const scans = [firstScan(), latestScan()]
      return (
        <Card style={styles.pad}>
          <View style={styles.figures}>
            {scans.map((s, i) => (
              <View key={s.at} style={styles.figureCol}>
                <FilledFigure
                  id={`fat-fill-${i}`}
                  share={s.fatPct / 100}
                  goal={BODY_GOALS.fatPct.high / 100}
                />
                <Big value={`${s.fatPct}%`} size={22} />
                <Text style={type.label}>{`DEXA, ${scanDay(s.at)}`}</Text>
              </View>
            ))}
          </View>
          <View style={styles.wrap}>
            <View style={styles.row}>
              {legendKey(TEAL_RAMP[3])}
              <Text style={type.meta}>Body fat share</Text>
            </View>
            <View style={styles.row}>
              <View style={styles.dashKey} />
              <Text
                style={type.meta}
              >{`Top of your goal, ${BODY_GOALS.fatPct.high}%`}</Text>
            </View>
          </View>
        </Card>
      )
    },
  },
  {
    group: "Body composition",
    form: "Stacked columns to scale",
    name: "Fat and lean pounds at each scan, so the drop shows where it came from",
    Draw: () => {
      const scans = [firstScan(), latestScan()]
      const H = 170
      const max = Math.max(...scans.map((s) => s.weightLb))
      return (
        <Card style={styles.pad}>
          <View style={styles.columns}>
            {scans.map((s) => (
              <View key={s.at} style={styles.colWrap}>
                <Text style={type.value}>{`${s.weightLb} lb`}</Text>
                <View
                  style={{ height: (s.weightLb / max) * H, width: 64, gap: 2 }}
                >
                  <View
                    style={[
                      styles.colTop,
                      { flex: s.fatLb, backgroundColor: TEAL_RAMP[2] },
                    ]}
                  >
                    <Text style={type.metaStrong}>{`${s.fatLb}`}</Text>
                  </View>
                  <View
                    style={[
                      styles.colBottom,
                      { flex: s.leanLb, backgroundColor: TEAL_RAMP[4] },
                    ]}
                  >
                    <Text
                      style={[type.metaStrong, { color: ink.onColor }]}
                    >{`${s.leanLb}`}</Text>
                  </View>
                </View>
                <Text style={type.label}>{scanDay(s.at)}</Text>
              </View>
            ))}
          </View>
          <View style={styles.row}>
            {legendKey(TEAL_RAMP[2])}
            <Text style={type.meta}>Fat, lb</Text>
            <View
              style={[
                styles.key,
                styles.keyGap,
                { backgroundColor: TEAL_RAMP[4] },
              ]}
            />
            <Text style={type.meta}>Lean, lb</Text>
          </View>
          <Text
            style={styles.takeaway}
          >{`The fat column shrank by ${one(firstScan().fatLb - latestScan().fatLb)} lb. The lean column held steady.`}</Text>
        </Card>
      )
    },
  },
  {
    group: "Body composition",
    form: "Zone scale with a goal band",
    name: "Body fat against your goal band of 30 to 35%",
    Draw: () => {
      const a = firstScan()
      const b = latestScan()
      const g = BODY_GOALS.fatPct
      const level: Level =
        b.fatPct <= g.high && b.fatPct >= g.low
          ? "in"
          : b.fatPct - g.high <= 2
            ? "borderline"
            : "out"
      return (
        <Card style={styles.pad}>
          <View style={styles.between}>
            <Text style={type.title}>Body fat</Text>
            <StatusWord
              level={level}
              word={
                level === "in" ? "In your goal band" : "Above your goal band"
              }
            />
          </View>
          <View style={styles.valueRow}>
            <Text
              style={[styles.readoutValue, { color: LEVEL_TEXT[level] }]}
            >{`${b.fatPct}%`}</Text>
            <Text style={type.label}>{`DEXA, ${scanDay(b.at)}`}</Text>
          </View>
          <ZoneScale
            lo={24}
            value={b.fatPct}
            start={a.fatPct}
            level={level}
            zones={[
              { range: "Below 30%", to: g.low, level: "none" },
              { name: "Goal", range: g.words, to: g.high, level: "in" },
              { range: "35 to 40%", to: 40, level: "borderline" },
              { range: "40% and up", to: 46, level: "out" },
            ]}
          />
          <Text
            style={styles.takeaway}
          >{`Down ${one(a.fatPct - b.fatPct)} points since your first scan, ${one(b.fatPct - g.high)} points from the top of your goal band.`}</Text>
        </Card>
      )
    },
  },
  {
    group: "Body composition",
    form: "Breakdown sum",
    name: "The weight lost between scans, split into fat and lean",
    Draw: () => {
      const a = firstScan()
      const b = latestScan()
      const total = a.weightLb - b.weightLb
      const fat = a.fatLb - b.fatLb
      const lean = b.leanLb - a.leanLb
      return (
        <Card style={styles.pad}>
          <Text
            style={type.label}
          >{`Between your scans, ${scanDay(a.at)} and ${scanDay(b.at)}`}</Text>
          <View style={styles.sum}>
            <View style={styles.sumPart}>
              <Big value={one(total)} unit="lb" size={26} />
              <Text style={type.label}>lighter</Text>
            </View>
            <Text style={styles.op}>=</Text>
            <View style={styles.sumPart}>
              <Big value={one(fat)} unit="lb" size={26} />
              <Text style={type.label}>fat lost</Text>
            </View>
            <Text style={styles.op}>−</Text>
            <View style={styles.sumPart}>
              <Big value={one(lean)} unit="lb" size={26} />
              <Text style={type.label}>lean gained</Text>
            </View>
          </View>
          <View style={styles.splitBar}>
            <View
              style={[
                styles.splitPart,
                styles.splitStart,
                { flex: fat, backgroundColor: TEAL_RAMP[4] },
              ]}
            />
            <View
              style={[
                styles.splitPart,
                styles.splitEnd,
                { flex: Math.max(lean, 0.3), backgroundColor: TEAL_RAMP[1] },
              ]}
            />
          </View>
          <Text style={styles.takeaway}>
            All of the drop, and a little more, was fat. Muscle and bone held
            their ground.
          </Text>
        </Card>
      )
    },
  },
  {
    group: "Body composition",
    form: "Goal cards with distance to go",
    name: "Your three body goals and how far each one is",
    Draw: ({ p }) => {
      const b = latestScan()
      const g = BODY_GOALS
      const rows = [
        {
          k: "Body fat",
          now: `${b.fatPct}%`,
          goal: g.fatPct.words,
          gap: b.fatPct - g.fatPct.high,
          unit: "points",
          Icon: Scales,
        },
        {
          k: "Lean mass",
          now: `${b.leanLb} lb`,
          goal: g.leanLb.words,
          gap: g.leanLb.low - b.leanLb,
          unit: "lb",
          Icon: Heartbeat,
        },
        {
          k: "Waist",
          now: `${one(p.waist.now)} in`,
          goal: g.waistIn.words,
          gap: p.waist.now - g.waistIn.high + 0.01,
          unit: "in",
          Icon: Ruler,
        },
      ]
      return (
        <View style={styles.stackItem}>
          {rows.map((r) => {
            const level: Level =
              r.gap <= 0 ? "in" : r.gap <= 1.5 ? "borderline" : "out"
            return (
              <Card key={r.k} style={[styles.pad, styles.row]}>
                <View
                  style={[
                    styles.iconTile,
                    { backgroundColor: color.primaryTint },
                  ]}
                >
                  <r.Icon size={18} color={color.primary} />
                </View>
                <View style={styles.fill}>
                  <Text style={type.title}>{r.k}</Text>
                  <Text style={type.label}>{`Goal: ${r.goal}`}</Text>
                </View>
                <View style={styles.endCol}>
                  <Text style={type.stat}>{r.now}</Text>
                  <StatusWord
                    level={level}
                    word={
                      r.gap <= 0
                        ? "Goal met"
                        : `${one(Math.max(r.gap, 0.1))} ${r.unit} to go`
                    }
                  />
                </View>
              </Card>
            )
          })}
        </View>
      )
    },
  },

  /* ===== vitals ===== */
  {
    group: "Vitals",
    form: "Thermometers",
    name: "Top and bottom number side by side, each against its limit",
    Draw: ({ p, markers }) => {
      const avg = p.pressure.average
      const bp = markers.find((m) => m.id === "bp")
      if (!avg || !bp) return null
      const lo = 60
      const hi = 160
      const H = 150
      const parts = [
        {
          k: "Top number",
          v: avg.value,
          limit: bp.high ?? 120,
          level: pointStatus({ ...bp, high2: undefined }, { value: avg.value }),
        },
        {
          k: "Bottom number",
          v: avg.value2,
          limit: bp.high2 ?? 80,
          level: pointStatus(
            { ...bp, low: undefined, high: bp.high2, high2: undefined },
            { value: avg.value2 }
          ),
        },
      ]
      return (
        <Card style={styles.pad}>
          <Text
            style={type.label}
          >{`Average of your last ${avg.readings} evenings at home`}</Text>
          <View style={styles.thermos}>
            {parts.map((x) => (
              <View key={x.k} style={styles.thermoCol}>
                <View style={[styles.tube, { height: H }]}>
                  <View
                    style={[
                      styles.tubeFill,
                      { height: ((x.v - lo) / (hi - lo)) * H },
                    ]}
                  />
                  <View
                    style={[
                      styles.limit,
                      { bottom: ((x.limit - lo) / (hi - lo)) * H },
                    ]}
                  />
                  <Text
                    style={[
                      type.caption,
                      styles.limitText,
                      { bottom: ((x.limit - lo) / (hi - lo)) * H - 7 },
                    ]}
                  >{`Limit ${x.limit}`}</Text>
                </View>
                <View style={styles.bulb} />
                <Big value={x.v} unit="mmHg" size={24} />
                <Text style={type.label}>{x.k}</Text>
                <StatusWord level={x.level} word={LEVEL_WORD[x.level]} />
              </View>
            ))}
          </View>
        </Card>
      )
    },
  },
  {
    group: "Vitals",
    form: "Band counts",
    name: "Your last 30 evenings sorted into the blood pressure bands",
    Draw: ({ p }) => {
      const list = pressureReadingsOf(p.pressure.series).slice(-30)
      const bands = [
        {
          k: "Below 120/80",
          level: "in" as Level,
          test: (s: number, d: number) => s < 120 && d < 80,
        },
        {
          k: "120 to 129, bottom below 80",
          level: "borderline" as Level,
          test: (s: number, d: number) => s >= 120 && s < 130 && d < 80,
        },
        {
          k: "130 to 139, or bottom 80 to 89",
          level: "out" as Level,
          test: (s: number, d: number) =>
            (s >= 130 && s < 140 && d < 90) || (s < 140 && d >= 80 && d < 90),
        },
        {
          k: "140 and up, or bottom 90 and up",
          level: "out" as Level,
          test: (s: number, d: number) => s >= 140 || d >= 90,
        },
      ]
      const counts = bands.map(
        (b) => list.filter((r) => b.test(r.systolic, r.diastolic)).length
      )
      return (
        <Card style={styles.pad}>
          {bands.map((b, i) => (
            <View key={b.k} style={styles.bandRow}>
              <Dot level={b.level} />
              <Text style={[type.label, styles.fill]}>{b.k}</Text>
              <View style={styles.bandMeter}>
                <View
                  style={[
                    styles.bandFill,
                    {
                      width: `${(counts[i] / Math.max(list.length, 1)) * 100}%`,
                      backgroundColor: rampOf(
                        0.2 + 0.8 * (counts[i] / Math.max(...counts, 1))
                      ),
                    },
                  ]}
                />
              </View>
              <Text style={[type.value, styles.count]}>{counts[i]}</Text>
            </View>
          ))}
          <Text
            style={type.meta}
          >{`${list.length} evenings. Darker bars hold more evenings; the dot shows each band's status.`}</Text>
        </Card>
      )
    },
  },
  {
    group: "Vitals",
    form: "Calendar of status dots",
    name: "Every evening's reading in the last four weeks",
    Draw: ({ p }) => {
      const list = pressureReadingsOf(p.pressure.series).slice(-28)
      if (!list.length) return null
      const first = dayFrom(String(list[0].date).slice(0, 10))
      const lead = first.getDay()
      const levels = list.map((r) => bpLevel(r.systolic, r.diastolic))
      const counts = LEVELS.map((l) => levels.filter((x) => x === l).length)
      return (
        <Card style={styles.pad}>
          <View style={styles.calRow}>
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <Text
                key={d}
                style={[type.caption, styles.calCell, styles.center]}
              >
                {d}
              </Text>
            ))}
          </View>
          <View style={styles.calGrid}>
            {Array.from({ length: lead }, (_, i) => (
              <View key={`x${i}`} style={styles.calCell} />
            ))}
            {list.map((r, i) => (
              <View
                key={String(r.date)}
                style={[styles.calCell, styles.dotCell]}
              >
                <Dot level={levels[i]} size={14} />
                <Text style={type.caption}>
                  {dayFrom(String(r.date).slice(0, 10)).getDate()}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.wrap}>
            {LEVELS.map((l, i) => (
              <View key={l} style={styles.row}>
                <Dot level={l} />
                <Text
                  style={type.meta}
                >{`${counts[i]} ${l === "in" ? "below 120/80" : l === "borderline" ? "top 120 to 129" : "at or over a limit"}`}</Text>
              </View>
            ))}
          </View>
        </Card>
      )
    },
  },
  {
    group: "Vitals",
    form: "Two sources compared",
    name: "Home evenings against your last clinic reading",
    Draw: ({ p, markers }) => {
      const bp = markers.find((m) => m.id === "bp")
      const avg = p.pressure.average
      if (!bp || !avg) return null
      const t = classify(bp)
      const home = bpLevel(avg.value, avg.value2)
      return (
        <Card style={styles.pad}>
          <View style={styles.compare}>
            <View style={styles.compareCol}>
              <Text style={type.label}>At home</Text>
              <Big value={`${avg.value}/${avg.value2}`} size={24} />
              <Text
                style={type.meta}
              >{`Average, last ${avg.readings} evenings`}</Text>
              <Status level={home} tinted />
            </View>
            <View style={styles.divider} />
            <View style={styles.compareCol}>
              <Text style={type.label}>At the clinic</Text>
              <Big value={t.value} size={24} />
              <Text style={type.meta}>
                {t.latest
                  ? `${t.latest.date}, ${PLACE_NAME[t.latest.origin]}`
                  : ""}
              </Text>
              <Status level={t.status} tinted />
            </View>
          </View>
          <Text
            style={styles.takeaway}
          >{`Your home readings are ${avg.value < (t.latest?.value ?? 0) ? "lower than" : "close to"} the clinic's. Dr. Patel can tell you which to go by.`}</Text>
        </Card>
      )
    },
  },

  /* ===== lab results ===== */
  {
    group: "Lab results",
    form: "Result readout with clinical ranges",
    name: "A1c as its result page shows it",
    Draw: ({ markers }) => {
      const b = markers.find((m) => m.id === "a1c")
      if (!b?.zones) return null
      const t = classify(b)
      if (!t.latest) return null
      const z = b.zones
      return (
        <Readout b={b} t={t}>
          <ZoneScale
            lo={5}
            value={t.latest.value}
            start={PLAN_START_RESULTS.a1c?.value}
            level={t.status}
            zones={[
              {
                name: z[0].name,
                range: z[0].range,
                to: z[0].below ?? 5.7,
                level: "in",
              },
              {
                name: z[1].name,
                range: z[1].range,
                to: z[1].below ?? 6.5,
                level: "borderline",
              },
              { name: z[2].name, range: z[2].range, to: 7.3, level: "out" },
            ]}
          />
        </Readout>
      )
    },
  },
  {
    group: "Lab results",
    form: "Dumbbell to the limit",
    name: "The three labs your plan works on, from its start to now, against each limit",
    Draw: ({ markers }) => (
      <Card style={styles.pad}>
        {["a1c", "ldl", "tg"].map((id) => {
          const b = markers.find((m) => m.id === id)
          const start = PLAN_START_RESULTS[id]
          if (!b || !start || b.high === undefined) return null
          const t = classify(b)
          if (!t.latest) return null
          const now = t.latest.value
          const lo = Math.min(b.high, now, start.value) * 0.94
          const hi = Math.max(b.high, now, start.value) * 1.03
          const x = (v: number) => `${((v - lo) / (hi - lo)) * 100}%` as const
          return (
            <View key={id} style={styles.stackSm}>
              <View style={styles.between}>
                <Text style={type.title}>
                  {b.short
                    ? b.short.charAt(0).toUpperCase() + b.short.slice(1)
                    : b.name}
                </Text>
                <Text style={type.label}>
                  {`${fmt(b, start.value)} to `}
                  <Text style={type.value}>{fmt(b, now)}</Text>
                  {` ${b.unit}`}
                </Text>
              </View>
              <View style={styles.dumb}>
                <View
                  style={[styles.rangeShade, { left: 0, width: x(b.high) }]}
                />
                <View style={[styles.limitRule, { left: x(b.high) }]} />
                <View
                  style={[
                    styles.dumbLine,
                    {
                      left: x(Math.min(now, start.value)),
                      width: `${(Math.abs(now - start.value) / (hi - lo)) * 100}%`,
                    },
                  ]}
                />
                <View style={[styles.dumbStart, { left: x(start.value) }]} />
                <View
                  style={[
                    styles.dumbEnd,
                    { left: x(now), backgroundColor: LEVEL_COLOR[t.status] },
                  ]}
                />
              </View>
              <Text
                style={type.meta}
              >{`Limit ${b.target.toLowerCase()}. ${sinceStart(b)?.short ?? ""}.`}</Text>
            </View>
          )
        })}
        <View style={styles.wrap}>
          <View style={styles.row}>
            <View style={styles.ringKey} />
            <Text style={type.meta}>May 2026, plan start</Text>
          </View>
          <View style={styles.row}>
            <Dot level="out" />
            <Text style={type.meta}>Latest, in its status color</Text>
          </View>
          <View style={styles.row}>
            <View style={[styles.key, { backgroundColor: chart.targetZone }]} />
            <Text style={type.meta}>Your range</Text>
          </View>
        </View>
      </Card>
    ),
  },
  {
    group: "Lab results",
    form: "Inside or outside the limit",
    name: "How far inside or outside its limit each lab sits",
    Draw: ({ markers }) => {
      const rows = ["egfr", "glucose", "hdl", "a1c", "tg", "vitd", "ldl"]
        .map((id) => markers.find((m) => m.id === id))
        .filter((b): b is Biomarker => !!b)
        .map((b) => {
          const t = classify(b)
          const v = t.latest?.value ?? 0
          const useHigh =
            b.high !== undefined &&
            (b.low === undefined || v > (b.low + b.high) / 2)
          const limit = useHigh ? b.high! : b.low!
          const margin = useHigh ? (limit - v) / limit : (v - limit) / limit
          return { b, t, margin }
        })
        .sort((a, z) => z.margin - a.margin)
      const cap = 0.6
      return (
        <Card style={styles.pad}>
          <View style={styles.divHead}>
            <Text style={[type.label, styles.fill, styles.right]}>Outside</Text>
            <View style={styles.divGap} />
            <Text style={[type.label, styles.fill]}>Inside</Text>
          </View>
          {rows.map(({ b, t, margin }) => {
            const w =
              `${(Math.min(Math.abs(margin), cap) / cap) * 100}%` as const
            return (
              <View key={b.id} style={styles.divRow}>
                <Text
                  style={[type.metaStrong, styles.divName]}
                  numberOfLines={1}
                >
                  {b.short && b.short.length <= 14
                    ? b.short.charAt(0).toUpperCase() + b.short.slice(1)
                    : b.name}
                </Text>
                <View style={styles.divSide}>
                  {margin < 0 && (
                    <View
                      style={[
                        styles.divBar,
                        styles.divLeft,
                        { width: w, backgroundColor: DIVERGE.below },
                      ]}
                    />
                  )}
                </View>
                <View style={styles.divMid} />
                <View style={styles.divSide}>
                  {margin >= 0 && (
                    <View
                      style={[
                        styles.divBar,
                        styles.divRight,
                        { width: w, backgroundColor: DIVERGE.above },
                      ]}
                    />
                  )}
                </View>
                <Text style={[type.value, styles.divVal]}>{`${t.value}`}</Text>
              </View>
            )
          })}
          <View style={styles.wrap}>
            <View style={styles.row}>
              {legendKey(DIVERGE.above)}
              <Text style={type.meta}>
                Inside its limit, by share of the limit
              </Text>
            </View>
            <View style={styles.row}>
              {legendKey(DIVERGE.below)}
              <Text style={type.meta}>Outside it</Text>
            </View>
          </View>
          {rows.some((r) => Math.abs(r.margin) > cap) && (
            <Text style={type.meta}>{`Bars stop at 60%. ${rows
              .filter((r) => Math.abs(r.margin) > cap)
              .map(
                (r) =>
                  `${r.b.short ?? r.b.name} is ${Math.round(Math.abs(r.margin) * 100)}% ${r.margin < 0 ? "past" : "inside"} its limit`
              )
              .join(", ")}.`}</Text>
          )}
        </Card>
      )
    },
  },
  {
    group: "Lab results",
    form: "Needle gauge",
    name: "Vitamin D on a gauge with its range",
    Draw: ({ markers }) => {
      const b = markers.find((m) => m.id === "vitd")
      if (!b) return null
      const t = classify(b)
      if (!t.latest) return null
      const max = 120
      const W = 220
      const R = 90
      const cx = W / 2
      const cy = 100
      const pt = (v: number, r = R) => {
        const a = Math.PI * (1 - Math.min(Math.max(v, 0), max) / max)
        return [cx + r * Math.cos(a), cy - r * Math.sin(a)] as const
      }
      const arc = (from: number, to: number) => {
        const [x0, y0] = pt(from)
        const [x1, y1] = pt(to)
        return `M${x0.toFixed(1)},${y0.toFixed(1)} A${R},${R} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)}`
      }
      const [nx, ny] = pt(t.latest.value, R - 22)
      const home = t.others[0]
      return (
        <Card style={styles.pad}>
          <View style={styles.between}>
            <Text style={type.title}>Vitamin D</Text>
            <Status level={t.status} tinted />
          </View>
          <View style={styles.gaugeWrap}>
            <Svg width={W} height={cy + 12}>
              <Path
                d={arc(0, (b.low ?? 30) - 1)}
                stroke={chart.zoneOut}
                strokeWidth={14}
                fill="none"
                strokeLinecap="round"
              />
              <Path
                d={arc((b.low ?? 30) + 1, (b.high ?? 100) - 1)}
                stroke={chart.zoneIn}
                strokeWidth={14}
                fill="none"
              />
              <Path
                d={arc((b.high ?? 100) + 1, max)}
                stroke={chart.track}
                strokeWidth={14}
                fill="none"
                strokeLinecap="round"
              />
              <Line
                x1={cx}
                y1={cy}
                x2={nx}
                y2={ny}
                stroke={ink.strong}
                strokeWidth={3}
                strokeLinecap="round"
              />
              <Circle
                cx={cx}
                cy={cy}
                r={7}
                fill={ink.strong}
                stroke={color.background}
                strokeWidth={2}
              />
            </Svg>
            <View style={styles.gaugeRead}>
              <Text
                style={[styles.readoutValue, { color: LEVEL_TEXT[t.status] }]}
              >
                {t.value}
              </Text>
              <Text style={type.unit}>{b.unit}</Text>
            </View>
          </View>
          <View style={styles.between}>
            <Text style={type.axis}>0</Text>
            <Text style={type.axis}>{`Range ${b.target}`}</Text>
            <Text style={type.axis}>{max}</Text>
          </View>
          <Text
            style={styles.takeaway}
          >{`${fmt(b, (b.low ?? 30) - t.latest.value)} ng/mL under the bottom of your range, from a blood draw in ${t.latest.date}.`}</Text>
          {!!home && (
            <Text
              style={type.meta}
            >{`Your home kit read ${home.value} in ${home.date}. It measures differently, so it is not on the gauge.`}</Text>
          )}
        </Card>
      )
    },
  },
  {
    group: "Lab results",
    form: "Range strip table",
    name: "Kidney and liver panel, each result on a small strip",
    Draw: ({ markers }) => {
      const list = markers
        .filter((m) => m.group === "Kidney and liver")
        .map(classify)
        .filter((t) => t.latest)
      const inCount = list.filter((t) => t.status === "in").length
      return (
        <Card style={styles.pad}>
          <View style={styles.between}>
            <Text style={type.section}>Kidney and liver</Text>
            <Text
              style={type.label}
            >{`${inCount} of ${list.length} in range`}</Text>
          </View>
          {list.map((t) => (
            <View key={t.id} style={[styles.stripRow, styles.rule]}>
              <View style={styles.stripName}>
                <Text style={type.title} numberOfLines={1}>
                  {t.marker.name.replace(/ \(BUN\)$/, "")}
                </Text>
                <Text style={type.meta}>{t.marker.target}</Text>
              </View>
              <RangeBar
                value={t.latest!.value}
                low={t.marker.low}
                high={t.marker.high}
                status={t.status}
                compact
                showValue={false}
                playKey={`b22-${t.id}`}
                style={styles.fill}
              />
              <Text style={[type.value, styles.stripVal]}>{t.value}</Text>
            </View>
          ))}
          <Text style={styles.takeaway}>
            {inCount === list.length
              ? "Every kidney and liver result is in range."
              : `${list.length - inCount} of these ${list.length - inCount === 1 ? "is" : "are"} outside or near the edge of the range.`}
          </Text>
        </Card>
      )
    },
  },
  {
    group: "Lab results",
    form: "Ranked list",
    name: "Results ranked by how far they moved toward their range, most improved first",
    Draw: ({ markers }) => {
      const scored = markers
        .map(classify)
        .filter(
          (t) => t.count > 1 && t.first && t.latest && t.marker.id !== "bp"
        )
        .map((t) => {
          const b = t.marker
          const a = t.first!.value
          const z = t.latest!.value
          const good =
            b.low !== undefined && b.high !== undefined
              ? Math.abs(a - (b.low + b.high) / 2) -
                Math.abs(z - (b.low + b.high) / 2)
              : b.high !== undefined
                ? a - z
                : z - a
          return { t, score: good / (b.high ?? b.low ?? 1) }
        })
        .sort((x, y) => y.score - x.score)
      const top = scored.slice(0, 3)
      const bottom = scored.slice(-2).reverse()
      const Row = ({ t, n }: { t: Trend; n: number }) => (
        <View style={[styles.rankList, styles.rule]}>
          <Text style={[type.stat, styles.rankNum]}>{n}</Text>
          <View style={styles.fill}>
            <Text style={type.title}>{t.marker.name}</Text>
            <Text
              style={type.label}
            >{`${fmt(t.marker, t.first!.value)} in ${t.first!.date} to ${t.value} ${t.marker.unit}`}</Text>
          </View>
          <View style={styles.endCol}>
            <Status level={t.status} bare />
            <Text style={type.meta}>
              {t.meaning === "improving"
                ? "Improving"
                : t.meaning === "away"
                  ? "Moving away"
                  : "Steady"}
            </Text>
          </View>
        </View>
      )
      return (
        <Card style={styles.pad}>
          <Text style={type.sectionLabel}>Most improved</Text>
          {top.map((x, i) => (
            <Row key={x.t.id} t={x.t} n={i + 1} />
          ))}
          <Text style={[type.sectionLabel, styles.gapTop]}>
            Moved furthest from range
          </Text>
          {bottom.map((x, i) => (
            <Row key={x.t.id} t={x.t} n={scored.length - i} />
          ))}
          <Text style={type.meta}>
            {
              "From each result's first test to its latest, as a share of its limit."
            }
          </Text>
        </Card>
      )
    },
  },
  {
    group: "Lab results",
    form: "Result timeline",
    name: "Every blood draw on a timeline, with how many results came back out of range",
    Draw: ({ markers }) => {
      const draws = new Map<
        string,
        {
          date: string
          place: string
          n: number
          out: number
          borderline: number
        }
      >()
      for (const b of markers.filter((m) => m.kind === "lab")) {
        for (const pt of b.points) {
          const k = pt.at ?? pt.date
          const d = draws.get(k) ?? {
            date: pt.date,
            place: PLACE_NAME[pt.origin],
            n: 0,
            out: 0,
            borderline: 0,
          }
          const st = pointStatus(b, pt)
          d.n++
          if (st === "out") d.out++
          if (st === "borderline") d.borderline++
          draws.set(k, d)
        }
      }
      const list = [...draws.entries()].sort((a, b) => b[0].localeCompare(a[0]))
      return (
        <Card style={styles.pad}>
          {list.map(([at, d], i) => (
            <View key={at} style={styles.timeRow}>
              <View style={styles.rail}>
                <View style={[styles.railDot, i === 0 && styles.railNow]} />
                {i < list.length - 1 && <View style={styles.railLine} />}
              </View>
              <View style={[styles.fill, styles.timeBody]}>
                <View style={styles.between}>
                  <Text style={type.title}>
                    {label(dayFrom(at.slice(0, 10))) + `, ${at.slice(0, 4)}`}
                  </Text>
                  {at === PLAN_START_RESULTS.a1c?.at && (
                    <Tag tone="primary">Plan start</Tag>
                  )}
                </View>
                <Text
                  style={type.label}
                >{`${d.place}, ${d.n} ${d.n === 1 ? "result" : "results"}`}</Text>
                <View style={styles.wrap}>
                  {d.out > 0 && (
                    <View style={styles.row}>
                      <Dot level="out" />
                      <Text style={type.meta}>{`${d.out} out of range`}</Text>
                    </View>
                  )}
                  {d.borderline > 0 && (
                    <View style={styles.row}>
                      <Dot level="borderline" />
                      <Text
                        style={type.meta}
                      >{`${d.borderline} borderline`}</Text>
                    </View>
                  )}
                  {d.out + d.borderline === 0 && (
                    <View style={styles.row}>
                      <Dot level="in" />
                      <Text style={type.meta}>All in range</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}
        </Card>
      )
    },
  },

  /* ===== your record ===== */
  {
    group: "Your record",
    form: "Body system tiles",
    name: "Each body system with its count and status split",
    Draw: ({ markers }) => (
      <View style={styles.grid}>
        {byBodySystem(markers, BODY_SYSTEMS).map((g) => {
          const tr = g.markers.map(classify).filter((t) => t.latest)
          const c = LEVELS.map((l) => tr.filter((t) => t.status === l).length)
          return (
            <Card key={g.group} style={[styles.half, styles.tilePad]}>
              <Text style={type.title} numberOfLines={2}>
                {g.group}
              </Text>
              <Text
                style={type.meta}
              >{`${tr.length} ${tr.length === 1 ? "result" : "results"}`}</Text>
              <View style={styles.segBar}>
                {LEVELS.map((l, i) =>
                  c[i] ? (
                    <View
                      key={l}
                      style={[
                        styles.seg,
                        { flex: c[i], backgroundColor: LEVEL_COLOR[l] },
                      ]}
                    />
                  ) : null
                )}
              </View>
              {LEVELS.map((l, i) =>
                c[i] ? (
                  <View key={l} style={styles.row}>
                    <Dot level={l} />
                    <Text
                      style={type.metaStrong}
                    >{`${c[i]} ${LEVEL_WORD[l].toLowerCase()}`}</Text>
                  </View>
                ) : null
              )}
            </Card>
          )
        })}
      </View>
    ),
  },
  {
    group: "Your record",
    form: "Body map",
    name: "Where your results sit on the body, by system",
    Draw: ({ markers }) => (
      <Card style={styles.pad}>
        <BodyMap markers={markers} />
        <View style={styles.wrap}>
          {LEVELS.map((l) => (
            <View key={l} style={styles.row}>
              <Dot level={l} />
              <Text style={type.meta}>
                {l === "in"
                  ? "All in range"
                  : l === "borderline"
                    ? "One or more borderline"
                    : "One or more out of range"}
              </Text>
            </View>
          ))}
        </View>
      </Card>
    ),
  },
  {
    group: "Your record",
    form: "Change log",
    name: "What changed since your plan started",
    Draw: ({ p, markers }) => {
      const lab = (id: string) => {
        const b = markers.find((m) => m.id === id)
        const start = PLAN_START_RESULTS[id]
        if (!b || !start) return undefined
        const t = classify(b)
        if (!t.latest) return undefined
        return {
          k: b.short && b.short.length < 8 ? b.short : b.name,
          from: fmt(b, start.value),
          to: t.value,
          unit: b.unit === "%" ? "%" : ` ${b.unit}`,
          d: t.latest.value - start.value,
          level: t.status,
        }
      }
      const a = firstScan()
      const s = latestScan()
      const rows = [
        {
          k: "Weight",
          from: `${p.weight.start}`,
          to: one(p.weight.now),
          unit: " lb",
          d: p.weight.now - p.weight.start,
          level: undefined,
        },
        {
          k: "Waist",
          from: `${p.waist.start}`,
          to: one(p.waist.now),
          unit: " in",
          d: p.waist.change,
          level: undefined,
        },
        {
          k: "Body fat",
          from: `${a.fatPct}`,
          to: `${s.fatPct}`,
          unit: "%",
          d: s.fatPct - a.fatPct,
          level: undefined,
        },
        p.pressure.average
          ? {
              k: "Home blood pressure",
              from: p.pressure.start,
              to: p.pressure.now ?? "",
              unit: "",
              d: p.pressure.average.value - BASELINE.bp.value,
              level: bpLevel(
                p.pressure.average.value,
                p.pressure.average.value2
              ),
            }
          : undefined,
        lab("a1c"),
        lab("ldl"),
        lab("tg"),
      ].filter((r): r is NonNullable<typeof r> => !!r)
      return (
        <Card style={styles.pad}>
          <Text
            style={type.label}
          >{`Since ${p.start.label}, week ${p.week}`}</Text>
          {rows.map((r) => (
            <View key={r.k} style={[styles.logRow, styles.rule]}>
              <View style={styles.fill}>
                <Text style={type.title}>{r.k}</Text>
                <Text style={type.label}>
                  {`${r.from} to `}
                  <Text style={type.value}>{`${r.to}${r.unit}`}</Text>
                </Text>
              </View>
              <View style={styles.endCol}>
                <Delta
                  value={Math.round(r.d * 10) / 10}
                  unit={r.k === "Home blood pressure" ? " top" : ""}
                  goodWhenUp={false}
                />
                {r.level && <Status level={r.level} bare />}
              </View>
            </View>
          ))}
          <Text style={styles.takeaway}>
            Everything your plan works on has moved the right way. A1c, LDL and
            triglycerides are still above their limits.
          </Text>
        </Card>
      )
    },
  },
]

/* ------------------------------------------------------------- styles -- */

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { textAlign: "center" },
  right: { textAlign: "right" },
  row: { flexDirection: "row", alignItems: "center", gap: space.mark },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.inline,
  },
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space.inline,
  },
  stackSm: { gap: space.stack },
  stackItem: { gap: space.item },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.item },
  half: { flexBasis: "47%", flexGrow: 1, maxWidth: "49%" },
  pad: { gap: space.item, padding: space.gutter },
  tilePad: { gap: space.stack + 2, padding: space.compact },
  rule: {
    borderTopWidth: 1,
    borderTopColor: hairline.rule,
    paddingTop: space.inline,
  },
  gapTop: { marginTop: space.inline },
  endCol: { alignItems: "flex-end", gap: space.stack },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  key: { width: 10, height: 10, borderRadius: 2 },
  keyGap: { marginLeft: space.inline },
  ringKey: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: ink.tertiary,
  },
  dotKey: { borderRadius: 5, backgroundColor: color.primary },
  dashKey: {
    width: 14,
    height: 0,
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: ink.secondary,
  },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.stack,
    paddingLeft: 6,
    paddingRight: 8,
    paddingVertical: 2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(33, 80, 89, 0.04)",
    backgroundColor: "#F9FBFB",
  },
  pillText: { ...type.captionStrong, color: ink.primary },
  valueRow: { flexDirection: "row", alignItems: "baseline", gap: space.stack },
  readoutValue: {
    fontFamily: font.semibold,
    fontSize: 28,
    lineHeight: 34,
    color: ink.strong,
  },
  takeaway: { ...type.body, lineHeight: 20, color: ink.content },

  zones: { gap: space.item, paddingTop: space.stack },
  zoneTrack: { flexDirection: "row", height: 6, gap: 2 },
  zoneFill: { height: 6 },
  zoneStart: { borderTopLeftRadius: 3, borderBottomLeftRadius: 3 },
  zoneEnd: { borderTopRightRadius: 3, borderBottomRightRadius: 3 },
  zoneMark: {
    position: "absolute",
    top: -6,
    width: 18,
    height: 18,
    marginLeft: -9,
    borderRadius: 9,
    borderWidth: 3,
    backgroundColor: color.background,
  },
  zoneStartMark: {
    position: "absolute",
    top: -3,
    width: 12,
    height: 12,
    marginLeft: -6,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: ink.tertiary,
    backgroundColor: color.background,
  },
  zoneNames: { flexDirection: "row", gap: 2 },
  zoneName: { ...type.label },

  blocks: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  block: {
    width: "13%",
    flexGrow: 1,
    height: 32,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  blockOpen: {
    backgroundColor: color.background,
    borderWidth: 1.5,
    borderColor: TEAL_RAMP[1],
  },

  calRow: { flexDirection: "row" },
  calGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: 4 },
  calCell: { width: `${100 / 7}%`, alignItems: "center" },
  calDay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dotCell: { gap: 2, paddingVertical: 2 },

  tape: {
    height: 34,
    borderRadius: 6,
    backgroundColor: "#FBF7EC",
    borderWidth: 1,
    borderColor: hairline.outline,
    overflow: "hidden",
  },
  tapeGoal: {
    position: "absolute",
    top: 0,
    bottom: 0,
    backgroundColor: chart.targetZone,
  },
  tick: {
    position: "absolute",
    top: 0,
    width: 1,
    backgroundColor: ink.tertiary,
  },
  tapeStart: {
    position: "absolute",
    top: 18,
    width: 12,
    height: 12,
    marginLeft: -6,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: ink.tertiary,
    backgroundColor: color.background,
  },
  tapeNow: {
    position: "absolute",
    top: 16,
    width: 16,
    height: 16,
    marginLeft: -8,
    borderRadius: 8,
    backgroundColor: color.primary,
    borderWidth: 2,
    borderColor: color.background,
  },
  tapeNums: { height: 16, position: "relative" },
  tapeNum: {
    position: "absolute",
    width: 24,
    marginLeft: -12,
    textAlign: "center",
  },

  rankRow: { flexDirection: "row", alignItems: "center", gap: space.inline },
  rankNum: { width: 18, textAlign: "center" },
  rankName: { width: 92 },
  rankBar: { height: 10, borderRadius: 5 },
  rankVal: { width: 56, textAlign: "right" },
  rankList: { flexDirection: "row", alignItems: "center", gap: space.inline },

  figures: { flexDirection: "row", justifyContent: "space-around" },
  figureCol: { alignItems: "center", gap: space.stack },

  columns: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
  },
  colWrap: { alignItems: "center", gap: space.stack },
  colTop: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  colBottom: { alignItems: "center", justifyContent: "center" },

  sum: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sumPart: { alignItems: "center" },
  op: { ...type.hero, color: ink.tertiary },
  splitBar: { flexDirection: "row", gap: 2, height: 10 },
  splitPart: { height: 10 },
  splitStart: { borderTopLeftRadius: 5, borderBottomLeftRadius: 5 },
  splitEnd: { borderTopRightRadius: 5, borderBottomRightRadius: 5 },

  thermos: { flexDirection: "row", justifyContent: "space-around" },
  thermoCol: { alignItems: "center", gap: space.stack },
  tube: {
    width: 22,
    borderRadius: 11,
    backgroundColor: chart.track,
    justifyContent: "flex-end",
    overflow: "visible",
  },
  tubeFill: { width: 22, borderRadius: 11, backgroundColor: chart.data },
  bulb: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: chart.data,
    marginTop: -14,
    borderWidth: 3,
    borderColor: color.background,
  },
  limit: {
    position: "absolute",
    left: -6,
    width: 34,
    height: 2,
    backgroundColor: ink.strong,
  },
  limitText: { position: "absolute", left: 32, width: 60 },

  bandRow: { flexDirection: "row", alignItems: "center", gap: space.inline },
  bandMeter: {
    width: 72,
    height: 8,
    borderRadius: 4,
    backgroundColor: chart.track,
    overflow: "hidden",
  },
  bandFill: { height: 8, borderRadius: 4 },
  count: { width: 24, textAlign: "right" },

  compare: { flexDirection: "row", gap: space.item },
  compareCol: { flex: 1, gap: space.stack },
  divider: { width: 1, backgroundColor: hairline.rule },

  dumb: { height: 20, position: "relative", justifyContent: "center" },
  rangeShade: {
    position: "absolute",
    top: 4,
    height: 12,
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
    backgroundColor: tint(chart.inRange, "1F"),
  },
  limitRule: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: chart.goal,
  },
  dumbLine: { position: "absolute", height: 2, backgroundColor: "#C9CDD3" },
  dumbStart: {
    position: "absolute",
    width: 14,
    height: 14,
    marginLeft: -7,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: ink.tertiary,
    backgroundColor: color.background,
  },
  dumbEnd: {
    position: "absolute",
    width: 14,
    height: 14,
    marginLeft: -7,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: color.background,
  },

  divHead: { flexDirection: "row", paddingLeft: 84, paddingRight: 44 },
  divGap: { width: 2 },
  divRow: { flexDirection: "row", alignItems: "center", gap: 0, height: 22 },
  divName: { width: 84 },
  divSide: { flex: 1, height: 12, justifyContent: "center" },
  divBar: { height: 12 },
  divLeft: {
    alignSelf: "flex-end",
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  divRight: {
    alignSelf: "flex-start",
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  divMid: { width: 2, height: 22, backgroundColor: DIVERGE.mid },
  divVal: { width: 44, textAlign: "right" },

  gaugeWrap: { alignItems: "center" },
  gaugeRead: {
    position: "absolute",
    bottom: 0,
    flexDirection: "row",
    alignItems: "baseline",
    gap: space.stack,
    backgroundColor: color.background,
    paddingHorizontal: space.inline,
  },

  stripRow: { flexDirection: "row", alignItems: "center", gap: space.item },
  stripName: { width: 120 },
  stripVal: { width: 40, textAlign: "right" },

  timeRow: { flexDirection: "row", gap: space.inline },
  timeBody: { gap: space.stack, paddingBottom: space.item },
  rail: { alignItems: "center", width: 14 },
  railDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#C9CDD3",
    backgroundColor: color.background,
    marginTop: 4,
  },
  railNow: { borderColor: color.primary, backgroundColor: color.primary },
  railLine: { width: 2, flex: 1, backgroundColor: "#E5E7EB", marginTop: 2 },

  segBar: {
    flexDirection: "row",
    gap: 2,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginVertical: space.stack,
  },
  seg: { height: 6 },

  mapLabel: { position: "absolute", gap: 0 },

  logRow: { flexDirection: "row", alignItems: "center", gap: space.inline },
})
