import { createCollection } from "@/components/practice/collection-store"

/* Sample values for the two Settings modules, taken from the Inlay settings
   scope sheet (discovery calls 22 Sep to 19 Oct 2026). Figures the client
   has not fixed yet are placeholders and say so in the code, not the UI. */

const VERSION = "settings-v2"

/* -------------------------------------------------------------------------- */
/*  Roles                                                                      */
/* -------------------------------------------------------------------------- */

export type Permission = { id: string; name: string; description: string }

export const PERMISSION_GROUPS: { title: string; items: Permission[] }[] = [
  {
    title: "Patients",
    items: [
      {
        id: "patients.view",
        name: "View patients",
        description: "See the practice's patient list and profiles",
      },
      {
        id: "patients.edit",
        name: "Add and edit patients",
        description: "Add, update and deactivate patient records",
      },
      {
        id: "patients.invite",
        name: "Invite patients",
        description: "Send and resend app invitations",
      },
      {
        id: "patients.record",
        name: "View health record",
        description: "Open results, medications and conditions from the EHR",
      },
    ],
  },
  {
    title: "Care plans",
    items: [
      {
        id: "plans.recommend",
        name: "Recommend plans",
        description: "Suggest optimization plans to a patient",
      },
      {
        id: "plans.approve",
        name: "Approve care plans",
        description: "Review the AI draft and send it to the patient",
      },
      {
        id: "plans.medications",
        name: "Confirm medication changes",
        description: "Accept or reject changes a patient reports",
      },
    ],
  },
  {
    title: "Practice",
    items: [
      {
        id: "practice.users",
        name: "Manage users",
        description: "Invite, edit and deactivate providers and staff",
      },
      {
        id: "practice.settings",
        name: "Practice settings",
        description: "Change invitations, alerts and the practice profile",
      },
      {
        id: "practice.reports",
        name: "View reports",
        description: "Open engagement and employer reports",
      },
    ],
  },
]

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) =>
  g.items.map((p) => p.id)
)

export type Role = {
  id: string
  name: string
  description: string
  permissions: string[]
  /** The standard set ships with the platform and cannot be deleted. */
  system: boolean
  createdBy: string
  createdOn: string
  updatedBy: string
  updatedOn: string
  status: "Active" | "Inactive"
}

const ROLE_SEED: Role[] = [
  {
    id: "physician",
    name: "Physician",
    description: "Reviews records, approves care plans, confirms medications",
    permissions: [
      "patients.view",
      "patients.edit",
      "patients.invite",
      "patients.record",
      "plans.recommend",
      "plans.approve",
      "plans.medications",
      "practice.reports",
    ],
    system: true,
    createdBy: "System",
    createdOn: "2026-09-22",
    updatedBy: "",
    updatedOn: "",
    status: "Active",
  },
  {
    id: "medical-assistant",
    name: "Medical assistant",
    description:
      "Supports a physician's panel, invites and follows up patients",
    permissions: [
      "patients.view",
      "patients.edit",
      "patients.invite",
      "patients.record",
    ],
    system: true,
    createdBy: "System",
    createdOn: "2026-09-22",
    updatedBy: "Maya Chen",
    updatedOn: "2026-10-14",
    status: "Active",
  },
  {
    id: "clinic-manager",
    name: "Clinic manager",
    description: "Runs the practice: users, patient files, invitations",
    permissions: [
      "patients.view",
      "patients.edit",
      "patients.invite",
      "practice.users",
      "practice.settings",
      "practice.reports",
    ],
    system: true,
    createdBy: "System",
    createdOn: "2026-09-22",
    updatedBy: "",
    updatedOn: "",
    status: "Active",
  },
  {
    id: "front-desk",
    name: "Front desk",
    description: "Adds patients and sends invitations",
    permissions: ["patients.view", "patients.edit", "patients.invite"],
    system: false,
    createdBy: "Maya Chen",
    createdOn: "2026-10-02",
    updatedBy: "",
    updatedOn: "",
    status: "Active",
  },
  {
    id: "nurse",
    name: "Nurse",
    description: "Follows up patients and their results",
    permissions: ["patients.view", "patients.invite", "patients.record"],
    system: true,
    createdBy: "System",
    createdOn: "2026-09-22",
    updatedBy: "",
    updatedOn: "",
    status: "Active",
  },
  {
    id: "care-coordinator",
    name: "Care coordinator",
    description: "Keeps patients moving through invitations and plans",
    permissions: ["patients.view", "patients.edit", "patients.invite"],
    system: true,
    createdBy: "System",
    createdOn: "2026-09-22",
    updatedBy: "",
    updatedOn: "",
    status: "Active",
  },
  {
    id: "inlay-admin",
    name: "Inlay admin",
    description: "Platform team: practices, catalogue, pricing, AI",
    permissions: ALL_PERMISSIONS,
    system: true,
    createdBy: "System",
    createdOn: "2026-09-22",
    updatedBy: "",
    updatedOn: "",
    status: "Active",
  },
]

