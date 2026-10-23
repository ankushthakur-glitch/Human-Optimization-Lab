import type { useOnboarding } from "@/lib/onboarding"
import { dayFrom, localDay } from "@/lib/member"

/* The six topics of every plan (Journey_14 screens 28 to 40): Exercise,
   Eat, Sleep, Mind, Medication and Measure. Every optimization plan
   instantiates the same six, so days stay comparable and a new programme
   lands in an existing row; what changes patient to patient is the target
   on each line and which programme paid for it. This file holds the sample
   patient's six (Dr. Patel's weight plan) the way lib/member.ts holds her
   sample day: the Today list, the four ways to answer each topic, the
   findings, the starting point and the review of the day before. What she
   does on the screens is kept in the store (`topicLog`, `startingPoint`,
   `measures`, `entries`). */

type Store = ReturnType<typeof useOnboarding>

export type TopicId = "exercise" | "eat" | "sleep" | "mind" | "medication" | "measure"

/** How a figure reads: green is done or on target, amber short, red missed. */
export type Tone = "good" | "warn" | "bad" | "plain"

export type IconKey = "exercise" | "eat" | "sleep" | "mind" | "medication" | "measure" | "check" | "pencil" | "mic" | "import" | "search" | "camera" | "upload" | "phone" | "device"

/** What a way does when she taps it. `done` answers the topic and says so on
    Today; `go` opens the screen that already does it; `ask` hands it to the
    assistant in her own words; `sheet` opens the measurements sheet. */
export type Act =
  | { kind: "done" }
  | { kind: "go"; href: string; params?: Record<string, string> }
  | { kind: "ask"; ask: string }
  | { kind: "sheet" }

export type Way = { id: string; title: string; says: string; badge: string; tone: "good" | "warn" | "info"; icon: IconKey; act: Act }

export type Topic = {
  id: TopicId
  name: string
  /** The programme behind the line, as the chip beside the name. */
  tag: string
  tagTone: "red" | "amber" | "green" | "grey"
  /** The line on Today and the dark target card. */
  target: string
  /** Under the target on its own page. */
  detail: string
  /** Where it stands this morning: the figure on the right of its row. */
  state: { text: string; tone: Tone; note: string }
  /** What the row says once she has answered it. */
  answered: { text: string; note: (at: string) => string }
  /** The target card's figure on the topic page. */
  figure: string
  intro: string
  ways: Way[]
  tip: string
  foot: string
  /** Counts as done on Today before she does anything (already answered). */
  done?: boolean
}

const FOUR = "Today's target, and four ways to answer it. Every topic on the Today list opens the same four."

