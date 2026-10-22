import { useLocalSearchParams } from "expo-router"
import * as React from "react"

import { PageNotFoundState } from "@/components/error-state"
import { HistoryView } from "@/components/history-view"
import { TopicHead, TopicPage } from "@/components/topic-kit"
import { HISTORY } from "@/lib/history"
import { topicOf } from "@/lib/topics"

/* One topic's history (Journey_14 screens 42 to 47: Exercise, Eat, Sleep,
   Mind, Medication, Measure), opened from Plan > Your history or from the
   topic's own page. The same view as the overall history, with the day as
   a window and the topic's own metrics: what the plan asked of her, and
   what the window says she did. */

export default function TopicHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const topic = topicOf(id)
  if (!topic) return <PageNotFoundState />
  const history = HISTORY[topic.id]
  return (
    <TopicPage>
      <TopicHead topic={topic} intro={history.intro} />
      <HistoryView history={history} />
    </TopicPage>
  )
}
