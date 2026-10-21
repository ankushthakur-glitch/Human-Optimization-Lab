/* The sample patient the prototype is built around: the same person as the
   first sample patient in the web portal (src/components/practice/
   practice-data.ts). Sample data only, never a real patient. */

export const PATIENT = {
  firstName: "Olivia",
  lastName: "Bennett",
  email: "olivia.bennett@example.com",
  practice: "Harborview Longevity Clinic",
  practicePhone: "(858) 555-0100",
  /** The one-time activation code the patient is sent with their invite. */
  activationCode: "731064",
} as const

/** The demographics the practice holds (from its EHR or the bulk import),
    shown to the patient view only during setup. */
export const DEMOGRAPHICS = {
  firstName: PATIENT.firstName,
  lastName: PATIENT.lastName,
  preferredName: "Liv",
  dateOfBirth: "03/14/1981",
  sex: "female",
  phone: "(619) 555-0143",
  street: "2140 Coast Boulevard, Apt 3",
  city: "Del Mar",
  state: "CA",
  zip: "92014",
} as const

/** The practice's people the patient sees in the app. Sample names. */
export const CARE_TEAM = [
  { name: "Dr. Maya Patel", role: "Physician" },
  { name: "Sam Ortiz", role: "Care coordinator" },
  { name: "Priya Nair", role: "Health coach" },
] as const
