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

/** How she logs food, each a noun after "Log food by". */
export const FOOD_LOGGING = ["Photo", "Voice", "Typing"] as const

/** What the plan needs measured before it starts: some are already in the
    record, the rest Inlay books. Openings for the missing tests are worked
    out from the device date (lib/setup.ts startingTests, E.13), so they are
    never in the past. */
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
    },
    {
      id: "dexa",
      name: "DEXA body scan",
      detail: "Body fat, muscle and bone density",
      where: "Coastal Imaging, Del Mar",
    },
  ],
}

export const TOUR = [
  { title: "One thing to do today", body: "Your plan turns into a short list each morning: food, movement and anything to check." },
  { title: "Log what you actually did", body: "Tick it off, or tell us what you did instead. Busy days are part of it." },
  { title: "See it move", body: "Progress is measured against where you started, from your own results." },
  { title: "Your doctor stays in the loop", body: "Every version of your plan is approved by Dr. Patel before it reaches you." },
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
