import { FINDINGS, SOURCES } from "@/lib/record"

/* "Your why": the onboarding conversation, the setup step after consent.

   Dr. Blanchard's motivational interviewing, as a conversation rather than a
   survey, asking every question in his write up, in its order (patients rarely finish surveys, but they will talk): one question
   at a time, a short reflection before the next, and the patient's own
   words carried forward. The eight steps, in order:

     1  start with the patient's life, not their disease
     2  discover their why
     3  let them assess their own health
     4  connect their why to their medical reality (elicit, provide, elicit)
     5  create discrepancy without shame (two futures)
     6  elicit change talk
     7  measure importance and confidence
     8  turn motivation into one achievable action

   then the Human Flourishing Index, the intake measure behind the Inlay
   score, shown as a gauge.

   A fixed script for the prototype: it is the guardrail skeleton the real
   AI led (and spoken) version keeps to. The record starts building the
   moment consent is signed, so by step 4 the first results are in.
   Anything that reads as a crisis stops the script (see needsHelp). */

export type Answers = {
  /** Open answers are kept as typed; each turn's reply is also in `said`. */
  values: string
  healthyFor: string
  future: string
  /** "Yes, that's it" to the reflection, or "Not quite". */
  understood?: string
  /** Their reason for being healthy, in their own words. */
  reason: string
  health?: string
  improve: string[]
  share?: string
  whichFuture?: string
  importance?: number
  confidence?: number
  readiness?: number
  focus?: string
  step: string
  stepConfidence?: number
  /** The flourishing index, one 1 to 5 answer per item. */
  flourish: number[]
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
  said: {},
}

/* ------------------------------------------------------------ options -- */

/* Options only where the answer is a choice from a set (a rating, an area,
   yes or no); anything open is the patient's own words. */
const HEALTH = ["Excellent", "Very good", "Good", "Fair", "Poor"]
const IMPROVE = ["Energy", "Weight", "Sleep", "Stress", "Fitness", "Nutrition", "Blood pressure", "Blood sugar", "Something else"]
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

/** The Flourish Measure (VanderWeele, Harvard Human Flourishing Program):
    two items for each of five domains, plus two for financial and material
    stability. The validated measure is 0 to 10; here each is five faces,
    1 to 5, with a word for each step. Wording to be checked against the
    validated version before release. */
export const FLOURISH = [
  { domain: 0, text: "Overall, how satisfied are you with life as a whole these days?", words: ["Not at all", "A little", "Somewhat", "Mostly", "Completely"] },
  { domain: 0, text: "In general, how happy or unhappy do you usually feel?", words: ["Unhappy", "A bit low", "Okay", "Happy", "Very happy"] },
  { domain: 1, text: "In general, how would you rate your physical health?", words: ["Poor", "Fair", "Good", "Very good", "Excellent"] },
  { domain: 1, text: "How would you rate your overall mental health?", words: ["Poor", "Fair", "Good", "Very good", "Excellent"] },
  { domain: 2, text: "Overall, to what extent do you feel the things you do in your life are worthwhile?", words: ["Not at all", "A little", "Somewhat", "Mostly", "Completely"] },
  { domain: 2, text: "“I understand my purpose in life.”", words: ["Disagree", "Not really", "Unsure", "Agree", "Fully agree"] },
  { domain: 3, text: "“I always act to promote good in all circumstances, even in difficult and challenging situations.”", words: ["Not true", "A little", "Somewhat", "Mostly", "Fully true"] },
  { domain: 3, text: "“I am always able to give up some happiness now for greater happiness later.”", words: ["Not true", "A little", "Somewhat", "Mostly", "Fully true"] },
  { domain: 4, text: "“I am content with my friendships and relationships.”", words: ["Disagree", "Not really", "Unsure", "Agree", "Fully agree"] },
  { domain: 4, text: "“My relationships are as satisfying as I would want them to be.”", words: ["Disagree", "Not really", "Unsure", "Agree", "Fully agree"] },
  { domain: 5, text: "How often do you worry about being able to meet normal monthly living expenses?", words: ["Always", "Often", "Sometimes", "Rarely", "Never"] },
  { domain: 5, text: "How often do you worry about safety, food, or housing?", words: ["Always", "Often", "Sometimes", "Rarely", "Never"] },
]

