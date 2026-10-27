import type { ChartDocument, LabReport } from "@/components/practice/health-record"
import { type Patient, fullName } from "@/components/practice/practice-data"
import { ageAt, daysSince, fmtDate } from "@/components/provider/home-v2/clock"
import { outOfRange } from "@/components/provider/home-v2/labels"
import { gapDaysLate, orderDays } from "@/components/provider/home-v2/selectors"
import type {
  AbnormalResult,
  CareGap,
  MedicationChange,
  OutsideCare,
  OverdueOrder,
  QueueItem,
  ReviewDue,
} from "@/components/provider/home-v2/types"

/* What the side panel shows for an item: the AI summary (at a glance,
   current situation, recommendations) and the full report behind the item,
   drawn as the patient chart draws its documents (paperFor). Sample content keyed by the item's name,
   with a plain fallback for anything not written yet. The summary only
   reads; nothing here orders, prescribes or messages. */

export type Tone = "good" | "warn" | "bad" | "info" | "neutral"
export type RecKind = "next" | "recheck" | "followup" | "message" | "refer" | "schedule"

export type Insight = {
  title: string
  glance: { label: string; value: string; note?: string; tone?: Tone }[]
  progress?: { label: string; pct: number }[]
  situation: { text: string; tone: Tone; tag?: string }[]
  recommendations: { kind: RecKind; label: string; value: string }[]
  risks: { tone: Tone; strong: string; text: string }[]
}

export type Report = {
  title: string
  meta: [string, string][]
  table?: { columns: string[]; rows: { cells: string[]; flag?: boolean }[] }
  sections: { heading: string; body: string }[]
}

type Notes = Pick<Insight, "recommendations" | "risks"> & { situation?: Insight["situation"] }

/** "7 months", "2 years": a span in plain words. */
function span(days: number) {
  if (days < 45) return `${days} ${days === 1 ? "day" : "days"}`
  if (days < 365 * 2) return `${Math.round(days / 30)} months`
  return `${Math.round(days / 365)} years`
}

const who = (p: Patient) => `${fullName(p)}, ${ageAt(p.dob)} y ${p.sex.toLowerCase()}`

/* ----------------------------------------------------------- results -- */

const RESULT_NOTES: Record<string, Notes> = {
  "LDL cholesterol": {
    recommendations: [{ kind: "next", label: "Therapy", value: "Confirm the atorvastatin dose the patient takes" }, { kind: "recheck", label: "Recheck", value: "Lipid panel and ALT in 6 to 8 weeks" }],
    risks: [{ tone: "warn", strong: "Up 24% in 2 months", text: "with Lp(a) 80 already raised" }],
  },
  "Vitamin D, 25-OH": {
    recommendations: [{ kind: "next", label: "Replete", value: "Vitamin D3 50,000 IU weekly for 8 weeks" }, { kind: "recheck", label: "Recheck", value: "25-OH vitamin D in 3 months" }],
    risks: [{ tone: "neutral", strong: "Falling 3 results in a row", text: "bone health, DEXA order still open" }],
  },
  TSH: {
    recommendations: [{ kind: "recheck", label: "Confirm", value: "Repeat TSH with free T4 in 6 weeks" }, { kind: "next", label: "Adherence", value: "Patient skips levothyroxine on weekends" }],
    risks: [{ tone: "warn", strong: "TSH 6.8", text: "likely from missed doses" }],
  },
  ALT: {
    recommendations: [{ kind: "next", label: "Review", value: "Metformin dose doubled, empagliflozin added on 09/22" }, { kind: "recheck", label: "Recheck", value: "Hepatic panel in 4 weeks" }],
    risks: [{ tone: "warn", strong: "Rising", text: "41 to 72 over 12 months" }],
  },
  Hemoglobin: {
    recommendations: [{ kind: "recheck", label: "Workup", value: "Iron studies, B12, folate, reticulocyte count" }, { kind: "followup", label: "Kidney", value: "Anemia of CKD with eGFR 41" }],
    risks: [{ tone: "bad", strong: "Hemoglobin 10.9", text: "falling, eGFR also falling" }],
  },
  "Chest X-ray": {
    situation: [{ text: "New nodule compared with 2024 film", tone: "warn", tag: "4 mm" }],
    recommendations: [{ kind: "followup", label: "Follow-up", value: "Fleischner: optional CT at 12 months for a low risk patient" }, { kind: "message", label: "Patient", value: "Explain the finding and the plan" }],
    risks: [{ tone: "neutral", strong: "Small nodule", text: "low risk under 6 mm" }],
  },
  Potassium: {
    situation: [
      { text: "Drawn in the ED during a visit for palpitations", tone: "warn" },
      { text: "Metoprolol started at the same visit", tone: "info", tag: "New medication" },
    ],
    recommendations: [
      { kind: "recheck", label: "Recheck", value: "Repeat BMP within 48 to 72 hours" },
      { kind: "next", label: "Review medications", value: "Potassium sparing agents, ACE inhibitor, supplements" },
      { kind: "followup", label: "ECG", value: "Compare with the 09/27 ECG if repeat is above 5.5" },
    ],
    risks: [
      { tone: "bad", strong: "Hyperkalemia 5.8", text: "arrhythmia risk, frequent PVCs on the same day ECG" },
      { tone: "warn", strong: "BUN 24", text: "mild rise, possible volume depletion" },
      { tone: "neutral", strong: "Specimen not hemolyzed", text: "the value is likely real" },
    ],
  },
  "Hemoglobin A1c": {
    recommendations: [
      { kind: "schedule", label: "Visit", value: "Diabetes follow-up within 4 weeks" },
      { kind: "next", label: "Therapy", value: "Review adherence and current glucose lowering plan" },
      { kind: "recheck", label: "Recheck", value: "Repeat A1c in 3 months" },
    ],
    risks: [
      { tone: "warn", strong: "Rising 3 results in a row", text: "control is drifting away from target" },
      { tone: "neutral", strong: "Kidney function", text: "check eGFR and UACR before changing therapy" },
    ],
  },
  eGFR: {
    situation: [{ text: "Albumin to creatinine ratio also raised", tone: "bad", tag: "UACR 64" }],
    recommendations: [
      { kind: "recheck", label: "Confirm", value: "Repeat eGFR and UACR in 4 to 6 weeks" },
      { kind: "next", label: "Medications", value: "Review renally dosed drugs and NSAID use" },
      { kind: "refer", label: "Nephrology", value: "Refer if eGFR stays under 45 or keeps falling" },
    ],
    risks: [
      { tone: "bad", strong: "Falling 4 results in a row", text: "from 58 to 41 over 20 months" },
      { tone: "warn", strong: "Stage 3b range", text: "dose adjustments may be needed" },
    ],
  },
  "Lipoprotein(a)": {
    recommendations: [
      { kind: "next", label: "Risk", value: "Fold Lp(a) into the 10 year ASCVD estimate" },
      { kind: "followup", label: "LDL", value: "Consider a lower LDL target given raised Lp(a)" },
    ],
    risks: [{ tone: "warn", strong: "Lp(a) 80", text: "genetic, lifelong added cardiovascular risk" }],
  },
  Mammogram: {
    situation: [{ text: "Suspicious finding, tissue diagnosis advised", tone: "bad", tag: "BI-RADS 4" }],
    recommendations: [
      { kind: "refer", label: "Biopsy", value: "Ultrasound guided core biopsy, left breast" },
      { kind: "message", label: "Patient", value: "Discuss the result before the biopsy is booked" },
      { kind: "followup", label: "Track", value: "Confirm the biopsy date within 7 days" },
    ],
    risks: [
      { tone: "bad", strong: "BI-RADS 4", text: "likelihood of malignancy between 2% and 95%" },
      { tone: "warn", strong: "Outside result", text: "not yet in the practice EHR" },
    ],
  },
  ECG: {
    situation: [{ text: "Recorded in the ED, same day as potassium 5.8", tone: "warn" }],
    recommendations: [
      { kind: "followup", label: "Monitor", value: "Consider a 48 hour Holter" },
      { kind: "recheck", label: "Labs", value: "Repeat potassium and magnesium" },
      { kind: "schedule", label: "Visit", value: "Follow up within 1 week of the ED visit" },
    ],
    risks: [
      { tone: "warn", strong: "Frequent PVCs", text: "with a raised potassium" },
      { tone: "neutral", strong: "QTc 448 ms", text: "upper normal, watch new QT prolonging drugs" },
    ],
  },
  "Home sleep apnea test": {
    recommendations: [
      { kind: "refer", label: "Sleep medicine", value: "Referral already ordered, not yet scheduled" },
      { kind: "next", label: "Conservative care", value: "Positional therapy, weight, alcohol timing" },
    ],
    risks: [
      { tone: "warn", strong: "O₂ nadir 85%", text: "desaturation during sleep" },
      { tone: "neutral", strong: "Mild AHI 5.3", text: "mostly supine events" },
    ],
  },
}

