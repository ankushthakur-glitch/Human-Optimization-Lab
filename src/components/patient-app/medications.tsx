"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import {
  AiAnswer,
  AiAvatar,
  AiOrb,
  AiTag,
  AppBar,
  AppButton,
  AppFrame,
  AppSheet,
  DOCTOR,
  PATIENT,
  wait,
  useSessionState,
} from "@/components/patient-app/app-kit"
import { RecommendationCardConfidence } from "@/design-system/ui/recommendation-card"
import {
  Thinking,
  ThinkingContent,
  ThinkingStep,
  ThinkingTrigger,
} from "@/design-system/ui/thinking"

/* Medications and supplements (design option 10, "Medication list"). The
   list starts from what the record already holds, so the patient confirms
   rather than types. New ones come from AI search (brand names, misspellings)
   or from a photo of the label, which the AI reads into name, strength and
   directions for the patient to check. Nothing here is advice: the list goes
   to the doctor for review. The label reading is simulated with sample
   labels; there is no model behind it yet. */

type Med = {
  id: string
  name: string
  detail: string
  source: "record" | "scan" | "search" | "added"
  /** For record items: still taking it? */
  confirmed?: boolean
  stopped?: boolean
  photo?: string
}

const RECORD_MEDS: Med[] = [
  {
    id: "m1",
    name: "Atorvastatin",
    detail: "10 mg, once daily",
    source: "record",
  },
  {
    id: "m2",
    name: "Vitamin D3",
    detail: "2,000 IU, once daily",
    source: "record",
  },
]

/* A small catalog for the AI search: generic name, brand names, form. */
const CATALOG: [name: string, aka: string, form: string][] = [
  ["Metformin", "Glucophage", "Tablet"],
  ["Metoprolol", "Lopressor, Toprol XL", "Tablet"],
  ["Lisinopril", "Zestril, Prinivil", "Tablet"],
  ["Levothyroxine", "Synthroid", "Tablet"],
  ["Omeprazole", "Prilosec", "Capsule"],
  ["Magnesium glycinate", "Magnesium", "Capsule"],
  ["Omega 3 fish oil", "Fish oil", "Softgel"],
  ["Ashwagandha", "KSM-66", "Capsule"],
  ["Creatine monohydrate", "Creatine", "Powder"],
  ["Semaglutide", "Ozempic, Wegovy", "Injection"],
]

/* What the label reader "finds", in turn, so repeat scans differ. */
const LABELS = [
  {
    name: "Metformin ER",
    strength: "500 mg",
    directions: "1 tablet twice a day with meals",
    pharmacy: "CVS Pharmacy, Carlsbad",
    prescriber: DOCTOR,
    confidence: { name: 97, strength: 94, directions: 68 },
  },
  {
    name: "Magnesium glycinate",
    strength: "200 mg",
    directions: "2 capsules at bedtime",
    pharmacy: "Supplement label",
    prescriber: "",
    confidence: { name: 95, strength: 91, directions: 88 },
  },
  {
    name: "Omega 3 fish oil",
    strength: "1,000 mg",
    directions: "1 softgel daily",
    pharmacy: "Supplement label",
    prescriber: "",
    confidence: { name: 93, strength: 72, directions: 90 },
  },
]

type Reading = (typeof LABELS)[number]

function closest(query: string) {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return { hits: [], guess: null as string | null }
  const hits = CATALOG.filter(([n, aka]) =>
    `${n} ${aka}`.toLowerCase().includes(q)
  )
  /* A forgiving guess for typos: same first letters, similar length. */
  const guess =
    hits.length === 0
      ? (CATALOG.find(
          ([n]) =>
            n.toLowerCase().slice(0, 3) === q.slice(0, 3) ||
            n
              .toLowerCase()
              .replace(/[aeiou]/g, "")
              .startsWith(q.replace(/[aeiou]/g, "").slice(0, 4))
        )?.[0] ?? null)
      : null
  return { hits, guess }
}

/* Ids for new rows, unique for the page's life. */
let added = 0

