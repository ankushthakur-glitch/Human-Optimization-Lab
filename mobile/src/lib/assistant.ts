import { PROGRAMS, recommend, type ProgramId, type Sex } from "@/lib/plans"

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

export const STARTERS = [
  "I feel tired all the time",
  "I want to lose weight",
  "My cholesterol is high",
  "I don't sleep well",
]

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
