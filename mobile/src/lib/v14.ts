/* The paid app as the client drew it in Journey_14 (short, 10.25, screens
   28 to 54), rebuilt as a dummy set of screens under /v14 so it can be
   checked beside the current member app without replacing it (user, 23 Oct
   2026). Everything here is sample data for the deck's patient: day 97 of a
   weight plan with a sleep study, an eight week SMART course, metformin and
   three supplements. Nothing is read from the record or saved.

   The 22 Oct call shaped what the screens say beyond the deck:
   - Exercise minutes and sleep come from the wearable, never typed in; a
     manual note stays possible but is not relied on.
   - Exercise moves are shown as images for version 1; video is a
     placeholder.
   - A photo of the plate is the first way to log a meal.
   - Medication puts new medicines and supplements first: each is checked
     against what is prescribed and Dr. Patel is told; a missed dose is a
     manual note when remembered.
   - The Plan tab reads Today, then Progress, then History, then Outlook
     (Dnyaneshwri's sections, agreed by Ed and Finn).
   - Care is cash; a baseline test the physician moves to insurance is
     refunded and shown as such. */

export type TopicId = "exercise" | "eat" | "sleep" | "mind" | "medication" | "measure"

export type GoalState = "done" | "partial" | "short" | "notStarted" | "due"

/** One of the six rows every plan has, as today stands. */
export type Topic = {
  id: TopicId
  name: string
  /** The programme behind the row, or "All plans". */
  programme: string
  /** Today's target in a few words. */
  target: string
  /** Where today stands, in words: "55 min", "1 of 3 meals". */
  status: string
  state: GoalState
  /** Where the number comes from, when it is not typed: "Apple Watch". */
  source?: string
  /** Yesterday's score against its own goal, 0 to 100. */
  yesterday: number
  /** What yesterday's score stands for: "55 of 55 min, all four lifts". */
  yesterdayWhy: string
}

export const PATIENT = { name: "Olivia", physician: "Dr. Patel", day: 97, started: "Jul 1, 2026", today: "Oct 6, 2026", weekday: "Tuesday" }

export const TOPICS: Topic[] = [
  {
    id: "exercise",
    name: "Exercise",
    programme: "Weight loss",
    target: "Upper body and 30 min Zone 2",
    status: "0 of 55 min",
    state: "notStarted",
    source: "Apple Watch",
    yesterday: 100,
    yesterdayWhy: "55 of 55 min, all four lifts",
  },
  {
    id: "eat",
    name: "Eat",
    programme: "Weight loss",
    target: "500 kcal under, 150 g protein",
    status: "1 of 3 meals",
    state: "partial",
    yesterday: 88,
    yesterdayWhy: "142 of 150 g protein, deficit met",
  },
  {
    id: "sleep",
    name: "Sleep",
    programme: "Sleep restoration",
    target: "In bed by 10:30 with CPAP",
    status: "6 h 10 m of 7 h 30 m",
    state: "short",
    source: "Apple Watch and CPAP",
    yesterday: 64,
    yesterdayWhy: "6 h 10 m of 7 h 30 m, to bed 11:50",
  },
  {
    id: "mind",
    name: "Mind",
    programme: "SMART course",
    target: "Relaxation response, 20 min",
    status: "Done at 7:10 am",
    state: "done",
    yesterday: 100,
    yesterdayWhy: "20 of 20 min, session completed",
  },
  {
    id: "medication",
    name: "Medication",
    programme: "All plans",
    target: "Metformin, vitamin D and 3 supplements",
    status: "Evening dose at 7 pm",
    state: "due",
    yesterday: 50,
    yesterdayWhy: "1 of 2 doses, evening missed",
  },
  {
    id: "measure",
    name: "Measure",
    programme: "All plans",
    target: "Weight and waist on Mondays",
    status: "178 lb, 36.5 in",
    state: "done",
    source: "Withings scale",
    yesterday: 100,
    yesterdayWhy: "6 of 6 fields entered",
  },
]

