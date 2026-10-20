import { showDate } from "@/lib/dates"
import { PATIENT } from "@/lib/patient"

/* The consent's terms, shared by the consent screen and its
   sheets. Sample wording until Inlay Health's lawyer returns the final
   form (same text as the web prototype's consent). */

/** How long collection runs: one permission for a set period, rather than
    one for every pull. */
export const PERIODS = ["15d", "1m", "3m"]

export const DEFAULT_PERIOD = "1m"

export const LEGAL = [
  `I authorize Inlay Health to request, receive and store my health records from my healthcare providers, hospitals, laboratories and imaging centers, through national health information networks, and to share them with ${PATIENT.practice} for my care.`,
  "This includes visit notes, lab results, medications, conditions, allergies, procedures, immunizations and reports. It may include sensitive information such as mental health or substance use records where the law allows.",
  "Inlay Health protects this information as required by HIPAA. Information shared under this authorization may no longer be protected by federal privacy law if it is disclosed again by the recipient.",
  "This authorization lasts for the period I choose, and I will be asked before it is renewed. I can withdraw it at any time in the app, which stops future collection but does not undo information already shared. Inlay Health records the date I signed it and exactly what it covers.",
  "My treatment by my practice does not depend on signing this authorization.",
]

/** The documents the consent's statements link to, each opened in a
    sheet. Reading them is never required to tick a box. */
export type Doc = "authorization" | "privacy" | "terms" | "lab" | "texts"

/* Each document's current version and the day it took effect, as published
   in the Super Admin's Settings > Consent documents. */
export const DOCS: Record<Doc, { title: string; version: number; effective: string; text: string[] }> = {
  authorization: { title: "HIPAA authorization", version: 1, effective: "2026-09-22", text: LEGAL },
  privacy: {
    version: 2,
    effective: "2026-10-01",
    title: "Privacy policy",
    text: [
      "Inlay Health collects the health records you authorize, the answers you give in the app and how you use it, to build your record and support your care.",
      `We share your information with ${PATIENT.practice}, the labs you choose and the services that run Inlay for us, under agreements that protect it. We never sell it.`,
      "You can see your information, ask us to correct it and turn sharing off at any time in the app.",
    ],
  },
  terms: {
    version: 1,
    effective: "2026-09-22",
    title: "Terms of service",
    text: [
      "Inlay Health gives you a copy of your health record, tools to understand it and a way to work on it with your practice. It does not replace your doctor or emergency care. In an emergency, call 911.",
      "You agree to give accurate information, keep your password private and use the app for your own care.",
      "Your free record stays free. Paid plans are billed as shown before you join, and you can cancel at any time.",
      "We will tell you in the app before these terms change.",
    ],
  },
  lab: {
    version: 1,
    effective: "2026-09-22",
    title: "Lab request terms",
    text: [
      "When you book a test through Inlay, a licensed physician reviews the request and orders it, and a partner lab collects your sample and runs the test.",
      "Your results go to your record and to your practice, whose doctors review anything that needs follow up.",
      "Tests paid through Inlay are billed at the price shown when you book, not to your insurance.",
    ],
  },
  texts: {
    version: 1,
    effective: "2026-09-22",
    title: "Messaging terms",
    text: [
      "Inlay Health will text and message you about your care, such as new results, reminders and notes from your care team. How often depends on your care.",
      "Message and data rates may apply. Reply “Stop” at any time to stop texts, or “Help” for help. You can also turn texts off in Profile.",
      "Agreeing to texts is not required to use Inlay.",
    ],
  },
}

const LABELS: Record<string, string> = { "15d": "15 days", "1m": "1 month", "3m": "3 months" }
const MONTHS: Record<string, number> = { "1m": 1, "3m": 3 }
const DAYS: Record<string, number> = { "15d": 15 }

export const periodLabel = (p: string) => LABELS[p] ?? LABELS[DEFAULT_PERIOD]

/** The day a period started on `from` runs out. A period this build no
    longer offers reads as the default, as its label does. */
export function periodEnd(p: string, from: Date = new Date()) {
  const d = new Date(from)
  if (DAYS[p]) d.setDate(d.getDate() + DAYS[p])
  else d.setMonth(d.getMonth() + (MONTHS[p] ?? MONTHS[DEFAULT_PERIOD]))
  return d
}

/** The day collection stops if signed today. */
export const endDate = (p: string) => showDate(periodEnd(p))

/** "Version 2, effective Oct 1, 2026", shown under a document's text. */
export function docVersionLine(doc: Doc) {
  const { version, effective } = DOCS[doc]
  const [y, m, d] = effective.split("-").map(Number)
  return `Version ${version}, effective ${showDate(new Date(y, m - 1, d))}`
}
