/* The paid Optimization plan, from the workflow's last stages: setting it
   up (a fuller questionnaire, medicines, a device, the starting tests, a
   short tour), how it is built (the AI drafts, safety checks, the doctor
   approves), and living with it (today's actions, logging, progress, and a
   new version whenever new information arrives). Sample content for the
   prototype; the real plan is drafted from the patient's own record. */

/* ------------------------------------------------------------- setup -- */

export type SetupStep = "questionnaire" | "medicines" | "devices" | "tests" | "tour"

export const SETUP: { id: SetupStep; title: string; href: `/optimize/${SetupStep}` }[] = [
  { id: "questionnaire", title: "Tell us more about you", href: "/optimize/questionnaire" },
  { id: "medicines", title: "Confirm your medicines", href: "/optimize/medicines" },
  { id: "devices", title: "Connect a device", href: "/optimize/devices" },
  { id: "tests", title: "Book your starting tests", href: "/optimize/tests" },
  { id: "tour", title: "A quick tour", href: "/optimize/tour" },
]

export const nextSetup = (done: SetupStep[]) => SETUP.find((s) => !done.includes(s.id))

/** The fuller questionnaire, one page per topic. */
export type IntakePage = {
  id: string
  title: string
  questions: (
    | { id: string; type: "pick"; label: string; options: string[]; max?: number }
    | { id: string; type: "one"; label: string; options: string[] }
    | { id: string; type: "text"; label: string; placeholder: string }
  )[]
}

export const INTAKE: IntakePage[] = [
  {
    id: "goals",
    title: "What do you want from your plan?",
    questions: [
      {
        id: "goals",
        type: "pick",
        label: "Pick up to 3",
        max: 3,
        options: ["Lose weight", "Lower my cholesterol", "Steadier blood sugar", "More energy", "Sleep better", "Get stronger", "Lower my blood pressure"],
      },
      { id: "picture", type: "text", label: "In 6 months, what would be different?", placeholder: "Keep up with my kids on a hike" },
    ],
  },
  {
    id: "history",
    title: "Your health history",
    questions: [
      {
        id: "family",
        type: "pick",
        label: "Runs in your family",
        options: ["Heart disease", "Type 2 diabetes", "Stroke", "Cancer", "High blood pressure", "None that I know of"],
      },
      { id: "other", type: "text", label: "Anything else your doctor should know?", placeholder: "Old injuries, surgeries, pregnancies" },
    ],
  },
  {
    id: "habits",
    title: "A normal week",
    questions: [
      { id: "active", type: "one", label: "Days you are active", options: ["Rarely", "1 or 2", "3 to 4", "5 or more"] },
      { id: "sleep", type: "one", label: "Sleep most nights", options: ["Under 6 hours", "6 to 7 hours", "7 to 8 hours", "Over 8 hours"] },
      { id: "alcohol", type: "one", label: "Drinks a week", options: ["None", "1 to 3", "4 to 7", "8 or more"] },
      { id: "eating", type: "one", label: "Most of your meals", options: ["Home cooked", "Mixed", "Eating out"] },
    ],
  },
  {
    id: "tried",
    title: "What you have tried",
    questions: [
      {
        id: "tried",
        type: "pick",
        label: "Tried before",
        options: ["Diets", "Gym membership", "Fitness apps", "Weight loss medicine", "A coach", "Nothing yet"],
      },
      { id: "worked", type: "text", label: "What worked, even for a while?", placeholder: "Walking with a friend kept me going" },
    ],
  },
  {
    id: "barriers",
    title: "What gets in the way",
    questions: [
      {
        id: "barriers",
        type: "pick",
        label: "Pick any",
        options: ["Time", "Work travel", "Cost", "Motivation", "Pain or injury", "Family", "Stress"],
      },
    ],
  },
]

export type Intake = Record<string, string | string[]>

/** Devices the plan reads from, through Terra. */
export const DEVICES = [
  { id: "apple", name: "Apple Health", kind: "Watch and phone" },
  { id: "oura", name: "Oura", kind: "Ring" },
  { id: "withings", name: "Withings", kind: "Scale and blood pressure cuff" },
  { id: "garmin", name: "Garmin", kind: "Watch" },
  { id: "fitbit", name: "Fitbit", kind: "Watch" },
] as const

export const FOOD_LOGGING = ["Photo", "Voice", "Type it"] as const

/** What the plan needs measured before it starts: some are already in the
    record, the rest Inlay books. */