export const topicOf = (id: string) => TOPICS.find((t) => t.id === id)

export const doneToday = TOPICS.filter((t) => t.state === "done").length

/** Yesterday's day score: the plain average of the six. */
export const yesterdayScore = Math.round(TOPICS.reduce((s, t) => s + t.yesterday, 0) / TOPICS.length)

/** The plan moving on its own after a short night (deck 30). */
export const ADAPTED = "You slept 6 h 10 m, so today's Zone 2 is ten minutes lighter and caffeine stops at noon."

/* -------------------------------------------------------- exercise -- */

export type Lift = { id: string; name: string; sets: number; reps: number; load: number; last?: number; cues: string[]; mistakes: { what: string; fix: string }[]; stills: { label: string; cue: string }[] }

export const SESSION = {
  name: "Upper body and Zone 2",
  week: 4,
  minutes: 55,
  warmUp: "5 min easy bike",
  zone2: { minutes: 30, hr: "118 to 132 bpm" },
}

export const LIFTS: Lift[] = [
  {
    id: "goblet-squat",
    name: "Goblet squat",
    sets: 3,
    reps: 10,
    load: 35,
    last: 30,
    cues: ["Hold the weight at your chest, elbows tucked in, feet a little wider than your hips.", "Send your hips back, then down. Keep your chest up and your weight through your mid foot.", "Stop when your thighs are parallel to the floor, then drive up through your heels."],
    mistakes: [
      { what: "Knees caving in", fix: "Push them out over your toes" },
      { what: "Heels lifting off the floor", fix: "Sit back, not forward" },
    ],
    stills: [
      { label: "Start", cue: "Weight at chest" },
      { label: "Descend", cue: "Hips back first" },
      { label: "Bottom", cue: "Thighs parallel" },
    ],
  },
  {
    id: "bench-press",
    name: "Dumbbell bench press",
    sets: 3,
    reps: 8,
    load: 20,
    last: 17.5,
    cues: ["Lie flat with your feet on the floor and the weights over your chest.", "Lower slowly until your elbows sit just below the bench.", "Press up and slightly in, without locking your elbows."],
    mistakes: [
      { what: "Elbows flared out wide", fix: "Keep them at about 45 degrees" },
      { what: "Back arching off the bench", fix: "Keep your ribs down" },
    ],
    stills: [
      { label: "Start", cue: "Weights over chest" },
      { label: "Lower", cue: "Slow, two seconds" },
      { label: "Bottom", cue: "Elbows below bench" },
    ],
  },
  {
    id: "cable-row",
    name: "Seated cable row",
    sets: 3,
    reps: 12,
    load: 40,
    last: 40,
    cues: ["Sit tall with a slight bend in your knees.", "Pull the handle to your lower ribs, squeezing your shoulder blades.", "Let it back slowly until your arms are straight."],
    mistakes: [
      { what: "Leaning back to pull", fix: "Stay tall, move only your arms" },
      { what: "Shrugging your shoulders", fix: "Keep them down and back" },
    ],
    stills: [
      { label: "Start", cue: "Arms straight" },
      { label: "Pull", cue: "Elbows back" },
      { label: "Squeeze", cue: "Handle to ribs" },
    ],
  },
  {
    id: "romanian-deadlift",
    name: "Romanian deadlift",
    sets: 3,
    reps: 10,
    load: 45,
    last: 40,
    cues: ["Stand with the weights in front of your thighs, knees soft.", "Push your hips back and slide the weights down your legs.", "Stop below your knees and stand up by driving your hips forward."],
    mistakes: [
      { what: "Rounding your back", fix: "Keep your chest proud" },
      { what: "Bending at the knees", fix: "Hinge from your hips" },
    ],
    stills: [
      { label: "Start", cue: "Standing tall" },
      { label: "Hinge", cue: "Hips back" },
      { label: "Bottom", cue: "Below the knee" },
    ],
  },
]

export const liftOf = (id: string) => LIFTS.find((l) => l.id === id)