const LAB_PANELS: Record<string, { title: string; rows: string[][] }> = {
  Potassium: {
    title: "Basic metabolic panel",
    rows: [
      ["Sodium", "138", "mmol/L", "135-145", ""],
      ["Potassium", "5.8", "mmol/L", "3.5-5.1", "H"],
      ["Chloride", "102", "mmol/L", "98-107", ""],
      ["CO2", "23", "mmol/L", "22-29", ""],
      ["BUN", "24", "mg/dL", "7-20", "H"],
      ["Creatinine", "1.3", "mg/dL", "0.7-1.3", ""],
      ["Glucose", "112", "mg/dL", "70-99", "H"],
      ["Calcium", "9.4", "mg/dL", "8.6-10.3", ""],
    ],
  },
  eGFR: {
    title: "Renal function panel",
    rows: [
      ["Creatinine", "1.68", "mg/dL", "0.7-1.3", "H"],
      ["BUN", "31", "mg/dL", "7-20", "H"],
      ["eGFR", "41", "mL/min/1.73m²", "≥60", "L"],
      ["Potassium", "4.9", "mmol/L", "3.5-5.1", ""],
      ["Albumin to creatinine ratio", "64", "mg/g", "<30", "H"],
      ["Phosphorus", "4.1", "mg/dL", "2.5-4.5", ""],
    ],
  },
  "Lipoprotein(a)": {
    title: "Advanced lipid panel",
    rows: [
      ["Total cholesterol", "212", "mg/dL", "<200", "H"],
      ["LDL cholesterol", "131", "mg/dL", "<100", "H"],
      ["HDL cholesterol", "46", "mg/dL", ">40", ""],
      ["Triglycerides", "175", "mg/dL", "<150", "H"],
      ["Lipoprotein(a)", "80", "nmol/L", "<75", "H"],
      ["ApoB", "104", "mg/dL", "<90", "H"],
    ],
  },
}

const REPORT_TEXT: Record<string, { heading: string; body: string }[]> = {
  Mammogram: [
    { heading: "Technique", body: "Bilateral digital screening mammogram with tomosynthesis. Compared with the prior exam of 07/15/2024." },
    { heading: "Findings", body: "The breasts are heterogeneously dense. In the left breast, upper outer quadrant, 4 cm from the nipple, there is a new 9 mm irregular mass with indistinct margins. No suspicious calcifications. The right breast is unremarkable. No axillary adenopathy." },
    { heading: "Impression", body: "Suspicious abnormality, left breast. BI-RADS 4: suspicious." },
    { heading: "Recommendation", body: "Ultrasound guided core needle biopsy of the left breast mass." },
  ],
  ECG: [
    { heading: "Measurements", body: "Rate 112 bpm. PR 152 ms. QRS 92 ms. QT/QTc 344/448 ms. Axis +42°." },
    { heading: "Rhythm", body: "Sinus tachycardia with frequent unifocal premature ventricular complexes, 9 in a 10 second strip, no couplets." },
    { heading: "Interpretation", body: "No acute ST or T wave change. Peaked T waves not seen. Compared with 03/2025: rate faster, PVCs new." },
  ],
  "Home sleep apnea test": [
    { heading: "Study", body: "Type 3 home sleep apnea test, 1 night, 6 h 48 min of recording, 6 h 05 min of estimated sleep." },
    { heading: "Results", body: "AHI 5.3 events per hour (supine 9.1, non-supine 2.0). ODI 6.1. Mean SpO₂ 93%. O₂ nadir 85%. Time under 90%: 2.4%. Snoring 31% of the night." },
    { heading: "Impression", body: "Mild obstructive sleep apnea, positional. Clinical correlation and sleep medicine review advised." },
  ],
}