export const TOPICS: Topic[] = [
  {
    id: "exercise",
    name: "Exercise",
    tag: "Weight loss",
    tagTone: "red",
    target: "Upper body + 30 min Zone 2",
    detail: "Week 4 · your third upper-body session",
    state: { text: "55 min", tone: "plain", note: "Not started" },
    answered: { text: "55 min", note: (at) => `Completed ${at}` },
    figure: "55 min",
    intro: "Today's session in full, then four ways to answer it.",
    ways: [
      { id: "written", title: "Do it as written", says: "All four lifts, then the cardio block", badge: "Scores 100% for today", tone: "good", icon: "check", act: { kind: "done" } },
      { id: "part", title: "Do part of it", says: "Log what you actually finished", badge: "Scores on what you did", tone: "warn", icon: "pencil", act: { kind: "go", href: "/exercise" } },
      { id: "easier", title: "Ask for an easier version", says: "Say why, out loud — it rebuilds", badge: "No one to call", tone: "info", icon: "mic", act: { kind: "ask", ask: "Today's session is too much. Can you make it easier?" } },
      { id: "own", title: "Upload your own programme", says: "Or connect the app it already lives in", badge: "We monitor yours", tone: "info", icon: "upload", act: { kind: "go", href: "/connections" } },
    ],
    tip: "",
    foot: "Tap Form on any lift to see how it is done. Loads step up from what you did last time.",
  },
  {
    id: "eat",
    name: "Eat",
    tag: "Weight loss",
    tagTone: "red",
    target: "−500 cal · 150 g protein · 1,000 mg calcium",
    detail: "1,000 mg calcium · three meals already built",
    state: { text: "1 of 3", tone: "warn", note: "Breakfast logged" },
    answered: { text: "3 of 3", note: () => "Every meal logged" },
    figure: "1 of 3",
    intro: FOUR,
    ways: [
      { id: "database", title: "Pick from the meal database", says: "Pre-planned meals, one tap to add", badge: "Macros already known", tone: "good", icon: "search", act: { kind: "go", href: "/log-meal", params: { via: "type" } } },
      { id: "photo", title: "Photograph the plate", says: "Snap it and we read the macros", badge: "Scores what you ate", tone: "warn", icon: "camera", act: { kind: "go", href: "/log-meal", params: { via: "scan" } } },
      { id: "say", title: "Say what you ate", says: "Out loud, in your own words", badge: "Nothing to type", tone: "good", icon: "mic", act: { kind: "ask", ask: "Here is what I ate today: " } },
      { id: "import", title: "Import from another app", says: "Apple Health, MyFitnessPal, Cronometer", badge: "Posts itself", tone: "info", icon: "import", act: { kind: "go", href: "/connections" } },
    ],
    tip: "Four ways in, one record out. Every meal lands on the same timeline as your blood panel.",
    foot: "Swapping a meal inside today's plan keeps the targets intact — the assistant rebalances the other two meals rather than letting the day drift.",
  },
  {
    id: "sleep",
    name: "Sleep",
    tag: "Sleep",
    tagTone: "amber",
    target: "In bed by 10:30, CPAP all night",
    detail: "Seven and a half hours, device worn",
    state: { text: "6 h 10 m", tone: "bad", note: "Short by 1 h 20 m" },
    answered: { text: "Window set", note: (at) => `Tonight's window, ${at}` },
    figure: "6 h 10 m",
    intro: "Last night scored, then four ways to answer tonight.",
    ways: [
      { id: "window", title: "Follow tonight's window", says: "In bed 10:30, up at 6:00", badge: "Scores 100% for tonight", tone: "good", icon: "check", act: { kind: "done" } },
      { id: "log", title: "Log what actually happened", says: "Time in bed, and the times you woke", badge: "Scores on actual", tone: "warn", icon: "pencil", act: { kind: "ask", ask: "Last night I got into bed at " } },
      { id: "shift", title: "Ask to shift the window", says: "A late flight, a sick child — say why", badge: "Rebuilds tonight", tone: "info", icon: "mic", act: { kind: "ask", ask: "I need to shift tonight's sleep window because " } },
      { id: "device", title: "Connect your device", says: "CPAP, Oura, Apple Watch, Eight Sleep", badge: "Logged for you", tone: "info", icon: "device", act: { kind: "go", href: "/connections" } },
    ],
    tip: "",
    foot: "The score and the adherence post straight from the devices. Neither is self-reported.",
  },
  {
    id: "mind",
    name: "Mind",
    tag: "Anxiety",
    tagTone: "green",
    target: "SMART relaxation response, 20 min",
    detail: "Week 3 of 8 · Benson–Henry Institute",
    state: { text: "Done", tone: "good", note: "Completed 7:10 am" },
    answered: { text: "Done", note: (at) => `Completed ${at}` },
    figure: "20 min",
    intro: FOUR,
    ways: [
      { id: "session", title: "Do today's session", says: "Twenty minutes, guided end to end", badge: "Scores 100% for today", tone: "good", icon: "check", act: { kind: "done" } },
      { id: "short", title: "Do the short version", says: "Eight minutes when the day is full", badge: "Partial credit", tone: "warn", icon: "pencil", act: { kind: "done" } },
      { id: "swap", title: "Swap the practice", says: "Say what is not working for you", badge: "Rebuilds the week", tone: "info", icon: "mic", act: { kind: "ask", ask: "The relaxation practice is not working for me because " } },
      { id: "own", title: "Log your own practice", says: "Yoga, prayer, a walk without a phone", badge: "Counts if you log it", tone: "good", icon: "mind", act: { kind: "ask", ask: "I did my own practice today: " } },
    ],
    tip: "The eight weeks are delivered and evaluated by AI. No part of this topic requires a clinician's time, which is what holds the programme at $100.",
    foot: "Irritability is re-scored on the same 0–10 scale she set at the start. That pair is the only evidence the programme did anything.",
    done: true,
  },
  {
    id: "medication",
    name: "Medication & supplements",
    tag: "All plans",
    tagTone: "grey",
    target: "Metformin, vitamin D · 3 supplements",
    detail: "Prescribed by Dr. Patel · evening dose at 7 pm",
    state: { text: "Morning", tone: "warn", note: "Evening dose at 7 pm" },
    answered: { text: "Taken", note: (at) => `Logged ${at}` },
    figure: "Morning",
    intro: FOUR,
    ways: [
      { id: "taken", title: "Mark it taken", says: "One tap per dose", badge: "Scores 100% for today", tone: "good", icon: "check", act: { kind: "done" } },
      { id: "missed", title: "Mark a dose missed", says: "No judgement — we need the truth", badge: "Logged honestly", tone: "warn", icon: "pencil", act: { kind: "done" } },
      { id: "side", title: "Report a side effect", says: "Say what happened, in your words", badge: "Goes to Dr. Patel", tone: "good", icon: "phone", act: { kind: "ask", ask: "I want to report a side effect: " } },
      { id: "photo", title: "Photograph a new one", says: "A medication or supplement label", badge: "Checked for interactions", tone: "good", icon: "camera", act: { kind: "go", href: "/medications" } },
    ],
    tip: "",
    foot: "Pharmacy sync posts fills and refills on its own. Supplements sync from the label you photograph.",
    done: false,
  },
  {
    id: "measure",
    name: "Measure",
    tag: "All plans",
    tagTone: "grey",
    target: "Weight and waist, Mondays",
    detail: "Last entered October 6 · 178 lb, 36.5″",
    state: { text: "Done", tone: "good", note: "178 lb · 36.5″" },
    answered: { text: "Done", note: () => "Entered today" },
    figure: "Weekly",
    intro: FOUR,
    ways: [
      { id: "enter", title: "Enter today's numbers", says: "Weight, waist, blood pressure", badge: "Scores 100% for today", tone: "good", icon: "check", act: { kind: "sheet" } },
      { id: "skip", title: "Skip today", says: "Say why — the gap stays in the series", badge: "No penalty", tone: "warn", icon: "pencil", act: { kind: "ask", ask: "I am skipping today's measurements because " } },
      { id: "cadence", title: "Change the cadence", says: "Weekly is heavy for some; ask for monthly", badge: "Rebuilds the schedule", tone: "info", icon: "mic", act: { kind: "ask", ask: "Can I measure monthly instead of weekly?" } },
      { id: "device", title: "Connect a scale or cuff", says: "Withings, Omron, Apple Health", badge: "Posts itself", tone: "info", icon: "device", act: { kind: "go", href: "/connections" } },
    ],
    tip: "A skipped week is recorded as a skipped week. The chart keeps the gap rather than drawing a line through it, because a straight line nobody measured is a lie.",
    foot: "These are the figures the baseline on the starting point was built from. Every number on Progress is paired with the one entered on day one.",
    done: true,
  },
]

