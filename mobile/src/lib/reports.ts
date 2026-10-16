import * as React from "react"
import type { ImageSourcePropType } from "react-native"

import { useMarkers } from "@/lib/experience"
import { MEMBER } from "@/lib/member"
import type { Biomarker, Point } from "@/lib/record"
import { pointDate, pointTime, valueText, withUnit } from "@/lib/trends"

/* Imaging reports (Dr. Blanchard, 12 Oct 2026 call: trend scan measures
   like biomarkers, and let the patient open the report behind each one).

   A report is one scan: every imaging result that shares a day and a study
   ("Echo, Pacific Heart") came from it, so one echo holds the aneurysm,
   the valve area and the ejection fraction it measured. Built from the
   markers, so a report never says a number the graph does not. The words
   are placeholders for the sample patient until the real reports arrive
   from the EHR. The scans are real, de-identified images from Wikimedia
   Commons (credits in assets/images/reports/CREDITS.md), never the sample
   patient's own; each study's first page is a drawn report page. */

export type ReportMeasure = { marker: Biomarker; point: Point }

export type Report = {
  id: string
  /** The study's full name: "Echocardiogram". */
  study: string
  /** The place that ran it: "Pacific Heart". */
  place: string
  at: string
  /** "Mar 10, 2026" */
  date: string
  orderedBy: string
  measures: ReportMeasure[]
  /** The key finding, one line for a row. */
  finding: string
  /** What the radiologist said, in plain words. */
  impression: string
  images: ImageSourcePropType[]
}

type Study = {
  name: string
  orderedBy: (place: string) => string
  /** What the scan looked at, the impression's first sentence. */
  looked: string
  /** One measure as the finding line says it. */
  finding: (m: ReportMeasure) => string
  images: ImageSourcePropType[]
}

const DOCTOR = MEMBER.doctor

/** "4.3 cm", "59%". */
const v = (m: ReportMeasure) => withUnit(m.marker, valueText(m.marker, m.point))

/** Keyed by the study's first part, as the record names it. */
const STUDIES: Record<string, Study> = {
  Echo: {
    name: "Echocardiogram",
    orderedBy: () => "Dr. Lee, Pacific Heart",
    looked: "This echo looked at how your heart pumps, how your aortic valve opens and the size of your aorta.",
    finding: (m) => (m.marker.id === "aneurysm" ? `Aortic root ${v(m)}` : m.marker.id === "ava" ? `valve area ${v(m)}` : `ejection fraction ${v(m)}`),
    images: [
      require("../../assets/images/reports/echo-report.jpg"),
      require("../../assets/images/reports/echo-1.jpg"),
      require("../../assets/images/reports/echo-2.jpg"),
      require("../../assets/images/reports/echo-3.jpg"),
    ],
  },
  "CT chest": {
    name: "CT chest",
    orderedBy: () => DOCTOR,
    looked: "This CT looked at your lungs and the large artery in your chest.",
    finding: (m) => (m.marker.id === "lung-nodule" ? `Right upper lobe nodule, ${v(m)}` : `aortic aneurysm ${v(m)}`),
    images: [
      require("../../assets/images/reports/ct-chest-report.jpg"),
      require("../../assets/images/reports/ct-chest-1.jpg"),
      require("../../assets/images/reports/ct-chest-2.jpg"),
      require("../../assets/images/reports/ct-chest-3.jpg"),
    ],
  },
  "Thyroid ultrasound": {
    name: "Thyroid ultrasound",
    orderedBy: () => DOCTOR,
    looked: "This ultrasound looked at your thyroid and the nodule in its right lobe.",
    // TI-RADS placeholder: 2 under 10 mm, 3 from there (Q-08, to confirm).
    finding: (m) => `Nodule in the right lobe, ${v(m)}, TI-RADS ${m.point.value < 10 ? 2 : 3}`,
    images: [
      require("../../assets/images/reports/thyroid-us-report.jpg"),
      require("../../assets/images/reports/thyroid-us-1.jpg"),
      require("../../assets/images/reports/thyroid-us-2.jpg"),
      require("../../assets/images/reports/thyroid-us-3.jpg"),
    ],
  },
  "MRI brain": {
    name: "MRI brain",
    orderedBy: () => "Dr. Ana Ruiz, Scripps Neurology",
    looked: "This MRI looked at your brain and the small mass seen on your earlier scans.",
    finding: (m) => `Left frontal mass, ${v(m)}`,
    images: [
      require("../../assets/images/reports/mri-brain-report.jpg"),
      require("../../assets/images/reports/mri-brain-1.jpg"),
      require("../../assets/images/reports/mri-brain-2.jpg"),
      require("../../assets/images/reports/mri-brain-3.jpg"),
    ],
  },
}

/** "Echo, Pacific Heart" as its study and place. */
function split(study: string) {
  const at = study.indexOf(", ")
  return at < 0 ? { kind: study, place: "" } : { kind: study.slice(0, at), place: study.slice(at + 2) }
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

const upper = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** How a measure compares with the same study's scan before it: "up from
    10 mm in May 2025". */
function since(m: ReportMeasure) {
  const earlier = m.marker.points
    .filter((p) => p.study === m.point.study && pointTime(p) < pointTime(m.point))
    .sort((a, b) => pointTime(b) - pointTime(a))[0]
  if (!earlier) return "the first time it was measured here"
  const word = m.point.value > earlier.value ? "up from" : m.point.value < earlier.value ? "down from" : "the same as"
  return `${word} ${withUnit(m.marker, valueText(m.marker, earlier))} in ${earlier.date}`
}

/** Every imaging report in the markers, newest first. */
export function reportsOf(markers: Biomarker[]): Report[] {
  const byScan = new Map<string, ReportMeasure[]>()
  for (const marker of markers) {
    if (marker.kind !== "imaging") continue
    for (const point of marker.points) {
      if (!point.study || !point.at || !STUDIES[split(point.study).kind]) continue
      const id = `${point.at}-${slug(point.study)}`
      byScan.set(id, [...(byScan.get(id) ?? []), { marker, point }])
    }
  }
  return [...byScan.entries()]
    .map(([id, measures]) => {
      const { kind, place } = split(measures[0].point.study!)
      const study = STUDIES[kind]
      const sentences = measures.map((m) => `${upper(m.marker.short ?? m.marker.name)} is ${v(m)}, ${since(m)}.`)
      return {
        id,
        study: study.name,
        place,
        at: measures[0].point.at!,
        date: pointDate(measures[0].point),
        orderedBy: study.orderedBy(place),
        measures,
        finding: upper(measures.map(study.finding).join(", ")),
        impression: [study.looked, ...sentences].join(" "),
        images: study.images,
      }
    })
    .sort((a, b) => b.at.localeCompare(a.at))
}

/** The reports behind one marker's results, newest first. */
export const reportsFor = (reports: Report[], markerId: string) => reports.filter((r) => r.measures.some((m) => m.marker.id === markerId))

export function useReports(): Report[] {
  const markers = useMarkers()
  return React.useMemo(() => reportsOf(markers), [markers])
}
