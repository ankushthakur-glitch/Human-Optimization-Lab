import { backfillBiomarker } from "@/components/patient-dashboard/backfill"
import type { DashboardData } from "@/components/patient-dashboard/types"
import type {
  BetterDirection,
  Biomarker,
  MarkerPoint,
  MarkerStatus,
  OptimizationData,
  Tier,
} from "@/components/patient-dashboard/optimization/types"

/* Marcus Hale (P10318), the optimization member the view was specified
   against. Values come from the client's HOLv.9 tracker as given: the
   Biomarkers sheet is kept as CSV below and parsed, the history series are
   merged into each marker, and the Dashboard sheet's snapshot is kept as the
   sheet shows it. */

const PRACTICE = "Practice EHR"
const COREWELL = "Corewell Health (Epic)"
const FUNCTION = "Function Health (Quest)"
const UPLOADED = "Uploaded report"
const HENRY_FORD = "Henry Ford Health (Epic)"

/* ------------------------------------------------------- shared data -- */

/** What the shared cards read: medications, orders, gaps, reports, reviews. */
export const MARCUS_CORE: DashboardData = {
  patientId: "P10318",
  practiceSource: PRACTICE,
  labs: [],
  bp: [],
  conditions: [],
  allergies: [],
  medications: [
    { medication: "Synthroid", dose: "1 mg", sig: "1 tablet daily", frequency: "daily", prescriber: "Dr. Blanchard", source: PRACTICE, date: "2015-09-01", isPracticeList: true },
    { medication: "Atorvastatin", dose: "10 mg", sig: "1 tablet daily", frequency: "daily", prescriber: "Dr. Blanchard", source: PRACTICE, date: "2022-11-20", isPracticeList: true },
    { medication: "Tadalafil", dose: "5 mg", sig: "as needed", frequency: "as needed", prescriber: "Dr. Reyes", source: PRACTICE, date: "2026-01-14", isPracticeList: true },
    { medication: "Lisinopril", dose: "10 mg", sig: "1 tablet daily", frequency: "daily", prescriber: "Dr. Blanchard", source: PRACTICE, date: "2023-04-11", isPracticeList: true },
    { medication: "Lisinopril", dose: "20 mg", sig: "1 tablet daily", frequency: "daily", prescriber: "Dr. Jones", source: HENRY_FORD, date: "2026-09-29", isPracticeList: false },
    { medication: "Atorvastatin", dose: "15 mg", sig: "1 tablet daily", frequency: "daily", prescriber: "Dr. Jones", source: HENRY_FORD, date: "2025-10-25", isPracticeList: false },
  ],
  answers: [
    { medication: "Atorvastatin", answer: "Taking differently", note: "15 mg since Dr. Jones changed it", date: "2026-09-15" },
    { medication: "Tadalafil", answer: "Taking differently", note: "Daily at midday", date: "2026-09-15" },
    { medication: "Synthroid", answer: "Taking", date: "2026-09-15" },
  ],
  orders: [
    {
      order: "Sleep medicine referral", orderedBy: "Dr. Reyes", orderedAt: "2026-06-10", facility: "Corewell Health",
      reminderDates: ["2026-06-24", "2026-07-08", "2026-07-22"], status: "open",
    },
    {
      order: "Renal ultrasound", orderedBy: "Dr. Reyes", orderedAt: "2026-08-04", facility: "Corewell Health",
      reminderDates: ["2026-08-18", "2026-09-01"], status: "open",
    },
    {
      order: "Advanced lipid panel", orderedBy: "Dr. Reyes", orderedAt: "2026-08-31", facility: "Quest Diagnostics",
      reminderDates: ["2026-09-14", "2026-09-28"], status: "open",
    },
  ],
  gaps: [
    { gap: "Influenza vaccine 2026-27", gapType: "Preventive", lastDone: "2025-10-10", due: "2026-10-01", remindersSent: 0, status: "open" },
  ],
  /* Outside care since the review on 08/12/2026: nothing acute, so every
     visit and report below lands under For review. */
  encounters: [
    {
      event: "Specialist visit", facility: "Corewell Endocrinology", clinician: "Dr. Priya Shah", reason: "Thyroid dose review",
      date: "2026-09-18", documents: ["C-CDA"], reviewed: false, source: COREWELL,
    },
    {
      event: "Urgent care", facility: "Henry Ford Urgent Care Troy", clinician: "Dr. Lisa Moreno", reason: "Ankle sprain, X-ray negative",
      date: "2026-09-06", documents: ["C-CDA", "PDF"], reviewed: false, source: HENRY_FORD,
    },
    {
      event: "Specialist visit", facility: "Henry Ford Cardiology", clinician: "Dr. Jones", reason: "Blood pressure follow-up",
      date: "2026-09-29", documents: ["C-CDA"], reviewed: false, source: HENRY_FORD,
    },
    {
      event: "Specialist visit", facility: "Corewell Sleep Medicine", clinician: "Dr. Naomi Fischer", reason: "Sleep apnea consult",
      date: "2026-09-24", documents: ["C-CDA", "PDF"], reviewed: false, source: COREWELL,
    },
    {
      event: "Urgent care", facility: "Corewell Health Virtual Care", clinician: "Dr. Mark Ellis", reason: "Seasonal allergies",
      date: "2026-08-21", documents: ["C-CDA"], reviewed: false, source: COREWELL,
    },
    {
      event: "Specialist visit", facility: "Corewell Dermatology", clinician: "Dr. Helen Cho", reason: "Skin check, two moles removed",
      date: "2026-09-02", documents: ["C-CDA"], reviewed: false, source: COREWELL,
    },
  ],
  reports: [
    {
      report: "Echocardiogram", finding: "Mild left ventricular hypertrophy", values: "LVEF 60% · septum 1.2 cm",
      date: "2026-09-29", source: HENRY_FORD, isOutsideSource: true, flag: "Abnormal", reviewed: false,
    },
    {
      report: "Thyroid ultrasound", finding: "Small benign-appearing nodule, 6 mm", values: "TI-RADS 2",
      date: "2026-09-18", source: COREWELL, isOutsideSource: true, flag: "Abnormal", reviewed: false,
    },
    {
      report: "Skin biopsy", finding: "Benign compound nevus, margins clear",
      date: "2026-09-09", source: COREWELL, isOutsideSource: true, flag: "Abnormal", reviewed: false,
    },
    {
      report: "Ankle X-ray", finding: "Soft tissue swelling, no fracture",
      date: "2026-09-06", source: HENRY_FORD, isOutsideSource: true, flag: "Abnormal", reviewed: false,
    },
    {
      report: "Home sleep apnea test", finding: "Mild obstructive sleep apnea", short: "mild OSA",
      values: "AHI 5.3 · O₂ nadir 85%", summary: "AHI 5.3 with an O₂ nadir of 85%", inBrief: "the home test",
      documentLabel: "Sleep study PDF", uploader: "patient", orderRef: "Sleep medicine referral",
      date: "2026-06-04", source: "Home sleep test (uploaded)", isOutsideSource: true, flag: "Abnormal", reviewed: false,
    },
  ],
  reviewLog: [{ at: "2026-08-12T10:00:00", by: "Dr. Reyes", kind: "review" }],
  lastVisit: "2026-08-12T09:00",
  nextVisit: "2026-10-28T14:00",
}

/* ------------------------------------------------------- biomarkers -- */

