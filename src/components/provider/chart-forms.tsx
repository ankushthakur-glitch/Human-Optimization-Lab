"use client"

import * as React from "react"
import { toast } from "@/design-system/ui/sonner"
import {
  IconAdd,
  IconClose,
  IconEdit,
  IconFileText,
  IconEye,
  IconLock,
  IconMoreVertical,
  IconUpload,
} from "@/design-system/icons"

import { cn } from "@/lib/utils"
import { SelectField, TextField } from "@/components/form-kit"
import { today } from "@/components/practice/collection-store"
import {
  type Allergy,
  type ChartDocument,
  type Condition,
  type HealthRecord,
  type Immunization,
  LOINC,
  kgOf,
  type LabReport,
  type Medication,
  PRACTICE_SOURCE,
  type StudyReport,
  type VitalSet,
} from "@/components/practice/health-record"
import {
  type ChartEntry,
  type EntryKind,
  chartEntries,
  entryFor,
  isPractice,
  practiceId,
  removeEntry,
  saveEntry,
} from "@/components/provider/chart-entries"
import { Badge } from "@/design-system/ui/badge"
import { Button } from "@/design-system/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/design-system/ui/combobox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/design-system/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/design-system/ui/dropdown-menu"
import { Field, FieldError, FieldLabel } from "@/design-system/ui/field"
import { RadioGroup, RadioGroupItem } from "@/design-system/ui/radio-group"
import { Textarea } from "@/design-system/ui/textarea"

/* The add forms follow the two references the user gave: the Custom EHR
   "Add Diagnoses", "Add Allergies", "Add Medication", "Add Vitals", "Add
   Vaccine" (Administered, Historical, Refused), "Add Lab Result" and "Add
   Image Order" dialogs, and the Upload dialog for documents. Pick lists use
   the reference's options where it gives them. Built from
   the portal's own fields; what is saved has the same shape as a Health
   Gorilla record, so the chart treats both alike. */

const PROVIDER = "Dr. Elise Harrington"
const STAFF = [PROVIDER, "Kevin Tran, RN", "Maria Lopez, MA"]

type Values = Record<string, string>

type FieldSpec = {
  key: string
  label: string
  type?:
    | "text"
    | "date"
    | "time"
    | "number"
    | "select"
    | "search"
    | "radio"
    | "segment"
    | "textarea"
    | "upload"
    | "readonly"
    | "heading"
  options?: readonly string[] | ((record: HealthRecord, v: Values) => string[])
  placeholder?: string
  required?: boolean
  /** Columns out of 12 at sm and up; 6 when not set. */
  span?: 2 | 3 | 4 | 5 | 6 | 8 | 12
  /** Keeps the row aligned without repeating a group's label. */
  hideLabel?: boolean
  /** Shown only when this returns true. */
  when?: (v: Values) => boolean
  /** Behind "Show more", as on the historical vaccine form. */
  more?: boolean
  accept?: string
  /** A value worked out from others (BMI). */
  compute?: (v: Values) => string
}

type Kind<T> = {
  noun: string
  title: string
  submit: string
  fields: FieldSpec[]
  empty: () => Values
  toValues: (item: T) => Values
  build: (v: Values, id: string, record: HealthRecord) => T
}

/* -------------------------------------------------------------------------- */
/*  Pick lists                                                                 */
/* -------------------------------------------------------------------------- */

const ICD10 = [
  "R73.03 Prediabetes",
  "E11.9 Type 2 diabetes mellitus without complications",
  "E78.5 Hyperlipidemia, unspecified",
  "E78.00 Pure hypercholesterolemia, unspecified",
  "I10 Essential (primary) hypertension",
  "R03.0 Elevated blood pressure reading, without diagnosis of hypertension",
  "E66.3 Overweight",
  "E66.9 Obesity, unspecified",
  "E55.9 Vitamin D deficiency, unspecified",
  "D50.9 Iron deficiency anemia, unspecified",
  "E03.9 Hypothyroidism, unspecified",
  "K76.0 Fatty (change of) liver, not elsewhere classified",
  "M81.0 Age-related osteoporosis without current pathological fracture",
  "M85.80 Other specified disorders of bone density and structure, unspecified site",
  "N95.1 Menopausal and female climacteric states",
  "E28.2 Polycystic ovarian syndrome",
  "G47.00 Insomnia, unspecified",
  "F41.1 Generalized anxiety disorder",
  "F32.A Depression, unspecified",
  "R53.83 Other fatigue",
  "J30.2 Other seasonal allergic rhinitis",
  "J45.909 Unspecified asthma, uncomplicated",
  "K21.9 Gastro-esophageal reflux disease without esophagitis",
  "G43.909 Migraine, unspecified, not intractable, without status migrainosus",
  "M54.50 Low back pain, unspecified",
  "I25.10 Atherosclerotic heart disease of native coronary artery without angina pectoris",
]

const ALLERGENS: Record<string, string[]> = {
  Drug: [
    "Penicillin",
    "Amoxicillin",
    "Sulfa drugs",
    "Cephalosporins",
    "Aspirin",
    "Ibuprofen",
    "Codeine",
    "Morphine",
    "Erythromycin",
    "Statins",
  ],
  Food: [
    "Peanuts",
    "Tree nuts",
    "Shellfish",
    "Fish",
    "Eggs",
    "Milk",
    "Soy",
    "Wheat",
    "Sesame",
  ],
  Environment: [
    "Pollen",
    "Dust mites",
    "Pet dander",
    "Mold",
    "Latex",
    "Bee stings",
  ],
}
const REACTIONS = [
  "Hives",
  "Rash",
  "Itching",
  "Swelling",
  "Shortness of breath",
  "Wheezing",
  "Anaphylaxis",
  "Nausea",
  "Vomiting",
  "Diarrhea",
  "Sneezing",
  "Watery eyes",
  "Nasal congestion",
]

const MEDICINES = [
  "Atorvastatin 10 mg tablet",
  "Atorvastatin 20 mg tablet",
  "Rosuvastatin 10 mg tablet",
  "Metformin 500 mg tablet",
  "Metformin ER 500 mg tablet",
  "Semaglutide 0.25 mg/0.5 mL pen",
  "Tirzepatide 2.5 mg/0.5 mL pen",
  "Lisinopril 10 mg tablet",
  "Losartan 50 mg tablet",
  "Amlodipine 5 mg tablet",
  "Levothyroxine 50 mcg tablet",
  "Alendronate 70 mg tablet",
  "Estradiol 1 mg tablet",
  "Progesterone 100 mg capsule",
  "Omeprazole 20 mg capsule",
  "Sertraline 50 mg tablet",
  "Cetirizine 10 mg tablet",
  "Vitamin D3 2,000 IU capsule",
  "Vitamin B12 1,000 mcg tablet",
  "Omega-3 1,000 mg capsule",
  "Magnesium glycinate 200 mg capsule",
  "Calcium carbonate 600 mg tablet",
  "Ferrous sulfate 325 mg tablet",
  "Melatonin 3 mg tablet",
]
const DOSAGE_UNITS = [
  "mg",
  "tablet",
  "capsule",
  "ml",
  "mcg",
  "unit",
  "puff",
  "drop",
  "patch",
  "injection",
]
/* Route of administration, and how the sig reads for each. */
const ROUTES: Record<string, [verb: string, phrase: string]> = {
  Oral: ["Take", "by mouth"],
  Sublingual: ["Place", "under the tongue"],
  Subcutaneous: ["Inject", "under the skin"],
  Intramuscular: ["Inject", "into the muscle"],
  Intravenous: ["Give", "intravenously"],
  Inhaled: ["Inhale", "by mouth"],
  Nasal: ["Use", "in each nostril"],
  Topical: ["Apply", "to the skin"],
  Transdermal: ["Apply", "as a patch to the skin"],
  Ophthalmic: ["Place", "in the eye"],
  Otic: ["Place", "in the ear"],
  Rectal: ["Insert", "rectally"],
  Vaginal: ["Insert", "vaginally"],
}