export const roles = createCollection("hol-settings-roles", ROLE_SEED, VERSION)

/** The roles a practice can give its people: every active role but the
    platform's own. */
export function useAccessRoles() {
  return roles
    .use()
    .items.filter((r) => r.status === "Active" && r.id !== "inlay-admin")
    .map((r) => r.name)
}

/* -------------------------------------------------------------------------- */
/*  Optimization plans                                                         */
/* -------------------------------------------------------------------------- */

/* The 81 plans by area, the same list the patient app shows
   (mobile/src/lib/plan-match.ts). */
export const PLAN_AREAS: Record<string, string[]> = {
  "Metabolic and weight": [
    "Metabolic health",
    "Weight loss foundations",
    "Body fat reduction",
    "GLP-1 support",
    "Waist circumference reset",
    "Metabolism after menopause",
    "Mediterranean eating",
    "Weight maintenance",
    "Appetite and cravings",
  ],
  "Lipid and cardiovascular": [
    "Lipid control",
    "LDL lowering",
    "HDL support",
    "Lipoprotein(a) watch",
    "Heart-healthy eating",
    "Cardio fitness for heart health",
    "Statin support",
    "Family history heart care",
    "ApoB reduction",
  ],
  "Triglyceride and insulin": [
    "Insulin sensitivity",
    "Prediabetes reversal",
    "A1C lowering",
    "Triglyceride lowering",
    "Steady blood sugar",
    "Lower carb eating",
    "Time-restricted eating",
    "After-meal glucose",
    "Fasting glucose reset",
  ],
  "Blood pressure": [
    "Blood pressure lowering",
    "Salt reduction",
    "DASH eating",
    "Home blood pressure checks",
    "Stress and blood pressure",
    "Morning blood pressure",
    "Weight and blood pressure",
    "Alcohol and blood pressure",
    "Activity for blood pressure",
  ],
  "Bone strength": [
    "Bone strength",
    "Osteopenia support",
    "Calcium and vitamin D",
    "Strength training for bone",
    "Fall prevention",
    "Balance training",
    "Posture and spine",
    "Bone health after menopause",
    "Joint mobility",
  ],
  "Muscle and strength": [
    "Muscle strength",
    "Fitness and VO₂ max",
    "Protein for muscle",
    "Muscle loss prevention",
    "Resistance training basics",
    "Grip strength",
    "Endurance building",
    "Recovery and mobility",
    "Active aging",
  ],
  Sleep: [
    "Better sleep",
    "More energy",
    "Insomnia support",
    "Sleep schedule reset",
    "Snoring and sleep apnea check",
    "Wind-down routine",
    "Shift work sleep",
    "Caffeine and sleep",
    "Deep sleep support",
  ],
  Kidney: [
    "Kidney health",
    "eGFR protection",
    "Hydration",
    "Kidney-friendly eating",
    "Protein balance for kidneys",
    "Blood pressure for kidneys",
    "Blood sugar for kidneys",
    "Medicine review for kidneys",
    "Uric acid lowering",
  ],
  Liver: [
    "Liver health",
    "Fatty liver reversal",
    "Liver enzymes",
    "Alcohol reduction",
    "Liver-friendly eating",
    "Weight loss for liver",
    "Inflammation reduction",
    "Gut health",
    "Liver and energy",
  ],
}

