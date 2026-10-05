"use client"

import { createCollection } from "@/components/practice/collection-store"
import type { AuditEntry, FlowDay, ItemType, WorkItem } from "@/components/provider/home-v2/types"

/* The sample queue at the mock clock (clock.ts): thirty items across the
   practice's panel, every one naming a patient in practice-data.ts. The
   provider's last visit was 10/02/2026 at 6:10 PM, so an item created later
   that evening is new. Orders and care gaps are not in the Health Gorilla
   feed yet, so they are sample rows on the practice store like the rest. */

const PRACTICE_EHR = "Practice EHR"
const QUEST = "Quest Diagnostics"
const UCSD = "UC San Diego Health (Epic)"
const SCRIPPS = "Scripps Health (Epic)"
const HENRY_FORD = "Henry Ford Health (Epic)"
const PATIENT_APP = "Patient (Inlay app)"
const RULES = "Rules"

const HARRINGTON = "Elise Harrington, MD"
const REYES = "Daniel Reyes, MD"

export const WORK_ITEMS: WorkItem[] = [
  /* ------------------------------------------------- abnormal results -- */
  {
    id: "W01", type: "abnormal_result", patientId: "P10240", createdAt: "2026-09-27T16:10:00",
    source: UCSD, isOutsideSource: true, status: "open",
    payload: {
      kind: "lab", name: "Potassium", value: "5.8", unit: "mmol/L", flag: "H",
      range: "3.5-5.1", refLow: 3.5, refHigh: 5.1, previous: "4.4", resultedAt: "2026-09-27",
      history: [
        { date: "2025-03-12", value: 4.2, source: QUEST },
        { date: "2025-09-18", value: 4.4, source: QUEST },
        { date: "2026-03-20", value: 4.1, source: QUEST },
        { date: "2026-09-18", value: 4.4, source: QUEST },
        { date: "2026-09-27", value: 5.8, source: UCSD },
      ],
    },
  },
  {
    id: "W02", type: "abnormal_result", patientId: "P10422", createdAt: "2026-10-02T19:05:00",
    source: SCRIPPS, isOutsideSource: true, status: "open",
    payload: { kind: "report", name: "Mammogram", value: "BI-RADS 4", flag: "Abnormal", resultedAt: "2026-10-02", redFlag: "abnormal_ct_mri" },
  },
  {
    id: "W03", type: "abnormal_result", patientId: "P10411", createdAt: "2026-10-01T08:15:00",
    source: QUEST, isOutsideSource: false, status: "open",
    payload: {
      kind: "lab", name: "Hemoglobin A1c", value: "7.6", unit: "%", flag: "H",
      range: "4.0-5.6", refLow: 4.0, refHigh: 5.6, previous: "7.1", resultedAt: "2026-10-01",
      history: [
        { date: "2025-04-10", value: 6.8, source: QUEST },
        { date: "2025-10-14", value: 7.0, source: QUEST },
        { date: "2026-05-20", value: 7.1, source: QUEST },
        { date: "2026-10-01", value: 7.6, source: QUEST },
      ],
    },
  },
  {
    id: "W04", type: "abnormal_result", patientId: "P10433", createdAt: "2026-10-02T07:30:00",
    source: PRACTICE_EHR, isOutsideSource: false, status: "open",
    payload: {
      kind: "lab", name: "eGFR", value: "41", unit: "mL/min/1.73m²", flag: "L",
      range: "≥60", refLow: 60, previous: "48", resultedAt: "2026-10-02",
      history: [
        { date: "2025-02-11", value: 58, source: PRACTICE_EHR },
        { date: "2025-08-19", value: 55, source: PRACTICE_EHR },
        { date: "2026-03-03", value: 48, source: PRACTICE_EHR },
        { date: "2026-10-02", value: 41, source: PRACTICE_EHR },
      ],
    },
  },
  {
    id: "W05", type: "abnormal_result", patientId: "P10240", createdAt: "2026-09-18T09:40:00",
    source: QUEST, isOutsideSource: false, status: "open",
    payload: {
      kind: "lab", name: "Hemoglobin A1c", value: "6.1", unit: "%", flag: "H",
      range: "4.0-5.6", refLow: 4.0, refHigh: 5.6, previous: "5.8", resultedAt: "2026-09-18",
      history: [
        { date: "2024-09-12", value: 5.5, source: QUEST },
        { date: "2025-03-14", value: 5.6, source: QUEST },
        { date: "2025-09-18", value: 5.8, source: QUEST },
        { date: "2026-09-18", value: 6.1, source: QUEST },
      ],
    },
  },
  {
    id: "W06", type: "abnormal_result", patientId: "P10318", createdAt: "2026-08-05T10:00:00",
    source: PRACTICE_EHR, isOutsideSource: false, status: "reviewed",
    payload: {
      kind: "lab", name: "Lipoprotein(a)", value: "80", unit: "nmol/L", flag: "H",
      range: "<75", refHigh: 75, previous: "76", resultedAt: "2026-08-05",
      history: [
        { date: "2025-08-01", value: 76, source: PRACTICE_EHR },
        { date: "2026-08-05", value: 80, source: PRACTICE_EHR },
      ],
    },
  },
  {
    id: "W27", type: "abnormal_result", patientId: "P10240", createdAt: "2026-09-27T15:05:00",
    source: UCSD, isOutsideSource: true, status: "open",
    payload: { kind: "report", name: "ECG", value: "Sinus tachycardia with frequent PVCs", flag: "Abnormal", resultedAt: "2026-09-27" },
  },
  {
    id: "W29", type: "abnormal_result", patientId: "P10318", createdAt: "2026-06-04T12:00:00",
    source: "Home sleep test (uploaded)", isOutsideSource: true, status: "open",
    payload: { kind: "report", name: "Home sleep apnea test", value: "Mild obstructive sleep apnea · AHI 5.3 · O₂ nadir 85%", flag: "Abnormal", resultedAt: "2026-06-04" },
  },

  /* ------------------------------------------------ medication changes -- */
  {
    id: "W07", type: "medication_change", patientId: "P10240", createdAt: "2026-09-10T11:00:00",
    source: SCRIPPS, isOutsideSource: true, status: "open",
    payload: { medication: "Atorvastatin", change: "dose", practiceEntry: "10 mg daily", otherEntry: "20 mg daily", changedBy: "Dr. Alan Jones", date: "2026-09-10" },
  },
  {
    id: "W08", type: "medication_change", patientId: "P10240", createdAt: "2026-09-27T16:45:00",
    source: UCSD, isOutsideSource: true, status: "open",
    payload: { medication: "Metoprolol tartrate", change: "not_on_list", otherEntry: "25 mg twice daily", changedBy: "UC San Diego Health ED", date: "2026-09-27" },
  },
  {
    id: "W09", type: "medication_change", patientId: "P10240", createdAt: "2026-09-30T20:10:00",
    source: PATIENT_APP, isOutsideSource: false, status: "open",
    payload: { medication: "Vitamin D3", change: "patient_report", practiceEntry: "2,000 IU daily", patientSays: "Not taking", date: "2026-09-30" },
  },
  {
    id: "W10", type: "medication_change", patientId: "P10318", createdAt: "2025-10-25T09:00:00",
    source: HENRY_FORD, isOutsideSource: true, status: "open",
    payload: { medication: "Atorvastatin", change: "dose", practiceEntry: "10 mg daily", otherEntry: "15 mg daily", changedBy: "Dr. Jones", date: "2025-10-25" },
  },
  {
    id: "W12", type: "medication_change", patientId: "P10477", createdAt: "2026-10-02T19:40:00",
    source: HENRY_FORD, isOutsideSource: true, status: "open",
    payload: { medication: "Warfarin", change: "stopped", practiceEntry: "5 mg daily", changedBy: "Dr. Maria Silva", date: "2026-10-02" },
  },

  /* ---------------------------------------------------- overdue orders -- */
  {
    id: "W13", type: "overdue_order", patientId: "P10240", createdAt: "2026-09-23T06:00:00",
    source: PRACTICE_EHR, isOutsideSource: false, status: "open",
    payload: { order: "Lipid panel", orderedBy: HARRINGTON, orderedAt: "2026-08-12", stage: "not_scheduled", remindersSent: 3, remindersMax: 3, reminderDates: ["2026-08-26", "2026-09-09", "2026-09-23"] },
  },
  {
    id: "W14", type: "overdue_order", patientId: "P10318", createdAt: "2026-07-22T06:00:00",
    source: PRACTICE_EHR, isOutsideSource: false, status: "open",
    payload: { order: "Sleep medicine referral", orderedBy: REYES, orderedAt: "2026-06-10", stage: "not_scheduled", remindersSent: 3, remindersMax: 3, reminderDates: ["2026-06-24", "2026-07-08", "2026-07-22"] },
  },
  {
    id: "W15", type: "overdue_order", patientId: "P10433", createdAt: "2026-09-17T06:00:00",
    source: PRACTICE_EHR, isOutsideSource: false, status: "open",
    payload: { order: "CT chest follow-up (nodule)", orderedBy: REYES, orderedAt: "2026-07-15", scheduledAt: "2026-08-20", stage: "scheduled_not_completed", remindersSent: 3, remindersMax: 3, reminderDates: ["2026-08-27", "2026-09-03", "2026-09-17"] },
  },

  /* ------------------------------------------------------ outside care -- */
  {
    id: "W16", type: "outside_care", patientId: "P10240", createdAt: "2026-09-27T13:50:00",
    source: UCSD, isOutsideSource: true, status: "open",
    payload: { event: "ED visit", facility: "UC San Diego Health Hillcrest", reason: "Palpitations", date: "2026-09-27" },
  },
  {
    id: "W17", type: "outside_care", patientId: "P10477", createdAt: "2026-10-01T04:30:00",
    source: "ADT feed", isOutsideSource: true, status: "open",
    payload: { event: "Admission", facility: "Henry Ford Hospital", reason: "Community-acquired pneumonia", date: "2026-10-01" },
  },
  {
    id: "W18", type: "outside_care", patientId: "P10444", createdAt: "2026-09-29T17:20:00",
    source: "Encounter", isOutsideSource: true, status: "open",
    payload: { event: "Urgent care", facility: "MinuteClinic", reason: "Sinusitis", date: "2026-09-29" },
  },

  /* --------------------------------------------------------- care gaps -- */
  {
    id: "W19", type: "care_gap", patientId: "P10240", createdAt: "2025-07-15T06:00:00",
    source: RULES, isOutsideSource: false, status: "open",
    payload: { gap: "Screening mammogram", gapType: "Preventive", lastDone: "2024-07-15", due: "2025-07-15", remindersSent: 2 },
  },
  {
    id: "W20", type: "care_gap", patientId: "P10411", createdAt: "2026-08-20T06:00:00",
    source: RULES, isOutsideSource: false, status: "open",
    payload: { gap: "Diabetes follow-up visit", gapType: "Follow-up", lastDone: "2026-05-20", due: "2026-08-20", remindersSent: 1 },
  },
  {
    id: "W21", type: "care_gap", patientId: "P10411", createdAt: "2026-10-01T06:00:00",
    source: RULES, isOutsideSource: false, status: "open",
    payload: { gap: "HbA1c over 7 and no visit in 3 months", gapType: "Clinical", lastDone: "2026-05-20", due: "2026-10-01", remindersSent: 0 },
  },
  {
    id: "W22", type: "care_gap", patientId: "P10455", createdAt: "2026-10-01T06:00:00",
    source: RULES, isOutsideSource: false, status: "open",
    payload: { gap: "Influenza vaccine 2026-27", gapType: "Preventive", lastDone: "2025-10-12", due: "2026-10-01", remindersSent: 0 },
  },
  {
    id: "W28", type: "care_gap", patientId: "P10240", createdAt: "2026-10-01T06:00:00",
    source: RULES, isOutsideSource: false, status: "open",
    payload: { gap: "Influenza vaccine 2026-27", gapType: "Preventive", lastDone: "2025-10-14", due: "2026-10-01", remindersSent: 0 },
  },
  {
    id: "W30", type: "care_gap", patientId: "P10318", createdAt: "2026-10-01T06:00:00",
    source: RULES, isOutsideSource: false, status: "open",
    payload: { gap: "Influenza vaccine 2026-27", gapType: "Preventive", lastDone: "2025-10-10", due: "2026-10-01", remindersSent: 0 },
  },

  /* ------------------------------------------------------- reviews due -- */
  {
    id: "W23", type: "review_due", patientId: "P10318", createdAt: "2026-09-28T06:00:00",
    source: RULES, isOutsideSource: false, status: "open",
    payload: { review: "Quarterly review", due: "2026-10-12", lastReview: "2026-08-12" },
  },
  {
    id: "W24", type: "review_due", patientId: "P10422", createdAt: "2026-10-01T15:00:00",
    source: "AI plan", isOutsideSource: false, status: "open",
    payload: { review: "Optimization plan approval", due: "2026-10-03" },
  },
  {
    id: "W25", type: "review_due", patientId: "P10455", createdAt: "2026-10-02T20:15:00",
    source: "AI intake", isOutsideSource: false, status: "open",
    payload: { review: "Intake summary", due: "2026-10-05" },
  },
  {
    id: "W26", type: "review_due", patientId: "P10411", createdAt: "2026-10-02T21:00:00",
    source: "Record", isOutsideSource: false, status: "open",
    payload: { review: "Initial record validation", due: "2026-10-03" },
  },
  /* ------------------------- more of Dr. Reyes's queue, ten per tab -- */
  {
    id: "W31", type: "abnormal_result", patientId: "P10318", createdAt: "2026-09-30T08:20:00",
    source: QUEST, isOutsideSource: false, status: "open",
    payload: {
      kind: "lab", name: "LDL cholesterol", value: "162", unit: "mg/dL", flag: "H",
      range: "<100", refHigh: 100, previous: "131", resultedAt: "2026-09-30",
      history: [
        { date: "2025-08-01", value: 118, source: QUEST },
        { date: "2026-02-10", value: 124, source: QUEST },
        { date: "2026-08-05", value: 131, source: QUEST },
        { date: "2026-09-30", value: 162, source: QUEST },
      ],
    },
  },
  {
    id: "W32", type: "abnormal_result", patientId: "P10422", createdAt: "2026-09-29T09:10:00",
    source: QUEST, isOutsideSource: false, status: "open",
    payload: {
      kind: "lab", name: "Vitamin D, 25-OH", value: "18", unit: "ng/mL", flag: "L",
      range: "30-100", refLow: 30, refHigh: 100, previous: "24", resultedAt: "2026-09-29",
      history: [
        { date: "2025-09-20", value: 27, source: QUEST },
        { date: "2026-03-18", value: 24, source: QUEST },
        { date: "2026-09-29", value: 18, source: QUEST },
      ],
    },
  },
  {
    id: "W33", type: "abnormal_result", patientId: "P10455", createdAt: "2026-10-02T19:30:00",
    source: QUEST, isOutsideSource: false, status: "open",
    payload: {
      kind: "lab", name: "TSH", value: "6.8", unit: "mIU/L", flag: "H",
      range: "0.4-4.5", refLow: 0.4, refHigh: 4.5, previous: "3.9", resultedAt: "2026-10-02",
      history: [
        { date: "2025-10-01", value: 3.1, source: QUEST },
        { date: "2026-04-02", value: 3.9, source: QUEST },
        { date: "2026-10-02", value: 6.8, source: QUEST },
      ],
    },
  },
  {
    id: "W34", type: "abnormal_result", patientId: "P10411", createdAt: "2026-09-26T10:00:00",
    source: PRACTICE_EHR, isOutsideSource: false, status: "open",
    payload: {
      kind: "lab", name: "ALT", value: "72", unit: "U/L", flag: "H",
      range: "7-56", refLow: 7, refHigh: 56, previous: "48", resultedAt: "2026-09-26",
      history: [
        { date: "2025-10-14", value: 41, source: QUEST },
        { date: "2026-05-20", value: 48, source: QUEST },
        { date: "2026-09-26", value: 72, source: PRACTICE_EHR },
      ],
    },
  },
  {
    id: "W35", type: "abnormal_result", patientId: "P10433", createdAt: "2026-10-02T07:35:00",
    source: PRACTICE_EHR, isOutsideSource: false, status: "open",
    payload: {
      kind: "lab", name: "Hemoglobin", value: "10.9", unit: "g/dL", flag: "L",
      range: "13.2-16.6", refLow: 13.2, refHigh: 16.6, previous: "12.1", resultedAt: "2026-10-02",
      history: [
        { date: "2025-08-19", value: 13.4, source: PRACTICE_EHR },
        { date: "2026-03-03", value: 12.1, source: PRACTICE_EHR },
        { date: "2026-10-02", value: 10.9, source: PRACTICE_EHR },
      ],
    },
  },
  {
    id: "W37", type: "medication_change", patientId: "P10411", createdAt: "2026-09-22T11:30:00",
    source: SCRIPPS, isOutsideSource: true, status: "open",
    payload: { medication: "Metformin", change: "dose", practiceEntry: "500 mg twice daily", otherEntry: "1,000 mg twice daily", changedBy: "Dr. Alan Jones", date: "2026-09-22" },
  },
  {
    id: "W38", type: "medication_change", patientId: "P10411", createdAt: "2026-09-22T11:35:00",
    source: SCRIPPS, isOutsideSource: true, status: "open",
    payload: { medication: "Empagliflozin", change: "not_on_list", otherEntry: "10 mg daily", changedBy: "Dr. Alan Jones", date: "2026-09-22" },
  },
  {
    id: "W39", type: "medication_change", patientId: "P10422", createdAt: "2026-10-02T20:40:00",
    source: PATIENT_APP, isOutsideSource: false, status: "open",
    payload: { medication: "Sertraline", change: "patient_report", practiceEntry: "50 mg daily", patientSays: "Not taking", patientNote: "Stopped 3 weeks ago, nausea", date: "2026-10-02" },
  },
  {
    id: "W40", type: "medication_change", patientId: "P10433", createdAt: "2026-09-25T15:00:00",
    source: UCSD, isOutsideSource: true, status: "open",
    payload: { medication: "Lisinopril", change: "stopped", practiceEntry: "20 mg daily", changedBy: "Dr. Kim Patel", date: "2026-09-25" },
  },
  {
    id: "W41", type: "medication_change", patientId: "P10433", createdAt: "2026-09-25T15:05:00",
    source: UCSD, isOutsideSource: true, status: "open",
    payload: { medication: "Furosemide", change: "not_on_list", otherEntry: "20 mg daily", changedBy: "Dr. Kim Patel", date: "2026-09-25" },
  },
  {
    id: "W42", type: "medication_change", patientId: "P10455", createdAt: "2026-09-28T19:00:00",
    source: PATIENT_APP, isOutsideSource: false, status: "open",
    payload: { medication: "Levothyroxine", change: "patient_report", practiceEntry: "50 mcg daily", patientSays: "Taking differently", patientNote: "Skips weekends", date: "2026-09-28" },
  },
  {
    id: "W43", type: "medication_change", patientId: "P10455", createdAt: "2026-09-18T10:20:00",
    source: SCRIPPS, isOutsideSource: true, status: "open",
    payload: { medication: "Omeprazole", change: "not_on_list", otherEntry: "20 mg daily", changedBy: "Dr. Priya Shah", date: "2026-09-18" },
  },
  {
    id: "W44", type: "medication_change", patientId: "P10422", createdAt: "2026-09-12T09:00:00",
    source: SCRIPPS, isOutsideSource: true, status: "open",
    payload: { medication: "Atorvastatin", change: "dose", practiceEntry: "10 mg daily", otherEntry: "20 mg daily", changedBy: "Dr. Alan Jones", date: "2026-09-12" },
  },
  {
    id: "W45", type: "overdue_order", patientId: "P10411", createdAt: "2026-08-12T06:00:00",
    source: PRACTICE_EHR, isOutsideSource: false, status: "open",
    payload: { order: "Diabetic eye exam", orderedBy: REYES, orderedAt: "2026-07-01", stage: "not_scheduled", remindersSent: 3, remindersMax: 3, reminderDates: ["2026-07-15", "2026-07-29", "2026-08-12"] },
  },
  {
    id: "W46", type: "overdue_order", patientId: "P10411", createdAt: "2026-08-01T06:00:00",
    source: PRACTICE_EHR, isOutsideSource: false, status: "open",
    payload: { order: "Urine albumin to creatinine ratio", orderedBy: REYES, orderedAt: "2026-06-20", stage: "not_scheduled", remindersSent: 3, remindersMax: 3, reminderDates: ["2026-07-04", "2026-07-18", "2026-08-01"] },
  },
  {
    id: "W48", type: "overdue_order", patientId: "P10422", createdAt: "2026-06-23T06:00:00",
    source: PRACTICE_EHR, isOutsideSource: false, status: "open",
    payload: { order: "DEXA scan", orderedBy: REYES, orderedAt: "2026-05-12", stage: "not_scheduled", remindersSent: 3, remindersMax: 3, reminderDates: ["2026-05-26", "2026-06-09", "2026-06-23"] },
  },
  {
    id: "W49", type: "overdue_order", patientId: "P10433", createdAt: "2026-08-19T06:00:00",
    source: PRACTICE_EHR, isOutsideSource: false, status: "open",
    payload: { order: "Renal ultrasound", orderedBy: REYES, orderedAt: "2026-07-08", stage: "not_scheduled", remindersSent: 3, remindersMax: 3, reminderDates: ["2026-07-22", "2026-08-05", "2026-08-19"] },
  },
  {
    id: "W50", type: "overdue_order", patientId: "P10455", createdAt: "2026-09-12T06:00:00",
    source: PRACTICE_EHR, isOutsideSource: false, status: "open",
    payload: { order: "Thyroid ultrasound", orderedBy: REYES, orderedAt: "2026-08-01", stage: "not_scheduled", remindersSent: 3, remindersMax: 3, reminderDates: ["2026-08-15", "2026-08-29", "2026-09-12"] },
  },
  {
    id: "W51", type: "overdue_order", patientId: "P10455", createdAt: "2026-08-27T06:00:00",
    source: PRACTICE_EHR, isOutsideSource: false, status: "open",
    payload: { order: "Coronary calcium score", orderedBy: REYES, orderedAt: "2026-06-15", scheduledAt: "2026-07-30", stage: "scheduled_not_completed", remindersSent: 3, remindersMax: 3, reminderDates: ["2026-08-06", "2026-08-13", "2026-08-27"] },
  },
  {
    id: "W52", type: "overdue_order", patientId: "P10318", createdAt: "2026-05-22T06:00:00",
    source: PRACTICE_EHR, isOutsideSource: false, status: "open",
    payload: { order: "Colonoscopy", orderedBy: REYES, orderedAt: "2026-04-10", stage: "not_scheduled", remindersSent: 3, remindersMax: 3, reminderDates: ["2026-04-24", "2026-05-08", "2026-05-22"] },
  },
  {
    id: "W53", type: "care_gap", patientId: "P10422", createdAt: "2026-03-10T06:00:00",
    source: RULES, isOutsideSource: false, status: "open",
    payload: { gap: "Cervical cancer screening", gapType: "Preventive", lastDone: "2023-03-10", due: "2026-03-10", remindersSent: 2 },
  },
  {
    id: "W54", type: "care_gap", patientId: "P10433", createdAt: "2026-07-01T06:00:00",
    source: RULES, isOutsideSource: false, status: "open",
    payload: { gap: "Pneumococcal vaccine", gapType: "Preventive", due: "2026-07-01", remindersSent: 1 },
  },
  {
    id: "W55", type: "care_gap", patientId: "P10433", createdAt: "2026-10-01T06:00:00",
    source: RULES, isOutsideSource: false, status: "open",
    payload: { gap: "Influenza vaccine 2026-27", gapType: "Preventive", lastDone: "2025-10-08", due: "2026-10-01", remindersSent: 0 },
  },
  {
    id: "W57", type: "care_gap", patientId: "P10318", createdAt: "2026-06-01T06:00:00",
    source: RULES, isOutsideSource: false, status: "open",
    payload: { gap: "Shingles vaccine", gapType: "Preventive", due: "2026-06-01", remindersSent: 1 },
  },
  {
    id: "W58", type: "care_gap", patientId: "P10422", createdAt: "2026-10-01T06:00:00",
    source: RULES, isOutsideSource: false, status: "open",
    payload: { gap: "Influenza vaccine 2026-27", gapType: "Preventive", lastDone: "2025-10-20", due: "2026-10-01", remindersSent: 0 },
  },
  {
    id: "W60", type: "review_due", patientId: "P10411", createdAt: "2026-10-01T06:00:00",
    source: RULES, isOutsideSource: false, status: "open",
    payload: { review: "Quarterly review", due: "2026-10-15", lastReview: "2026-07-15" },
  },
  {
    id: "W61", type: "review_due", patientId: "P10455", createdAt: "2026-10-02T16:00:00",
    source: "AI plan", isOutsideSource: false, status: "open",
    payload: { review: "Optimization plan approval", due: "2026-10-06" },
  },
  {
    id: "W62", type: "review_due", patientId: "P10318", createdAt: "2026-09-30T12:00:00",
    source: "AI plan", isOutsideSource: false, status: "open",
    payload: { review: "Optimization plan approval", due: "2026-10-09" },
  },
  {
    id: "W63", type: "review_due", patientId: "P10422", createdAt: "2026-10-01T06:00:00",
    source: RULES, isOutsideSource: false, status: "open",
    payload: { review: "Quarterly review", due: "2026-10-20", lastReview: "2026-07-20" },
  },
  {
    id: "W64", type: "review_due", patientId: "P10433", createdAt: "2026-10-02T22:00:00",
    source: "Record", isOutsideSource: false, status: "open",
    payload: { review: "Initial record validation", due: "2026-10-04" },
  },
  /* --------------------------- more open work, so the tabs differ in size -- */
  {
    id: "W65", type: "abnormal_result", patientId: "P10455", createdAt: "2026-09-27T08:40:00",
    source: QUEST, isOutsideSource: false, status: "open",
    payload: {
      kind: "lab", name: "LDL cholesterol", value: "148", unit: "mg/dL", flag: "H",
      range: "<100", refHigh: 100, previous: "133", resultedAt: "2026-09-27",
      history: [
        { date: "2025-09-15", value: 121, source: QUEST },
        { date: "2026-03-18", value: 133, source: QUEST },
        { date: "2026-09-27", value: 148, source: QUEST },
      ],
    },
  },
  {
    id: "W66", type: "abnormal_result", patientId: "P10422", createdAt: "2026-09-25T10:15:00",
    source: QUEST, isOutsideSource: false, status: "open",
    payload: {
      kind: "lab", name: "TSH", value: "5.6", unit: "mIU/L", flag: "H",
      range: "0.4-4.5", refLow: 0.4, refHigh: 4.5, previous: "4.2", resultedAt: "2026-09-25",
      history: [
        { date: "2025-09-20", value: 3.1, source: QUEST },
        { date: "2026-03-22", value: 4.2, source: QUEST },
        { date: "2026-09-25", value: 5.6, source: QUEST },
      ],
    },
  },
  {
    id: "W67", type: "abnormal_result", patientId: "P10318", createdAt: "2026-09-21T09:30:00",
    source: QUEST, isOutsideSource: false, status: "open",
    payload: {
      kind: "lab", name: "Hemoglobin A1c", value: "6.4", unit: "%", flag: "H",
      range: "4.0-5.6", refLow: 4.0, refHigh: 5.6, previous: "6.1", resultedAt: "2026-09-21",
      history: [
        { date: "2025-09-10", value: 5.9, source: QUEST },
        { date: "2026-03-12", value: 6.1, source: QUEST },
        { date: "2026-09-21", value: 6.4, source: QUEST },
      ],
    },
  },
  {
    id: "W68", type: "overdue_order", patientId: "P10433", createdAt: "2026-09-08T06:00:00",
    source: PRACTICE_EHR, isOutsideSource: false, status: "open",
    payload: { order: "Lipid panel", orderedBy: REYES, orderedAt: "2026-07-28", stage: "not_scheduled", remindersSent: 3, remindersMax: 3, reminderDates: ["2026-08-11", "2026-08-25", "2026-09-08"] },
  },
  {
    id: "W69", type: "overdue_order", patientId: "P10411", createdAt: "2026-08-18T06:00:00",
    source: PRACTICE_EHR, isOutsideSource: false, status: "open",
    payload: { order: "Coronary calcium score", orderedBy: REYES, orderedAt: "2026-06-30", scheduledAt: "2026-07-21", stage: "scheduled_not_completed", remindersSent: 3, remindersMax: 3, reminderDates: ["2026-07-28", "2026-08-04", "2026-08-18"] },
  },
  {
    id: "W70", type: "care_gap", patientId: "P10455", createdAt: "2026-04-01T06:00:00",
    source: RULES, isOutsideSource: false, status: "open",
    payload: { gap: "Shingles vaccine", gapType: "Preventive", due: "2026-04-01", remindersSent: 1 },
  },
  {
    id: "W71", type: "care_gap", patientId: "P10411", createdAt: "2026-05-15T06:00:00",
    source: RULES, isOutsideSource: false, status: "open",
    payload: { gap: "Pneumococcal vaccine", gapType: "Preventive", due: "2026-05-15", remindersSent: 1 },
  },
  {
    id: "W72", type: "care_gap", patientId: "P10433", createdAt: "2026-08-10T06:00:00",
    source: RULES, isOutsideSource: false, status: "open",
    payload: { gap: "Colorectal cancer screening", gapType: "Preventive", lastDone: "2016-08-10", due: "2026-08-10", remindersSent: 1 },
  },
  {
    id: "W73", type: "care_gap", patientId: "P10422", createdAt: "2026-09-01T06:00:00",
    source: RULES, isOutsideSource: false, status: "open",
    payload: { gap: "Shingles vaccine", gapType: "Preventive", due: "2026-09-01", remindersSent: 0 },
  },
  {
    id: "W74", type: "care_gap", patientId: "P10318", createdAt: "2026-07-20T06:00:00",
    source: RULES, isOutsideSource: false, status: "open",
    payload: { gap: "Pneumococcal vaccine", gapType: "Preventive", due: "2026-07-20", remindersSent: 1 },
  },
  {
    id: "W75", type: "care_gap", patientId: "P10455", createdAt: "2026-02-01T06:00:00",
    source: RULES, isOutsideSource: false, status: "open",
    payload: { gap: "Colorectal cancer screening", gapType: "Preventive", due: "2026-02-01", remindersSent: 2 },
  },
  {
    id: "W76", type: "review_due", patientId: "P10433", createdAt: "2026-09-24T06:00:00",
    source: RULES, isOutsideSource: false, status: "open",
    payload: { review: "Quarterly review", due: "2026-10-08", lastReview: "2026-07-08" },
  },
  {
    id: "W77", type: "review_due", patientId: "P10318", createdAt: "2026-10-02T09:00:00",
    source: "AI intake", isOutsideSource: false, status: "open",
    payload: { review: "Intake summary", due: "2026-10-07" },
  },
  {
    id: "W78", type: "review_due", patientId: "P10455", createdAt: "2026-10-01T06:00:00",
    source: RULES, isOutsideSource: false, status: "open",
    payload: { review: "Quarterly review", due: "2026-10-18", lastReview: "2026-07-18" },
  },
  {
    id: "W79", type: "review_due", patientId: "P10411", createdAt: "2026-10-02T11:00:00",
    source: "AI plan", isOutsideSource: false, status: "open",
    payload: { review: "Optimization plan approval", due: "2026-10-11" },
  },
]

