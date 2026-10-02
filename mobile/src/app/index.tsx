import * as React from "react"

import { FreeHome } from "@/components/home-free"
import { MemberHome } from "@/components/home-member"
import { homeFor, useExperience } from "@/lib/experience"

/* Home: one of two first screens, chosen by the one selector screens use
   to tell the patients apart (lib/experience.ts, FINAL-SPEC A.3). A member
   setting up, waiting for version 1 or with a live plan starts the day on
   the member home: today, yesterday, this week, since you started.
   Everyone else gets the free home (free, building, declined, paused, and
   a cancelled member or one who turned sharing off, both on the free
   record), which also draws the not connected, record arriving and paused
   states. Each home draws its own tab screen and header, so it can pass
   its sheets over the tab bar. */

export default function HomeScreen() {
  const { experience } = useExperience()
  return homeFor(experience) === "member" ? <MemberHome /> : <FreeHome />
}
