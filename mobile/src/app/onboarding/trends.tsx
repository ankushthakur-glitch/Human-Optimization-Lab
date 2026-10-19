import { type Href, router } from "expo-router"
import * as React from "react"

import { FlowScreen } from "@/components/flow"
import { TrendTiles } from "@/components/trend-tile"
import { Button } from "@/components/ui"
import { useMarkers } from "@/lib/experience"
import { watchList } from "@/lib/trends"

/* The next step of the free journey after the record is built: the value
   phase is done, so this is the first of the two hard screens agreed on the
   16 Oct 2026 call with Dr. Blanchard ("value, then the wrong way"). It shows
   the markers whose results are moving away from the patient's range, each
   with the result before, the result now, its status and its direction.
   Everything comes from the record through lib/trends.ts: no clinical
   meaning is added here, and nothing about biological age, plans or prices.
   The patient moves on to Biological age, the next screen. */

/** Biological age, the next screen in the agreed flow. */
const NEXT = "/onboarding/biological-age" as Href

/** Only results from the last 12 months can make a marker count as moving now. */
const YEAR = 365 * 86400000

export default function TrendsScreen() {
  const markers = useMarkers()
  const shown = React.useMemo(() => {
    const since = Date.now() - YEAR
    return watchList(markers)
      .filter((t) => t.meaning === "away" && !!t.previous && !!t.latest && t.latest.t >= since)
      .slice(0, 4)
  }, [markers])

  return (
    <FlowScreen
      hol
      title={shown.length ? "These are trending the wrong way." : "Nothing is trending the wrong way."}
      footer={<Button onPress={() => router.push(NEXT)}>See my biological age</Button>}
    >
      <TrendTiles trends={shown} />
    </FlowScreen>
  )
}
