import * as React from "react"

import { FreeHome } from "@/components/home-free"
import { OptimizedHome } from "@/components/home-optimized"
import { homeFor, useExperience } from "@/lib/experience"

/* Home: one of two first screens, chosen by the one selector screens use
   to tell the patients apart (lib/experience.ts, FINAL-SPEC A.3). A member
   with a live plan gets the free home with her plan woven in (12 Oct
   2026): what needs her, yesterday's score and goals, today's plan, then
   her record. The previous member home is kept at /home-previous.
   Everyone else gets the free home (free, building, declined, paused, and
   a cancelled member or one who turned sharing off, both on the free
   record), which also draws the not connected, record arriving and paused
   states. Each home draws its own tab screen and header, so it can pass
   its sheets over the tab bar. */

export default function HomeScreen() {
  const { experience } = useExperience()
  return homeFor(experience) === "member" ? <OptimizedHome /> : <FreeHome />
}
