import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"

import { FlowScreen } from "@/components/flow"
import { EmptyState } from "@/components/record-kit"
import { TopicHistory } from "@/components/v14-kit"
import { historyOf } from "@/lib/v14"

/* A topic's history (Journey_14 screens 41 to 47): day, week, month, six
   months and a year, with the metric switched independently, in the shape
   patients know from Apple Health. "all" is the history of every figure
   together (screen 41). */

export default function V14History() {
  const { topic } = useLocalSearchParams<{ topic: string }>()
  const history = historyOf(topic ?? "")
  if (!history)
    return (
      <FlowScreen page title="History">
        <EmptyState title="No history for this yet" line="It starts once the plan has a few days of numbers." action="Back to your plan" onAction={() => router.back()} />
      </FlowScreen>
    )
  return (
    <FlowScreen page title={history.title} description={history.lead}>
      <TopicHistory history={history} />
    </FlowScreen>
  )
}