export const BASELINE = {
  have: [
    { name: "Lipid panel", date: "Aug 14, 2026" },
    { name: "Hemoglobin A1c", date: "Aug 14, 2026" },
    { name: "Blood pressure", date: "Aug 12, 2026" },
  ],
  missing: [
    {
      id: "blood",
      name: "Comprehensive blood panel",
      detail: "ApoB, fasting insulin, liver and kidney markers",
      where: "Harborview Longevity Clinic",
      slots: ["Mon, Oct 5, 8:00 AM", "Tue, Oct 6, 7:30 AM", "Thu, Oct 8, 8:15 AM"],
    },
    {
      id: "dexa",
      name: "DEXA body scan",
      detail: "Body fat, muscle and bone density",
      where: "Coastal Imaging, Del Mar",
      slots: ["Wed, Oct 7, 10:00 AM", "Fri, Oct 9, 2:30 PM", "Mon, Oct 12, 9:00 AM"],
    },
  ],
}

export const TOUR = [
  { title: "One thing to do today", body: "Your plan turns into a short list each morning: food, movement and anything to check." },
  { title: "Log what you actually did", body: "Tick it off, or tell us what happened instead. Missed days are part of it." },
  { title: "See it move", body: "Progress is measured against where you started, from your own results." },
  { title: "Your doctor stays in the loop", body: "Every version of your plan is approved by Dr. Maya Patel before it reaches you." },
]

/* ----------------------------------------------------------- building -- */

/** What the plan is drafted from, and what it goes through before anyone
    relies on it. */
export const BUILD = [
  { title: "Built from your whole record", detail: "Your results, medicines, the questionnaire and your why" },
  { title: "Approved sources only", detail: "Clinical guidelines chosen by Inlay's medical team" },
  { title: "One plan, not several", detail: "Where two goals pull against each other, one safe daily plan" },
  { title: "Safety checks", detail: "No diagnosis, no medicine changes, nothing against your conditions" },
  { title: "Dr. Maya Patel approves it", detail: "It stays a draft until then" },
]

/* -------------------------------------------------------------- today -- */

export type ActionKind = "food" | "move" | "steps" | "check"

export type PlanAction = {
  id: string
  kind: ActionKind
  title: string
  detail: string
  /** How to do it, step by step. */
  how: string[]
  /** For goals counted by a device. */
  target?: number
  sofar?: number
}

export const TODAY: PlanAction[] = [
  {
    id: "breakfast",
    kind: "food",
    title: "Protein at breakfast",
    detail: "About 30 g",
    how: ["Two eggs and a cup of Greek yogurt", "Or a protein smoothie with oats", "Keep juice and pastries for weekends"],
  },
  {
    id: "walk",
    kind: "move",
    title: "Brisk walk after dinner",
    detail: "20 minutes",
    how: ["A pace where you can talk, not sing", "Within an hour of eating, to help blood sugar", "Rain plan: 20 minutes on stairs or a video"],
  },
  {
    id: "steps",
    kind: "steps",
    title: "Steps",
    detail: "7,500 today",
    target: 7500,
    sofar: 4210,
    how: ["Counted by your Apple Watch", "Take calls on your feet", "Park at the far end of the lot"],
  },
  {
    id: "strength",
    kind: "move",
    title: "Strength, 3 moves",
    detail: "15 minutes, video",
    how: ["Chair squats, 3 sets of 10", "Wall push ups, 3 sets of 8", "Glute bridges, 3 sets of 12"],
  },
  {
    id: "bp",
    kind: "check",
    title: "Check your blood pressure",
    detail: "Tonight, seated, after 5 minutes rest",
    how: ["Feet flat, arm resting at heart height", "Two readings, a minute apart", "Your cuff sends the reading to your record"],
  },
]

/* ----------------------------------------------------------- progress -- */

/** Against where the patient started. The forecast is marked as one. */
export const PROGRESS = [
  {
    id: "weight",
    name: "Weight",
    unit: "lb",
    start: 189,
    now: 186.4,
    goal: 175,
    points: [189, 188.6, 187.9, 187.2, 186.4],
    forecast: [186.4, 183.5, 180.8, 178.2],
    better: "down" as const,
  },
  {
    id: "steps",
    name: "Daily steps",
    unit: "a day",
    start: 4100,
    now: 6350,
    goal: 7500,
    points: [4100, 4800, 5400, 5900, 6350],
    forecast: [6350, 6900, 7300, 7500],
    better: "up" as const,
  },
]

export const REPEAT_TESTS = [
  { name: "Repeat lipid panel and A1c", when: "Dec 14, 2026", where: "Harborview Longevity Clinic" },
  { name: "Repeat DEXA body scan", when: "Jan 11, 2027", where: "Coastal Imaging, Del Mar" },
]

export const MILESTONE = { title: "7 days in a row", body: "A full week of walks after dinner." }
