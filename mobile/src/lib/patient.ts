/* The sample patient the prototype is built around: the same person the
   patient invitation email in the web prototype is addressed to
   (src/components/auth/invitees.ts). Sample data only, never a real patient. */

export const PATIENT = {
  firstName: "Olivia",
  lastName: "Bennett",
  email: "olivia.bennett@example.com",
  practice: "Harborview Longevity Clinic",
  /** As printed in the invitation email. */
  oneTimePassword: "Hx4-pR8t-Lm2",
} as const