const BIOMARKERS_CSV = `category,name,unit,baselineDate,baselineValue,latestDate,latestValue,labLow,labHigh,targetLow,targetHigh,betterDirection,status,tier,nextStep,nextTest,frequency,note
Autoimmunity,Rheumatoid Factor,IU/mL,,,2026-08-05,29,,,,,Lower,High,Tier 2,Review joint symptoms and need for confirmatory testing,RF ± anti-CCP/ESR/CRP,As indicated,
Body Composition,Body Fat Total,%,2026-03-31,28,2026-08-04,24,,,18,20,Lower,High,Tier 1,Repeat after maintenance phase,DEXA,6-12 mo,
Body Composition,VAT Area,cm²,2026-03-31,191,2026-08-04,145.5,,,,100,Lower,High,Tier 1,Target <100 cm²,DEXA,6-12 mo,
Body Composition,VAT Volume,cm³,2026-03-31,996,2026-08-04,738,,,,600,Lower,High,Tier 1,Continue same VAT-reduction strategy,DEXA,6-12 mo,
Heart,LDL Medium,nmol/L,,,2026-05-29,219,,,,150,Lower,High,Tier 1,Improve metabolic health and review therapy,Advanced lipid panel,6-12 mo,
Heart,LDL Particle Number,nmol/L,,,2026-05-29,1215,,,,1000,Lower,High,Tier 1,Target <1000; review therapy,Advanced lipid panel,6-12 mo,
Heart,LDL Small,nmol/L,,,2026-05-29,227,,,,150,Lower,High,Tier 1,Improve insulin sensitivity and review lipid therapy,Advanced lipid panel,6-12 mo,
Heart,Lipoprotein(a),nmol/L,,,2026-08-05,80,,,,75,Lower,High,Tier 2,Confirm value; manage modifiable risk factors,Lipoprotein(a): confirm assay,Once,
Immune Regulation,hs-CRP,mg/L,,,2026-05-29,2,,,,1,Lower,High,Tier 1,Repeat when free of acute illness,hs-CRP,3-6 mo,
Male Health,DHEA-S,mcg/dL,,,2026-05-29,17,,,40,100,Higher,Low,Tier 2,Discuss before any supplementation,DHEA-S,6-12 mo,
Nutrients,Omega-3 Index,%,2026-05-29,4.6,2026-05-29,4.6,,,8,12,Higher,Low,Tier 1,Review EPA+DHA intake with physician,OmegaCheck / Omega-3 Index,3-6 mo,
Nutrients,Omega-6:3 Ratio,ratio,,,2026-05-29,7.5,,,,5,Lower,High,Tier 2,Improve primarily by raising omega-3 status,OmegaCheck,3-6 mo,
Blood,RBC,x10^12/L,2026-03-01,6.18,2026-08-05,5.47,4.5,5.5,,5.5,Lower,Watch,Tier 2,Monitor trend,CBC,3-6 mo,
Body Composition,Fat Mass,lb,2026-03-31,49.8,2026-08-04,38.1,,,30,33,Lower,Watch,Tier 1,Continue gradual reduction,DEXA,6-12 mo,
Body Composition,Lean Mass,lb,2026-03-31,121.9,2026-08-04,119.3,,,121.9,,Maintain,Watch,Tier 1,"Protein, resistance training, recovery",DEXA + strength measures,6-12 mo,
Body Composition,Total BMD,g/cm²,2026-03-31,1.25,2026-08-04,1.218,,,,,Maintain,Watch,Tier 2,Review regional results with physician,DEXA / regional T-scores,12-24 mo,
Body Composition,Waist,in,2026-03-01,38,2026-08-08,35.5,,,32,33,Lower,Watch,Tier 1,Continue resistance training and modest calorie deficit,Waist measurement,Weekly,
Body Composition,Weight,lb,2026-03-01,183,2026-08-08,171.5,,,160,165,Lower,Watch,Tier 1,Continue gradual loss to 160 lb; avoid rapid deficit,Weight + waist,Weekly,
Kidney,Cystatin C,mg/L,,,2026-08-05,1.05,,,,,Range,Watch,Tier 1,Interpret with creatinine eGFR; repeat annually,Cystatin C with eGFR,Annual,
Male Health,Estradiol (E2),pg/mL,2026-03-01,72.1,2026-08-05,13,25,40,25,40,Range,Watch,Monitor,Avoid over-suppression; review symptoms,Sensitive Estradiol LC/MS-MS,3-6 mo,
Metabolic,Fasting Glucose,mg/dL,,,2026-08-05,103,70,99,75,95,Lower,Watch,Tier 1,Obtain after true overnight fast,Fasting glucose + insulin,3-6 mo,
Nutrients,Homocysteine,umol/L,,,2026-05-29,9.5,,,,8,Lower,Watch,Tier 2,Review B-vitamin status and kidney function,Homocysteine + B12/folate,6-12 mo,
Nutrients,Vitamin D,ng/mL,,,2026-08-05,63,40,60,40,60,Range,Watch,Maintain,Maintain within clinician-approved range,25-OH Vitamin D,6-12 mo,
Kidney,Urine Albumin/Creatinine Ratio,mg/g,,,,,,,,30,Lower,Not Yet Tested,Tier 1,Obtain spot urine sample,Urine albumin/creatinine ratio,Annual,Corewell Health (Epic) 2026-08-14: lab could not calculate a ratio
Autoimmunity,"CCP Antibody, IgG",U/mL,,,2026-08-14,<0.5,,3,,,Lower,In Range,Monitor,Interpret clinically with RF and symptoms,Anti-CCP,As clinically indicated,
Autoimmunity,Erythrocyte Sedimentation Rate (ESR),mm/hr,,,2026-08-14,2,0,15,,,Lower,In Range,Monitor,Interpret clinically with symptoms and other markers,ESR,As clinically indicated,
Environmental,Mercury,mcg/L,,,2026-05-29,8,,,,,Lower,In Range,Tier 2,Review fish sources if rising,Blood mercury,6-12 mo if exposure,
Heart,HDL-C,mg/dL,,,2026-05-29,51,40,,55,60,Higher,In Range,Tier 2,Maintain exercise and metabolic health,Standard lipid panel,6-12 mo,
Immune Regulation,C-Reactive Protein (CRP),mg/L,,,2026-08-14,<1.0,,5,,,Lower,In Range,Monitor,Keep separate from hs-CRP; assays are not interchangeable,CRP,As clinically indicated,
Kidney,BUN,mg/dL,,,2026-08-14,18,7,26,,,Range,In Range,Monitor,Interpret with hydration and creatinine,CMP,6-12 mo,
Kidney,Creatinine,mg/dL,,,2026-08-14,1.2,0.6,1.3,,,Range,In Range,Monitor,Interpret with eGFR and Cystatin C,CMP + Cystatin C,6-12 mo,
Kidney,eGFR,mL/min/1.73m²,,,2026-08-14,62,60,,60,,Maintain,In Range,Tier 2,Avoid dehydration before test; review trend,CMP + Cystatin C + urine ACR,6-12 mo,
Kidney,eGFR by Cystatin C,mL/min/1.73m²,,,2026-08-05,68,,,60,,Maintain,In Range,Tier 2,,,,
Male Health,Bioavailable Testosterone,ng/dL,,,2026-05-29,232.9,,,,,Range,In Range,Monitor,Monitor with dose timing,TRT panel,3-6 mo,
Male Health,Free Testosterone (calculated),ng/dL,,,2026-08-05,10.4,,,,,Range,In Range,Tier 2,Interpret using assay-specific reference,TRT panel,3-6 mo,
Male Health,SHBG,nmol/L,,,2026-08-05,41,20,40,20,40,Range,In Range,Monitor,Monitor with TRT panel,SHBG,3-6 mo,
Male Health,Total Testosterone,ng/dL,2026-04-01,350,2026-08-05,619,250,1100,600,900,Range,In Range,Tier 2,Interpret with symptoms and timing,TRT panel,3-6 mo,
Metabolic,Anion Gap,mmol/L,,,2026-08-14,8,5,17,,,Range,In Range,Maintain,No action based on this result,Basic metabolic panel,As clinically indicated,
Metabolic,Bicarbonate,mmol/L,,,2026-08-14,25,19,29,,,Range,In Range,Maintain,No action based on this result,Basic metabolic panel,As clinically indicated,
Metabolic,Calcium,mg/dL,,,2026-08-14,9.7,8.4,10.2,,,Range,In Range,Maintain,No action based on this result,Basic metabolic panel,As clinically indicated,
Metabolic,Chloride,mmol/L,,,2026-08-14,107,98,111,,,Range,In Range,Maintain,No action based on this result,Basic metabolic panel,As clinically indicated,
Metabolic,Potassium,mmol/L,,,2026-08-14,4.5,3.5,5.2,,,Range,In Range,Monitor,"Repeat value normalized on Aug 14, 2026",CMP / basic metabolic panel,As clinically indicated,
Metabolic,Sodium,mmol/L,,,2026-08-14,140,134,146,,,Range,In Range,Maintain,No action based on this result,Basic metabolic panel,As clinically indicated,
Nutrients,Folate,ng/mL,,,2026-08-14,15.5,5.4,,,,Higher,In Range,Monitor,Maintain,Folate,6-12 mo / clinician-directed,
Nutrients,Vitamin B12,pg/mL,,,2026-08-14,666,271,1000,,,Range,In Range,Monitor,Maintain / review with homocysteine as clinically appropriate,Vitamin B12,6-12 mo / clinician-directed,
Thyroid,Free T3,pg/mL,,,2026-05-29,2.5,2.3,4.2,2.3,4.2,Range,In Range,Monitor,Repeat if symptoms or physician prefers,Free T3,As indicated,
Urine,Urine Specific Gravity,ratio,,,2026-05-31,1.004,,,,,Range,In Range,Maintain,No action; interpret with hydration status,Urinalysis,As clinically indicated,
Urine,Urine pH,pH,,,2026-05-31,7,,,,,Range,In Range,Maintain,No action,Urinalysis,As clinically indicated,
Autoimmunity,ANA Screen,qualitative,,,2026-08-05,Negative,,,,,,Optimal,,,,,
Autoimmunity,"Cyclic Citrullinated Peptide Antibody, IgG",qualitative,,,2026-08-14,Negative,,,,,Negative,Optimal,Monitor,No numeric inference; retain lab interpretation,Anti-CCP,As clinically indicated,
Blood,Hematocrit,%,2026-03-01,54.2,2026-08-05,49.3,46,49,,50,Lower,Optimal,Tier 1,Review action threshold with physician,CBC,3-6 mo,
Blood,Hemoglobin,g/dL,2026-03-01,17.5,2026-08-05,15.6,14,16,,16,Lower,Optimal,Tier 2,Keep within physician-approved range,CBC,3-6 mo,
Brain Health,APOE Genotype,genotype,,,2026-05-29,3/3,,,,,Informational,Optimal,Maintain,Use only as risk context,No repeat needed,Once,
Cancer Screening,Galleri MCED,qualitative,,,2026-05-29,No cancer signal detected,,,,,Negative,Optimal,Maintain,Continue age-appropriate standard screening,Cancer screening per clinician,Per clinician,
Heart,ApoB,mg/dL,,,2026-08-05,66,,,,70,Lower,Optimal,Tier 1,Maintain current lipid therapy,ApoB,6-12 mo,
Heart,LDL-C Calculated,mg/dL,,,2026-05-29,74,,,,100,Lower,Optimal,Tier 2,Interpret with ApoB/LDL-P,Standard lipid panel + ApoB,6-12 mo,
Heart,Non-HDL Cholesterol (calculated),mg/dL,,,2026-05-29,91,,,,100,Lower,Optimal,Monitor,No separate order needed; confirm with ApoB when available,Auto-calculated from the standard lipid panel,With every lipid panel,Calculated
Heart,Remnant Cholesterol (calculated),mg/dL,,,2026-05-29,17,,,,20,Lower,Optimal,Monitor,Track alongside triglycerides and visceral fat,Auto-calculated from the standard lipid panel,With every lipid panel,Calculated
Heart,Total Cholesterol,mg/dL,,,2026-05-29,142,,,,170,Lower,Optimal,Maintain,Continue current therapy unless physician changes,Standard lipid panel,6-12 mo,
Heart,Triglycerides,mg/dL,,,2026-05-29,91,,,,100,Lower,Optimal,Maintain,Maintain current control,Standard lipid panel,6-12 mo,
Infectious Disease / Screening,Hepatitis C Antibody,qualitative,,,2026-08-14,Nonreactive,,,,,Negative,Optimal,Maintain,No further action unless clinician identifies a recent-exposure concern,Hepatitis C antibody,Per clinician,
Liver,ALT,U/L,,,2026-08-05,19,,30,,30,Lower,Optimal,Maintain,Maintain,CMP,6-12 mo,
Liver,AST,U/L,,,2026-08-05,20,,30,,30,Lower,Optimal,Maintain,Maintain,CMP,6-12 mo,
Male Health,PSA Total,ng/mL,,,2026-05-29,<0.1,,1,,0.1,Lower,Optimal,Tier 1,Maintain surveillance with physician,PSA,6-12 mo,
Male Health,Prolactin,ng/mL,,,2026-05-29,6.5,5,12,5,12,Range,Optimal,Monitor,Repeat only if clinically indicated,Prolactin,As indicated,
Metabolic,Fasting Insulin,mcU/mL,,,2026-08-05,5.4,,,,6,Lower,Optimal,Tier 1,Maintain; recalculate HOMA-IR with each draw,Fasting glucose + insulin,3-6 mo,
Metabolic,HOMA-IR (calculated),index,,,2026-08-05,1.37,,,,1.5,Lower,Optimal,Tier 1,Recalculates with each fasting glucose + insulin,,,
Metabolic,Hemoglobin A1c,%,2026-03-01,5.6,2026-08-05,5.5,4,5.6,5.2,5.4,Lower,Watch,Tier 1,Continue visceral-fat reduction and resistance training,HbA1c,3-6 mo,
Metabolic,Triglyceride:HDL Ratio (calculated),ratio,,,2026-05-29,1.78,,,,2,Lower,Optimal,Monitor,Interpret together with fasting insulin once available,Auto-calculated from the standard lipid panel,With every lipid panel,Calculated
Metabolism,Resting Metabolic Rate,kcal/day,2026-03-31,1754,2026-08-04,1902,,,1750,,Maintain,Optimal,Maintain,Use measured RMR; avoid excessive deficit,RMR,6-12 mo,
Nutrients,Ferritin,ng/mL,,,2026-08-05,110,75,150,75,150,Range,Optimal,Maintain,Avoid donating solely by schedule without labs,Ferritin + iron/TIBC,6-12 mo,
Nutrients,Magnesium RBC,mg/dL,,,2026-05-29,5.4,5,6.5,5,6.5,Range,Optimal,Maintain,Maintain,RBC magnesium,6-12 mo,
Thyroid,Free T4,ng/dL,,,2026-05-29,1.4,0.8,1.8,0.8,1.8,Range,Optimal,Maintain,Maintain,Free T4,6-12 mo,
Thyroid,TSH,mIU/L,,,2026-08-05,0.64,0.5,2.5,0.5,2.5,Range,Optimal,Maintain,Maintain individualized thyroid target,TSH,6-12 mo,
Urine,Squamous Epithelial Cells - Urine,/HPF,,,2026-05-31,None Seen,,,,,Lower,Optimal,Maintain,No action,Urinalysis,As clinically indicated,
Urine,Urine RBC,/HPF,,,2026-05-31,None Seen,,,,,Lower,Optimal,Maintain,No action; continue routine monitoring,Urinalysis,As clinically indicated,
Urine,Urine WBC,/HPF,,,2026-05-31,None Seen,,,,,Lower,Optimal,Maintain,No action if asymptomatic,Urinalysis,As clinically indicated,
Urine,"Albumin, Urine",mg/dL,,,2026-08-14,<0.50,,,,,Informational,Informational,Monitor,Interpret with urine creatinine and reported ACR,Urine albumin/creatinine panel,Annual / clinician-directed,
Urine,"Creatinine, Urine",mg/dL,,,2026-08-14,14.1,,,,,Informational,Informational,Monitor,Lab did not report a calculable ratio,Urine albumin/creatinine panel,Annual / clinician-directed,`

