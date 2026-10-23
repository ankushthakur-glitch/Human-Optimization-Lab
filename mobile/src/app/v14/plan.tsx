import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { Text } from "react-native"

import { TabScreen } from "@/components/tab-bar"
import { PlanHistory } from "@/components/v14-plan-history"
import { PlanOutlook } from "@/components/v14-plan-outlook"
import { PlanProgress } from "@/components/v14-plan-progress"
import { PlanTodaySection } from "@/components/v14-plan-today"
import { PlanSections, useV14Member, type Section } from "@/components/v14-kit"
import { type } from "@/lib/theme"
import { PATIENT } from "@/lib/v14"

/* The v14 Plan tab (Journey_14, screens 30 to 51): the member's plan as
   four sections pinned under the title, Today first, then Progress,
   History and Outlook, as Dnyaneshwri proposed on the 22 Oct call and Ed
   and Finn agreed. A dummy beside the current Plan tab; the section is in
   the link so each one can be shared on its own. */

const SECTIONS: Section[] = ["today", "progress", "history", "outlook"]

export default function V14Plan() {
  useV14Member()
  const { section: asked } = useLocalSearchParams<{ section?: string }>()
  const section: Section = SECTIONS.includes(asked as Section) ? (asked as Section) : "today"
  return (
    <TabScreen tab="plan" title="Plan" headerRight={<Text style={type.meta}>{`Day ${PATIENT.day}`}</Text>} pinned={<PlanSections value={section} onChange={(s) => router.replace(`/v14/plan?section=${s}` as never)} />}>
      {section === "today" && <PlanTodaySection />}
      {section === "progress" && <PlanProgress />}
      {section === "history" && <PlanHistory />}
      {section === "outlook" && <PlanOutlook />}
    </TabScreen>
  )
}
