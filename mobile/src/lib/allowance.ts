import * as React from "react"

import { needsHelp } from "@/lib/conversation"
import { weekKey, weekStart } from "@/lib/dates"
import { membershipOn } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"

/* The assistant's AI credit (F-100 to F-104, Q-02), for every patient,
   free or member: metered in tokens and always shown as the share used,
   never as a count of questions (user, 9 Oct 2026): "40% of this week's
   AI credit used". Each message spends what its question and its answer
   take (tokensFor), follow ups included. Never metered: anything about
   safety (chest pain, stroke signs, a severe allergic reaction, thoughts
   of self harm), anything about the plan, the membership, its price,
   billing or cancelling, and the first explanation of each new batch of
   results. Opening the chat, opening it about one result or seeing
   suggested questions costs nothing until she sends one (A-42).

   The 5 Oct 2026 call: the free record renews on its own and can't top up; a
   member has a higher budget and can add more (TOP_UP). A chat in progress
   when the credit runs out is never cut off (6 Oct 2026, the grace
   proposal): once a week it finishes on GRACE tokens taken from next
   week, with no button and no word for it but one quiet line. A new chat
   at 100% gets no grace: wait for Monday, or upgrade.

   The credit renews weekly (user, 6 Oct 2026), every Monday where she
   lives (A-40): "Mon, Oct 12". The store keeps this week's tokens and
   conversations (`allowance`) under the local week key, its Monday; the
   field is still called `month` from when it renewed monthly. */

type Snapshot = Parameters<ReturnType<typeof useOnboarding>["save"]>[0]
type Save = ReturnType<typeof useOnboarding>["save"]

/** The free record's tokens a week. A stand in until the client maps
    tokens to cost (~$5 a free patient). */
export const FREE_TOKENS = 60_000

/** A member's tokens a week (5 Oct call: a higher budget). */
export const MEMBER_TOKENS = 480_000

/** Grace: a chat in progress at 100% finishes on these tokens, taken off
    next week's budget, once a week. */
export const GRACE = 12_000

/** A member's top up: more tokens for this week only, shown as the share
    of the member budget it adds. The price is a stand in until the client
    sets it. */
export const TOP_UP = { tokens: 120_000, share: 25, price: "$5" } as const

/** What one message spends: her words (about 4 characters a token), the
    record the answer reads, and the answer. A stand in for the model's own
    usage until the API reports it. */
const CONTEXT_TOKENS = 1_800
const ANSWER_TOKENS = 1_200
export function tokensFor(text: string) {
  return CONTEXT_TOKENS + ANSWER_TOKENS + Math.ceil(text.length / 4)
}

/** A conversation stays open this long after its last message; a message
    after that starts a new one. */
export const CONVERSATION_MINUTES = 30

/** This week's credit (store field `allowance`): the week (its local
    Monday, "2026-10-05", in `month`), the tokens used, the conversations
    that spent any (for a chat in progress), the result batches already
    explained for free (kept from week to week), the grace tokens taken
    from next week, what last week took from this one, and the tokens a
    member added. */