/** `date value [source]`; no source means an uploaded report. */
const SERIES = `
Hemoglobin A1c: 2022-11-14 5.7 [Corewell Health (Epic)]; 2023-06-12 5.6 [Corewell Health (Epic)]; 2024-06-10 5.6 [Corewell Health (Epic)]; 2024-12-17 5.5 [Corewell Health (Epic)]; 2025-06-16 5.5 [Corewell Health (Epic)]; 2025-12-09 5.6; 2026-03-01 5.6; 2026-05-21 5.7; 2026-05-31 5.7 [Function Health (Quest)]; 2026-08-05 5.5
Fasting Glucose: 2024-12-17 103 [Corewell Health (Epic)]; 2025-12-09 101; 2026-03-01 114; 2026-03-15 111 [Home glucometer device]; 2026-03-29 109 [Home glucometer device]; 2026-04-12 107 [Home glucometer device]; 2026-04-26 104 [Home glucometer device]; 2026-05-10 101 [Home glucometer device]; 2026-05-24 97 [Home glucometer device]; 2026-05-31 93 [Function Health (Quest)]; 2026-06-14 96 [Home glucometer device]; 2026-06-28 99 [Home glucometer device]; 2026-07-12 100 [Home glucometer device]; 2026-07-26 102 [Home glucometer device]; 2026-08-05 103
Fasting Insulin: 2024-12-17 8.4 [Corewell Health (Epic)]; 2025-06-16 8.3 [Corewell Health (Epic)]; 2025-12-09 8.1; 2026-03-01 7.4; 2026-04-14 7.1; 2026-05-29 6.6; 2026-06-15 6.2; 2026-07-01 6; 2026-08-05 5.4
HOMA-IR (calculated): 2024-12-17 2.14 [Corewell Health (Epic)]; 2025-06-16 2.05 [Corewell Health (Epic)]; 2025-12-09 2.02; 2026-03-01 2.08; 2026-04-14 1.86; 2026-05-31 1.52 [Function Health (Quest)]; 2026-06-15 1.47; 2026-07-01 1.47; 2026-08-05 1.37
Potassium: 2021-12-21 4.4 [Corewell Health (Epic)]; 2022-11-14 4.3 [Corewell Health (Epic)]; 2024-12-17 4.5 [Corewell Health (Epic)]; 2025-12-09 4.7; 2026-05-31 4.4 [Function Health (Quest)]; 2026-08-05 5.6; 2026-08-14 4.5 [Corewell Health (Epic)]
eGFR: 2020-02-14 58; 2021-12-21 59 [Corewell Health (Epic)]; 2022-11-14 67 [Corewell Health (Epic)]; 2024-12-17 72 [Corewell Health (Epic)]; 2025-12-09 67; 2026-05-29 61; 2026-08-05 58; 2026-08-14 62 [Corewell Health (Epic)]
Creatinine: 2021-12-21 1.21 [Corewell Health (Epic)]; 2022-11-14 1.16 [Corewell Health (Epic)]; 2024-12-17 1.07 [Corewell Health (Epic)]; 2025-12-09 1.13; 2026-05-29 1.22; 2026-08-05 1.27; 2026-08-14 1.2 [Corewell Health (Epic)]
Hematocrit: 2021-12-21 48.5 [Corewell Health (Epic)]; 2022-11-14 47.4 [Corewell Health (Epic)]; 2024-12-17 48 [Corewell Health (Epic)]; 2025-12-09 49.1; 2026-03-01 54.2; 2026-03-27 48.2; 2026-05-29 47; 2026-05-31 48.8 [Function Health (Quest)]; 2026-08-05 49.3
ApoB: 2026-05-29 74; 2026-08-05 66
LDL-C Calculated: 2022-11-14 150 [Corewell Health (Epic)]; 2024-12-17 110 [Corewell Health (Epic)]; 2026-05-31 74 [Function Health (Quest)]
HDL-C: 2022-11-14 39 [Corewell Health (Epic)]; 2024-12-17 49 [Corewell Health (Epic)]; 2025-12-09 48; 2026-05-31 51 [Function Health (Quest)]
Total Cholesterol: 2022-11-14 243 [Corewell Health (Epic)]; 2024-12-17 178 [Corewell Health (Epic)]; 2025-12-09 173; 2026-05-31 142 [Function Health (Quest)]
Triglycerides: 2022-11-14 268 [Corewell Health (Epic)]; 2024-12-17 104 [Corewell Health (Epic)]; 2025-12-09 91; 2026-05-29 91
Lipoprotein(a): 2026-05-29 76; 2026-08-05 80
Vitamin D: 2022-11-14 30 [Corewell Health (Epic)]; 2024-12-17 46 [Corewell Health (Epic)]; 2026-05-29 56; 2026-08-05 63
TSH: 2021-12-21 2.61 [Corewell Health (Epic)]; 2022-11-14 3.36 [Corewell Health (Epic)]; 2024-12-17 1.22 [Corewell Health (Epic)]; 2025-12-09 1.39; 2026-05-29 1.26; 2026-08-05 0.64
Total Testosterone: 2022-11-14 194 [Corewell Health (Epic)]; 2024-12-17 333 [Corewell Health (Epic)]; 2025-12-09 140; 2026-03-01 1139; 2026-04-01 350; 2026-05-31 447 [Function Health (Quest)]; 2026-08-05 619
Estradiol (E2): 2026-03-01 72.1; 2026-05-29 37; 2026-08-05 13
Weight: 2026-03-01 183; 2026-04-06 179.5; 2026-04-25 180; 2026-05-08 178; 2026-05-21 176.5; 2026-06-06 175.5; 2026-06-17 174.5; 2026-07-10 173.5; 2026-07-14 172.5; 2026-07-30 173; 2026-08-04 172.4 [DEXA]; 2026-08-08 171.5
Waist: 2026-03-01 38; 2026-03-15 37.75; 2026-04-06 37.25; 2026-04-20 37; 2026-05-08 36.75; 2026-05-28 36.5; 2026-06-17 36; 2026-06-30 35.9; 2026-07-14 35.75; 2026-07-22 35.6; 2026-07-30 35.75; 2026-08-08 35.5
Body Fat Total: 2026-03-31 28 [DEXA]; 2026-04-14 27.7 [InBody 570 device]; 2026-04-28 27.0 [InBody 570 device]; 2026-05-12 26.8 [InBody 570 device]; 2026-05-26 26.1 [InBody 570 device]; 2026-06-09 25.9 [InBody 570 device]; 2026-06-23 25.2 [InBody 570 device]; 2026-07-07 25.0 [InBody 570 device]; 2026-07-21 24.4 [InBody 570 device]; 2026-08-04 24 [DEXA]
VAT Area: 2026-03-31 191 [DEXA]; 2026-04-14 187.0 [InBody 570 device]; 2026-04-28 180.1 [InBody 570 device]; 2026-05-12 176.7 [InBody 570 device]; 2026-05-26 170.2 [InBody 570 device]; 2026-06-09 166.5 [InBody 570 device]; 2026-06-23 159.8 [InBody 570 device]; 2026-07-07 156.2 [InBody 570 device]; 2026-07-21 150.1 [InBody 570 device]; 2026-08-04 145.5 [DEXA]
Lean Mass: 2026-03-31 121.9 [DEXA]; 2026-04-14 121.7 [InBody 570 device]; 2026-04-28 121.2 [InBody 570 device]; 2026-05-12 121.1 [InBody 570 device]; 2026-05-26 120.7 [InBody 570 device]; 2026-06-09 120.5 [InBody 570 device]; 2026-06-23 120.1 [InBody 570 device]; 2026-07-07 119.9 [InBody 570 device]; 2026-07-21 119.5 [InBody 570 device]; 2026-08-04 119.3 [DEXA]
Fat Mass: 2026-03-31 49.8 [DEXA]; 2026-04-14 48.7 [InBody 570 device]; 2026-04-28 47.0 [InBody 570 device]; 2026-05-12 46.1 [InBody 570 device]; 2026-05-26 44.5 [InBody 570 device]; 2026-06-09 43.4 [InBody 570 device]; 2026-06-23 41.8 [InBody 570 device]; 2026-07-07 40.8 [InBody 570 device]; 2026-07-21 39.3 [InBody 570 device]; 2026-08-04 38.1 [DEXA]
VAT Volume: 2026-03-31 996 [DEXA]; 2026-04-14 972 [InBody 570 device]; 2026-04-28 935 [InBody 570 device]; 2026-05-12 914 [InBody 570 device]; 2026-05-26 879 [InBody 570 device]; 2026-06-09 856 [InBody 570 device]; 2026-06-23 820 [InBody 570 device]; 2026-07-07 798 [InBody 570 device]; 2026-07-21 765 [InBody 570 device]; 2026-08-04 738 [DEXA]
Total BMD: 2026-03-31 1.25 [DEXA]; 2026-08-04 1.218 [DEXA]
Resting Metabolic Rate: 2026-03-31 1754; 2026-04-21 1772 [Metabolic breath device]; 2026-05-12 1801 [Metabolic breath device]; 2026-06-02 1818 [Metabolic breath device]; 2026-06-23 1846 [Metabolic breath device]; 2026-07-14 1871 [Metabolic breath device]; 2026-08-04 1902
`

