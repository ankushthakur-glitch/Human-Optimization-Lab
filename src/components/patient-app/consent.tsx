"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import {
  AiAnswer,
  AiAvatar,
  AiOrb,
  AiPill,
  AppBar,
  AppButton,
  AppFrame,
  Check,
  PATIENT,
  PRACTICE,
  wait,
} from "@/components/patient-app/app-kit"
import {
  ToolChip,
  ToolChipGroup,
  ToolChipLabel,
  ToolChipMeta,
  ToolChipStatus,
} from "@/design-system/ui/tool-chip"

/* Consent (design option 1, "Full document"): the authorization in place, a
   checkbox and a typed signature. The AI can explain it in plain words and
   answer questions about it, but the patient signs the document itself.
   Sample wording until HOL's lawyer returns the final form. */

const LEGAL = [
  `I authorize Human Optimization Lab (HOL) to request, receive and store my health records from my healthcare providers, hospitals, laboratories and imaging centers, and to share them with ${PRACTICE} for my care.`,
  "This includes visit notes, lab results, medications, conditions, procedures, surgeries and imaging reports. It may include sensitive information such as mental health or substance use records where the law allows.",
  "HOL protects this information as required by HIPAA. Information shared under this authorization may no longer be protected by federal privacy law if it is disclosed again by the recipient.",
  "This authorization stays in effect until I withdraw it. I can withdraw it at any time in the app, in writing, which stops future collection but does not undo information already shared.",
  "My treatment by my practice does not depend on signing this authorization.",
]

const PLAIN = `In short: you let HOL collect your health records from your doctors, hospitals, labs and imaging centers, and share them with your care team at ${PRACTICE}.

Only you and your care team see them, and HOL never sells your data. You can stop this any time in Settings. Your care at the clinic doesn't depend on saying yes.`

const QUESTIONS: [string, string][] = [
  [
    "Who can see my records?",
    `You and your care team at ${PRACTICE}. HOL staff only see them to keep the service running, and every access is logged.`,
  ],
  [
    "What if I change my mind?",
    "Go to Settings and withdraw consent. HOL stops collecting right away. Records already shared with your care team stay in your chart there.",
  ],
  [
    "Does this include mental health notes?",
    "Only where the law allows, and those records have extra protections. If you'd rather keep something out, tell your care team.",
  ],
]

type Step = "consent" | "building"

export function ConsentScreen() {
  const [step, setStep] = React.useState<Step>("consent")
  return (
    <AppFrame>
      {step === "consent" ? (
        <ConsentForm onSigned={() => setStep("building")} />
      ) : (
        <BuildingRecord onBack={() => setStep("consent")} />
      )}
    </AppFrame>
  )
}

