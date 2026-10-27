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

export type IconKey = "exercise" | "eat" | "sleep" | "mind" | "medication" | "measure" | "check" | "pencil" | "mic" | "import" | "search" | "camera" | "upload" | "phone" | "device" | "shift" | "swap" | "practice" | "drink"

/** What a way does when she taps it. `done` answers the topic and says so on
    Today; `go` opens the screen that already does it; `ask` hands it to the
    assistant in her own words; `sheet` opens the measurements sheet; `part`
    opens the session's parts, each done or skipped; `short` how many
    minutes of the practice she did and what; `meal` asks which meal
    she is adding, then opens that way of logging it; `voice` asks the
    same, then listens while she says what she ate; `dose` opens one of
    Medication's sheets: tick the doses taken, log one missed, report a side
    effect to the physician, or photograph a new label; `night` opens
    Sleep's log of the night she actually had; `pick` the plan's pre-planned
    meals, one tap to add; `apps` the apps and devices the topic can post
    itself from, each connected in place (`upload` adds a file of her own
    programme above them). */
export type Act =
  | { kind: "done" }
  | { kind: "go"; href: string; params?: Record<string, string> }
  | { kind: "ask"; ask: string }
  | { kind: "sheet" }
  | { kind: "part" }
  | { kind: "short" }
  | { kind: "night" }
  | { kind: "meal" }
  | { kind: "voice" }
  | { kind: "dose"; sheet: "taken" | "missed" | "side" }
  | { kind: "pick" }
  | { kind: "apps"; title: string; apps: string[]; upload?: boolean }

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
  /** The figure on the target card's right; left out where the target already says how often. */
  figure?: string
  intro: string
  ways: Way[]
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
      { id: "part", title: "Do part of it", says: "Log your sets, or skip an exercise", badge: "Scores on what you did", tone: "warn", icon: "pencil", act: { kind: "part" } },
      { id: "easier", title: "Ask for an easier version", says: "Say why, out loud, it rebuilds", badge: "No one to call", tone: "info", icon: "mic", act: { kind: "ask", ask: "Today's session is too much. Can you make it easier? " } },
      { id: "own", title: "Upload your own programme", says: "PDF, a photo or a spreadsheet", badge: "We monitor yours", tone: "info", icon: "upload", act: { kind: "apps", title: "Your own programme", apps: [], upload: true } },
    ],
  },
  {
    id: "eat",
    name: "Eat",
    tag: "Weight loss",
    tagTone: "red",
    target: "−500 cal · 150 g protein · 1,000 mg calcium",
    detail: "1,000 mg calcium · three meals already built",
    state: { text: "0 of 3", tone: "plain", note: "Not started" },
    answered: { text: "3 of 3", note: () => "Every meal logged" },
    figure: "0 of 3",
    intro: FOUR,
    ways: [
      { id: "photo", title: "Photograph the plate", says: "Snap it and we read the macros", badge: "Scores what you ate", tone: "warn", icon: "camera", act: { kind: "meal" } },
      { id: "say", title: "Say what you ate", says: "Out loud, in your own words", badge: "Nothing to type", tone: "good", icon: "mic", act: { kind: "voice" } },
      { id: "import", title: "Import from another app", says: "Apple Health, MyFitnessPal, Cronometer", badge: "Posts itself", tone: "info", icon: "import", act: { kind: "apps", title: "Import your meals", apps: ["Apple Health", "MyFitnessPal", "Cronometer"] } },
    ],
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
      { id: "log", title: "Log what actually happened", says: "Time in bed, time to fall asleep, times you woke", badge: "Scores on actual", tone: "warn", icon: "pencil", act: { kind: "night" } },
      { id: "shift", title: "Ask to shift the window", says: "A late flight, a sick child, say why", badge: "Rebuilds tonight", tone: "info", icon: "shift", act: { kind: "ask", ask: "I need to shift tonight's sleep window because " } },
      { id: "device", title: "Connect your device", says: "CPAP, Oura, Apple Watch, Eight Sleep", badge: "Logged for you", tone: "info", icon: "device", act: { kind: "apps", title: "Connect your device", apps: ["ResMed CPAP", "Oura", "Apple Watch", "Eight Sleep"] } },
    ],
  },
  {
    id: "mind",
    name: "Mind",
    tag: "Anxiety",
    tagTone: "green",
    target: "SMART relaxation response, 20 min",
    detail: "Week 3 of 8 · Benson–Henry Institute",
    state: { text: "20 min", tone: "plain", note: "Not started" },
    answered: { text: "Done", note: (at) => `Completed ${at}` },
    figure: "20 min",
    intro: FOUR,
    ways: [
      { id: "session", title: "Do today's session", says: "Twenty minutes, guided end to end", badge: "Scores 100% for today", tone: "good", icon: "check", act: { kind: "done" } },
      { id: "short", title: "Do the short version", says: "Eight minutes when the day is full", badge: "Partial credit", tone: "warn", icon: "pencil", act: { kind: "short" } },
      { id: "swap", title: "Swap the practice", says: "Say what is not working for you", badge: "Rebuilds the week", tone: "info", icon: "swap", act: { kind: "ask", ask: "The relaxation practice is not working for me because " } },
      { id: "own", title: "Log your own practice", says: "Yoga, prayer, a walk without a phone", badge: "Counts if you log it", tone: "good", icon: "practice", act: { kind: "ask", ask: "I did my own practice today: " } },
    ],
    done: false,
  },
  {
    id: "medication",
    name: "Medication & supplements",
    tag: "All plans",
    tagTone: "grey",
    target: "Metformin, vitamin D · 3 supplements",
    detail: "Prescribed by Dr. Patel · evening dose at 7 pm",
    state: { text: "2 doses", tone: "plain", note: "Not started" },
    answered: { text: "Taken", note: (at) => `Logged ${at}` },
    figure: "2 doses",
    intro: "Today's doses, and three ways to answer them.",
    ways: [
      { id: "taken", title: "Mark it taken", says: "One tap per dose", badge: "Scores 100% for today", tone: "good", icon: "check", act: { kind: "dose", sheet: "taken" } },
      { id: "missed", title: "Mark a dose missed", says: "No judgement, we just need the truth", badge: "Logged honestly", tone: "warn", icon: "pencil", act: { kind: "dose", sheet: "missed" } },
      { id: "side", title: "Report a side effect", says: "Say what happened, in your words", badge: "Goes to Dr. Patel", tone: "good", icon: "phone", act: { kind: "dose", sheet: "side" } },
    ],
    done: false,
  },
  {
    id: "measure",
    name: "Measure",
    tag: "All plans",
    tagTone: "grey",
    target: "Weight each morning, waist monthly",
    detail: "Last entered October 6 · 178 lb, 36.5″",
    state: { text: "Due today", tone: "warn", note: "Last 178 lb · 36.5″" },
    answered: { text: "Done", note: () => "Entered today" },
    intro: "Today's target, and three ways to answer it.",
    ways: [
      { id: "enter", title: "Enter today's numbers", says: "Weight, waist, blood pressure", badge: "Scores 100% for today", tone: "good", icon: "check", act: { kind: "sheet" } },
      { id: "skip", title: "Skip today", says: "Say why, the gap stays in the series", badge: "No penalty", tone: "warn", icon: "pencil", act: { kind: "ask", ask: "I am skipping today's measurements because " } },
      { id: "device", title: "Connect a scale or cuff", says: "Withings, Omron, Apple Health", badge: "Posts itself", tone: "info", icon: "device", act: { kind: "apps", title: "Connect a scale or cuff", apps: ["Withings scale", "Omron cuff", "Apple Health"] } },
    ],
    done: false,
  },
]