function resultInsight(item: QueueItem, r: AbnormalResult): Insight {
  const notes = RESULT_NOTES[r.name] ?? { recommendations: [], risks: [] }
  const history = r.history ?? []
  const situation: Insight["situation"] = []
  if (r.kind === "lab" && history.length > 1) {
    const last = history[history.length - 1]!.value
    const prev = history[history.length - 2]!.value
    const pct = Math.round(((last - prev) / prev) * 100)
    situation.push({ text: `${pct > 0 ? "Up" : "Down"} ${Math.abs(pct)}% from ${prev} on ${fmtDate(history[history.length - 2]!.date)}`, tone: "bad", tag: `${prev} → ${last}` })
    situation.push({ text: `${history.length} results since ${fmtDate(history[0]!.date)}`, tone: "neutral" })
  }
  situation.push(...(notes.situation ?? []))
  if (item.isOutsideSource) situation.push({ text: "From outside the practice EHR, not yet filed", tone: "warn" })

  /* What the facts grid cannot show: the change, how often it was out of
     range, and the direction. */
  const values = history.map((h) => h.value)
  const out = values.filter((v) => outOfRange(v, r)).length
  const rising = values.length > 2 && values.slice(-3).every((v, i, a) => i === 0 || v > a[i - 1]!)
  const falling = values.length > 2 && values.slice(-3).every((v, i, a) => i === 0 || v < a[i - 1]!)
  const change = values.length > 1 ? Math.round(((values[values.length - 1]! - values[values.length - 2]!) / values[values.length - 2]!) * 100) : 0

  return {
    title: "AI result summary",
    glance:
      r.kind === "lab" && values.length > 1
        ? [
            { label: "Change", value: `${change > 0 ? "+" : ""}${change}%`, note: "vs the last result", tone: "bad" },
            { label: "Out of range", value: `${out} of ${values.length}`, note: "results on record", tone: out > 1 ? "bad" : "warn" },
            { label: "Direction", value: rising ? "Rising" : falling ? "Falling" : "Mixed", note: "last 3 results", tone: rising || falling ? "warn" : "neutral" },
          ]
        : [],
    situation,
    recommendations: notes.recommendations,
    risks: notes.risks,
  }
}

function resultReport(item: QueueItem, r: AbnormalResult, p: Patient): Report {
  const meta: [string, string][] = [
    ["Patient", who(p)],
    ["Performing site", item.source],
    ["Collected", fmtDate(r.resultedAt)],
    ["Reported", fmtDate(r.resultedAt)],
    ["Ordering", "Daniel Reyes, MD"],
  ]
  if (r.kind === "report") return { title: r.name, meta, sections: REPORT_TEXT[r.name] ?? [{ heading: "Impression", body: r.value ?? "" }] }
  const panel = LAB_PANELS[r.name]
  const rows = panel
    ? panel.rows
    : r.name === "Hemoglobin A1c"
      ? [
          ["Hemoglobin A1c", r.value ?? "", "%", r.range ?? "", r.flag],
          ["Estimated average glucose", String(Math.round(28.7 * Number(r.value) - 46.7)), "mg/dL", "", ""],
        ]
      : [[r.name, r.value ?? "", r.unit ?? "", r.range ?? "", r.flag]]
  return {
    title: panel?.title ?? r.name,
    meta: [...meta, ["Specimen", r.name === "Hemoglobin A1c" ? "Whole blood, EDTA" : "Serum"]],
    table: {
      columns: ["Test", "Result", "Unit", "Reference", "Flag"],
      rows: rows.map((cells) => ({ cells, flag: !!cells[4] })),
    },
    sections: [
      {
        heading: "Lab comment",
        body:
          r.name === "Hemoglobin A1c"
            ? "ADA: 5.7% to 6.4% is prediabetes; 6.5% or higher is consistent with diabetes. Target under 7% for most adults with diabetes."
            : "Specimen received in good condition. No hemolysis, lipemia or icterus noted.",
      },
    ],
  }
}

/* ------------------------------------------------------- medications -- */