export const DOMAINS = [
  "Happiness and life satisfaction",
  "Physical and mental health",
  "Meaning and purpose",
  "Character and virtue",
  "Close relationships",
  "Financial stability",
]

/** Overall (the mean of all twelve, "secure flourishing") and each domain. */
export function flourishScore(answers: number[]) {
  const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0)
  return {
    overall: mean(answers),
    domains: DOMAINS.map((_, d) => mean(answers.filter((_, i) => FLOURISH[i]?.domain === d))),
  }
}

/* ------------------------------------------------- the medical reality -- */

/** Step 4 talks about one finding, the one closest to what the patient
    said they want to improve. */
const TOPICS = {
  bp: {
    finding: "bp",
    topic: "blood pressure",
    info: "High blood pressure often doesn't cause symptoms, but over time it can raise the risk of stroke, heart disease and kidney disease. The good news is that it can often be improved with treatment and changes like activity, nutrition and weight.",
  },
  a1c: {
    finding: "a1c",
    topic: "blood sugar",
    info: "An A1c in this range is called prediabetes. It usually has no symptoms, but over time it can lead to type 2 diabetes. The good news is that small changes in activity, eating and weight can often bring it back down, and many people never go on to develop diabetes.",
  },
  bmi: {
    finding: "bmi",
    topic: "weight",
    info: "Extra weight can push up blood pressure, blood sugar and cholesterol, and it strains the joints. Even losing 5 to 10 percent of body weight can improve all of these.",
  },
} as const

function topicFor(a: Answers) {
  if (a.improve.includes("Blood sugar")) return TOPICS.a1c
  if (a.improve.includes("Weight")) return TOPICS.bmi
  return TOPICS.bp
}

/* ------------------------------------------------------------ helpers -- */

/** Their words, quoted back as said, without a closing full stop. */
const quote = (s: string) => s.trim().replace(/[.!]+$/, "")
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
const clause = (s: string) => lower(s.trim().replace(/^i (want to |hope to |would )?/i, "").replace(/[.!]+$/, ""))
/** Their words turned to face them: "my kids" becomes "your kids". */
const toYou = (s: string) =>
  quote(s)
    .replace(/\bI'm\b/gi, "you're")
    .replace(/\bI am\b/gi, "you are")
    .replace(/\bmyself\b/gi, "yourself")
    .replace(/\bmy\b/gi, "your")
    .replace(/\bme\b/gi, "you")
    .replace(/\bI\b/g, "you")
/** An answer from before open answers were free text, or a skip, as text. */
const words = (v: unknown) => (Array.isArray(v) ? v.join(", ") : typeof v === "string" ? v : "")
/** What they said at a turn, or nothing if they skipped it. */
export const own = (a: Answers, id: string) => (a.said[id] && a.said[id] !== "Skip" ? a.said[id] : "")

/** What the patient seems to be saying, offered back to check. */
function reflection(a: Answers) {
  const parts: string[] = []
  const values = words(a.values).trim()
  const healthyFor = words(a.healthyFor).trim()
  if (values) parts.push(`${lower(toYou(values))} matter most to you`)
  if (healthyFor) parts.push(`you want to be healthy for ${lower(toYou(healthyFor))}`)
  if (a.future.trim()) parts.push(`you hope to still ${toYou(clause(a.future))} for years to come`)
  if (!parts.length) return "It sounds like your health is about more than a number."
  const said = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0]
  return `It sounds like your health isn't really about a number. ${capital(said)}.`
}

/** The same, in the patient's own voice: their reason, once they agree. */
function ownWords(a: Answers) {
  const healthyFor = words(a.healthyFor).trim()
  const want = [healthyFor ? `be there for ${lower(quote(healthyFor))}` : "", a.future.trim() ? `still ${clause(a.future)}` : ""]
    .filter(Boolean)
    .join(", and ")
  return want ? `I want to stay healthy so I can ${want}.` : "I want to feel well and live fully for a long time."
}

