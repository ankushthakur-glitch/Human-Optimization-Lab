import * as React from "react"

import type { Allowance } from "@/lib/allowance"
import type { Answers } from "@/lib/conversation"
import type { ActivityLog, Entry, Meal, SavedQuestion } from "@/lib/member"
import type { OfferLog } from "@/lib/offers"
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
  /** The day she joined (ISO). */
  startedAt?: string
  /** Version 1 approved (ISO): the first charge, and her billing day each
      month. */
  approvedAt?: string
  /** "Visa ending 4242" */
  card?: string
  /** When she ticked the renewal box at checkout (ISO). */
  renewalConsentAt?: string
  /** When a cancelled membership went back to the free record (ISO): no
      offers for 90 days after it, except on the Plan tab. */
  cancelledAt?: string
  /** The end of the paid month after cancelling (ISO): she stays a member
      until then (lib/member.ts memberStage), then the free record. */
  endsAt?: string
  /** The cards her earlier charges were made with, oldest first, each with
      the moment she changed from it (ISO). A receipt names the card in use
      on its day, so changing the card never rewrites the history. */
  pastCards?: { card: string; until: string }[]
}

/** The plan is a draft until the doctor approves it; each approved
    version replaces the last, which is kept. */
export type Plan = {
  status: "review" | "live"
  version: number
  versions: { version: number; approved: string; why: string }[]
}

/** A test booked with a cash partner: where, when, what it cost, and the
    day it was paid. `when` is the words ("Tue, Oct 6, 7:30 AM"); `at` is
    the booked day (a local day key, "2026-10-06", or an ISO time) and
    `time` its time ("7:30 AM"), so lists can sort it and draw a date
    block. A booking she made herself ("I booked it"), or a starting test
    booked through her plan, has no price and nothing paid through Inlay:
    whoever lists payments skips it. */
export type Booking = { where: string; when: string; price?: string; paid?: string; at?: string; time?: string }

/** What she says about a medicine on her lists (FINAL-SPEC C.10): she
    takes it, at another dose (what she typed in `dose`), she stopped it
    (and why), she never started it, or she does not take it. Dr. Patel's
    list is never overwritten. */
export type MedRecord = {
  answer: MedAnswer
  /** "10 mg once a day", or what she typed. */
  dose?: string
  why?: "side-effect" | "doctor" | "ran-out" | "other"
  /** What she typed under "Something else" when she says why she stopped:
      what the practice's review of her answer carries (Q-23). */
  note?: string
  /** When she answered (ISO). */
  at: string
}

/** Her answer to an open test that is not a booking (Q-22, C.8.1): done
    somewhere else, so the result is on its way, or her doctor said she
    does not need it, which Dr. Patel's team confirms. */
export type OpenTestAnswer = { answer: "elsewhere" | "not-needed"; at: string }

/** A correction she asked for on her record (S-16): what she said should
    change, about which item, and when. Dr. Patel's team reviews it. */
export type Correction = { id: string; text: string; about?: string; at: string }

/** One thread with the assistant, kept 30 minutes after its last message
    so closing and opening the chat carries on (A-34). */
export type Chat = { id: string; scope?: string; startedAt: string; lastAt: string; messages: unknown[] }

/** Dr. Patel's check of the newly built record (F-13): checking, then
    checked on a day, which the home says for seven days. */
export type Review = { status: "checking" | "checked"; at?: string }

/** The record itself: still arriving from the places it was found, or
    ready. `at` is when it came together; `got` of `of` places have
    answered while it builds; `notFound` names a place with no records. */
export type Records = { status: "building" | "ready"; at?: string; got?: number; of?: number; notFound?: string }

/** A batch of new results that reached the record (a lab panel), until she
    opens it. */
export type Batch = { id: string; at: string; source: string; count: number; opened?: boolean }

/** How she hears from Inlay: push, texts and email about her care, and
    "News and offers", a separate marketing consent that stays off unless
    she turns it on (S-57, Q-11). */