const MED_NOTES: Record<string, Notes & { history: string[][] }> = {
  Metformin: {
    recommendations: [{ kind: "next", label: "Reconcile", value: "Update the practice list to 1,000 mg twice daily" }, { kind: "recheck", label: "Labs", value: "ALT is up, recheck in 4 weeks" }],
    risks: [{ tone: "warn", strong: "eGFR check", text: "confirm kidney function before full dose" }],
    history: [["05/20/2026", "Practice EHR", "500 mg twice daily", "Daniel Reyes, MD"], ["09/22/2026", "Scripps Health (Epic)", "1,000 mg twice daily", "Dr. Alan Jones"]],
  },
  Empagliflozin: {
    recommendations: [{ kind: "next", label: "Add to list", value: "Started by endocrinology, add after confirming" }, { kind: "followup", label: "Counsel", value: "Hydration and genital hygiene" }],
    risks: [{ tone: "neutral", strong: "New SGLT2 inhibitor", text: "watch volume status" }],
    history: [["09/22/2026", "Scripps Health (Epic)", "10 mg daily", "Dr. Alan Jones"]],
  },
  Sertraline: {
    recommendations: [{ kind: "message", label: "Patient", value: "Ask about mood since stopping" }, { kind: "next", label: "Alternative", value: "Consider a different SSRI if still indicated" }],
    risks: [{ tone: "warn", strong: "Stopped abruptly", text: "discontinuation symptoms, mood relapse" }],
    history: [["02/14/2026", "Practice EHR", "50 mg daily", "Daniel Reyes, MD"], ["10/02/2026", "Patient (Inlay app)", "Not taking", "Patient"]],
  },
  Lisinopril: {
    recommendations: [{ kind: "next", label: "Confirm", value: "Nephrology stopped it for falling eGFR" }, { kind: "followup", label: "Blood pressure", value: "Home readings for 2 weeks" }],
    risks: [{ tone: "warn", strong: "ACE inhibitor stopped", text: "blood pressure may rise" }],
    history: [["01/10/2022", "Practice EHR", "20 mg daily", "Daniel Reyes, MD"], ["09/25/2026", "UC San Diego Health (Epic)", "Stopped", "Dr. Kim Patel"]],
  },
  Furosemide: {
    recommendations: [{ kind: "next", label: "Add to list", value: "Started by nephrology" }, { kind: "recheck", label: "Labs", value: "BMP in 1 to 2 weeks" }],
    risks: [{ tone: "warn", strong: "Loop diuretic", text: "potassium and kidney function shifts" }],
    history: [["09/25/2026", "UC San Diego Health (Epic)", "20 mg daily", "Dr. Kim Patel"]],
  },
  Levothyroxine: {
    recommendations: [{ kind: "message", label: "Patient", value: "Explain daily dosing, TSH is 6.8" }, { kind: "recheck", label: "Recheck", value: "TSH in 6 weeks" }],
    risks: [{ tone: "warn", strong: "Skips weekends", text: "under-replaced thyroid" }],
    history: [["04/02/2026", "Practice EHR", "50 mcg daily", "Daniel Reyes, MD"], ["09/28/2026", "Patient (Inlay app)", "Skips weekends", "Patient"]],
  },
  Omeprazole: {
    recommendations: [{ kind: "next", label: "Add to list", value: "Confirm indication and duration" }, { kind: "followup", label: "Deprescribe", value: "Plan a taper after 8 weeks" }],
    risks: [{ tone: "neutral", strong: "Long term PPI", text: "B12 and magnesium over time" }],
    history: [["09/18/2026", "Scripps Health (Epic)", "20 mg daily", "Dr. Priya Shah"]],
  },
  Atorvastatin: {
    recommendations: [
      { kind: "next", label: "Reconcile", value: "Confirm the new dose with the cardiologist's note" },
      { kind: "recheck", label: "Labs", value: "Lipid panel and ALT 6 to 12 weeks after the change" },
    ],
    risks: [
      { tone: "warn", strong: "Two lists disagree", text: "the patient may be taking either dose" },
      { tone: "neutral", strong: "Lipid panel overdue", text: "ordered 08/12, not yet done" },
    ],
    history: [
      ["03/14/2024", "Practice EHR", "10 mg daily", "Elise Harrington, MD"],
      ["09/10/2026", "Scripps Health (Epic)", "20 mg daily", "Dr. Alan Jones"],
    ],
  },
  "Metoprolol tartrate": {
    recommendations: [
      { kind: "next", label: "Add to list", value: "Confirm the patient is taking it, then add" },
      { kind: "followup", label: "Vitals", value: "Heart rate and blood pressure at the follow-up" },
    ],
    risks: [
      { tone: "warn", strong: "Started in the ED", text: "for palpitations, no outpatient plan yet" },
      { tone: "neutral", strong: "Potassium 5.8", text: "beta blockers can raise potassium slightly" },
    ],
    history: [["09/27/2026", "UC San Diego Health ED", "25 mg twice daily", "ED physician"]],
  },
  "Vitamin D3": {
    recommendations: [
      { kind: "next", label: "Update list", value: "Mark as not taking, or restart if still indicated" },
      { kind: "recheck", label: "Level", value: "25-OH vitamin D at the next draw" },
    ],
    risks: [{ tone: "neutral", strong: "Low impact", text: "supplement, no interaction concerns" }],
    history: [
      ["01/08/2026", "Practice EHR", "2,000 IU daily", "Daniel Reyes, MD"],
      ["09/30/2026", "Patient (Inlay app)", "Not taking", "Patient"],
    ],
  },
  Tadalafil: {
    recommendations: [
      { kind: "next", label: "Clarify", value: "Daily use at midday versus 5 mg as needed" },
      { kind: "followup", label: "Interactions", value: "Check for nitrates and alpha blockers" },
    ],
    risks: [{ tone: "warn", strong: "Taking differently", text: "daily use changes the dosing plan" }],
    history: [
      ["02/02/2026", "Practice EHR", "5 mg as needed", "Daniel Reyes, MD"],
      ["09/15/2026", "Patient (Inlay app)", "Daily at midday", "Patient"],
    ],
  },
  Warfarin: {
    recommendations: [
      { kind: "next", label: "Indication", value: "Confirm why it was stopped during the admission" },
      { kind: "followup", label: "Anticoagulation", value: "Check if a replacement anticoagulant was started" },
      { kind: "message", label: "Care team", value: "Stop INR monitoring if no longer on warfarin" },
    ],
    risks: [
      { tone: "bad", strong: "Stopped anticoagulant", text: "stroke or clot risk if the indication remains" },
      { tone: "warn", strong: "Admission", text: "community-acquired pneumonia, Henry Ford Hospital" },
    ],
    history: [
      ["05/20/2023", "Practice EHR", "5 mg daily", "Elise Harrington, MD"],
      ["10/02/2026", "Henry Ford Health (Epic)", "Stopped", "Dr. Maria Silva"],
    ],
  },
}

/** The change in one sentence, naming both sides. */
function medicationLine(m: MedicationChange) {
  switch (m.change) {
    case "dose":
      return `${m.changedBy ?? "Another prescriber"} lists ${m.otherEntry}; the practice list still says ${m.practiceEntry}`
    case "not_on_list":
      return `${m.changedBy ?? "An outside prescriber"} started ${m.otherEntry}; it is not on the practice list`
    case "stopped":
      return `${m.changedBy ?? "An outside prescriber"} stopped it; the practice list still shows ${m.practiceEntry}`
    case "patient_report":
      return `The patient says ${(m.patientSays ?? "no answer").toLowerCase()}${m.patientNote ? ` (${m.patientNote.toLowerCase()})` : ""}; the list shows ${m.practiceEntry}`
  }
}

function medicationInsight(item: QueueItem, m: MedicationChange): Insight {
  const notes = MED_NOTES[m.medication] ?? { recommendations: [], risks: [], history: [] }
  return {
    title: "AI medication summary",
    glance: [
      {
        label: "Sources",
        value: m.change === "patient_report" ? "Patient vs list" : "2 disagree",
        note: m.change === "patient_report" ? "Inlay app check-in" : `Practice vs ${item.source.replace(/ \(Epic\)$/, "")}`,
        tone: "warn",
      },
      { label: "Interactions", value: "None major", note: "with the active list", tone: "good" },
      { label: "Last pharmacy fill", value: "09/02/2026", note: "30 day supply", tone: "neutral" },
    ],
    situation: [{ text: medicationLine(m), tone: "warn" as Tone }, ...(notes.situation ?? [])],
    recommendations: notes.recommendations,
    risks: notes.risks,
  }
}

