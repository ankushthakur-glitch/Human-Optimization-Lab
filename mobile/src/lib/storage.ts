import * as SecureStore from "expo-secure-store"
import { Platform } from "react-native"

/* Where the prototype keeps what a server would: SecureStore (Android
   Keystore, iOS Keychain) on a phone, the browser's localStorage on the web
   build, which has no secure store.

   On the web build every page load starts over: this module runs once per
   load, before the providers read anything, so a refresh finds the store
   empty, signed out and not activated, and lands on the first sign-up
   screen. Moving between screens never reloads the page, so the flow itself
   keeps its state. */
if (Platform.OS === "web" && typeof localStorage !== "undefined") {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith("hol."))
      .forEach((key) => localStorage.removeItem(key))
  } catch {}

  /* Review builds only: /?demo=paid opens signed in on the paid member's
     home (a live plan, onboarding done), so the dashboard can be shared by
     one link instead of walking through activation, onboarding and checkout.
     ?demo=free does the same for a free patient (onboarding done, consent
     signed, no membership), so the free home, record and Upgrade tab can be
     reviewed by one link too. A different ?demo= value (or ?demo=off)
     clears it. */
  try {
    // The flag is kept for the tab, so a refresh or a deep link such as
    // /log-meal?via=scan opens on the paid home's state without it.
    const asked = new URLSearchParams(window.location.search).get("demo")
    if (asked) sessionStorage.setItem("hol.demo", asked === "off" ? "" : asked)
    const demo = sessionStorage.getItem("hol.demo")
    if (demo === "free") {
      const now = new Date().toISOString()
      localStorage.setItem("hol.passwordHash", "demo")
      localStorage.setItem("hol.signedIn", "1")
      localStorage.setItem("hol.onboarding", JSON.stringify({ step: "done", consent: "signed", consentAt: now }))
    }
    if (asked === "paid" || demo === "paid") {
      const now = new Date().toISOString()
      localStorage.setItem("hol.passwordHash", "demo")
      localStorage.setItem("hol.signedIn", "1")
      localStorage.setItem(
        "hol.onboarding",
        JSON.stringify({
          step: "done",
          consent: "signed",
          consentAt: now,
          membership: {
            tier: "optimization",
            programs: ["weight"],
            startedAt: "2026-05-03T00:00:00.000Z",
            // Seven days ago, so the home reads "Day 8 of your plan".
            approvedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
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
        })
      )
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