/** How to measure a waist the same way every month, a step a slide in the
    sheet behind "How to measure" on the Measure page. Taken where the tape
    crosses the belly button, so the reading lines up with the clinic's own.
    Each step has its illustration in assets/images/waist, in this order. */
export const WAIST_GUIDE: { title: string; says: string; tips: string[] }[] = [
  { title: "Get ready", says: "Use a soft cloth or plastic sewing tape, not a metal tool tape or a string. Stand in front of a mirror on bare skin, feet together, arms relaxed at your sides.", tips: ["Soft tape", "Bare skin", "Mirror in front"] },
  { title: "Find your belly button", says: "Your belly button is the landmark. The tape goes right across it, not at your belt line and not up at your ribs.", tips: ["Across the belly button", "Not the belt line"] },
  { title: "Wrap it level", says: "Hold the zero end on your belly button and wrap the tape all the way round. Check in the mirror that it sits level at the back, flat and not twisted.", tips: ["Level all round", "Flat, not twisted", "Snug, not pressing in"] },
  { title: "Breathe out, don't suck in", says: "Relax your stomach and breathe out normally. Read the tape at the end of that breath, never while holding your stomach in.", tips: ["Relaxed stomach", "End of a normal breath out"] },
  { title: "Read it, then check", says: "Read where the tape meets the zero end, to the nearest quarter inch. Measure once more. If the two differ by more than half an inch, measure a third time and use the two closest.", tips: ["Nearest quarter inch", "Measure twice"] },
  { title: "Inches or centimeters", says: "We record inches. A centimeter tape works too: divide by 2.54, so 92 cm is 36.2 in.", tips: ["Inches recorded", "cm divided by 2.54"] },
  { title: "Same way every time", says: "Same spot, same tape, same time of day, ideally first thing in the morning before breakfast, once a month. Then a change is your waist, not your method.", tips: ["Morning, before breakfast", "Once a month"] },
]