/* ------------------------------------------------------------ eat -- */

export type Meal = { slot: "Breakfast" | "Lunch" | "Dinner"; name: string; kcal: number; protein: number; logged: boolean; how?: string }

export const MEALS: Meal[] = [
  { slot: "Breakfast", name: "Greek yogurt, berries and walnuts", kcal: 420, protein: 38, logged: true, how: "Photo" },
  { slot: "Lunch", name: "Chicken, quinoa and greens bowl", kcal: 560, protein: 52, logged: false },
  { slot: "Dinner", name: "Salmon, roast vegetables and rice", kcal: 640, protein: 48, logged: false },
]

export const EAT_TARGET = { kcal: 1740, deficit: 500, protein: 150, calcium: 1000 }

/* ---------------------------------------------------------- sleep -- */

export const SLEEP = {
  score: 64,
  average7: 71,
  firstWeek: 52,
  window: { bed: "10:30 pm", up: "6:00 am" },
  parts: [
    { name: "Duration", value: "6 h 10 m", note: "1 h 20 m short", ok: false },
    { name: "Efficiency", value: "88% asleep", note: "Good", ok: true },
    { name: "To bed at", value: "11:50 pm", note: "80 min late", ok: false },
    { name: "CPAP worn", value: "5 h 40 m", note: "92% of the night", ok: true },
  ],
}

/* ----------------------------------------------------------- mind -- */

export const MIND = { course: "SMART relaxation response", by: "Benson Henry Institute", week: 3, of: 8, minutes: 20, short: 8, irritability: { start: 7, now: 3 } }

/* ----------------------------------------------------- medication -- */

export type Dose = { name: string; dose: string; when: string; by: string; taken?: boolean; missed?: boolean }

export const DOSES: Dose[] = [
  { name: "Metformin", dose: "500 mg", when: "Morning", by: "Dr. Patel", taken: true },
  { name: "Vitamin D", dose: "2,000 IU", when: "Morning", by: "Dr. Patel", taken: true },
  { name: "Metformin", dose: "500 mg", when: "Evening, 7 pm", by: "Dr. Patel" },
]

export type Supplement = { name: string; dose: string; interaction?: string }

export const SUPPLEMENTS: Supplement[] = [
  { name: "Magnesium glycinate", dose: "400 mg nightly" },
  { name: "Fish oil", dose: "1,000 mg with dinner" },
  { name: "Berberine", dose: "500 mg twice daily", interaction: "Berberine and metformin both lower blood glucose. Together they can push it too low. Do not start or stop either on your own." },
]

/* -------------------------------------------------------- measure -- */

export type Field = { id: string; name: string; unit: string; was: number; now?: number }

export const FIELDS: Field[] = [
  { id: "weight", name: "Weight", unit: "lb", was: 178.4, now: 178.0 },
  { id: "chest", name: "Chest", unit: "in", was: 38.5, now: 38.0 },
  { id: "waist", name: "Waist", unit: "in", was: 36.8 },
  { id: "hips", name: "Hips", unit: "in", was: 41.5, now: 41.0 },
  { id: "thigh", name: "Thigh", unit: "in", was: 22.5, now: 22.5 },
  { id: "arm", name: "Arm", unit: "in", was: 12.4 },
]

/* -------------------------------------------------------- history -- */

export type Window = "day" | "week" | "month" | "6mo" | "year"

export const WINDOWS: { value: Window; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "6mo", label: "6 mo" },
  { value: "year", label: "Year" },
]

/** One metric of a topic's history: this week's seven days, and the
    average over each longer window. A window the metric did not exist for
    stays empty, never zero. */
export type Metric = {
  id: string
  name: string
  unit: string
  goal?: number
  /** Monday to Sunday; undefined for a day with nothing. */
  week: (number | undefined)[]
  windows: Partial<Record<Exclude<Window, "day">, number | string>>
  /** Higher is better, for the change words. */
  better?: "up" | "down"
  format?: "int" | "1dp" | "time" | "pct" | "count"
}

