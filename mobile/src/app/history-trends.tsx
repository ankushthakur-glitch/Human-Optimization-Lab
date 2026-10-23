import * as React from "react"

import { HistoryView } from "@/components/history-view"
import { TabScreen } from "@/components/tab-bar"
import { OVERALL } from "@/lib/history"

/* Plan > History > Your history (Journey_14 screen 41): deficit, steps,
   exercise and weight graphed over the week, month, six months and year.
   It was the body of the History tab; the tab now leads with yesterday's
   score and opens this from one row. */

export default function HistoryTrendsScreen() {
  return (
    <TabScreen tab="plan" back title="Your history">
      <HistoryView history={OVERALL} overall />
    </TabScreen>
  )
}
