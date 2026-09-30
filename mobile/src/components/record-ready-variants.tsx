import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native"
import Svg, { Circle, Line } from "react-native-svg"

import { Badge, FlowScreen, Section } from "@/components/flow"
import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconSparkle,
} from "@/components/icons"
import { RecordIcon, type RecordIconName } from "@/components/record-icons"
import { Button } from "@/components/ui"
import {
  DATA_TYPES,
  FINDINGS,
  LABS_IN_RANGE,
  REVIEW,
  SOURCES,
} from "@/lib/record"
import { color, font, gutter } from "@/lib/theme"

/* Twenty takes on the last setup step once the record is in ("Your record is
   ready"), for review side by side. Same data as onboarding/syncing.tsx,
   each laying the counts out a different way. Not wired into setup. */

const FOLDER = require("../../assets/images/record-folder.png")

const TOTAL = DATA_TYPES.reduce((sum, t) => sum + t.count, 0)
const type = (key: (typeof DATA_TYPES)[number]["key"]) =>
  DATA_TYPES.find((t) => t.key === key)!

/** Prototype split of the records by where they came from; sums to TOTAL. */
const BY_SOURCE: Record<
  (typeof SOURCES)[number]["kind"],
  { count: number; since: string; icon: RecordIconName }
> = {
  clinic: { count: 74, since: "2019", icon: "clinic" },
  hospital: { count: 38, since: "2023", icon: "hospital" },
  lab: { count: 56, since: "2021", icon: "lab" },
}

// Opened by direct link there is nothing to go back to; land on the index.
const done = () =>
  router.canGoBack() ? router.back() : router.replace("/record-ready")

function Ready({
  children,
  art = 112,
  footer,
}: {
  children: React.ReactNode
  art?: number
  footer?: React.ReactNode
}) {
  return (
    <FlowScreen
      back={false}
      bar={<Switcher />}
      title="Your record is ready"
      art={
        art ? (
          <Image
            source={FOLDER}
            style={{ width: art, height: art }}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        ) : (
          // No art of its own (the art sits lower down); keeps the title centred.
          <View />
        )
      }
      footer={footer ?? <Button onPress={done}>Go to my dashboard</Button>}
    >
      {children}
    </FlowScreen>
  )
}

/** Review only: steps through the variations in place, wrapping at the ends. */
function Switcher() {
  const { variant } = useLocalSearchParams<{ variant: string }>()
  const at = Math.max(
    0,
    RECORD_READY_VARIANTS.findIndex((v) => v.id === variant)
  )
  const n = RECORD_READY_VARIANTS.length
  const go = (step: number) =>
    router.setParams({ variant: RECORD_READY_VARIANTS[(at + step + n) % n].id })
  return (
    <View style={s.switcher}>
      <Pressable
        onPress={() => go(-1)}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="Previous variation"
        style={({ pressed }) => [s.switchArrow, pressed && s.switchPressed]}
      >
        <IconChevronLeft size={18} color={color.text} />
      </Pressable>
      <Text style={s.switchLabel} numberOfLines={1}>
        <Text style={s.switchCount}>
          {at + 1} of {n}
        </Text>
        {"  "}
        {RECORD_READY_VARIANTS[at].title}
      </Text>
      <Pressable
        onPress={() => go(1)}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="Next variation"
        style={({ pressed }) => [s.switchArrow, pressed && s.switchPressed]}
      >
        <IconChevronRight size={18} color={color.text} />
      </Pressable>
    </View>
  )
}

function Tile({
  icon,
  size = 38,
  tint = color.primaryTint,
}: {
  icon: RecordIconName
  size?: number
  tint?: string
}) {
  return (
    <View
      style={[
        s.tile,
        {
          width: size,
          height: size,
          borderRadius: size * 0.32,
          backgroundColor: tint,
        },
      ]}
    >
      <RecordIcon name={icon} size={size * 0.47} color={color.primary} />
    </View>
  )
}

function Summary() {
  return (
    <View style={s.summary}>
      <Text style={s.summaryValue}>{TOTAL}</Text>
      <Text style={s.summaryText}>records from {SOURCES.length} providers</Text>
    </View>
  )
}

/* 1. Grid: every kind of record as a tile, three across. */
function Grid() {
  return (
    <Ready>
      <Summary />
      <View style={s.grid}>
        {DATA_TYPES.map((t) => (
          <View key={t.key} style={s.gridCell}>
            <Tile icon={t.icon} size={34} tint={color.background} />
            <Text style={s.gridValue}>{t.count}</Text>
            <Text style={s.gridLabel} numberOfLines={1}>
              {t.label}
            </Text>
          </View>
        ))}
      </View>
    </Ready>
  )
}

/* 2. Hero number: the total leads, the kinds follow as wrapped pills. */
function HeroNumber() {
  return (
    <Ready art={96}>
      <View style={s.hero}>
        <Text style={s.heroValue}>{TOTAL}</Text>
        <Text style={s.heroText}>records from {SOURCES.length} providers</Text>
      </View>
      <View style={s.pills}>
        {DATA_TYPES.map((t) => (
          <View key={t.key} style={s.pill}>
            <RecordIcon name={t.icon} size={15} color={color.primary} />
            <Text style={s.pillLabel}>{t.label}</Text>
            <Text style={s.pillCount}>{t.count}</Text>
          </View>
        ))}
      </View>
    </Ready>
  )
}