export const topicOf = (id: string | undefined) => TOPICS.find((t) => t.id === id)

/** Today's note above the list: the plan moving by itself. */
export const TODAY_INSIGHT = "You slept 6 h 10 m, so today's Zone 2 is ten minutes lighter and caffeine stops at noon."

/** The next thing due today, above the six: the evening dose, moved to 7 pm
    after last night's miss (see HANDOVER). One tap logs it on Medication. */
export const NEXT_UP = { topic: "medication", title: "Evening metformin, 7 pm", note: "Missed last night, so a reminder is set" } as const

/** What the day holds in Care, below the six. */
export const CARE_TODAY = { title: "Nothing due in Care today", next: "Next: DEXA re-scan, Friday October 9 at 8:15 am" }

/** The topic's row today: her answer if she gave one, else where it stands. */
export function rowOf(s: Store, t: Topic, day = localDay()) {
  const logged = s.topicLog?.[day]?.[t.id]
  if (logged) return { done: true, text: t.answered.text, tone: "good" as Tone, note: t.answered.note(clockWords(logged.at)) }
  return { done: !!t.done, text: t.state.text, tone: t.state.tone, note: t.state.note }
}

export const doneCount = (s: Store, day = localDay()) => TOPICS.filter((t) => rowOf(s, t, day).done).length