/** One CSV line into fields; a quoted field may hold commas. */
function fields(line: string) {
  const out: string[] = []
  let cur = ""
  let quoted = false
  for (const ch of line) {
    if (ch === '"') quoted = !quoted
    else if (ch === "," && !quoted) {
      out.push(cur)
      cur = ""
    } else cur += ch
  }
  out.push(cur)
  return out
}

const num = (s: string) => (s === "" ? undefined : Number(s))
const opt = (s: string) => s || undefined

/** A value kept as received; numbers become numbers for the charts. */
const value = (s: string): number | string => (/^-?\d+(\.\d+)?$/.test(s) ? Number(s) : s)

/** Where a result without a series came from, by the draw it belongs to. */
function sourceOn(date: string) {
  if (date === "2026-08-14") return COREWELL
  if (date === "2026-05-31") return FUNCTION
  return UPLOADED
}

function parseSeries(text: string) {
  const map = new Map<string, MarkerPoint[]>()
  for (const line of text.trim().split("\n")) {
    const at = line.indexOf(": ")
    const name = line.slice(0, at)
    const points = line
      .slice(at + 2)
      .split(";")
      .map((p) => p.trim().match(/^(\d{4}-\d{2}-\d{2}) (\S+)(?: \[(.+)\])?$/))
      .filter((m): m is RegExpMatchArray => Boolean(m))
      .map((m) => ({ date: m[1], value: value(m[2]), source: m[3] ?? UPLOADED }))
    map.set(name, points)
  }
  return map
}

