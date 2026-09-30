import * as React from "react"

import type { Answers } from "@/lib/conversation"
import type { ProgramId, Sex, Tier } from "@/lib/plans"
import type { Intake, SetupStep } from "@/lib/program"
import type { MedAnswer } from "@/lib/record"
import { store } from "@/lib/storage"

/* Where a signed-in patient is in first-run setup, kept on the device so a
   patient who closes the app picks up where they left off:

   about     basic demographics, needed to match them in the national networks
   consent   the one HIPAA authorization
   why       the "your why" conversation and the flourishing index
   records   the record builds
   done      the dashboard, where suggested plans are offered

   A patient who says no to the consent skips the rest and lands on the
   dashboard with nothing collected; they can connect from there later.
   After setup the same store keeps what the patient does in the app: the
   medicines they confirmed, reports they added, care gaps they booked, and
   the paid plan's setup, approval and daily log.

   A prototype with no backend: when the API exists, `save` posts each step
   and the server holds the state. */

export type Step = "about" | "consent" | "why" | "records" | "done"

export type Profile = {
  firstName: string
  lastName: string
  preferredName: string
  dateOfBirth: string
  sex: Sex
  phone: string
  street: string
  city: string
  state: string
  zip: string
}

export type Membership = {
  tier: Tier
  programs: ProgramId[]
  /** A paused plan keeps its history; the free record carries on. */
  paused?: boolean
}

/** The plan is a draft until the doctor approves it; each approved
    version replaces the last, which is kept. */
export type Plan = {
  status: "review" | "live"
  version: number
  versions: { version: number; approved: string; why: string }[]
}

export type Added = { id: string; title: string; detail: string; at: string; unclear?: number }

type State = {
  step: Step
  profile?: Profile
  signedAs?: string
  /** The conversation's answers so far, and the turn the patient is on. */
  why?: Partial<Answers>
  whyAt?: number
  membership?: Membership
  /** The one authorization: signed, or not now. */
  consent?: "signed" | "declined"
  consentAt?: string
  /** How long the permission lasts before the patient is asked again. */
  consentMonths?: number
  /** What the patient says about each medicine on their lists. */
  meds?: Record<string, MedAnswer>
  /** Reports photographed and things the patient told Inlay. */
  added?: Added[]
  /** Care gaps the patient says they booked, with when they said so. */
  booked?: Record<string, string>
  /** Paid setup, step by step. */
  setupDone?: SetupStep[]
  intake?: Intake
  devices?: string[]
  foodLogging?: string
  tests?: Record<string, string>
  plan?: Plan
  /** Today's ticked actions and check in, by day. */
  log?: Record<string, string[]>
  checkIn?: Record<string, string>
  /** Free AI questions asked this month. */
  asked?: { month: string; count: number }
}

type Onboarding = State & {
  loaded: boolean
  save: (patch: Partial<State>) => Promise<void>
  reset: () => Promise<void>
}

const KEY = "hol.onboarding"
const START: State = { step: "about" }

const OnboardingContext = React.createContext<Onboarding | null>(null)

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<State>(START)
  const [loaded, setLoaded] = React.useState(false)
  const current = React.useRef(state)
  current.current = state

  React.useEffect(() => {
    store
      .getItemAsync(KEY)
      .then((saved) => {
        if (!saved) return
        const parsed = JSON.parse(saved)
        // Setup used to end on a plans step; that's on the dashboard now.
        if (parsed.step === "plans") parsed.step = "done"
        setState(parsed)
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  const value = React.useMemo<Onboarding>(
    () => ({
      ...state,
      loaded,
      async save(patch) {
        const next = { ...current.current, ...patch }
        current.current = next
        setState(next)
        await store.setItemAsync(KEY, JSON.stringify(next))
      },
      async reset() {
        current.current = START
        setState(START)
        await store.deleteItemAsync(KEY)
      },
    }),
    [state, loaded]
  )

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
}

export function useOnboarding() {
  const onboarding = React.useContext(OnboardingContext)
  if (!onboarding) throw new Error("useOnboarding must be used inside <OnboardingProvider>")
  return onboarding
}

/** The screen each step opens on. */
export const STEP_ROUTE = {
  about: "/onboarding/about-you",
  consent: "/onboarding/consent",
  why: "/onboarding/why",
  records: "/onboarding/syncing",
} as const
