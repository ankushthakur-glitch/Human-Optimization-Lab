/* Who the invitation and first sign-in are for. The same screens serve
   three people: the Super Admin invited to the admin console, a practice's
   clinic manager invited from the Practices module, and a provider the
   clinic manager invites to the provider portal. The link carries
   `?as=clinic-manager` or `?as=provider`; without it the screens show the
   Super Admin. A patient gets only the invitation email (`?as=patient` on the
   email screens): it sends them to download the patient app and activate
   there (mobile/), never to these web sign-in screens. */

export type InviteeKey = "super-admin" | "clinic-manager" | "provider" | "patient"

/** Who sent the invitation: named in the letter and its contact footer. */
export type Sender = {
  name: string
  title: string
  email: string
  website: string
  phone: string
  address: string
}

const CLINIC_MANAGER: Sender = {
  name: "Marcus Whitfield",
  title: "Clinic Manager",
  email: "marcus.whitfield@harborviewlongevity.com",
  website: "harborviewlongevity.com",
  phone: "(229) 555-0142",
  address: "450 Harbor Drive, Anytown, CA 12345",
}

const PLATFORM_ADMIN: Sender = {
  name: "Maya Chen",
  title: "Platform Admin",
  email: "maya.chen@humanoptimization.com",
  website: "humanoptimizationlab.com",
  phone: "(229) 555-0109",
  address: "123 Main Street, Anytown, CA 12345",
}

/* The patient's practice writes to them in the name of their physician.
   The same sample practice and physician as the patient app
   (mobile/src/lib/patient.ts). */
const PHYSICIAN: Sender = {
  name: "Dr. Maya Patel",
  title: "Physician",
  email: "care@harborviewlongevity.com",
  website: "harborviewlongevity.com",
  phone: "(858) 555-0100",
  address: "450 Harbor Drive, Anytown, CA 12345",
}

/** The 6-digit activation code a staff invitation carries, entered on the
    page its Activate account button opens. Sample value: the prototype takes
    any six digits except 000000. */
export const ACTIVATION_CODE = "482915"

export type Invitee = {
  key: InviteeKey
  firstName: string
  email: string
  /** The practice's Practice ID, typed at sign-in. The admin console has none. */
  orgId?: string
  practice?: string
  /** "Super Admin", "Clinic Manager" or "Provider", as it reads in a title. */
  role: string
  consoleName: string
  consoleUrl: string
  /** Where the first sign-in ends up. */
  home: string
  /** The one-time code in the invitation, in place of a password. */
  activationCode: string
  sender: Sender
}

export const INVITEES: Record<InviteeKey, Invitee> = {
  "super-admin": {
    key: "super-admin",
    firstName: "Jordan",
    email: "jordan.reyes@humanoptimization.com",
    role: "Super Admin",
    consoleName: "Admin Console",
    consoleUrl: "admin.humanoptimizationlab.com/activate",
    home: "/screens/admin/practices",
    activationCode: ACTIVATION_CODE,
    sender: PLATFORM_ADMIN,
  },
  "clinic-manager": {
    key: "clinic-manager",
    firstName: "Marcus",
    email: "marcus.whitfield@harborviewlongevity.com",
    orgId: "954150",
    practice: "Harborview Longevity Clinic",
    role: "Clinic Manager",
    consoleName: "Practice Portal",
    consoleUrl: "portal.humanoptimizationlab.com/activate",
    home: "/screens/practice/users",
    activationCode: ACTIVATION_CODE,
    sender: PLATFORM_ADMIN,
  },
  /* Elise Harrington (PR3132 in the practice's sample data). */
  provider: {
    key: "provider",
    firstName: "Elise",
    email: "elise.harrington@harborviewlongevity.com",
    orgId: "954150",
    practice: "Harborview Longevity Clinic",
    role: "Provider",
    consoleName: "Provider Portal",
    consoleUrl: "portal.humanoptimizationlab.com/activate",
    home: "/screens/patients/dashboard",
    activationCode: ACTIVATION_CODE,
    sender: CLINIC_MANAGER,
  },
  /* Olivia Bennett, the patient app's sample patient: the code and email are
     the ones its activation screen accepts. */
  patient: {
    key: "patient",
    firstName: "Olivia",
    email: "olivia.bennett@example.com",
    practice: "Harborview Longevity Clinic",
    role: "Patient",
    consoleName: "Inlay Health app",
    consoleUrl: "app.inlayhealth.com/activate",
    home: "/app",
    activationCode: "731064",
    sender: PHYSICIAN,
  },
}

/** Reads `?as=` from a page's search params. Staff only: a patient never
    signs in on the web screens. */
export function inviteeFrom(as: string | string[] | undefined): Invitee {
  return as === "clinic-manager" || as === "provider"
    ? INVITEES[as]
    : INVITEES["super-admin"]
}

/** Reads `?as=` on the invitation email screens, which also serve a patient. */
export function emailInviteeFrom(as: string | string[] | undefined): Invitee {
  return as === "patient" ? INVITEES.patient : inviteeFrom(as)
}

/** Keeps a clinic manager or provider on their own path from screen to screen. */
export function withInvitee(href: string, key: InviteeKey) {
  return key === "super-admin" ? href : `${href}?as=${key}`
}

/** Whose portal a signed-in path belongs to, so a sign-in that interrupts
    it (an expired session) comes back to the same portal. */
export function inviteeForPath(path: string): InviteeKey {
  if (path.startsWith("/screens/practice")) return "clinic-manager"
  if (path.startsWith("/screens/patients")) return "provider"
  return "super-admin"
}

/** A `?next=` worth following: a screen in this app, never another site. */
export function safeNext(next: string | string[] | undefined) {
  return typeof next === "string" &&
    next.startsWith("/screens/") &&
    !next.startsWith("//")
    ? next
    : undefined
}

/** Sign in again after the session ran out on `from`: the sign-in screen for
    that portal's person, which then returns to `from`. */
export function signInAgainHref(from: string | undefined) {
  const next = safeNext(from)
  if (!next) return "/screens/login"
  const query = new URLSearchParams()
  const key = inviteeForPath(next)
  if (key !== "super-admin") query.set("as", key)
  query.set("next", next)
  return `/screens/login?${query}`
}
