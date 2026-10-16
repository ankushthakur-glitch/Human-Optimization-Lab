"use client"

import { createCollection } from "@/components/practice/collection-store"
import { REYES_ID } from "@/components/practice/practice-data"
import { NOW, ms } from "@/components/provider/mock-clock"

/* The provider portal's task list (14 Oct call: manual and system tasks,
   assigned to a provider, nurse or MA, with a due time, priority and status).
   System tasks are raised by the same events the dashboard reads: a result
   or medication change from Epic, the patient's answers in the app, the care
   plan loop, invites and syncs. Sample data on the mock clock. */

export const TASK_PRIORITIES = ["High", "Medium", "Low"] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export const TASK_STATUSES = ["Open", "Completed", "Reopened"] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_SOURCES = ["System", "Manual"] as const
export type TaskSource = (typeof TASK_SOURCES)[number]

/** Each system type with the event that raises it. */
export const TASK_TYPES = {
  "Lab result review": "an out of range result syncs from Epic",
  "Medication review": "the patient reports a medication taken differently",
  "Care plan review": "the patient sends a care plan or asks for changes",
  "Order follow up": "an order has no result 14 days after it was placed",
  "Care gap outreach": "a screening is overdue for the patient",
  "Outside care review": "an ER visit or outside admission reaches the record",
  "Quarterly review": "a member's quarterly review is two weeks away",
  "Invite follow up": "a patient hasn't joined after the final reminder",
  "Record sync": "the nightly Epic pull fails for a patient",
  "Patient call back": "",
  General: "",
} as const
export type TaskType = keyof typeof TASK_TYPES
export const TASK_TYPE_NAMES = Object.keys(TASK_TYPES) as TaskType[]

export type TaskEvent = {
  at: string
  /** Who did it: a person id, or "system". */
  by: string
  text: string
}

export type TaskComment = {
  id: string
  at: string
  /** A person id. */
  by: string
  text: string
  /** People tagged with @Name in the text: they are notified. */
  mentions: string[]
}

export type Task = {
  id: string
  type: TaskType
  title: string
  description: string
  /** Empty for a task about no one patient. */
  patientId: string
  assigneeId: string
  priority: TaskPriority
  status: TaskStatus
  /** Local "2026-10-03T11:00". */
  due: string
  createdAt: string
  source: TaskSource
  /** A person id, or "system". */
  createdBy: string
  events: TaskEvent[]
  comments: TaskComment[]
}

/** The signed-in provider, Dr. Daniel Reyes: "My tasks" are his. */
export const ME = REYES_ID

/* Who tasks go to: the two physicians on the sample panel and the active
   clinical staff. Staff ids are the practice's generated users. */
const HARRINGTON = "PR3132"
const GRAHAM = "U53165" // Nurse
const BRYCE = "U60493" // Nurse
const DANTE = "U61239" // Medical assistant
const LIAM = "U64223" // Medical assistant
const JANELLE = "U45564" // Front desk

export function isOverdue(t: Pick<Task, "status" | "due">) {
  return t.status !== "Completed" && ms(t.due) < ms(NOW)
}

