import * as React from "react"

import type { Allowance } from "@/lib/allowance"
import type { Answers } from "@/lib/conversation"
import type { Life } from "@/lib/wellbeing"
import type { ActivityLog, Entry, Meal, SavedQuestion } from "@/lib/member"
import { dayKey, showDate } from "@/lib/dates"
import { dayOfAt } from "@/lib/member"
import type { DrinkLog } from "@/lib/alcohol"
import type { OfferLog } from "@/lib/offers"
import type { Cadence, ProgramId, Sex, Tier } from "@/lib/plans"
import type { Intake } from "@/lib/program"
import type { MedAnswer, Origin } from "@/lib/record"
import { store } from "@/lib/storage"

/* Where a signed-in patient is in first-run setup, kept on the device so a
   patient who closes the app picks up where they left off:

   about     basic demographics, needed to match them in the national networks
   consent   the one HIPAA authorization
   connect   link Epic MyChart or Oracle Health, the two record systems
             HOL reads (optional); then "Updates about your care", where
             signing moves on to yourWhy
   life      eight 0 to 10 questions about her life, while the record arrives
   why       the "your why" conversation and the flourishing index
   records   the record builds
   tour      what the record shows: appointments, new medicines, results
             going the wrong way, biological age and what drives it
   done      the dashboard, where suggested plans are offered

   A patient who says no to the consent skips the rest and lands on the
   dashboard with nothing collected; they can connect from there later.
   After setup the same store keeps what the patient does in the app: the
   medicines they confirmed, reports they added, care gaps they booked, and
   the paid plan's setup, approval and daily log.

   A prototype with no backend: when the API exists, `save` posts each step
   and the server holds the state. */

export type Step = "about" | "consent" | "connect" | "yourWhy" | "life" | "records" | "done"

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
  /** How she pays: monthly (the default) or yearly up front. */
  billing?: Cadence
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

/** Her plan, live from the moment she enrolls: nothing goes to her
    physician for review (27 Oct 2026). Each newer version replaces the
    last, which is kept. */