/* 3. By provider: where the record came from, before what is in it. */
function ByProvider() {
  return (
    <Ready>
      <Summary />
      <Section title="From your providers">
        <View style={s.panel}>
          {SOURCES.map((src, i) => {
            const by = BY_SOURCE[src.kind]
            return (
              <View
                key={src.name}
                style={[s.row, i < SOURCES.length - 1 && s.rule]}
              >
                <Tile icon={by.icon} tint={color.background} />
                <View style={s.rowBody}>
                  <Text style={s.rowLabel} numberOfLines={1}>
                    {src.name}
                  </Text>
                  <View style={s.status}>
                    <View style={[s.dot, { backgroundColor: color.ok }]} />
                    <Text style={s.meta}>Connected</Text>
                  </View>
                </View>
                <Text style={s.count}>{by.count}</Text>
              </View>
            )
          })}
        </View>
      </Section>
      <Section title="What came in">
        <View style={s.pills}>
          {DATA_TYPES.map((t) => (
            <View key={t.key} style={s.pill}>
              <Text style={s.pillLabel}>{t.label}</Text>
              <Text style={s.pillCount}>{t.count}</Text>
            </View>
          ))}
        </View>
      </Section>
    </Ready>
  )
}

/* 4. Composition: one bar split by share, a dot legend under it. */
const SHARE = [
  {
    label: "Lab results",
    count: type("Observation.lab").count,
    tone: color.primary,
  },
  { label: "Vitals", count: type("Observation.vital").count, tone: "#7FB3BC" },
  { label: "Visits", count: type("Encounter").count, tone: color.primaryHalo },
  {
    label: "Everything else",
    count:
      TOTAL -
      type("Observation.lab").count -
      type("Observation.vital").count -
      type("Encounter").count,
    tone: "#DCE3E2",
  },
]

function Composition() {
  return (
    <Ready>
      <View style={s.panel}>
        <View style={s.compHead}>
          <Text style={s.compValue}>{TOTAL}</Text>
          <Text style={s.meta}>records from {SOURCES.length} providers</Text>
        </View>
        <View style={s.stack}>
          {SHARE.map((x) => (
            <View
              key={x.label}
              style={{ flex: x.count, backgroundColor: x.tone }}
            />
          ))}
        </View>
        <View style={s.legend}>
          {SHARE.map((x) => (
            <View key={x.label} style={s.legendRow}>
              <View style={[s.dot, { backgroundColor: x.tone }]} />
              <Text style={[s.rowLabel, s.flex]}>{x.label}</Text>
              <Text style={s.meta}>{Math.round((x.count / TOTAL) * 100)}%</Text>
              <Text style={s.legendCount}>{x.count}</Text>
            </View>
          ))}
        </View>
      </View>
    </Ready>
  )
}

/* 5. Grouped: the kinds sorted into three plain groups, soft borderless panels. */
const GROUPS = [
  {
    title: "Your health",
    keys: ["Condition", "MedicationStatement", "AllergyIntolerance"],
  },
  { title: "Your tests", keys: ["Observation.lab", "Observation.vital"] },
  {
    title: "Your care",
    keys: ["Encounter", "Procedure", "Immunization", "DocumentReference"],
  },
] as const

function Grouped() {
  return (
    <Ready>
      <Summary />
      {GROUPS.map((g) => (
        <Section key={g.title} title={g.title} gap={10}>
          <View style={s.panel}>
            {g.keys.map((k, i) => {
              const t = type(k)
              return (
                <View key={k} style={[s.row, i < g.keys.length - 1 && s.rule]}>
                  <Tile icon={t.icon} tint={color.background} />
                  <Text style={[s.rowLabel, s.flex]}>{t.label}</Text>
                  <Text style={s.count}>{t.count}</Text>
                </View>
              )
            })}
          </View>
        </Section>
      ))}
    </Ready>
  )
}

/* 6. What stood out: the flagged results first, the rest reassuring. */
function StoodOut() {
  return (
    <Ready>
      <Summary />
      <Section
        title="Worth a look"
        action={<Badge tone="high">{`${FINDINGS.length} results`}</Badge>}
      >
        <View style={s.panel}>
          {FINDINGS.slice(0, 4).map((f, i) => (
            <View key={f.id} style={[s.row, i < 3 && s.rule]}>
              <View
                style={[
                  s.dot,
                  {
                    backgroundColor: f.flag === "high" ? color.high : color.low,
                  },
                ]}
              />
              <Text style={[s.rowLabel, s.flex]} numberOfLines={1}>
                {f.name}
              </Text>
              <Text style={s.value}>{f.value}</Text>
            </View>
          ))}
        </View>
      </Section>
      <View style={[s.panel, s.okPanel]}>
        <View style={s.row}>
          <View style={[s.dot, { backgroundColor: color.ok }]} />
          <Text style={[s.rowLabel, s.flex]}>Lab results in range</Text>
          <Text style={s.count}>
            {LABS_IN_RANGE.inRange} of {LABS_IN_RANGE.total}
          </Text>
        </View>
      </View>
    </Ready>
  )
}

/* 7. Receipt: each kind ticked off, with a total line at the foot. */
function Receipt() {
  return (
    <Ready art={88}>
      <View style={s.panel}>
        {DATA_TYPES.map((t) => (
          <View key={t.key} style={s.receiptRow}>
            <View style={s.check}>
              <IconCheck size={12} color={color.onPrimary} strokeWidth={2.4} />
            </View>
            <Text style={[s.rowLabel, s.flex]}>{t.label}</Text>
            <Text style={s.receiptCount}>{t.count}</Text>
          </View>
        ))}
        <View style={s.receiptTotal}>
          <Text style={[s.totalLabel, s.flex]}>Total</Text>
          <Text style={s.totalValue}>{TOTAL}</Text>
        </View>
      </View>
      <Text style={s.centredMeta}>
        From {SOURCES.map((x) => x.name.split(" ")[0]).join(", ")}
      </Text>
    </Ready>
  )
}

