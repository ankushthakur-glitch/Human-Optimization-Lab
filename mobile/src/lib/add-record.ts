import type { RecordIconName } from "@/components/record-icons"

/* What a patient can add to her record herself, by photo or by typing it
   in (user, 5 Oct 2026): one entry per kind of record, with the fields its
   form asks for and what the prototype "reads" from a photo of one. */

export type AddKind = "medicines" | "supplements" | "allergies" | "conditions" | "visits" | "tests" | "immunizations" | "procedures"

export type AddField = { id: string; label: string; placeholder: string; required?: boolean }

export type AddKindInfo = {
  kind: AddKind
  /** In the picker: "Medicine". */
  name: string
  /** The list's header action and the form's title: "Add medicine". */
  action: string
  icon: RecordIconName
  fields: AddField[]
  /** What a photo of one reads as, in the prototype: its title and fields. */
  sample: { title: string; fields: [string, string][] }
}

export const ADD_KINDS: AddKindInfo[] = [
  {
    kind: "medicines",
    name: "Medicine",
    action: "Add medicine",
    icon: "medications",
    fields: [
      { id: "name", label: "Medicine", placeholder: "Metformin", required: true },
      { id: "dose", label: "Dose", placeholder: "500 mg" },
      { id: "often", label: "How often", placeholder: "Twice a day" },
      { id: "by", label: "Prescribed by", placeholder: "Dr. Patel" },
    ],
    sample: { title: "Metformin", fields: [["Dose", "500 mg"], ["How often", "Twice a day, with meals"], ["Prescribed by", "Dr. Lee"]] },
  },
  {
    kind: "supplements",
    name: "Supplement",
    action: "Add supplement",
    icon: "medications",
    fields: [
      { id: "name", label: "Supplement", placeholder: "Magnesium", required: true },
      { id: "dose", label: "Dose", placeholder: "400 mg" },
      { id: "often", label: "How often", placeholder: "Once a day" },
    ],
    // What a photo of the bottle reads as. Calcium, so the check on it has
    // something to say against her Vitamin D3.
    sample: { title: "Calcium", fields: [["Dose", "600 mg"], ["How often", "Once a day, with food"]] },
  },
  {
    kind: "allergies",
    name: "Allergy",
    action: "Add allergy",
    icon: "allergies",
    fields: [
      { id: "name", label: "Allergic to", placeholder: "Peanuts", required: true },
      { id: "reaction", label: "Reaction", placeholder: "Hives" },
    ],
    sample: { title: "Latex", fields: [["Reaction", "Rash"], ["Type", "Contact allergy"]] },
  },
  {
    kind: "conditions",
    name: "Condition",
    action: "Add condition",
    icon: "conditions",
    fields: [
      { id: "name", label: "Condition", placeholder: "Asthma", required: true },
      { id: "since", label: "Since", placeholder: "2019" },
    ],
    sample: { title: "Hypothyroidism", fields: [["Since", "2021"], ["Status", "Active"]] },
  },
  {
    kind: "visits",
    name: "Visit",
    action: "Add visit",
    icon: "visits",
    fields: [
      { id: "name", label: "Visit", placeholder: "Dermatology visit", required: true },
      { id: "where", label: "Where", placeholder: "Coastal Skin Clinic" },
      { id: "date", label: "Date", placeholder: "Sep 2, 2026" },
    ],
    sample: { title: "Dermatology visit", fields: [["Where", "Coastal Skin Clinic, Del Mar"], ["Date", "Sep 2, 2026"], ["Seen by", "Dr. Ruiz"]] },
  },
  {
    kind: "tests",
    name: "Test result",
    action: "Add test result",
    icon: "labs",
    fields: [
      { id: "name", label: "Test", placeholder: "Cholesterol", required: true },
      { id: "result", label: "Result", placeholder: "158 mg/dL" },
      { id: "date", label: "Date", placeholder: "Aug 20, 2026" },
      { id: "where", label: "Where", placeholder: "Pharmacy" },
    ],
    sample: {
      title: "Body composition scan",
      fields: [
        ["Where", "Coastal Imaging, Del Mar"],
        ["Date", "Jul 18, 2026"],
        ["Body fat", "34.1%"],
        ["Lean mass", "101.2 lb"],
        ["Bone density, T score", "-0.6"],
        ["Visceral fat", "Being checked"],
      ],
    },
  },
  {
    kind: "immunizations",
    name: "Immunization",
    action: "Add immunization",
    icon: "immunizations",
    fields: [
      { id: "name", label: "Vaccine", placeholder: "Flu shot", required: true },
      { id: "date", label: "Date", placeholder: "Oct 1, 2026" },
    ],
    sample: { title: "Tdap booster", fields: [["Date", "Mar 3, 2024"], ["Where", "CVS Pharmacy, La Jolla"]] },
  },
  {
    kind: "procedures",
    name: "Procedure",
    action: "Add procedure",
    icon: "procedures",
    fields: [
      { id: "name", label: "Procedure", placeholder: "Colonoscopy", required: true },
      { id: "where", label: "Where", placeholder: "Scripps Memorial" },
      { id: "date", label: "Date", placeholder: "May 4, 2025" },
    ],
    sample: { title: "Knee arthroscopy", fields: [["Where", "Scripps Clinic, La Jolla"], ["Date", "May 4, 2019"]] },
  },
]

export const addKindOf = (kind: unknown) => ADD_KINDS.find((k) => k.kind === kind)

/** The kinds she says how she takes, in her own words, as she adds them:
    the doctor sees that with the medicine or supplement. */
export const asksHowTaken = (kind: unknown) => kind === "medicines" || kind === "supplements"
