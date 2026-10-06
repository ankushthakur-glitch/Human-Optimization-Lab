import * as React from "react"

import { needsHelp } from "@/lib/conversation"
import { weekKey, weekStart } from "@/lib/dates"
import { membershipOn } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"

/* The free record's questions to the assistant (F-100 to F-104, Q-02): 8 a
   week, counted per conversation, so a follow up in the same chat is free.
   Never counted: anything about safety (chest pain, stroke signs, a severe
   allergic reaction, thoughts of self harm), anything about the plan, the
   membership, its price, billing or cancelling, and the first explanation
   of each new batch of results. Opening the chat, opening it about one
   result or seeing suggested questions costs nothing until she sends one
   (A-42).

   The 5 Oct 2026 call: the free record renews on its own and can't top up; a
   member has a higher cap and can add more (TOP_UP). A chat in progress
   when the credit runs out is never cut off (6 Oct 2026, the grace
   proposal): once a week it finishes on GRACE taken from next week,
   with no button and no word for it but one quiet line. A new chat at the
   cap gets no grace: wait for Monday, or upgrade.

   The credit renews weekly (user, 6 Oct 2026), every Monday where she
   lives (A-40): "Mon, Oct 12". The store keeps this week's counted
   conversations (`allowance`) under the local week key, its Monday; the
   field is still called `month` from when it renewed monthly. */

type Snapshot = Parameters<ReturnType<typeof useOnboarding>["save"]>[0]
type Save = ReturnType<typeof useOnboarding>["save"]

/** Free conversations a week (Q-02 default; configurable from 5 to 10).
    Members have no count. */
export const FREE_QUESTIONS = 8

/** A member's conversations a week (5 Oct call: a higher cap). */
export const MEMBER_QUESTIONS = 40

/** Grace: a chat in progress at the cap finishes on one conversation
    taken off next week's count, once a week. */
export const GRACE = 1

/** A member's top up: more conversations for this week only. The price
    is a stand in until the client sets it. */
export const TOP_UP = { conversations: 20, price: "$5" } as const

/** A conversation stays open this long after its last message; a message
    after that starts a new one. */
export const CONVERSATION_MINUTES = 30

/** This week's conversations (store field `allowance`): the week (its
    local Monday, "2026-10-05", in `month`), the conversations already
    counted, the result batches already explained for free (kept from week
    to week), the grace taken from next week, what last week took from this
    one, and what a member added. */
export type Allowance = { month: string; threads: string[]; batches: string[]; borrowed?: number; owed?: number; bought?: number }

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** The day the credit comes back: next Monday, "Mon, Oct 12". */
export function resetDate(now: Date = new Date()) {
  const next = weekStart(now)
  next.setDate(next.getDate() + 7)
  return `Mon, ${MONTHS[next.getMonth()]} ${next.getDate()}`
}

/** The allowance as this week has it: last week's conversations, its
    grace and its top up drop, its grace is owed now, and the explained
    batches stay. */
function current(a: Allowance | undefined, now: Date): Allowance {
  const week = weekKey(now)
  if (a?.month === week) return { ...a, threads: a.threads ?? [], batches: a.batches ?? [] }
  const last = new Date(now)
  last.setDate(last.getDate() - 7)
  return { month: week, threads: [], batches: a?.batches ?? [], owed: a?.month === weekKey(last) ? (a.borrowed ?? 0) : 0 }
}

/** This week's cap: the plan's own, less last week's grace, plus this
    week's grace and what was added. */
function capOf(a: Allowance, member: boolean) {
  return (member ? MEMBER_QUESTIONS : FREE_QUESTIONS) - (a.owed ?? 0) + (a.borrowed ?? 0) + (a.bought ?? 0)
}