function parseBiomarkers(csv: string): Biomarker[] {
  const series = parseSeries(SERIES)
  const [, ...rows] = csv.trim().split("\n")
  return rows.map((line) => backfillBiomarker(parse(line)))

  function parse(line: string): Biomarker {
    const f = fields(line)
    const [category, name, unit, bDate, bValue, lDate, lValue] = f
    const baseline = bDate && bValue ? { date: bDate, value: bValue } : undefined
    const latest = lDate && lValue ? { date: lDate, value: lValue } : undefined
    const fallback = [baseline, latest]
      .filter((p): p is { date: string; value: string } => Boolean(p))
      .filter((p, i, all) => all.findIndex((q) => q.date === p.date) === i)
      .map((p) => ({ date: p.date, value: value(p.value), source: sourceOn(p.date) }))
    return {
      category,
      name,
      unit,
      baseline,
      latest,
      labLow: num(f[7]),
      labHigh: num(f[8]),
      targetLow: num(f[9]),
      targetHigh: num(f[10]),
      betterDirection: (f[11] || "Informational") as BetterDirection,
      status: f[12] as MarkerStatus,
      tier: opt(f[13]) as Tier | undefined,
      nextStep: opt(f[14]),
      nextTest: opt(f[15]),
      frequency: opt(f[16]),
      note: opt(f[17]),
      history: series.get(name) ?? fallback,
    }
  }
}

/* ------------------------------------------------------------ marcus -- */