export type History = { topic: TopicId | "all"; title: string; lead: string; metrics: Metric[]; note: string }

export const HISTORIES: History[] = [
  {
    topic: "all",
    title: "Your history",
    lead: "Every figure, averaged over each window since you enrolled.",
    note: "Rest days count as zero, so an average never describes a week you did not have.",
    metrics: [
      { id: "deficit", name: "Deficit", unit: "kcal", goal: 500, week: [470, 520, 380, 590, 540, 440, 600], windows: { week: 505, month: 463, "6mo": 410, year: 349 }, better: "up" },
      { id: "steps", name: "Steps", unit: "steps", goal: 10000, week: [9800, 11200, 8400, 10900, 12100, 7600, 11240], windows: { week: 10400, month: 9800, "6mo": 8900, year: 7600 }, better: "up" },
      { id: "exercise", name: "Exercise", unit: "min", goal: 40, week: [48, 0, 42, 46, 0, 58, 55], windows: { week: 42, month: 38, "6mo": 31, year: 26 }, better: "up" },
      { id: "weight", name: "Weight", unit: "lb", week: [178.4, undefined, undefined, undefined, undefined, undefined, 178.0], windows: { week: 178.4, month: 180.1, "6mo": 183.6, year: 186.4 }, better: "down", format: "1dp" },
    ],
  },
  {
    topic: "exercise",
    title: "Exercise",
    lead: "Minutes from your watch, every window.",
    note: "Rest days are zeroes, not gaps. Dropping them would read forty per cent higher and describe a week you did not have.",
    metrics: [
      { id: "minutes", name: "Minutes", unit: "min", goal: 40, week: [48, 0, 42, 46, 0, 58, 55], windows: { week: 42, month: 38, "6mo": 31, year: 26 }, better: "up" },
      { id: "active", name: "Active energy", unit: "kcal", goal: 800, week: [880, 610, 820, 900, 640, 940, 930], windows: { week: 870, month: 810, "6mo": 720, year: 640 }, better: "up" },
      { id: "steps", name: "Steps", unit: "steps", goal: 10000, week: [9800, 11200, 8400, 10900, 12100, 7600, 11240], windows: { week: 10400, month: 9800, "6mo": 8900, year: 7600 }, better: "up" },
      { id: "sessions", name: "Sessions a week", unit: "sessions", week: [1, 0, 1, 1, 0, 1, 1], windows: { week: 4.0, month: 3.6, "6mo": 3.1, year: 2.4 }, better: "up", format: "1dp" },
    ],
  },
  {
    topic: "eat",
    title: "Eat",
    lead: "What you ate against your targets, every window.",
    note: "Protein climbing while calories fall is the pattern that keeps muscle. Either number alone would hide it.",
    metrics: [
      { id: "calories", name: "Calories", unit: "kcal", goal: 1740, week: [1690, 1820, 1650, 1760, 1700, 1640, 1690], windows: { week: 1712, month: 1735, "6mo": 1790, year: 1880 }, better: "down" },
      { id: "protein", name: "Protein", unit: "g", goal: 150, week: [138, 145, 128, 140, 132, 136, 142], windows: { week: 138, month: 131, "6mo": 119, year: 104 }, better: "up" },
      { id: "deficit", name: "Deficit", unit: "kcal", goal: 500, week: [470, 520, 380, 590, 540, 440, 600], windows: { week: 505, month: 463, "6mo": 410, year: 349 }, better: "up" },
      { id: "onTarget", name: "Days on target", unit: "days", week: [1, 0, 1, 1, 1, 0, 1], windows: { week: "5 of 7", month: "22 of 30", "6mo": "118 of 182", year: "198 of 365" }, format: "count" },
    ],
  },
  {
    topic: "sleep",
    title: "Sleep",
    lead: "From your watch and CPAP, every window.",
    note: "CPAP and AHI only exist from the night the study came back. Before that the row is empty, not zero.",
    metrics: [
      { id: "score", name: "Score", unit: "of 100", goal: 80, week: [62, 70, 58, 69, 66, 72, 64], windows: { week: 66, month: 63, "6mo": 58, year: 51 }, better: "up" },
      { id: "hours", name: "Hours", unit: "h", goal: 7.5, week: [6.2, 6.8, 5.9, 6.6, 6.4, 6.9, 6.2], windows: { week: "6:24", month: "6:11", "6mo": "5:52", year: "5:38" }, better: "up", format: "1dp" },
      { id: "efficiency", name: "Efficiency", unit: "%", goal: 85, week: [87, 89, 85, 88, 86, 90, 88], windows: { week: "88%", month: "86%", "6mo": "83%", year: "80%" }, better: "up" },
      { id: "cpap", name: "CPAP", unit: "h", week: [5.5, 6.2, 5.1, 6.0, 5.8, 6.3, 5.7], windows: { week: "5:48", month: "5:30", "6mo": "5:02" }, better: "up", format: "1dp" },
      { id: "ahi", name: "AHI", unit: "events an hour", week: [12, 10, 13, 11, 11, 10, 11], windows: { week: 11, month: 13, "6mo": 18 }, better: "down" },
    ],
  },
  {
    topic: "mind",
    title: "Mind",
    lead: "Your SMART practice and how irritable you feel, by window.",
    note: "The course is eight weeks old, so it has no six month or year column. An empty cell is more honest than a short average dressed up as a long one.",
    metrics: [
      { id: "minutes", name: "Minutes", unit: "min", goal: 20, week: [20, 20, 8, 20, 20, 16, 20], windows: { week: 19, month: 18 }, better: "up" },
      { id: "sessions", name: "Sessions", unit: "done", week: [1, 1, 1, 1, 1, 1, 1], windows: { week: "7 of 7", month: "27 of 30" }, format: "count" },
      { id: "irritability", name: "Irritability", unit: "0 to 10", week: [4, undefined, undefined, 3, undefined, undefined, 3], windows: { week: 3, month: 4 }, better: "down" },
    ],
  },
  {
    topic: "medication",
    title: "Medication",
    lead: "Doses taken, supplements and what was flagged, by window.",
    note: "One missed evening dose takes a perfect week to 88%. The scale is strict on purpose, because so is the blood panel read against it.",
    metrics: [
      { id: "adherence", name: "Adherence", unit: "%", goal: 100, week: [100, 100, 50, 100, 100, 100, 100], windows: { week: "88%", month: "90%", "6mo": "87%", year: "83%" }, better: "up" },
      { id: "doses", name: "Doses", unit: "taken", week: [2, 2, 1, 2, 2, 2, 2], windows: { week: "12 of 14", month: "54 of 60", "6mo": "317 of 364", year: "605 of 730" }, format: "count" },
      { id: "supplements", name: "Supplements", unit: "held", week: [3, 3, 3, 3, 3, 3, 3], windows: { week: 3, month: 3, "6mo": 2, year: 1 }, format: "count" },
      { id: "flagged", name: "Flagged", unit: "interactions", week: [0, 0, 0, 1, 0, 0, 0], windows: { week: 1, month: 1, "6mo": 2, year: 3 }, format: "count", better: "down" },
    ],
  },
  {
    topic: "measure",
    title: "Measure",
    lead: "Weight and the five measures you set on day one.",
    note: "The axis starts near your weight rather than at zero. Eight pounds on a zero axis is a flat line, and a flat line is the wrong answer.",
    metrics: [
      { id: "weight", name: "Weight", unit: "lb", week: [186.4, 184.9, 183.0, 181.6, 180.1, 179.0, 178.0], windows: { week: 178.4, month: 180.1, "6mo": 183.6, year: 186.4 }, better: "down", format: "1dp" },
      { id: "waist", name: "Waist", unit: "in", week: [39.1, 38.6, 38.2, 37.8, 37.2, 36.9, 36.5], windows: { week: 36.5, month: 37.2, "6mo": 38.4, year: 39.1 }, better: "down", format: "1dp" },
      { id: "chest", name: "Chest", unit: "in", week: [40.0, 39.8, 39.4, 39.0, 38.6, 38.4, 38.2], windows: { week: 38.2, month: 38.6, "6mo": 39.4, year: 40.0 }, better: "down", format: "1dp" },
      { id: "hips", name: "Hips", unit: "in", week: [43.6, 43.2, 42.9, 42.4, 41.8, 41.4, 41.1], windows: { week: 41.1, month: 41.8, "6mo": 42.9, year: 43.6 }, better: "down", format: "1dp" },
    ],
  },
]