/** The local wall clock "2026-10-03T09:00" shifted by hours. */
function at(hours: number) {
  const d = new Date(ms(NOW) + hours * 3_600_000)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

type Seed = [
  id: number,
  type: TaskType,
  title: string,
  description: string,
  patientId: string,
  assigneeId: string,
  priority: TaskPriority,
  status: TaskStatus,
  /** Hours from NOW. */
  due: number,
  /** Hours from NOW, negative. */
  created: number,
]

const SEEDS: Seed[] = [
  [7842, "Lab result review", "Review LDL-C above target", "LDL-C 162 mg/dL (H, range 0-99) from Quest, resulted Oct 2. Up from 138 in July while on atorvastatin 20 mg.", "P10318", ME, "High", "Open", 2, -20],
  [3159, "Medication review", "Confirm metformin dose change", "Patient says they take metformin 500 mg once daily; the Epic list says twice daily. Confirm the change or keep as prescribed.", "P10411", ME, "High", "Open", 4, -26],
  [9284, "Care plan review", "Review care plan changes", "Patient asked for strength training 2 days a week with a hotel gym option. Revise the Muscle building plan and send version 3.", "P10318", ME, "Medium", "Open", 26, -30],
  [1476, "Order follow up", "Chase HbA1c ordered Sep 14", "HbA1c ordered by Dr. Reyes on Sep 14 has no result after 19 days. Call the patient and confirm the draw.", "P10422", GRAHAM, "Medium", "Open", -6, -52],
  [5621, "Outside care review", "ER visit at Scripps Mercy", "ER visit on Oct 1 for chest pain, discharged the same day. Troponin normal. Review the discharge summary and decide on follow up.", "P10433", ME, "High", "Open", -2, -18],
  [8735, "Care gap outreach", "Colorectal screening overdue", "No colonoscopy or FIT on record, patient is 57. Offer FIT kit or referral.", "P10411", DANTE, "Low", "Open", 72, -40],
  [2948, "Lab result review", "Potassium low on CMP", "Potassium 3.3 mmol/L (L, range 3.5-5.1) from Labcorp, resulted Oct 3. Patient started hydrochlorothiazide in August.", "P10455", ME, "High", "Open", 6, -3],
  [6317, "Invite follow up", "Call about the app invite", "Invited Sep 13, four reminders sent, not joined. Call before the decline link goes out on day 30.", "P10466", JANELLE, "Medium", "Open", 30, -24],
  [4502, "Record sync", "Epic pull failed twice", "The nightly pull failed on Oct 2 and Oct 3 with an expired consent token. Ask the patient to reconnect Epic in the app.", "P10665", BRYCE, "Medium", "Open", 8, -28],
  [9186, "Quarterly review", "Book Q4 optimization review", "Quarterly review due Oct 17. Book a 30 minute visit and order the baseline repeat panel.", "P10422", LIAM, "Medium", "Open", 50, -10],
  [3764, "Medication review", "Patient stopped vitamin D", "Patient says they stopped vitamin D3 2000 IU in September. Mark as not current or keep on the plan.", "P10240", HARRINGTON, "Low", "Open", 98, -15],
  [8051, "Care plan review", "Review care plan", "4 optimization plans (3 from the record, 1 patient selected) and 5 proposed baseline tests waiting for approval.", "P10240", ME, "High", "Open", 22, -6],
  [5390, "Order follow up", "Lipid panel ordered Sep 10", "Lipid panel ordered Sep 10 has no result after 23 days. Patient reported a scheduling problem in the app.", "P10477", GRAHAM, "High", "Open", -26, -70],
  [6624, "Patient call back", "Call back about fatigue", "Patient asked Ask Inlay about fatigue after the new dose and was routed to the care team. Call back today.", "P10455", BRYCE, "High", "Open", 3, -2],
  [7108, "Lab result review", "TSH slightly high", "TSH 4.9 mIU/L (H, range 0.4-4.5) from Quest, resulted Sep 30. First reading on record.", "P10444", HARRINGTON, "Low", "Completed", -30, -80],
  [2215, "Care gap outreach", "Mammogram due", "Last mammogram on record Sep 2024. Send the reminder and help book.", "P10466", DANTE, "Low", "Completed", -12, -90],
  [4876, "Outside care review", "Urgent care visit for sprain", "Urgent care visit on Sep 28 for an ankle sprain, X-ray negative. Note it and close.", "P10488", ME, "Low", "Completed", -40, -96],
  [1932, "General", "Sign standing orders for Q4 panels", "Sign the standing order set for the Q4 repeat panels before the batch goes to Quest.", "", ME, "Medium", "Open", 54, -12],
  [5047, "Record sync", "Record still building after 3 days", "Epic record for this patient has been building since Sep 30. Check the source and retry the sync.", "P10750", LIAM, "Low", "Open", 46, -22],
  [8463, "Quarterly review", "Prep notes for review visit", "Quarterly review on Oct 8. Pull trends for weight, HbA1c and blood pressure for the visit. Reopened: the blood pressure trend was missing.", "P10318", GRAHAM, "Medium", "Reopened", 75, -30],
]

/* Care team notes on a few sample tasks, oldest first: [by, hours from NOW, text]. */
const SEED_COMMENTS: Record<
  string,
  [by: string, hours: number, text: string, mentions?: string[]][]
> = {
  "TSK-7842": [
    [GRAHAM, -14, "Patient confirmed they have taken atorvastatin daily since July."],
    [ME, -2, "@Graham Pellegrini can you book a repeat lipid panel for six weeks after the dose change?", [GRAHAM]],
  ],
  "TSK-5621": [
    [BRYCE, -10, "Discharge summary is in the record from Scripps Mercy."],
    [ME, -4, "Thanks @Bryce Calloway, reviewing this morning.", [BRYCE]],
  ],
  "TSK-1476": [
    [GRAHAM, -20, "Left a voicemail, will try again after lunch."],
  ],
  "TSK-4502": [
    [BRYCE, -6, "Sent the reconnect link by SMS, waiting for the patient."],
  ],
  "TSK-9284": [
    [ME, -8, "Sleep plan looks reasonable, revising the strength training now."],
  ],
}

const SYSTEM_TYPES = new Set<TaskType>(
  TASK_TYPE_NAMES.filter((t) => TASK_TYPES[t])
)

function seedTask([n, type, title, description, patientId, assigneeId, priority, status, due, created]: Seed): Task {
  const source: TaskSource = SYSTEM_TYPES.has(type) ? "System" : "Manual"
  const createdBy = source === "System" ? "system" : ME
  const createdAt = at(created)
  const events: TaskEvent[] = [
    { at: createdAt, by: createdBy, text: "created this task" },
    { at: createdAt, by: createdBy, text: `assigned this task to @${assigneeId}` },
  ]
  if (status !== "Open")
    events.push({ at: at(Math.min(created + 6, -2)), by: assigneeId, text: "moved this task to Completed" })
  if (status === "Reopened")
    events.push({ at: at(Math.min(created + 10, -1)), by: ME, text: "moved this task to Reopened" })
  return {
    id: `TSK-${n}`,
    type,
    title,
    description,
    patientId,
    assigneeId,
    priority,
    status,
    due: at(due),
    createdAt,
    source,
    createdBy,
    events,
    comments: (SEED_COMMENTS[`TSK-${n}`] ?? []).map(([by, h, text, mentions = []], i) => ({
      id: `TSK-${n}-c${i + 1}`,
      at: at(h),
      by,
      text,
      mentions,
    })),
  }
}

export const tasks = createCollection("hol-provider-tasks", SEEDS.map(seedTask), "v5")

export type TaskInput = Pick<
  Task,
  "type" | "title" | "description" | "patientId" | "assigneeId" | "priority" | "due"
>

export function addTask(input: TaskInput) {
  const taken = new Set(tasks.get().map((t) => t.id))
  let n = 1000 + Math.floor(Math.random() * 9000)
  while (taken.has(`TSK-${n}`)) n = 1000 + ((n + 1) % 9000)
  const createdAt = at(0)
  const task: Task = {
    ...input,
    id: `TSK-${n}`,
    status: "Open",
    createdAt,
    source: "Manual",
    createdBy: ME,
    events: [
      { at: createdAt, by: ME, text: "created this task" },
      { at: createdAt, by: ME, text: `assigned this task to @${input.assigneeId}` },
    ],
    comments: [],
  }
  tasks.add([task])
  return task
}

function log(id: string, changes: Partial<Task>, text: string) {
  const task = tasks.get().find((t) => t.id === id)
  if (!task) return
  tasks.patch(id, {
    ...changes,
    events: [...task.events, { at: at(0), by: ME, text }],
  })
}

export function setTaskStatus(id: string, status: TaskStatus) {
  log(id, { status }, `moved this task to ${status}`)
}

export function reassignTask(id: string, assigneeId: string) {
  log(id, { assigneeId }, `reassigned this task to @${assigneeId}`)
}

export function setTaskPriority(id: string, priority: TaskPriority) {
  log(id, { priority }, `set the priority to ${priority.toLowerCase()}`)
}


export function addTaskComment(id: string, text: string, mentions: string[]) {
  const task = tasks.get().find((t) => t.id === id)
  if (!task) return
  tasks.patch(id, {
    comments: [
      ...task.comments,
      {
        id: `${id}-c${task.comments.length + 1}`,
        at: at(0),
        by: ME,
        text,
        mentions,
      },
    ],
  })
}