function medicationReport(item: QueueItem, m: MedicationChange, p: Patient): Report {
  const notes = MED_NOTES[m.medication]
  return {
    title: m.change === "patient_report" ? "Check-in" : m.medication,
    meta:
      m.change === "patient_report"
        ? [
            ["Patient", who(p)],
            ["Asked", `Are you taking ${m.medication} ${m.practiceEntry ?? ""}?`.replace(" ?", "?")],
            ["Answer", m.patientSays ?? "No answer"],
            ["Submitted", `${fmtDate(m.date)}, Inlay app`],
          ]
        : [
            ["Patient", who(p)],
            ["Prescriber", m.changedBy ?? "Not recorded"],
            ["Entry", m.change === "stopped" ? "Stopped" : (m.otherEntry ?? "")],
            ["Date", fmtDate(m.date)],
            ["Last pharmacy fill", "09/02/2026, 30 day supply"],
          ],
    table: {
      columns: ["Date", "Source", "Entry", "Prescriber"],
      rows: (notes?.history ?? [[fmtDate(m.date), item.source, m.otherEntry ?? m.practiceEntry ?? "", m.changedBy ?? ""]]).map((cells, i, all) => ({
        cells,
        flag: i === all.length - 1,
      })),
    },
    sections: [
      ...(m.patientNote ? [{ heading: "Patient comment", body: m.patientNote }] : []),
      { heading: "Allergies", body: "No known drug allergies." },
      { heading: "Interaction check", body: "No major interactions with the active practice list." },
    ],
  }
}

/* ------------------------------------------------------------ orders -- */

const ORDER_NOTES: Record<string, Notes & { cpt: string; dx: string; instructions: string }> = {
  "Diabetic eye exam": {
    cpt: "92250", dx: "E11.9 Type 2 diabetes mellitus", instructions: "Dilated retinal exam or retinal photography.",
    recommendations: [{ kind: "message", label: "Outreach", value: "Offer retinal photography at the next visit" }],
    risks: [{ tone: "warn", strong: "No eye exam in 2 years", text: "retinopathy screening overdue" }],
  },
  "Urine albumin to creatinine ratio": {
    cpt: "82043", dx: "E11.9 Type 2 diabetes mellitus", instructions: "Random urine sample, first morning preferred.",
    recommendations: [{ kind: "schedule", label: "Bundle", value: "Collect with the diabetes follow-up labs" }],
    risks: [{ tone: "warn", strong: "Kidney screening", text: "not done this year" }],
  },
  "Breast ultrasound": {
    cpt: "76641", dx: "N63.20 Unspecified lump in the left breast", instructions: "Targeted left breast ultrasound, upper outer quadrant.",
    recommendations: [{ kind: "schedule", label: "Reschedule", value: "Book with the biopsy now advised" }, { kind: "message", label: "Patient", value: "Call, the appointment was missed" }],
    risks: [{ tone: "bad", strong: "Missed imaging", text: "BI-RADS 4 on the 10/02 mammogram" }],
  },
  "DEXA scan": {
    cpt: "77080", dx: "Z78.0 Asymptomatic menopausal state", instructions: "Hip and lumbar spine bone density.",
    recommendations: [{ kind: "message", label: "Outreach", value: "Offer a slot with the next imaging visit" }],
    risks: [{ tone: "neutral", strong: "Vitamin D 18", text: "bone density not yet measured" }],
  },
  "Renal ultrasound": {
    cpt: "76770", dx: "N18.32 Chronic kidney disease, stage 3b", instructions: "Complete renal and bladder ultrasound.",
    recommendations: [{ kind: "schedule", label: "Book", value: "Before the nephrology follow-up" }],
    risks: [{ tone: "warn", strong: "eGFR 41", text: "falling, imaging still not done" }],
  },
  "Thyroid ultrasound": {
    cpt: "76536", dx: "E04.1 Nontoxic single thyroid nodule", instructions: "Thyroid and neck ultrasound.",
    recommendations: [{ kind: "message", label: "Outreach", value: "Call to book, 3 app reminders unanswered" }],
    risks: [{ tone: "neutral", strong: "Palpable nodule", text: "not yet characterized" }],
  },
  "Coronary calcium score": {
    cpt: "75571", dx: "Z13.6 Screening for cardiovascular disorders", instructions: "Non-contrast cardiac CT, calcium scoring.",
    recommendations: [{ kind: "schedule", label: "Reschedule", value: "Missed on 07/30, rebook" }],
    risks: [{ tone: "neutral", strong: "Risk unclear", text: "statin decision waits on the score" }],
  },
  Colonoscopy: {
    cpt: "45378", dx: "Z12.11 Screening for colon cancer", instructions: "Screening colonoscopy, split dose prep.",
    recommendations: [{ kind: "message", label: "Offer", value: "Stool based test if the patient prefers" }],
    risks: [{ tone: "warn", strong: "Over 5 months overdue", text: "screening still not done" }],
  },
  "Lipid panel": {
    cpt: "80061",
    dx: "E78.5 Hyperlipidemia, unspecified",
    instructions: "Fasting 9 to 12 hours. Any Quest location.",
    recommendations: [
      { kind: "message", label: "Outreach", value: "Call the patient, the app reminders went unanswered" },
      { kind: "schedule", label: "Bundle", value: "Draw with the repeat potassium this week" },
    ],
    risks: [{ tone: "warn", strong: "Dose change pending", text: "atorvastatin change needs a lipid baseline" }],
  },
  "Sleep medicine referral": {
    cpt: "99204",
    dx: "G47.33 Obstructive sleep apnea",
    instructions: "Mild positional OSA on home study. Evaluate for oral appliance or CPAP.",
    recommendations: [
      { kind: "message", label: "Outreach", value: "Offer a telehealth sleep consult" },
      { kind: "next", label: "Or close", value: "Close if the patient prefers conservative care" },
    ],
    risks: [{ tone: "warn", strong: "O₂ nadir 85%", text: "untreated desaturation" }],
  },
  "CT chest follow-up (nodule)": {
    cpt: "71250",
    dx: "R91.1 Solitary pulmonary nodule",
    instructions: "Low dose CT chest without contrast. 6 month follow-up of an 8 mm nodule, right upper lobe.",
    recommendations: [
      { kind: "schedule", label: "Reschedule", value: "Book the missed CT within 2 weeks" },
      { kind: "message", label: "Patient", value: "Explain why the follow-up scan matters" },
    ],
    risks: [
      { tone: "bad", strong: "8 mm nodule", text: "follow-up missed on 08/20" },
      { tone: "warn", strong: "Former smoker", text: "higher pretest risk" },
    ],
  },
}

