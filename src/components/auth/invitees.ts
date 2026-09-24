/* Who the invitation and first sign-in are for. The same screens serve both:
   the Super Admin invited to the admin console, and a practice's clinic
   manager invited from the Practices module. A clinic manager's link carries
   `?as=clinic-manager`; without it the screens show the Super Admin. */

export type InviteeKey = "super-admin" | "clinic-manager"

export type Invitee = {
  key: InviteeKey
  firstName: string
  email: string
  /** The practice's Practice ID, typed at sign-in. The admin console has none. */
  orgId?: string
  practice?: string
  /** "Super Admin" or "Clinic Manager", as it reads in a title. */
  role: string
  consoleName: string
  consoleUrl: string
  /** Where the first sign-in ends up. */
  home: string
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
    home: "/screens/patients",
  },
}

/** Reads `?as=` from a page's search params. */
export function inviteeFrom(as: string | string[] | undefined): Invitee {
  return as === "clinic-manager" ? INVITEES["clinic-manager"] : INVITEES["super-admin"]
}

/** Keeps a clinic manager on their own path from screen to screen. */
export function withInvitee(href: string, key: InviteeKey) {
  return key === "clinic-manager" ? `${href}?as=clinic-manager` : href
}
