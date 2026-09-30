import { PROGRAMS, recommend, type ProgramId, type Sex } from "@/lib/plans"
import { BIOMARKERS, DIRECTION_SENTENCE, MEDICATIONS, ORIGIN_LABEL, direction, medDifference } from "@/lib/record"

/* The assistant's first job, scripted for the prototype (no model behind it
   yet): the patient says what is bothering them, answers three short
   questions, and gets the programs that fit, from what they said and what
   their record shows. The real copilot replaces this with HOL's clinical
   rules; the care team reviews every plan before it starts either way. */

export type QuestionId = "duration" | "goal" | "activity"

export const QUESTIONS: { id: QuestionId; text: string; options: string[] }[] = [
  {
    id: "duration",
    text: "How long has this been going on?",
    options: ["A few weeks", "A few months", "Over a year"],
  },
  {
    id: "goal",
    text: "What would you most like to change?",
    options: ["More energy", "Lose weight", "Heart health", "Better sleep"],
  },
  {
    id: "activity",
    text: "How many days a week are you active?",
    options: ["Rarely", "1 or 2 days", "3 or more days"],
  },
]

/* The guided flow, after the support bots in food and grocery apps: the
   assistant offers a short list of topics inside its own message, each
   topic narrows with one more list (a result, a medicine, a concern), the
   answer comes back in the thread, and the chat closes with a rating. */

export const TOPICS = {
  result: "Explain one of my results",
  concern: "Something is bothering me",
  visit: "Prepare for my next visit",
  medicine: "A question about my medicines",
  team: "Message my care team",
} as const

export type Topic = keyof typeof TOPICS

export const CONCERNS = ["I feel tired all the time", "I want to lose weight", "I'm not sleeping well", "Something else"]

export const WRAP_UP = {
  more: "I have another question",
  team: "Message my care team",
  done: "No, that's all",
} as const

/** The medicines the patient can ask about: what is on a list and not settled. */
export const ASKABLE_MEDICINES = MEDICATIONS.filter((m) => m.kind === "medicine" && !m.resolved)

/** What the record says about one medicine, and nothing it doesn't. */
export function medicineAnswer(name: string): string[] {
  const med = MEDICATIONS.find((m) => m.name === name)
  if (!med) return ["I couldn't find that medicine in your record."]
  const lines = med.lists.map((l) => `${ORIGIN_LABEL[l.origin]}: ${l.dose} (${l.date})`).join("\n")
  const difference = medDifference(med)
  return [
    `Here is how ${med.name.toLowerCase()} appears in your record:\n${lines}`,
    difference
      ? `${difference}, so Dr. Patel will confirm which is right. Until then, keep taking it the way you were told.`
      : "Your lists agree. If that isn't how you take it, tell your care team.",
  ]
}

/** What the patient's words point to. */
const CUES: { match: RegExp; program: ProgramId; reason: string }[] = [
  { match: /tired|energy|fatigue|exhaust|sugar|diabet|thirst/i, program: "metabolic", reason: "You mentioned low energy" },
  { match: /weight|lose|heavy|bmi|belly|fat\b/i, program: "weight", reason: "You want to manage your weight" },
  { match: /cholesterol|heart|chest|lipid|triglyc/i, program: "heart", reason: "You asked about your heart" },
  { match: /pressure|headache|dizz/i, program: "pressure", reason: "You mentioned blood pressure" },
  { match: /sleep|insomnia|wak(e|ing) up|restless/i, program: "sleep", reason: "You mentioned poor sleep" },
  { match: /muscle|strength|weak|joint|stiff/i, program: "strength", reason: "You want to feel stronger" },
  { match: /hot flash|menopaus|night sweat|period/i, program: "menopause", reason: "You mentioned menopause symptoms" },
  { match: /testosterone|libido|male hormone/i, program: "male-hormone", reason: "You asked about hormones" },
]

const GOALS: Record<string, ProgramId> = {
  "More energy": "metabolic",
  "Lose weight": "weight",
  "Heart health": "heart",
  "Better sleep": "sleep",
}

export type Suggestion = { program: ProgramId; reasons: string[] }

/** Up to three programs: what the patient raised first, backed by any
    results that agree, then what the record points to on its own. */
export function suggest(concern: string, answers: Partial<Record<QuestionId, string>>, sex: Sex): Suggestion[] {
  const allowed = (id: ProgramId) => {
    const only = PROGRAMS.find((p) => p.id === id)?.only
    return !only || only === sex
  }
  const fromRecord = recommend()
  const picked = new Map<ProgramId, string[]>()
  const add = (program: ProgramId, reason: string) => {
    if (!allowed(program)) return
    const reasons = picked.get(program) ?? []
    if (!reasons.includes(reason)) reasons.push(reason)
    picked.set(program, reasons)
  }

  for (const cue of CUES) if (cue.match.test(concern)) add(cue.program, cue.reason)
  const goal = answers.goal && GOALS[answers.goal]
  if (goal) add(goal, `Your goal: ${answers.goal!.toLowerCase()}`)
  if (answers.activity === "Rarely" && picked.has("weight")) add("weight", "Active less than once a week")

  // Results that back up what they said, then the record's own picks.
  for (const [program, reasons] of picked) {
    const record = fromRecord.find((r) => r.program === program)
    if (record) reasons.push(...record.reasons)
  }
  for (const r of fromRecord) if (!picked.has(r.program)) picked.set(r.program, r.reasons)

  return [...picked].slice(0, 3).map(([program, reasons]) => ({ program, reasons: reasons.slice(0, 3) }))
}

/* ------------------------------------------------- about the record -- */

/** The free record comes with a few AI questions a month; Optimization
    has no limit. */
export const FREE_QUESTIONS = 5

/** Record questions the prototype can answer: explain a value or trend,
    find history, prepare questions for the doctor. Answers use only the
    data the question needs, stay within the record, and never diagnose or
    advise on medicines. Null when the question is not about the record. */
export function recordAnswer(text: string): string[] | null {
  const marker = BIOMARKERS.find((b) => new RegExp(TOPIC[b.id] ?? b.name, "i").test(text))
  if (/ask (my )?doctor|questions? for|prepare/i.test(text)) {
    return [
      "Here are questions you could take to Dr. Patel, from what's in your record:",
      "1. My A1c has gone up in each of my last 4 results, from 5.3 to 5.9. What would you like me to do about it?\n2. Scripps started me on lisinopril at urgent care in June. Should I keep taking it?\n3. My LDL is 162. Is my atorvastatin dose right?\n4. When should I have a colorectal cancer screening?",
    ]
  }
  if (!marker) return null
  const dir = direction(marker)
  const pts = marker.points
  const first = pts[0]
  const last = pts.at(-1)!
  const history =
    pts.length > 1
      ? `You have ${pts.length} results, from ${first.shown ?? first.value} in ${first.date} to ${last.shown ?? last.value} in ${last.date}.`
      : `You have one result so far: ${last.shown ?? last.value} ${marker.unit} in ${last.date}.`
  return [
    `${history} The target is ${marker.target.toLowerCase()} ${marker.unit}.`,
    `${DIRECTION_SENTENCE[dir]} What that means for you is something to talk through with Dr. Patel.`,
  ]
}

const TOPIC: Record<string, string> = {
  a1c: "a1c|blood sugar|hemoglobin",
  ldl: "ldl|cholesterol",
  tg: "triglyc",
  bp: "blood pressure|\\bbp\\b",
  bmi: "bmi|body mass",
  vitd: "vitamin d",
  hdl: "hdl",
  tsh: "thyroid|tsh",
}