function orderInsight(item: QueueItem, o: OverdueOrder): Insight {
  const notes = ORDER_NOTES[o.order] ?? { recommendations: [], risks: [] }
  const days = orderDays(o)
  return {
    title: "AI order summary",
    glance: [
      { label: "Outreach tried", value: "2 app, 1 call", note: "no booking", tone: "warn" },
      { label: "Escalated", value: fmtDate(o.reminderDates[o.reminderDates.length - 1]!), note: `${span(days)} waiting`, tone: "bad" },
    ],
    progress: [{ label: "Order to completion", pct: o.stage === "not_scheduled" ? 33 : 66 }],
    situation: [
      { text: o.scheduledAt ? `Booked for ${fmtDate(o.scheduledAt)}, not completed` : "Never scheduled by the patient", tone: "warn" },
      { text: "Escalated to you after every reminder went unanswered", tone: "bad" },
    ],
    recommendations: notes.recommendations,
    risks: notes.risks,
  }
}

function orderReport(item: QueueItem, o: OverdueOrder, p: Patient): Report {
  const notes = ORDER_NOTES[o.order]
  return {
    title: `Order requisition: ${o.order}`,
    meta: [
      ["Patient", who(p)],
      ["Order ID", `ORD-${item.id.slice(1)}${o.orderedAt.slice(5, 7)}${o.orderedAt.slice(8, 10)}`],
      ["CPT", notes?.cpt ?? "Not coded"],
      ["Diagnosis", notes?.dx ?? "Not given"],
      ["Ordered by", o.orderedBy],
      ["Ordered", fmtDate(o.orderedAt)],
    ],
    table: {
      columns: ["Reminder", "Date", "Channel", "Outcome"],
      rows: o.reminderDates.map((d, i) => ({
        cells: [`${i + 1}`, fmtDate(d), i === 2 ? "Phone" : "Inlay app", i === 2 ? "Voicemail" : "Opened, no booking"],
      })),
    },
    sections: [{ heading: "Instructions", body: notes?.instructions ?? "None" }],
  }
}

/* ------------------------------------------------------ outside care -- */

const VISIT_NOTES: Record<string, Notes & { note: { heading: string; body: string }[] }> = {
  Palpitations: {
    recommendations: [
      { kind: "schedule", label: "Follow-up", value: "Visit within 7 days of the ED discharge" },
      { kind: "recheck", label: "Labs", value: "Repeat potassium, magnesium, TSH" },
    ],
    risks: [{ tone: "warn", strong: "New beta blocker", text: "metoprolol started, not on practice list" }],
    note: [
      { heading: "Chief complaint", body: "Racing heart for 2 hours, no chest pain, no syncope." },
      { heading: "Workup", body: "ECG: sinus tachycardia with frequent PVCs. Potassium 5.8. Troponin negative x2. TSH pending." },
      { heading: "Disposition", body: "Discharged home on metoprolol tartrate 25 mg twice daily. Follow up with primary care in 1 week." },
    ],
  },
  "Community-acquired pneumonia": {
    recommendations: [
      { kind: "followup", label: "Transition of care", value: "Call within 2 business days of discharge" },
      { kind: "next", label: "Medications", value: "Reconcile: warfarin stopped during admission" },
    ],
    risks: [
      { tone: "bad", strong: "Age 81, admitted", text: "high readmission risk" },
      { tone: "warn", strong: "Anticoagulation change", text: "warfarin stopped" },
    ],
    note: [
      { heading: "Admission", body: "Fever, productive cough and hypoxia (SpO₂ 89%). Right lower lobe consolidation on chest X-ray." },
      { heading: "Treatment", body: "IV ceftriaxone and azithromycin. Oxygen 2 L by nasal cannula." },
      { heading: "Status", body: "Still admitted. Expected discharge in 2 to 3 days." },
    ],
  },
  Sinusitis: {
    recommendations: [{ kind: "next", label: "Acknowledge", value: "No action unless symptoms persist past 10 days" }],
    risks: [{ tone: "neutral", strong: "Low risk", text: "uncomplicated urgent care visit" }],
    note: [
      { heading: "Assessment", body: "Acute viral rhinosinusitis, 4 days of symptoms." },
      { heading: "Plan", body: "Saline irrigation, fluticasone nasal spray. No antibiotics." },
    ],
  },
}

function visitInsight(item: QueueItem, v: OutsideCare): Insight {
  const notes = VISIT_NOTES[v.reason] ?? { recommendations: [], risks: [] }
  return {
    title: "AI visit summary",
    glance: [],
    situation: [
      { text: `${v.event} for ${v.reason.toLowerCase()} at ${v.facility}`, tone: "warn" as Tone },
      ...(VISIT_NOTES[v.reason]?.note ?? []).slice(1, 3).map((n) => ({ text: n.body, tone: "neutral" as Tone })),
    ],
    recommendations: notes.recommendations,
    risks: notes.risks,
  }
}

function visitReport(item: QueueItem, v: OutsideCare, p: Patient): Report {
  return {
    title: `${v.event} summary`,
    meta: [
      ["Patient", who(p)],
      ["Facility", v.facility],
      ["Date", fmtDate(v.date)],
      ["Source", item.source],
    ],
    sections: VISIT_NOTES[v.reason]?.note ?? [{ heading: "Reason", body: v.reason }],
  }
}

/* --------------------------------------------------------- care gaps -- */

