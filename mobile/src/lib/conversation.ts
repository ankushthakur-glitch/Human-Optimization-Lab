/* "Your why": the onboarding conversation, the setup step after consent.

   The Inlay Human Flourishing Assessment, as a conversation rather than a
   survey: every question in the write up, in its order, one at a time. The
   steps, in order:

     1  the 8 flourishing domains, each rated 1 to 10 (higher is always
        better; 1 = not at all / worst possible, 5 = moderate / mixed,
        10 = completely / best possible)
     2  priority: which three areas she would most like to improve
     3  importance and confidence (1 to 10) for each of the three
     4  the Flourishing Profile, shown as a gauge
     5  "If your health and life were meaningfully better one year from
        today, what would be different?", in her own words

   A fixed script for the prototype: it is the guardrail skeleton the real
   AI led (and spoken) version keeps to. Anything that reads as a crisis
   stops the script (see needsHelp). */

export type Answers = {
  /** Kept for the care plan card and older profiles; no longer asked. */
  values: string
  healthyFor: string
  future: string
  understood?: string
  /** Her answer to "what would be different in a year", in her own words. */
  reason: string
  health?: string
  /** Areas for the watch list and goals, worked out from her priorities. */
  improve: string[]
  share?: string
  whichFuture?: string
  /** 1 to 5, the mean of her importance ratings, for the offers. */
  importance?: number
  /** 1 to 5, the mean of her confidence ratings, for the offers. */
  confidence?: number
  readiness?: number
  /** Her first priority. */
  focus?: string
  step: string
  stepConfidence?: number
  /** The flourishing assessment: one 1 to 10 answer per item, -1 where she
      chose "Not applicable / I prefer not to answer". */
  flourish: number[]
  /** The three domains she most wants to improve. */
  priorities: string[]
  /** 1 to 10, one per priority, in the same order. */
  importanceBy: number[]
  confidenceBy: number[]
  /** Something they said needs a person: the care team is told. */
  flagged?: boolean
  /** What the patient said at each turn, by turn id, to redraw the thread. */
  said: Record<string, string>
}

export const EMPTY: Answers = {
  values: "",
  healthyFor: "",
  future: "",
  reason: "",
  improve: [],
  step: "",
  flourish: [],
  priorities: [],
  importanceBy: [],
  confidenceBy: [],
  said: {},
}

/* ------------------------------------------------------------ options -- */

export const FOCUS = [
  "Movement",
  "Nutrition",
  "Sleep",
  "Stress",
  "Weight",
  "Taking my medications",
  "Tobacco",
  "Alcohol",
  "Something else",
]

/** The eight domains, in the order they are asked. */
export const DOMAINS = [
  "Physical health & vitality",
  "Emotional health & resilience",
  "Relationships & social connection",
  "Purpose, meaning & spiritual well-being",
  "Intellectual growth & cognitive engagement",
  "Contribution & life balance",
  "Financial & material well-being",
  "Health agency & self-efficacy",
]

/** The one scale: 1 to 10, as taps. */
const RATING = Array.from({ length: 10 }, (_, i) => String(i + 1))
const NOT_APPLICABLE = "Not applicable / I prefer not to answer"

type Item = { domain: number; text: string; optional?: boolean }

const q = (domain: number, ...texts: string[]): Item[] => texts.map((text) => ({ domain, text }))

/** The assessment, question by question. */
export const FLOURISH: Item[] = [
  ...q(
    0,
    "How would you rate your overall physical health?",
    "How satisfied are you with your energy and vitality?",
    "How well does your physical health allow you to do the things you want and need to do?",
    "How satisfied are you with your current level of strength, mobility and physical capability?"
  ),
  ...q(
    1,
    "How would you rate your overall emotional and mental well-being?",
    "How well are you able to manage stress in your life?",
    "How well do you recover from setbacks or difficult situations?",
    "How much control do you feel you have over your emotions and reactions?",
    "How optimistic are you about your future?"
  ),
  ...q(
    2,
    "How satisfied are you with your closest relationships?",
    "To what extent do you have people you can rely on when you need help?",
    "How connected do you feel to family, friends or your community?",
    "How satisfied are you with the amount of meaningful time you spend with people important to you?",
    "How strongly do you feel that you belong and are valued by others?"
  ),
  ...q(
    3,
    "To what extent does your life feel meaningful?",
    "How clearly do you understand your purpose or what is most important to you?",
    "How well does the way you live your life align with your values?",
    "How much does your life provide opportunities to serve or contribute to something beyond yourself?"
  ),
  {
    domain: 3,
    text: "To what extent do faith, spirituality, personal values, nature or another source of meaning provide strength and direction in your life?",
    optional: true,
  },
  ...q(
    4,
    "How mentally engaged and stimulated do you feel in your daily life?",
    "How satisfied are you with the amount you are learning and growing?",
    "How would you rate your ability to concentrate and think clearly?",
    "How often are you intellectually curious or interested in learning something new?",
    "How satisfied are you with the way you are developing your knowledge, abilities or skills?"
  ),
  ...q(
    5,
    "How meaningful do you find the way you spend most of your time?",
    "How satisfied are you with what you contribute through your work, family, community or other responsibilities?",
    "How much control do you feel you have over how you spend your time?",
    "How satisfied are you with the balance between your responsibilities and the rest of your life?",
    "How well does your current daily life support your health and well-being?"
  ),
  ...q(
    6,
    "How confident are you that you can meet your normal financial needs?",
    "How financially secure do you feel?",
    "How prepared do you feel for an unexpected financial expense?",
    "How much freedom does your financial situation give you to make choices that support your health and quality of life?",
    "How confident are you about your longer-term financial future?"
  ),
  ...q(
    7,
    "How well do you understand your current health?",
    "How confident are you that you know what you can do to improve your health?",
    "How confident are you that you can make meaningful changes in your health behaviors?",
    "How much control do you believe your daily choices have over your future health?",
    "How confident are you navigating the healthcare system and making healthcare decisions?"
  ),
]

