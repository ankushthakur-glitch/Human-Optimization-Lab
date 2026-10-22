import * as SecureStore from "expo-secure-store"
import { Platform } from "react-native"

import type { State, Step } from "@/lib/onboarding"
import { DEMOGRAPHICS } from "@/lib/patient"

/** Screens open whatever the account state, or before signing in. */
const SIGNED_OUT = ["activate", "sign-in", "errors", "session-expired"]

/** The member's own pages: her day, progress and billing. */
const MEMBER = ["today", "review", "diet", "log-meal", "exercise", "day", "progress", "history", "membership", "plan-ready"]

/** Each setup screen and the step it belongs to. */
const STEPS: Record<string, Step> = {
  "about-you": "about",
  consent: "consent",
  "connect-records": "connect",
  "consent-texts": "connect",
  "your-why": "yourWhy",
  life: "life",
  "life-question": "life",
  why: "why",
  syncing: "records",
  trends: "tour",
  "biological-age": "tour",
  "what-is-driving-it": "tour",
}
const ORDER: Step[] = ["about", "consent", "connect", "yourWhy", "life", "why", "records", "tour", "done"]

/** What the store starts with for a page load on `pathname`: nothing (a
    signed-out start), "code" (the activation code accepted, for set
    password) or the onboarding state to sign in with. */
function seedFor(pathname: string, query: URLSearchParams): "code" | Partial<State> | undefined {
  const parts = pathname.replace(/^\/app(?=\/|$)/, "").split("/").filter(Boolean)
  const [first, second] = parts
  const now = new Date().toISOString()
  const free: Partial<State> = { step: "done", profile: { ...DEMOGRAPHICS }, consent: "signed", consentAt: now }
  if (!first) {
    if (query.get("demo") === "paid") return paid(free)
    return [...query.keys()].length > 0 ? free : undefined
  }
  if (SIGNED_OUT.includes(first) || first.startsWith("+")) return undefined
  if (first === "set-password") return "code"
  if (first === "onboarding") {
    const step = STEPS[second ?? ""] ?? "about"
    const past = (s: Step) => ORDER.indexOf(step) > ORDER.indexOf(s)
    return {
      step,
      ...(past("about") && { profile: { ...DEMOGRAPHICS } }),
      ...(past("connect") && { consent: "signed", consentAt: now }),
    }
  }
  return MEMBER.includes(first) ? paid(free) : free
}

/** The paid member: a live plan, version 2, on the weight program. */
function paid(free: Partial<State>): Partial<State> {
  return {
    ...free,
    membership: {
      tier: "optimization",
      programs: ["weight"],
      startedAt: "2026-05-03T00:00:00.000Z",
      approvedAt: "2026-05-18T00:00:00.000Z",
      card: "Visa ending 4242",
      billing: "monthly",
      renewalConsentAt: "2026-05-03T00:00:00.000Z",
    },
    plan: {
      status: "live",
      version: 2,
      versions: [
        { version: 2, approved: "Sep 12, 2026", why: "Your home blood pressure readings were above your range in late August." },
        { version: 1, approved: "May 18, 2026", why: "Your first plan, built from your record, your questionnaire and your why." },
      ],
    },
    planReadySeen: true,
  }
}

/* Where the prototype keeps what a server would: SecureStore (Android
   Keystore, iOS Keychain) on a phone, the browser's localStorage on the web
   build, which has no secure store.

   On the web build every page load starts over: this module runs once per
   load, before the providers read anything, so a refresh finds the store
   empty, signed out and not activated, and lands on the first sign-up
   screen, unless the link names a page past it (below). Moving between
   screens never reloads the page, so the flow itself keeps its state. */
if (Platform.OS === "web" && typeof localStorage !== "undefined") {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith("hol."))
      .forEach((key) => localStorage.removeItem(key))
  } catch {}

  /* Review builds only: a link opens the page it names. A first load on
     any page past sign in starts as the sample patient at that point of
     the journey (a setup step, the free record, or a paid member for the
     member's day), so each page can be shared by its own link instead of
     walking through activation, onboarding and checkout. The bare /app,
     which the installed app opens, still starts at activation; /?home=1
     opens the free home and /?demo=paid the paid member's home. */
  try {
    const seed = seedFor(window.location.pathname, new URLSearchParams(window.location.search))
    if (seed) {
      if (seed === "code") localStorage.setItem("hol.codeAccepted", "1")
      else {
        localStorage.setItem("hol.passwordHash", "demo")
        localStorage.setItem("hol.signedIn", "1")
        localStorage.setItem("hol.onboarding", JSON.stringify(seed))
      }
    }
  } catch {}
}

export const store =
  Platform.OS === "web"
    ? {
        getItemAsync: async (key: string) => localStorage.getItem(key),
        setItemAsync: async (key: string, value: string) => localStorage.setItem(key, value),
        deleteItemAsync: async (key: string) => localStorage.removeItem(key),
      }
    : SecureStore