/** This week's count and its words. */
export function allowanceOf(a: Allowance | undefined, now: Date = new Date(), member = false) {
  const mine = current(a, now)
  const total = capOf(mine, member)
  const used = Math.min(mine.threads.length, total)
  const left = total - used
  const resetsOn = resetDate(now)
  return {
    total,
    used,
    left,
    /** How much is used, 0 to 1: the orb's arc and the credit bar. */
    share: total ? used / total : 1,
    borrowed: mine.borrowed ?? 0,
    owed: mine.owed ?? 0,
    bought: mine.bought ?? 0,
    /** The week's grace is still there. */
    graceLeft: !mine.borrowed,
    /** "Mon, Oct 12" */
    resetsOn,
    /** The AI is metered in tokens now (user, 5 Oct 2026), so the words
        speak of credit, not questions: "75% of this week's AI credit
        left", "No AI credit left until Mon, Oct 12". The orb's ring
        draws it. */
    line: left === 0 ? `No AI credit left until ${resetsOn}` : `${Math.round((left / total) * 100)}% of this week's AI credit left`,
  }
}

/* ------------------------------------------------------------ counting -- */

/** What a sent message is about, for counting: her record (counted once a
    conversation), a new batch of results (its first explanation free), the
    plan or the membership, or safety (never counted). */
export type QuestionKind = "record" | "batch" | "plan" | "safety"

/** Red flags that go to a person at once (L-30), on top of the crisis
    words in lib/conversation.ts. A stand in for the clinician designed
    list. */
const RED_FLAGS =
  /chest (pain|pressure|tightness)|can'?t breathe|cannot breathe|trouble breathing|short(ness)? of breath|faint|passed out|stroke|face (is )?droop|slurred|numb(ness)? on one side|severe allergic|anaphyla|throat (is )?(closing|swelling)|seizure/i

/** The plan, the membership and what it costs. */
const PLAN_WORDS = /\b(plans?|membership|member|subscri(be|ption)|price|pricing|costs?|billing|bill(ed)?|charge(d)?|payments?|refund|cancel(l?ing)?|pause|optimization)\b/i

/** Which kind a message is, from its words and the topic the chat was
    opened on ("plan" for "Ask about your plan", "batch" for "Explain my
    new results"). */
export function questionKind(text: string, topic?: string): QuestionKind {
  if (needsHelp(text) || RED_FLAGS.test(text)) return "safety"
  if (topic === "plan" || PLAN_WORDS.test(text)) return "plan"
  if (topic === "batch") return "batch"
  return "record"
}

/** What sending costs: 0 for safety, the plan, the membership, billing or
    cancelling, for a message in a conversation already counted, and for
    the first explanation of a new batch; 1 for the first counted message
    of a new conversation. A safety or plan question is never counted,
    whatever kind the screen passed. */
export function costOf(
  input: { text: string; threadId: string; kind: QuestionKind; batch?: string },
  a: Allowance | undefined,
  now: Date = new Date()
): 0 | 1 {
  const said = questionKind(input.text)
  const kind = said === "safety" || said === "plan" ? said : input.kind
  if (kind === "safety" || kind === "plan") return 0
  const mine = current(a, now)
  if (mine.threads.includes(input.threadId)) return 0
  if (kind === "batch" && input.batch && !mine.batches.includes(input.batch)) return 0
  return 1
}

/** The allowance with one more counted conversation (unchanged when it is
    already counted this week). */
export function spend(a: Allowance | undefined, threadId: string, now: Date = new Date()): Allowance {
  const mine = current(a, now)
  return mine.threads.includes(threadId) ? mine : { ...mine, threads: [...mine.threads, threadId] }
}

/** The allowance with a batch's free explanation used. */
export function markBatch(a: Allowance | undefined, batch: string, now: Date = new Date()): Allowance {
  const mine = current(a, now)
  return mine.batches.includes(batch) ? mine : { ...mine, batches: [...mine.batches, batch] }
}

/** A paid membership that is on: the higher cap, and a top up. A paused
    one counts like the free record. */
const memberOf = (s: Snapshot) => membershipOn(s.membership) && !s.membership?.paused

/** The allowance of the patient on this device, with the two writes the
    assistant needs. `spend(threadId)` counts a new conversation and says
    whether the message may go: true when it was counted or is free (a
    member, a conversation already counted), false at the cap, when the
    message stays in the composer and the limit card shows. Pass `chat`,
    the chat's own id: at the cap, a chat that already counted a
    conversation this week is in progress, and finishes on the week's
    grace ("grace", which lets the message go). Check `costOf()` first: a
    message that costs 0 never needs `spend`. `topUp()` adds TOP_UP for a
    member. */
