import { FlowScreen } from "@/components/flow"
import { TimelineList } from "@/components/record-lists"
import { openItem } from "@/components/record-rows"

/* The whole record by date, newest first, with a filter for one kind of
   entry at a time; visits outside her clinic say so (FINAL-SPEC C.6).
   Every entry opens as it does from its own list: a visit or a test on its
   page, a medicine on the medicines page, and a document or a procedure in
   its details page, as the record's lists open theirs. */
export default function TimelineScreen() {
  return (
    <FlowScreen page title="Timeline">
      <TimelineList onOpen={openItem} />
    </FlowScreen>
  )
}