export const MARCUS: OptimizationData = {
  patientId: "P10318",
  planSince: "2026-03-01",
  conditions: [
    { name: "Postprocedural hypothyroidism", icd10: "E89.0", since: "2015-08", source: PRACTICE, addedAt: "2015-08-01", controlMarker: "tsh", controlMarkerName: "TSH" },
    { name: "Hyperlipidemia", icd10: "E78.5", since: "2022-11", source: PRACTICE, addedAt: "2022-11-01", controlMarker: "ldl", controlMarkerName: "LDL-C Calculated" },
    { name: "Prediabetes", icd10: "R73.03", since: "2022-11", source: PRACTICE, addedAt: "2022-11-01", controlMarker: "hba1c", controlMarkerName: "Hemoglobin A1c" },
    { name: "Testicular hypofunction", icd10: "E29.1", since: "2025-12", source: PRACTICE, addedAt: "2025-12-01", controlMarkerName: "Total Testosterone" },
    { name: "Obstructive sleep apnea", icd10: "G47.33", since: "2020-07", source: PRACTICE, addedAt: "2020-07-01" },
    { name: "Personal history of prostate cancer", icd10: "Z85.46", since: "2016-01", source: PRACTICE, addedAt: "2016-01-01", controlMarkerName: "PSA Total" },
  ],
  biomarkers: parseBiomarkers(BIOMARKERS_CSV),
  goals: [
    {
      metric: "Weight", unit: "lb", baseline: 183, current: 171.5, goal: 160, goalLabel: "160 lb", betterDirection: "Lower",
      projection: "165-168 lb", goalDate: "2026-10-31", confidence: "Moderate", status: "Improving", seriesMarkerName: "Weight",
    },
    {
      metric: "Waist", unit: "in", baseline: 38, current: 35.5, goal: 34, goalLabel: "34 in", betterDirection: "Lower",
      projection: "34-34.5 in", goalDate: "2027-03-31", confidence: "Moderate", status: "Improving", seriesMarkerName: "Waist",
    },
    {
      metric: "Body fat", unit: "%", baseline: 28, current: 24, goal: 22, goalLabel: "22%", betterDirection: "Lower",
      projection: "22-23%", goalDate: "2027-03-31", confidence: "Moderate", status: "Improving", seriesMarkerName: "Body Fat Total",
    },
    {
      metric: "VAT area", unit: "cm²", baseline: 191, current: 145.5, goal: 130, goalLabel: "< 130 cm²", betterDirection: "Lower",
      projection: "125-135 cm²", goalDate: "2027-03-31", confidence: "Moderate", status: "Improving", seriesMarkerName: "VAT Area",
    },
    {
      metric: "HbA1c", unit: "%", baseline: 5.6, current: 5.5, goal: 5.2, goalLabel: "≤ 5.2%", betterDirection: "Lower",
      projection: "5.4%", goalDate: "2026-11-30", confidence: "Moderate", status: "Improving", seriesMarkerName: "Hemoglobin A1c",
    },
    {
      metric: "Fat mass", unit: "lb", baseline: 49.8, current: 38.1, goal: 35, goalLabel: "35 lb", betterDirection: "Lower",
      projection: "33-35 lb", goalDate: "2027-03-31", confidence: "Moderate", status: "Improving", seriesMarkerName: "Fat Mass",
    },
    {
      metric: "Lean mass", unit: "lb", baseline: 121.9, current: 119.3, goal: 124.5, goalLabel: "124.5 lb", betterDirection: "Higher",
      projection: "120-121 lb", goalDate: "2027-03-31", confidence: "Low", status: "Needs improvement", seriesMarkerName: "Lean Mass",
    },
    {
      metric: "VAT volume", unit: "cm³", baseline: 996, current: 738, goal: 600, goalLabel: "< 600 cm³", betterDirection: "Lower",
      projection: "600-650 cm³", goalDate: "2027-03-31", confidence: "Moderate", status: "Improving", seriesMarkerName: "VAT Volume",
    },
    {
      metric: "RMR", unit: "kcal/day", baseline: 1754, current: 1902, goal: 1950, goalLabel: "1,950 kcal/day", betterDirection: "Higher",
      projection: "1,950-2,000 kcal/day", goalDate: "2027-03-31", confidence: "Moderate", status: "Improving", seriesMarkerName: "Resting Metabolic Rate",
    },
    {
      metric: "Fasting glucose", unit: "mg/dL", baseline: 114, current: 103, goal: 85, goalLabel: "≤ 85 mg/dL", betterDirection: "Lower",
      projection: "95-98 mg/dL", goalDate: "2026-12-31", confidence: "Moderate", status: "Improving", seriesMarkerName: "Fasting Glucose",
    },
    {
      metric: "Fasting insulin", unit: "mcU/mL", baseline: 7.4, current: 5.4, goal: 3, goalLabel: "≤ 3 mcU/mL", betterDirection: "Lower",
      projection: "4-4.5 mcU/mL", goalDate: "2026-12-31", confidence: "Moderate", status: "Improving", seriesMarkerName: "Fasting Insulin",
    },
    {
      metric: "HOMA-IR", unit: "index", baseline: 2.08, current: 1.37, goal: 0.5, goalLabel: "≤ 0.5", betterDirection: "Lower",
      projection: "1.0-1.1", goalDate: "2026-12-31", confidence: "Moderate", status: "Improving", seriesMarkerName: "HOMA-IR (calculated)",
    },
    {
      metric: "Omega-3 index", unit: "%", baseline: 4.6, current: 4.6, goal: 8, goalLabel: "8-12%", betterDirection: "Higher",
      projection: "7%", goalDate: "2026-12-31", confidence: "Moderate", status: "Needs improvement", seriesMarkerName: "Omega-3 Index",
    },
    {
      metric: "LDL-P", unit: "nmol/L", baseline: 1215, current: 1215, goal: 1000, goalLabel: "< 1000 nmol/L", betterDirection: "Lower",
      projection: "1,100 nmol/L", goalDate: "2026-12-31", confidence: "Moderate", status: "Needs improvement", seriesMarkerName: "LDL Particle Number",
    },
    {
      metric: "Hematocrit", unit: "%", baseline: 54.2, current: 49.3, goal: 48, goalLabel: "< 50%", betterDirection: "Lower",
      projection: "49%", goalDate: "2026-12-31", confidence: "Moderate", status: "Controlled", seriesMarkerName: "Hematocrit",
    },
  ],
  scans: [
    { metric: "Weight", short: "Weight", unit: "lb", first: 177.6, latest: 172.4, status: "Improved" },
    { metric: "Body fat", short: "Body fat", unit: "%", first: 28, latest: 24, status: "Improved" },
    { metric: "Fat mass", short: "Fat mass", unit: "lb", first: 49.8, latest: 38.1, status: "Improved" },
    { metric: "Lean mass", short: "Lean mass", unit: "lb", first: 121.9, latest: 119.3, status: "Watch" },
    { metric: "VAT area", short: "VAT area", unit: "cm²", first: 191, latest: 145.5, status: "Improved" },
    { metric: "VAT volume", short: "VAT volume", unit: "cm³", first: 996, latest: 738, status: "Improved" },
    { metric: "RMR", short: "RMR", unit: "kcal/day", first: 1754, latest: 1902, status: "Optimal" },
  ],
  interventions: [
    { start: "2026-03-01", category: "Nutrition", name: "Calorie-controlled fat-loss plan", doseOrTarget: "~1,500-1,600 kcal/day", frequency: "Daily", owner: "Patient", status: "Active", outcomeMetric: "Weight / waist", observed: "Weight -11.5 lb; waist -2.5 in", nextReview: "2026-08-31", progress: 50 },
    { start: "2026-03-01", category: "Exercise", name: "Resistance training split", doseOrTarget: "6 days/week", frequency: "Weekly", owner: "Patient", status: "Active", outcomeMetric: "Lean mass / strength", observed: "Strength maintained", nextReview: "2026-08-31", progress: 50 },
    { start: "2026-04-01", category: "Activity", name: "Walking and treadmill", doseOrTarget: "10,000-12,000 steps + 30-45 min", frequency: "Daily", owner: "Patient", status: "Active", outcomeMetric: "Weight / A1C / VAT", observed: "VAT -23.8%", nextReview: "2026-08-31", progress: 50 },
    { start: "2026-03-26", category: "TRT safety", name: "Power Red blood donation", doseOrTarget: "1 session", frequency: "Once", owner: "Clinician", status: "Completed", outcomeMetric: "Hematocrit", observed: "54.2% → 48.8%", nextReview: "2026-03-27", progress: 100 },
    { start: "2026-04-01", category: "TRT", name: "Split testosterone dosing", doseOrTarget: "Physician-directed", frequency: "3x weekly", owner: "Physician", status: "Active", outcomeMetric: "T / E2 / Hct", observed: "E2 and hematocrit improved", nextReview: "Next TRT panel", progress: 50 },
    { start: "2026-05-29", category: "Supplement", name: "Omega-3 EPA+DHA", doseOrTarget: "Clinician-approved dose", frequency: "Daily", owner: "Patient/Physician", status: "Verify", outcomeMetric: "Omega-3 Index", observed: "Baseline 4.6%; retest needed", nextReview: "2026-11-30", progress: 25 },
    { start: "2026-05-29", category: "Supplement", name: "Psyllium / soluble fiber", doseOrTarget: "5-10 g/day", frequency: "Daily", owner: "Patient", status: "Active", outcomeMetric: "LDL-P / glucose", observed: "Pending repeat labs", nextReview: "2026-11-30", progress: 25 },
    { start: "2026-06-04", category: "Sleep", name: "Treat mild obstructive sleep apnea", doseOrTarget: "AHI 5.3; O₂ nadir 85%", frequency: "Nightly", owner: "Patient/Physician", status: "High priority", outcomeMetric: "AHI / O₂ nadir", observed: "Mild OSA with desaturation", nextReview: "Now", progress: 10 },
    { start: "2026-08-04", category: "Body recomposition", name: "Protect lean mass", doseOrTarget: "Protein + progressive resistance", frequency: "Daily/weekly", owner: "Patient", status: "Active", outcomeMetric: "Lean mass", observed: "Lean mass 119.3 lb", nextReview: "Next DEXA", progress: 0 },
  ],
  tests: [
    { tier: "Tier 1", category: "Kidney", test: "Urine albumin/creatinine ratio", why: "Order annual kidney screen", previous: "Not resulted", target: "≤ 30 mg/g", timing: "Next visit", status: "Discuss" },
    { tier: "Tier 2", category: "Male Health", test: "Sensitive estradiol LC/MS-MS", why: "Confirm if low libido persists", previous: "13 pg/mL", target: "25-40 pg/mL", timing: "Next visit", status: "Discuss" },
    { tier: "Tier 2", category: "Autoimmunity", test: "Anti-CCP / ESR", why: "Consider if indicated", previous: "RF 29 IU/mL", target: "Clinical", timing: "Next visit", status: "Discuss" },
    { tier: "Tier 1", category: "Heart", test: "Advanced lipid panel", why: "Repeat advanced lipids", previous: "LDL-P 1,215 nmol/L", target: "≤ 1000 nmol/L", timing: "Ordered", status: "Ordered" },
  ],
  supplements: [
    { name: "Curcumin", brand: "Thorne", dose: "500 mg", timing: "Morning", status: "Active" },
    { name: "Berberine", brand: "Thorne", dose: "500 mg", timing: "Morning", status: "Active" },
    { name: "Vitamin D3 + K2", brand: "Thorne", dose: "125 mcg", timing: "Midday", status: "Active" },
    { name: "Omega 2X ×3", brand: "Life Extension", dose: "3 softgels", timing: "Afternoon", status: "Active" },
    { name: "Magnesium ×3", brand: "Thorne", dose: "3 capsules", timing: "Evening", status: "Active" },
    { name: "B Complex", brand: "Thorne", dose: "1 capsule", timing: "Night", status: "Active" },
    { name: "Ubiquinol", brand: "Kaneka", dose: "100 mg", timing: "Night", status: "Active" },
  ],
  conflicts: [
    { item: "Vitamin D3 + K2 · 125 mcg daily", conflictsWith: "Vitamin D", evidenceMarkerName: "Vitamin D", status: "open" },
  ],
  planDraft: {
    draftedAt: "2026-10-01",
    items: [
      { id: "D1", kind: "Add", text: "Positional therapy for mild obstructive sleep apnea · nightly · Patient/Physician", basedOn: [], basedOnReport: "Home sleep apnea test", status: "pending" },
      { id: "D2", kind: "Change", text: "Calorie-controlled fat-loss plan → maintenance intake once weight reaches 160 lb", basedOn: ["Weight", "Lean Mass"], status: "pending" },
      { id: "D3", kind: "Add test", text: "Repeat DEXA + RMR · 6-12 months", basedOn: ["Lean Mass", "VAT Area"], status: "pending" },
    ],
  },
  commitment: {
    why: "To stay strong and independent for my grandchildren",
    intakeReviewedAt: "2026-03-05",
    text: "Protein at every meal and lifting 4 days a week",
    confidence: 8,
    checkIns: [
      { date: "2026-06-15", state: "Doing well" },
      { date: "2026-07-15", state: "Somewhat" },
      { date: "2026-08-15", state: "Doing well" },
      { date: "2026-09-15", state: "Doing well" },
    ],
    nextCheckIn: "2026-10-15",
  },
  energy: [
    { date: "2026-08-20", intake: 1350, burn: 2080 },
    { date: "2026-08-21", intake: 1810, burn: 2025 },
    { date: "2026-08-22", intake: 1600, burn: 2010, lowConfidence: true },
    { date: "2026-08-23", intake: 1500, burn: 2010 },
    { date: "2026-08-24", intake: 1950, burn: 2020 },
    { date: "2026-08-25", intake: 1520, burn: 2045 },
    { date: "2026-08-26", intake: 1355, burn: 1910 },
  ],
  /* Sample nightly syncs: the HOLv.9 tracker carries no wearable rows. */
  wearable: {
    device: "Apple Watch via Terra",
    days: [
      { date: "2026-09-26", steps: 11240, restingHr: 58, hrv: 41, sleepHours: 6.4 },
      { date: "2026-09-27", steps: 9810, restingHr: 59, hrv: 38, sleepHours: 5.9 },
      { date: "2026-09-28", steps: 12430, restingHr: 57, hrv: 44, sleepHours: 7.1 },
      { date: "2026-09-29", steps: 10620, restingHr: 58, hrv: 42, sleepHours: 6.8 },
      { date: "2026-09-30", steps: 8150, restingHr: 61, hrv: 35, sleepHours: 5.6 },
      { date: "2026-10-01", steps: 11980, restingHr: 58, hrv: 43, sleepHours: 6.9 },
      { date: "2026-10-02", steps: 10470, restingHr: 57, hrv: 45, sleepHours: 7.2 },
    ],
  },
  rmr: 1902,
  categories: [
    { category: "Immune regulation", score: 0 },
    { category: "Autoimmunity", score: 0 },
    { category: "Body composition", score: 31 },
    { category: "Nutrients", score: 50 },
    { category: "Heart", score: 59 },
    { category: "Metabolic", score: 70 },
    { category: "Male health", score: 81 },
    { category: "Blood", score: 83 },
    { category: "Kidney", score: 88 },
    { category: "Metabolism", score: 100 },
    { category: "Liver", score: 100 },
    { category: "Thyroid", score: 100 },
    { category: "Cancer screening", score: 100 },
    { category: "Environmental", score: 100 },
    { category: "Brain health", score: 100 },
  ],
  snapshot: {
    updatedAt: "2026-08-14",
    score: 66,
    markersTracked: 64,
    counts: { "Out of target": 14, "On watch": 12, "Not yet tested": 4, "In range": 9, Optimal: 20 },
    latestDraw: "2026-08-14",
    bulk: { count: 141, source: "Function Health", date: "2026-05-31" },
    headline: [
      { label: "Weight", unit: "lb", baseline: 183, latest: 171.5, seriesMarkerName: "Weight", better: "Lower", verdict: "Halfway to goal", verdictTone: "primary", decimals: 0 },
      { label: "Waist", unit: "in", baseline: 38, latest: 35.5, seriesMarkerName: "Waist", better: "Lower", verdict: "Improving", verdictTone: "success", decimals: 2 },
      { label: "Body fat", unit: "%", baseline: 28, latest: 24, seriesMarkerName: "Body Fat Total", better: "Lower", verdict: "Improving", verdictTone: "success", decimals: 1 },
      { label: "VAT area", unit: "cm²", baseline: 191, latest: 145.5, seriesMarkerName: "VAT Area", better: "Lower", verdict: "Improving", verdictTone: "success", decimals: 0 },
      { label: "Fat mass", unit: "lb", baseline: 49.8, latest: 38.1, seriesMarkerName: "Fat Mass", better: "Lower", verdict: "Down 11.7 lb", verdictTone: "success", decimals: 1 },
      { label: "RMR", unit: "kcal/day", baseline: 1754, latest: 1902, seriesMarkerName: "Resting Metabolic Rate", better: "Higher", verdict: "Improved", verdictTone: "success", decimals: 0 },
      { label: "Lean mass", unit: "lb", baseline: 121.9, latest: 119.3, seriesMarkerName: "Lean Mass", better: "Higher", verdict: "Watch / protect", verdictTone: "warning", decimals: 1 },
    ],
    bands: {
      "Out of target": [
        { name: "Body Fat Total", latest: "24", unit: "%", target: "≤ 20", status: "High", tier: "Tier 1", whatToDo: "Reduce fat while preserving lean tissue" },
        { name: "VAT Area", latest: "145.5", unit: "cm²", target: "≤ 100", status: "High", tier: "Tier 1", whatToDo: "Continue visceral-fat reduction" },
        { name: "VAT Volume", latest: "738", unit: "cm³", target: "≤ 600", status: "High", tier: "Tier 1", whatToDo: "Continue visceral-fat reduction" },
        { name: "LDL Particle Number", latest: "1215", unit: "nmol/L", target: "≤ 1000", status: "High", tier: "Tier 1", whatToDo: "Repeat advanced lipids" },
        { name: "LDL Small", latest: "227", unit: "nmol/L", target: "≤ 150", status: "High", tier: "Tier 1", whatToDo: "Improve particle profile" },
        { name: "LDL Medium", latest: "219", unit: "nmol/L", target: "≤ 150", status: "High", tier: "Tier 1", whatToDo: "Improve particle profile" },
        { name: "Lipoprotein(a)", latest: "80", unit: "nmol/L", target: "< 75", status: "Watch", tier: "Tier 2", whatToDo: "Maintain ApoB control" },
        { name: "hs-CRP", latest: "2", unit: "mg/L", target: "≤ 1", status: "High", tier: "Tier 1", whatToDo: "Repeat when well" },
        { name: "Fasting Glucose", latest: "103", unit: "mg/dL", target: "75-95", status: "Watch", tier: "Tier 2", whatToDo: "Repeat fasting" },
        { name: "Potassium", latest: "5.6", unit: "mmol/L", target: "≤ 5.2", status: "High", tier: "Tier 1", whatToDo: "Repeat promptly" },
        { name: "Omega-3 Index", latest: "4.6", unit: "%", target: "8-12", status: "Low", tier: "Tier 1", whatToDo: "Retest after EPA+DHA" },
        { name: "Omega-6:3 Ratio", latest: "7.5", unit: "ratio", target: "≤ 5", status: "High", tier: "Tier 2", whatToDo: "Raise omega-3" },
        { name: "DHEA-S", latest: "17", unit: "mcg/dL", target: "≥ 40", status: "Low", tier: "Tier 2", whatToDo: "Discuss with clinician" },
        { name: "Rheumatoid Factor", latest: "29", unit: "IU/mL", target: "Clinical", status: "High", tier: "Tier 2", whatToDo: "Consider anti-CCP / ESR / CRP" },
      ],
      "On watch": [
        { name: "Weight", latest: "171.5", unit: "lb", target: "160-165", status: "Watch", tier: "Tier 1", whatToDo: "Continue gradual loss" },
        { name: "Waist", latest: "35.5", unit: "in", target: "32-33", status: "Watch", tier: "Tier 1", whatToDo: "Continue recomposition" },
        { name: "Fat Mass", latest: "38.1", unit: "lb", target: "30-33", status: "Watch", tier: "Tier 1", whatToDo: "Continue gradual reduction" },
        { name: "Lean Mass", latest: "119.3", unit: "lb", target: "≥ 121.9", status: "Watch", tier: "Tier 1", whatToDo: "Protect lean mass" },
        { name: "Total BMD", latest: "1.218", unit: "g/cm²", target: "Maintain", status: "Watch", tier: "Tier 2", whatToDo: "Review DEXA" },
        { name: "Hemoglobin A1c", latest: "5.5", unit: "%", target: "5.2-5.4", status: "Watch", tier: "Tier 1", whatToDo: "Continue toward 5.4%" },
        { name: "Total Testosterone", latest: "619", unit: "ng/dL", target: "Physiologic", status: "In range", tier: "Tier 2", whatToDo: "Maintain conservative range" },
        { name: "Free Testosterone", latest: "10.4", unit: "ng/dL", target: "3.1-11.3", status: "In range", tier: "Tier 2", whatToDo: "Monitor symptoms" },
        { name: "RBC", latest: "5.47", unit: "x10^12/L", target: "≤ 5.5", status: "Watch", tier: "Tier 2", whatToDo: "Monitor TRT" },
        { name: "eGFR", latest: "58", unit: "mL/min/1.73m²", target: "≥ 60", status: "Low", tier: "Tier 1", whatToDo: "Repeat + cystatin C" },
        { name: "Homocysteine", latest: "9.5", unit: "umol/L", target: "≤ 8", status: "Watch", tier: "Tier 2", whatToDo: "Review B vitamins" },
        { name: "Sleep Apnea (home study)", latest: "AHI 5.3; O₂ nadir 85%", unit: "", target: "Treat / minimize hypoxemia", status: "High", tier: "Tier 1", whatToDo: "Sleep-medicine follow-up; positional or oral-appliance options" },
      ],
      "Not yet tested": [
        { name: "Urine Albumin/Creatinine Ratio", latest: "", unit: "mg/g", target: "< 30 mg/g", status: "Not yet tested", tier: "Tier 1", whatToDo: "Order annual kidney screen" },
        { name: "Sensitive Estradiol LC/MS-MS", latest: "", unit: "pg/mL", target: "Symptom-guided", status: "Not yet tested", tier: "Tier 2", whatToDo: "Confirm if low libido persists" },
        { name: "Anti-CCP / ESR", latest: "", unit: "", target: "Clinical", status: "Not yet tested", tier: "Tier 2", whatToDo: "Consider if indicated" },
        { name: "Advanced lipid panel", latest: "", unit: "", target: "≤ 1000", status: "Not yet tested", tier: "Tier 1", whatToDo: "Repeat advanced lipids" },
      ],
    },
    priorities: [
      { order: 1, text: "Treat mild obstructive sleep apnea", milestone: "Reduce fragmentation and nocturnal hypoxemia", met: false, basedOn: [], basedOnReport: "Home sleep apnea test" },
      { order: 2, text: "Continue visceral-fat reduction", milestone: "VAT under 100 cm²", met: false, basedOn: ["VAT Area", "VAT Volume"] },
      { order: 3, text: "Protect lean mass", milestone: "Protein + resistance training", met: false, basedOn: ["Lean Mass"] },
      { order: 4, text: "Maintain TRT safety and balance", milestone: "CBC + sensitive estradiol", met: false, basedOn: ["Hematocrit", "Estradiol (E2)"] },
      { order: 7, text: "Reach 165 lb by the end of October", milestone: "171.5 lb on 08/08/2026 · 6.5 lb to go", met: false, basedOn: ["Weight"] },
      { order: 8, text: "Bring waist under 34 in", milestone: "35.5 in on 08/08/2026", met: false, basedOn: ["Waist"] },
      { order: 5, text: "Potassium normalized on repeat", milestone: "08/14/2026 · 4.5 mmol/L", met: true, basedOn: ["Potassium"] },
      { order: 6, text: "Kidney trend improved", milestone: "08/14/2026 · eGFR 62 · creatinine 1.20", met: true, basedOn: ["eGFR", "Creatinine"] },
    ],
    scanDates: { first: "2026-03-31", latest: "2026-08-04" },
    scale: { weight: 171.5, date: "2026-08-08" },
    medications: [
      { name: "Synthroid", dose: "1 mg", prescriber: "Dr. Blanchard", sig: "Take 1 tablet by mouth every morning", quantity: "90 tablets", recorded: "2015-08-01", rxnorm: "966247" },
      { name: "Atorvastatin", dose: "10 mg", prescriber: "Dr. Blanchard", sig: "Take 1 tablet by mouth at bedtime", quantity: "30 tablets", recorded: "2022-11-14", rxnorm: "617312", change: { from: "10 mg", to: "15 mg", by: "Dr. Jones", date: "2025-10-25" } },
      { name: "Testosterone cypionate", dose: "100 mg/mL", prescriber: "Dr. Reyes", sig: "Inject 0.4 mL intramuscularly twice weekly", quantity: "10 mL vial", recorded: "2026-04-01", rxnorm: "835829" },
      { name: "Omega-3 EPA+DHA", dose: "2 g", prescriber: "Dr. Reyes", sig: "Take 2 capsules by mouth daily with food", quantity: "120 capsules", recorded: "2026-05-29", rxnorm: "1047795" },
      { name: "Psyllium husk", dose: "5 g", prescriber: "Dr. Reyes", sig: "Mix 1 scoop in water and take daily", quantity: "1 canister", recorded: "2026-05-29", rxnorm: "8928" },
    ],
    changes: [
      { date: "2026-05-29", text: "Started Omega-3 EPA+DHA", sub: "Plan · baseline index 4.6%", status: "Verify" },
      { date: "2026-05-29", text: "Started psyllium / soluble fiber", sub: "Plan · LDL particle support", status: "Active" },
      { date: "2026-04-01", text: "Testosterone split dosing", sub: "Plan · E2 and hematocrit improved", status: "Active" },
      { date: "2025-10-25", text: "Atorvastatin 10 mg → 15 mg", sub: "Dr. Jones · not yet on practice list", status: "Unconfirmed", medication: "Atorvastatin" },
    ],
  },
}

const SAMPLES: Record<string, OptimizationData> = { [MARCUS.patientId]: MARCUS }

/** The tracker data for an optimization member, when the practice has it. */
export function optimizationDataFor(patientId: string): OptimizationData | undefined {
  return SAMPLES[patientId]
}
