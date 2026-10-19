import { type Href, router } from "expo-router"
import * as React from "react"

import { FlowScreen } from "@/components/flow"
import { Group, ResultRow } from "@/components/record-kit"
import { Button } from "@/components/ui"
import { biologicalAge, drivers } from "@/lib/biological-age"
import { useMarkers } from "@/lib/experience"
import { useOnboarding } from "@/lib/onboarding"

/* The last of the three screens agreed on the 16 Oct 2026 call: what is
   driving her biological age, in the call's own words "these are the things
   contributing to your biological age being higher than it should be", e.g.
   BMI, blood sugar, blood pressure. Each card is a result in her record that
   is out of range, borderline or moving away, with what it was, what it is
   and the record's own plain sentence about it. No years are given per
   marker: the call asked for the reasons, and the model that would weigh
   them does not exist yet. The plans that can help come next (/plans, the
   upgrade page that opens with the AI plan match). */

/** The upgrade page, which opens with "AI matched N of 81 plans". */
const NEXT = "/plans" as Href

/** The most cards shown; the rest are counted, never hidden silently. */
const MOST = 3

export default function WhatIsDrivingItScreen() {
  const markers = useMarkers()
  const onboarding = useOnboarding()
  // The last step of setup: finish it so the dashboard opens, then open the
  // plans page over it (as an offer anywhere in the app does), so Back lands
  // on Home. Finishing swaps the guarded screens and takes this one with it,
  // so the moves after it run from here, not from an effect.
  const finish = async () => {
    await onboarding.save({ step: "done" })
    setTimeout(() => {
      router.replace("/")
      setTimeout(() => router.push(NEXT), 300)
    }, 300)
  }
  const all = React.useMemo(() => drivers(markers), [markers])
  const list = all.slice(0, MOST)
  const { gap } = React.useMemo(() => biologicalAge(), [])
  const none = all.length === 0

  const lede = none
    ? "Nothing in your record is out of range."
    : gap > 0
      ? "These results are pushing your biological age above your real age."
      : "These results are out of range or moving the wrong way."

  return (
    <FlowScreen hol title="What is driving it?" description={lede} footer={<Button onPress={finish}>See plans that can help</Button>}>
      {/* The Record tab's biomarker rows, not tappable: a marker's page
          opens only once setup is done. */}
      {!none && (
        <Group>
          {list.map((t) => (
            <ResultRow key={t.id} trend={t} />
          ))}
        </Group>
      )}
    </FlowScreen>
  )
}