export const topicOf = (id: string | undefined) => TOPICS.find((t) => t.id === id)

/** The next thing due today, above the six: the evening dose, moved to 7 pm
    after last night's miss (see HANDOVER). One tap logs it on Medication. */
export const NEXT_UP = { topic: "medication", title: "Evening metformin, 7 pm", note: "Missed last night, so a reminder is set" } as const

/** The topic's row today: her answer if she gave one, else where it stands. */
export function rowOf(s: Store, t: Topic, day = localDay()) {
  const logged = s.topicLog?.[day]?.[t.id]
  if (logged?.night) return { done: true, text: inBed(logged.night), tone: "good" as Tone, note: `Logged ${clockWords(logged.at)}` }
  if (logged) return { done: true, text: t.answered.text, tone: "good" as Tone, note: t.answered.note(clockWords(logged.at)) }
  return { done: !!t.done, text: t.state.text, tone: t.state.tone, note: t.state.note }
}

export const doneCount = (s: Store, day = localDay()) => TOPICS.filter((t) => rowOf(s, t, day).done).length

/** Hours and minutes in bed for a logged night, as "6 h 10 m". */
export const inBed = (n: { bed: number; up: number }) => hm(n.up - n.bed)

export const hm = (min: number) => `${Math.floor(min / 60)} h ${min % 60} m`

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

/** The weekly weigh ins behind the Weight pair, day one to today. */
export const WEIGHT_SERIES = [
  { date: "2026-07-01", value: 178 },
  { date: "2026-07-08", value: 177.2 },
  { date: "2026-07-15", value: 176.8 },
  { date: "2026-07-22", value: 175.9 },
  { date: "2026-07-29", value: 175.1 },
  { date: "2026-08-05", value: 174.6 },
  { date: "2026-08-12", value: 173.4 },
  { date: "2026-08-19", value: 172.9 },
  { date: "2026-08-26", value: 171.6 },
  { date: "2026-09-02", value: 171.0 },
  { date: "2026-09-09", value: 169.8 },
  { date: "2026-09-16", value: 169.1 },
  { date: "2026-09-23", value: 167.9 },
  { date: "2026-09-30", value: 166.8 },
  { date: "2026-10-06", value: 165.6 },
]

