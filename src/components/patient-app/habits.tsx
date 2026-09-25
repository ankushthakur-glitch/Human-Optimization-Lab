"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import {
  AiAnswer,
  AiTag,
  AppBar,
  AppButton,
  AppFrame,
  AppSheet,
  Check,
  DOCTOR,
  PATIENT,
  ProgressBar,
  useSessionState,
} from "@/components/patient-app/app-kit"

/* Daily habits (design option 1, "One per screen"): a question at a time
   with big answer cards and a "Why we ask" note on each. A follow-up is
   only asked when an answer calls for one, and the AI sums up at the end.
   Sample questions until HOL and Dr. Blanchard send the final set. */

type Question = {
  id: string
  text: string
  options: string[]
  multi?: boolean
  /** Only asked when this returns true for the answers so far. */
  when?: (a: Answers) => boolean
  /** A follow-up the AI added because of an earlier answer. */
  followUp?: string
  why: string
}

type Answers = Record<string, string[]>

const QUESTIONS: Question[] = [
  {
    id: "exercise",
    text: "How many days a week do you exercise?",
    options: ["None", "1-2 days", "3-4 days", "5 or more days"],
    why: "Activity is one of the strongest levers for blood sugar and heart health, and your A1C has been rising. It helps your care team set a starting point.",
  },
  {
    id: "barrier",
    text: "What makes it hard to exercise?",
    options: ["Time", "Low energy", "Pain or injury", "Motivation", "Not sure"],
    multi: true,
    when: (a) => ["None", "1-2 days"].includes(a.exercise?.[0] ?? ""),
    followUp: "Asked because you exercise less than 3 days a week",
    why: "Knowing what gets in the way lets your plan work around it instead of just asking for more.",
  },
  {
    id: "sleep",
    text: "How many hours do you usually sleep?",
    options: ["Under 5 hours", "5-6 hours", "7-8 hours", "More than 8 hours"],
    why: "Short sleep raises blood sugar and appetite the next day, so it matters for your A1C trend.",
  },
  {
    id: "stress",
    text: "How would you rate your stress lately?",
    options: ["Low", "Moderate", "High", "Very high"],
    why: "Stress affects sleep, blood pressure and blood sugar. Your systolic blood pressure has crept up over the last year.",
  },
  {
    id: "smoke",
    text: "Do you smoke or vape?",
    options: ["Never", "In the past", "Yes"],
    why: "Smoking changes how your doctor reads heart and lung risk.",
  },
  {
    id: "alcohol",
    text: "How many alcoholic drinks do you have in a week?",
    options: ["None", "1-3", "4-7", "8 or more"],
    why: "Alcohol affects sleep, weight and triglycerides.",
  },
]

export function HabitsScreen() {
  const router = useRouter()
  const [answers, setAnswers] = useSessionState<Answers>("habits", {})
  const [index, setIndex] = React.useState(0)
  const [finished, setFinished] = React.useState(false)

  const asked = QUESTIONS.filter((q) => !q.when || q.when(answers))
  const q = asked[Math.min(index, asked.length - 1)]

  if (finished)
    return (
      <AppFrame>
        <HabitsSummary
          answers={answers}
          onBack={() => setFinished(false)}
          onNext={() => router.push("/screens/app/medications")}
        />
      </AppFrame>
    )

  return (
    <AppFrame>
      <QuestionScreen
        key={q.id}
        q={q}
        number={index + 1}
        total={asked.length}
        value={answers[q.id] ?? []}
        onChange={(v) => setAnswers({ ...answers, [q.id]: v })}
        onBack={
          index > 0
            ? () => setIndex(index - 1)
            : () => router.push("/screens/app/consent")
        }
        onNext={() =>
          index + 1 < asked.length ? setIndex(index + 1) : setFinished(true)
        }
      />
    </AppFrame>
  )
}

