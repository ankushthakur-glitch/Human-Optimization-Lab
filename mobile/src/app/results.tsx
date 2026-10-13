

import { RecordTab } from "@/components/record-tab"

/* The Record tab: everything collected about the patient, every item
   reachable, each with where it came from (FINAL-SPEC C.5). The tab draws
   its own TabScreen, so its sheets ("Add to your record", "Ask for a
   correction") pass over the tab bar. */
export default function RecordScreen() {
  return <RecordTab />
}