/** The monthly waist checks behind the Waist pair, in inches. */
export const WAIST_SERIES = [
  { date: "2026-07-01", value: 36.5 },
  { date: "2026-08-01", value: 35.9 },
  { date: "2026-09-01", value: 35.1 },
  { date: "2026-10-06", value: 34.0 },
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
  // Minutes from lights out to asleep.
  latency: 32,
  parts: [
    { name: "Duration", value: "6 h 10 m", verdict: "1 h 20 short", tone: "warn" as Tone },
    { name: "Fell asleep in", value: "32 min", verdict: "17 min over", tone: "warn" as Tone },
    { name: "Awakenings", value: "3 times", verdict: "1 more than usual", tone: "warn" as Tone },
    { name: "Deep sleep", value: "58 m", verdict: "16% of the night", tone: "good" as Tone },
    { name: "REM sleep", value: "1 h 22 m", verdict: "22% of the night", tone: "good" as Tone },
    { name: "CPAP worn", value: "5 h 40 m", verdict: "92% of the night", tone: "good" as Tone },
  ],
}

/* ------------------------------------------------------------- exercise -- */

/** A lift of the default programme. Minimal equipment only (HOL, 26 Oct):
    light dumbbells or a band, plus the treadmill or rower for cardio.
    `start` is the load the plan began on, `reps` the bottom of the range
    and `top` where the reps stop climbing and the load steps up
    (lib/strength.ts). */
export type Lift = {
  id: string
  name: string
  gear: "dumbbell" | "band"
  start: number
  sets: number
  reps: number
  top: number
  cues: string[]
  mistakes: { name: string; fix: string }[]
  steps: { name: string; cue: string }[]
}

export const LIFTS: Lift[] = [
  {
    id: "goblet-squat",
    name: "Goblet squat",
    gear: "dumbbell",
    start: 10,
    sets: 3,
    reps: 10,
    top: 12,
    steps: [
      { name: "Start", cue: "Weight at chest" },
      { name: "Descend", cue: "Hips back first" },
      { name: "Bottom", cue: "Thighs parallel" },
    ],
    cues: [
      "Hold one dumbbell at your chest, **elbows tucked in**, feet a little wider than your hips.",
      "Send your hips back, then down. **Keep your chest up** and your weight through your mid-foot.",
      "Stop when your thighs are parallel to the floor, then **drive up through your heels**.",
    ],
    mistakes: [
      { name: "Knees caving in", fix: "push them out over your toes" },
      { name: "Heels lifting off the floor", fix: "sit back, not forward" },
    ],
  },
  {
    id: "floor-press",
    name: "Dumbbell floor press",
    gear: "dumbbell",
    start: 8,
    sets: 3,
    reps: 10,
    top: 12,
    steps: [
      { name: "Start", cue: "Arms straight up" },
      { name: "Lower", cue: "Elbows to the floor" },
      { name: "Press", cue: "Drive back up" },
    ],
    cues: [
      "Lie on the floor with your **knees bent, feet flat** and a dumbbell over each shoulder.",
      "Lower slowly until your **upper arms rest on the floor**, elbows about 45° from your body.",
      "Press up and slightly in, and **stop short of locking out** your elbows.",
    ],
    mistakes: [
      { name: "Elbows flaring wide", fix: "angle them about 45° from your body" },
      { name: "Dropping onto the floor", fix: "touch down softly, then press" },
    ],
  },
  {
    id: "band-row",
    name: "Band row",
    gear: "band",
    start: 15,
    sets: 3,
    reps: 12,
    top: 15,
    steps: [
      { name: "Reach", cue: "Arms long" },
      { name: "Pull", cue: "Elbows back" },
      { name: "Squeeze", cue: "Shoulder blades together" },
    ],
    cues: [
      "Loop the band round a post or door anchor at chest height and **stand tall**, arms long.",
      "Pull the handles to your lower ribs, **driving your elbows straight back**.",
      "Squeeze your shoulder blades together for a beat, then **let the band draw you forward** under control.",
    ],
    mistakes: [
      { name: "Leaning back to pull", fix: "keep your torso still and let your back do the work" },
      { name: "Shrugging up to your ears", fix: "think of sliding your shoulders into your back pockets" },
    ],
  },
  {
    id: "rdl",
    name: "Romanian deadlift",
    gear: "dumbbell",
    start: 12,
    sets: 3,
    reps: 10,
    top: 12,
    steps: [
      { name: "Stand", cue: "Weights at your thighs" },
      { name: "Hinge", cue: "Hips back, back flat" },
      { name: "Stand tall", cue: "Squeeze your glutes" },
    ],
    cues: [
      "Stand with a dumbbell in each hand at your thighs, a **soft bend in your knees**, and your back flat.",
      "Push your hips straight back and **slide the weights down your legs** until you feel your hamstrings stretch.",
      "Squeeze your glutes to **stand tall**, finishing with your hips under your shoulders.",
    ],
    mistakes: [
      { name: "Rounding the lower back", fix: "stop where your back stays flat" },
      { name: "Squatting the weights down", fix: "keep your shins close to vertical" },
    ],
  },
]

