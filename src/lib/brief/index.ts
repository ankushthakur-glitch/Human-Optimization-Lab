import { type HomeContext, composeHomeBrief } from "@/lib/brief/home"
import { PATIENT_GENERATORS, type PatientContext } from "@/lib/brief/patient"
import { BRIEF_LIMIT, type BriefItem } from "@/lib/brief/types"

export type { BriefFilter, BriefItem, Source, SourceKind, Tone } from "@/lib/brief/types"
export { BRIEF_LIMIT, FEEDBACK_REASONS, TONE_RANK } from "@/lib/brief/types"
export { type HomeContext, composeHomeBrief, fractionWord, heaviestFor } from "@/lib/brief/home"
export { type PatientContext, briefAsText, briefMeta } from "@/lib/brief/patient"

/* composeBrief: a pure function from the store to the brief's items. Each
   generator returns items with sources; an item without one is dropped;
   the top four by tone (urgent → info, newest first within a tone) stay.
   The home brief reads in that rank order. A patient brief reads in its
   generators' order, the order of the physician's questions (what is
   dangerous, what changed, what improved, what to act on), which is the
   order the expected briefs fix. */

export function composeBrief(scope: "home", ctx: HomeContext): BriefItem[]
export function composeBrief(scope: "patient", ctx: PatientContext): BriefItem[]
export function composeBrief(scope: "home" | "patient", ctx: HomeContext | PatientContext): BriefItem[] {
  if (scope === "home") return composeHomeBrief(ctx as HomeContext)
  const drafts = PATIENT_GENERATORS.flatMap((g) => g(ctx as PatientContext)).filter((i) => i.sources.length > 0)
  const ranked = [...drafts].sort((a, b) => a.rank - b.rank || b.at.localeCompare(a.at)).slice(0, BRIEF_LIMIT)
  const kept = new Set(ranked)
  return drafts.filter((d) => kept.has(d))
}

/** The brief as plain text, each item followed by its sources in brackets. */
export function briefText(items: BriefItem[]) {
  return items
    .map((i) => `${i.lead} ${i.body}`.trim() + ` [${i.sources.map((s) => s.label).join("; ")}]`)
    .join("\n")
}