/* -------------------------------------------------------- activity -- */

const FLOW_DATES = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 8, 20 + i))
  return d.toISOString().slice(0, 10)
})
const RECEIVED = [2, 3, 4, 1, 0, 3, 4, 5, 2, 3, 4, 3, 7, 0]
const CLEARED = [3, 2, 3, 2, 0, 2, 4, 3, 3, 2, 3, 4, 4, 0]

/** Practice-wide inbox activity, 09/20 to 10/03/2026. */
export const INBOX_ACTIVITY: FlowDay[] = FLOW_DATES.map((date, i) => ({
  date,
  received: RECEIVED[i]!,
  cleared: CLEARED[i]!,
}))

/** Practice-wide open count per type at the end of each of those days. */
export const OPEN_SNAPSHOTS: Record<ItemType, number[]> = {
  abnormal_result: [7, 8, 8, 9, 8, 9, 10, 10, 11, 11, 12, 12, 11, 12],
  medication_change: [8, 9, 9, 10, 11, 11, 12, 12, 11, 12, 13, 13, 12, 9],
  overdue_order: [7, 7, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 11],
  outside_care: [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3],
  care_gap: [9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15],
  review_due: [8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 12, 13, 13, 13],
}

/** Urgent items open at the end of each of the last 14 days, any type. */
export const URGENT_SNAPSHOT = [2, 2, 3, 3, 2, 3, 3, 4, 4, 3, 4, 4, 5, 4]

/* ---------------------------------------------------------- stores -- */

export const workItems = createCollection<WorkItem>("hol-provider-home-v2-items", WORK_ITEMS, "v4")

/** Every action on the queue is written here, newest first. */
export const auditLog = createCollection<AuditEntry>("hol-provider-home-v2-audit", [], "v1")

let auditSeq = 0
export function recordAudit(actor: string, action: string, itemId: string) {
  auditSeq += 1
  auditLog.add([{ id: `A${Date.now()}-${auditSeq}`, at: new Date().toISOString(), actor, action, itemId }])
}
