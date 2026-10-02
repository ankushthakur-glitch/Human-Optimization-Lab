import { useLocalSearchParams } from "expo-router"
import * as React from "react"

import { PageNotFoundState } from "@/components/error-state"
import { RecordListScreen, ResultsScreen, isRecordKind } from "@/components/record-lists"

/* One part of the record on its own page (FINAL-SPEC C.6): every result
   (`?filter=watch|all|in`, or `?batch=<id>` for one batch of new results),
   or a list such as allergies, visits or tests. */
export default function RecordKindScreen() {
  const { kind, filter, batch } = useLocalSearchParams<{ kind: string; filter?: string; batch?: string }>()
  if (!isRecordKind(kind)) return <PageNotFoundState />
  if (kind === "results") return <ResultsScreen filter={filter} batch={batch} />
  return <RecordListScreen kind={kind} />
}