export const AREAS = Object.keys(PLAN_AREAS)

export const PHASES = ["V1", "V2", "Later"] as const
export type Phase = (typeof PHASES)[number]

export const RETEST_INTERVALS = [
  "Every 3 months",
  "Every 6 months",
  "Every 12 months",
] as const

export const TESTS = [
  "Lipid panel",
  "ApoB",
  "Lipoprotein(a)",
  "A1C",
  "Fasting glucose",
  "Fasting insulin",
  "Comprehensive metabolic panel",
  "Liver panel",
  "eGFR and urine albumin",
  "Vitamin D",
  "hs-CRP",
  "Uric acid",
  "DEXA scan",
  "Coronary calcium scan",
  "Body composition",
  "Home blood pressure log",
  "Sleep study",
]

/* Placeholder suggested tests, seeded by area, until Dr. Blanchard's list arrives. */
const AREA_TESTS: Record<string, string[]> = {
  "Metabolic and weight": ["A1C", "Fasting insulin", "Body composition"],
  "Lipid and cardiovascular": ["Lipid panel", "ApoB", "Lipoprotein(a)"],
  "Triglyceride and insulin": ["A1C", "Fasting glucose", "Fasting insulin"],
  "Blood pressure": [
    "Home blood pressure log",
    "Comprehensive metabolic panel",
  ],
  "Bone strength": ["DEXA scan", "Vitamin D"],
  "Muscle and strength": ["Body composition", "Comprehensive metabolic panel"],
  Sleep: ["Sleep study", "hs-CRP"],
  Kidney: ["eGFR and urine albumin", "Uric acid"],
  Liver: ["Liver panel", "hs-CRP"],
}

export type Plan = {
  id: string
  name: string
  phase: Phase
  /** The tests suggested with the plan. */
  tests: string[]
  retest: string
  status: "Active" | "Retired"
}

const PLAN_SEED: Plan[] = AREAS.flatMap((area, a) =>
  PLAN_AREAS[area].map((name, i) => ({
    id: `PL${String(a * 9 + i + 1).padStart(3, "0")}`,
    name,
    phase: (i < 4 ? "V1" : i < 7 ? "V2" : "Later") as Phase,
    tests: AREA_TESTS[area],
    retest: i % 3 === 2 ? "Every 6 months" : "Every 3 months",
    status: "Active" as const,
  }))
)

export const plans = createCollection("hol-settings-plans", PLAN_SEED, VERSION)

/* Tests that must never be offered more often than a set period: the
   coronary calcium scan rule and others like it. */
export const INTERVAL_UNITS = ["Months", "Years"] as const

export const TEST_GUARDS: { test: string; every: number; unit: string }[] = [
  { test: "Coronary calcium scan", every: 5, unit: "Years" },
  { test: "DEXA scan", every: 2, unit: "Years" },
  { test: "Full-body MRI", every: 1, unit: "Years" },
  { test: "Lipoprotein(a)", every: 5, unit: "Years" },
  { test: "Sleep study", every: 2, unit: "Years" },
  { test: "A1C", every: 3, unit: "Months" },
  { test: "Lipid panel", every: 3, unit: "Months" },
]

/* -------------------------------------------------------------------------- */
/*  Care plan                                                                  */
/* -------------------------------------------------------------------------- */

export const TEMPLATE_SECTIONS = [
  { id: "nutrition", name: "Nutrition", on: true },
  { id: "exercise", name: "Exercise", on: true },
  { id: "supplements", name: "Supplements", on: true },
  { id: "tests", name: "Tests", on: true },
  { id: "sleep", name: "Sleep", on: false },
  { id: "stress", name: "Stress", on: false },
]