export type Allowance = {
  month: string
  tokens?: number
  threads: string[]
  batches: string[]
  borrowed?: number
  owed?: number
  bought?: number
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** The day the credit comes back: next Monday, "Mon, Oct 12". */
export function resetDate(now: Date = new Date()) {
  const next = weekStart(now)
  next.setDate(next.getDate() + 7)
  return `Mon, ${MONTHS[next.getMonth()]} ${next.getDate()}`
}

/** A store from the question count build: each counted conversation as
    one average conversation's tokens. */
const OLD_CONVERSATION = tokensFor("") * 3

/** The allowance as this week has it: last week's tokens, its grace and
    its top up drop, its grace is owed now, and the explained batches
    stay. */
function current(a: Allowance | undefined, now: Date): Allowance {
  const week = weekKey(now)
  if (a?.month === week)
    return { ...a, tokens: a.tokens ?? (a.threads ?? []).length * OLD_CONVERSATION, threads: a.threads ?? [], batches: a.batches ?? [] }
  const last = new Date(now)
  last.setDate(last.getDate() - 7)
  return { month: week, tokens: 0, threads: [], batches: a?.batches ?? [], owed: a?.month === weekKey(last) ? (a.borrowed ?? 0) : 0 }
}

/** This week's budget: the plan's own, less last week's grace, plus this
    week's grace and what was added. */
function capOf(a: Allowance, member: boolean) {
  return (member ? MEMBER_TOKENS : FREE_TOKENS) - (a.owed ?? 0) + (a.borrowed ?? 0) + (a.bought ?? 0)
}

/** The share used as a whole percent, never 100 until it is all used. */
function percent(used: number, total: number) {
  if (!total || used >= total) return 100
  return Math.min(99, Math.round((used / total) * 100))
}

/** This week's credit and its words. */
export function allowanceOf(a: Allowance | undefined, now: Date = new Date(), member = false) {
  const mine = current(a, now)
  const total = capOf(mine, member)
  const used = Math.min(mine.tokens ?? 0, total)
  const left = total - used
  const resetsOn = resetDate(now)
  const pct = percent(used, total)
  return {
    /** Tokens: this week's budget, used and left. */
    total,
    used,
    left,
    /** Nothing left: a new chat gets the limit card. */
    out: left <= 0,
    /** How much is used, 0 to 1: the orb's arc and the credit bar. */
    share: total ? used / total : 1,
    /** The same as a whole percent, 0 to 100. */
    percent: pct,
    borrowed: mine.borrowed ?? 0,
    owed: mine.owed ?? 0,
    bought: mine.bought ?? 0,
    /** The week's grace is still there. */
    graceLeft: !mine.borrowed,
    /** "Mon, Oct 12" */
    resetsOn,
    /** The words, for every patient: "40% of this week's AI credit used",
        "No AI credit left until Mon, Oct 12". The orb's ring draws it. */
    line: left <= 0 ? `No AI credit left until ${resetsOn}` : `${pct}% of this week's AI credit used`,
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

/** What sending costs, in tokens: 0 for safety, the plan, the
    membership, billing or cancelling, and for the first explanation of a
    new batch; otherwise what the message and its answer take. A safety or
    plan question is never metered, whatever kind the screen passed. */
export function costOf(
  input: { text: string; threadId: string; kind: QuestionKind; batch?: string },
  a: Allowance | undefined,
  now: Date = new Date()
): number {
  const said = questionKind(input.text)
  const kind = said === "safety" || said === "plan" ? said : input.kind
  if (kind === "safety" || kind === "plan") return 0
  const mine = current(a, now)
  if (kind === "batch" && input.batch && !mine.batches.includes(input.batch)) return 0
  return tokensFor(input.text)
}

/** The allowance with a message's tokens spent in a conversation. */
export function spend(a: Allowance | undefined, threadId: string, tokens: number, now: Date = new Date()): Allowance {
  const mine = current(a, now)
  return {
    ...mine,
    tokens: (mine.tokens ?? 0) + tokens,
    threads: mine.threads.includes(threadId) ? mine.threads : [...mine.threads, threadId],
  }
}

/** The allowance with a batch's free explanation used. */
export function markBatch(a: Allowance | undefined, batch: string, now: Date = new Date()): Allowance {
  const mine = current(a, now)
  return mine.batches.includes(batch) ? mine : { ...mine, batches: [...mine.batches, batch] }
}

/** A paid membership that is on: the higher budget, and a top up. A
    paused one counts like the free record. */
const memberOf = (s: Snapshot) => membershipOn(s.membership) && !s.membership?.paused

/** The credit of the patient on this device, with the writes the
    assistant needs. `spend(threadId, tokens)` meters a message and says
    whether it may go: true when there is credit left, false at 100%,
    when the message stays in the composer and the limit card shows. Pass
    `chat`, the chat's own id: at 100%, a chat that already spent credit
    this week is in progress, and finishes on the week's grace ("grace",
    which lets the message go). Check `costOf()` first: a message that
    costs 0 never needs `spend`. `topUp()` adds TOP_UP for a member. */
export function useAllowance() {
  const onboarding = useOnboarding()
  const ref = React.useRef<Writer>({ s: onboarding })
  ref.current.s = onboarding
  const member = memberOf(onboarding)
  const counts = allowanceOf(onboarding.allowance, new Date(), member)

  const spendTokens = React.useCallback((threadId: string, tokens: number, chat?: string): boolean | "grace" => {
    const w = ref.current
    const mine = current(newest(w), new Date())
    if ((mine.tokens ?? 0) < capOf(mine, memberOf(w.s))) {
      write(w, spend(mine, threadId, tokens))
      return true
    }
    const inProgress = !!chat && mine.threads.some((t) => t.startsWith(`${chat}:`))
    if (!inProgress || mine.borrowed) return false
    // The grace starts where the budget ended, so the chat has all of it.
    write(w, { ...spend(mine, threadId, tokens), tokens: capOf(mine, memberOf(w.s)) + tokens, borrowed: GRACE })
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
    write(w, { ...mine, bought: (mine.bought ?? 0) + TOP_UP.tokens })
  }, [])

  return { ...counts, member, spend: spendTokens, markBatch: markBatchUsed, topUp }
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

/* ---------------------------------------------------- review controls -- */

/** Review build controls (/demo): use all of this week's AI credit (a
    member's too), or give it all back, borrowing and top ups included. */
export function spendAllQuestions(s: Snapshot, save: Save, now: Date = new Date()) {
  const mine = current(s.allowance, now)
  return save({ allowance: { ...mine, tokens: capOf(mine, memberOf(s)) } })
}

/** This week's credit with `share` (0 to 1) of the free budget used: the
    demo patients' seeds. */
export function creditUsed(share: number, now: Date = new Date()): Allowance {
  return { month: weekKey(now), tokens: Math.round(FREE_TOKENS * share), threads: [], batches: [] }
}

/** A review link's AI credit (/demo/free?credit=out): 75% used (`high`),
    all used (`out`), all used after the week's grace (`borrowed`), on the free record or, with `member` in front, a
    member's budget ("member-high", "member-out"). */
export const CREDIT_SEEDS = ["high", "out", "borrowed", "member-high", "member-out"] as const
export function usedUp(how: (typeof CREDIT_SEEDS)[number], now: Date = new Date()): Allowance {
  const borrowed = how === "borrowed" ? GRACE : 0
  const cap = (how.startsWith("member") ? MEMBER_TOKENS : FREE_TOKENS) + borrowed
  const tokens = how.endsWith("high") ? Math.round(cap * 0.75) : cap
  return { month: weekKey(now), tokens, threads: [], batches: [], borrowed }
}

export function giveBackQuestions(s: Snapshot, save: Save, now: Date = new Date()) {
  return save({ allowance: { month: weekKey(now), tokens: 0, threads: [], batches: [] } })
}
