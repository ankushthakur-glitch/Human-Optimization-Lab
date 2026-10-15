import {
  createCollection,
  nextId,
} from "@/components/practice/collection-store"
import { REYES_ID } from "@/components/practice/practice-data"
import { NOW } from "@/components/provider/home-v2/clock"

/* Provider to provider messaging. Only clinicians of the practice take part:
   a chat is one other provider, a group is several. Patients are never
   members, so nothing here can reach the patient app. */

/** A document shared in a chat. Uploads carry a blob URL for this session. */
export type ChatAttachment = {
  id: string
  name: string
  /** Bytes. */
  size: number
  type: string
  url: string
  /** A picture of the first page, for documents that have one. */
  preview?: string
}

/** Like and dislike, the two reactions a message takes. */
export const REACTIONS = ["👍", "👎"] as const
export type Reaction = (typeof REACTIONS)[number]

export type ChatMessage = {
  id: string
  authorId: string
  text: string
  attachments: ChatAttachment[]
  /** Group members tagged with @ in the text. */
  mentionIds: string[]
  /** Local wall-clock ISO date-time. */
  at: string
  /** Members other than the author who have read it. */
  seenBy: string[]
  /** The message this one answers, shown quoted above the text. */
  replyTo?: string
  /** Who reacted, by reaction. */
  reactions?: Partial<Record<Reaction, string[]>>
}

export type ChatThread = {
  id: string
  kind: "direct" | "group"
  /** Groups only. */
  name: string
  /** Every member, the signed-in provider included. */
  memberIds: string[]
  messages: ChatMessage[]
  /** Messages the signed-in provider has not opened yet. */
  unread: number
}

const ME = REYES_ID
const HARRINGTON = "PR3132"
const QUINTERO = "PR3133"
const FELDSTEIN = "PR3134"
const MORIARTY = "PR3135"
const ALBRECHT = "PR3136"
const ASHWORTH = "PR3137"
const VANCE = "PR3138"
const MERRIWEATHER = "PR3139"

type Line = [
  authorId: string,
  at: string,
  text: string,
  extra?: {
    attachments?: ChatAttachment[]
    mentionIds?: string[]
    /** Index of the answered line in the same thread. */
    replyTo?: number
    reactions?: ChatMessage["reactions"]
  },
]

/* Sample documents served from public/communication. */
function doc(file: string, size: number): ChatAttachment {
  return {
    id: file,
    name: file,
    size,
    type: "application/pdf",
    url: `/communication/${encodeURIComponent(file)}`,
    preview: `/communication/${encodeURIComponent(file.replace(/\.pdf$/, ".png"))}`,
  }
}

function thread(
  id: string,
  kind: ChatThread["kind"],
  name: string,
  memberIds: string[],
  lines: Line[],
  unread = 0
): ChatThread {
  return {
    id,
    kind,
    name,
    memberIds,
    unread,
    messages: lines.map(([authorId, at, text, extra], i) => ({
      id: `${id}-${i}`,
      authorId,
      at,
      text,
      attachments: extra?.attachments ?? [],
      mentionIds: extra?.mentionIds ?? [],
      ...(extra?.replyTo !== undefined && { replyTo: `${id}-${extra.replyTo}` }),
      ...(extra?.reactions && { reactions: extra.reactions }),
      seenBy: memberIds.filter(
        (m) => m !== authorId && (i < lines.length - unread || m === ME)
      ),
    })),
  }
}