/** What they told me in the change talk, played back in one line. */
function changeTalk(a: Answers) {
  const parts = [own(a, "better"), own(a, "worries"), own(a, "reasons")].filter(Boolean).map((p) => lower(toYou(p)))
  if (!parts.length) return []
  const said = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0]
  return [`So you're telling me: ${said}. That's you making the case for change, not me.`]
}

/** The area they want to improve, for the scale questions. */
const area = (a: Answers) => {
  const first = a.improve.find((i) => i !== "Something else")
  return first ? `your ${first.toLowerCase()}` : "this part of your health"
}

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

const text = (key: keyof Answers, placeholder?: string, ideas?: string[]) => ({
  input: (): Input => ({ type: "text", placeholder, ideas }),
  save: (_: Answers, v: Value) => ({ [key]: String(v) }) as Partial<Answers>,
})
/** An open question whose answer lives only in `said`. */
const note = (placeholder?: string, ideas?: string[]) => ({
  input: (): Input => ({ type: "text", placeholder, ideas }),
  save: () => ({}),
})
const reply = (key: keyof Answers, options: string[]) => ({
  input: (): Input => ({ type: "reply", options }),
  save: (_: Answers, v: Value) => ({ [key]: String(v) }) as Partial<Answers>,
})
const pick = (key: keyof Answers, options: string[]) => ({
  input: (): Input => ({ type: "pick", options }),
  save: (_: Answers, v: Value) => ({ [key]: v as string[] }) as Partial<Answers>,
})
/** The words under the five faces, lowest first. */
export const SCALE_WORDS = ["Not at all", "A little", "Somewhat", "Quite", "Very"]
const READY_WORDS = ["Not ready", "A little", "Somewhat", "Quite", "Ready now"]
const quoted = (w: string) => `“${w}”`

const scale = (key: keyof Answers, words = SCALE_WORDS) => ({
  input: (): Input => ({ type: "scale", words }),
  save: (_: Answers, v: Value) => ({ [key]: Number(v) }) as Partial<Answers>,
})
/* The scaling follow ups: "why Quite and not A little?" draws out their
   reasons (never "why not Very?"), and "what would move you up one?" the
   next step. */
const whyNotLower = (key: "importance" | "confidence"): Pick<Turn, "skip" | "say" | "input" | "save"> => ({
  skip: (a) => a[key] === undefined || a[key]! < 2,
  say: (a) => [`Why ${quoted(SCALE_WORDS[a[key]! - 1])} and not ${quoted(SCALE_WORDS[Math.max(1, a[key]! - 2) - 1])}?`],
  ...note("Because...", ["It matters to me", "I've done it before", "I have support"]),
})
const upOne = (key: "importance" | "confidence"): Pick<Turn, "skip" | "say" | "input" | "save"> => ({
  skip: (a) => a[key] === undefined || a[key]! >= 5,
  say: (a) => [`What might move you from ${quoted(SCALE_WORDS[a[key]! - 1])} to ${quoted(SCALE_WORDS[a[key]!])}?`],
  ...note("Maybe if...", ["More support", "More time", "A clear plan"]),
})