export const RERATE_INTERVALS = [
  "Every week",
  "Every 2 weeks",
  "Every 4 weeks",
] as const

/* -------------------------------------------------------------------------- */
/*  Pricing                                                                    */
/* -------------------------------------------------------------------------- */

export const LONGEVITY_ITEMS = [
  { id: "mced", name: "Multi-cancer early detection", price: 949, on: true },
  { id: "alz", name: "Alzheimer's risk marker", price: 399, on: true },
  { id: "metals", name: "Heavy metals panel", price: 249, on: true },
  { id: "mri", name: "Full-body MRI", price: 2499, on: false },
]

/* The patient app shows a top up as "25% more AI credit" (placeholder). */
export const TOP_UPS = [
  { id: "small", name: "25% more AI credit", price: 5, on: true },
  { id: "medium", name: "50% more AI credit", price: 9, on: true },
  { id: "large", name: "100% more AI credit", price: 15, on: false },
]

/* -------------------------------------------------------------------------- */
/*  AI                                                                         */
/* -------------------------------------------------------------------------- */

export const MODELS = [
  "Claude Opus 5.5",
  "Claude Sonnet 5.5",
  "Claude Haiku 5.5",
] as const

export const SOURCES = [
  {
    id: "cdc",
    name: "Centers for Disease Control and Prevention",
    domain: "cdc.gov",
    on: true,
  },
  {
    id: "nih",
    name: "National Institutes of Health",
    domain: "nih.gov",
    on: true,
  },
  { id: "medline", name: "MedlinePlus", domain: "medlineplus.gov", on: true },
  {
    id: "aha",
    name: "American Heart Association",
    domain: "heart.org",
    on: true,
  },
  {
    id: "ada",
    name: "American Diabetes Association",
    domain: "diabetes.org",
    on: true,
  },
  {
    id: "uspstf",
    name: "US Preventive Services Task Force",
    domain: "uspreventiveservicestaskforce.org",
    on: true,
  },
  { id: "mayo", name: "Mayo Clinic", domain: "mayoclinic.org", on: false },
]

/* -------------------------------------------------------------------------- */
/*  Practice                                                                   */
/* -------------------------------------------------------------------------- */

export type Employer = {
  id: string
  name: string
  eligible: number
  matched: number
  reporting: boolean
  status: "Active" | "Inactive"
}

const EMPLOYER_SEED: Employer[] = [
  {
    id: "EM01",
    name: "Ford Motor Company",
    eligible: 842,
    matched: 611,
    reporting: true,
    status: "Active",
  },
  {
    id: "EM02",
    name: "Qualcomm",
    eligible: 520,
    matched: 402,
    reporting: true,
    status: "Active",
  },
  {
    id: "EM03",
    name: "Scripps Health",
    eligible: 310,
    matched: 244,
    reporting: false,
    status: "Active",
  },
  {
    id: "EM04",
    name: "City of San Diego",
    eligible: 188,
    matched: 120,
    reporting: false,
    status: "Active",
  },
  {
    id: "EM05",
    name: "Petco",
    eligible: 64,
    matched: 41,
    reporting: false,
    status: "Inactive",
  },
]

export const employers = createCollection(
  "hol-settings-employers",
  EMPLOYER_SEED,
  VERSION
)

/** Employer names by id, for the patient form's dropdown and the patient list.
    Only active employers can be picked; an inactive one still reads by name. */
export function useEmployerLookup() {
  const { items } = employers.use()
  return {
    all: items,
    active: items.filter((e) => e.status === "Active"),
    name: (id: string) => items.find((e) => e.id === id)?.name ?? "",
    idFor: (name: string) => items.find((e) => e.name === name)?.id,
  }
}

