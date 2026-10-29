import { Redirect, router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import {
  AnswerBubble,
  ContextCard,
  EndedRow,
  FactsSheet,
  LimitCard,
  MedicineChooser,
  ResultChooser,
  UrgentBubble,
  VisitBubble,
  keepTogether,
} from "@/components/assistant-thread"
import { AskWelcome, DISCLAIMER } from "@/components/ask-welcome"
import { AttachSheet, MAX_ATTACHMENTS, type Attachment } from "@/components/attach-sheet"
import { ChatBar, MyBubble, Options, TheirBubble, TypingBubble, bubbleText } from "@/components/chat"
import { CategoryPicker } from "@/components/chat-categories"
import { ChatHistory, type ChatGroup } from "@/components/chat-history"
import { useDragBack } from "@/components/drag-back"
import { OUTLOOK_ASK, OutlookAnswer } from "@/components/outlook-answer"
import { DarkStatusBar } from "@/components/error-state"
import { PageGround, PageHeader } from "@/components/hol"
import { ChatText, List } from "@/components/ph"
import { CreditSheet, useCreditNotice } from "@/components/credit-banner"
import { useTopInset } from "@/components/ui"
import { costOf, questionKind, useAllowance, type QuestionKind } from "@/lib/allowance"
import {
  AGAIN,
  BATCH_ASK,
  CANT_ANSWER,
  CONCERNS,
  FREE_PLAN_ASKS,
  LIMIT,
  PLAN_ASKS,
  PROMPTS,
  TOPICS,
  TOPIC_PARAM,
  URGENT,
  answerFor,
  batchAnswer,
  batchArrived,
  batchIntro,
  batchOf,
  concernAnswer,
  greeting,
  medicineAnswer,
  medicineChoices,
  medicineQuestion,
  nameIn,
  nextVisit,
  openTests,
  outsideVisitAnswer,
  planAnswer,
  planInfoAnswer,
  readQuestion,
  resultGroups,
  scopedPrompt,
  suggestionsFor,
  testAnswer,
  topicsFor,
  visitIntro,
  visitSuggestions,
  type Answer,
  type Ask,
  type Fact,
  type Topic,
} from "@/lib/assistant"
import { coachAnswer, coachOpen, coachQuestion, todaysQuestion, type CoachQuestion } from "@/lib/coach"
import { relativeDay } from "@/lib/dates"
import { canOffer, useExperience, useMarkers } from "@/lib/experience"
import { clockOf, localDay, questionsFor } from "@/lib/member"
import { changeCourse } from "@/lib/offers"
import { useOnboarding, type Chat, type ChatTopic, type PastChat } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { MEDICATIONS } from "@/lib/record"
import { color, ink, space, type } from "@/lib/theme"
import { classify, type Trend } from "@/lib/trends"
import { keepEnd } from "@/lib/words"

/** The reply to a photo or file sent without words. */
const ATTACHED = "Thanks, it's in this chat now. What would you like to know about it?"

/* The assistant (FINAL-SPEC C.4), opened full screen from the round button
   beside the tab bar, or about one result from a marker page
   (?marker=a1c). It helps the patient understand her own record and arrive
   at visits with better questions; for a member, her plan too.

   It runs like the support chats in food and grocery apps: a greeting with
   a short list of topics inside its own message, each topic narrowing with
   one more list, a tapped option sent as her reply, and the answer back in
   the thread. Typing works at any point. Anything urgent stops for a person
   path first. Every answer has the same shape: the direct answer, then what
   the record shows, what it doesn't tell us and a question to save, each
   folded, with its confidence and the facts behind it.

   Every patient's AI credit is metered in tokens and shown as the share
   used (lib/allowance.ts): each question about a result, a topic or her
   own words spends what it and its answer take, follow ups too; opening
   the chat, opening it about a result and seeing suggestions cost
   nothing; safety and plan questions never count. At 100% the question
   waits in the composer beside a calm card.
   The thread is kept for 30 minutes after its last message, so closing and
   opening carries on; an older one ends with "Start a new chat".

   Opened from the nav bar (or "New chat"), she first picks a category, or
   makes one, and the chat starts in it (call, 5 Oct 2026); opened about a
   result, a batch or a topic, that is its category. */

/** The typing bubble's pause before a reply (C.0.8). */
const THINK_MS = 800
/** After an answer: back to every topic, or away from one result. */
const ELSE = "Anything else I can help with?"
const MORE = "Ask about something else"
/** A paused member asking about the plan: it lives on the Plan tab. */
const PAUSED: Answer = { text: "Your plan is paused. Everything about it, and how to resume it, is on the Plan tab.", link: { label: "Open the Plan tab", href: "/plan" } }

/** What a tap on an option list answers. */
type Step = "topic" | "scoped" | "urgent" | "concern" | "plan" | "batch" | "test" | "coach"

type Msg = { id: string; at: string } & (
  | { kind: "text"; from: "patient" | "assistant"; text: string; files?: Attachment[] }
  /** A question with its options inside the bubble; locks once answered. */
  | { kind: "ask"; text: string; options: string[]; picked?: string; step: Step; scope?: string }
  /** Every marker, to choose one to explain. */
  | { kind: "results"; picked?: string }
  /** Her medicines, to choose one to ask about. */
  | { kind: "medicines"; picked?: string }
  /** The result a conversation is about, as a card. */
  | { kind: "context"; marker: string }
  /** A substantive answer. `first` is the conversation's first answer;
      `followOn` lets it end on the one line about the plan; `asked` is
      what it answered (a result's question, or a plan question). */
  | { kind: "answer"; answer: Answer; scope: string; first?: boolean; followOn?: boolean; asked?: string }
  /** Where she is likely to be: the four horizons and the weight chart. */
  | { kind: "outlook" }
  /** Her next visit, saved questions and two suggestions. */
  | { kind: "visit" }
  /** A person first: 911, 988 and the clinic. */
  | { kind: "urgent"; picked?: string }
  /** The week's AI credit is used (never kept: it is not history). */
  | { kind: "limit"; question: string; about?: string; saved?: boolean; gone?: boolean }
  /** The end of the thread, with "Start a new chat". */
  | { kind: "ended" }
  /** One quiet line: the credit ran out, and this chat finishes on grace. */
  | { kind: "grace" }
)
type Draft = Msg extends infer M ? (M extends Msg ? Omit<M, "id" | "at"> : never) : never
type AskMsg = Extract<Msg, { kind: "ask" }>
/** `topic` and `title` file the thread in the chat history once it ends
    or a new one starts. */
type Thread = { id: string; scope?: string; startedAt: string; lastAt: string; messages: Msg[]; topic?: ChatTopic; title?: string }

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

/** Messages as the thread keeps them: an id and the time each was said. */
function stamp(drafts: Draft[]): Msg[] {
  const at = clockOf(new Date())
  return drafts.map((d) => ({ ...d, id: newId(), at }) as Msg)
}

function append(t: Thread, msgs: Msg[]): Thread {
  return msgs.length ? { ...t, lastAt: new Date().toISOString(), messages: [...t.messages, ...msgs] } : t
}

function fresh(drafts: Draft[], scope?: string, topic?: ChatTopic): Thread {
  const now = new Date().toISOString()
  return { id: newId(), scope, startedAt: now, lastAt: now, messages: stamp(drafts), topic }
}

/* ------------------------------------------------------ chat history -- */

/** A starter's group in the history: "Something is bothering me" is filed
    under general health questions. */
const GROUP_OF: Record<Topic, ChatTopic> = { result: "result", medicine: "medicine", visit: "visit", plan: "plan", concern: "other" }
/** The starters she can tap, which never make a title on their own. */
const STARTERS = new Set<string>([...Object.values(TOPICS), MORE])
const TITLE_MAX = 44

const patientLines = (t: Thread) => t.messages.flatMap((m) => (m.kind === "text" && m.from === "patient" ? [m.text] : []))
const hasQuestion = (t: Thread) => patientLines(t).length > 0

/** The first question, shortened to a line: a tapped starter only when she
    said nothing else. */
function shorten(text: string) {
  const one = text.replace(/\s+/g, " ").trim()
  if (one.length <= TITLE_MAX) return one
  const cut = one.slice(0, TITLE_MAX)
  return `${cut.slice(0, cut.lastIndexOf(" ") > 20 ? cut.lastIndexOf(" ") : TITLE_MAX).replace(/[,.;:]$/, "")}…`
}

/** What a thread is filed under when nothing set it: read from her first
    question. */
function inferTopic(t: Thread, planLive: boolean): ChatTopic {
  if (t.messages.some((m) => m.kind === "context")) return "result"
  const said = patientLines(t).find((x) => !STARTERS.has(x))
  if (!said) return "other"
  if (questionKind(said) === "plan") return "plan"
  switch (readQuestion(said, { planLive }).kind) {
    case "marker":
    case "test":
    case "outside":
      return "result"
    case "medicine":
      return "medicine"
    case "visit":
      return "visit"
    case "plan":
      return "plan"
    default:
      return "other"
  }
}

/** The lists a tap can still answer: only the newest one is live. */
const CHOOSERS = new Set<Msg["kind"]>(["ask", "results", "medicines", "urgent"])

/** The built in categories that open as a starter does. */
const STARTER_CATEGORIES = new Set<ChatTopic>(["result", "medicine", "visit", "plan"])

export default function AssistantScreen() {
  // The free patient has no AI chat (28 Oct 2026): any link here goes home.
  if (useExperience().experience === "free") return <Redirect href="/" />
  return <AssistantChat />
}

function AssistantChat() {
  // It rises from the bottom; the left edge swipe still drags it away.
  useDragBack("slide_from_bottom")
  const top = useTopInset()
  const { bottom } = useSafeAreaInsets()
  const onboarding = useOnboarding()
  const allowance = useAllowance()
  const { experience, sharingOff } = useExperience()
  const markers = useMarkers()
  const params = useLocalSearchParams<{ marker?: string; topic?: string; batch?: string; ask?: string; outlook?: string; coach?: string; answer?: string }>()
  // Help with today's plan needs a live plan; the counter, any active
  // membership (C.4.1).
  const planLive = experience === "member"
  const name = onboarding.profile?.preferredName || onboarding.profile?.firstName || PATIENT.firstName
  const greet = () => greeting(name, planLive, { asOf: sharingOff?.on })

  const trendFor = (id?: string): Trend | undefined => {
    const b = id ? markers.find((m) => m.id === id) : undefined
    return b ? classify(b) : undefined
  }
  const topics = () => topicsFor(planLive).map((t) => TOPICS[t])
  /** After an answer, the next tap: anything else at all. */
  const anythingElse = (): Draft => ({ kind: "ask", text: ELSE, options: topics(), step: "topic" })
  const greetingAsk = (): Draft => ({ kind: "ask", text: greet(), options: topics(), step: "topic" })
  /** The plan questions she can tap: today's for a live plan, what the
      plan is for anyone else. */
  const planAsks = (): string[] => (planLive ? [...PLAN_ASKS] : [...FREE_PLAN_ASKS])

  /** A thread's title in the history: its first question, with the result
      it was opened about when the question does not name it. */
  function titleOf(t: Thread) {
    if (t.title) return t.title
    const said = patientLines(t)
    const q = said.find((x) => !STARTERS.has(x)) ?? said[0] ?? "New chat"
    const ctx = t.messages.find((m): m is Extract<Msg, { kind: "context" }> => m.kind === "context")
    const name = ctx ? trendFor(ctx.marker)?.marker.name : undefined
    return shorten(name && !q.toLowerCase().includes(name.toLowerCase()) ? `${name}: ${q}` : q)
  }
  /** A thread as the history keeps it, without the limit card or the end. */
  const toPast = (t: Thread): PastChat => ({
    id: t.id,
    title: titleOf(t),
    topic: t.topic ?? inferTopic(t, planLive),
    startedAt: t.startedAt,
    lastAt: t.lastAt,
    messages: t.messages.filter((m) => m.kind !== "limit" && m.kind !== "ended" && m.kind !== "grace"),
  })
  /** The history with a thread filed in it, newest first; a thread she
      asked nothing in is not kept. */
  const filed = (list: PastChat[], t: Thread) => (hasQuestion(t) ? [toPast(t), ...list.filter((c) => c.id !== t.id)].slice(0, 50) : list)
  /** The coach's question it opens on: the one tapped on Home, or, opened
      with nothing else by a member with a live plan, today's while it is
      still unanswered (lib/coach.ts). */
  const coach = params.coach
    ? coachQuestion(onboarding, params.coach)
    : planLive && !params.marker && !params.batch && !params.topic && !params.ask && !params.outlook && coachOpen(onboarding)
      ? todaysQuestion(onboarding)
      : undefined
  /** Opened about a result, a new batch, a topic or the coach's question:
      its group from the start. */
  const paramTopic: ChatTopic | undefined =
    params.marker || params.batch ? "result" : params.topic && TOPIC_PARAM[params.topic] ? GROUP_OF[TOPIC_PARAM[params.topic]] : coach ? "plan" : undefined

  /** The coach starts the chat: what her data shows and its question, with
      her replies to tap. Opened from Home with a reply, that reply is
      already said and answered. */
  function coachOpening(q: CoachQuestion): Draft[] {
    const ask: Draft = { kind: "ask", text: `${q.signal} ${q.question}`, options: q.replies.map((r) => r.label), step: "coach", scope: q.id }
    const answer = params.answer ? coachAnswer(q, params.answer) : undefined
    if (!answer) return [ask]
    return [
      { ...ask, picked: params.answer },
      { kind: "text", from: "patient", text: params.answer! },
      { kind: "answer", answer, scope: `coach:${q.id}` },
      anythingElse(),
    ]
  }

  /** One result: its card, then the questions in its own words. */
  function scopedOpening(id: string): Draft[] {
    const t = trendFor(id)
    if (!t) return [greetingAsk()]
    return [
      { kind: "context", marker: id },
      { kind: "ask", text: scopedPrompt(t.marker), options: suggestionsFor(t).map((s) => s.label), step: "scoped", scope: id },
    ]
  }

  function topicOpening(topic: Topic): Draft[] {
    switch (topic) {
      case "result":
        return [{ kind: "results" }]
      case "visit":
        return [{ kind: "visit" }, anythingElse()]
      case "medicine":
        return [{ kind: "medicines" }]
      case "concern":
        return [{ kind: "ask", text: URGENT.ask, options: [URGENT.yes, URGENT.no], step: "urgent" }]
      case "plan":
        if (experience === "paused") return [{ kind: "answer", answer: PAUSED, scope: "plan" }]
        return [{ kind: "ask", text: planLive ? PROMPTS.plan : "What would you like to know about the plan?", options: planAsks(), step: "plan" }]
    }
  }

  /** A new batch's first explanation is free (F-103): opened from the
      results, it answers at once; explained before, it waits for a tap. */
  const batchFree = (id: string) => allowance.member || !(onboarding.allowance?.batches ?? []).includes(id)

  /** What the chat opens on: a result, a new batch, a topic, or the greeting. */
  function opening(): Draft[] {
    if (params.marker) return scopedOpening(params.marker)
    if (coach) return coachOpening(coach)
    // The Outlook tab's question, asked and answered (Journey screen 51).
    if (params.outlook) return [{ kind: "text", from: "patient", text: OUTLOOK_ASK }, { kind: "outlook" }, planFollowUp(OUTLOOK_ASK, new Set())]
    const batch = params.batch ? batchOf(params.batch, onboarding) : undefined
    const explained = batch && batchAnswer(batch.id, markers)
    if (batch && explained && batchFree(batch.id))
      return [{ kind: "text", from: "assistant", text: batchArrived(batch) }, { kind: "answer", answer: explained, scope: `batch:${batch.id}`, first: true }, anythingElse()]
    if (batch && explained) return [{ kind: "ask", text: batchIntro(batch), options: [BATCH_ASK], step: "batch", scope: batch.id }]
    const topic = params.topic ? TOPIC_PARAM[params.topic] : undefined
    if (topic) return [{ kind: "text", from: "assistant", text: greet() }, ...topicOpening(topic)]
    return [greetingAsk()]
  }

  /** A chosen category's opening: a built in one opens as its starter
      does; general health questions and her own categories wait for her
      words. */
  function categoryOpening(g: ChatGroup): Draft[] {
    if (STARTER_CATEGORIES.has(g.topic)) return topicOpening(g.topic as Topic)
    const text = g.topic === "other" ? `Hi ${name}. Ask me any health question.` : `Hi ${name}. What would you like to ask about ${g.name}?`
    return [{ kind: "text", from: "assistant", text }]
  }

  // Every open of the assistant starts a fresh chat (user, 5 Oct 2026);
  // the last one is filed in the history (the drawer) to carry on from.
  // With nothing to open it about, it waits for a category first.
  const previous = React.useRef(onboarding.chat as unknown as Thread | undefined)
  const [thread, setThread] = React.useState<Thread>(() => (paramTopic ? fresh(opening(), params.marker ?? params.topic ?? params.batch ?? (coach && `coach:${coach.id}`), paramTopic) : fresh([])))
  const limitShown = thread.messages.some((m) => m.kind === "limit" && !m.gone)
  /** No category yet: the picker shows in place of the thread. */
  const choosing = !thread.topic && !thread.messages.length
  /** "Ask Inlay", opening on the orb and the topics to tap with the
      composer ready: every flow by default; version 1, the category
      picker, only when the demo page switches back to it. */
  const asking = onboarding.demo?.assistantVersion !== 1
  // A question it was opened with waits in the composer, unsent (A-42).
  const [draft, setDraft] = React.useState(params.ask ?? "")
  // Opened from a page with the question already started (a topic's ways),
  // or a paid member: just the composer, no suggestion pills or upgrade
  // banner.
  const bare = !!params.ask || allowance.member
  /** Borrowing or adding AI credit, asked in a sheet first. */
  const [credit, setCredit] = React.useState(false)
  // This week's AI credit from 75% used, joined to the composer as
  // Claude's session limit is; closed, it stays hidden until it says
  // something new (75% becoming 100%), and the limit card says it alone.
  const creditNotice = useCreditNotice()
  const [hiddenNotice, setHiddenNotice] = React.useState<string>()
  const [thinking, setThinking] = React.useState(false)
  /** "Something else": her own words answer it next. */
  const [awaiting, setAwaiting] = React.useState<"concern" | undefined>()
  const [facts, setFacts] = React.useState<Fact[] | undefined>()
  // Photos and files waiting in the chat bar, sent with the next message.
  const [files, setFiles] = React.useState<Attachment[]>([])
  const [attaching, setAttaching] = React.useState(false)
  /** The chat history drawer. */
  const [menu, setMenu] = React.useState(false)

  // Kept in the store (A-34), without the limit card: it is never shown on
  // opening the chat. An ended thread is filed in the history too.
  React.useEffect(() => {
    const chat: Chat = { ...thread, messages: thread.messages.filter((m) => m.kind !== "limit") }
    const over = thread.messages.at(-1)?.kind === "ended" && hasQuestion(thread)
    // On opening, the chat left in the store goes into the history first.
    const before = previous.current
    previous.current = undefined
    const base = before?.messages?.length && hasQuestion(before) ? filed(onboarding.chats ?? [], before) : onboarding.chats ?? []
    const chats = over ? filed(base, thread) : base
    onboarding.save(over || before ? { chat, chats } : { chat }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread])

  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  React.useEffect(() => () => clearTimeout(timer.current), [])

  // A batch explained as the chat opened uses its one free explanation.
  React.useEffect(() => {
    const id = params.batch
    if (id && thread.messages.some((m) => m.kind === "answer" && m.scope === `batch:${id}`)) charge(BATCH_ASK, `batch:${id}`, "batch", id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ------------------------------------------------------- scrolling -- */

  // A new message scrolls the thread; a reply taller than the screen stops
  // with her question at the top, one message gap under the header, so the
  // answer reads from its start.
  const scroll = React.useRef<ScrollView>(null)
  const tops = React.useRef(new Map<string, number>())
  const viewport = React.useRef(0)
  const anchor = React.useRef<string | undefined>(undefined)
  const follow = React.useRef(Date.now())
  const onContentSize = (_: number, h: number) => {
    if (Date.now() - follow.current > 1500) return
    const y = anchor.current ? tops.current.get(anchor.current) : undefined
    if (y !== undefined && h - y > viewport.current) scroll.current?.scrollTo({ y: Math.max(0, y - space.item), animated: true })
    else scroll.current?.scrollToEnd({ animated: true })
  }

  /* ------------------------------------------------------- categories -- */

  /** The chosen category's chat starts. */
  function startIn(g: ChatGroup) {
    follow.current = Date.now()
    setThread(fresh(categoryOpening(g), undefined, g.topic))
  }

  /** A category she named: kept, then a chat starts in it. */
  function createCategory(categoryName: string): ChatGroup {
    const id = `cat-${newId()}`
    onboarding.save({ chatCategories: [...(onboarding.chatCategories ?? []), { id, name: categoryName }] }).catch(() => {})
    return { topic: id, name: categoryName, Icon: ChatText }
  }

  /** Her reply to the coach's question: today's is answered, so Home and
      the next open of the chat stop asking it. */
  function saveCoach(id: string, answer: string) {
    onboarding.save({ coach: { day: localDay(new Date()), id, answer } }).catch(() => {})
  }
  // A reply tapped on Home arrives already said.
  React.useEffect(() => {
    if (coach && params.answer && coachAnswer(coach, params.answer)) saveCoach(coach.id, params.answer)
    // Once, for the reply it was opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** A topic tapped on the Ask Inlay opening: as the greeting's own list. */
  function pickTopic(option: string) {
    if (thinking) return
    const topic = (Object.keys(TOPICS) as Topic[]).find((k) => TOPICS[k] === option) ?? "result"
    setThread((t) => ({ ...t, topic: GROUP_OF[topic] }))
    mine(option)
    reply(topicOpening(topic))
  }

  /* ---------------------------------------------------------- writing -- */

  function say(drafts: Draft[]) {
    const msgs = stamp(drafts)
    follow.current = Date.now()
    setThread((t) => append(t, msgs))
    return msgs
  }

  function patch(id: string, change: Partial<Msg>) {
    setThread((t) => ({ ...t, messages: t.messages.map((m) => (m.id === id ? ({ ...m, ...change } as Msg) : m)) }))
  }

  /** Her reply, sent: the newest answer then reads from it. */
  function mine(text: string) {
    const [m] = say([{ kind: "text", from: "patient", text, files: files.length ? files : undefined }])
    if (files.length) setFiles([])
    anchor.current = m.id
  }

  /** The assistant answers after a short pause, as if thinking. */
  function reply(drafts: Draft[]) {
    follow.current = Date.now()
    setThinking(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setThinking(false)
      say(drafts)
    }, THINK_MS)
  }

  /** An answer for a conversation. `first` marks its first substantive
      answer (one about the record, with a confidence line), which the
      educational line follows; a plan answer never needs it. */
  function answered(answer: Answer, scope: string, followOn = false, asked?: string): Draft {
    const first = Boolean(answer.confidence) && scope !== "plan" && !thread.messages.some((m) => m.kind === "answer" && m.scope === scope && m.first)
    return { kind: "answer", answer, scope, first, followOn, asked }
  }

  /** What a conversation has answered so far. */
  const askedIn = (scope: string) => new Set(thread.messages.flatMap((m) => (m.kind === "answer" && m.scope === scope && m.asked ? [m.asked] : [])))

  /** After an answer about a result: the questions about it not asked yet,
      so a follow up (free, the same conversation) is one tap away. */
  function followUp(t: Trend, ask: Ask): Draft {
    const asked = askedIn(t.id).add(ask)
    const rest = suggestionsFor(t).filter((x) => !asked.has(x.ask)).map((x) => x.label)
    return rest.length ? { kind: "ask", text: `Anything else about your ${nameIn(t.marker)}?`, options: [...rest, MORE], step: "scoped", scope: t.id } : anythingElse()
  }

  /** After a plan answer: the plan questions not asked yet. */
  function planFollowUp(said: string, before: Set<string> = askedIn("plan")): Draft {
    const asked = before.add(said)
    const rest = planAsks().filter((q) => !asked.has(q))
    if (!rest.length || experience === "paused") return anythingElse()
    return { kind: "ask", text: planLive ? "Anything else about today's plan?" : "Anything else about the plan?", options: [...rest, MORE], step: "plan" }
  }

  /* --------------------------------------------------------- counting -- */

  /** Meters a question's tokens (a result, a topic or her own words);
      false at 100%, when nothing is sent. */
  function charge(text: string, scope: string, kind: QuestionKind = "record", batch?: string) {
    const threadId = `${thread.id}:${scope}`
    const tokens = costOf({ text, threadId, kind, batch }, onboarding.allowance)
    if (tokens === 0) {
      if (kind === "batch" && batch) allowance.markBatch(batch)
      return true
    }
    const went = allowance.spend(threadId, tokens, thread.id)
    if (went === "grace") setThread((t) => append(t, stamp([{ kind: "grace" }])))
    return !!went
  }

  /** At the cap: the question waits in the composer and the card shows,
      once, at the end of the thread. */
  function capped(question: string, about?: string) {
    setDraft(question)
    follow.current = Date.now()
    setThread((t) => {
      const last = t.messages.at(-1)
      if (last?.kind === "limit" && !last.gone) return { ...t, messages: t.messages.map((m) => (m.id === last.id ? ({ ...m, question, about, saved: false } as Msg) : m)) }
      return append(t, stamp([{ kind: "limit", question, about }]))
    })
  }

  /* -------------------------------------------------------- answering -- */

  /** A question about one result, tapped or typed. */
  function askMarker(t: Trend, ask: Ask, said: string, from?: AskMsg) {
    if (!charge(said, t.id)) return capped(said, t.id)
    if (from) patch(from.id, { picked: said })
    else setDraft("")
    mine(said)
    const answer = answerFor(ask, t, { s: onboarding, markers })
    // The plan offer: once a conversation, right after she learns why the
    // number matters, only where the marker itself may lead to the plan (a
    // trend moving away from its range, no clinical step first) and only
    // for the free record.
    const followOn =
      canOffer(onboarding) &&
      changeCourse(t.marker, onboarding).eligible &&
      !thread.messages.some((m) => m.kind === "answer" && m.scope === t.id && m.followOn)
    reply([answered(answer, t.id, followOn, ask), followUp(t, ask)])
  }

  function askMedicine(id: string, said: string, from?: Extract<Msg, { kind: "medicines" }>) {
    const answer = medicineAnswer(id)
    if (!answer) return
    if (!charge(said, "medicines")) return capped(from ? medicineQuestion(id) : said, id)
    if (from) patch(from.id, { picked: id })
    else setDraft("")
    mine(said)
    reply([answered(answer, "medicines", false, id), anythingElse()])
  }

  function askConcern(concern: (typeof CONCERNS)[number], said: string, from?: AskMsg, typed?: string) {
    if (!charge(said, "concern")) return capped(said, "concern")
    if (from) patch(from.id, { picked: said })
    else setDraft("")
    mine(said)
    reply([answered(concernAnswer(concern, markers, typed), "concern", false, concern), anythingElse()])
  }

  /** Plan questions are never counted: a member's from her plan; anyone
      else is pointed to where the plan lives, never a price here. */
  function planReply(said: string): Answer {
    if (planLive) return planAnswer(said, onboarding)
    if (experience === "paused") return PAUSED
    return planInfoAnswer(said)
  }

  /** A test in her record: what it is for, and where it stands. */
  function askTest(id: string, said: string, from?: AskMsg) {
    const answer = testAnswer(id, onboarding)
    if (!answer) return
    if (!charge(said, `test:${id}`)) return capped(said, id)
    if (from) patch(from.id, { picked: said })
    else setDraft("")
    mine(said)
    reply([answered(answer, `test:${id}`, false, id), anythingElse()])
  }

  /** What an outside visit left in her record (F-83). */
  function askOutside(id: string, said: string) {
    const answer = outsideVisitAnswer(id)
    if (!answer) return
    if (!charge(said, `visit:${id}`)) return capped(said, id)
    setDraft("")
    mine(said)
    reply([answered(answer, `visit:${id}`, false, id), anythingElse()])
  }

  /** A tapped option in a question's list. */
  function pick(m: AskMsg, option: string) {
    if (thinking || m.picked || ended) return
    const choose = () => {
      patch(m.id, { picked: option })
      mine(option)
    }
    // "Ask about something else" leaves a result or the plan for every topic.
    if (option === MORE) {
      choose()
      return reply([{ kind: "ask", text: AGAIN, options: topics(), step: "topic" }])
    }
    switch (m.step) {
      case "topic": {
        choose()
        const topic = (Object.keys(TOPICS) as Topic[]).find((k) => TOPICS[k] === option) ?? "result"
        // The first starter she taps files the thread under its group.
        setThread((t) => (t.topic ? t : { ...t, topic: GROUP_OF[topic] }))
        return reply(topicOpening(topic))
      }
      case "scoped": {
        const t = trendFor(m.scope)
        const s = t && suggestionsFor(t).find((x) => x.label === option)
        if (t && s) askMarker(t, s.ask, option, m)
        return
      }
      case "urgent":
        choose()
        return reply(option === URGENT.yes ? [{ kind: "urgent" }] : [{ kind: "ask", text: PROMPTS.concern, options: [...CONCERNS], step: "concern" }])
      case "concern":
        if (option === CONCERNS[3]) {
          choose()
          setAwaiting("concern")
          return reply([{ kind: "text", from: "assistant", text: PROMPTS.concernText }])
        }
        return askConcern(option as (typeof CONCERNS)[number], option, m)
      case "plan":
        choose()
        return reply([answered(planReply(option), "plan", false, option), planFollowUp(option)])
      case "test": {
        const test = openTests().find((x) => x.name === option)
        if (test) askTest(test.id, option, m)
        return
      }
      case "coach": {
        const q = coachQuestion(onboarding, m.scope ?? "")
        const answer = q && coachAnswer(q, option)
        if (!q || !answer) return
        choose()
        saveCoach(q.id, option)
        return reply([{ kind: "answer", answer, scope: `coach:${q.id}` }, anythingElse()])
      }
      case "batch": {
        const id = m.scope ?? ""
        const answer = batchAnswer(id, markers)
        if (!answer) return
        if (!charge(BATCH_ASK, `batch:${id}`, "batch", id)) return capped(BATCH_ASK, "new-results")
        choose()
        return reply([answered(answer, `batch:${id}`), anythingElse()])
      }
    }
  }

  function pickResult(m: Extract<Msg, { kind: "results" }>, id: string) {
    const t = trendFor(id)
    if (thinking || m.picked || ended || !t) return
    patch(m.id, { picked: id })
    mine(t.marker.name)
    reply(scopedOpening(id))
  }

  function pickMedicine(m: Extract<Msg, { kind: "medicines" }>, id: string) {
    if (thinking || m.picked || ended) return
    askMedicine(id, MEDICATIONS.find((x) => x.id === id)?.name ?? id, m)
  }

  function pickUrgent(m: Extract<Msg, { kind: "urgent" }>, option: string) {
    if (thinking || m.picked || ended) return
    patch(m.id, { picked: option })
    mine(option)
    if (option === URGENT.end) return endChat()
    reply([{ kind: "ask", text: AGAIN, options: topics(), step: "topic" }])
  }

  /** Her own words: safety first, then the open list, then what they ask. */
  function send() {
    const said = draft.trim()
    // Only a photo or a file: it goes, and the assistant asks what about it.
    if (!said && files.length && !thinking && !ended) {
      mine("")
      return reply([{ kind: "text", from: "assistant", text: ATTACHED }])
    }
    if (!said || thinking || ended) return
    if (questionKind(said) === "safety") {
      setDraft("")
      setAwaiting(undefined)
      mine(said)
      return reply([{ kind: "urgent" }])
    }
    const open = [...thread.messages].reverse().find((m) => CHOOSERS.has(m.kind))
    if (open?.kind === "ask" && !open.picked) {
      const match = open.options.find((o) => o.toLowerCase() === said.toLowerCase())
      if (match) {
        setDraft("")
        return pick(open, match)
      }
    }
    if (awaiting === "concern") {
      setAwaiting(undefined)
      return askConcern(CONCERNS[3], said, undefined, said)
    }
    const scope = [...thread.messages].reverse().find((m): m is Extract<Msg, { kind: "context" }> => m.kind === "context")?.marker
    const intent = questionKind(said) === "plan" ? ({ kind: "plan" } as const) : readQuestion(said, { markerId: scope, planLive })
    if (intent.kind === "marker") {
      const t = trendFor(intent.id)
      if (t) return askMarker(t, intent.ask, said)
    }
    if (intent.kind === "medicine") return askMedicine(intent.id, said)
    if (intent.kind === "test" && intent.id) return askTest(intent.id, said)
    if (intent.kind === "outside") return askOutside(intent.id, said)
    if (intent.kind === "concern") return askConcern(intent.concern, said, undefined, said)
    setDraft("")
    mine(said)
    if (intent.kind === "plan") return reply([answered(planReply(said), "plan", false, said), planFollowUp(said)])
    if (intent.kind === "visit") return reply([{ kind: "visit" }, anythingElse()])
    if (intent.kind === "test")
      return reply([{ kind: "ask", text: "Which test is it? I can explain the ones in your record.", options: openTests().map((x) => x.name), step: "test" }])
    reply([
      { kind: "text", from: "assistant", text: CANT_ANSWER },
      { kind: "ask", text: AGAIN, options: topics(), step: "topic" },
    ])
  }

  /* ------------------------------------------------------------ ending -- */

  const ended = thread.messages.at(-1)?.kind === "ended"

  function endChat() {
    clearTimeout(timer.current)
    setThinking(false)
    setAwaiting(undefined)
    say([{ kind: "ended" }])
  }

  /** "Start a new chat" under an ended thread: a category first. */
  function startOver() {
    clearTimeout(timer.current)
    setThinking(false)
    setAwaiting(undefined)
    setDraft("")
    anchor.current = undefined
    follow.current = Date.now()
    setThread(fresh([]))
  }

  /** Back to an empty composer and a still thread, before another one. */
  function settle() {
    clearTimeout(timer.current)
    setThinking(false)
    setAwaiting(undefined)
    setDraft("")
    setFacts(undefined)
    anchor.current = undefined
    follow.current = Date.now()
    tops.current.clear()
  }

  /** "New chat" in the drawer: the thread on screen is filed, then a
      category is chosen for the next. */
  function newChat() {
    setMenu(false)
    if (!ended && hasQuestion(thread)) onboarding.save({ chats: filed(onboarding.chats ?? [], thread) }).catch(() => {})
    settle()
    setThread(fresh([]))
  }

  /** A past chat from the drawer opens as it was, to carry on; the one on
      screen is filed first. */
  function openPast(id: string) {
    setMenu(false)
    const past = onboarding.chats?.find((c) => c.id === id)
    if (!past || id === thread.id) return
    if (!ended && hasQuestion(thread)) onboarding.save({ chats: filed(onboarding.chats ?? [], thread) }).catch(() => {})
    settle()
    setThread({
      id: past.id,
      topic: past.topic,
      title: past.title,
      startedAt: past.startedAt,
      lastAt: past.lastAt ?? past.startedAt,
      messages: (past.messages as Msg[]).filter((m) => m.kind !== "ended"),
    })
  }

  /** The drawer's list: the history, with the thread on screen in it. */
  const history = React.useMemo(
    () => (menu ? filed(onboarding.chats ?? [], thread) : onboarding.chats ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [menu, onboarding.chats, thread]
  )

  /* --------------------------------------------------------- drawing -- */

  const lastChooser = [...thread.messages].reverse().find((m) => CHOOSERS.has(m.kind))?.id
  const liveFor = (m: Msg & { picked?: string }) => m.id === lastChooser && !m.picked && !ended && !thinking
  const improve = onboarding.why?.improve
  const groups = React.useMemo(() => resultGroups(markers, improve), [markers, improve])

  function render(m: Msg) {
    switch (m.kind) {
      case "text":
        return m.from === "patient" ? (
          <MyBubble text={m.text} at={m.at} files={m.files} />
        ) : (
          <TheirBubble at={m.at} named>
            <Text style={bubbleText()}>{keepTogether(m.text)}</Text>
          </TheirBubble>
        )
      case "ask":
        return (
          <TheirBubble at={m.at} named wide>
            <Text style={bubbleText()}>{keepTogether(m.text)}</Text>
            <Options options={m.options} live={liveFor(m)} picked={m.picked ? [m.picked] : []} onPick={(o) => pick(m, o)} />
          </TheirBubble>
        )
      case "results":
        return <ResultChooser text={PROMPTS.result} at={m.at} watch={groups.watch} rest={groups.rest} live={liveFor(m)} picked={m.picked} onPick={(id) => pickResult(m, id)} />
      case "medicines":
        return <MedicineChooser text={PROMPTS.medicine} at={m.at} choices={medicineChoices()} live={liveFor(m)} picked={m.picked} onPick={(id) => pickMedicine(m, id)} />
      case "context": {
        const t = trendFor(m.marker)
        return t ? <ContextCard t={t} /> : null
      }
      case "answer":
        return (
          <AnswerBubble
            answer={m.answer}
            at={m.at}
            onWhy={m.answer.facts?.length ? () => setFacts(m.answer.facts) : undefined}
            followOn={m.followOn ? { key: `${thread.id}:${m.scope}`, eligible: true } : undefined}
            footer={m.first}
          />
        )
      case "outlook":
        return <OutlookAnswer at={m.at} />
      case "visit": {
        const v = nextVisit(onboarding)
        const suggestions = visitSuggestions(v)
        const saved = questionsFor(onboarding.questions, v?.id ?? "")
          .map((q) => q.text)
          .filter((q) => !suggestions.includes(q))
        return <VisitBubble intro={visitIntro(v)} at={m.at} visit={v} saved={saved} suggestions={suggestions} />
      }
      case "urgent":
        return <UrgentBubble at={m.at} live={liveFor(m)} picked={m.picked} onPick={(o) => pickUrgent(m, o)} />
      case "limit":
        return m.gone ? null : (
          <LimitCard
            question={m.question}
            about={m.about}
            resetsOn={allowance.resetsOn}
            saved={m.saved}
            onSaved={() => {
              patch(m.id, { saved: true })
              setDraft("")
            }}
            onGone={() => patch(m.id, { gone: true })}
            member={allowance.member}
            onTopUp={() => setCredit(true)}
          />
        )
      case "ended":
        return <EndedRow onStart={startOver} />
      case "grace":
        return <Text style={styles.grace}>{keepEnd(LIMIT.grace)}</Text>
    }
  }

  return (
    <View style={styles.screen}>
      {/* One soft ground from the status bar to the home indicator: no
          white bars over or under the thread (user, 5 Oct 2026). */}
      <PageGround />
      <DarkStatusBar />
      {asking ? (
        <PageHeader title="Ask Inlay" action={{ label: "History", onPress: () => setMenu(true) }} />
      ) : (
        <View style={[styles.head, { paddingTop: top + 16 }]}>
          {/* Only the chats menu here (user, 5 Oct 2026): no back caret,
              title or "End chat". Swipe back still leaves the page. */}
          <View style={styles.headRow}>
            <Pressable
              onPress={() => setMenu(true)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Chats"
              style={({ pressed }) => [styles.menu, pressed && styles.closePressed]}
            >
              <List size={20} color={ink.detail} />
            </Pressable>
          </View>
        </View>
      )}

      {choosing && !asking ? (
        <CategoryPicker chats={onboarding.chats ?? []} categories={onboarding.chatCategories} planLive={planLive} onStart={startIn} onCreate={createCategory} />
      ) : (
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.fill}>
          {choosing ? (
            <AskWelcome options={bare ? [] : topics()} onPick={pickTopic} />
          ) : (
          <ScrollView
            ref={scroll}
            onLayout={(e) => (viewport.current = e.nativeEvent.layout.height)}
            onContentSizeChange={onContentSize}
            contentContainerStyle={styles.thread}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.top}>
              <Text style={styles.day}>{relativeDay(thread.startedAt)}</Text>
            </View>
            {thread.messages.map((m) => (
              <View key={m.id} onLayout={(e) => tops.current.set(m.id, e.nativeEvent.layout.y)}>
                {render(m)}
              </View>
            ))}
            {thinking && <TypingBubble />}
          </ScrollView>
          )}
          </View>

          {!ended && (
            <View>
              <ChatBar
                notice={creditNotice && creditNotice.words !== hiddenNotice && !limitShown ? { ...creditNotice, onClose: () => setHiddenNotice(creditNotice.words) } : undefined}
                value={draft}
                onChange={setDraft}
                onSend={send}
                canSend={!thinking}
                placeholder={awaiting ? "Describe what's bothering you" : asking ? "Ask anything" : "Ask a question"}
                bottom={asking ? 0 : bottom}
                bare
                voice
                attachments={files}
                onAttach={files.length < MAX_ATTACHMENTS ? () => setAttaching(true) : undefined}
                onRemoveAttachment={(id) => setFiles((f) => f.filter((x) => x.id !== id))}
              />
              {asking && <Text style={[styles.disclaimer, { paddingBottom: Math.max(bottom, space.gutter) }]}>{DISCLAIMER}</Text>}
            </View>
          )}
          {ended && <View style={[styles.endedFoot, { height: Math.max(bottom, space.gutter) }]} />}
        </KeyboardAvoidingView>
      )}

      {attaching && (
        <AttachSheet
          room={MAX_ATTACHMENTS - files.length}
          onAdd={(added) => setFiles((f) => [...f, ...added].slice(0, MAX_ATTACHMENTS))}
          onClose={() => setAttaching(false)}
        />
      )}
      {facts && <FactsSheet facts={facts} onClose={() => setFacts(undefined)} />}
      {credit && (
        <CreditSheet
          onClose={() => setCredit(false)}
          onDone={() => {
            // A question waiting at the limit goes at once.
            const waiting = thread.messages.find((m) => m.kind === "limit" && !m.gone)
            if (!waiting) return
            patch(waiting.id, { gone: true })
            send()
          }}
        />
      )}
      <ChatHistory
        open={menu}
        chats={history}
        categories={onboarding.chatCategories}
        currentId={hasQuestion(thread) ? thread.id : undefined}
        onClose={() => setMenu(false)}
        onOpen={openPast}
        onNew={newChat}
      />
    </View>
  )
}

/* The signed-in page column: Frontline's 16 gutter, as on every page with
   the tab bar or a back button, and 420 wide at most on a large screen. */
const column = { width: "100%", maxWidth: 420 + space.gutter * 2, alignSelf: "center", paddingHorizontal: space.gutter } as const

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.page },
  fill: { flex: 1 },

  // No bar: the chats button floats on the page's ground, the consent
  // page's round back button (32, #EBEBEB, a 20 icon).
  head: {},
  headRow: { ...column, paddingBottom: 4, flexDirection: "row", alignItems: "center", gap: space.inline },
  menu: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#EBEBEB", alignItems: "center", justifyContent: "center" },
  closePressed: { opacity: 0.7 },
  endedFoot: {},

  // Under the header the page's own margin, as at its sides (Frontline
  // 16); messages a list's 12 apart.
  thread: { ...column, paddingTop: space.gutter, paddingBottom: space.section, gap: space.item },
  top: { alignItems: "center", gap: space.stack, marginBottom: space.stack },
  // The day over the thread, as Frontline labels a day's group.
  day: { ...type.metaStrong, color: ink.tertiary },
  disclaimer: { ...type.meta, textAlign: "center", paddingHorizontal: space.gutter, marginTop: -8 },
  grace: { ...type.meta, color: ink.tertiary, textAlign: "center", paddingHorizontal: space.section, marginVertical: space.inline },
})