const GAP_NOTES: Record<string, Notes & { guideline: string }> = {
  "Cervical cancer screening": {
    guideline: "USPSTF: HPV testing every 5 years or cytology every 3 years, ages 30 to 65.",
    recommendations: [{ kind: "schedule", label: "Book", value: "Pap and HPV co-test at the next visit" }],
    risks: [{ tone: "warn", strong: "7 months late", text: "last done 03/2023" }],
  },
  "Pneumococcal vaccine": {
    guideline: "CDC: one dose of PCV20 or PCV21 for adults 65 and older.",
    recommendations: [{ kind: "next", label: "Give", value: "PCV20 at the next visit or pharmacy" }],
    risks: [{ tone: "warn", strong: "Age 77, CKD", text: "higher risk of invasive disease" }],
  },
  "Colorectal cancer screening": {
    guideline: "USPSTF: screening for adults 45 to 75.",
    recommendations: [{ kind: "message", label: "Offer", value: "FIT kit by mail or colonoscopy referral" }],
    risks: [{ tone: "warn", strong: "Never screened", text: "age 51" }],
  },
  "Shingles vaccine": {
    guideline: "CDC: two doses of recombinant zoster vaccine for adults 50 and older.",
    recommendations: [{ kind: "message", label: "Remind", value: "Pharmacy, 2 doses 2 to 6 months apart" }],
    risks: [{ tone: "neutral", strong: "Not started", text: "no doses on record" }],
  },
  "Screening mammogram": {
    guideline: "USPSTF: biennial screening mammography for women aged 40 to 74.",
    recommendations: [
      { kind: "schedule", label: "Order", value: "Screening mammogram at the next visit" },
      { kind: "message", label: "Patient", value: "Send self-scheduling link" },
    ],
    risks: [{ tone: "warn", strong: "Over a year late", text: "last done 07/2024" }],
  },
  "Diabetes follow-up visit": {
    guideline: "ADA: visit every 3 months when A1c is above goal.",
    recommendations: [{ kind: "schedule", label: "Book", value: "Diabetes visit within 2 weeks" }],
    risks: [{ tone: "warn", strong: "A1c 7.6", text: "rising, above goal" }],
  },
  "HbA1c over 7 and no visit in 3 months": {
    guideline: "Practice rule: A1c over 7% with no visit in 3 months.",
    recommendations: [{ kind: "schedule", label: "Book", value: "Combine with the diabetes follow-up gap" }],
    risks: [{ tone: "warn", strong: "Same patient, 2 gaps", text: "one visit closes both" }],
  },
  "Influenza vaccine 2026-27": {
    guideline: "CDC: annual influenza vaccine for everyone 6 months and older.",
    recommendations: [{ kind: "message", label: "Remind", value: "Pharmacy or next visit, record when given" }],
    risks: [{ tone: "neutral", strong: "Seasonal", text: "best given by the end of October" }],
  },
}

function gapInsight(item: QueueItem, g: CareGap): Insight {
  const notes = GAP_NOTES[g.gap] ?? { recommendations: [], risks: [] }
  const late = gapDaysLate(g)
  return {
    title: "AI care gap summary",
    glance: [
      { label: "Overdue by", value: late > 0 ? span(late) : "Due today", tone: late > 30 ? "bad" : "warn" },
      { label: "Since last done", value: g.lastDone ? span(daysSince(g.lastDone)) : "Never done", tone: "neutral" },
    ],
    situation: [
      { text: notes.guideline ?? "Practice rule", tone: "info" },
      { text: g.remindersSent ? `${g.remindersSent} ${g.remindersSent === 1 ? "reminder" : "reminders"} sent, not yet done` : "No reminder sent yet", tone: "warn" },
    ],
    recommendations: notes.recommendations,
    risks: notes.risks,
  }
}

function gapReport(item: QueueItem, g: CareGap, p: Patient): Report {
  return {
    title: `Care gap: ${g.gap}`,
    meta: [
      ["Patient", who(p)],
      ["Type", g.gapType],
      ["Due", fmtDate(g.due)],
      ["Detected by", item.source],
    ],
    table: g.lastDone
      ? { columns: ["Date", "Event"], rows: [{ cells: [fmtDate(g.lastDone), "Last completed"] }, { cells: [fmtDate(g.due), "Due"], flag: true }] }
      : undefined,
    sections: [{ heading: "Guideline", body: GAP_NOTES[g.gap]?.guideline ?? "Practice rule." }],
  }
}

/* ----------------------------------------------------------- reviews -- */

const REVIEW_NOTES: Record<ReviewDue["review"], Notes & { body: { heading: string; body: string }[] }> = {
  "Initial record validation": {
    recommendations: [
      { kind: "next", label: "Validate", value: "Confirm problems, medications and allergies" },
      { kind: "followup", label: "Then", value: "Release the record to the patient app" },
    ],
    risks: [{ tone: "warn", strong: "2 duplicate problems", text: "type 2 diabetes listed twice" }],
    body: [
      { heading: "Imported", body: "6 conditions, 9 medications, 1 allergy, 48 lab results, 12 encounters from 3 networks." },
      { heading: "Needs a look", body: "Duplicate diabetes entries. Metformin listed at two doses. Allergy reaction not recorded." },
    ],
  },
  "Quarterly review": {
    recommendations: [{ kind: "schedule", label: "Review", value: "Plan progress and labs before 10/12" }],
    risks: [{ tone: "warn", strong: "3 open items", text: "results, medications and an overdue order" }],
    body: [
      { heading: "Since the last review", body: "New results, medication changes and overdue orders from the record, with weight, blood pressure and plan adherence trends." },
    ],
  },
  "Intake summary": {
    recommendations: [{ kind: "next", label: "Review", value: "Read the AI intake and confirm the history" }],
    risks: [{ tone: "neutral", strong: "PHQ-9 item 9 negative", text: "no safety concern flagged" }],
    body: [
      { heading: "Goals", body: "Better sleep, more energy, lose 5 kg." },
      { heading: "Screening", body: "PHQ-9 7, GAD-7 5. Alcohol 4 drinks per week. Non smoker." },
    ],
  },
}

function reviewInsight(item: QueueItem, r: ReviewDue): Insight {
  const notes = REVIEW_NOTES[r.review]
  const left = -daysSince(r.due)
  return {
    title: "AI review summary",
    glance: [
      { label: "Due", value: left > 0 ? `In ${left} ${left === 1 ? "day" : "days"}` : left === 0 ? "Today" : `${-left} days late`, tone: left <= 0 ? "bad" : "neutral" },
    ],
    situation: notes.body.map((b) => ({ text: `${b.heading}: ${b.body}`, tone: "neutral" as Tone })),
    recommendations: notes.recommendations,
    risks: notes.risks,
  }
}