const SEED: ChatThread[] = [
  thread(
    "CH1001",
    "direct",
    "",
    [ME, HARRINGTON],
    [
      [
        ME,
        "2026-10-02T16:40",
        "Elise, Marcus Hale's A1c came back at 7.4, up from 6.9. I'd like your read before I change his metformin.",
      ],
      [
        HARRINGTON,
        "2026-10-02T17:05",
        "Saw it. His fasting logs were fine until mid September. Any change in his sleep or the TRT dose?",
      ],
      [
        ME,
        "2026-10-02T17:12",
        "TRT dose unchanged. He reported poor sleep for three weeks in the app intake.",
      ],
      [
        HARRINGTON,
        "2026-10-03T08:20",
        "Then I would hold the metformin change for now, repeat A1c in six weeks and add a CGM trial. Happy to co-sign the plan.",
        {
          attachments: [doc("CGM trial protocol.pdf", 1368)],
          replyTo: 0,
          reactions: { "👍": [ME] },
        },
      ],
      [HARRINGTON, "2026-10-03T08:21", "Can we talk at 10:30 today?"],
    ],
    2
  ),
  thread(
    "CH1002",
    "direct",
    "",
    [ME, QUINTERO],
    [
      [
        QUINTERO,
        "2026-10-01T11:02",
        "Daniel, thanks for the referral for Priya Natarajan. I reviewed her thyroid panel.",
      ],
      [ME, "2026-10-01T11:30", "Great, anything urgent?"],
      [
        QUINTERO,
        "2026-10-01T12:10",
        "Nothing urgent. TSH is mildly high with normal free T4. I'll add a repeat panel to her baseline tests.",
      ],
      [ME, "2026-10-02T09:15", "Sounds good. I'll note it in her care plan."],
    ]
  ),
  thread(
    "CH1003",
    "direct",
    "",
    [ME, FELDSTEIN],
    [
      [
        FELDSTEIN,
        "2026-09-30T14:00",
        "Do you have a template for the longevity baseline review? I'd like to keep ours consistent.",
      ],
      [
        ME,
        "2026-09-30T14:22",
        "Yes, I'll share it in the Longevity care team group.",
      ],
      [
        FELDSTEIN,
        "2026-10-03T07:50",
        "Thanks, found it. One question on the DEXA section when you have a minute.",
      ],
    ],
    1
  ),
  thread(
    "CH1004",
    "direct",
    "",
    [ME, MORIARTY],
    [
      [
        MORIARTY,
        "2026-09-29T10:10",
        "Covering your inbox Friday afternoon. Anything I should watch for?",
      ],
      [
        ME,
        "2026-09-29T10:35",
        "Thomas Whitfield's potassium recheck. Call me if it's above 5.5.",
      ],
      [MORIARTY, "2026-09-29T10:36", "Will do."],
    ]
  ),
  thread(
    "CH1005",
    "direct",
    "",
    [ME, ALBRECHT],
    [
      [
        ALBRECHT,
        "2026-09-26T15:45",
        "Lipid clinic slots are open again next month if you have referrals.",
      ],
      [
        ME,
        "2026-09-26T16:02",
        "Perfect, I have two. I'll send them over Monday.",
      ],
    ]
  ),
  thread(
    "CH2001",
    "group",
    "Longevity care team",
    [ME, HARRINGTON, FELDSTEIN, MORIARTY, VANCE],
    [
      [
        HARRINGTON,
        "2026-10-02T15:00",
        "Reminder: care plan reviews are due by Friday for the October cohort.",
      ],
      [
        ME,
        "2026-10-02T15:12",
        "Mine are done except Samuel Ortiz, waiting on his baseline labs.",
      ],
      [
        VANCE,
        "2026-10-02T15:30",
        "I'll call Samuel today to schedule the lab draw.",
        { replyTo: 1, reactions: { "👍": [ME, HARRINGTON] } },
      ],
      [
        FELDSTEIN,
        "2026-10-03T08:05",
        "Sharing the baseline review template here too.",
        {
          attachments: [doc("Baseline review template.pdf", 1658)],
          reactions: { "👍": [HARRINGTON, MORIARTY, VANCE] },
        },
      ],
      [
        MORIARTY,
        "2026-10-03T08:40",
        "@Daniel Reyes two new plans need a second reviewer, can you take one?",
        { mentionIds: [ME] },
      ],
    ],
    2
  ),
  thread(
    "CH2002",
    "group",
    "Weight management huddle",
    [ME, QUINTERO, ASHWORTH, VANCE],
    [
      [
        ASHWORTH,
        "2026-10-01T09:00",
        "Huddle moved to Thursday 8 AM this week.",
      ],
      [
        QUINTERO,
        "2026-10-01T09:20",
        "Works for me. I'll bring the GLP-1 refill list.",
      ],
      [ME, "2026-10-01T10:02", "I'll be there."],
    ]
  ),
  thread(
    "CH2003",
    "group",
    "On call this week",
    [ME, HARRINGTON, ALBRECHT, MERRIWEATHER],
    [
      [
        MERRIWEATHER,
        "2026-09-28T18:00",
        "On call swap: I'll take Wednesday, @Kenji Albrecht takes Thursday.",
        {
          attachments: [doc("On call schedule October.pdf", 1396)],
          mentionIds: [ALBRECHT],
        },
      ],
      [ALBRECHT, "2026-09-28T18:15", "Confirmed.", { replyTo: 0 }],
      [HARRINGTON, "2026-09-28T19:02", "Updated the schedule, thanks both."],
    ]
  ),
]

