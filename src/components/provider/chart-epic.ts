"use client"

import { today } from "@/components/practice/collection-store"
import type { HealthRecord } from "@/components/practice/health-record"
import { medicationCases } from "@/components/patient-dashboard/rules"
import type {
  DashboardData,
  PatientMedAnswer,
  ReconciliationState,
} from "@/components/patient-dashboard/types"
import type { Patient } from "@/components/practice/practice-data"

/* What the chart reads from Epic, per the "EHR Integration" sheet's Epic
   column. Only the reads Epic answers are shown: Patient, Consent,
   FamilyMemberHistory, AllergyIntolerance, Condition, MedicationRequest,
   Observation (vitals and labs), Appointment (the patient's), Encounter,
   DocumentReference (clinical notes), Practitioner and Location.
   Nothing is written back from the chart, so it has no add forms. Every
   record carries who changed it last in Epic and when (meta.lastUpdated
   with its Provenance agent). */

/** The signed-in provider, who reviews care plans. */
export const ME = "Dr. Daniel Reyes"

/* ------------------------------------------------------------- updated -- */

export type Updated = { by: string; at: string }

function hash(s: string) {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h
}

const EPIC_USERS = [
  "Dr. Elise Harrington",
  "Kevin Tran, RN",
  "Maria Lopez, MA",
  "Dr. Hannah Ortiz",
]

/** Who last changed a record in Epic and when: the record's own author when
    it names one, a clinic user otherwise, at a steady time of day. */
export function updatedOf(id: string, date: string, by?: string): Updated {
  const h = hash(id)
  const hour = 8 + (h % 9)
  const minute = (h >> 4) % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return {
    by: by || EPIC_USERS[h % EPIC_USERS.length],
    at: `${date || today()}T${pad(hour)}:${pad(minute)}`,
  }
}

/* -------------------------------------------------------- appointments -- */

/** Appointment: the patient's visits in Epic, booked or past. */
export type Appointment = {
  id: string
  date: string
  time: string
  minutes: number
  type: string
  reason: string
  practitioner: string
  location: string
  status: "Booked" | "Fulfilled" | "Cancelled" | "No show"
  updated: Updated
}

/** FamilyMemberHistory. */
export type FamilyMember = {
  id: string
  relation: string
  condition: string
  code: string
  onsetAge: string
  deceased: string
  note?: string
  updated: Updated
}

/** Consent. */
export type ConsentRecord = {
  id: string
  name: string
  scope: string
  signed: string
  expires: string
  status: "Active" | "Inactive"
  updated: Updated
}

/** Practitioner and Location: who looks after the patient, and where. */
export type CareTeamMember = {
  id: string
  name: string
  role: string
  specialty: string
  npi: string
  location: string
  address: string
  phone: string
  updated: Updated
}

export type EpicExtras = {
  appointments: Appointment[]
  family: FamilyMember[]
  consents: ConsentRecord[]
  careTeam: CareTeamMember[]
}

function shift(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d) + days * 86_400_000)
    .toISOString()
    .slice(0, 10)
}

const CLINIC = "Harborview Longevity Clinic"
const CLINIC_ADDRESS = "4150 Regents Park Row, Suite 200, La Jolla, CA 92037"
const HOSPITAL = "Scripps Memorial Hospital La Jolla"