export const MATCH_ATTRIBUTES = [
  { id: "name", name: "Full name", on: true },
  { id: "dob", name: "Date of birth", on: true },
  { id: "email", name: "Email", on: true },
  { id: "mobile", name: "Mobile", on: false },
]

export const CHANNELS = [
  { id: "sms", name: "Text message", on: true },
  { id: "email", name: "Email", on: true },
]

/* Four contacts over 30 days, each on the channels picked for it, with its
   own message; the decline link comes with the last one. */
export type ReminderChannel = "sms" | "email"
export type InviteContact = {
  id: string
  day: number
  /** Text message, email or both. */
  channels: ReminderChannel[]
  /** The email subject. */
  heading: string
  message: string
  /** Carries the link to decline the invitation. */
  decline: boolean
}

export const REMINDERS: InviteContact[] = [
  {
    id: "r1",
    day: 0,
    channels: ["sms", "email"],
    heading: "{practice_name} invited you to Inlay Health",
    message:
      "Hi {first_name}, {practice_name} has invited you to Inlay Health to see your health record in one place. Join here: {link}",
    decline: false,
  },
  {
    id: "r2",
    day: 7,
    channels: ["sms", "email"],
    heading: "Your Inlay Health invitation from {provider_name}",
    message:
      "Hi {first_name}, {provider_name} invited you to Inlay Health. Your results, medications and visits in one place: {link}",
    decline: false,
  },
  {
    id: "r3",
    day: 14,
    channels: ["email"],
    heading: "Your invitation is still open",
    message:
      "Hi {first_name}, a reminder from {practice_name}: your Inlay Health invitation is still open. Join here: {link}",
    decline: false,
  },
  {
    id: "r4",
    day: 30,
    channels: ["sms", "email"],
    heading: "Last reminder: your Inlay Health invitation",
    message:
      "{practice_name}: last reminder about Inlay Health. Join: {link}. Not interested? Let us know: {decline_link}",
    decline: true,
  },
]

export const reminders = createCollection(
  "hol-settings-invite-reminders",
  REMINDERS,
  "settings-v3"
)

export const SENDERS = [
  "The practice",
  "Inlay on the practice's behalf",
] as const