const WHEN = [
  "In the morning",
  "Before meal",
  "After meal",
  "Afternoon meal",
  "At bedtime",
  "As needed",
]
const TIMES = [
  "Every day",
  "Twice a day",
  "Three times a day",
  "Every other day",
  "Every week",
]

const VACCINES = [
  "Influenza, quadrivalent, 2026-2027",
  "COVID-19, mRNA, 2025-2026",
  "Tdap",
  "Td",
  "Zoster recombinant (Shingrix)",
  "Pneumococcal conjugate (PCV20)",
  "Pneumococcal polysaccharide (PPSV23)",
  "RSV, adjuvanted (Arexvy)",
  "Hepatitis A",
  "Hepatitis B",
  "HPV, 9-valent",
  "MMR",
  "Varicella",
  "Meningococcal ACWY",
]
const VACCINE_UNITS = ["ml", "mg", "mcg"]
const VACCINE_ROUTES = [
  "Intramuscular",
  "Subcutaneous",
  "Intranasal",
  "Oral",
  "Intradermal",
]
const BODY_SITES = [
  "Left arm",
  "Right arm",
  "Left thigh",
  "Right thigh",
  "Buttock",
  "Abdomen",
]
const VACCINE_REACTIONS = [
  "None",
  "Anaphylaxis",
  "Encephalopathy",
  "Collapse or shock-like state within 48 hours of dose",
  "Convulsions (fits, seizures) within 72 hours of dose",
]
const INFO_SOURCES = [
  "Patient report",
  "Immunization registry",
  "Outside provider record",
  "School record",
]
const REFUSAL_REASONS = [
  "Patient declined",
  "Medical contraindication",
  "Already immune",
  "Vaccine not available",
  "Religious exemption",
  "Will discuss at next visit",
]

const LAB_NAMES = [
  "Quest Diagnostics",
  "Labcorp",
  "In-office lab",
  "Hospital lab",
  "Other",
]
const IMAGING_TYPES = [
  "X-ray",
  "CT",
  "MRI",
  "Ultrasound",
  "Mammography",
  "DEXA",
  "Echocardiogram",
  "Nuclear medicine",
]
const INTERPRETATIONS = [
  "Normal",
  "High",
  "Low",
  "Critical high",
  "Critical low",
  "Abnormal",
]
const DOC_TYPES = [
  "Outside records",
  "Referral letter",
  "Lab report",
  "Imaging report",
  "Discharge summary",
  "Consent form",
  "Insurance card",
  "Other",
]

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function to24(time: string) {
  const m = time.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!m) return time
  let h = Number(m[1]) % 12
  if (m[3].toUpperCase() === "PM") h += 12
  return `${String(h).padStart(2, "0")}:${m[2]}`
}