/** The Epic reads the chart shows beside the health record. */
export function epicExtrasFor(p: Patient, record: HealthRecord): EpicExtras {
  if (record.state !== "Active")
    return { appointments: [], family: [], consents: [], careTeam: [] }
  const t = today()
  const d = (n: number) => shift(t, n)
  const female = p.sex === "Female"
  const pcp = "Dr. Elise Harrington"
  const stamp = (id: string, date: string, by?: string) =>
    updatedOf(`${p.id}-${id}`, date, by)

  const appointments: Appointment[] = [
    { id: "AP-1", date: d(29), time: "9:30 AM", minutes: 30, type: "Follow up", reason: "Lipids and A1c review", practitioner: pcp, location: CLINIC, status: "Booked", updated: stamp("AP-1", d(-3), "Maria Lopez, MA") },
    { id: "AP-2", date: d(12), time: "7:45 AM", minutes: 15, type: "Lab draw", reason: "Fasting lipid panel, HbA1c", practitioner: "Quest Patient Service Center", location: "Quest Diagnostics, La Jolla", status: "Booked", updated: stamp("AP-2", d(-3), "Maria Lopez, MA") },
    { id: "AP-3", date: d(-104), time: "9:15 AM", minutes: 30, type: "Office visit", reason: "Annual physical", practitioner: pcp, location: CLINIC, status: "Fulfilled", updated: stamp("AP-3", d(-104), pcp) },
    { id: "AP-4", date: d(-160), time: "2:00 PM", minutes: 20, type: "Telehealth", reason: "Blood pressure check", practitioner: pcp, location: "Virtual", status: "No show", updated: stamp("AP-4", d(-160), "Kevin Tran, RN") },
    { id: "AP-5", date: d(-201), time: "10:40 AM", minutes: 30, type: "Specialist", reason: "Allergy consult", practitioner: "Dr. Priya Nair", location: HOSPITAL, status: "Cancelled", updated: stamp("AP-5", d(-205), "Maria Lopez, MA") },
  ]

  const family: FamilyMember[] = [
    { id: "FH-1", relation: "Father", condition: "Type 2 diabetes mellitus", code: "E11.9", onsetAge: "52", deceased: "No", updated: stamp("FH-1", d(-104), pcp) },
    { id: "FH-2", relation: "Father", condition: "Myocardial infarction", code: "I21.9", onsetAge: "61", deceased: "No", note: "Two stents placed.", updated: stamp("FH-2", d(-104), pcp) },
    { id: "FH-3", relation: "Mother", condition: "Essential hypertension", code: "I10", onsetAge: "48", deceased: "No", updated: stamp("FH-3", d(-104), pcp) },
    { id: "FH-4", relation: female ? "Maternal grandmother" : "Paternal grandfather", condition: female ? "Breast cancer" : "Colon cancer", code: female ? "C50.919" : "C18.9", onsetAge: "67", deceased: "Yes, age 74", updated: stamp("FH-4", d(-430), "Kevin Tran, RN") },
    { id: "FH-5", relation: "Brother", condition: "Hyperlipidemia", code: "E78.5", onsetAge: "40", deceased: "No", updated: stamp("FH-5", d(-430), "Kevin Tran, RN") },
  ]

  const consents: ConsentRecord[] = [
    { id: "CS-1", name: "Release of information to Inlay Health", scope: "Patient privacy", signed: d(-30), expires: shift(d(-30), 365), status: "Active", updated: stamp("CS-1", d(-30), `${p.firstName} ${p.lastName}`) },
    { id: "CS-2", name: "Treatment consent", scope: "Treatment", signed: "2025-01-14", expires: "", status: "Active", updated: stamp("CS-2", "2025-01-14", "Maria Lopez, MA") },
    { id: "CS-3", name: "Telehealth consent", scope: "Treatment", signed: "2025-01-14", expires: "", status: "Active", updated: stamp("CS-3", "2025-01-14", "Maria Lopez, MA") },
    { id: "CS-4", name: "Research data sharing", scope: "Research", signed: "2023-05-02", expires: "2024-05-02", status: "Inactive", updated: stamp("CS-4", "2024-05-02", "Kevin Tran, RN") },
  ]

  const careTeam: CareTeamMember[] = [
    { id: "PR-1", name: pcp, role: "Primary care physician", specialty: "Internal medicine", npi: "1487639201", location: CLINIC, address: CLINIC_ADDRESS, phone: "(858)-555-0100", updated: stamp("PR-1", "2025-01-14", "Maria Lopez, MA") },
    { id: "PR-2", name: "Dr. Priya Nair", role: "Specialist", specialty: "Allergy and immunology", npi: "1922004518", location: HOSPITAL, address: "9888 Genesee Ave, La Jolla, CA 92037", phone: "(858)-555-0177", updated: stamp("PR-2", d(-201), "Maria Lopez, MA") },
    { id: "PR-3", name: "Kevin Tran, RN", role: "Care coordinator", specialty: "Nursing", npi: "1356702284", location: CLINIC, address: CLINIC_ADDRESS, phone: "(858)-555-0104", updated: stamp("PR-3", "2025-01-14", "Maria Lopez, MA") },
  ]

  return { appointments, family, consents, careTeam }
}

/* ----------------------------------------------- medication confirmation -- */

/* The app asks the patient whether they take each medication as
   prescribed. Anything but "Taking" becomes a medication change in the
   dashboard's Important updates, where the provider confirms it. The chart
   only shows the answer and, once confirmed, who approved it and when. */

export type MedReview = {
  answer?: PatientMedAnswer
  /** Open until the provider decides in Important updates. */
  status: "Not needed" | "Pending review" | "Approved" | "Not current"
  by?: string
  at?: string
}

const sameMed = (chartName: string, dashName: string) =>
  chartName.toLowerCase().startsWith(dashName.toLowerCase())

/** The patient's answer for a chart medication and where its review stands. */
export function medReviewFor(
  name: string,
  data: Pick<DashboardData, "medications" | "answers" | "allergies">,
  states: ReconciliationState[]
): MedReview {
  const answer = data.answers
    .filter((a) => sameMed(name, a.medication))
    .sort((a, b) => b.date.localeCompare(a.date))[0]
  if (!answer || answer.answer === "Taking") return { answer, status: "Not needed" }
  const open = medicationCases(data, []).find((c) => sameMed(name, c.medication))
  const state = open && states.find((s) => s.key === open.key)
  if (!state || state.status === "open") return { answer, status: "Pending review" }
  return {
    answer,
    status: state.status === "acknowledged" ? "Approved" : "Not current",
    by: state.by,
    at: state.at,
  }
}

/** "10/12/2026, 3:04 PM" from a local "2026-10-12T15:04". */
export function atLabel(at?: string) {
  if (!at) return ""
  const [date, time = "00:00"] = at.split("T")
  const [y, m, d] = date.split("-")
  const [h, min] = time.split(":").map(Number)
  return `${m}/${d}/${y}, ${h % 12 || 12}:${String(min).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`
}

/** Now, as the local "2026-10-12T15:04" the stores keep. */
export function nowAt() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${today()}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
