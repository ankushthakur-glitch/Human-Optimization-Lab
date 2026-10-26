import type { Answer } from "@/lib/assistant"
import type { useOnboarding } from "@/lib/onboarding"
import { dayFrom, localDay } from "@/lib/member"
import { SLEEP_LAST, TOPICS } from "@/lib/topics"

/* The proactive coach (call, 23 Oct 2026): Inlay opens the conversation
   instead of waiting to be asked, with one question a day drawn from her
   own data: a stressful day, missed exercise days, broken sleep, or a
   time zone change while she is on a sleep plan. Members with a live plan
   only. The question shows on Home and as the first message in Ask Inlay;
   answering it or "Not now" puts it away until tomorrow. Each question
   names the number behind it and where it came from, and every answer
   ends on one thing to do (patient voice). The sample patient's figures
   come from lib/topics.ts; the mind ratings, the week's workouts and the
   time zone are sample signals until devices and check ins post them. */

type Store = ReturnType<typeof useOnboarding>

export type CoachId = "sleep" | "exercise" | "stress" | "travel"

export type CoachQuestion = {
  id: CoachId
  /** What her data shows, in one sentence. */
  signal: string
  question: string
  /** Where the signal came from. */
  source: string
  /** Her replies, one tap each, with Inlay's answer to each. */
  replies: { label: string; answer: Answer }[]
}

const SLEEP_LINK = { label: "Open tonight's sleep", href: "/topic/sleep" }
const WORKOUT_LINK = { label: "Open today's workout", href: "/topic/exercise" }
const MIND_LINK = { label: "Start today's Mind session", href: "/topic/mind" }
const SAFE = "If things ever feel like too much, you can call or text 988 at any time."

function sleepQuestion(s: Store, day: string): CoachQuestion {
  // Her own log of last night when she kept one, else the watch's.
  const night = s.topicLog?.[day]?.sleep?.night
  const woke = night?.woke ?? 3
  const latency = night?.latency ?? SLEEP_LAST.latency
  const times = woke === 1 ? "once" : `${woke} times`
  return {
    id: "sleep",
    signal: `You woke ${times} last night and took ${latency} minutes to fall asleep.`,
    question: "Was something keeping you up?",
    source: night ? "Your sleep log, last night" : "Apple Watch, last night",
    replies: [
      {
        label: "A stressful day",
        answer: {
          text: "Thank you for telling me. A busy mind is one of the most common reasons for waking in the night. Tonight, try ten minutes of your relaxation practice before bed. If you are awake for more than 15 minutes, get up and read somewhere dim until you feel sleepy.",
          link: SLEEP_LINK,
        },
      },
      {
        label: "Pain or discomfort",
        answer: {
          text: "Pain that wakes you is worth telling Dr. Patel about, especially if it keeps happening. If it is new or severe, call the clinic today.",
          ask: "Pain has been waking me at night. What could be causing it?",
        },
      },
      {
        label: "Noise or the CPAP",
        answer: {
          text: "A mask that leaks or a noisy room can break sleep without fully waking you. Check the mask fit before bed tonight; your CPAP shows how many hours you wore it each night.",
          link: SLEEP_LINK,
        },
      },
      {
        label: "Not sure",
        answer: { text: "That is fine. One night is not a pattern. I will look again tomorrow and only ask if it keeps happening." },
      },
    ],
  }
}

const EXERCISE: CoachQuestion = {
  id: "exercise",
  signal: "Your watch shows no workout on Tuesday or Thursday, so 2 of this week's 4 sessions are done.",
  question: "What got in the way?",
  source: "Apple Watch, this week",
  replies: [
    {
      label: "Short on time",
      answer: { text: "Then the short version may help: 20 minutes, the same four lifts with fewer sets. It still counts toward the week.", link: WORKOUT_LINK },
    },
    {
      label: "Sore or tired",
      answer: {
        text: "Some soreness in the first weeks is normal. Today's session has an easier version with lighter weights. If a joint hurts rather than aches, skip that lift and tell Dr. Patel.",
        link: WORKOUT_LINK,
      },
    },
    {
      label: "Felt unwell",
      answer: { text: "Rest is the right call when you feel unwell. Missed days stay in the series with no penalty, and the plan picks up when you are ready." },
    },
    {
      label: "Busy week",
      answer: { text: "Weeks like that happen. Tomorrow's session is ready, and two sessions this week still keeps your strength on track.", link: WORKOUT_LINK },
    },
  ],
}

const REAPPRAISE = (what: string): Answer => ({
  text: `That sounds like a hard day with ${what}. When stress runs ahead of coping, a short reappraisal can help: we name what happened, how it felt and the thought behind it, then look for another way to see it. It takes about five minutes. ${SAFE}`,
  link: MIND_LINK,
})

const STRESS: CoachQuestion = {
  id: "stress",
  signal: "Yesterday you rated your stress 8 and your coping 4, the widest gap this week.",
  question: "Did something happen?",
  source: "Your Mind check in, yesterday",
  replies: [
    { label: "Work", answer: REAPPRAISE("work") },
    { label: "Family", answer: REAPPRAISE("family") },
    { label: "My health", answer: REAPPRAISE("your health") },
    { label: "Rather not say", answer: { text: `That is fine, you never have to say. Today's Mind session is a good place to let some of it settle. ${SAFE}`, link: MIND_LINK } },
  ],
}

const TRAVEL: CoachQuestion = {
  id: "travel",
  signal: "Your phone moved to Eastern Time last night, 3 hours ahead of home.",
  question: "Shall I shift your sleep window while you are away?",
  source: "Your phone's time zone, this morning",
  replies: [
    {
      label: "Yes, shift it",
      answer: {
        text: "Tonight's window moves 1 hour toward local time, then 1 more each night, so by Thursday you are in bed at 10:30 local. Get bright light in the morning and keep the CPAP with you.",
        link: SLEEP_LINK,
      },
    },
    { label: "Keep my usual times", answer: { text: "Then keep to home time where you can. For a short trip that is often easier than shifting twice.", link: SLEEP_LINK } },
    {
      label: "Back home soon",
      answer: { text: "Then half a shift is enough: tonight's window moves 1 hour, and it moves back the night you land.", link: SLEEP_LINK },
    },
  ],
}

/** The questions her data supports today: travel only while she is on a
    sleep plan. */
function candidates(s: Store, day: string): CoachQuestion[] {
  const sleepPlan = TOPICS.some((t) => t.id === "sleep")
  return [sleepQuestion(s, day), EXERCISE, STRESS, ...(sleepPlan ? [TRAVEL] : [])]
}

/** One question by id, for Ask Inlay opened about it. */
export function coachQuestion(s: Store, id: string, now = new Date()): CoachQuestion | undefined {
  return candidates(s, localDay(now)).find((q) => q.id === id)
}

/** Today's question: the one already asked today, else the next in turn,
    so each day brings a different signal. */
export function todaysQuestion(s: Store, now = new Date()): CoachQuestion {
  const day = localDay(now)
  const list = candidates(s, day)
  const asked = s.coach?.day === day ? list.find((q) => q.id === s.coach?.id) : undefined
  return asked ?? list[Math.floor(dayFrom(day).getTime() / 86400000) % list.length]
}

/** Still waiting for her today: neither answered nor put off. */
export function coachOpen(s: Store, now = new Date()) {
  const c = s.coach
  return !(c && c.day === localDay(now) && (c.answer || c.later))
}

/** Inlay's answer to one of her replies. */
export const coachAnswer = (q: CoachQuestion, label: string) => q.replies.find((r) => r.label === label)?.answer