export function MedicationsScreen() {
  const router = useRouter()
  const [meds, setMeds] = useSessionState<Med[]>("meds", RECORD_MEDS)
  const [query, setQuery] = React.useState("")
  const [scanning, setScanning] = React.useState(false)
  const [scans, setScans] = useSessionState<number>("scans", 0)
  const [done, setDone] = React.useState(false)
  const { hits, guess } = closest(query)

  function add(med: Omit<Med, "id">) {
    /* Newest first, so a scanned label shows up without scrolling. */
    setMeds([{ ...med, id: `n${meds.length}-${++added}` }, ...meds])
    setQuery("")
  }

  if (done)
    return (
      <AppFrame>
        <AllDone meds={meds} onBack={() => setDone(false)} />
      </AppFrame>
    )

  return (
    <AppFrame>
      <AppBar
        step="Last step"
        onBack={() => router.push("/screens/app/habits")}
      />
      <div className="flex min-h-0 flex-1 flex-col px-5 pb-5">
        <h2 className="text-[24px] leading-tight font-semibold">
          Medications and supplements
        </h2>

        <div className="relative mt-5">
          <div className="flex h-12 items-center gap-2 rounded-xl border border-neutral-200 px-4 focus-within:border-primary">
            <span aria-hidden className="text-neutral-400">
              &#9906;
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search, e.g. metformin"
              className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-neutral-400"
            />
          </div>
          {query.trim().length >= 2 && (
            <div className="absolute inset-x-0 top-13 z-20 overflow-hidden rounded-xl border bg-white shadow-lg">
              {hits.slice(0, 4).map(([n, aka, form]) => (
                <button
                  key={n}
                  type="button"
                  onClick={() =>
                    add({
                      name: n,
                      detail: `${form}, add dose`,
                      source: "search",
                    })
                  }
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50"
                >
                  <span className="flex-1">
                    <span className="font-medium">{n}</span>
                    <span className="block text-[12px] text-neutral-500">
                      {aka} &middot; {form}
                    </span>
                  </span>
                  <span className="text-primary">+</span>
                </button>
              ))}
              {hits.length === 0 && guess && (
                <button
                  type="button"
                  onClick={() => setQuery(guess)}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-[14px] hover:bg-neutral-50"
                >
                  <AiTag>Did you mean</AiTag>
                  <span className="font-medium">{guess}</span>
                </button>
              )}
              {hits.length === 0 && !guess && (
                <button
                  type="button"
                  onClick={() =>
                    add({
                      name: query.trim(),
                      detail: "Add dose",
                      source: "added",
                    })
                  }
                  className="w-full px-4 py-3 text-left text-[14px] hover:bg-neutral-50"
                >
                  Add &ldquo;{query.trim()}&rdquo;
                </button>
              )}
            </div>
          )}
        </div>

        <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
          <button
            type="button"
            onClick={() => setScanning(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap text-white"
          >
            <span aria-hidden>📷</span> Scan a label
          </button>
          {["Omega 3 fish oil", "Magnesium glycinate"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() =>
                add({ name: s, detail: "Add dose", source: "added" })
              }
              className="shrink-0 rounded-full bg-neutral-100 px-3 py-1.5 text-[13px] whitespace-nowrap text-neutral-700"
            >
              + {s.split(" ").slice(0, 2).join(" ")}
            </button>
          ))}
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          {meds.some(
            (m) => m.source === "record" && !m.confirmed && !m.stopped
          ) && (
            <div className="mb-3 flex items-start gap-2.5 rounded-2xl bg-primary/5 p-3 text-[13px] leading-snug text-neutral-700">
              <AiAvatar size={20} className="mt-0.5" />I found these in your
              Scripps Health record. Are you still taking them?
            </div>
          )}
          <div className="flex flex-col divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
            {meds.map((m) => (
              <MedRow
                key={m.id}
                med={m}
                onChange={(next) =>
                  setMeds(meds.map((x) => (x.id === m.id ? next : x)))
                }
                onRemove={() => setMeds(meds.filter((x) => x.id !== m.id))}
              />
            ))}
            {meds.length === 0 && (
              <p className="p-4 text-center text-[14px] text-neutral-500">
                Nothing on your list
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-4">
          <AppButton onClick={() => setDone(true)}>Continue</AppButton>
          <AppButton
            variant="ghost"
            onClick={() => {
              setMeds([])
              setDone(true)
            }}
          >
            I don&rsquo;t take any
          </AppButton>
        </div>
      </div>

      <AppSheet
        open={scanning}
        onClose={() => setScanning(false)}
        title="Scan a label"
        tall
      >
        <LabelScanner
          reading={LABELS[scans % LABELS.length]}
          onCancel={() => setScanning(false)}
          onAdd={(r, photo) => {
            add({
              name: r.name,
              detail: `${r.strength}, ${r.directions}`,
              source: "scan",
              photo,
            })
            setScans(scans + 1)
            setScanning(false)
          }}
        />
      </AppSheet>
    </AppFrame>
  )
}

function MedRow({
  med: m,
  onChange,
  onRemove,
}: {
  med: Med
  onChange: (m: Med) => void
  onRemove: () => void
}) {
  const ask = m.source === "record" && !m.confirmed && !m.stopped
  return (
    <div className={cn("flex flex-col gap-2.5 p-4", m.stopped && "opacity-50")}>
      <div className="flex items-center gap-3">
        {m.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={m.photo}
            alt=""
            className="size-10 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10">
            💊
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className={cn("font-medium", m.stopped && "line-through")}>
            {m.name}
          </p>
          <p
            className={cn(
              "truncate text-[13px]",
              m.detail.includes("dose") ? "text-primary" : "text-neutral-500"
            )}
          >
            {m.detail}
          </p>
          <div className="mt-1 flex gap-1.5">
            {m.source === "record" && <AiTag>From your record</AiTag>}
            {m.source === "scan" && <AiTag>Read from label</AiTag>}
            {m.stopped && (
              <span className="text-[11px] text-neutral-500">Stopped</span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${m.name}`}
          className="text-neutral-400"
        >
          &#10005;
        </button>
      </div>
      {ask && (
        <div className="flex gap-2 pl-13">
          <button
            type="button"
            onClick={() => onChange({ ...m, confirmed: true })}
            className="rounded-full bg-primary px-3 py-1 text-[12px] font-medium text-white"
          >
            Still taking
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...m, stopped: true })}
            className="rounded-full border border-neutral-200 px-3 py-1 text-[12px] font-medium text-neutral-700"
          >
            Stopped
          </button>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Label scanner                                                              */
/* -------------------------------------------------------------------------- */

type ScanStep = "camera" | "reading" | "result"

function LabelScanner({
  reading,
  onAdd,
  onCancel,
}: {
  reading: Reading
  onAdd: (r: Reading, photo: string) => void
  onCancel: () => void
}) {
  const [step, setStep] = React.useState<ScanStep>("camera")
  const [photo, setPhoto] = React.useState("")

  function took(dataUrl: string) {
    setPhoto(dataUrl)
    setStep("reading")
  }

  if (step === "camera") return <Camera onPhoto={took} onCancel={onCancel} />
  if (step === "reading")
    return (
      <ReadingLabel
        photo={photo}
        reading={reading}
        onRead={() => setStep("result")}
      />
    )
  return (
    <ScanResult
      photo={photo}
      reading={reading}
      onRetake={() => setStep("camera")}
      onAdd={(r) => onAdd(r, photo)}
    />
  )
}

/* The live camera where the browser allows it (phones, and laptops on
   localhost or https); otherwise the phone's own camera through a file
   input, which on iOS and Android opens straight to the camera. */
function Camera({
  onPhoto,
  onCancel,
}: {
  onPhoto: (dataUrl: string) => void
  onCancel: () => void
}) {
  const video = React.useRef<HTMLVideoElement>(null)
  const file = React.useRef<HTMLInputElement>(null)
  const [live, setLive] = React.useState<"starting" | "on" | "off">("starting")

  React.useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false
    ;(async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("no camera")
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        })
        if (cancelled) return stream.getTracks().forEach((t) => t.stop())
        if (video.current) {
          video.current.srcObject = stream
          await video.current.play()
        }
        setLive("on")
      } catch {
        if (!cancelled) setLive("off")
      }
    })()
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  function shoot() {
    const v = video.current
    if (!v) return
    const canvas = document.createElement("canvas")
    canvas.width = v.videoWidth
    canvas.height = v.videoHeight
    canvas.getContext("2d")?.drawImage(v, 0, 0)
    onPhoto(canvas.toDataURL("image/jpeg", 0.85))
  }

  function fromFile(f: File | undefined) {
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => onPhoto(String(reader.result))
    reader.readAsDataURL(f)
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-neutral-900">
        <video
          ref={video}
          playsInline
          muted
          className={cn("size-full object-cover", live !== "on" && "hidden")}
        />
        {live !== "on" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white/80">
            <span className="text-4xl">📷</span>
            <p className="text-[14px]">
              {live === "starting"
                ? "Opening the camera"
                : "Take a photo of the label"}
            </p>
          </div>
        )}
        {/* The guide: where to hold the label. */}
        <div className="pointer-events-none absolute inset-x-8 top-1/2 h-40 -translate-y-1/2 rounded-2xl border-2 border-white/80 shadow-[0_0_0_999px_rgb(0_0_0/0.35)]" />
        <p className="absolute inset-x-0 bottom-4 text-center text-[13px] font-medium text-white">
          Fit the label inside the frame
        </p>
      </div>
      <input
        ref={file}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => fromFile(e.target.files?.[0])}
      />
      <div className="mt-auto flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="w-20 text-left text-[15px] text-neutral-600"
        >
          Cancel
        </button>
        <button
          type="button"
          aria-label="Take photo"
          onClick={() => (live === "on" ? shoot() : file.current?.click())}
          className="grid size-18 place-items-center rounded-full border-4 border-primary/30 bg-primary text-white shadow-lg"
        >
          <span className="size-12 rounded-full border-2 border-white" />
        </button>
        <button
          type="button"
          onClick={() => {
            if (file.current) {
              file.current.removeAttribute("capture")
              file.current.click()
              file.current.setAttribute("capture", "environment")
            }
          }}
          className="w-20 text-right text-[15px] font-medium text-primary"
        >
          Photos
        </button>
      </div>
    </div>
  )
}

const READ_STEPS = (r: Reading) =>
  [
    ["Reading the text", `Found: “${r.name} ${r.strength}”, “${r.directions}”`],
    ["Matching the medication", `${r.name}, ${r.strength}`],
    [
      "Checking your record",
      r.prescriber
        ? `Not on your record yet. Prescribed by ${r.prescriber}.`
        : "Not on your record. Added as a supplement.",
    ],
  ] as const

function ReadingLabel({
  photo,
  reading,
  onRead,
}: {
  photo: string
  reading: Reading
  onRead: () => void
}) {
  const steps = READ_STEPS(reading)
  const [shown, setShown] = React.useState(0)
  const onReadRef = React.useRef(onRead)
  React.useEffect(() => {
    onReadRef.current = onRead
  })
  React.useEffect(() => {
    let live = true
    ;(async () => {
      for (let i = 1; i <= steps.length; i++) {
        await wait(1000)
        if (live) setShown(i)
      }
      await wait(600)
      if (live) onReadRef.current()
    })()
    return () => {
      live = false
    }
  }, [steps.length])

  return (
    <div className="flex flex-col gap-5">
      <div className="relative overflow-hidden rounded-2xl bg-neutral-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo}
          alt="The label you scanned"
          className="max-h-64 w-full object-cover opacity-80"
        />
        <div className="absolute inset-x-0 h-0.5 bg-primary shadow-[0_0_16px_4px_var(--primary)] motion-safe:animate-[scan_1.6s_ease-in-out_infinite]" />
        <style>{`@keyframes scan{0%{top:8%}50%{top:90%}100%{top:8%}}`}</style>
      </div>
      <div className="flex items-center gap-3">
        <AiOrb state="searching" />
        <p className="font-semibold">Reading your label</p>
      </div>
      <Thinking open>
        <ThinkingTrigger active>
          {steps[Math.min(shown, steps.length - 1)][0]}
        </ThinkingTrigger>
        <ThinkingContent>
          {steps.slice(0, shown).map(([label, text]) => (
            <ThinkingStep key={label} label={label}>
              {text}
            </ThinkingStep>
          ))}
        </ThinkingContent>
      </Thinking>
    </div>
  )
}

function ScanResult({
  photo,
  reading,
  onRetake,
  onAdd,
}: {
  photo: string
  reading: Reading
  onRetake: () => void
  onAdd: (r: Reading) => void
}) {
  const [r, setR] = React.useState(reading)
  const fields: [keyof Reading & keyof Reading["confidence"], string][] = [
    ["name", "Name"],
    ["strength", "Strength"],
    ["directions", "How you take it"],
  ]
  const unsure = fields.filter(([k]) => r.confidence[k] < 80)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt="" className="size-14 rounded-xl object-cover" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{r.name}</p>
          <p className="text-[13px] text-neutral-500">{r.pharmacy}</p>
        </div>
        <AiTag>Read from label</AiTag>
      </div>
      {unsure.length > 0 && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
          Please check {unsure.map(([, l]) => l.toLowerCase()).join(" and ")}.
          The photo was hard to read there.
        </p>
      )}
      <div className="flex flex-col gap-3.5">
        {fields.map(([key, label]) => {
          const low = r.confidence[key] < 80
          return (
            <label key={key} className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-neutral-600">
                {label}
              </span>
              <input
                value={r[key] as string}
                onChange={(e) =>
                  setR({
                    ...r,
                    [key]: e.target.value,
                    confidence: { ...r.confidence, [key]: 100 },
                  })
                }
                className={cn(
                  "h-11 rounded-xl border px-3.5 text-[15px] outline-none focus:border-primary",
                  low ? "border-amber-400 bg-amber-50/50" : "border-neutral-200"
                )}
              />
              <RecommendationCardConfidence
                value={r.confidence[key]}
                label="AI read"
              />
            </label>
          )
        })}
      </div>
      <div className="mt-2 flex flex-col gap-2">
        <AppButton onClick={() => onAdd(r)}>Add to my list</AppButton>
        <AppButton variant="ghost" onClick={onRetake}>
          Retake photo
        </AppButton>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Done                                                                       */
/* -------------------------------------------------------------------------- */

function AllDone({ meds, onBack }: { meds: Med[]; onBack: () => void }) {
  const router = useRouter()
  const taking = meds.filter((m) => !m.stopped)
  const stopped = meds.filter((m) => m.stopped)
  const text = `You're all set, ${PATIENT.first}. Your profile now has 18 months of records, your daily habits and ${taking.length} ${taking.length === 1 ? "medication or supplement" : "medications and supplements"}${stopped.length ? `, with ${stopped.map((m) => m.name).join(", ")} marked as stopped` : ""}.

${DOCTOR} will review it with your record. I'll let you know when there's something to look at, and you can ask me about your results any time.`
  return (
    <>
      <AppBar onBack={onBack} />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-5">
        <div className="mt-2 flex flex-col items-center text-center">
          <AiAvatar size={64}>✓</AiAvatar>
          <h2 className="mt-5 text-[24px] leading-tight font-semibold">
            Profile complete
          </h2>
        </div>
        <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <AiAnswer text={text} label="Putting it together" />
        </div>
        <div className="my-5 flex shrink-0 flex-col divide-y divide-neutral-100 rounded-2xl border border-neutral-200 text-[14px]">
          {[
            ["Record", "Synced from 4 sources"],
            ["Daily habits", "Answered"],
            ["Medications", `${taking.length} on your list`],
            ["Care team review", "Sent"],
          ].map(([l, v]) => (
            <div key={l} className="flex justify-between gap-3 px-4 py-3">
              <span className="text-neutral-500">{l}</span>
              <span className="font-medium">{v}</span>
            </div>
          ))}
        </div>
        <AppButton
          className="mt-auto shrink-0"
          onClick={() => {
            try {
              for (const key of ["habits", "meds", "scans"])
                sessionStorage.removeItem(`hol-app-${key}`)
            } catch {
              // Blocked storage: nothing was saved.
            }
            router.push("/screens/app/consent")
          }}
        >
          Start the demo again
        </AppButton>
      </div>
    </>
  )
}
