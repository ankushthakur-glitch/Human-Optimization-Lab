import { EMPTY, FLOURISH, TURNS, type Answers } from "@/lib/conversation"

/* How much of her health profile the patient has filled in (14 Oct 2026).
   The health questions, her why and the Human Flourishing Index, used to
   sit in setup right after "Updates about your care". The client found
   that too much to ask before she has seen a single result, so setup now
   goes straight to the record and the same conversation waits on the
   home as "Your profile is 2% complete". It is the conversation in
   lib/conversation.ts, so its progress is the conversation's: the
   questions she has answered over the questions that apply to her. */

/** About how long a question takes to answer, in seconds (the script
    promises "about ten minutes" for the whole conversation). */
const SECONDS_PER_QUESTION = 15

/** A turn that asks nothing, only "Sounds good" or "Okay": it takes no
    part in the count. */
const isAcknowledgement = (a: Answers, id: string) => {
  const turn = TURNS.find((t) => t.id === id)
  if (!turn) return true
  const input = turn.input(a)
  return input.type === "reply" && input.options.length === 1
}

export type ProfileProgress = {
  /** 0 to 100, whole numbers. */
  percent: number
  answered: number
  total: number
  /** Whole minutes left at an easy pace, never less than 1 while some remain. */
  minutesLeft: number
  /** Nothing answered yet, so the card says "Start" rather than "Continue". */
  started: boolean
  complete: boolean
}

export function profileProgress(why?: Partial<Answers>): ProfileProgress {
  const a: Answers = { ...EMPTY, ...why }
  const questions = TURNS.filter((t) => !t.skip?.(a) && !isAcknowledgement(a, t.id))
  const answered = questions.filter((t) => t.id in a.said).length
  const total = questions.length
  // Finished the conversation, or has all twelve flourishing ratings in
  // (a profile that came from the old setup, which never wrote `said`).
  const rated = a.flourish.filter((n) => typeof n === "number").length >= FLOURISH.length
  const complete = "result" in a.said || answered >= total || rated
  const percent = complete ? 100 : Math.min(99, Math.floor((answered / total) * 100))
  const left = Math.max(0, total - answered)
  return {
    percent,
    answered,
    total,
    minutesLeft: complete ? 0 : Math.max(1, Math.round((left * SECONDS_PER_QUESTION) / 60)),
    started: answered > 0,
    complete,
  }
}