export type Plan = {
  status: "live"
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

/** What she says about a medicine or supplement on her lists (FINAL-SPEC
    C.10): she takes it as listed, she takes it differently (how, in her own
    words, in `note`; an earlier build kept a `dose`), she stopped it (and
    why), she never started it, or she does not take it. Dr. Patel's list
    is never overwritten. Each answer keeps the name and the lists she saw
    when she answered, so Dr. Patel reads it against the same difference
    she did (lib/record providerAnswer), and `at` dates it ("Confirmed 12
    Oct 2026"). */
export type MedRecord = {
  /** "Atorvastatin". Missing on answers saved by an earlier build. */
  medication?: string
  /** Each list's line as she saw it, the doctor's first. */
  shown?: { origin: Origin; dose: string; date: string }[]
  answer: MedAnswer
  /** "10 mg once a day", or what she typed. Answers saved before "How do
      you take it?" only; new ones use `note`. */
  dose?: string
  why?: "side-effect" | "doctor" | "ran-out" | "other"
  /** What she typed: how she takes it ("15 mg at night") under "Taking
      differently", or what made her stop under "Something else". The
      practice's review carries it word for word (Q-23). */
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
export type Chat = { id: string; scope?: string; startedAt: string; lastAt: string; messages: unknown[]; topic?: ChatTopic; title?: string }

/** The category a conversation is filed under, chosen before it starts:
    medicines, lab results, visits, her plan, general health questions
    ("other"), or the id of a category she made (ChatCategory). */
export type ChatTopic = "medicine" | "result" | "visit" | "plan" | "other" | (string & {})

/** A chat category the patient made herself, e.g. "Thyroid" or "Foot
    surgery". */
export type ChatCategory = { id: string; name: string }

/** A conversation filed in the history when it ends or a new one starts:
    its first question as the title, its topic, and its messages so it can
    be opened again. */
export type PastChat = { id: string; title: string; topic: ChatTopic; startedAt: string; lastAt?: string; messages: unknown[] }

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
export type Channel = "push" | "sms" | "call" | "email" | "news"

export type Added = {
  id: string
  title: string
  detail: string
  at: string
  unclear?: number
  /** A photographed report: where and when it was done, and what was read
      from it, label and value ("Being checked" when unsure). */
  report?: { where: string; date: string; values: [string, string][] }
  /** A record she added to one of her lists (a medicine, an allergy...),
      typed in or read from a photo, and its label and value fields. */
  kind?: string
  fields?: [string, string][]
  /** How it was added. */
  via?: "photo" | "typed"
}

export type State = {
  step: Step
  profile?: Profile
  signedAs?: string
  /** The conversation's answers so far, and the turn the patient is on. */
  why?: Partial<Answers>
  whyAt?: number
  /** Her answers to the eight life questions (lib/wellbeing.ts). */
  life?: Life
  membership?: Membership
  /** The one authorization: signed, or not now. */
  consent?: "signed" | "declined"
  consentAt?: string
  /** How long the permission lasts before the patient is asked again. */
  consentPeriod?: string
  /** Texts about her care (new results, reminders), one of the three
      optional boxes on the consent (texts, calls, email): what she chose,
      and when (ISO). Each box she ticks turns its channel on in
      `notify`; calls and email are kept there only. */
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
  devices?: string[]
  /** Her set-up answers: goals and a few questions about her. */
  intake?: Intake
  plan?: Plan
  /** Today's ticked actions and check in, by day. */
  log?: Record<string, string[]>
  checkIn?: Record<string, string>
  /** This week's AI credit: tokens used with the assistant and the result
      batches already explained for free (lib/allowance.ts). */
  allowance?: Allowance
  /** The old count of free questions, still written by the assistant
      screen until it moves to lib/allowance.ts; read on load into
      `allowance`, then dropped. */
  asked?: { month: string; count: number }
  /** The assistant thread in progress. */
  chat?: Chat
  /** Past conversations with the assistant, newest first. */
  chats?: PastChat[]
  /** The chat categories she made, oldest first. */
  chatCategories?: ChatCategory[]
  /** Membership offers: sessions, impressions and the patient's "Not now"
      and "Not for me" (lib/offers.ts). */
  offers?: OfferLog
  /** Meals the member logged, by local day key (lib/member.ts `localDay`). */
  meals?: Record<string, Meal[]>
  /** Drinks she logged on Eat, one entry per sitting (lib/alcohol.ts). */
  drinks?: DrinkLog[]
  /** Weights, waist sizes and blood pressure readings entered by hand. */
  entries?: Entry[]
  /** Exercises and activities marked done, by local day key, then by
      exercise, session ("strength-a") or "walk". */
  exercises?: Record<string, Record<string, ActivityLog>>
  /** False when she turned off the weekly change to her lifts' weights and
      reps (lib/strength.ts); unset reads as on. */
  liftProgress?: boolean
  /** Sets, reps and weight she asked to keep going forward ("Use the same
      weights and reps going forward"), by lift id; today's target holds at
      these until she clears it (lib/strength.ts). */
  liftHolds?: Record<string, { sets: number; reps: number; load: number }>
  /** Every change she made to a lift's weight or reps ("Change weight or
      reps", or a Changed lift kept going forward), oldest first: the
      progression in her longitudinal record (lib/strength.ts). */
  liftChanges?: { at: string; lift: string; from: { sets: number; reps: number; load: number }; to: { sets: number; reps: number; load: number } }[]
  /** Questions saved for the doctor. */
  questions?: SavedQuestion[]
  /** Banners and cards the patient closed, by id, with when. */
  dismissed?: Record<string, string>
  /** Dr. Patel's check of the new record; unset reads as checking. */
  review?: Review
  /** The record's own state; unset reads as ready once consent is signed. */
  records?: Records
  /** When she turned sharing off on Access (ISO); what was collected
      stays, nothing new arrives. */
  sharingOffAt?: string
  /** The connections she disconnected on Access, by id (lib/access.ts),
      each with when (ISO). What came from them stays. */
  disconnected?: Record<string, string>
  /** Result batches that arrived after the record was built. */
  batches?: Batch[]
  /** The days (local keys) she did her one step from the why conversation,
      ticked on the free Plan tab. */
  oneStep?: string[]
  /** Every approved plan version, kept through a cancel and a rejoin
      (A-45). */
  planHistory?: Plan["versions"]
  /** What she wants her plan to improve, chosen on /goals before checkout
      (Journey_7 screen 2): the goals' labels, hers included. */
  goals?: string[]
  /** Goals she wrote herself under "Other", oldest first. */
  ownGoals?: string[]
  /** Plans she added herself from all 81 on /goal-plans, by name. */
  addedPlans?: string[]
  /** Her answers to the flourishing assessment on /goals, by question key
      ("physical.0"): 0 to 10, or "na" where she chose not to answer. */
  assessment?: Record<string, number | "na">
  /** What she changed on /health-profile (Journey_7 screen 4), by field;
      everything else stays as her record has it. */
  healthProfile?: Record<string, string>
  /** Her answers to the sleep apnea screen on /sleep-questions
      (STOP-BANG, lib/sleep-screen.ts), yes or no by question. */
  sleepScreen?: Partial<Record<import("@/lib/sleep-screen").SleepId, boolean>>
  /** The baseline tests she left ticked on /baseline (Journey_7 screen
      5); unset means all three. (Renamed from baselineTests, which held
      only the optional extras, so old saves start fresh.) */
  baselinePicks?: string[]
  /** The home sleep study and SMART program she left on at /baseline
      ("sleep", "smart"); unset means both. Priced into the total on
      /enrollment, /payment and the receipt. */
  addOns?: string[]
  /** How she chose to pay on /enrollment, before any membership exists;
      unset means yearly. */
  billingPick?: Cadence
  /** The baseline tests her membership paid for (/payment), and when she
      chose to schedule them later (/schedule-tests): until each is booked
      it waits in To do, brought up every other day. */
  startingTests?: { ids: string[]; at: string; laterAt?: string }
  /** She has seen "Your personalized plan is ready" (/plan-ready), shown
      once after her first plan is approved. */
  planReadySeen?: boolean
  /** The starting point she set before day one (/starting-point, Journey_14
      screen 29): the home measures and how much each symptom bothers her,
      0 to 10. Progress pairs every later number with these. */
  startingPoint?: { at: string; weight: number; waist: number; bother: { wake: number; irritable: number; gain: number } }
  /** How she answered each of the six topics on Today, by day (lib/topics.ts):
      the way she chose and when. `night` is Sleep's "Log what actually
      happened": bed and up as minutes after 6 pm, times woken, CPAP minutes.
      `marks` is Exercise's per exercise answer: as written, part done,
      changed or skipped. */
  topicLog?: Record<
    string,
    Partial<Record<string, { way: string; at: string; parts?: string[]; skipped?: string[]; marks?: Record<string, "written" | "part" | "changed" | "skipped">; minutes?: number; note?: string; night?: { bed: number; up: number; latency?: number; woke: number; cpap: number } }>>
  >
  /** Apps and devices she connected from a topic's ways ("Connect your
      device", "Import from another app"), by name. */
  linkedApps?: string[]
  /** The measurements beyond weight and waist (entries holds those two),
      by day, in inches. */
  measures?: Record<string, Partial<Record<"chest" | "hips" | "thigh" | "arm", number>>>
  /** The plan's sample profile (lib/member.ts PROFILES): weight, blood
      sugar and heart, or bone. Weight when unset. */
  memberFocus?: "weight" | "bone"
  /** Inlay score check ins, oldest first (ISO day, score). */
  scores?: { at: string; value: number }[]
  /** Today's coach question (lib/coach.ts): which one was asked on which
      day, her reply, or "Not now". */
  coach?: { day: string; id: string; answer?: string; later?: boolean }
  /** Care gaps the record shows as done, with the day (ISO). */
  gapsDone?: Record<string, string>
  /** Review build switches, set from /demo only: the steady record for
      /demo/free-steady, and the weekly card shown on any day. */
  demo?: {
    steady?: boolean
    forceWeekCard?: boolean
    assistantVersion?: 1 | 2
    /** Home variation: no "Ask Inlay" words under the orb; the app tour's
        second stop names it instead. */
    tourNamesAsk?: boolean
    /** Home variation: no words under the orb; a tooltip over it says
        "Ask Inlay" for a few seconds, every few seconds. */
    orbTooltip?: boolean
  }
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
    end on a plans step (that's on the dashboard now), and had a why
    conversation and a record tour, both gone (25 Oct 2026); a medicine answer
    used to be a bare word; the free questions used to be a bare count
    (`asked`), now this week's AI credit (`allowance`), with one
    placeholder conversation for each question already asked; their
    tokens are estimated on load (lib/allowance.ts). */
function migrate(parsed: State & Record<string, unknown>): State {
  if ((parsed.step as string) === "plans" || (parsed.step as string) === "tour") parsed.step = "done"
  if ((parsed.step as string) === "why") parsed.step = "records"
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
  // A plan saved while it waited on the physician (before 27 Oct 2026)
  // goes live: nothing waits on review now.
  const plan = parsed.plan as (Omit<Plan, "status"> & { status: string; requests?: unknown }) | undefined
  if (plan && plan.status !== "live") {
    const versions = plan.versions.length ? plan.versions : [{ version: plan.version, approved: showDate(), why: "Your first plan" }]
    parsed.plan = { status: "live", version: Math.max(...versions.map((v) => v.version)), versions }
  }
  delete parsed.testReview
  delete parsed.testPay
  return parsed
}

/** For now a refresh starts today over: what was ticked off today (meals,
    exercises, the walk, weigh ins, blood pressure and the Plan's topics) is
    cleared, so the to-do reads as not done. Earlier days stay for the trends. */
function startToday(state: State): State {
  const today = dayKey()
  const { [today]: _meals, ...meals } = state.meals ?? {}
  const { [today]: _exercises, ...exercises } = state.exercises ?? {}
  const { [today]: _topics, ...topicLog } = state.topicLog ?? {}
  return { ...state, meals, exercises, topicLog, entries: state.entries?.filter((e) => dayOfAt(e.at) !== today) }
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
        const fresh = startToday(migrate(JSON.parse(saved)))
        current.current = fresh
        setState(fresh)
        return store.setItemAsync(KEY, JSON.stringify(fresh))
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
  connect: "/onboarding/connect-records",
  yourWhy: "/onboarding/your-why",
  life: "/onboarding/life",
  records: "/onboarding/syncing?ready=1",
} as const
