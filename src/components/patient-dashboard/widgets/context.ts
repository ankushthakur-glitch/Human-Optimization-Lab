/* What the drawer says about a marker beyond its numbers: what it measures,
   why it matters, the markers read with it and the plan items aimed at it.
   Plain descriptions only; every value the drawer shows comes from the
   tracker. A marker missing here falls back to its category's line. */

export type MarkerContext = { means: string; why: string }

export const CONTEXT: Record<string, MarkerContext> = {
  "Body Fat Total": {
    means: "The share of total body weight that is fat, measured by DEXA.",
    why: "Higher body fat raises cardiometabolic risk and works against insulin sensitivity, lipids and blood pressure.",
  },
  "Fat Mass": {
    means: "Total fat tissue in pounds, measured by DEXA.",
    why: "Losing fat mass while keeping lean mass is the aim of the recomposition plan.",
  },
  "Lean Mass": {
    means: "Everything that is not fat or bone: muscle, organs and water, measured by DEXA.",
    why: "Muscle protects metabolic rate, strength and glucose handling during a fat-loss phase.",
  },
  "VAT Area": {
    means: "Visceral fat around the abdominal organs, as a cross-section area on DEXA.",
    why: "Visceral fat is the most metabolically active fat and tracks with insulin resistance, inflammation and heart risk.",
  },
  "VAT Volume": {
    means: "The total volume of visceral fat around the abdominal organs, measured by DEXA.",
    why: "Volume confirms the visceral-fat trend seen in VAT area.",
  },
  Weight: {
    means: "Body weight from the smart scale and DEXA.",
    why: "Weight trend shows whether the calorie plan is working; the pace matters as much as the total.",
  },
  Waist: {
    means: "Waist circumference from the patient's log.",
    why: "Waist is a simple weekly proxy for visceral fat between scans.",
  },
  "Resting Metabolic Rate": {
    means: "Calories burned at rest, measured by indirect calorimetry.",
    why: "A steady or rising RMR during weight loss suggests lean mass and metabolic rate are being kept.",
  },
  "Total BMD": {
    means: "Whole-body bone mineral density on DEXA.",
    why: "Bone density should hold steady through weight loss and testosterone therapy.",
  },
  "LDL Particle Number": {
    means: "The count of LDL particles in the blood, from the advanced lipid panel.",
    why: "Particle number reflects atherogenic burden more closely than LDL cholesterol alone.",
  },
  "LDL Small": {
    means: "Small, dense LDL particles from the advanced lipid panel.",
    why: "Small particles enter the artery wall more easily and often rise with insulin resistance.",
  },
  "LDL Medium": {
    means: "Medium-size LDL particles from the advanced lipid panel.",
    why: "Read with LDL particle number and small LDL to judge the overall particle profile.",
  },
  "Lipoprotein(a)": {
    means: "A largely inherited lipoprotein that changes little with lifestyle.",
    why: "Raised Lp(a) adds heart risk, so keeping ApoB and other modifiable factors low matters more.",
  },
  "hs-CRP": {
    means: "High-sensitivity C-reactive protein, a marker of low-grade inflammation.",
    why: "Persistent low-grade inflammation adds to cardiovascular risk; a recent illness can raise it briefly.",
  },
  "Fasting Glucose": {
    means: "Blood sugar after an overnight fast.",
    why: "Read with HbA1c and fasting insulin to judge glucose control; a non-fasting draw reads high.",
  },
  Potassium: {
    means: "A blood electrolyte that the kidneys keep in a narrow range.",
    why: "Values outside range affect heart rhythm; a delayed or haemolysed sample can read falsely high.",
  },
  "Omega-3 Index": {
    means: "EPA and DHA as a share of red blood cell fatty acids.",
    why: "A higher index is associated with lower cardiovascular risk and lower triglycerides.",
  },
  "Omega-6:3 Ratio": {
    means: "The balance of omega-6 to omega-3 fatty acids.",
    why: "The ratio improves mainly by raising omega-3 status.",
  },
  "DHEA-S": {
    means: "An adrenal hormone and precursor to testosterone and estrogen.",
    why: "Low values are read with symptoms and other hormones before any supplementation.",
  },
  "Rheumatoid Factor": {
    means: "An antibody that can be raised in autoimmune conditions and also in healthy people.",
    why: "Interpreted with joint symptoms, anti-CCP and inflammation markers rather than on its own.",
  },
  Hematocrit: {
    means: "The share of blood volume made up of red blood cells.",
    why: "Testosterone therapy can raise hematocrit; high values thicken the blood.",
  },
  Hemoglobin: {
    means: "The oxygen-carrying protein in red blood cells.",
    why: "Followed with hematocrit for testosterone therapy safety.",
  },
  RBC: {
    means: "The red blood cell count.",
    why: "Followed with hematocrit and hemoglobin for testosterone therapy safety.",
  },
  "Estradiol (E2)": {
    means: "The main estrogen; in men it is made largely from testosterone.",
    why: "Too low or too high affects libido, mood, bone and lipids during testosterone therapy.",
  },
  "Cystatin C": {
    means: "A kidney filtration marker that depends less on muscle mass than creatinine.",
    why: "Gives a second estimate of kidney function alongside creatinine eGFR.",
  },
  Homocysteine: {
    means: "An amino acid that rises when B12, folate or B6 are short, or kidney function falls.",
    why: "Raised homocysteine is associated with vascular risk.",
  },
  "Vitamin D": {
    means: "25-hydroxy vitamin D, the storage form in the blood.",
    why: "Kept within the clinician's range; very high values come from over-supplementation.",
  },
  "Urine Albumin/Creatinine Ratio": {
    means: "Albumin in a spot urine sample, corrected for urine concentration.",
    why: "An early sign of kidney stress, read with eGFR once a year.",
  },
}