export const historyOf = (topic: string) => HISTORIES.find((h) => h.topic === topic)

/* ------------------------------------------------ progress, tests -- */

export type Finding = { name: string; source: string; start: string; now?: string; note?: string; flag?: boolean }

/** What the baseline tests found (deck 28), then and now (deck 48). */
export const FINDINGS: Finding[] = [
  { name: "Sleep apnoea, AHI", source: "Home sleep study", start: "18", now: "11", note: "Moderate. Why you wake at three", flag: true },
  { name: "Body fat", source: "DEXA", start: "41%", now: "37.9%", note: "Lean mass low" },
  { name: "Resting metabolism", source: "RMR", start: "1,310 kcal", now: "1,480 kcal", note: "Below predicted" },
  { name: "Fasting insulin", source: "Blood panel", start: "18", now: "12", note: "Ferritin 46, B12 low normal" },
  { name: "hs-CRP", source: "Blood panel", start: "4.2", now: "2.1", note: "Inflammation marker" },
]

export type Symptom = { name: string; said: string; start: number; now: number }

/** The three symptoms she named, scored 0 to 10 on day one and again at week 12. */
export const SYMPTOMS: Symptom[] = [
  { name: "Waking at three", said: "You said this first", start: 8, now: 2 },
  { name: "Irritability", said: "Most days", start: 7, now: 3 },
  { name: "Weight gain", said: "Since the spring", start: 6, now: 2 },
]