function to12(time: string) {
  if (!time) return ""
  const [h, m] = time.split(":").map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`
}

const nowTime = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

const splitCode = (pick: string) => {
  const [code, ...rest] = pick.split(" ")
  return { code, name: rest.join(" ") }
}

const LB_PER_KG = 2.20462

function bmiFrom(v: Values) {
  const inches = Number(v.heightFt || 0) * 12 + Number(v.heightIn || 0)
  const kg = Number(v.weightKg || 0)
  if (!inches || !kg) return ""
  const m = inches * 0.0254
  return String(Math.round((kg / m ** 2) * 10) / 10)
}

const FLAG: Record<string, "" | "High" | "Low"> = {
  High: "High",
  "Critical high": "High",
  Low: "Low",
  "Critical low": "Low",
}

/* -------------------------------------------------------------------------- */
/*  Kinds                                                                      */
/* -------------------------------------------------------------------------- */

const CONDITION: Kind<Condition> = {
  noun: "diagnosis",
  title: "Add diagnosis",
  submit: "Add",
  fields: [
    {
      key: "pick",
      label: "Diagnoses name",
      type: "search",
      options: ICD10,
      placeholder: "Search ICD code",
      required: true,
      span: 12,
    },
    {
      key: "status",
      label: "Status",
      type: "segment",
      options: ["Active", "Historical"],
    },
    {
      key: "type",
      label: "Type",
      type: "segment",
      options: ["Chronic", "Acute"],
    },
    { key: "onset", label: "Onset date", type: "date", required: true },
    {
      key: "abated",
      label: "End date",
      type: "date",
      required: true,
      when: (v) => v.status === "Historical",
    },
    { key: "note", label: "Note", type: "textarea", span: 12 },
  ],
  empty: () => ({
    pick: "",
    status: "Active",
    type: "Chronic",
    onset: "",
    abated: "",
    note: "",
  }),
  toValues: (c) => ({
    pick: `${c.code} ${c.name}`,
    status: c.status === "Resolved" ? "Historical" : "Active",
    type: c.type,
    onset: c.onset,
    abated: c.abated ?? "",
    note: c.note ?? "",
  }),
  build: (v, id) => {
    const { code, name } = splitCode(v.pick)
    const historical = v.status === "Historical"
    return {
      id,
      code,
      name,
      snomed: "",
      type: v.type as Condition["type"],
      status: historical ? "Resolved" : "Active",
      onset: v.onset,
      recorded: today(),
      abated: historical ? v.abated || today() : undefined,
      note: v.note.trim(),
      sourceId: PRACTICE_SOURCE,
    }
  },
}

const ALLERGY: Kind<Allergy> = {
  noun: "allergy",
  title: "Add allergies",
  submit: "Add",
  fields: [
    {
      key: "category",
      label: "Allergy type",
      type: "radio",
      options: ["Drug", "Food", "Environment"],
      span: 12,
    },
    {
      key: "substance",
      label: "Allergy name",
      type: "search",
      options: (_, v) => ALLERGENS[v.category] ?? [],
      placeholder: "Select or search allergy",
      required: true,
      span: 12,
    },
    {
      key: "reaction",
      label: "Reaction",
      type: "select",
      options: REACTIONS,
      placeholder: "Select reaction",
      required: true,
    },
    {
      key: "severity",
      label: "Severity",
      type: "select",
      options: ["Mild", "Moderate", "Severe"],
      placeholder: "Select severity",
      required: true,
    },
    { key: "onset", label: "Onset date", type: "date" },
    {
      key: "recordedBy",
      label: "Recorded by",
      type: "select",
      options: STAFF,
      placeholder: "Select",
    },
    { key: "note", label: "Note", type: "textarea", span: 12 },
  ],
  empty: () => ({
    category: "Drug",
    substance: "",
    reaction: "",
    severity: "",
    onset: "",
    recordedBy: PROVIDER,
    note: "",
  }),
  toValues: (a) => ({
    category: a.category === "Environmental" ? "Environment" : a.category,
    substance: a.substance,
    reaction: a.reaction,
    severity: a.severity,
    onset: a.onset,
    recordedBy: a.recordedBy,
    note: a.note ?? "",
  }),
  build: (v, id) => ({
    id,
    category: (v.category === "Environment"
      ? "Environmental"
      : v.category) as Allergy["category"],
    substance: v.substance,
    reaction: v.reaction,
    severity: v.severity as Allergy["severity"],
    onset: v.onset || today(),
    recorded: today(),
    recordedBy: v.recordedBy || PROVIDER,
    status: "Active",
    note: v.note.trim(),
    sourceId: PRACTICE_SOURCE,
  }),
}

/** "Take 1 tablet by mouth every day in the morning", from the form. */
function sigOf(v: Values) {
  const n = Number(v.quantity) || 1
  const unit = v.unit || "tablet"
  const plural =
    n === 1 || ["ml", "mg", "mcg"].includes(unit) ? unit : `${unit}s`
  const [verb, phrase] = ROUTES[v.route] ?? ROUTES.Oral
  const when = v.timing ? ` ${v.timing.toLowerCase()}` : ""
  const often = v.frequency ? ` ${v.frequency.toLowerCase()}` : ""
  return {
    quantity: `${n} ${plural}`,
    sig: v.quantity ? `${verb} ${n} ${plural} ${phrase}${often}${when}` : "",
  }
}

const MEDICATION: Kind<Medication> = {
  noun: "medication",
  title: "Add medication",
  submit: "Add",
  fields: [
    {
      key: "name",
      label: "Medicine name",
      type: "search",
      options: MEDICINES,
      placeholder: "Select or search medicine",
      required: true,
      span: 12,
    },
    {
      key: "quantity",
      label: "Dose",
      type: "number",
      placeholder: "1",
      required: true,
      span: 3,
    },
    {
      key: "unit",
      label: "Unit",
      type: "select",
      options: DOSAGE_UNITS,
      placeholder: "Select",
      span: 3,
    },
    {
      key: "route",
      label: "Route",
      type: "select",
      options: Object.keys(ROUTES),
      placeholder: "Select",
      required: true,
      span: 6,
    },
    {
      key: "frequency",
      label: "Frequency",
      type: "select",
      options: TIMES,
      placeholder: "Select",
      required: true,
    },
    {
      key: "timing",
      label: "When",
      type: "select",
      options: WHEN,
      placeholder: "Any time",
    },
    {
      key: "sig",
      label: "Sig",
      type: "readonly",
      compute: (v) => sigOf(v).sig,
      placeholder: "Fills in from the dose, route and frequency",
      span: 12,
    },
    { key: "started", label: "Start date", type: "date", required: true },
    { key: "ended", label: "End date", type: "date" },
    { key: "note", label: "Note", type: "textarea", span: 12 },
  ],
  empty: () => ({
    name: "",
    quantity: "1",
    unit: "tablet",
    route: "Oral",
    timing: "",
    frequency: "Every day",
    started: today(),
    ended: "",
    note: "",
  }),
  toValues: (m) => {
    const [quantity, ...unit] = m.quantity.split(" ")
    return {
      name: m.name,
      quantity,
      unit: unit.join(" ").replace(/s$/, ""),
      route: m.route in ROUTES ? m.route : "Oral",
      timing: m.timing,
      frequency: m.frequency,
      started: m.started,
      ended: m.ended,
      note: m.note ?? "",
    }
  },
  build: (v, id) => {
    const { sig, quantity } = sigOf(v)
    return {
      id,
      name: v.name,
      rxnorm: "",
      sig,
      quantity,
      route: v.route || "Oral",
      timing: v.timing,
      frequency: v.frequency,
      dx: "",
      recorded: today(),
      started: v.started,
      ended: v.ended,
      prescriber: PROVIDER,
      note: v.note.trim(),
      sourceId: PRACTICE_SOURCE,
    }
  },
}

const VITALS: Kind<VitalSet & { id: string }> = {
  noun: "vitals",
  title: "Add vitals",
  submit: "Add",
  fields: [
    { key: "date", label: "Date", type: "date", required: true, span: 4 },
    { key: "h-bp", label: "Blood pressure", type: "heading" },
    {
      key: "systolic",
      label: "Systolic (mmHg)",
      type: "number",
      placeholder: "120",
      required: true,
      span: 3,
    },
    {
      key: "diastolic",
      label: "Diastolic (mmHg)",
      type: "number",
      placeholder: "80",
      required: true,
      span: 3,
    },
    {
      key: "bpPosition",
      label: "Position",
      type: "select",
      options: ["Sitting", "Standing"],
      span: 2,
    },
    {
      key: "bpSite",
      label: "Arm",
      type: "select",
      options: ["L - Arm", "R - Arm"],
      span: 2,
    },
    {
      key: "bpCuff",
      label: "Cuff size",
      type: "select",
      options: ["Adult", "Child", "Elder"],
      span: 2,
    },
    { key: "h-heart", label: "Heart and breathing", type: "heading" },
    {
      key: "heartRate",
      label: "Heart rate (bpm)",
      type: "number",
      placeholder: "69",
      required: true,
      span: 3,
    },
    {
      key: "pulse",
      label: "Pulse rate (bpm)",
      type: "number",
      placeholder: "89",
      span: 3,
    },
    {
      key: "pulseRhythm",
      label: "Pulse rhythm",
      type: "select",
      options: ["Regular", "Irregular", "Regularly irregular"],
      span: 3,
    },
    {
      key: "respRate",
      label: "Respiratory rate (bpm)",
      type: "number",
      placeholder: "13",
      span: 3,
    },
    {
      key: "spo2",
      label: "Oxygen saturation (%)",
      type: "number",
      placeholder: "96",
      span: 3,
    },
    {
      key: "spo2Mode",
      label: "Oxygen given",
      type: "select",
      options: ["Oxygen", "Breathing treatment", "Room air with oxygen"],
      placeholder: "Room air",
      span: 3,
    },
    {
      key: "tempF",
      label: "Temperature (°F)",
      type: "number",
      placeholder: "98",
      span: 3,
    },
    {
      key: "tempSite",
      label: "Temperature site",
      type: "select",
      options: ["Oral", "Armpit", "Forehead", "Ear"],
      span: 3,
    },
    { key: "h-body", label: "Height and weight", type: "heading" },
    {
      key: "heightFt",
      label: "Height (ft)",
      type: "number",
      placeholder: "5",
      span: 2,
    },
    {
      key: "heightIn",
      label: "Height (in)",
      type: "number",
      placeholder: "8",
      span: 2,
    },
    {
      key: "heightMethod",
      label: "Height method",
      type: "select",
      options: ["Stated", "Standing", "Lying"],
      span: 4,
    },
    {
      key: "bmi",
      label: "Body mass index",
      type: "readonly",
      compute: bmiFrom,
      span: 4,
    },
    {
      key: "weightKg",
      label: "Weight (kg)",
      type: "number",
      placeholder: "85",
      span: 4,
    },
    {
      key: "weightMethod",
      label: "Weight method",
      type: "select",
      options: ["Stated", "With clothes", "Without clothes"],
      span: 4,
    },
    {
      key: "weightContext",
      label: "Weight context",
      type: "select",
      options: ["Pre-dialysis", "Post-dialysis"],
      placeholder: "Select",
      span: 4,
    },
    { key: "note", label: "Note", type: "textarea", span: 12 },
  ],
  empty: () => ({
    date: today(),
    systolic: "",
    diastolic: "",
    bpPosition: "Sitting",
    bpSite: "L - Arm",
    bpCuff: "Adult",
    heartRate: "",
    respRate: "",
    spo2: "",
    spo2Mode: "",
    pulse: "",
    pulseRhythm: "Regular",
    heightFt: "",
    heightIn: "",
    heightMethod: "Stated",
    tempF: "",
    tempSite: "Oral",
    weightKg: "",
    weightMethod: "Stated",
    weightContext: "",
    note: "",
  }),
  toValues: (v) => {
    const [
      bpPosition = "Sitting",
      bpSite = "L - Arm",
      bpCuff = "Adult",
      spo2Mode = "",
      pulseRhythm = "Regular",
      heightMethod = "Stated",
      tempSite = "Oral",
      weightMethod = "Stated",
      weightContext = "",
    ] = (v.context ?? "").split(", ")
    return {
      date: v.date,
      systolic: String(v.systolic),
      diastolic: String(v.diastolic),
      bpPosition,
      bpSite,
      bpCuff,
      heartRate: String(v.heartRate),
      respRate: String(v.respRate || ""),
      spo2: String(v.spo2 || ""),
      spo2Mode,
      pulse: String(v.pulseRate ?? ""),
      pulseRhythm,
      heightFt: v.heightIn ? String(Math.floor(v.heightIn / 12)) : "",
      heightIn: v.heightIn ? String(v.heightIn % 12) : "",
      heightMethod,
      tempF: String(v.tempF || ""),
      tempSite,
      weightKg: v.weightLb ? String(kgOf(v.weightLb)) : "",
      weightMethod,
      weightContext,
      note: v.note ?? "",
    }
  },
  build: (v, id, record) => {
    const last = record.vitals[0]
    const num = (key: string, fallback = 0) =>
      v[key] === "" || v[key] == null ? fallback : Number(v[key])
    const height =
      v.heightFt || v.heightIn
        ? Number(v.heightFt || 0) * 12 + Number(v.heightIn || 0)
        : (last?.heightIn ?? 0)
    return {
      id,
      date: v.date,
      time: to12(nowTime()),
      systolic: num("systolic"),
      diastolic: num("diastolic"),
      heartRate: num("heartRate"),
      respRate: num("respRate", last?.respRate ?? 0),
      spo2: num("spo2", last?.spo2 ?? 0),
      tempF: num("tempF", last?.tempF ?? 0),
      heightIn: height,
      weightLb: v.weightKg
        ? Math.round(Number(v.weightKg) * LB_PER_KG * 10) / 10
        : (last?.weightLb ?? 0),
      pulseRate: v.pulse ? Number(v.pulse) : undefined,
      context: [
        v.bpPosition,
        v.bpSite,
        v.bpCuff,
        v.spo2Mode,
        v.pulseRhythm,
        v.heightMethod,
        v.tempSite,
        v.weightMethod,
        v.weightContext,
      ].join(", "),
      recordedBy: PROVIDER,
      note: v.note.trim(),
      sourceId: PRACTICE_SOURCE,
    }
  },
}

const administered = (v: Values) => v.status === "Administered"
const historical = (v: Values) => v.status === "Historical"
const refused = (v: Values) => v.status === "Refused or not administered"
const givenOrMore = (v: Values) => administered(v) || historical(v)

const VACCINE: Kind<Immunization> = {
  noun: "vaccine",
  title: "Add vaccine",
  submit: "Add",
  fields: [
    {
      key: "status",
      label: "Status",
      type: "radio",
      options: ["Administered", "Historical", "Refused or not administered"],
      hideLabel: true,
      span: 12,
    },
    {
      key: "vaccine",
      label: "Vaccine name",
      type: "search",
      options: VACCINES,
      placeholder: "Select or search vaccine",
      required: true,
      span: 12,
    },
    // Historical, first rows
    {
      key: "date",
      label: "Administer date",
      type: "date",
      required: true,
      span: 4,
      when: historical,
    },
    {
      key: "infoSource",
      label: "Source for information",
      type: "select",
      options: INFO_SOURCES,
      placeholder: "Select source for information",
      span: 8,
      when: historical,
    },
    // Refused
    {
      key: "reason",
      label: "Reason refused",
      type: "search",
      options: REFUSAL_REASONS,
      placeholder: "Search for a reason",
      required: true,
      span: 12,
      when: refused,
    },
    {
      key: "effective",
      label: "Effective date",
      type: "date",
      span: 4,
      when: refused,
    },
    // Administered, and Historical behind Show more
    {
      key: "date",
      label: "Administer date",
      type: "date",
      required: true,
      span: 3,
      when: administered,
    },
    {
      key: "time",
      label: "Administer time",
      type: "time",
      span: 3,
      when: givenOrMore,
      more: true,
    },
    {
      key: "orderedBy",
      label: "Ordered by",
      type: "select",
      options: STAFF,
      placeholder: "Select ordered by",
      span: 3,
      when: givenOrMore,
      more: true,
    },
    {
      key: "by",
      label: "Administered by",
      type: "select",
      options: STAFF,
      placeholder: "Select administered by",
      span: 3,
      when: givenOrMore,
      more: true,
    },
    {
      key: "manufacturer",
      label: "Manufacturer",
      placeholder: "Enter manufacturer",
      span: 6,
      when: givenOrMore,
      more: true,
    },
    {
      key: "ndc",
      label: "NDC code",
      placeholder: "Enter NDC code",
      span: 6,
      when: givenOrMore,
      more: true,
    },
    {
      key: "lot",
      label: "LOT",
      placeholder: "Enter",
      span: 2,
      when: givenOrMore,
      more: true,
    },
    {
      key: "dose",
      label: "Dose",
      type: "number",
      placeholder: "Enter",
      span: 2,
      when: givenOrMore,
      more: true,
    },
    {
      key: "units",
      label: "Units",
      type: "select",
      options: VACCINE_UNITS,
      placeholder: "Select",
      span: 2,
      when: givenOrMore,
      more: true,
    },
    {
      key: "route",
      label: "Route",
      type: "select",
      options: VACCINE_ROUTES,
      placeholder: "Select",
      span: 2,
      when: givenOrMore,
      more: true,
    },
    {
      key: "site",
      label: "Body site",
      type: "select",
      options: BODY_SITES,
      placeholder: "Select",
      span: 2,
      when: givenOrMore,
      more: true,
    },
    {
      key: "expiry",
      label: "Expiry date",
      type: "date",
      span: 2,
      when: givenOrMore,
      more: true,
    },
    {
      key: "reaction",
      label: "Reaction",
      type: "select",
      options: VACCINE_REACTIONS,
      placeholder: "Select reaction",
      span: 6,
      when: givenOrMore,
      more: true,
    },
    {
      key: "whyGiven",
      label: "Reason",
      placeholder: "Enter reason",
      span: 6,
      when: givenOrMore,
      more: true,
    },
    { key: "note", label: "Note", type: "textarea", span: 12 },
  ],
  empty: () => ({
    status: "Administered",
    vaccine: "",
    date: today(),
    time: nowTime(),
    orderedBy: PROVIDER,
    by: "Kevin Tran, RN",
    manufacturer: "",
    ndc: "",
    lot: "",
    dose: "0.5",
    units: "ml",
    route: "Intramuscular",
    site: "Left arm",
    expiry: "",
    reaction: "None",
    whyGiven: "",
    infoSource: "",
    reason: "",
    effective: today(),
    note: "",
  }),
  toValues: (i) => {
    const [dose = "", units = ""] = i.dose.split(" ")
    return {
      status: i.status === "Refused" ? "Refused or not administered" : i.status,
      vaccine: i.vaccine,
      date: i.date,
      time: to24(i.time ?? ""),
      orderedBy: i.orderedBy ?? "",
      by: i.by,
      manufacturer: i.manufacturer,
      ndc: i.ndc ?? "",
      lot: i.lot,
      dose,
      units: i.units ?? units,
      route: i.route,
      site: i.site,
      expiry: i.expiry ?? "",
      reaction: i.reaction ?? "",
      whyGiven: "",
      infoSource: i.infoSource ?? "",
      reason: i.reason ?? "",
      effective: i.date || today(),
      note: i.note ?? "",
    }
  },
  build: (v, id) => {
    const isRefused = refused(v)
    const status = isRefused ? "Refused" : (v.status as Immunization["status"])
    return {
      id,
      status,
      vaccine: v.vaccine,
      dose: v.dose ? `${v.dose} ${v.units}`.trim() : "",
      route: isRefused ? "" : v.route,
      site: isRefused ? "" : v.site,
      lot: isRefused ? "" : v.lot.trim(),
      manufacturer: v.manufacturer.trim(),
      date: isRefused ? "" : v.date,
      time: isRefused ? undefined : to12(v.time),
      by: isRefused
        ? PROVIDER
        : v.by ||
          (historical(v) ? v.infoSource || "Reported by patient" : PROVIDER),
      orderedBy: v.orderedBy || undefined,
      ndc: v.ndc.trim() || undefined,
      units: v.units || undefined,
      expiry: v.expiry || undefined,
      reaction: v.reaction || undefined,
      infoSource: historical(v) ? v.infoSource || undefined : undefined,
      performer: historical(v)
        ? "Outside provider"
        : "Harborview Longevity Clinic",
      reason: isRefused ? v.reason : undefined,
      note: v.note.trim() || undefined,
      sourceId: PRACTICE_SOURCE,
    }
  },
}

const resultFields = (place: string, places: string[]): FieldSpec[] => [
  {
    key: "reviewer",
    label: "Reviewer",
    type: "select",
    options: STAFF,
    placeholder: "Select",
    span: 6,
  },
  {
    key: "date",
    label: "Recorded date",
    type: "date",
    required: true,
    span: 3,
  },
  { key: "time", label: "Recorded time", type: "time", span: 3 },
  {
    key: "place",
    label: place,
    type: "select",
    options: places,
    placeholder: "Select",
    span: 6,
  },
  {
    key: "test",
    label: "Test name",
    placeholder: "Enter test name",
    required: true,
    span: 6,
  },
]

const LAB: Kind<LabReport> = {
  noun: "lab result",
  title: "Add lab result",
  submit: "Save lab result",
  fields: [
    {
      key: "option",
      label: "Upload option",
      type: "radio",
      options: [
        "Associate result with existing lab order",
        "Upload result without lab order",
      ],
      span: 12,
    },
    {
      key: "order",
      label: "Lab order",
      type: "select",
      options: (r) =>
        r.labReports
          .filter((x) => x.sourceId !== PRACTICE_SOURCE)
          .slice(0, 12)
          .map((x) => `${x.name}, ${x.date}`),
      placeholder: "Select lab order",
      span: 12,
      when: (v) => v.option.startsWith("Associate"),
    },
    ...resultFields("Lab name", LAB_NAMES),
    {
      key: "value",
      label: "Result value",
      type: "number",
      placeholder: "Enter result value",
      required: true,
      span: 3,
    },
    {
      key: "unit",
      label: "Unit",
      placeholder: "Enter unit",
      required: true,
      span: 3,
    },
    {
      key: "interpretation",
      label: "Interpretation",
      type: "select",
      options: INTERPRETATIONS,
      placeholder: "Select",
      span: 6,
    },
    {
      key: "file",
      label: "Attachment",
      type: "upload",
      accept: "application/pdf,image/*",
      hideLabel: true,
      span: 12,
    },
    { key: "note", label: "Note", type: "textarea", span: 12 },
  ],
  empty: () => ({
    option: "Upload result without lab order",
    order: "",
    reviewer: PROVIDER,
    date: today(),
    time: nowTime(),
    place: "",
    test: "",
    value: "",
    unit: "",
    interpretation: "Normal",
    file: "",
    mime: "",
    fileName: "",
    note: "",
  }),
  toValues: (r) => ({
    option: "Upload result without lab order",
    order: "",
    reviewer: r.reviewer ?? PROVIDER,
    date: r.date,
    time: to24(r.time ?? ""),
    place: r.orderedBy,
    test: r.results[0]?.name ?? r.name,
    value: String(r.results[0]?.value ?? ""),
    unit: r.results[0]?.unit ?? "",
    interpretation: r.interpretation ?? "Normal",
    file: r.file ?? "",
    mime: r.mime ?? "",
    fileName: r.file ? "Attachment" : "",
    note: r.note ?? "",
  }),
  build: (v, id, record) => {
    const value = Number(v.value)
    const test = v.test.trim()
    const marker = record.biomarkers.find(
      (b) => b.name.toLowerCase() === test.toLowerCase()
    )
    return {
      id,
      name: test,
      date: v.date,
      time: to12(v.time),
      accession: `MAN-${v.date.replaceAll("-", "").slice(2)}`,
      orderedBy: v.place || "In-office lab",
      reviewer: v.reviewer || PROVIDER,
      status: "Final",
      interpretation: v.interpretation,
      file: v.file || undefined,
      mime: v.mime || undefined,
      note: v.note.trim() || undefined,
      sourceId: PRACTICE_SOURCE,
      results: [
        {
          name: test,
          loinc: marker ? (LOINC[marker.id] ?? "") : "",
          value,
          unit: v.unit.trim(),
          range:
            marker && marker.low != null && marker.high != null
              ? `${marker.low}-${marker.high}`
              : "",
          flag: FLAG[v.interpretation] ?? "",
          history: [...(marker?.readings.map((r) => r.value) ?? []), value],
        },
      ],
    }
  },
}

const IMAGING: Kind<{ study: StudyReport; document: ChartDocument }> = {
  noun: "imaging result",
  title: "Add image order",
  submit: "Save image result",
  fields: [
    {
      key: "option",
      label: "Upload option",
      type: "radio",
      options: [
        "Associate result with existing imaging order",
        "Upload result without imaging order",
      ],
      span: 12,
    },
    {
      key: "order",
      label: "Imaging order",
      type: "select",
      options: (r) =>
        r.studies
          .filter((x) => x.sourceId !== PRACTICE_SOURCE)
          .slice(0, 12)
          .map((x) => `${x.name}, ${x.date}`),
      placeholder: "Select imaging order",
      span: 12,
      when: (v) => v.option.startsWith("Associate"),
    },
    ...resultFields("Imaging type", IMAGING_TYPES),
    {
      key: "interpretation",
      label: "Interpretation",
      type: "select",
      options: ["Normal", "Abnormal", "Indeterminate"],
      placeholder: "Select",
      span: 6,
    },
    {
      key: "file",
      label: "Images or report",
      type: "upload",
      accept: "application/pdf,image/*",
      hideLabel: true,
      span: 12,
    },
    { key: "note", label: "Note", type: "textarea", span: 12 },
  ],
  empty: () => ({
    option: "Upload result without imaging order",
    order: "",
    reviewer: PROVIDER,
    date: today(),
    time: nowTime(),
    place: "",
    test: "",
    interpretation: "Normal",
    file: "",
    mime: "",
    fileName: "",
    note: "",
  }),
  toValues: ({ study, document }) => ({
    option: "Upload result without imaging order",
    order: "",
    reviewer: study.performer,
    date: study.date,
    time: to24(document.sections.find((s) => s.heading === "Time")?.text ?? ""),
    place:
      document.sections.find((s) => s.heading === "Imaging type")?.text ?? "",
    test: study.name,
    interpretation:
      document.sections.find((s) => s.heading === "Interpretation")?.text ??
      "Normal",
    file: document.file ?? "",
    mime: document.mime ?? "",
    fileName: document.file ? "Attachment" : "",
    note: study.conclusion,
  }),
  build: (v, id) => {
    const docId = `${id}-DOC`
    const test = v.test.trim()
    return {
      study: {
        id,
        category: "Imaging",
        name: test,
        code: "",
        date: v.date,
        status: "Final",
        performer: v.reviewer || PROVIDER,
        conclusion: v.note.trim(),
        documentId: docId,
        sourceId: PRACTICE_SOURCE,
      },
      document: {
        id: docId,
        kind: "upload",
        title: `${test} report`,
        format: v.mime?.startsWith("image/") ? "Image" : "PDF",
        date: v.date,
        author: v.reviewer || PROVIDER,
        sourceId: PRACTICE_SOURCE,
        file: v.file || undefined,
        mime: v.mime || undefined,
        sections: [
          ...(v.place ? [{ heading: "Imaging type", text: v.place }] : []),
          { heading: "Time", text: to12(v.time) },
          { heading: "Interpretation", text: v.interpretation },
          ...(v.note.trim() ? [{ heading: "Note", text: v.note.trim() }] : []),
        ],
      },
    }
  },
}

const DOCUMENT: Kind<ChartDocument> = {
  noun: "document",
  title: "Upload",
  submit: "Upload",
  fields: [
    {
      key: "type",
      label: "Select document type",
      type: "select",
      options: DOC_TYPES,
      placeholder: "Select document type",
      required: true,
    },
    { key: "date", label: "Date", type: "date", required: true },
    {
      key: "title",
      label: "Document name",
      placeholder: "Enter document name",
      required: true,
      span: 12,
    },
    {
      key: "file",
      label: "File",
      type: "upload",
      accept: "application/pdf,image/*",
      required: true,
      hideLabel: true,
      span: 12,
    },
  ],
  empty: () => ({
    type: "",
    date: today(),
    title: "",
    file: "",
    mime: "",
    fileName: "",
  }),
  toValues: (d) => ({
    type: d.sections.find((s) => s.heading === "Type")?.text ?? "Other",
    date: d.date,
    title: d.title,
    file: d.file ?? "",
    mime: d.mime ?? "",
    fileName:
      d.sections.find((s) => s.heading === "File")?.text ?? "Attachment",
  }),
  build: (v, id) => ({
    id,
    kind: "upload",
    title: v.title.trim(),
    format: v.mime.startsWith("image/") ? "Image" : "PDF",
    date: v.date,
    author: PROVIDER,
    sourceId: PRACTICE_SOURCE,
    file: v.file,
    mime: v.mime,
    sections: [
      { heading: "Type", text: v.type },
      ...(v.fileName ? [{ heading: "File", text: v.fileName }] : []),
    ],
  }),
}

/* eslint-disable @typescript-eslint/no-explicit-any -- one dialog, eight shapes */
const KINDS: Record<EntryKind, Kind<any>> = {
  condition: CONDITION,
  medication: MEDICATION,
  allergy: ALLERGY,
  lab: LAB,
  vitals: VITALS,
  imaging: IMAGING,
  vaccine: VACCINE,
  document: DOCUMENT,
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const ID_PREFIX: Record<EntryKind, string> = {
  condition: "CN",
  medication: "MS",
  allergy: "AL",
  lab: "DR",
  vitals: "VS",
  imaging: "DR-IMG",
  vaccine: "IM",
  document: "DOC",
}

export const ADD_LABEL: Record<EntryKind, string> = {
  condition: "Add diagnosis",
  medication: "Add medication",
  allergy: "Add allergy",
  lab: "Add lab result",
  vitals: "Add vitals",
  imaging: "Add imaging result",
  vaccine: "Add vaccine",
  document: "Upload document",
}

const MAX_FILE = 2 * 1024 * 1024
const SPAN: Record<number, string> = {
  2: "sm:col-span-2",
  3: "sm:col-span-3",
  4: "sm:col-span-4",
  5: "sm:col-span-5",
  6: "sm:col-span-6",
  8: "sm:col-span-8",
  12: "sm:col-span-12",
}

/* -------------------------------------------------------------------------- */
/*  Dialog                                                                     */
/* -------------------------------------------------------------------------- */

export function EntryDialog({
  kind,
  patientId,
  record,
  editing,
  open,
  onOpenChange,
}: {
  kind: EntryKind
  patientId: string
  record: HealthRecord
  /** The practice entry being edited; none to add a new one. */
  editing?: ChartEntry
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const wide =
    kind === "vaccine" ||
    kind === "vitals" ||
    kind === "lab" ||
    kind === "imaging"
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "gap-0 overflow-hidden p-0",
          wide ? "sm:max-w-3xl" : "sm:max-w-xl"
        )}
      >
        {open && (
          <EntryForm
            kind={kind}
            patientId={patientId}
            record={record}
            editing={editing}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function EntryForm({
  kind,
  patientId,
  record,
  editing,
  onDone,
}: {
  kind: EntryKind
  patientId: string
  record: HealthRecord
  editing?: ChartEntry
  onDone: () => void
}) {
  const spec = KINDS[kind]
  const [values, setValues] = React.useState<Values>(() =>
    editing ? { ...spec.empty(), ...spec.toValues(editing.data) } : spec.empty()
  )
  const [errors, setErrors] = React.useState<Values>({})
  const [confirming, setConfirming] = React.useState(false)
  const [showMore, setShowMore] = React.useState(false)
  const set = (key: string, value: string) =>
    setValues((v) => ({ ...v, [key]: value }))
  const visible = spec.fields.filter((f) => !f.when || f.when(values))
  const collapsible =
    visible.some((f) => f.more) && values.status === "Historical"
  const shown = visible.filter((f) => !f.more || !collapsible || showMore)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const next: Values = {}
    for (const f of shown)
      if (f.required && !String(values[f.key] ?? "").trim())
        next[f.key] =
          f.type === "upload"
            ? "Attach a file"
            : `Enter ${f.label.toLowerCase().replace(/ \(.+\)$/, "")}`
    setErrors(next)
    if (Object.keys(next).length) return
    const data = editing?.data as
      { id?: string; study?: { id: string } } | undefined
    const recordId = data?.id ?? data?.study?.id ?? practiceId(ID_PREFIX[kind])
    saveEntry(
      patientId,
      kind,
      spec.build(values, recordId, record),
      editing?.id
    )
    toast.success(editing ? "Changes saved" : `${capital(spec.noun)} added`, {
      description: "Marked as entered by the practice.",
    })
    onDone()
  }

  const title = editing ? `Edit ${spec.noun}` : spec.title

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-col">
      {/* Title and close, a ruled body that scrolls, then ruled actions. */}
      <DialogHeader className="min-h-16 justify-center border-b px-6 pr-16">
        <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
        <DialogDescription className="sr-only">
          Add a record to the chart by hand. It is kept apart from records
          synced from Health Gorilla.
        </DialogDescription>
      </DialogHeader>

      <div className="grid max-h-[68dvh] grid-cols-1 items-start gap-x-4 gap-y-4 overflow-y-auto px-6 py-5 sm:grid-cols-12">
        {shown.map((f, i) => (
          <React.Fragment key={`${f.key}-${i}`}>
            {collapsible && f.more && shown.findIndex((x) => x.more) === i && (
              <ShowMore open onToggle={() => setShowMore(false)} />
            )}
            {f.type === "heading" ? (
              <h3
                className={cn(
                  "text-sm font-semibold text-foreground sm:col-span-12",
                  i > 0 && "mt-1 border-t pt-4"
                )}
              >
                {f.label}
              </h3>
            ) : (
              <div className={cn("min-w-0", SPAN[f.span ?? 6])}>
                <FormField
                  f={f}
                  values={values}
                  error={errors[f.key]}
                  record={record}
                  set={set}
                  setValues={setValues}
                />
              </div>
            )}
          </React.Fragment>
        ))}
        {collapsible && !showMore && (
          <ShowMore open={false} onToggle={() => setShowMore(true)} />
        )}
      </div>

      <DialogFooter className="border-t px-6 py-4 sm:justify-between">
        {editing ? (
          confirming ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Remove it?</span>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  removeEntry(editing.id)
                  toast.success(`${capital(spec.noun)} removed`)
                  onDone()
                }}
              >
                Remove
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirming(false)}
              >
                Keep
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirming(true)}
            >
              Remove
            </Button>
          )
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit">
            {editing ? "Save changes" : spec.submit}
          </Button>
        </div>
      </DialogFooter>
    </form>
  )
}

const capital = (s: string) => s[0].toUpperCase() + s.slice(1)

function ShowMore({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="text-left text-sm font-medium text-primary-tint hover:underline sm:col-span-12"
    >
      {open ? "Show less" : "Show more"}
    </button>
  )
}

/* -------------------------------------------------------------------------- */
/*  Fields                                                                     */
/* -------------------------------------------------------------------------- */

function FieldHead({ id, f }: { id: string; f: FieldSpec }) {
  return (
    <FieldLabel
      htmlFor={id}
      className={cn(f.hideLabel && "invisible max-sm:hidden")}
    >
      {f.label}
      {f.required && !f.hideLabel && (
        <span className="text-destructive">*</span>
      )}
    </FieldLabel>
  )
}

function FormField({
  f,
  values,
  error,
  record,
  set,
  setValues,
}: {
  f: FieldSpec
  values: Values
  error?: string
  record: HealthRecord
  set: (key: string, value: string) => void
  setValues: React.Dispatch<React.SetStateAction<Values>>
}) {
  const id = `entry-${f.key}`
  const options =
    typeof f.options === "function" ? f.options(record, values) : f.options
  const invalid = error ? true : undefined

  switch (f.type) {
    case "select":
      return (
        <SelectField
          id={id}
          label={f.label}
          required={f.required}
          error={error}
          options={options ?? []}
          placeholder={f.placeholder ?? "Select"}
          value={values[f.key] ?? ""}
          onChange={(v) => set(f.key, v)}
          className={cn(
            f.hideLabel && "[&>label]:invisible max-sm:[&>label]:hidden"
          )}
        />
      )
    case "search":
      return (
        <Field data-invalid={invalid}>
          <FieldHead id={id} f={f} />
          <Combobox
            items={options ?? []}
            value={values[f.key] || null}
            onValueChange={(next: string | null) => set(f.key, next ?? "")}
            autoHighlight
          >
            <ComboboxInput
              id={id}
              placeholder={f.placeholder}
              aria-invalid={invalid}
              className="w-full"
            />
            <ComboboxContent>
              <ComboboxEmpty>No matches</ComboboxEmpty>
              <ComboboxList>
                {(item: string) => (
                  <ComboboxItem key={item} value={item}>
                    {item}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          {error && <FieldError>{error}</FieldError>}
        </Field>
      )
    case "radio":
      return (
        <Field data-invalid={invalid}>
          {!f.hideLabel && <FieldLabel>{f.label}</FieldLabel>}
          <RadioGroup
            value={values[f.key]}
            onValueChange={(v) => set(f.key, String(v))}
            className="flex flex-wrap gap-x-6 gap-y-2"
            aria-label={f.label}
          >
            {(options ?? []).map((o) => (
              <label key={o} className="flex items-center gap-2 text-sm">
                <RadioGroupItem value={o} />
                {o}
              </label>
            ))}
          </RadioGroup>
        </Field>
      )
    case "segment":
      return (
        <Field>
          <FieldLabel>{f.label}</FieldLabel>
          <div role="radiogroup" aria-label={f.label} className="flex gap-2">
            {(options ?? []).map((o) => {
              const on = values[f.key] === o
              return (
                <button
                  key={o}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => set(f.key, o)}
                  className={cn(
                    "h-8 min-w-20 rounded-md border px-4 text-sm transition-colors",
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-card text-foreground/80 hover:bg-surface-hover"
                  )}
                >
                  {o}
                </button>
              )
            })}
          </div>
        </Field>
      )
    case "textarea":
      return (
        <Field data-invalid={invalid}>
          <FieldHead id={id} f={f} />
          <Textarea
            id={id}
            rows={3}
            placeholder="Type here"
            value={values[f.key] ?? ""}
            onChange={(e) => set(f.key, e.target.value)}
          />
          {error && <FieldError>{error}</FieldError>}
        </Field>
      )
    case "upload":
      return (
        <DropZone
          id={id}
          label={f.label}
          accept={f.accept}
          error={error}
          file={values.file}
          mime={values.mime}
          fileName={values.fileName}
          onPick={(file, mime, fileName) =>
            setValues((v) => ({ ...v, file, mime, fileName }))
          }
          onClear={() =>
            setValues((v) => ({ ...v, file: "", mime: "", fileName: "" }))
          }
        />
      )
    case "readonly":
      return (
        <TextField
          id={id}
          label={f.label}
          value={f.compute?.(values) ?? ""}
          placeholder={f.placeholder ?? "From height and weight"}
          readOnly
          className="[&_input]:bg-muted [&_input]:text-muted-foreground"
        />
      )
    default:
      return (
        <TextField
          id={id}
          label={f.label}
          required={f.required && !f.hideLabel}
          error={error}
          type={f.type ?? "text"}
          step={f.type === "number" ? "any" : undefined}
          placeholder={f.placeholder}
          value={values[f.key] ?? ""}
          onChange={(e) => set(f.key, e.target.value)}
          className={cn(
            f.hideLabel && "[&>label]:invisible max-sm:[&>label]:hidden"
          )}
        />
      )
  }
}

/* The drag and drop area from both references, then the attached file as a
   row with its name and a remove button (Solid EHR). */
function DropZone({
  id,
  label,
  accept,
  error,
  file,
  mime,
  fileName,
  onPick,
  onClear,
}: {
  id: string
  label: string
  accept?: string
  error?: string
  file: string
  mime: string
  fileName: string
  onPick: (dataUrl: string, mime: string, name: string) => void
  onClear: () => void
}) {
  const input = React.useRef<HTMLInputElement>(null)
  const [over, setOver] = React.useState(false)

  function read(f: File | undefined) {
    if (!f) return
    if (f.size > MAX_FILE) {
      toast.error("Choose a file under 2 MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => onPick(String(reader.result), f.type, f.name)
    reader.readAsDataURL(f)
  }

  return (
    <Field data-invalid={error ? true : undefined}>
      <span className="sr-only">{label}</span>
      {!file ? (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setOver(true)
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setOver(false)
            read(e.dataTransfer.files[0])
          }}
          className={cn(
            "flex min-h-32 flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-5 text-sm transition-colors",
            over
              ? "border-primary bg-primary-surface"
              : "hover:bg-surface-hover",
            error && "border-destructive"
          )}
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-surface-sunken">
            <IconUpload className="size-5 text-muted-foreground" />
          </span>
          <span>
            <span className="font-medium text-primary-tint">
              Click to upload
            </span>{" "}
            <span className="text-muted-foreground">or drag and drop</span>
          </span>
          <span className="text-xs text-muted-foreground">
            PDF, PNG, JPG or GIF, up to 2 MB
          </span>
        </button>
      ) : (
        <div className="flex items-center gap-3 rounded-md border px-3 py-2.5">
          {mime.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element -- local preview
            <img
              src={file}
              alt=""
              className="size-10 rounded-sm object-cover"
            />
          ) : (
            <span className="flex size-10 items-center justify-center rounded-full bg-primary-surface">
              <IconFileText className="size-5 text-primary-tint" />
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {fileName || "Attachment"}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Remove file"
            className="text-destructive hover:text-destructive"
            onClick={onClear}
          >
            <IconClose />
          </Button>
        </div>
      )}
      <input
        ref={input}
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => read(e.target.files?.[0])}
      />
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}

/* -------------------------------------------------------------------------- */
/*  Wiring                                                                     */
/* -------------------------------------------------------------------------- */

type DetailField = [label: string, value: React.ReactNode]

/** What a row's View details popup shows. Empty values are left out, and a
    section with nothing left in it goes too. */
export type RowDetails = {
  title: string
  /** Codes shown small beside the source under the title. */
  codes?: (string | false | undefined)[]
  status?: {
    label: string
    tone: "success" | "warning" | "destructive" | "secondary" | "info"
  }
  /** The one line a clinician reads first, set apart: a sig, a reaction. */
  lead?: DetailField
  sections: { title: string; fields: DetailField[] }[]
  note?: string
  source: string
}

/** The Add button, the row menu and the popups they open, for one section. */
export function useEntryDialog(record: HealthRecord) {
  const [state, setState] = React.useState<{
    kind: EntryKind
    editing?: ChartEntry
  } | null>(null)
  const [viewing, setViewing] = React.useState<{
    kind: EntryKind
    item: { id: string; sourceId: string }
    details: RowDetails
  } | null>(null)
  const { items } = chartEntries.use()

  const add = (kind: EntryKind) => setState({ kind })
  const edit = (kind: EntryKind, recordId: string) => {
    const editing = entryFor(items, recordId)
    if (editing) setState({ kind, editing })
  }

  const addButton = (kind: EntryKind) => (
    <Button size="sm" onClick={() => add(kind)}>
      <IconAdd />
      {ADD_LABEL[kind]}
    </Button>
  )

  /* Every row ends in the same menu: View details for all, Edit for the
     rows the practice entered. Synced rows stay read only. */
  const rowAction = (
    kind: EntryKind,
    item: { id: string; sourceId: string },
    details: RowDetails
  ) => (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${details.title}`}
            onClick={(event) => event.stopPropagation()}
          >
            <IconMoreVertical />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => setViewing({ kind, item, details })}>
            <IconEye />
            View details
          </DropdownMenuItem>
          {isPractice(item) ? (
            <DropdownMenuItem onClick={() => edit(kind, item.id)}>
              <IconEdit />
              Edit
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled>
              <IconLock />
              Read only
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const dialog = (
    <>
      <EntryDialog
        kind={state?.kind ?? "condition"}
        patientId={record.patientId}
        record={record}
        editing={state?.editing}
        open={state !== null}
        onOpenChange={(open) => !open && setState(null)}
      />
      <DetailsDialog
        details={viewing?.details}
        open={viewing !== null}
        onOpenChange={(open) => !open && setViewing(null)}
        onEdit={
          viewing && isPractice(viewing.item)
            ? () => {
                const { kind, item } = viewing
                setViewing(null)
                edit(kind, item.id)
              }
            : undefined
        }
      />
    </>
  )

  return { add, edit, addButton, rowAction, dialog }
}

const filled = (value: React.ReactNode) =>
  value !== null && value !== undefined && value !== ""

/* A row's full record in a centred popup: the title with its status, codes
   and source; the lead line set apart; then small titled sections of
   Label : Value pairs in two columns; the note last. */
function DetailsDialog({
  details,
  open,
  onOpenChange,
  onEdit,
}: {
  details?: RowDetails
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
}) {
  const sections = (details?.sections ?? [])
    .map((s) => ({ ...s, fields: s.fields.filter(([, v]) => filled(v)) }))
    .filter((s) => s.fields.length > 0)
  const meta = [...(details?.codes ?? []).filter(Boolean), details?.source]
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 sm:max-w-xl">
        <DialogHeader className="gap-1 pr-8">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="text-base font-semibold">
              {details?.title}
            </DialogTitle>
            {details?.status && (
              <Badge
                variant={details.status.tone}
                className="h-5 rounded-full px-2 text-xs font-normal"
              >
                {details.status.label}
              </Badge>
            )}
          </div>
          <DialogDescription className="text-xs text-muted-foreground tabular-nums">
            {meta.filter(Boolean).join("  ·  ")}
          </DialogDescription>
        </DialogHeader>

        {details?.lead && filled(details.lead[1]) && (
          <div className="rounded-md bg-surface-sunken px-3.5 py-3">
            <div className="text-xs text-muted-foreground">
              {details.lead[0]}
            </div>
            <div className="mt-0.5 text-sm font-medium">{details.lead[1]}</div>
          </div>
        )}

        <div className="flex max-h-[55dvh] flex-col gap-5 overflow-y-auto">
          {sections.map((section) => (
            <section key={section.title}>
              <h3 className="border-b pb-1.5 text-[13px] font-semibold">
                {section.title}
              </h3>
              <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3">
                {section.fields.map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="mt-0.5 text-sm break-words tabular-nums">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
          {details?.note && (
            <section>
              <h3 className="border-b pb-1.5 text-[13px] font-semibold">
                Note
              </h3>
              <p className="mt-3 text-sm whitespace-pre-line">{details.note}</p>
            </section>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {onEdit && (
            <Button onClick={onEdit}>
              <IconEdit />
              Edit
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** The small tag that marks a record the practice entered. */
export function PracticeTag({ item }: { item: { sourceId: string } }) {
  if (!isPractice(item)) return null
  return (
    <span className="ml-1.5 inline-flex h-4.5 items-center rounded-full bg-info-surface px-1.5 align-middle text-[11px] font-medium text-info">
      Practice
    </span>
  )
}