export const liftOf = (id: string | undefined) => LIFTS.find((l) => l.id === id)

export const WARMUP = { name: "Warm-up", detail: "5 min", say: "Easy treadmill walk" }
export const CARDIO = { name: "Zone 2 cardio", detail: "30 min", say: "Treadmill or rower" }

/* ------------------------------------------------------------------ eat -- */

/** The meal database behind "Pick from the meal database": the plan's
    pre-planned meals, macros already known, so one tap adds one whole. */
export const PLANNED_MEALS: { id: string; name: string; slot: "breakfast" | "lunch" | "dinner" | "snack"; portion: string; nutrients: { calories: number; protein: number; fiber: number; calcium: number } }[] = [
  { id: "yogurt-bowl", name: "Greek yogurt, berries and chia", slot: "breakfast", portion: "1 bowl", nutrients: { calories: 380, protein: 34, fiber: 9, calcium: 350 } },
  { id: "egg-scramble", name: "Egg white scramble with spinach and toast", slot: "breakfast", portion: "1 plate", nutrients: { calories: 360, protein: 32, fiber: 6, calcium: 180 } },
  { id: "chicken-quinoa", name: "Chicken, quinoa and greens", slot: "lunch", portion: "1 bowl", nutrients: { calories: 540, protein: 48, fiber: 8, calcium: 160 } },
  { id: "lentil-soup", name: "Lentil and chicken soup", slot: "lunch", portion: "2 cups", nutrients: { calories: 420, protein: 38, fiber: 11, calcium: 120 } },
  { id: "salmon-veg", name: "Salmon, sweet potato and broccoli", slot: "dinner", portion: "1 plate", nutrients: { calories: 610, protein: 52, fiber: 9, calcium: 140 } },
  { id: "turkey-chili", name: "Turkey and black bean chili", slot: "dinner", portion: "1 bowl", nutrients: { calories: 520, protein: 46, fiber: 14, calcium: 190 } },
  { id: "cottage-cheese", name: "Cottage cheese and pear", slot: "snack", portion: "1 cup", nutrients: { calories: 210, protein: 24, fiber: 4, calcium: 220 } },
]

/** What the prototype "hears" where nothing can transcribe (Expo Go, a
    browser without speech recognition), one sentence per meal. */
export const SPOKEN_SAMPLE: Record<"breakfast" | "lunch" | "dinner", string> = {
  breakfast: "Two scrambled eggs, a slice of whole grain toast and a black coffee",
  lunch: "A grilled chicken salad with olive oil and an apple",
  dinner: "Salmon with rice and broccoli, and a glass of water",
}

/** The foods a spoken meal is read against: a word she might say, and
    what one usual portion of it holds. Anything not here is still kept,
    by name, with nothing known about it until she checks it. */