/** How each baseline test was paid (22 Oct call): cash up front, and one
    Dr. Patel moved to insurance, refunded to her card. */
export type PaidTest = { name: string; price: number; paid: "cash" | "insurance"; note?: string }

export const PAID_TESTS: PaidTest[] = [
  { name: "Comprehensive blood panel", price: 189, paid: "cash" },
  { name: "DEXA body composition", price: 149, paid: "cash" },
  { name: "Resting metabolic rate", price: 129, paid: "cash" },
  { name: "Home sleep study", price: 299, paid: "insurance", note: "Dr. Patel sent it through your insurance. $299 refunded to Visa 4242 on Jul 9." },
]

export const AT_HOME = { start: { weight: 178, waist: 36.5 }, now: { weight: 165.6, waist: 34.0 }, goal: { weight: 158 } }

/** Ask Inlay's projections (deck 51) and the projection card (deck 50). */
export const PROJECTIONS = [
  { label: "30 days", weight: 162.8, waist: 33.8, fat: "7% less", likely: 85 },
  { label: "60 days", weight: 160.9, waist: 33.2, fat: "10% less", likely: 80 },
  { label: "120 days", weight: 157.5, waist: 32.5, fat: "13% less", likely: 75 },
  { label: "1 year", weight: 157, range: "156 to 158", waist: 32, fat: "15 to 18%", likely: 70 },
]

export const PACE = { lost: 12.4, days: 97, perWeek: 0.9, ahead: 0.6, remaining: 7.6, weeksLeft: 13, goal: 20 }

/** Photo check ins (deck 49): three dates, front and side. */
export const CHECK_INS = [
  { label: "Start", date: "Jul 1", weight: 178, waist: 36.5 },
  { label: "30 days", date: "Jul 31", weight: 168.3, waist: 34.1 },
  { label: "Today", date: "Oct 5", weight: 165.6, waist: 34.0 },
]