export function useAllowance() {
  const onboarding = useOnboarding()
  const ref = React.useRef<Writer>({ s: onboarding })
  ref.current.s = onboarding
  const member = memberOf(onboarding)
  const counts = allowanceOf(onboarding.allowance, new Date(), member)

  const spendThread = React.useCallback((threadId: string, chat?: string): boolean | "grace" => {
    const w = ref.current
    const mine = current(newest(w), new Date())
    if (mine.threads.includes(threadId)) return true
    if (mine.threads.length < capOf(mine, memberOf(w.s))) {
      write(w, spend(mine, threadId))
      return true
    }
    const inProgress = !!chat && mine.threads.some((t) => t.startsWith(`${chat}:`))
    if (!inProgress || mine.borrowed) return false
    write(w, { ...spend(mine, threadId), borrowed: GRACE })
    return "grace"
  }, [])

  const markBatchUsed = React.useCallback((batch: string) => {
    const w = ref.current
    if (memberOf(w.s)) return
    const mine = current(newest(w), new Date())
    if (!mine.batches.includes(batch)) write(w, markBatch(mine, batch))
  }, [])

  const topUp = React.useCallback(() => {
    const w = ref.current
    if (!memberOf(w.s)) return
    const mine = current(newest(w), new Date())
    write(w, { ...mine, bought: (mine.bought ?? 0) + TOP_UP.conversations })
  }, [])

  return { ...counts, member, spend: spendThread, markBatch: markBatchUsed, topUp }
}

/* Two writes in one moment (a count, then a batch) build on the newer one,
   unless the store was replaced since (a review control). */
type Writer = { s: ReturnType<typeof useOnboarding>; wrote?: { from?: Allowance; next: Allowance } }

function newest(w: Writer) {
  const stored = w.s.allowance
  return w.wrote && (stored === w.wrote.from || stored === w.wrote.next) ? w.wrote.next : stored
}

function write(w: Writer, next: Allowance) {
  w.wrote = { from: w.s.allowance, next }
  w.s.save({ allowance: next }).catch(() => {})
}

/** The calm card in the thread at the cap (F-104): never shown when the app
    opens, and it never cuts an answer short. Saving the question for her
    visit comes first, the membership second and quiet. */
export function limitCard(now: Date = new Date()) {
  return {
    title: "You've used this week's AI credit",
    body: `It comes back on ${resetDate(now)}. Your record, trends and past answers are all still here.`,
    save: "Save for my next visit",
    more: "See what members get",
  }
}

/* ---------------------------------------------------- review controls -- */

/** Review build controls (/demo): use all of this week's AI credit (a
    member's too), or give it all back, borrowing and top ups included. */
export function spendAllQuestions(s: Snapshot, save: Save, now: Date = new Date()) {
  const mine = current(s.allowance, now)
  const threads = [...mine.threads]
  for (let i = threads.length; i < capOf(mine, memberOf(s)); i++) threads.push(`demo-${i + 1}`)
  return save({ allowance: { ...mine, threads } })
}

/** A review link's AI credit (/demo/free?credit=out): 75% used (`high`),
    all used (`out`), all used after the week's grace (`borrowed`), on the free record or, with `member` in front, a
    member's cap ("member-high", "member-out"). */
export const CREDIT_SEEDS = ["high", "out", "borrowed", "member-high", "member-out"] as const
export function usedUp(how: (typeof CREDIT_SEEDS)[number], now: Date = new Date()): Allowance {
  const borrowed = how === "borrowed" ? GRACE : 0
  const cap = (how.startsWith("member") ? MEMBER_QUESTIONS : FREE_QUESTIONS) + borrowed
  const used = how.endsWith("high") ? Math.round(cap * 0.75) : cap
  return { month: weekKey(now), threads: Array.from({ length: used }, (_, i) => `demo-${i + 1}`), batches: [], borrowed }
}

export function giveBackQuestions(s: Snapshot, save: Save, now: Date = new Date()) {
  return save({ allowance: { month: weekKey(now), threads: [], batches: [] } })
}