/* ------------------------------------------------------------- entry -- */

export function insightFor(item: QueueItem): Insight {
  switch (item.type) {
    case "abnormal_result":
      return resultInsight(item, item.payload)
    case "medication_change":
      return medicationInsight(item, item.payload)
    case "overdue_order":
      return orderInsight(item, item.payload)
    case "outside_care":
      return visitInsight(item, item.payload)
    case "care_gap":
      return gapInsight(item, item.payload)
    case "review_due":
      return reviewInsight(item, item.payload)
  }
}

export function reportFor(item: QueueItem, patient: Patient): Report {
  switch (item.type) {
    case "abnormal_result":
      return resultReport(item, item.payload, patient)
    case "medication_change":
      return medicationReport(item, item.payload, patient)
    case "overdue_order":
      return orderReport(item, item.payload, patient)
    case "outside_care":
      return visitReport(item, item.payload, patient)
    case "care_gap":
      return gapReport(item, item.payload, patient)
    case "review_due":
      return {
        title: item.payload.review,
        meta: [
          ["Patient", who(patient)],
          ["Due", fmtDate(item.payload.due)],
          ["Prepared by", item.source],
        ],
        sections: REVIEW_NOTES[item.payload.review].body,
      }
  }
}

/* ------------------------------------------------------------ papers -- */

/** Which of the chart's papers draws the item's full report. */
export type PaperSpec =
  | { kind: "lab"; report: LabReport }
  | { kind: "imaging"; doc: ChartDocument }
  | {
      kind: "report"
      sourceId: string
      title: string
      id: string
      date: string
      box: { title: string; rows: [string, string][] }
      table?: { title: string; head: string[]; rows: string[][] }
      sections: { heading: string; text: string }[]
      signer?: { name: string; credential: string }
    }

const SOURCE_ID: Record<string, string> = {
  "Quest Diagnostics": "SRC-QUEST",
  "Scripps Health (Epic)": "SRC-EPIC",
  "UC San Diego Health (Epic)": "SRC-UCSD",
  "Henry Ford Health (Epic)": "SRC-HFH",
}
const sourceIdOf = (source: string) => SOURCE_ID[source] ?? "SRC-PRACTICE"

const PAPER_TITLE: Record<QueueItem["type"], string> = {
  abnormal_result: "Diagnostic report",
  medication_change: "Medication history",
  overdue_order: "Order requisition",
  outside_care: "Encounter summary",
  care_gap: "Care gap notice",
  review_due: "Review summary",
}

const SIGNER: Record<string, { name: string; credential: string }> = {
  ECG: { name: "Dr. Kevin Alvarez", credential: "MD, Cardiology" },
  "Home sleep apnea test": { name: "Dr. Naomi Fischer", credential: "MD, Sleep Medicine" },
  Palpitations: { name: "Dr. Rachel Moreno", credential: "MD, Emergency Medicine" },
  "Community-acquired pneumonia": { name: "Dr. Maria Silva", credential: "MD, Hospital Medicine" },
  Sinusitis: { name: "Jordan Lee", credential: "PA-C" },
}

export function paperFor(item: QueueItem, patient: Patient): PaperSpec {
  const sourceId = sourceIdOf(item.source)
  const id = `${item.id}-${item.createdAt.slice(2, 10).replaceAll("-", "")}`
  const date = item.createdAt.slice(0, 10)

  if (item.type === "abnormal_result") {
    const r = item.payload
    if (r.kind === "lab") {
      const report = reportFor(item, patient)
      const history = r.history ?? []
      const main = r.name === "Lipoprotein(a)" ? "Lipoprotein(a)" : r.name === "Hemoglobin A1c" ? "Hemoglobin A1c" : r.name
      return {
        kind: "lab",
        report: {
          id,
          name: report.title,
          date: r.resultedAt,
          accession: `${sourceId === "SRC-QUEST" ? "QCB" : "ACC"}${r.resultedAt.replaceAll("-", "").slice(2)}${item.id.slice(1)}`,
          orderedBy: "Daniel Reyes, MD",
          status: "Final",
          sourceId,
          results: (report.table?.rows ?? []).map(({ cells: [name, value, unit, range, flag] }) => {
            const isMain = name === main
            const prev = isMain && history.length > 1 ? history[history.length - 2] : undefined
            return {
              name: name!,
              loinc: "",
              value: Number(value),
              unit: unit ?? "",
              range: range ?? "",
              flag: flag === "H" ? ("High" as const) : flag === "L" ? ("Low" as const) : ("" as const),
              history: isMain && history.length ? history.map((h) => h.value) : [Number(value)],
              previous: prev ? { value: prev.value, date: prev.date } : undefined,
            }
          }),
        },
      }
    }
    if (r.name === "Mammogram") {
      return {
        kind: "imaging",
        doc: {
          id,
          title: "Mammogram",
          format: "PDF",
          kind: "imaging",
          study: "mammogram",
          date: r.resultedAt,
          author: "Dr. Laura Bennett",
          sourceId,
          sections: [
            { heading: "Clinical history", text: "Annual screening. No palpable abnormality." },
            ...(REPORT_TEXT.Mammogram ?? [])
              .filter((x) => x.heading !== "Technique")
              .map((x) => ({ heading: x.heading, text: x.body })),
          ],
        },
      }
    }
  }

  const report = reportFor(item, patient)
  const reason = item.type === "outside_care" ? item.payload.reason : item.type === "abnormal_result" ? item.payload.name : ""
  return {
    kind: "report",
    sourceId,
    title:
      item.type === "medication_change"
        ? item.payload.change === "patient_report"
          ? "Patient check-in"
          : "Medication list"
        : PAPER_TITLE[item.type],
    id,
    date,
    box: { title: report.title, rows: report.meta.filter(([k]) => k !== "Patient") },
    table: report.table && {
      title: item.type === "overdue_order" ? "Reminder log" : item.type === "medication_change" ? `${item.payload.medication} entries by source` : "History",
      head: report.table.columns,
      rows: report.table.rows.map((r) => r.cells),
    },
    sections: report.sections.map((x) => ({ heading: x.heading, text: x.body })),
    signer:
      SIGNER[reason] ??
      (item.type === "overdue_order"
        ? { name: item.payload.orderedBy.replace(/, MD$/, ""), credential: "MD" }
        : undefined),
  }
}
