import { type Href, router } from "expo-router"
import * as React from "react"

import { FlowScreen } from "@/components/flow"
import { TrendTiles } from "@/components/trend-tile"
import { Button } from "@/components/ui"
import { useMarkers } from "@/lib/experience"
import { watchList } from "@/lib/trends"

/* The record tour's third step, the first of the two hard screens agreed
   on the 16 Oct 2026 call ("value, then the wrong way"): the markers whose
   results are moving away from her range, as the trend tiles, each with
   its last results, its status and its direction. Everything comes from
   the record through lib/trends.ts: no clinical meaning is added here, and
   nothing about biological age, plans or prices. Next: Biological age. */

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
      title={shown.length ? "Trending the wrong way" : "Nothing trending the wrong way"}
      description={shown.length ? "Results from the last year moving away from your range." : "Your results from the last year are holding steady."}
      footer={<Button onPress={() => router.push(NEXT)}>See my biological age</Button>}
    >
      <TrendTiles trends={shown} />
    </FlowScreen>
  )
}
