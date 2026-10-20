import {
  createCollection,
  nextId,
} from "@/components/practice/collection-store"
import { REYES_ID } from "@/components/practice/practice-data"
import { NOW } from "@/components/provider/home-v2/clock"

/* Provider to provider messaging. Only clinicians of the practice take part:
   every chat is between two providers. Patients are never members, so
   nothing here can reach the patient app. */

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
  /** Both members, the signed-in provider included. */
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

type Line = [
  authorId: string,
  at: string,
  text: string,
  extra?: {
    attachments?: ChatAttachment[]
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
  memberIds: string[],
  lines: Line[],
  unread = 0
): ChatThread {
  return {
    id,
    memberIds,
    unread,
    messages: lines.map(([authorId, at, text, extra], i) => ({
      id: `${id}-${i}`,
      authorId,
      at,
      text,
      attachments: extra?.attachments ?? [],
      ...(extra?.replyTo !== undefined && {
        replyTo: `${id}-${extra.replyTo}`,
      }),
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
    [ME, FELDSTEIN],
    [
      [
        FELDSTEIN,
        "2026-09-30T14:00",
        "Do you have a template for the longevity baseline review? I'd like to keep ours consistent.",
      ],
      [ME, "2026-09-30T14:22", "Yes, I'll send it over this afternoon."],
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
]

export const chats = createCollection("hol-provider-chats", SEED, "v4")

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
  replyTo?: string
) {
  const t = chats.get().find((c) => c.id === threadId)
  if (!t) return
  const message: ChatMessage = {
    id: `${threadId}-${t.messages.length}-${Date.now()}`,
    authorId: ME,
    text,
    attachments,
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
  const existing = chats.get().find((c) => c.memberIds.includes(providerId))
  if (existing) return existing.id
  const id = nextId("CH", chats.get(), 4)
  chats.add([
    {
      id,
      memberIds: [ME, providerId],
      messages: [],
      unread: 0,
    },
  ])
  return id
}
