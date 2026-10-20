/* "Tell us about your life" (setup, right after "Updates about your care"):
   one 0 to 10 question for each of the eight parts of life Inlay follows,
   asked while the record arrives, then "Which three would you most like to
   improve?". Every question can be skipped, and so can the whole set. The
   answers are the patient's own and stay on the device until the care team
   asks for them; nothing here goes to the clinic unless she sends it.

   Only the first question's wording came from the design; the other seven
   are written to the same pattern and wait for the clinical team's review. */

export type DomainKey =
  | "physical"
  | "emotional"
  | "relationships"
  | "purpose"
  | "intellectual"
  | "contribution"
  | "financial"
  | "agency"

export type Domain = {
  key: DomainKey
  /** The full name, as the intro and the improve list print it. */
  label: string
  /** The short name beside "1 of 8". */
  short: string
  question: string
}

/** The window every question asks about. */
export const THINKING_ABOUT = "Thinking about the past two weeks"

export const DOMAINS: Domain[] = [
  { key: "physical", label: "Physical health & vitality", short: "Physical health", question: "How would you rate your overall physical health?" },
  { key: "emotional", label: "Emotional health & resilience", short: "Emotional health", question: "How well have you been coping with stress and difficult feelings?" },
  { key: "relationships", label: "Relationships & connection", short: "Relationships", question: "How satisfied are you with your relationships with family and friends?" },
  { key: "purpose", label: "Purpose & meaning", short: "Purpose", question: "How much do you feel your life has meaning and direction?" },
  { key: "intellectual", label: "Intellectual growth", short: "Intellectual growth", question: "How often have you been learning, or challenging your mind?" },
  { key: "contribution", label: "Contribution & balance", short: "Contribution", question: "How well are your work, rest and time for others in balance?" },
  { key: "financial", label: "Financial well-being", short: "Financial well-being", question: "How comfortable do you feel about your financial situation?" },
  { key: "agency", label: "Health agency", short: "Health agency", question: "How confident are you in managing your own health?" },
]

/** 0 to 10, the scale of every question. */
export const SCALE = Array.from({ length: 11 }, (_, i) => i)

/** What she has said so far. A skipped question is simply missing. */
export type Life = {
  ratings: Partial<Record<DomainKey, number>>
  /** The three she most wants to improve, in the order she ticked them. */
  focus?: DomainKey[]
  /** The symptoms that bother her most, chips she tapped and anything she typed or said. */
  symptoms?: string[]
  /** How much each of those bothers her, 1 to 10, by symptom. */
  symptomRatings?: Record<string, number>
  /** She chose "Skip for now" on the intro. */
  skipped?: boolean
}

/** The symptoms offered on "What Matters Most", and how many she may choose. */
export const SYMPTOMS = ["Irritability", "Sadness", "Anxiety", "Fatigue", "Lack of sleep", "Weight gain", "Low back pain", "Poor focus"]
export const SYMPTOM_COUNT = 3

/** How many she picks to improve. */
export const FOCUS_COUNT = 3

/** At or above this a bar reads as doing well; below it, as room to grow. */
export const DOING_WELL = 6

/** The first question without an answer, or the first one when all are in
    (starting the set again, or coming back to it, begins at the top; never
    on the last question). */
export const firstOpen = (ratings: Life["ratings"]) => {
  const at = DOMAINS.findIndex((d) => ratings[d.key] === undefined)
  return at < 0 ? 0 : at
}

export const rated = (ratings: Life["ratings"]) => DOMAINS.filter((d) => ratings[d.key] !== undefined)

/** The sample answers the review's shortcut fills in, the ones the design shows. */
export const SAMPLE_RATINGS: Life["ratings"] = {
  physical: 6.2,
  emotional: 7.8,
  relationships: 8.4,
  purpose: 9.0,
  intellectual: 7.1,
  contribution: 5.4,
  financial: 7.3,
  agency: 5.8,
}
