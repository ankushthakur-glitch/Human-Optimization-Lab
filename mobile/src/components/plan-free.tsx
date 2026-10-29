import { PlanAdds } from "@/components/plan-adds"

/* The Plan tab for everyone who is not a member: the client's "What an
   optimization plan adds" (screen 20, 27 Oct 2026), a page of its own with
   the Inlay mark and no tab bar, whose caret and Back return to Home. See
   components/plan-adds.tsx. */

export function PlanFree() {
  return <PlanAdds />
}