/* What reaches the physician, and on which channel. */
export const NOTIFY_EVENTS: {
  group: string
  items: {
    id: string
    name: string
    push: boolean
    text: boolean
    email: boolean
  }[]
}[] = [
  {
    group: "Hospital events",
    items: [
      {
        id: "er",
        name: "Patient visits the emergency room",
        push: true,
        text: true,
        email: false,
      },
      {
        id: "admit",
        name: "Patient is admitted to hospital",
        push: true,
        text: true,
        email: true,
      },
      {
        id: "discharge",
        name: "Patient is discharged",
        push: true,
        text: false,
        email: true,
      },
      {
        id: "urgent",
        name: "Patient visits urgent care",
        push: true,
        text: false,
        email: false,
      },
      {
        id: "surgery",
        name: "Patient has surgery scheduled",
        push: true,
        text: false,
        email: true,
      },
    ],
  },
  {
    group: "Patient record",
    items: [
      {
        id: "medchange",
        name: "Patient reports a medication change",
        push: true,
        text: false,
        email: false,
      },
      {
        id: "trend",
        name: "A result trends out of range",
        push: true,
        text: false,
        email: false,
      },
      {
        id: "critical",
        name: "A critical result arrives",
        push: true,
        text: true,
        email: true,
      },
      {
        id: "results",
        name: "New lab results arrive",
        push: true,
        text: false,
        email: false,
      },
      {
        id: "diagnosis",
        name: "A new diagnosis is added from the EHR",
        push: false,
        text: false,
        email: true,
      },
      {
        id: "symptom",
        name: "Patient's symptom rating gets worse",
        push: true,
        text: false,
        email: false,
      },
    ],
  },
  {
    group: "Care plan",
    items: [
      {
        id: "plan",
        name: "Care plan is waiting for review",
        push: true,
        text: false,
        email: true,
      },
      {
        id: "accepted",
        name: "Patient accepts the care plan",
        push: false,
        text: false,
        email: true,
      },
      {
        id: "changes",
        name: "Patient asks for changes to the care plan",
        push: true,
        text: false,
        email: true,
      },
      {
        id: "upgraded",
        name: "Patient becomes a member",
        push: false,
        text: false,
        email: true,
      },
      {
        id: "cancelled",
        name: "Patient cancels their membership",
        push: false,
        text: false,
        email: true,
      },
    ],
  },
  {
    group: "Tests",
    items: [
      {
        id: "booked",
        name: "Patient books a test",
        push: false,
        text: false,
        email: false,
      },
      {
        id: "overdue",
        name: "A test is overdue",
        push: true,
        text: false,
        email: false,
      },
      {
        id: "missed",
        name: "Patient misses a test appointment",
        push: true,
        text: false,
        email: true,
      },
    ],
  },
  {
    group: "Tasks and messages",
    items: [
      {
        id: "task",
        name: "A task is assigned to me",
        push: true,
        text: false,
        email: true,
      },
      {
        id: "taskdue",
        name: "One of my tasks is overdue",
        push: true,
        text: false,
        email: false,
      },
      {
        id: "message",
        name: "A provider sends me a message",
        push: true,
        text: false,
        email: false,
      },
    ],
  },
  {
    group: "Invitations",
    items: [
      {
        id: "joined",
        name: "Patient joins Inlay",
        push: false,
        text: false,
        email: false,
      },
      {
        id: "declined",
        name: "Patient declines the invitation",
        push: false,
        text: false,
        email: true,
      },
      {
        id: "undelivered",
        name: "An invitation can't be delivered",
        push: false,
        text: false,
        email: true,
      },
      {
        id: "noreply",
        name: "Patient hasn't answered after the last reminder",
        push: false,
        text: false,
        email: true,
      },
    ],
  },
]

/* Events that put a patient on the Important updates card. */
export const ACTION_EVENTS = [
  { id: "trend", name: "Result trending out of range", on: true },
  { id: "medchange", name: "Medication change to confirm", on: true },
  { id: "hospital", name: "Emergency room visit or admission", on: true },
  { id: "plan", name: "Care plan waiting for review", on: true },
  { id: "overdue", name: "Test overdue", on: false },
  { id: "symptom", name: "Symptom rating got worse", on: false },
]

/* -------------------------------------------------------------------------- */
/*  Patient flags                                                              */
/* -------------------------------------------------------------------------- */

/* The colours a flag can take: soft hues so a flag reads on a chart without
   shouting. */
export const FLAG_COLORS = [
  "#DE6F68",
  "#EB9A52",
  "#E3C04F",
  "#5FB386",
  "#4DB6AC",
  "#6E9CE8",
  "#9C86E6",
  "#D97BB6",
  "#8A94A6",
]

export type PatientFlag = {
  id: string
  name: string
  color: string
  createdBy: string
  createdOn: string
  updatedOn: string
}

/* Ready-made flags every provider starts with; they can rename, recolour or
   delete them and add their own. */
const FLAG_SEED: PatientFlag[] = [
  ["Diabetic", "#DE6F68"],
  ["Prediabetes", "#EB9A52"],
  ["High blood pressure", "#9C86E6"],
  ["High cholesterol", "#E3C04F"],
  ["Kidney disease", "#6E9CE8"],
  ["Fall risk", "#D97BB6"],
  ["Recent hospital stay", "#4DB6AC"],
  ["Medication change", "#5FB386"],
  ["Needs follow up", "#8A94A6"],
].map(([name, color], i) => ({
  id: `FL${String(i + 1).padStart(3, "0")}`,
  name,
  color,
  createdBy: "System",
  createdOn: "2026-09-22",
  updatedOn: "2026-09-22",
}))

export const patientFlags = createCollection(
  "hol-settings-patient-flags",
  FLAG_SEED,
  VERSION
)
