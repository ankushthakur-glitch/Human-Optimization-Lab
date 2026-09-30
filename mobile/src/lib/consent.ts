import { PATIENT } from "@/lib/patient"

/* The consent's terms, shared by the consent screen and its
   sheets. Sample wording until Inlay Health's lawyer returns the final
   form (same text as the web prototype's consent). */

/** How long collection runs, in months: one permission for a set period,
    rather than one for every pull. */
export const PERIODS = ["1", "3", "6", "9"]

export const LEGAL = [
  `I authorize Inlay Health to request, receive and store my health records from my healthcare providers, hospitals, laboratories and imaging centers, through national health information networks, and to share them with ${PATIENT.practice} for my care.`,
  "This includes visit notes, lab results, medications, conditions, allergies, procedures, immunizations and reports. It may include sensitive information such as mental health or substance use records where the law allows.",
  "Inlay Health protects this information as required by HIPAA. Information shared under this authorization may no longer be protected by federal privacy law if it is disclosed again by the recipient.",
  "This authorization lasts for the period I choose, and I will be asked before it is renewed. I can withdraw it at any time in the app, which stops future collection but does not undo information already shared. Inlay Health records the date I signed it and exactly what it covers.",
  "My treatment by my practice does not depend on signing this authorization.",
]

export const monthsLabel = (m: string) => (m === "1" ? "1 month" : `${m} months`)

/** The day collection stops if signed today. */
export function endDate(months: string) {
  const d = new Date()
  d.setMonth(d.getMonth() + Number(months))
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}