export const chats = createCollection("hol-provider-chats", SEED, "v3")

export const CHAT_ME = ME

/** The latest message in a thread. */
export const lastOf = (t: ChatThread) => t.messages[t.messages.length - 1]

/* A sent message is stamped on the mock clock's day at the real time of
   day, so it lands under Today with the seeded messages. */
function stamp() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${NOW.slice(0, 10)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function sendMessage(
  threadId: string,
  text: string,
  attachments: ChatAttachment[] = [],
  mentionIds: string[] = [],
  replyTo?: string
) {
  const t = chats.get().find((c) => c.id === threadId)
  if (!t) return
  const message: ChatMessage = {
    id: `${threadId}-${t.messages.length}-${Date.now()}`,
    authorId: ME,
    text,
    attachments,
    mentionIds,
    at: stamp(),
    seenBy: [],
    ...(replyTo && { replyTo }),
  }
  chats.patch(threadId, { messages: [...t.messages, message] })
}

/** Adds or takes back my reaction. Like and dislike exclude each other. */
export function toggleReaction(
  threadId: string,
  messageId: string,
  reaction: Reaction
) {
  const t = chats.get().find((c) => c.id === threadId)
  if (!t) return
  chats.patch(threadId, {
    messages: t.messages.map((m) => {
      if (m.id !== messageId) return m
      const had = m.reactions?.[reaction]?.includes(ME)
      const reactions: ChatMessage["reactions"] = {}
      for (const r of REACTIONS) {
        const ids = (m.reactions?.[r] ?? []).filter((id) => id !== ME)
        if (r === reaction && !had) ids.push(ME)
        if (ids.length) reactions[r] = ids
      }
      return { ...m, reactions }
    }),
  })
}

export function markRead(threadId: string) {
  const t = chats.get().find((c) => c.id === threadId)
  if (!t || t.unread === 0) return
  chats.patch(threadId, {
    unread: 0,
    messages: t.messages.map((m) =>
      m.seenBy.includes(ME) || m.authorId === ME
        ? m
        : { ...m, seenBy: [...m.seenBy, ME] }
    ),
  })
}

/** The direct chat with a provider, opened fresh when there is none. */
export function openDirect(providerId: string) {
  const existing = chats
    .get()
    .find((c) => c.kind === "direct" && c.memberIds.includes(providerId))
  if (existing) return existing.id
  const id = nextId("CH", chats.get(), 4)
  chats.add([
    {
      id,
      kind: "direct",
      name: "",
      memberIds: [ME, providerId],
      messages: [],
      unread: 0,
    },
  ])
  return id
}

export function createGroup(name: string, providerIds: string[]) {
  const id = nextId("CH", chats.get(), 4)
  chats.add([
    {
      id,
      kind: "group",
      name,
      memberIds: [ME, ...providerIds],
      messages: [],
      unread: 0,
    },
  ])
  return id
}
