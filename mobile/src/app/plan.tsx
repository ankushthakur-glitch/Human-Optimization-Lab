

import { PlanFree } from "@/components/plan-free"
import { PlanMember } from "@/components/plan-member"
import { planFor, useExperience } from "@/lib/experience"

/* Plan: chosen by the same selector as Home (lib/experience.ts, FINAL-SPEC
   A.3), so no screen tests the membership itself. Any member, paused
   included, sees her own plan: the live plan, or the plan paused with every version kept (C.16).
   Everyone else sees her step, her why and the showroom (C.14); a
   cancelled member finds her past plans there. Each draws its own tab
   screen, so its sheets (the checkout among them) pass over the tab bar. */

export default function PlanScreen() {
  return planFor(useExperience()) === "member" ? <PlanMember /> : <PlanFree />
}