function ConsentForm({ onSigned }: { onSigned: () => void }) {
  const [read, setRead] = React.useState(false)
  const [name, setName] = React.useState("")
  const [chat, setChat] = React.useState<ChatMode | null>(null)
  const matches = name.trim().toLowerCase() === PATIENT.full.toLowerCase()

  return (
    <>
      <AppBar title="Authorization" />
      <div className="flex min-h-0 flex-1 flex-col gap-4 px-5 pb-5">
        <div className="flex flex-wrap gap-2">
          <AiPill onClick={() => setChat("explain")}>
            Explain in plain words
          </AiPill>
          <AiPill onClick={() => setChat("ask")}>Ask a question</AiPill>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-[13px] leading-relaxed text-neutral-700">
          <p className="mb-3 font-semibold text-neutral-900">
            HIPAA authorization to collect and share health records
          </p>
          {LEGAL.map((p) => (
            <p key={p} className="mb-3">
              {p}
            </p>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setRead(!read)}
          className="flex items-center gap-3 text-left text-sm"
        >
          <Check on={read} />I have read and agree to this authorization
        </button>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-neutral-500">Type your full name to sign</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={PATIENT.full}
            autoComplete="name"
            className={cn(
              "h-12 rounded-xl border px-4 font-[cursive] text-lg outline-none",
              name && !matches
                ? "border-amber-400"
                : "border-neutral-200 focus:border-primary"
            )}
          />
          {name && !matches && (
            <span className="text-[12px] text-amber-700">
              Type your name as it appears on your record: {PATIENT.full}
            </span>
          )}
        </label>
        <AppButton disabled={!read || !matches} onClick={onSigned}>
          Agree and continue
        </AppButton>
      </div>

      {chat && <FormChat mode={chat} onClose={() => setChat(null)} />}
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  Chat about the form                                                        */
/* -------------------------------------------------------------------------- */

type ChatMode = "explain" | "ask"
type ChatMessage = { id: number; from: "you" | "hol"; text: string }

const FALLBACK =
  "I can only answer questions about this authorization. For anything about your health or care, message your care team after you sign in."

/* The simulated assistant: a few keyword groups mapped to the answers above. */
function answerFor(question: string) {
  const q = question.toLowerCase()
  if (/see|who|access|share|sell|staff/.test(q)) return QUESTIONS[0][1]
  if (/change|withdraw|stop|cancel|mind|revoke/.test(q)) return QUESTIONS[1][1]
  if (/mental|substance|sensitive|therapy|psych/.test(q)) return QUESTIONS[2][1]
  if (/plain|explain|mean|summary|short/.test(q)) return PLAIN
  return FALLBACK
}

/** A full-screen chat with the HOL assistant about the authorization. */
function FormChat({ mode, onClose }: { mode: ChatMode; onClose: () => void }) {
  const [messages, setMessages] = React.useState<ChatMessage[]>(() =>
    mode === "explain"
      ? [
          { id: 1, from: "you", text: "Explain this form in plain words" },
          { id: 2, from: "hol", text: PLAIN },
        ]
      : [
          {
            id: 1,
            from: "hol",
            text: `Hi ${PATIENT.first}. Ask me anything about this authorization before you sign it.`,
          },
        ]
  )
  const [draft, setDraft] = React.useState("")
  const [busy, setBusy] = React.useState(true)
  const scroller = React.useRef<HTMLDivElement>(null)
  const content = React.useRef<HTMLDivElement>(null)

  /* Keep the newest words in view while an answer streams in. */
  React.useEffect(() => {
    const el = content.current
    if (!el) return
    const observer = new ResizeObserver(() =>
      scroller.current?.scrollTo({ top: scroller.current.scrollHeight })
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  function send(text: string) {
    const question = text.trim()
    if (!question || busy) return
    const next = messages.length + 1
    setMessages([
      ...messages,
      { id: next, from: "you", text: question },
      { id: next + 1, from: "hol", text: answerFor(question) },
    ])
    setDraft("")
    setBusy(true)
  }

  const asked = new Set(messages.map((m) => m.text))
  const suggestions = QUESTIONS.map(([q]) => q).filter((q) => !asked.has(q))

  return (
    <div className="absolute inset-x-0 top-0 bottom-0 z-30 flex flex-col bg-white motion-safe:animate-in motion-safe:fade-in sm:top-11">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-neutral-100 px-3">
        <button
          type="button"
          aria-label="Back to the form"
          onClick={onClose}
          className="grid size-9 place-items-center rounded-full text-2xl text-neutral-500 hover:bg-neutral-100"
        >
          &#8249;
        </button>
        <AiAvatar />
        <div className="min-w-0 flex-1">
          <p className="leading-tight font-semibold">HOL assistant</p>
          <p className="truncate text-[12px] text-neutral-500">
            About your authorization
          </p>
        </div>
      </div>

      <div
        ref={scroller}
        className="min-h-0 flex-1 overflow-y-auto bg-neutral-50 px-4 py-5"
      >
        <div ref={content} className="flex flex-col gap-4">
          {messages.map((m) =>
            m.from === "you" ? (
              <p
                key={m.id}
                className="ml-auto max-w-[80%] rounded-2xl rounded-tr-md bg-primary px-3.5 py-2.5 text-[14px] text-white"
              >
                {m.text}
              </p>
            ) : (
              <div
                key={m.id}
                className="max-w-[92%] rounded-2xl rounded-tl-md bg-white p-3.5 shadow-sm"
              >
                <AiAnswer
                  text={m.text}
                  thinkFor={m.id === 1 ? 500 : 1100}
                  /* Only the newest answer frees the input. */
                  onDone={
                    m.id === messages.length ? () => setBusy(false) : undefined
                  }
                />
              </div>
            )
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-3 border-t border-neutral-100 px-4 pt-3 pb-5">
        {suggestions.length > 0 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
            {suggestions.map((q) => (
              <button
                key={q}
                type="button"
                disabled={busy}
                onClick={() => send(q)}
                className="shrink-0 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-[13px] whitespace-nowrap text-primary disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(draft)
          }}
          className="flex h-12 items-center gap-2 rounded-full border border-neutral-200 pr-1.5 pl-4 focus-within:border-primary"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask about this form"
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-neutral-400"
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={!draft.trim() || busy}
            className="grid size-9 place-items-center rounded-full bg-primary text-white disabled:opacity-40"
          >
            &#8593;
          </button>
        </form>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  After signing: the record builds                                           */
/* -------------------------------------------------------------------------- */

const SOURCES: [name: string, found: string][] = [
  ["Scripps Health (Epic)", "4 visits, 3 conditions"],
  ["Quest Diagnostics", "44 lab results"],
  ["Labcorp", "4 lab results"],
  ["Coastal Imaging Center", "1 report"],
]

function BuildingRecord({ onBack }: { onBack: () => void }) {
  const router = useRouter()
  const [done, setDone] = React.useState(0)
  const [summary, setSummary] = React.useState(false)

  React.useEffect(() => {
    let live = true
    ;(async () => {
      for (let i = 1; i <= SOURCES.length; i++) {
        await wait(900)
        if (live) setDone(i)
      }
      await wait(400)
      if (live) setSummary(true)
    })()
    return () => {
      live = false
    }
  }, [])

  return (
    <>
      <AppBar onBack={onBack} />
      <div className="flex min-h-0 flex-1 flex-col px-6 pb-5">
        <div className="mt-4 flex flex-col items-center text-center">
          {summary ? (
            <AiAvatar size={64}>✓</AiAvatar>
          ) : (
            <AiOrb state="weaving" size={64} />
          )}
          <h2 className="mt-5 text-[24px] leading-tight font-semibold">
            {summary ? "Your record is ready" : "Building your record"}
          </h2>
        </div>
        <ToolChipGroup className="mt-6 flex-col items-stretch">
          {SOURCES.map(([source, found], i) => {
            const status =
              i < done ? "success" : i === done ? "running" : "pending"
            return (
              <ToolChip key={source} status={status} className="justify-start">
                <ToolChipStatus status={status} />
                <ToolChipLabel>{source}</ToolChipLabel>
                {i < done && <ToolChipMeta>{found}</ToolChipMeta>}
              </ToolChip>
            )
          })}
        </ToolChipGroup>
        {summary && (
          <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <AiAnswer
              thinkFor={700}
              text={`Welcome, ${PATIENT.first}. I found 18 months of history: 4 lab panels, 2 medications and 3 conditions. A few quick questions will fill in what records can't tell us.`}
            />
          </div>
        )}
        <AppButton
          className="mt-auto"
          disabled={!summary}
          onClick={() => router.push("/screens/app/habits")}
        >
          Continue
        </AppButton>
      </div>
    </>
  )
}