const CATEGORY_WHY: Record<string, string> = {
  Heart: "Part of the cardiovascular risk picture.",
  Metabolic: "Part of the glucose and metabolic picture.",
  Kidney: "Part of the kidney function picture.",
  "Male Health": "Part of the hormone and testosterone therapy picture.",
  Nutrients: "Part of the nutrient status picture.",
  Blood: "Part of the blood count followed for therapy safety.",
  "Body Composition": "Part of the body composition picture.",
}

export function contextOf(name: string, category: string): MarkerContext {
  return (
    CONTEXT[name] ?? {
      means: `${name}, from the ${category.toLowerCase()} panel.`,
      why: CATEGORY_WHY[category] ?? "Followed as part of the optimization panel.",
    }
  )
}

/* Markers read together. The first group a marker belongs to names its
   related markers; Body Fat Total follows the reference interaction. */
const GROUPS: string[][] = [
  ["Body Fat Total", "Fat Mass", "VAT Area", "VAT Volume", "Lean Mass"],
  ["VAT Area", "VAT Volume", "Body Fat Total", "Waist", "Fasting Glucose"],
  ["VAT Volume", "VAT Area", "Body Fat Total", "Waist"],
  ["Fat Mass", "Body Fat Total", "Lean Mass", "Weight"],
  ["Lean Mass", "Resting Metabolic Rate", "Fat Mass", "Weight", "Total BMD"],
  ["Weight", "Waist", "Body Fat Total", "Fat Mass", "Lean Mass"],
  ["Waist", "Weight", "VAT Area", "Body Fat Total"],
  ["Resting Metabolic Rate", "Lean Mass", "Weight", "Fat Mass"],
  ["LDL Particle Number", "LDL Small", "LDL Medium", "ApoB", "LDL-C Calculated", "Lipoprotein(a)"],
  ["Lipoprotein(a)", "ApoB", "LDL Particle Number", "hs-CRP"],
  ["hs-CRP", "C-Reactive Protein (CRP)", "Erythrocyte Sedimentation Rate (ESR)", "VAT Area"],
  ["Fasting Glucose", "Fasting Insulin", "HOMA-IR (calculated)", "Hemoglobin A1c"],
  ["Potassium", "eGFR", "Creatinine", "Cystatin C", "BUN"],
  ["Cystatin C", "eGFR by Cystatin C", "eGFR", "Creatinine"],
  ["Urine Albumin/Creatinine Ratio", "eGFR", "Creatinine", "Cystatin C", "Albumin, Urine"],
  ["Omega-3 Index", "Omega-6:3 Ratio", "Triglycerides"],
  ["Hematocrit", "Hemoglobin", "RBC", "Total Testosterone", "Estradiol (E2)"],
  ["Estradiol (E2)", "Total Testosterone", "SHBG", "Free Testosterone (calculated)"],
  ["DHEA-S", "Total Testosterone", "Estradiol (E2)", "SHBG"],
  ["Rheumatoid Factor", "CCP Antibody, IgG", "Erythrocyte Sedimentation Rate (ESR)", "C-Reactive Protein (CRP)"],
  ["Homocysteine", "Vitamin B12", "Folate", "eGFR"],
]

export function relatedOf(name: string) {
  const own = GROUPS.find((g) => g[0] === name) ?? GROUPS.find((g) => g.includes(name))
  return (own ?? []).filter((n) => n !== name).slice(0, 5)
}

/* The plan items aimed at a marker, by intervention name. */
const PLAN: Record<string, string[]> = {
  "Body Fat Total": ["Calorie-controlled fat-loss plan", "Resistance training split", "Walking and treadmill"],
  "Fat Mass": ["Calorie-controlled fat-loss plan", "Resistance training split"],
  Weight: ["Calorie-controlled fat-loss plan", "Walking and treadmill"],
  Waist: ["Calorie-controlled fat-loss plan", "Walking and treadmill"],
  "VAT Area": ["Walking and treadmill", "Calorie-controlled fat-loss plan"],
  "VAT Volume": ["Walking and treadmill", "Calorie-controlled fat-loss plan"],
  "Lean Mass": ["Protect lean mass", "Resistance training split"],
  "Resting Metabolic Rate": ["Resistance training split", "Protect lean mass"],
  Hematocrit: ["Split testosterone dosing", "Power Red blood donation"],
  Hemoglobin: ["Split testosterone dosing"],
  RBC: ["Split testosterone dosing"],
  "Estradiol (E2)": ["Split testosterone dosing"],
  "Omega-3 Index": ["Omega-3 EPA+DHA"],
  "Omega-6:3 Ratio": ["Omega-3 EPA+DHA"],
  "LDL Particle Number": ["Psyllium / soluble fiber"],
  "LDL Small": ["Psyllium / soluble fiber"],
  "LDL Medium": ["Psyllium / soluble fiber"],
  "Fasting Glucose": ["Psyllium / soluble fiber", "Walking and treadmill"],
}

export const planFor = (name: string) => PLAN[name] ?? []
