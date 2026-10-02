import * as React from "react"
import { StyleSheet, View } from "react-native"

import { FlowScreen } from "@/components/flow"
import { TimelineList } from "@/components/record-lists"
import { ItemSheet, type ItemDetail } from "@/components/record-rows"

/* The whole record by date, newest first, with a filter for one kind of
   entry at a time; visits outside her clinic say so (FINAL-SPEC C.6).
   Every entry opens as it does from its own list: a visit or a test on its
   page, a medicine on the medicines page, and a document or a procedure in
   its sheet, held here over the page as the record's lists hold theirs. */
export default function TimelineScreen() {
  const [item, setItem] = React.useState<ItemDetail>()
  return (
    <View style={styles.fill}>
      <FlowScreen page title="Timeline">
        <TimelineList onOpen={setItem} />
      </FlowScreen>
      {item && <ItemSheet item={item} onClose={() => setItem(undefined)} />}
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
})