const clockWords = (at: string) => new Date(at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(" AM", " am").replace(" PM", " pm")

/* ---------------------------------------------------------------- tests -- */

/** What the four baseline tests found, led by the sleep study that paid for
    itself (screen 28). */
export const FINDINGS: { icon: IconKey; title: string; sub: string; bad: boolean }[] = [
  { icon: "sleep", title: "Moderate sleep apnoea · AHI 18", sub: "Home sleep study — why you wake at three", bad: true },
  { icon: "measure", title: "Body fat 41%, lean mass low", sub: "DEXA", bad: false },
  { icon: "eat", title: "Resting metabolism 1,310 kcal", sub: "RMR — below predicted", bad: false },
  { icon: "medication", title: "Fasting insulin 18, hs-CRP 4.2", sub: "Blood panel — ferritin 46, B12 low normal", bad: false },
  { icon: "mind", title: "Irritability, most days", sub: "What you told us — no test would have found it", bad: false },
]

/** The four results carried into the starting point (screen 29). */
export const TEST_RESULTS = [
  { label: "Body fat", value: "41", unit: "%", via: "DEXA" },
  { label: "Sleep, AHI", value: "18", via: "Home sleep study" },
  { label: "Metabolism", value: "1,310", unit: "kcal", via: "RMR" },
  { label: "hs-CRP", value: "4.2", via: "Blood panel" },
]

/** The three symptoms she named at the start, scored 0 to 10 today. */
export const SYMPTOMS: { id: "wake" | "irritable" | "gain"; name: string; note: string; start: number; tone: Tone }[] = [
  { id: "wake", name: "Waking at three", note: "you said this first", start: 8, tone: "bad" },
  { id: "irritable", name: "Irritability", note: "most days", start: 7, tone: "bad" },
  { id: "gain", name: "Weight gain", note: "since the spring", start: 6, tone: "warn" },
]

/* ------------------------------------------------------------- progress -- */

/** Day one and today (Journey screen 48): every comparison is dated, the left
    column is always day one and the right is always today. */
export const DAY_ONE = {
  started: "Jul 1, 2026",
  today: "Oct 6, 2026",
  day: 97,
  range: "Jul 1 to Oct 6",
  goalWeight: 158,
} as const

export type Pair = { name: string; via: string; from: string; to: string; unit?: string; spoken: string }

/** The five test findings, then and now. */
export const RETESTED: Pair[] = [
  { name: "Sleep apnoea, AHI", via: "Home sleep study", from: "18", to: "11", spoken: "18 to 11" },
  { name: "Body fat", via: "DEXA", from: "41%", to: "37.9%", spoken: "41 percent to 37.9 percent" },
  { name: "Resting metabolism", via: "RMR", from: "1,310", to: "1,480", unit: "kcal", spoken: "1,310 to 1,480 kilocalories, higher is better" },
  { name: "Fasting insulin", via: "Blood panel", from: "18", to: "12", spoken: "18 to 12" },
  { name: "hs-CRP", via: "Blood panel", from: "4.2", to: "2.1", spoken: "4.2 to 2.1" },
]

/** The three symptoms she named, re-scored on her own 0 to 10 scale at week
    12 (lower is better). Keyed to SYMPTOMS. */
export const RESCORED: Record<(typeof SYMPTOMS)[number]["id"], number> = { wake: 2, irritable: 3, gain: 2 }

/** What she measures at home, against what she entered on day one. */
export const AT_HOME: Pair[] = [
  { name: "Weight", via: "Goal 158 lb", from: "178", to: "165.6", unit: "lb", spoken: "178 to 165.6 pounds" },
  { name: "Waist", via: "Monthly check", from: "36.5\"", to: "34.0\"", spoken: "36.5 to 34.0 inches" },
]

/** The two headline figures above the tests. */
export const HEADLINES = {
  weight: { lost: 12.4, from: 178 },
  fat: { down: 3.1, from: 41 },
} as const

/* ---------------------------------------------------------------- sleep -- */

export const SLEEP_LAST = {
  score: 64,
  line: "Fair. Seven-night average 71 · the week you started, 52.",
  parts: [
    { name: "Duration", value: "6 h 10 m", verdict: "1 h 20 short", tone: "warn" as Tone },
    { name: "Efficiency", value: "88% asleep", verdict: "good", tone: "good" as Tone },
    { name: "To bed at", value: "11:50 pm", verdict: "80 min late", tone: "warn" as Tone },
    { name: "CPAP worn", value: "5 h 40 m", verdict: "92% of the night", tone: "good" as Tone },
  ],
}

/* ------------------------------------------------------------- exercise -- */

export type Lift = { id: string; name: string; load: number; last: string; sets: string; cues: string[]; mistakes: { name: string; fix: string }[]; steps: { name: string; cue: string }[]; poses: Pose[] }

/** One still: a head, and the limbs as paths on a 40 by 60 drawing. */
export type Pose = { head: [number, number]; limbs: string[]; weight?: [number, number] }

const STAND: Pose = { head: [20, 7], limbs: ["M20 13 L20 33", "M20 33 L18 46 L18 58", "M20 33 L22 46 L22 58", "M20 18 L16 28"], weight: [16, 29] }
const DESCEND: Pose = { head: [21, 12], limbs: ["M21 18 L19 34", "M19 34 L27 40 L20 56", "M20 22 L26 27"], weight: [27, 28] }
const BOTTOM: Pose = { head: [23, 20], limbs: ["M23 26 L16 40", "M16 40 L28 44 L22 56", "M22 30 L28 33"], weight: [29, 34] }
const HINGE_UP: Pose = { head: [20, 7], limbs: ["M20 13 L20 33", "M20 33 L19 46 L19 58", "M20 18 L21 32"], weight: [21, 34] }
const HINGE_DOWN: Pose = { head: [31, 24], limbs: ["M27 26 L16 33", "M16 33 L18 46 L18 58", "M27 28 L28 42"], weight: [28, 44] }
const BENCH_UP: Pose = { head: [6, 40], limbs: ["M10 42 L34 42", "M34 42 L38 50 L38 56", "M16 42 L16 22"], weight: [16, 20] }
const BENCH_DOWN: Pose = { head: [6, 40], limbs: ["M10 42 L34 42", "M34 42 L38 50 L38 56", "M16 42 L22 36 L16 34"], weight: [16, 32] }
const ROW_OUT: Pose = { head: [14, 14], limbs: ["M16 20 L28 34", "M28 34 L22 46 L22 58", "M16 22 L6 28"], weight: [5, 29] }
const ROW_IN: Pose = { head: [14, 14], limbs: ["M16 20 L28 34", "M28 34 L22 46 L22 58", "M16 22 L20 30 L12 30"], weight: [10, 31] }

export const LIFTS: Lift[] = [
  {
    id: "goblet-squat",
    name: "Goblet squat",
    load: 35,
    last: "30 lb",
    sets: "3 × 10",
    steps: [
      { name: "Start", cue: "Weight at chest" },
      { name: "Descend", cue: "Hips back first" },
      { name: "Bottom", cue: "Thighs parallel" },
    ],
    poses: [STAND, DESCEND, BOTTOM],
    cues: [
      "Hold the weight at your chest, **elbows tucked in**, feet a little wider than your hips.",
      "Send your hips back, then down. **Keep your chest up** and your weight through your mid-foot.",
      "Stop when your thighs are parallel to the floor, then **drive up through your heels**.",
    ],
    mistakes: [
      { name: "Knees caving in", fix: "push them out over your toes" },
      { name: "Heels lifting off the floor", fix: "sit back, not forward" },
    ],
  },
  {
    id: "db-bench",
    name: "Dumbbell bench press",
    load: 20,
    last: "17.5 lb",
    sets: "3 × 8",
    steps: [
      { name: "Start", cue: "Arms straight up" },
      { name: "Lower", cue: "Elbows at 45°" },
      { name: "Press", cue: "Drive back up" },
    ],
    poses: [BENCH_UP, BENCH_DOWN, BENCH_UP],
    cues: [
      "Lie back with your **feet flat** and a dumbbell over each shoulder, arms straight.",
      "Lower slowly until your **elbows are just below the bench**, wrists stacked over elbows.",
      "Press up and slightly in, and **stop short of locking out** your elbows.",
    ],
    mistakes: [
      { name: "Elbows flaring wide", fix: "angle them about 45° from your body" },
      { name: "Back arching off the bench", fix: "keep your ribs down and feet planted" },
    ],
  },
  {
    id: "cable-row",
    name: "Seated cable row",
    load: 40,
    last: "same",
    sets: "3 × 12",
    steps: [
      { name: "Reach", cue: "Arms long" },
      { name: "Pull", cue: "Elbows back" },
      { name: "Squeeze", cue: "Shoulder blades together" },
    ],
    poses: [ROW_OUT, ROW_IN, ROW_IN],
    cues: [
      "Sit tall with a **soft bend in your knees**, arms long and shoulders down.",
      "Pull the handle to your lower ribs, **driving your elbows straight back**.",
      "Squeeze your shoulder blades together for a beat, then **let the weight stretch you forward** under control.",
    ],
    mistakes: [
      { name: "Leaning back to pull", fix: "keep your torso still and let your back do the work" },
      { name: "Shrugging up to your ears", fix: "think of sliding your shoulders into your back pockets" },
    ],
  },
  {
    id: "rdl",
    name: "Romanian deadlift",
    load: 45,
    last: "40 lb",
    sets: "3 × 10",
    steps: [
      { name: "Stand", cue: "Weight at your thighs" },
      { name: "Hinge", cue: "Hips back, back flat" },
      { name: "Stand tall", cue: "Squeeze your glutes" },
    ],
    poses: [HINGE_UP, HINGE_DOWN, HINGE_UP],
    cues: [
      "Stand with the weight at your thighs, a **soft bend in your knees**, and your back flat.",
      "Push your hips straight back and **slide the weight down your legs** until you feel your hamstrings stretch.",
      "Squeeze your glutes to **stand tall**, finishing with your hips under your shoulders.",
    ],
    mistakes: [
      { name: "Rounding the lower back", fix: "stop where your back stays flat" },
      { name: "Squatting the weight down", fix: "keep your shins close to vertical" },
    ],
  },
]

export const liftOf = (id: string | undefined) => LIFTS.find((l) => l.id === id)

export const WARMUP = { name: "Warm-up", detail: "5 min", say: "Easy bike" }
export const CARDIO = { name: "Zone 2 cardio", detail: "30 min", say: "HR 118–132" }

/* ----------------------------------------------------------- medication -- */

export const ALSO_TAKING = [
  { name: "Magnesium glycinate", dose: "400 mg, nightly", interacts: false },
  { name: "Fish oil", dose: "1,000 mg, with dinner", interacts: false },
  { name: "Berberine", dose: "500 mg, twice daily", interacts: true },
]

export const INTERACTION = {
  title: "Berberine and metformin both lower blood glucose",
  body: "Together they can push it too low. Do not start or stop either on your own.",
  bold: "Dr. Patel was notified in the physician portal",
  tail: " and will review it with you.",
}

/* -------------------------------------------------------------- measure -- */

export const SIX = [
  { id: "weight", label: "Weight", unit: "lb", was: "178.4", min: 70, max: 600 },
  { id: "chest", label: "Chest", unit: "in", was: "38.5", min: 20, max: 80 },
  { id: "waist", label: "Waist", unit: "in", was: "36.5", min: 20, max: 80 },
  { id: "hips", label: "Hips", unit: "in", was: "41.5", min: 20, max: 80 },
  { id: "thigh", label: "Thigh", unit: "in", was: "22.5", min: 10, max: 50 },
  { id: "arm", label: "Arm", unit: "in", was: "12.0", min: 6, max: 30 },
] as const

export type SixId = (typeof SIX)[number]["id"]

/* --------------------------------------------------------------- review -- */

/** Yesterday scored (screen 39): each topic against its own goal. */
export type TopicScore = { id: TopicId; score: number; line: string }

const YESTERDAY: TopicScore[] = [
  { id: "exercise", score: 100, line: "55 of 55 min · all four lifts" },
  { id: "eat", score: 88, line: "142 of 150 g protein · deficit met" },
  { id: "sleep", score: 64, line: "6 h 10 m of 7 h 30 · to bed 11:50" },
  { id: "mind", score: 100, line: "20 of 20 min · SMART completed" },
  { id: "medication", score: 50, line: "1 of 2 doses · evening missed" },
  { id: "measure", score: 100, line: "6 of 6 fields entered" },
]

/** The six scores of a day: yesterday is the sample day, an earlier one is
    the same day nudged by its date so the days differ and stay the same
    each time she opens them. */
export function topicScores(date: Date, now = new Date()): { scores: TopicScore[]; average: number } {
  const back = Math.round((dayFrom(localDay(now)).getTime() - dayFrom(localDay(date)).getTime()) / 86400000)
  const scores =
    back <= 1
      ? YESTERDAY
      : YESTERDAY.map((t, i) => {
          const wobble = ((date.getDate() * (i + 3) * 7) % 5) * 6 - 6
          const score = Math.max(30, Math.min(100, t.score + (t.score === 100 ? Math.min(wobble, 0) : wobble)))
          return { ...t, score, line: score === t.score ? t.line : "Short of its goal" }
        })
  return { scores, average: Math.round(scores.reduce((n, t) => n + t.score, 0) / scores.length) }
}

export const scoreTone = (n: number): Tone => (n >= 90 ? "good" : n >= 60 ? "warn" : "bad")

/** The note under yesterday: what it handed to today. */
export const HANDOVER = "Both misses are already in today's plan: the evening dose moved to 7 pm with a reminder, and tonight's window starts at 10:30."

/** The review's one-line verdict. */
export function verdictOf(scores: TopicScore[]) {
  const target = scores.filter((t) => t.score >= 90).length
  const low = scores.filter((t) => t.score < 70).sort((a, b) => a.score - b.score)
  const NAMES: Record<TopicId, string> = { exercise: "Exercise", eat: "Eating", sleep: "Sleep", mind: "Mind", medication: "the evening metformin", measure: "Measuring" }
  const words = ["Zero", "One", "Two", "Three", "Four", "Five", "Six"][target]
  const cost = low.length ? ` ${low.map((t) => NAMES[t.id]).join(" and ")} ${low.length > 1 ? "are the two that" : "is the one that"} cost you.` : ""
  return `${words} of six at target.${cost}`
}

/* -------------------------------------------------------------- numbers -- */

/** Yesterday's figures under the score (screen 40). */
export const NUMBERS = {
  day: "Oct 5",
  energy: [
    { label: "Food in", note: "target 1,740", value: 1690 },
    { label: "Resting metabolism", note: "RMR, measured", value: 1310 },
    { label: "Active energy", note: "from movement", value: 930 },
  ],
  out: 2240,
  deficit: { value: 550, target: 500, over: 50 },
  macros: [
    { label: "Protein", value: 142, of: 150 },
    { label: "Carbs", value: 148, of: 160 },
    { label: "Fat", value: 61, of: 58 },
  ],
  movement: [
    { label: "Active energy", value: "930", unit: "kcal", delta: "+180 kcal", icon: "exercise" as IconKey },
    { label: "Steps", value: "11,240", unit: "", delta: "+2,240", icon: "device" as IconKey },
    { label: "Exercise min", value: "55", unit: "", delta: "+10 min", icon: "exercise" as IconKey },
  ],
}

