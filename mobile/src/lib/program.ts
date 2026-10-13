/* The paid Optimization plan, from the workflow's last stages: what it
   reads from and starts with, how it is built (the AI drafts, safety
   checks, the doctor approves), and living with it (today's actions, logging, progress, and a
   new version whenever new information arrives). Sample content for the
   prototype; the real plan is drafted from the patient's own record. */

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

/** Devices the plan reads from, through Terra. */
export const DEVICES = [
  { id: "apple", name: "Apple Health", kind: "Watch and phone" },
  { id: "oura", name: "Oura", kind: "Ring" },
  { id: "withings", name: "Withings", kind: "Scale and blood pressure cuff" },
  { id: "garmin", name: "Garmin", kind: "Watch" },
  { id: "fitbit", name: "Fitbit", kind: "Watch" },
] as const

/** What the plan needs measured before it starts: some are already in the
    record, the rest Inlay books. Openings for the missing tests are worked
    out from the device date, so they are never in the past. */
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
