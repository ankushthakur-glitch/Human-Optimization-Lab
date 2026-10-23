import { useLocalSearchParams } from "expo-router"
import * as React from "react"
import { StyleSheet, View } from "react-native"

import { FlowScreen } from "@/components/flow"
import { EmptyState, Tag } from "@/components/record-kit"
import { TOPIC_PAGES } from "@/components/v14-topics"
import { space } from "@/lib/theme"
import { topicOf } from "@/lib/v14"

/* One topic of today's plan (v14 dummy, Journey_14 screens 31 and 33 to
   38), opened from its row on Today. The page names the programme the
   topic comes from, so she can see why it is on her plan. */

export default function V14Topic() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const topic = topicOf(id ?? "")
  if (!topic)
    return (
      <FlowScreen page title="Today">
        <EmptyState title="This part of your plan is not here" line="Go back to Today and pick one of your six." />
      </FlowScreen>
    )
  const Page = TOPIC_PAGES[topic.id]
  return (
    <FlowScreen page title={topic.name}>
      <View style={styles.page}>
        <View style={styles.tag}>
          <Tag tone="primary">{topic.programme}</Tag>
        </View>
        <Page />
      </View>
    </FlowScreen>
  )
}

const styles = StyleSheet.create({
  page: { gap: space.section },
  tag: { flexDirection: "row" },
})
