"use client"

import {
  createCollection,
  nextId,
  today,
} from "@/components/practice/collection-store"
import {
  type Allergy,
  type ChartDocument,
  type Condition,
  type HealthRecord,
  type Immunization,
  type LabReport,
  type Medication,
  PRACTICE_SOURCE,
  type StudyReport,
  type VitalSet,
} from "@/components/practice/health-record"

/* What a provider adds to the chart by hand: a diagnosis made in the visit,
   a medication started, vitals taken, an outside lab or image, an uploaded
   document. They sit beside the Health Gorilla records, marked "Entered by
   practice", and only these can be edited or removed; synced records stay
   exactly as the source sent them. Kept per session, like the sample data. */

export type EntryKind =
  | "condition"
  | "medication"
  | "allergy"
  | "lab"
  | "vitals"
  | "imaging"
  | "vaccine"
  | "document"

type EntryData = {
  condition: Condition
  medication: Medication
  allergy: Allergy
  lab: LabReport
  vitals: VitalSet & { id: string }
  imaging: { study: StudyReport; document: ChartDocument }
  vaccine: Immunization
  document: ChartDocument
}

export type ChartEntry<K extends EntryKind = EntryKind> = {
  id: string
  patientId: string
  kind: K
  data: EntryData[K]
  createdAt: string
}

export const chartEntries = createCollection<ChartEntry>(
  "hol-chart-entries",
  [],
  "v1"
)

export function saveEntry<K extends EntryKind>(
  patientId: string,
  kind: K,
  data: EntryData[K],
  id?: string
) {
  if (id && chartEntries.get().some((e) => e.id === id)) {
    chartEntries.patch(id, { data })
    return id
  }
  const entry: ChartEntry<K> = {
    id: id ?? nextId("E", chartEntries.get()),
    patientId,
    kind,
    data,
    createdAt: today(),
  }
  chartEntries.add([entry as ChartEntry])
  return entry.id
}

export const removeEntry = (id: string) => chartEntries.remove(id)

/** A new record id that says where it came from. */
export const practiceId = (prefix: string) =>
  `${prefix}-P${Math.floor(Math.random() * 1e6)}`

export const isPractice = (item: { sourceId: string }) =>
  item.sourceId === PRACTICE_SOURCE

/** The entry that holds a practice record, found by the record's own id. */
export function entryFor(entries: ChartEntry[], recordId: string) {
  return entries.find((e) => {
    const d = e.data as { id?: string; study?: { id: string } }
    return d.id === recordId || d.study?.id === recordId
  })
}

/** The synced record with the practice's own entries laid over it. */
export function withEntries(
  record: HealthRecord,
  entries: ChartEntry[]
): HealthRecord {
  const mine = entries.filter((e) => e.patientId === record.patientId)
  if (mine.length === 0) return record
  const of = <K extends EntryKind>(kind: K) =>
    mine.filter((e) => e.kind === kind).map((e) => e.data as EntryData[K])
  const byDate = <T extends { date: string }>(list: T[]) =>
    [...list].sort((a, b) => b.date.localeCompare(a.date))
  const imaging = of("imaging")
  return {
    ...record,
    conditions: [...of("condition"), ...record.conditions],
    medications: [...of("medication"), ...record.medications],
    allergies: [...of("allergy"), ...record.allergies],
    immunizations: [...of("vaccine"), ...record.immunizations],
    vitals: byDate([...of("vitals"), ...record.vitals]),
    labReports: byDate([...of("lab"), ...record.labReports]),
    studies: [...imaging.map((i) => i.study), ...record.studies],
    documents: byDate([
      ...of("document"),
      ...imaging.map((i) => i.document),
      ...record.documents,
    ]),
  }
}