function QuestionScreen({
  q,
  number,
  total,
  value,
  onChange,
  onBack,
  onNext,
}: {
  q: Question
  number: number
  total: number
  value: string[]
  onChange: (v: string[]) => void
  onBack: () => void
  onNext: () => void
}) {
  const [why, setWhy] = React.useState(false)

  function pick(option: string) {
    if (!q.multi) return onChange([option])
    onChange(
      value.includes(option)
        ? value.filter((v) => v !== option)
        : [...value, option]
    )
  }

  return (
    <>
      <AppBar step={`${number} of ${total}`} onBack={onBack} />
      <div className="flex min-h-0 flex-1 flex-col px-6 pb-5">
        <ProgressBar value={(number / total) * 100} />
        <div className="mt-7 flex items-center justify-between gap-2">
          <p className="text-[13px] font-semibold text-primary">Daily habits</p>
          <button
            type="button"
            onClick={() => setWhy(true)}
            className="text-[13px] font-medium text-neutral-500 underline-offset-2 hover:underline"
          >
            Why we ask
          </button>
        </div>
        <h2 className="mt-2 text-[24px] leading-tight font-semibold">
          {q.text}
        </h2>
        {q.followUp && <AiTag className="mt-2 self-start">{q.followUp}</AiTag>}

        <div className="mt-5 flex flex-col gap-3">
          {q.options.map((o) => {
            const on = value.includes(o)
            return (
              <button
                key={o}
                type="button"
                onClick={() => pick(o)}
                className={cn(
                  "flex min-h-14 items-center gap-3 rounded-2xl border px-4 py-3 text-left font-medium transition-colors",
                  on
                    ? "border-primary bg-primary/5"
                    : "border-neutral-200 hover:border-neutral-300"
                )}
              >
                <Check on={on} round={!q.multi} />
                <span className="flex-1">{o}</span>
              </button>
            )
          })}
        </div>

        <AppButton
          className="mt-auto"
          disabled={!value.length}
          onClick={onNext}
        >
          Continue
        </AppButton>
      </div>

      <AppSheet open={why} onClose={() => setWhy(false)} title="Why we ask">
        <p className="text-[15px] leading-relaxed text-neutral-700">{q.why}</p>
      </AppSheet>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  Summary                                                                    */
/* -------------------------------------------------------------------------- */

function summaryText(a: Answers) {
  const get = (id: string) => a[id]?.join(", ").toLowerCase() || "not answered"
  const lines = [
    `You exercise ${get("exercise")}${a.barrier?.length ? `, mostly held back by ${get("barrier")}` : ""}.`,
    `You sleep ${get("sleep")} a night and rate your stress as ${get("stress")}.`,
    `Smoking: ${get("smoke")}. Alcohol: ${get("alcohol")} drinks a week.`,
  ]
  return `${lines.join(" ")}\n\nI'll share this with ${DOCTOR} alongside your record. Your goals and plan wait for their review before anything starts.`
}

function HabitsSummary({
  answers,
  onBack,
  onNext,
}: {
  answers: Answers
  onBack: () => void
  onNext: () => void
}) {
  const [done, setDone] = React.useState(false)
  const highlights = [
    ["Sleep", answers.sleep?.[0]],
    ["Stress", answers.stress?.[0]],
    ["Exercise", answers.exercise?.[0]],
  ].filter(([, v]) => v)
  return (
    <>
      <AppBar onBack={onBack} step="Done" />
      <div className="flex min-h-0 flex-1 flex-col px-6 pb-5">
        <h2 className="mt-2 text-[24px] leading-tight font-semibold">
          Here&rsquo;s what I heard, {PATIENT.first}
        </h2>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {highlights.map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-neutral-50 p-3">
              <p className="text-[11px] text-neutral-500">{label}</p>
              <p className="mt-0.5 text-[14px] font-semibold">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <AiAnswer
            text={summaryText(answers)}
            label="Summarizing your answers"
            onDone={() => setDone(true)}
          />
        </div>
        <div className="mt-auto flex flex-col gap-2 pt-4">
          <AppButton disabled={!done} onClick={onNext}>
            Next: medications
          </AppButton>
          <AppButton variant="ghost" onClick={onBack}>
            Change an answer
          </AppButton>
        </div>
      </div>
    </>
  )
}