export const TURNS: Turn[] = [
  // 1. Know me: start with the patient's life, not their disease.
  {
    id: "hello",
    say: (_, name) => [
      `Hi ${name}, I'm your Inlay Health assistant. Before we talk about your health numbers, I'd like to understand what matters most to you.`,
      "There are no right answers, and you decide what, if anything, you want to change. It takes about ten minutes, and you can skip any question.",
    ],
    input: () => ({ type: "reply", options: ["Sounds good"] }),
    save: () => ({}),
  },
  { id: "values", say: () => ["What are the most important things in your life right now?"], ...text("values", "My family, my work...", ["My family", "My health", "My work", "My friends", "My faith"]) },
  {
    id: "healthyFor",
    say: (a) => [a.values.trim() ? "Thank you for sharing that." : "That's okay.", "Who or what do you most want to be healthy for?"],
    ...text("healthyFor", "My kids, myself...", ["My kids", "My partner", "My parents", "Myself"]),
  },
  { id: "meaning", say: () => ["What activities or experiences give your life meaning?"], ...note("Time outdoors, my garden...", ["Time with family", "Being outdoors", "My work", "Travel"]) },
  { id: "future", say: () => ["What do you hope you're still able to do 10 or 20 years from now?"], ...text("future", "I want to...", ["Travel", "Play with my grandkids", "Stay independent", "Keep active"]) },
  { id: "dependsOn", say: () => ["Is there anyone who depends on you that you especially want to be there for?"], ...note("My mother...", ["My kids", "My partner", "My parents", "No one right now"]) },
  {
    id: "goodLife",
    say: () => ["When you imagine yourself living a really good life five years from now, what does that look like?"],
    ...note("I see myself...", ["Healthy and active", "Time with family", "Travelling more", "Less stress"]),
  },

  // 2. Discover the why: a ladder, not a list.
  {
    id: "whyImportant",
    say: (a) => {
      const hook = a.future.trim() || words(a.healthyFor).trim()
      return [hook ? `You said “${quote(hook)}”. Tell me more about why that is important to you.` : "Tell me more about why your health is important to you."]
    },
    ...note("It matters because...", ["I want to be there for them", "I want to stay independent", "I don't want to slow down"]),
  },
  { id: "participate", say: () => ["What would being healthy enough to really take part in that look like?"], ...note("I'd be able to...", ["Keep up with them", "Have more energy", "Do it without pain"]) },
  {
    id: "doWith",
    say: () => ["What are some things you'd want to be able to do with the people who matter to you?"],
    ...note("Travel together...", ["Travel together", "Walk and hike", "Play sports", "Cook together"]),
  },
  { id: "prevented", say: () => ["How would you feel if your health kept you from doing those things?"], ...note("I'd feel...", ["Sad", "Frustrated", "Worried", "Like I let them down"]) },
  {
    id: "understood",
    say: (a) => [reflection(a), "Did I understand that correctly?"],
    input: () => ({ type: "reply", options: ["Yes, that's it", "Not quite"] }),
    // Typed instead of tapped: their own words are the reason.
    save: (a, v) =>
      v === "Yes, that's it" || v === "Not quite"
        ? { understood: String(v), reason: v === "Not quite" ? a.reason : ownWords(a) }
        : { understood: "In my own words", reason: String(v).trim() },
  },
  {
    id: "reason",
    skip: (a) => a.understood !== "Not quite",
    say: () => ["Thanks for putting me right. In your own words, what's your reason for being healthy?"],
    input: () => ({
      type: "text",
      placeholder: "I want to stay healthy so I can...",
      ideas: ["Be there for my family", "Stay independent", "Keep doing what I love"],
    }),
    save: (a, v) => ({ reason: String(v).trim() || ownWords(a) }),
  },

  // 3. Let the patient assess their own health.
  { id: "health", say: () => ["Now, how would you describe your health today?"], ...reply("health", HEALTH) },
  {
    id: "doingWell",
    say: (a) => [
      a.health === "Fair" || a.health === "Poor" ? "Thanks for being honest about that." : "Good to hear.",
      "What do you think you're doing well?",
    ],
    ...note("I walk most days...", ["I walk most days", "I sleep well", "I eat well", "Not much right now"]),
  },
  { id: "concerns", say: () => ["What aspects of your health concern you most?"], ...note("My blood pressure...", ["My blood pressure", "My weight", "My sleep", "My energy"]) },
  {
    id: "shouldAddress",
    say: () => ["Is there anything about your health that you've been thinking you probably should address?"],
    ...note("I keep meaning to...", ["My weight", "My diet", "Exercise", "Stress"]),
  },
  {
    id: "noChange",
    say: () => ["If nothing changed about your current habits for the next five years, what would concern you?"],
    ...note("I'd worry that...", ["My weight", "My heart", "Losing energy", "Getting diabetes"]),
  },
  { id: "improve", say: () => ["What would you most like to improve? Pick any that apply."], ...pick("improve", IMPROVE) },

  // 4. Show me: connect the why to the medical reality (elicit, provide, elicit).
  {
    id: "heard",
    say: (a) => {
      const t = topicFor(a)
      const f = FINDINGS.find((x) => x.id === t.finding)!
      return [
        `Your records have started coming in from ${SOURCES.length} places. One thing I noticed is your ${f.name.toLowerCase()}: ${f.value} at your last check, where the goal is ${f.range.toLowerCase()}.`,
        `What have you heard about why ${t.topic} matters?`,
      ]
    },
    ...note("I've heard...", ["It raises heart risk", "Not much", "I'm not sure"]),
  },
  { id: "share", say: () => ["Would it be okay if I shared a little more about it?"], ...reply("share", ["Yes, go ahead", "Not right now"]) },
  {
    id: "makeOf",
    skip: (a) => a.share === "Not right now",
    say: (a) => [topicFor(a).info, "What do you make of that?"],
    ...note("I think...", ["It makes sense", "It worries me", "I'm surprised"]),
  },
  {
    id: "fits",
    skip: (a) => a.share === "Not right now",
    say: (a) => [`How does that fit with what you told me about ${a.future.trim() ? `still being able to ${toYou(clause(a.future))}` : "what matters most to you"}?`],
    ...note("It fits because...", ["It fits well", "It's a wake up call", "I'm not sure"]),
  },

  // 5. Create discrepancy without fear.
  {
    id: "habits",
    say: (a) => [
      a.share === "Not right now" ? "That's completely fine. We can come back to it any time." : "Thanks for thinking that through.",
      `You told me that ${a.future.trim() ? `being able to ${toYou(clause(a.future))}` : "your health"} is very important to you. How well do you think your current habits are helping you get there?`,
    ],
    ...note("Honestly...", ["Pretty well", "Somewhat", "Not very well"]),
  },
  { id: "gap", say: () => ["Where do you see the biggest gap?"], ...note("Probably...", ["Exercise", "Diet", "Sleep", "Stress"]) },
  {
    id: "futureA",
    say: () => [
      "Let's picture two futures. First, imagine that for the next five years nothing changes: same exercise, same eating habits, same stress and the same approach to your health. What do you think life might look like?",
    ],
    ...note("I'd probably...", ["About the same", "Harder", "More health problems"]),
  },
  {
    id: "futureB",
    say: () => [
      "Now imagine that over the next five years you gradually became more active, ate better, managed stress and got any health conditions under better control. What might be different?",
    ],
    ...note("I'd have...", ["More energy", "Feeling better", "More time with family"]),
  },
  {
    id: "whichFuture",
    say: () => ["Which future feels more consistent with the life you told me you want?"],
    ...reply("whichFuture", ["The second one", "The first one", "I'm not sure"]),
  },

  // 6. Ask me: elicit change talk; the patient makes the case, not the assistant.
  {
    id: "reasons",
    say: (a) => [
      a.whichFuture === "I'm not sure" ? "That's honest, and it's fine not to be sure yet." : "Okay.",
      "What are some reasons you might want to make a change?",
    ],
    ...note("I want to...", ["To feel better", "For my family", "To live longer"]),
  },
  { id: "better", say: () => ["What would be better about your life if you did?"], ...note("I'd have...", ["More energy", "More confidence", "Less worry"]) },
  { id: "worries", say: () => ["What worries you about continuing the way things are today?"], ...note("I worry that...", ["Getting sicker", "Needing more medication", "Losing independence"]) },
  { id: "familyNotice", say: () => ["What do you think your family might notice if you became healthier?"], ...note("They'd notice...", ["More energy", "Better mood", "More time together"]) },
  { id: "energy", say: () => ["How would having more energy change your everyday life?"], ...note("I could...", ["I'd do more with family", "I'd be more active", "I'd get more done"]) },
  { id: "difficult", say: () => ["What might you be able to do that is difficult today?"], ...note("Climb the stairs...", ["Climb the stairs", "Play with my kids", "Walk longer"]) },
  { id: "whyNow", say: () => ["What makes this important enough to consider doing something about now?"], ...note("Because...", ["My recent results", "My family", "I'm ready now"]) },

  // 7. Importance, confidence and readiness, 1 to 5, each with its follow ups.
  {
    id: "importance",
    say: (a) => [...changeTalk(a), `How important is improving ${area(a)} to you?`],
    ...scale("importance"),
  },
  { id: "importanceWhy", ...whyNotLower("importance") },
  { id: "importanceUp", ...upOne("importance") },
  {
    id: "confidence",
    say: () => ["If you decided to make this change, how confident are you that you could do it?"],
    ...scale("confidence"),
  },
  { id: "confidenceWhy", ...whyNotLower("confidence") },
  { id: "confidenceUp", ...upOne("confidence") },
  {
    id: "readiness",
    say: () => ["How ready are you to start doing something about it?"],
    ...scale("readiness", READY_WORDS),
  },

  // 8. Help me choose: one achievable action, the patient's own.
  {
    id: "focus",
    say: () => ["Of everything we've talked about, what's the one thing you'd most like to work on first?"],
    ...reply("focus", FOCUS),
  },
  {
    id: "focusOther",
    skip: (a) => a.focus !== "Something else",
    say: () => ["What would you like to work on?"],
    input: () => ({ type: "text", placeholder: "I'd like to work on...", ideas: ["Stress", "Alcohol", "Smoking"] }),
    save: (_, v) => ({ focus: String(v).trim() || "Something else" }),
  },
  {
    id: "step",
    say: (a) => [
      a.focus && a.focus !== "Something else" ? `${capital(a.focus)} it is.` : "Good choice.",
      "What's one change small enough that you feel confident you could actually do it this week?",
    ],
    ...text("step", "Walk 15 minutes after dinner on...", ["Walk 15 minutes after dinner", "Drink more water", "Go to bed earlier"]),
  },
  {
    id: "stepConfidence",
    skip: (a) => !a.step.trim(),
    say: () => ["How confident are you that you can do that?"],
    ...scale("stepConfidence"),
  },
  {
    id: "easier",
    // Shrink the step until confidence rises.
    skip: (a) => a.stepConfidence === undefined || a.stepConfidence >= 4,
    say: () => ["Let's make it easier. What would make the goal easier, or how could the step be smaller?"],
    ...note("I could...", ["Start smaller", "Do it twice a week", "Ask for help"]),
  },
  { id: "obstacle", say: () => ["What's most likely to get in the way?"], ...note("Getting home tired...", ["Getting home tired", "No time", "Bad weather"]) },
  { id: "solution", say: () => ["And what will you do if it does?"], ...note("I'll change into my walking shoes...", ["Do a shorter version", "Plan it ahead", "Ask a friend to join"]) },
  { id: "success", say: () => ["What will success look like for you?"], ...note("More energy, and...", ["More energy", "Better numbers", "Feeling stronger"]) },
  {
    id: "whyCard",
    say: () => ["Here's what you told me, in your words. It goes into your care plan, and you can change it any time.", { card: "why" }],
    input: () => ({ type: "reply", options: ["Looks right"] }),
    save: () => ({}),
  },

  // The Human Flourishing Index.
  {
    id: "flourishIntro",
    say: () => [
      "Finally, twelve quick ratings about how life is going overall. Tap the face that fits best. They give you and your care team a picture of the whole you, not just your labs.",
    ],
    input: () => ({ type: "reply", options: ["Okay"] }),
    save: () => ({}),
  },
  ...FLOURISH.map<Turn>((item, i) => ({
    id: `flourish${i}`,
    say: () => [item.text],
    input: () => ({ type: "scale", words: item.words }),
    save: (a, v) => {
      const next = [...a.flourish]
      next[i] = Number(v)
      return { flourish: next }
    },
  })),
  {
    id: "result",
    say: () => [
      "Thank you. Here's where you are today.",
      { card: "flourish" },
      "We'll track this alongside your record over time as part of your Inlay score, so you can watch it move. Next, your record.",
    ],
    input: () => ({ type: "reply", options: ["See my record"] }),
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