/** Opening prompts the write up gives a domain. */
const OPENING: Record<number, string> = {
  0: "Thinking about your health and how you have felt recently...",
}

/** Overall (the mean of every answered item) and each domain. A "not
    applicable" answer (-1) is left out of both. */
export function flourishScore(answers: number[]) {
  const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0)
  const given = (i: number) => typeof answers[i] === "number" && answers[i] >= 0
  return {
    overall: mean(answers.filter((_, i) => given(i) && i < FLOURISH.length)),
    domains: DOMAINS.map((_, d) => mean(answers.filter((_, i) => given(i) && FLOURISH[i]?.domain === d))),
  }
}

/** How a domain score reads (product interpretation, not clinical cut offs). */
export function interpret(score: number) {
  if (score < 4) return "High-priority opportunity"
  if (score < 6) return "Significant opportunity"
  if (score < 8) return "Generally doing well; opportunity to optimize"
  return "Area of strength"
}

/* ------------------------------------------------------------ helpers -- */

/** What they said at a turn, or nothing if they skipped it. */
export const own = (a: Answers, id: string) => (a.said[id] && a.said[id] !== "Skip" ? a.said[id] : "")

/** The areas of her record each priority points to, for the watch list and goals. */
const IMPROVE_OF_DOMAIN: Record<string, string[]> = {
  [DOMAINS[0]]: ["Energy", "Fitness"],
  [DOMAINS[1]]: ["Stress"],
}

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length
/** A 1 to 10 mean on the app's 1 to 5 scale. */
const toFive = (xs: number[]) => Math.min(5, Math.max(1, Math.round(mean(xs) / 2)))

/** Words that stop the script and point to a person right away. A stand in
    for the clinician designed escalation pathway. */
const CRISIS = /suicid|kill myself|end my life|want to die|better off dead|hurt myself|harm myself|self.?harm/i
export const needsHelp = (text: string) => CRISIS.test(text)

/* ------------------------------------------------------------- script -- */

export type Input =
  /** One tap. */
  | { type: "reply"; options: string[] }
  /** Several taps, or their own words, then send. */
  | { type: "pick"; options: string[] }
  /** Their own words; `ideas` fill the box in. Can be skipped. */
  | { type: "text"; ideas?: string[]; placeholder?: string }
  /** Five faces, 1 to 5, with a word under each; one tap answers. */
  | { type: "scale"; words: string[] }

/** What the assistant shows: a line, or a card in the thread. */
export type Line = string | { card: "why" } | { card: "flourish" }

export type Value = string | string[] | number

export type Turn = {
  id: string
  say: (a: Answers, name: string) => Line[]
  input: (a: Answers) => Input
  skip?: (a: Answers) => boolean
  save: (a: Answers, value: Value) => Partial<Answers>
}

/** A 1 to 10 rating from a tap or typed words, kept in range. */
const rating = (v: Value) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(10, Math.max(1, Math.round(n))) : -1
}

/** The words under the five faces, lowest first (the face scale is still
    part of the chat's inputs). */
export const SCALE_WORDS = ["Not at all", "A little", "Somewhat", "Quite", "Very"]

