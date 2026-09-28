import * as React from "react"

import type { ProgramId, Sex, Tier } from "@/lib/plans"
import { store } from "@/lib/storage"

/* Where a signed-in patient is in first-run setup, kept on the device so a
   patient who closes the app picks up where they left off:

   about     basic demographics, needed to match them in the national networks
   consent   the one HIPAA authorization
   records   the record builds
   done      the dashboard, where suggested plans are offered

   A prototype with no backend: when the API exists, `save` posts each step
   and the server holds the state. */

export type Step = "about" | "consent" | "records" | "done"

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

export type Membership = { tier: Tier; programs: ProgramId[] }

type State = { step: Step; profile?: Profile; signedAs?: string; membership?: Membership }

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
  records: "/onboarding/syncing",
} as const