/* ----------------------------------------------------------- care -- */

export type Category = { id: string; name: string; what: string; partners: string; from: number }

export const CATEGORIES: Category[] = [
  { id: "lab", name: "Laboratory", what: "42 panels", partners: "Quest, Labcorp, Boston Heart", from: 89 },
  { id: "body", name: "Body composition and metabolism", what: "DEXA, RMR, VO2 max", partners: "Fitnescity", from: 129 },
  { id: "imaging", name: "Imaging", what: "MRI, CT, whole body", partners: "SimonMed, RAYUS", from: 699 },
  { id: "cancer", name: "Cancer screening", what: "Galleri, Shield, hereditary", partners: "GRAIL, Guardant", from: 249 },
  { id: "brain", name: "Brain health", what: "AD Detect, ApoE, ATN", partners: "Quest, Labcorp", from: 199 },
  { id: "sleep", name: "Sleep", what: "Two night home study", partners: "Lofta", from: 299 },
  { id: "devices", name: "Devices and wearables", what: "CGM, ring, cuff, scale", partners: "Dexcom, Oura, Withings", from: 99 },
  { id: "programmes", name: "Programmes", what: "SMART, nutrition, movement", partners: "Benson Henry", from: 100 },
  { id: "home", name: "Home and care products", what: "Supplies, meals, transport", partners: "Medline", from: 19 },
]

export type Item = {
  id: string
  name: string
  category: string
  by: string
  price: number
  standard: number
  results: string
  where: string
  visit: string
  does: string[]
  cannot: string[]
}

export const ITEMS: Item[] = [
  {
    id: "galleri",
    name: "Multi cancer blood screening",
    category: "Cancer screening",
    by: "Galleri, by GRAIL",
    price: 854,
    standard: 949,
    results: "2 to 3 weeks",
    where: "Any Quest site",
    visit: "One visit, about ten minutes, no fasting",
    does: [
      "Looks for a DNA signal shed by tumours, shared by more than fifty cancers. Many of them have no routine screening test at all.",
      "When a signal is found, the report predicts where it came from, so your physician knows which follow up to order first.",
      "The result lands in your record and is read beside everything else, not on its own.",
    ],
    cannot: [
      "It does not rule cancer out. A negative result is not a clean bill of health.",
      "A positive signal is not a diagnosis. It is a reason to investigate, and some signals turn out to be nothing.",
      "It does not replace mammography, colonoscopy or any screening your physician already recommends.",
    ],
  },
]

export const itemOf = (id: string) => ITEMS.find((i) => i.id === id)

/** The nearest draw sites and the next open times (deck 54). */
export const SITES = [
  { id: "clarkston", name: "Quest Diagnostics, Clarkston", address: "6880 Dixie Hwy", miles: 2.1, next: "Tomorrow" },
  { id: "waterford", name: "Quest Diagnostics, Waterford", address: "5885 Highland Rd", miles: 4.8, next: "Friday" },
  { id: "auburn", name: "Quest Diagnostics, Auburn Hills", address: "3100 Walton Blvd", miles: 9.3, next: "Today" },
]

export const DAYS = [
  { id: "thu", weekday: "Thu", day: 9 },
  { id: "fri", weekday: "Fri", day: 10 },
  { id: "sat", weekday: "Sat", day: 11 },
  { id: "mon", weekday: "Mon", day: 13 },
]

export const TIMES = [
  { time: "7:00", open: false },
  { time: "7:30", open: false },
  { time: "8:00", open: true },
  { time: "8:15", open: true },
  { time: "9:00", open: true },
  { time: "9:45", open: true },
  { time: "10:30", open: true },
  { time: "11:15", open: true },
]

/* --------------------------------------------------------- formats -- */

export function show(v: number | string | undefined, format: Metric["format"] = "int") {
  if (v === undefined) return ""
  if (typeof v === "string") return v
  if (format === "1dp") return v.toFixed(1)
  return Math.round(v).toLocaleString("en-US")
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
