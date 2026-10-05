/* The AI brief's contract, shared by the home and the patient scopes. A
   brief is a short list of sourced statements composed from the same
   selectors the cards read (home.ts, patient.ts); no sentence is stored.
   Every item carries at least one source the page can open, or it is not
   rendered. */

export type Tone = "urgent" | "action" | "clinical" | "improving" | "info"

export type SourceKind = "lab" | "document" | "encounter" | "medication" | "patient" | "plan" | "order" | "filter"

/** What a filter chip applies: a worklist tab, an age bucket, a patient. */
export type BriefFilter = { tab?: string; age?: string; patientId?: string }

export interface Source {
  label: string
  kind: SourceKind
  /** What the page opens: a marker name, a report key, an order key, a card id. */
  refId: string
  filter?: BriefFilter
}

export interface BriefItem {
  id: string
  tone: Tone
  /** The bold first sentence. */
  lead: string
  /** One plain sentence (or two short ones) after it. */
  body: string
  sources: Source[]
  rank: number
  /** The newest date behind the item, for ordering within a tone. */
  at: string
}

export const TONE_RANK: Record<Tone, number> = { urgent: 0, action: 1, clinical: 2, improving: 3, info: 4 }

/** The same table under the name the patient generators use. */
export const RANK = TONE_RANK

/** How many items a brief keeps. */
export const BRIEF_LIMIT = 4

export type Rating = "up" | "down"

export const FEEDBACK_REASONS = ["Inaccurate", "Missing information", "Outdated", "Wrong patient", "Other"] as const

export type FeedbackReason = (typeof FEEDBACK_REASONS)[number]