export type Channel = "push" | "sms" | "email" | "news"

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
  consentPeriod?: string
  /** Texts and messages about her care (new results, reminders), the
      optional box on the consent: what she chose, and when (ISO). Off
      unless she ticks it; ticking it turns texts on in `notify`. */
  smsConsent?: boolean
  smsConsentAt?: string
  /** What the patient says about each medicine on their lists. */
  meds?: Record<string, MedRecord>
  /** Reports photographed and things the patient told Inlay. */
  added?: Added[]
  /** Care gaps the patient says they booked, with when they said so. */
  booked?: Record<string, string>
  /** Tests booked and paid for through Inlay, by order (or by starting
      test, for a member's plan), and tests she told us she booked. */
  bookings?: Record<string, Booking>
  /** Her other answers to an open test, by order (Q-22). */
  testAnswers?: Record<string, OpenTestAnswer>
  /** Corrections she asked for on her record, oldest first. */
  corrections?: Correction[]
  /** How the patient wants to hear from Inlay; a channel never set reads
      as its default (news and offers off). */
  notify?: Partial<Record<Channel, boolean>>
  /** Face ID asked for each time the app opens. */
  faceId?: boolean
  /** Notifications the patient has opened. */
  seen?: string[]
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
  /** This month's free conversations with the assistant and the result
      batches already explained for free (lib/allowance.ts). */
  allowance?: Allowance
  /** The old count of free questions, still written by the assistant
      screen until it moves to lib/allowance.ts; read on load into
      `allowance`, then dropped. */
  asked?: { month: string; count: number }
  /** The assistant thread in progress. */
  chat?: Chat
  /** Membership offers: sessions, impressions and the patient's "Not now"
      and "Not for me" (lib/offers.ts). */
  offers?: OfferLog
  /** Meals the member logged, by local day key (lib/member.ts `localDay`). */
  meals?: Record<string, Meal[]>
  /** Weights, waist sizes and blood pressure readings entered by hand. */
  entries?: Entry[]
  /** Exercises and activities marked done, by local day key, then by
      exercise, session ("strength-a") or "walk". */
  exercises?: Record<string, Record<string, ActivityLog>>
  /** Questions saved for the doctor. */
  questions?: SavedQuestion[]
  /** Banners and cards the patient closed, by id, with when. */
  dismissed?: Record<string, string>
  /** Dr. Patel's check of the new record; unset reads as checking. */
  review?: Review
  /** The record's own state; unset reads as ready once consent is signed. */
  records?: Records
  /** When she turned sharing off in Profile (ISO); what was collected
      stays, nothing new arrives. */
  sharingOffAt?: string
  /** Result batches that arrived after the record was built. */
  batches?: Batch[]
  /** The days (local keys) she did her one step from the why conversation,
      ticked on the free Plan tab. */
  oneStep?: string[]
  /** Every approved plan version, kept through a cancel and a rejoin
      (A-45). */
  planHistory?: Plan["versions"]
  /** The plan's sample profile (lib/member.ts PROFILES): weight, blood
      sugar and heart, or bone. Weight when unset. */
  memberFocus?: "weight" | "bone"
  /** Inlay score check ins, oldest first (ISO day, score). */
  scores?: { at: string; value: number }[]
  /** Care gaps the record shows as done, with the day (ISO). */
  gapsDone?: Record<string, string>
  /** Review build switches, set from /demo only: the steady record for
      /demo/free-steady, and the weekly card shown on any day. */
  demo?: { steady?: boolean; forceWeekCard?: boolean }
}

type Onboarding = State & {
  loaded: boolean
  save: (patch: Partial<State>) => Promise<void>
  reset: () => Promise<void>
}

const KEY = "hol.onboarding"
const START: State = { step: "about" }

const OLD_MED_ANSWER: Record<string, MedAnswer> = { not: "not-taking", different: "dose" }

/** A store saved by an earlier build, brought up to date: setup used to
    end on a plans step (that's on the dashboard now); a medicine answer
    used to be a bare word; the free questions used to be a bare count
    (`asked`), now a list of this month's conversations (`allowance`), with
    one placeholder conversation for each question already asked. */
function migrate(parsed: State & Record<string, unknown>): State {
  if ((parsed.step as string) === "plans") parsed.step = "done"
  if (parsed.meds) {
    const at = new Date().toISOString()
    parsed.meds = Object.fromEntries(
      Object.entries(parsed.meds as Record<string, MedRecord | string>).map(([id, a]) => [
        id,
        typeof a === "string" ? { answer: OLD_MED_ANSWER[a] ?? (a as MedAnswer), at } : a,
      ])
    )
  }
  if (parsed.asked) {
    const { month, count } = parsed.asked
    if (!parsed.allowance && month && count > 0)
      parsed.allowance = { month, threads: Array.from({ length: count }, (_, i) => `asked-${i + 1}`), batches: [] }
    delete parsed.asked
  }
  return parsed
}

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
        setState(migrate(JSON.parse(saved)))
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
