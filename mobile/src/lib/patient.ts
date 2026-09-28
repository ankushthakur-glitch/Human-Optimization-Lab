/* The sample patient the prototype is built around: the same person the
   patient invitation email in the web prototype is addressed to
   (src/components/auth/invitees.ts). Sample data only, never a real patient. */

export const PATIENT = {
  firstName: "Olivia",
  lastName: "Bennett",
  email: "olivia.bennett@example.com",
  practice: "Harborview Longevity Clinic",
  practicePhone: "(858) 555-0100",
  /** As printed in the invitation email. */
  oneTimePassword: "Hx4-pR8t-Lm2",
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