/** A 1 to 10 question for the priority at `i`: importance or confidence. */
function priorityTurn(i: number, kind: "importance" | "confidence"): Turn {
  const key = kind === "importance" ? "importanceBy" : "confidenceBy"
  return {
    id: `${kind}${i}`,
    skip: (a) => !a.priorities[i],
    say: (a) =>
      kind === "importance"
        ? [`${a.priorities[i]}. How important is it to you to improve this area? 0 = not important, 10 = extremely important.`]
        : ["How confident are you that you could make meaningful progress in this area over the next six months? 0 = not confident, 10 = extremely confident."],
    input: () => ({ type: "reply", options: RATING }),
    save: (a, v) => {
      const next = [...a[key]]
      next[i] = rating(v)
      const importanceBy = key === "importanceBy" ? next : a.importanceBy
      const confidenceBy = key === "confidenceBy" ? next : a.confidenceBy
      return {
        [key]: next,
        ...(importanceBy.length ? { importance: toFive(importanceBy) } : {}),
        ...(confidenceBy.length ? { confidence: toFive(confidenceBy), readiness: toFive(confidenceBy) } : {}),
      } as Partial<Answers>
    },
  }
}

export const TURNS: Turn[] = [
  {
    id: "hello",
    say: (_, name) => [
      `Hi ${name}, I'm your Inlay Health assistant. Before we talk about your health numbers, I'd like to understand what matters most to you.`,
      "There are no right answers, and you decide what, if anything, you want to change. It takes about ten minutes, and you can skip any question.",
    ],
    input: () => ({ type: "reply", options: ["Sounds good"] }),
    save: () => ({}),
  },
  {
    id: "flourishIntro",
    say: () => [
      "8 areas of your life, a few questions each",
    ],
    input: () => ({ type: "reply", options: ["Okay"] }),
    save: () => ({}),
  },

  // 1. The eight domains, 1 to 10.
  ...FLOURISH.map<Turn>((item, i) => {
    const firstOfDomain = i === 0 || FLOURISH[i - 1].domain !== item.domain
    return {
      id: `flourish${i}`,
      say: () => [...(firstOfDomain && OPENING[item.domain] ? [OPENING[item.domain]] : []), item.text],
      input: () => ({ type: "reply", options: item.optional ? [...RATING, NOT_APPLICABLE] : RATING }),
      save: (a, v) => {
        const next = [...a.flourish]
        next[i] = v === NOT_APPLICABLE ? -1 : rating(v)
        return { flourish: next }
      },
    }
  }),

  // 2. Priority.
  {
    id: "priorities",
    say: () => ["Of all the areas we just discussed, which three would you most like to improve?"],
    input: () => ({ type: "pick", options: DOMAINS }),
    save: (_, v) => {
      const priorities = (Array.isArray(v) ? v : [String(v)]).slice(0, 3)
      return {
        priorities,
        focus: priorities[0],
        improve: [...new Set(priorities.flatMap((p) => IMPROVE_OF_DOMAIN[p] ?? []))],
      }
    },
  },

  // 3. Importance, then confidence, for each of the three.
  priorityTurn(0, "importance"),
  priorityTurn(0, "confidence"),
  priorityTurn(1, "importance"),
  priorityTurn(1, "confidence"),
  priorityTurn(2, "importance"),
  priorityTurn(2, "confidence"),

  // 4. The profile.
  {
    id: "result",
    say: () => [
      "Thank you. Here's your Flourishing Profile.",
      { card: "flourish" },
      "We'll track this alongside your record over time as part of your Inlay score, so you can watch it move.",
    ],
    input: () => ({ type: "reply", options: ["Continue"] }),
    save: () => ({}),
  },

  // 5. In her own words.
  {
    id: "oneYear",
    say: () => ["If your health and life were meaningfully better one year from today, what would be different?"],
    input: () => ({
      type: "text",
      placeholder: "In a year, I'd be...",
      ideas: ["More energy", "Less stress", "More time with family", "Feeling confident about my health"],
    }),
    save: (_, v) => ({ reason: String(v).trim() }),
  },
  {
    id: "whyCard",
    say: () => ["Here's what you told me, in your words. It goes into your care plan, and you can change it any time.", { card: "why" }],
    input: () => ({ type: "reply", options: ["Looks right"] }),
    save: () => ({}),
  },
]

/** A 1 to 5 answer typed rather than tapped, or undefined if there isn't one. */
export function typedScale(text: string) {
  const m = text.match(/\b([1-5])\b/)
  return m ? Number(m[1]) : undefined
}

/** How an answer reads in the thread, in the patient's bubble. */
export function spoken(value: Value) {
  if (Array.isArray(value)) return value.map((v, i) => (i ? v.charAt(0).toLowerCase() + v.slice(1) : v)).join(", ")
  return String(value)
}

/** The next turn from `from`, passing any the answers so far rule out. */
export function nextTurn(from: number, a: Answers) {
  let i = from
  while (i < TURNS.length && TURNS[i].skip?.(a)) i++
  return i
}