/* 8. Bento: the biggest kinds get the biggest tiles. */
function Bento() {
  const labs = type("Observation.lab")
  const pair = [type("Observation.vital"), type("Encounter")]
  const rest = DATA_TYPES.filter(
    (t) => ![labs.key, ...pair.map((p) => p.key)].includes(t.key)
  )
  return (
    <Ready>
      <Summary />
      <View style={s.bento}>
        <View style={s.bentoLead}>
          <Tile icon={labs.icon} tint={color.background} />
          <View style={s.flex} />
          <Text style={s.bentoLeadValue}>{labs.count}</Text>
          <Text style={s.rowLabel}>{labs.label}</Text>
        </View>
        <View style={s.bentoPair}>
          {pair.map((t) => (
            <View key={t.key} style={s.bentoMid}>
              <View style={s.bentoMidHead}>
                <Text style={s.bentoMidValue}>{t.count}</Text>
                <RecordIcon name={t.icon} size={18} color={color.primary} />
              </View>
              <Text style={s.rowLabel}>{t.label}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={s.grid}>
        {rest.map((t) => (
          <View key={t.key} style={s.gridCellSmall}>
            <Text style={s.gridValue}>{t.count}</Text>
            <Text style={s.gridLabel} numberOfLines={1}>
              {t.label}
            </Text>
          </View>
        ))}
      </View>
    </Ready>
  )
}

/* 9. Stats and timeline: three numbers, then when each provider begins. */
function Timeline() {
  const years =
    new Date().getFullYear() -
    Math.min(...Object.values(BY_SOURCE).map((b) => Number(b.since)))
  const sorted = [...SOURCES].sort(
    (a, b) => Number(BY_SOURCE[a.kind].since) - Number(BY_SOURCE[b.kind].since)
  )
  return (
    <Ready>
      <View style={s.stats}>
        {[
          { value: TOTAL, label: "Records" },
          { value: SOURCES.length, label: "Providers" },
          { value: years, label: "Years" },
        ].map((x) => (
          <View key={x.label} style={s.stat}>
            <Text style={s.statValue}>{x.value}</Text>
            <Text style={s.meta}>{x.label}</Text>
          </View>
        ))}
      </View>
      <Section title="Your history">
        <View>
          {sorted.map((src, i) => {
            const by = BY_SOURCE[src.kind]
            const last = i === sorted.length - 1
            return (
              <View key={src.name} style={s.tlRow}>
                <View style={s.tlRail}>
                  <View style={s.tlDot} />
                  {!last && <View style={s.tlLine} />}
                </View>
                <View style={[s.tlBody, !last && s.tlGap]}>
                  <Text style={s.meta}>Since {by.since}</Text>
                  <Text style={s.rowLabel}>{src.name}</Text>
                  <Text style={s.meta}>{by.count} records</Text>
                </View>
              </View>
            )
          })}
        </View>
      </Section>
    </Ready>
  )
}

/* 10. What's next: the counts shrink to a strip, the next steps lead. */
function NextSteps() {
  const steps = [
    { title: `${REVIEW.by} reviews your record`, icon: "documents" as const },
    { title: "See your results explained", icon: "labs" as const },
    { title: "Pick the plan that fits you", icon: "conditions" as const },
  ]
  return (
    <Ready art={96}>
      <Summary />
      <View style={s.strip}>
        {DATA_TYPES.slice(0, 5).map((t) => (
          <View key={t.key} style={s.stripItem}>
            <Text style={s.stripValue}>{t.count}</Text>
            <Text style={s.stripLabel} numberOfLines={1}>
              {t.label}
            </Text>
          </View>
        ))}
      </View>
      <Section title="What happens next">
        <View style={s.panel}>
          {steps.map((step, i) => (
            <View
              key={step.title}
              style={[s.row, i < steps.length - 1 && s.rule]}
            >
              <View style={s.stepNumber}>
                <Text style={s.stepNumberText}>{i + 1}</Text>
              </View>
              <Text style={[s.rowLabel, s.flex]}>{step.title}</Text>
              <RecordIcon name={step.icon} size={18} color={color.muted} />
            </View>
          ))}
        </View>
      </Section>
    </Ready>
  )
}

/* ----------------------------------------------- more inventive takes -- */

const native = Platform.OS !== "web"
const useContentWidth = () =>
  Math.min(useWindowDimensions().width, 420 + gutter * 2) - gutter * 2

function Legend() {
  return (
    <View style={t.legendGrid}>
      {SHARE.map((x) => (
        <View key={x.label} style={t.legendCell}>
          <View style={[s.dot, { backgroundColor: x.tone }]} />
          <Text style={s.meta} numberOfLines={1}>
            {x.label}
          </Text>
          <Text style={t.legendCount}>{x.count}</Text>
        </View>
      ))}
    </View>
  )
}

/* 11. Ring: the share as a donut, the folder resting in its middle. */
function Ring() {
  const size = 240
  const stroke = 20
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const starts = SHARE.map((_, i) =>
    SHARE.slice(0, i).reduce((sum, x) => sum + (x.count / TOTAL) * c, 0)
  )
  return (
    <Ready art={0}>
      <View style={[t.ring, { width: size, height: size }]}>
        <Svg
          width={size}
          height={size}
          style={[
            StyleSheet.absoluteFill,
            { transform: [{ rotate: "-90deg" }] },
          ]}
        >
          {SHARE.map((x, i) => (
            <Circle
              key={x.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={x.tone}
              strokeWidth={stroke}
              strokeDasharray={`${Math.max((x.count / TOTAL) * c - 4, 0)} ${c}`}
              strokeDashoffset={-starts[i]}
            />
          ))}
        </Svg>
        <Image
          source={FOLDER}
          style={t.ringArt}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
        <Text style={t.ringValue}>{TOTAL}</Text>
        <Text style={s.meta}>records</Text>
      </View>
      <Legend />
    </Ready>
  )
}

/* 12. Waffle: every record is one dot, 14 by 12 makes the 168. */
function Waffle() {
  const w = useContentWidth()
  const cols = 14
  const gap = 5
  const dot = (w - 28 - gap * (cols - 1)) / cols
  const tones = SHARE.flatMap((x) =>
    Array.from({ length: x.count }, () => x.tone)
  )
  return (
    <Ready art={80}>
      <View style={s.panel}>
        <View style={s.compHead}>
          <Text style={s.compValue}>{TOTAL}</Text>
          <Text style={s.meta}>records, one dot each</Text>
        </View>
        <View style={[t.waffle, { gap }]}>
          {tones.map((tone, i) => (
            <View
              key={i}
              style={{
                width: dot,
                height: dot,
                borderRadius: dot / 2,
                backgroundColor: tone,
              }}
            />
          ))}
        </View>
      </View>
      <Legend />
    </Ready>
  )
}

/* 13. Treemap: each kind of record gets room in proportion to its count. */
type Item = (typeof DATA_TYPES)[number]
type Box = Item & { x: number; y: number; w: number; h: number }

function treemap(
  items: Item[],
  x: number,
  y: number,
  w: number,
  h: number
): Box[] {
  if (items.length === 1) return [{ ...items[0], x, y, w, h }]
  const total = items.reduce((sum, i) => sum + i.count, 0)
  let acc = items[0].count
  let cut = 1
  while (cut < items.length - 1 && acc + items[cut].count <= total / 2)
    acc += items[cut++].count
  const f = acc / total
  const [a, b] = [items.slice(0, cut), items.slice(cut)]
  return w >= h
    ? [
        ...treemap(a, x, y, w * f, h),
        ...treemap(b, x + w * f, y, w * (1 - f), h),
      ]
    : [
        ...treemap(a, x, y, w, h * f),
        ...treemap(b, x, y + h * f, w, h * (1 - f)),
      ]
}

const TREE_TONES = [color.primary, "#7FB3BC", color.primaryHalo]

function Treemap() {
  const w = useContentWidth()
  const h = 340
  const boxes = treemap(
    [...DATA_TYPES].sort((a, b) => b.count - a.count),
    0,
    0,
    w,
    h
  )
  return (
    <Ready art={80}>
      <Summary />
      <View style={{ width: w, height: h }}>
        {boxes.map((b, i) => {
          const tone =
            TREE_TONES[i] ?? (i % 2 ? color.primaryTint : color.canvas)
          const ink = i < 2 ? color.onPrimary : color.text
          return (
            <View
              key={b.key}
              style={[
                t.treeBox,
                { left: b.x, top: b.y, width: b.w, height: b.h },
              ]}
            >
              <View style={[t.treeFill, { backgroundColor: tone }]}>
                {b.w > 30 && b.h > 34 && (
                  <Text
                    style={[
                      t.treeValue,
                      { color: ink },
                      i === 0 && t.treeValueLead,
                    ]}
                  >
                    {b.count}
                  </Text>
                )}
                {b.w > 72 && b.h > 56 ? (
                  <Text style={[t.treeLabel, { color: ink }]} numberOfLines={1}>
                    {b.label}
                  </Text>
                ) : (
                  b.w > 30 &&
                  b.h > 56 && (
                    <View style={t.treeIcon}>
                      <RecordIcon
                        name={b.icon}
                        size={16}
                        color={color.primary}
                      />
                    </View>
                  )
                )}
              </View>
            </View>
          )
        })}
      </View>
    </Ready>
  )
}

/* 14. Bubbles: a loose cluster, each circle sized by its count. */
const BUBBLE_ORDER = [
  "MedicationStatement",
  "Observation.vital",
  "Condition",
  "Encounter",
  "Observation.lab",
  "DocumentReference",
  "AllergyIntolerance",
  "Immunization",
  "Procedure",
] as const

function Bubbles() {
  const max = type("Observation.lab").count
  return (
    <Ready art={80}>
      <Summary />
      <View style={t.bubbles}>
        {BUBBLE_ORDER.map((k) => {
          const x = type(k)
          const size = 62 + Math.pow(x.count / max, 0.6) * 94
          const lead = x.count === max
          return (
            <View
              key={k}
              style={[
                t.bubble,
                { width: size, height: size, borderRadius: size / 2 },
                lead ? t.bubbleLead : x.count > 20 ? t.bubbleMid : null,
              ]}
            >
              <Text
                style={[
                  t.bubbleValue,
                  lead && t.bubbleValueLead,
                  (lead || x.count > 20) && t.onDark,
                ]}
              >
                {x.count}
              </Text>
              <Text
                style={[t.bubbleLabel, (lead || x.count > 20) && t.onDark]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {x.label}
              </Text>
            </View>
          )
        })}
      </View>
    </Ready>
  )
}

/* 15. Connections: you in the middle, each provider a node, the line as thick
   as what it sent. */
function Connections() {
  const w = useContentWidth()
  const h = 330
  const cx = w / 2
  const cy = 160
  const R = 116
  const nodes = [
    { src: SOURCES[0], angle: 210, above: true },
    { src: SOURCES[2], angle: 330, above: true },
    { src: SOURCES[1], angle: 90, above: false },
  ].map((n) => ({
    ...n,
    by: BY_SOURCE[n.src.kind],
    x: cx + R * Math.cos((n.angle * Math.PI) / 180),
    y: cy + R * Math.sin((n.angle * Math.PI) / 180),
  }))
  return (
    <Ready art={80}>
      <View style={{ width: w, height: h }}>
        <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
          {nodes.map((n) => (
            <Line
              key={n.src.name}
              x1={cx}
              y1={cy}
              x2={n.x}
              y2={n.y}
              stroke={color.primaryHalo}
              strokeWidth={2 + (n.by.count / 74) * 8}
              strokeLinecap="round"
            />
          ))}
        </Svg>
        <View style={[t.hub, { left: cx - 46, top: cy - 46 }]}>
          <Text style={t.hubValue}>{TOTAL}</Text>
          <Text style={t.hubLabel}>records</Text>
        </View>
        {nodes.map((n) => (
          <React.Fragment key={n.src.name}>
            <View style={[t.node, { left: n.x - 28, top: n.y - 28 }]}>
              <RecordIcon name={n.by.icon} size={24} color={color.primary} />
            </View>
            <View
              style={[
                t.nodeText,
                { left: n.x - 70, top: n.above ? n.y - 76 : n.y + 34 },
              ]}
            >
              <Text style={t.nodeName} numberOfLines={1}>
                {n.src.name.split(" ")[0]}
              </Text>
              <Text style={s.meta}>{n.by.count} records</Text>
            </View>
          </React.Fragment>
        ))}
      </View>
    </Ready>
  )
}

/* 16. Carousel: one kind of record per card, swiped through, the next one
   peeking in. */
function Carousel() {
  const w = useContentWidth()
  const card = w - 44
  const step = card + 12
  const [at, setAt] = React.useState(0)
  return (
    <Ready art={80}>
      <Summary />
      <View style={t.carouselWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={step}
          decelerationRate="fast"
          contentContainerStyle={t.carousel}
          scrollEventThrottle={32}
          onScroll={(e) =>
            setAt(Math.round(e.nativeEvent.contentOffset.x / step))
          }
        >
          {DATA_TYPES.map((x, i) => (
            <View
              key={x.key}
              style={[t.slide, { width: card }, i === 4 && t.slideLead]}
            >
              <Tile
                icon={x.icon}
                size={48}
                tint={i === 4 ? color.primaryTint : color.background}
              />
              <View style={s.flex} />
              <Text style={[t.slideValue, i === 4 && t.onDark]}>{x.count}</Text>
              <Text style={[t.slideLabel, i === 4 && t.onDark]}>{x.label}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
      <View style={t.pager}>
        {DATA_TYPES.map((x, i) => (
          <View key={x.key} style={[t.pagerDot, i === at && t.pagerDotOn]} />
        ))}
      </View>
    </Ready>
  )
}

/* 17. Count up: the total runs up while each kind slides in with a bar
   drawn to its share. */
function CountUp() {
  const [n, setN] = React.useState(0)
  const rows = React.useRef(DATA_TYPES.map(() => new Animated.Value(0))).current
  const max = type("Observation.lab").count
  React.useEffect(() => {
    const v = new Animated.Value(0)
    const id = v.addListener(({ value }) => setN(Math.round(value)))
    Animated.parallel([
      Animated.timing(v, {
        toValue: TOTAL,
        duration: 1800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.stagger(
        120,
        rows.map((r) =>
          Animated.timing(r, {
            toValue: 1,
            duration: 520,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          })
        )
      ),
    ]).start()
    return () => v.removeListener(id)
  }, [rows])
  return (
    <Ready art={80}>
      <View style={s.hero}>
        <Text style={s.heroValue}>{n}</Text>
        <Text style={s.heroText}>records from {SOURCES.length} providers</Text>
      </View>
      <View style={t.bars}>
        {DATA_TYPES.map((x, i) => (
          <Animated.View
            key={x.key}
            style={[
              t.barRow,
              {
                opacity: rows[i],
                transform: [
                  {
                    translateY: rows[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={t.barHead}>
              <Text style={t.barLabel}>{x.label}</Text>
              <Text style={t.barCount}>{x.count}</Text>
            </View>
            <View style={t.barTrack}>
              <Animated.View
                style={[
                  t.barFill,
                  {
                    width: rows[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [
                        "0%",
                        `${Math.max((x.count / max) * 100, 3)}%`,
                      ],
                    }),
                  },
                ]}
              />
            </View>
          </Animated.View>
        ))}
      </View>
    </Ready>
  )
}

/* 18. In a sentence: the record told as one line of text, the numbers
   carrying the colour. */
function Sentence() {
  const parts = DATA_TYPES.map((x) => ({
    n: x.count,
    word: x.label.toLowerCase(),
  }))
  return (
    <Ready art={80}>
      <Text style={t.sentence}>
        We found{" "}
        {parts.map((p, i) => (
          <Text key={p.word}>
            <Text style={t.sentenceNumber}>{p.n}</Text> {p.word}
            {i < parts.length - 2
              ? ", "
              : i === parts.length - 2
                ? " and "
                : ""}
          </Text>
        ))}
        , from <Text style={t.sentenceNumber}>{SOURCES.length}</Text> providers
        going back to <Text style={t.sentenceNumber}>2019</Text>.
      </Text>
      <View style={t.sourceChips}>
        {SOURCES.map((x) => (
          <View key={x.name} style={s.pill}>
            <View style={[s.dot, { backgroundColor: color.ok }]} />
            <Text style={s.pillLabel}>{x.name.split(" ")[0]}</Text>
          </View>
        ))}
      </View>
    </Ready>
  )
}

/* 19. Deck: a fanned stack, one kind of record per card; tap to deal the
   next one to the top. */
const DECK_TONES = [color.primary, "#7FB3BC", color.primaryHalo]

function DeckTop({ item, index }: { item: Item; index: number }) {
  const rise = React.useRef(new Animated.Value(0)).current
  React.useEffect(() => {
    Animated.spring(rise, {
      toValue: 1,
      friction: 7,
      tension: 80,
      useNativeDriver: native,
    }).start()
  }, [rise])
  return (
    <Animated.View
      style={[
        t.deckCard,
        t.deckTop,
        {
          backgroundColor: DECK_TONES[0],
          transform: [
            {
              translateY: rise.interpolate({
                inputRange: [0, 1],
                outputRange: [-16, 0],
              }),
            },
            {
              scale: rise.interpolate({
                inputRange: [0, 1],
                outputRange: [0.94, 1],
              }),
            },
          ],
        },
      ]}
    >
      <View style={t.deckHead}>
        <View style={t.deckIcon}>
          <RecordIcon name={item.icon} size={24} color={color.onPrimary} />
        </View>
        <Text style={t.deckIndex}>
          {index + 1} of {DATA_TYPES.length}
        </Text>
      </View>
      <View style={s.flex} />
      <Text style={t.deckValue}>{item.count}</Text>
      <Text style={t.deckLabel}>{item.label}</Text>
    </Animated.View>
  )
}

function Deck() {
  const [at, setAt] = React.useState(0)
  const n = DATA_TYPES.length
  return (
    <Ready art={80}>
      <Summary />
      <Pressable
        onPress={() => setAt((i) => (i + 1) % n)}
        accessibilityRole="button"
        accessibilityLabel="Next kind of record"
        style={t.deck}
      >
        {[2, 1].map((k) => (
          <View
            key={k}
            style={[
              t.deckCard,
              {
                backgroundColor: DECK_TONES[k],
                transform: [
                  { translateY: -k * 14 },
                  { scale: 1 - k * 0.06 },
                  { rotate: k === 1 ? "-3deg" : "4deg" },
                ],
              },
            ]}
          />
        ))}
        <DeckTop key={at} item={DATA_TYPES[at]} index={at} />
      </Pressable>
    </Ready>
  )
}

/* 20. Assistant: the news arrives as a short conversation, a message at a
   time, with replies to pick from. */
function Assistant() {
  const [shown, setShown] = React.useState(0)
  React.useEffect(() => {
    if (shown >= 4) return
    const timer = setTimeout(
      () => setShown((x) => x + 1),
      shown === 0 ? 400 : 900
    )
    return () => clearTimeout(timer)
  }, [shown])
  const flagged = FINDINGS.length
  const lead = [
    type("Observation.lab"),
    type("Observation.vital"),
    type("Encounter"),
  ]
  return (
    <Ready art={80}>
      <View style={t.chat}>
        {shown >= 1 && (
          <Bubble>
            <Text style={t.msg}>
              Your record is in. I found{" "}
              <Text style={t.msgStrong}>{TOTAL} records</Text> from{" "}
              {SOURCES.length} providers.
            </Text>
          </Bubble>
        )}
        {shown >= 2 && (
          <Bubble>
            <View style={t.msgChips}>
              {lead.map((x) => (
                <View key={x.key} style={t.msgChip}>
                  <Text style={s.pillLabel}>{x.label}</Text>
                  <Text style={s.pillCount}>{x.count}</Text>
                </View>
              ))}
              <View style={t.msgChip}>
                <Text style={s.pillLabel}>
                  {DATA_TYPES.length - lead.length} more kinds
                </Text>
              </View>
            </View>
          </Bubble>
        )}
        {shown >= 3 && (
          <Bubble>
            <Text style={t.msg}>
              <Text style={t.msgStrong}>{flagged} results</Text> are outside the
              usual range. Want me to walk you through them?
            </Text>
          </Bubble>
        )}
        {shown < 3 && <Typing />}
        {shown >= 4 && (
          <View style={t.replies}>
            {["Walk me through", "Later"].map((r) => (
              <Pressable
                key={r}
                onPress={done}
                style={({ pressed }) => [t.reply, pressed && t.replyPressed]}
              >
                <Text style={t.replyText}>{r}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </Ready>
  )
}

function Bubble({ children }: { children: React.ReactNode }) {
  const rise = React.useRef(new Animated.Value(0)).current
  React.useEffect(() => {
    Animated.timing(rise, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: native,
    }).start()
  }, [rise])
  return (
    <Animated.View
      style={[
        t.msgRow,
        {
          opacity: rise,
          transform: [
            {
              translateY: rise.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={t.avatar}>
        <IconSparkle size={14} color={color.onPrimary} />
      </View>
      <View style={t.bubbleMsg}>{children}</View>
    </Animated.View>
  )
}

function Typing() {
  const beat = React.useRef(new Animated.Value(0)).current
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(beat, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: native,
      })
    )
    loop.start()
    return () => loop.stop()
  }, [beat])
  return (
    <View style={t.msgRow}>
      <View style={t.avatar}>
        <IconSparkle size={14} color={color.onPrimary} />
      </View>
      <View style={[t.bubbleMsg, t.typing]}>
        {[0, 1, 2].map((i) => (
          <Animated.View
            key={i}
            style={[
              t.typingDot,
              {
                opacity: beat.interpolate({
                  inputRange: [0, (i + 0.5) / 4, (i + 1.5) / 4, 1],
                  outputRange: [0.3, 1, 0.3, 0.3],
                  extrapolate: "clamp",
                }),
              },
            ]}
          />
        ))}
      </View>
    </View>
  )
}

export const RECORD_READY_VARIANTS = [
  { id: "grid", title: "Grid", Screen: Grid },
  { id: "hero", title: "Hero number", Screen: HeroNumber },
  { id: "providers", title: "By provider", Screen: ByProvider },
  { id: "composition", title: "Composition bar", Screen: Composition },
  { id: "grouped", title: "Grouped panels", Screen: Grouped },
  { id: "stood-out", title: "What stood out", Screen: StoodOut },
  { id: "receipt", title: "Receipt", Screen: Receipt },
  { id: "bento", title: "Bento", Screen: Bento },
  { id: "timeline", title: "Stats and timeline", Screen: Timeline },
  { id: "next", title: "What happens next", Screen: NextSteps },
  { id: "ring", title: "Ring", Screen: Ring },
  { id: "waffle", title: "One dot per record", Screen: Waffle },
  { id: "treemap", title: "Treemap", Screen: Treemap },
  { id: "bubbles", title: "Bubbles", Screen: Bubbles },
  { id: "connections", title: "Connections", Screen: Connections },
  { id: "carousel", title: "Carousel", Screen: Carousel },
  { id: "count-up", title: "Count up", Screen: CountUp },
  { id: "sentence", title: "In a sentence", Screen: Sentence },
  { id: "deck", title: "Card deck", Screen: Deck },
  { id: "assistant", title: "Assistant message", Screen: Assistant },
] as const

const s = StyleSheet.create({
  flex: { flex: 1 },

  switcher: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 40,
    padding: 4,
    borderRadius: 999,
    backgroundColor: color.canvas,
  },
  switchArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.background,
  },
  switchPressed: { backgroundColor: color.border },
  switchLabel: {
    minWidth: 150,
    textAlign: "center",
    fontFamily: font.medium,
    fontSize: 14,
    color: color.text,
  },
  switchCount: { fontFamily: font.semibold, color: color.primary },
  tile: { alignItems: "center", justifyContent: "center" },

  summary: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 8,
    backgroundColor: color.primaryTint,
    borderRadius: 18,
    paddingVertical: 16,
  },
  summaryValue: {
    fontFamily: font.semibold,
    fontSize: 28,
    letterSpacing: -0.6,
    color: color.primary,
  },
  summaryText: { fontFamily: font.medium, fontSize: 15, color: color.text },

  panel: {
    backgroundColor: color.canvas,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  rule: { borderBottomWidth: 1, borderBottomColor: color.border },
  rowBody: { flex: 1, gap: 2 },
  rowLabel: { fontFamily: font.medium, fontSize: 15, color: color.text },
  meta: { fontFamily: font.regular, fontSize: 13, color: color.muted },
  count: {
    fontFamily: font.semibold,
    fontSize: 17,
    color: color.text,
    textAlign: "right",
  },
  value: { fontFamily: font.medium, fontSize: 14, color: color.muted },
  status: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridCell: {
    flexBasis: "30%",
    flexGrow: 1,
    backgroundColor: color.canvas,
    borderRadius: 18,
    padding: 12,
    gap: 4,
  },
  gridCellSmall: {
    flexBasis: "30%",
    flexGrow: 1,
    backgroundColor: color.canvas,
    borderRadius: 16,
    padding: 12,
    gap: 2,
  },
  gridValue: {
    fontFamily: font.semibold,
    fontSize: 20,
    letterSpacing: -0.4,
    color: color.text,
    marginTop: 6,
  },
  gridLabel: { fontFamily: font.regular, fontSize: 13, color: color.muted },

  hero: { alignItems: "center", gap: 2, marginTop: -12 },
  heroValue: {
    fontFamily: font.semibold,
    fontSize: 64,
    lineHeight: 72,
    letterSpacing: -2,
    color: color.primary,
  },
  heroText: { fontFamily: font.medium, fontSize: 15, color: color.text },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: color.canvas,
  },
  pillLabel: { fontFamily: font.medium, fontSize: 13.5, color: color.text },
  pillCount: {
    fontFamily: font.semibold,
    fontSize: 13.5,
    color: color.primary,
  },

  compHead: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    paddingTop: 12,
  },
  compValue: {
    fontFamily: font.semibold,
    fontSize: 28,
    letterSpacing: -0.6,
    color: color.text,
  },
  stack: {
    flexDirection: "row",
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
    gap: 2,
    marginTop: 12,
  },
  legend: { paddingVertical: 8 },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  legendCount: {
    fontFamily: font.semibold,
    fontSize: 15,
    color: color.text,
    minWidth: 28,
    textAlign: "right",
  },

  okPanel: { backgroundColor: color.okTint },

  receiptRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 9,
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: color.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  receiptCount: { fontFamily: font.medium, fontSize: 15, color: color.muted },
  receiptTotal: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: color.border,
    borderStyle: "dashed",
    paddingVertical: 12,
    marginTop: 4,
  },
  totalLabel: { fontFamily: font.semibold, fontSize: 16, color: color.text },
  totalValue: { fontFamily: font.semibold, fontSize: 20, color: color.primary },
  centredMeta: {
    fontFamily: font.regular,
    fontSize: 13,
    color: color.muted,
    textAlign: "center",
    marginTop: -16,
  },

  bento: { flexDirection: "row", gap: 10, height: 176 },
  bentoLead: {
    flex: 1.1,
    backgroundColor: color.primaryTint,
    borderRadius: 20,
    padding: 14,
  },
  bentoLeadValue: {
    fontFamily: font.semibold,
    fontSize: 40,
    letterSpacing: -1.2,
    color: color.primary,
  },
  bentoPair: { flex: 1, gap: 10 },
  bentoMid: {
    flex: 1,
    backgroundColor: color.canvas,
    borderRadius: 20,
    padding: 14,
    justifyContent: "space-between",
  },
  bentoMidHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bentoMidValue: {
    fontFamily: font.semibold,
    fontSize: 24,
    letterSpacing: -0.6,
    color: color.text,
  },

  stats: {
    flexDirection: "row",
    backgroundColor: color.canvas,
    borderRadius: 20,
    paddingVertical: 16,
  },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statValue: {
    fontFamily: font.semibold,
    fontSize: 26,
    letterSpacing: -0.6,
    color: color.primary,
  },
  tlRow: { flexDirection: "row", gap: 14 },
  tlRail: { width: 12, alignItems: "center" },
  tlDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: color.primary,
    marginTop: 3,
  },
  tlLine: {
    flex: 1,
    width: 2,
    backgroundColor: color.primaryHalo,
    marginVertical: 4,
  },
  tlBody: { flex: 1, gap: 2 },
  tlGap: { paddingBottom: 22 },

  strip: { flexDirection: "row", justifyContent: "space-between" },
  stripItem: { flex: 1, alignItems: "center", gap: 2 },
  stripValue: { fontFamily: font.semibold, fontSize: 18, color: color.text },
  stripLabel: { fontFamily: font.regular, fontSize: 12, color: color.muted },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: color.background,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    fontFamily: font.semibold,
    fontSize: 13,
    color: color.primary,
  },
})

const t = StyleSheet.create({
  onDark: { color: color.onPrimary },

  legendGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 12,
    columnGap: 16,
  },
  legendCell: {
    flexBasis: "45%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendCount: {
    marginLeft: "auto",
    fontFamily: font.semibold,
    fontSize: 15,
    color: color.text,
  },

  ring: { alignSelf: "center", alignItems: "center", justifyContent: "center" },
  ringArt: { width: 84, height: 84, marginBottom: -4 },
  ringValue: {
    fontFamily: font.semibold,
    fontSize: 30,
    letterSpacing: -0.8,
    color: color.text,
  },

  waffle: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingTop: 14,
    paddingBottom: 14,
  },

  treeBox: { position: "absolute", padding: 3 },
  treeFill: {
    flex: 1,
    borderRadius: 14,
    padding: 10,
    justifyContent: "flex-end",
  },
  treeValue: { fontFamily: font.semibold, fontSize: 18, letterSpacing: -0.4 },
  treeValueLead: { fontSize: 44, letterSpacing: -1.4 },
  treeLabel: { fontFamily: font.medium, fontSize: 12.5 },
  treeIcon: { position: "absolute", top: 10, left: 10 },

  bubbles: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  bubble: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    backgroundColor: color.primaryTint,
  },
  bubbleMid: { backgroundColor: "#7FB3BC" },
  bubbleLead: { backgroundColor: color.primary },
  bubbleValue: {
    fontFamily: font.semibold,
    fontSize: 18,
    color: color.primary,
  },
  bubbleValueLead: { fontSize: 40, letterSpacing: -1.2 },
  bubbleLabel: {
    fontFamily: font.medium,
    fontSize: 11.5,
    color: color.text,
    maxWidth: "100%",
  },

  hub: {
    position: "absolute",
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: color.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  hubValue: {
    fontFamily: font.semibold,
    fontSize: 26,
    letterSpacing: -0.6,
    color: color.onPrimary,
  },
  hubLabel: {
    fontFamily: font.medium,
    fontSize: 12,
    color: color.onPrimary,
    opacity: 0.85,
  },
  node: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: color.background,
    borderWidth: 2,
    borderColor: color.primaryHalo,
    alignItems: "center",
    justifyContent: "center",
  },
  nodeText: { position: "absolute", width: 140, alignItems: "center", gap: 1 },
  nodeName: { fontFamily: font.semibold, fontSize: 15, color: color.text },

  carouselWrap: { marginHorizontal: -gutter },
  carousel: { gap: 12, paddingHorizontal: gutter },
  slide: {
    height: 230,
    borderRadius: 24,
    padding: 18,
    backgroundColor: color.canvas,
  },
  slideLead: { backgroundColor: color.primary },
  slideValue: {
    fontFamily: font.semibold,
    fontSize: 60,
    lineHeight: 66,
    letterSpacing: -2,
    color: color.primary,
  },
  slideLabel: { fontFamily: font.medium, fontSize: 17, color: color.text },
  pager: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: -16,
  },
  pagerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: color.border,
  },
  pagerDotOn: { width: 18, backgroundColor: color.primary },

  bars: { gap: 14 },
  barRow: { gap: 6 },
  barHead: { flexDirection: "row", justifyContent: "space-between" },
  barLabel: { fontFamily: font.medium, fontSize: 14, color: color.text },
  barCount: { fontFamily: font.semibold, fontSize: 14, color: color.text },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: color.canvas,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 3, backgroundColor: color.primary },

  sentence: {
    fontFamily: font.medium,
    fontSize: 24,
    lineHeight: 36,
    letterSpacing: -0.5,
    color: color.muted,
  },
  sentenceNumber: { fontFamily: font.semibold, color: color.primary },
  sourceChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  deck: { height: 280, paddingTop: 30 },
  deckCard: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 30,
    height: 240,
    borderRadius: 26,
  },
  deckTop: { padding: 20 },
  deckHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  deckIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  deckIndex: {
    fontFamily: font.medium,
    fontSize: 13,
    color: color.onPrimary,
    opacity: 0.85,
  },
  deckValue: {
    fontFamily: font.semibold,
    fontSize: 64,
    lineHeight: 70,
    letterSpacing: -2,
    color: color.onPrimary,
  },
  deckLabel: { fontFamily: font.medium, fontSize: 18, color: color.onPrimary },

  chat: { gap: 12 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: color.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleMsg: {
    flexShrink: 1,
    backgroundColor: color.canvas,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  msg: {
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 22,
    color: color.text,
  },
  msgStrong: { fontFamily: font.semibold, color: color.primary },
  msgChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  msgChip: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    height: 30,
    alignItems: "center",
    borderRadius: 999,
    backgroundColor: color.background,
  },
  typing: { flexDirection: "row", gap: 5, paddingVertical: 15 },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: color.muted,
  },
  replies: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 4,
  },
  reply: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: color.primary,
    justifyContent: "center",
  },
  replyPressed: { backgroundColor: color.primaryTint },
  replyText: { fontFamily: font.medium, fontSize: 14, color: color.primary },
})
