/* The sleep apnea screen (26 Oct call: added to onboarding with
   flourishing): STOP-BANG, eight yes or no questions. The first four
   (STOP) are about her sleep and days, and are the only ones she is asked;
   the last four (BANG) are facts about her, read from her record (BMI,
   age, sex), never asked. Neck size is not in the record, so it counts as
   no until it is measured. Shared by the questions (/sleep-questions) and
   the result (/sleep-result). */

export type SleepId = "snore" | "tired" | "observed" | "pressure" | "bmi" | "age" | "neck" | "male"

export type SleepItem = { id: SleepId; text: string; short: string }

/** STOP: her sleep and her days. */
export const STOP: SleepItem[] = [
  { id: "snore", text: "Do you snore loudly, louder than talking or loud enough to hear through a closed door?", short: "Loud snoring" },
  { id: "tired", text: "Do you often feel tired, fatigued or sleepy during the day?", short: "Tired in the day" },
  { id: "observed", text: "Has anyone seen you stop breathing, choke or gasp in your sleep?", short: "Seen to stop breathing" },
  { id: "pressure", text: "Do you have, or are you treated for, high blood pressure?", short: "High blood pressure" },
]

/** BANG: facts about her. */
export const BANG: SleepItem[] = [
  { id: "bmi", text: "Is your BMI more than 35?", short: "BMI over 35" },
  { id: "age", text: "Are you older than 50?", short: "Older than 50" },
  { id: "neck", text: "Is your neck more than 40 cm (16 in) around?", short: "Neck over 40 cm" },
  { id: "male", text: "Are you male?", short: "Male" },
]

export const SLEEP_ITEMS = [...STOP, ...BANG]

export type SleepAnswers = Partial<Record<SleepId, boolean>>

/** The BANG facts from her record: BMI, age and sex as the record has
    them, with what she changed on /health-profile winning (45, female,
    BMI 32.4 for the sample patient), each as its value and as a yes or
    no. Neck size is never in the record. */
export function fromRecord(changed: Record<string, string> = {}): { answers: SleepAnswers; values: Partial<Record<SleepId, string>> } {
  const bmi = changed.bmi ?? "32.4"
  const age = changed.age ?? "45"
  const sex = changed.sex ?? "Female"
  return {
    answers: { bmi: parseFloat(bmi) > 35, age: parseInt(age, 10) > 50, male: sex.toLowerCase() === "male" },
    values: { bmi, age, male: sex },
  }
}

export type SleepRisk = "low" | "intermediate" | "high"

/** The clinic's scoring: 0 to 2 yes is low risk, 5 to 8 high. 3 or 4 is
    intermediate, unless 2 or more STOP answers are yes together with male
    sex, a BMI over 35 or a neck over 40 cm, which makes it high. */
export function sleepRisk(a: SleepAnswers): { yes: number; risk: SleepRisk } {
  const yes = SLEEP_ITEMS.filter((i) => a[i.id]).length
  const stop = STOP.filter((i) => a[i.id]).length
  if (yes >= 5) return { yes, risk: "high" }
  if (yes <= 2) return { yes, risk: "low" }
  return { yes, risk: stop >= 2 && (a.male || a.bmi || a.neck) ? "high" : "intermediate" }
}