export const SPOKEN_FOODS: { says: RegExp; name: string; portion: string; nutrients: { calories: number; protein: number; fiber: number; calcium: number } }[] = [
  { says: /\begg/, name: "Scrambled eggs", portion: "2 eggs", nutrients: { calories: 180, protein: 12, fiber: 0, calcium: 50 } },
  { says: /\btoast|\bbread/, name: "Whole grain toast", portion: "1 slice", nutrients: { calories: 80, protein: 4, fiber: 2, calcium: 30 } },
  { says: /\bcoffee/, name: "Black coffee", portion: "1 cup", nutrients: { calories: 2, protein: 0, fiber: 0, calcium: 5 } },
  { says: /\byogh?urt/, name: "Greek yogurt", portion: "1 cup", nutrients: { calories: 150, protein: 20, fiber: 0, calcium: 230 } },
  { says: /\boat/, name: "Oatmeal", portion: "1 cup", nutrients: { calories: 160, protein: 6, fiber: 4, calcium: 20 } },
  { says: /\bberr/, name: "Berries", portion: "Half a cup", nutrients: { calories: 35, protein: 1, fiber: 4, calcium: 15 } },
  { says: /\bsalad/, name: "Grilled chicken salad", portion: "1 bowl", nutrients: { calories: 350, protein: 35, fiber: 5, calcium: 80 } },
  { says: /\bchicken/, name: "Chicken breast", portion: "5 oz", nutrients: { calories: 230, protein: 43, fiber: 0, calcium: 20 } },
  { says: /\bolive oil|\bdressing/, name: "Olive oil", portion: "1 tablespoon", nutrients: { calories: 120, protein: 0, fiber: 0, calcium: 0 } },
  { says: /\bapple/, name: "Apple", portion: "1 medium", nutrients: { calories: 95, protein: 0, fiber: 4, calcium: 10 } },
  { says: /\bbanana/, name: "Banana", portion: "1 medium", nutrients: { calories: 105, protein: 1, fiber: 3, calcium: 6 } },
  { says: /\bsalmon/, name: "Salmon", portion: "5 oz", nutrients: { calories: 290, protein: 32, fiber: 0, calcium: 15 } },
  { says: /\brice/, name: "White rice", portion: "1 cup", nutrients: { calories: 205, protein: 4, fiber: 1, calcium: 15 } },
  { says: /\bbroccoli/, name: "Broccoli", portion: "1 cup", nutrients: { calories: 30, protein: 3, fiber: 2, calcium: 45 } },
  { says: /\bsandwich/, name: "Turkey sandwich", portion: "1 sandwich", nutrients: { calories: 380, protein: 26, fiber: 4, calcium: 120 } },
  { says: /\bpasta|\bspaghetti/, name: "Pasta", portion: "1.5 cups", nutrients: { calories: 330, protein: 12, fiber: 3, calcium: 20 } },
  { says: /\bpizza/, name: "Pizza", portion: "2 slices", nutrients: { calories: 570, protein: 24, fiber: 4, calcium: 400 } },
  { says: /\bmilk/, name: "Milk", portion: "1 cup", nutrients: { calories: 120, protein: 8, fiber: 0, calcium: 300 } },
  { says: /\bwater/, name: "Water", portion: "1 glass", nutrients: { calories: 0, protein: 0, fiber: 0, calcium: 0 } },
]

/* ----------------------------------------------------------- medication -- */

/** Today's doses, prescribed first, then what she added herself; the two
    nothing is taken when the day opens. */
export const DOSES = [
  { id: "metformin-am", name: "Metformin", dose: "500 mg", when: "Morning" },
  { id: "vitamin-d", name: "Vitamin D", dose: "2,000 IU", when: "Morning" },
  { id: "metformin-pm", name: "Metformin", dose: "500 mg", when: "Evening, 7 pm" },
  { id: "magnesium", name: "Magnesium glycinate", dose: "400 mg", when: "Nightly" },
  { id: "fish-oil", name: "Fish oil", dose: "1,000 mg", when: "With dinner" },
  { id: "berberine", name: "Berberine", dose: "500 mg", when: "Twice daily" },
] as const

export const MISSED_WHY = ["Forgot", "Felt unwell", "Ran out", "Side effects", "Other"] as const

export const SEVERITY = ["Mild", "Moderate", "Severe"] as const

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
  /** The six goals as the day closed: what was done and what was not. */
  tasks: [
    { id: "exercise", done: true, note: "Upper body + 30 min Zone 2" },
    { id: "eat", done: true, note: "3 of 3 meals logged" },
    { id: "sleep", done: false, note: "6 h 10 m, short by 1 h 20 m" },
    { id: "mind", done: true, note: "20 min session" },
    { id: "medication", done: false, note: "Evening metformin missed" },
    { id: "measure", done: true, note: "178 lb, 36.5″" },
  ] as { id: TopicId; done: boolean; note: string }[],
}

