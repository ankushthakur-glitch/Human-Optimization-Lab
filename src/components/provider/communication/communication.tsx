"use client"

import * as React from "react"
import {
  IconAdd,
  IconArrowLeft,
  IconAttachment,
  IconCheck,
  IconClose,
  IconDownload,
  IconFileText,
  IconFilter,
  IconImage,
  IconMic,
  IconReply,
  IconSearch,
  IconSend,
} from "@/design-system/icons"

import { cn } from "@/lib/utils"
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/design-system/ui/attachment"
import { Button } from "@/design-system/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/design-system/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/design-system/ui/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupTextarea,
} from "@/design-system/ui/input-group"
import { Skeleton } from "@/design-system/ui/skeleton"
import { toast } from "@/design-system/ui/sonner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/design-system/ui/tooltip"
import { Avatar } from "@/components/dashboard-kit-v2"
import {
  type Provider,
  providerName,
  providers,
} from "@/components/practice/practice-data"
import { ProviderShell } from "@/components/provider/provider-shell"
import {
  daysSince,
  fmtDate,
  fmtTime,
} from "@/components/provider/home-v2/clock"
import {
  CHAT_ME,
  type ChatAttachment,
  type ChatMessage,
  type ChatThread,
  REACTIONS,
  type Reaction,
  chats,
  lastOf,
  markRead,
  openDirect,
  sendMessage,
  toggleReaction,
} from "@/components/provider/communication/chat-data"
import { useDictation } from "@/components/provider/communication/use-dictation"

/* Communication, from the Amazing Grace Center "Chat" frames: a list of
   conversations on the left, the open one on the right, a New chat dialog.
   Only one to one provider chats: the reference's Patients tab, its groups
   and the patient half of its New chat dialog are left out on purpose. */

type Filter = "all" | "unread"

const PANEL =
  "flex min-h-0 min-w-0 flex-col rounded-lg border bg-card shadow-[0_0_5px_rgb(0_0_0/0.06)]"

const WEEKDAY = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]
const weekday = (iso: string) =>
  WEEKDAY[new Date(`${iso.slice(0, 10)}T12:00:00`).getDay()]!

/** Today's time, Yesterday, a weekday this week, or the date. */
function listWhen(iso: string) {
  const days = daysSince(iso)
  if (days === 0) return fmtTime(iso)
  if (days === 1) return "Yesterday"
  if (days < 7) return weekday(iso)
  return fmtDate(iso)
}

function dayLabel(iso: string) {
  const days = daysSince(iso)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  return `${weekday(iso)}, ${fmtDate(iso)}`
}

function useWide() {
  return React.useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia("(min-width: 1024px)")
      mq.addEventListener("change", onChange)
      return () => mq.removeEventListener("change", onChange)
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => false
  )
}

function useProviderLookup() {
  const { items } = providers.use()
  return React.useMemo(() => new Map(items.map((p) => [p.id, p])), [items])
}

/* Everyone the signed-in provider can message: active clinicians only. */
function useColleagues() {
  const { items } = providers.use()
  return React.useMemo(
    () =>
      items
        .filter((p) => p.id !== CHAT_ME && p.status === "Active")
        .sort((a, b) => a.lastName.localeCompare(b.lastName)),
    [items]
  )
}

function otherOf(t: ChatThread, people: Map<string, Provider>) {
  return people.get(t.memberIds.find((m) => m !== CHAT_ME) ?? "")
}

function titleOf(t: ChatThread, people: Map<string, Provider>) {
  const other = otherOf(t, people)
  return other ? providerName(other) : "Provider"
}

/** The text of a message, or its documents when it has no text. */
function summaryOf(m: ChatMessage) {
  return (
    m.text ||
    (m.attachments.length === 1
      ? m.attachments[0]!.name
      : `${m.attachments.length} documents`)
  )
}

function UnreadCount({ n }: { n: number }) {
  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground tabular-nums">
      {n}
    </span>
  )
}

/* ------------------------------------------------------------- the page -- */

export function CommunicationScreen() {
  const { items, ready } = chats.use()
  const people = useProviderLookup()
  const [filter, setFilter] = React.useState<Filter>("all")
  const [query, setQuery] = React.useState("")
  const [openId, setOpenId] = React.useState<string | null>(null)
  /* Below lg the list and the thread take turns on screen. */
  const [showThread, setShowThread] = React.useState(false)
  const [dialog, setDialog] = React.useState(false)

  const list = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return items
      .filter((t) => filter === "all" || t.unread > 0)
      .filter((t) => !q || titleOf(t, people).toLowerCase().includes(q))
      .sort((a, b) => (lastOf(b)?.at ?? "").localeCompare(lastOf(a)?.at ?? ""))
  }, [items, filter, query, people])

  /* The open thread stays open while it is in the list; otherwise the
     first row opens, so the right side is never blank on a wide screen. */
  const current =
    list.find((t) => t.id === openId) ?? (showThread ? undefined : list[0])

  function open(id: string) {
    setOpenId(id)
    setShowThread(true)
  }

  /* A thread on screen counts as read, including the one a wide screen
     opens by itself. Below lg that one stays hidden behind the list. */
  const wide = useWide()
  const visibleId = current && (showThread || wide) ? current.id : null
  const visibleUnread = current?.unread ?? 0
  React.useEffect(() => {
    if (ready && visibleId && visibleUnread > 0) markRead(visibleId)
  }, [ready, visibleId, visibleUnread])

  function started(id: string) {
    setDialog(false)
    setQuery("")
    setFilter("all")
    open(id)
  }

  return (
    <ProviderShell active="communication">
      <div className="flex min-h-0 flex-1 flex-col gap-4 bg-surface-sunken px-4 pt-3 pb-4">
        <h1 className="sr-only">Communication</h1>
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold">
            Communication{" "}
            <span className="font-normal text-muted-foreground tabular-nums">
              ({items.length})
            </span>
          </h2>
          <Button size="sm" onClick={() => setDialog(true)}>
            <IconAdd />
            New chat
          </Button>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(300px,380px)_1fr]">
          <section
            aria-label="Provider chats"
            className={cn(PANEL, showThread && "hidden lg:flex")}
          >
            <div className="flex shrink-0 items-center gap-2 p-3">
              <InputGroup className="h-8">
                <InputGroupAddon>
                  <IconSearch />
                </InputGroupAddon>
                <InputGroupInput
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search"
                  aria-label="Search conversations"
                />
              </InputGroup>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label="Filter conversations"
                      className={cn(
                        "shrink-0",
                        filter === "unread" && "border-primary text-primary"
                      )}
                    />
                  }
                >
                  <IconFilter />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuRadioGroup
                    value={filter}
                    onValueChange={(v) => setFilter(v as Filter)}
                  >
                    <DropdownMenuRadioItem value="all">
                      All
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="unread">
                      Unread
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <ul className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-3">
              {!ready
                ? Array.from({ length: 5 }, (_, i) => (
                    <li key={i} className="flex items-center gap-3 px-2 py-3">
                      <Skeleton className="size-9 rounded-full" />
                      <div className="flex flex-1 flex-col gap-1.5">
                        <Skeleton className="h-3.5 w-32 rounded-sm" />
                        <Skeleton className="h-3 w-48 rounded-sm" />
                      </div>
                    </li>
                  ))
                : list.map((t) => (
                    <li key={t.id}>
                      <ThreadRow
                        thread={t}
                        people={people}
                        active={t.id === current?.id}
                        onOpen={() => open(t.id)}
                      />
                    </li>
                  ))}
              {ready && list.length === 0 && (
                <li className="px-2 py-10 text-center text-[13px] text-muted-foreground">
                  {query || filter === "unread"
                    ? "No conversations match"
                    : "No chats yet"}
                </li>
              )}
            </ul>
          </section>

          <section
            aria-label="Conversation"
            className={cn(PANEL, !showThread && "hidden lg:flex")}
          >
            {current ? (
              <ThreadView
                key={current.id}
                thread={current}
                people={people}
                onBack={() => setShowThread(false)}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center p-6 text-[13px] text-muted-foreground">
                {ready ? "Select a conversation" : ""}
              </div>
            )}
          </section>
        </div>
      </div>

      <NewChatDialog
        open={dialog}
        onClose={() => setDialog(false)}
        onStart={(providerId) => started(openDirect(providerId))}
      />
    </ProviderShell>
  )
}

/* ----------------------------------------------------------- list rows -- */

function ThreadRow({
  thread: t,
  people,
  active,
  onOpen,
}: {
  thread: ChatThread
  people: Map<string, Provider>
  active: boolean
  onOpen: () => void
}) {
  const last = lastOf(t)
  const other = otherOf(t, people)
  const title = titleOf(t, people)
  const body = last ? summaryOf(last) : ""
  const preview = !last
    ? "No messages yet"
    : last.authorId === CHAT_ME
      ? `You: ${body}`
      : body

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors",
        active ? "bg-primary-surface" : "hover:bg-muted/60"
      )}
    >
      <Avatar name={title} photo={other?.photo} size={36} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-sm",
              t.unread ? "font-semibold" : "font-medium"
            )}
          >
            {title}
          </span>
          {last && (
            <span
              className={cn(
                "shrink-0 text-xs tabular-nums",
                t.unread
                  ? "font-medium text-primary-tint"
                  : "text-muted-foreground"
              )}
            >
              {listWhen(last.at)}
            </span>
          )}
        </span>
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[13px]",
              t.unread ? "text-foreground/85" : "text-muted-foreground"
            )}
          >
            {preview}
          </span>
          {t.unread > 0 && <UnreadCount n={t.unread} />}
        </span>
      </span>
    </button>
  )
}

/* -------------------------------------------------------------- thread -- */

function ThreadHeader({
  thread: t,
  people,
  onBack,
}: {
  thread: ChatThread
  people: Map<string, Provider>
  onBack: () => void
}) {
  const other = otherOf(t, people)

  return (
    <div className="flex shrink-0 items-center gap-3 px-4 py-3">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Back to conversations"
        className="-ml-1 lg:hidden"
        onClick={onBack}
      >
        <IconArrowLeft />
      </Button>
      <Avatar
        name={titleOf(t, people)}
        photo={other?.photo}
        size={48}
        className="size-10!"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h2 className="truncate text-[15px] leading-5 font-semibold">
          {titleOf(t, people)}
        </h2>
        {other && (
          <p className="flex flex-wrap gap-x-4 text-xs text-muted-foreground">
            <span>
              Specialty :{" "}
              <span className="text-foreground/85">{other.specialty}</span>
            </span>
            <span className="hidden sm:inline">
              Phone : <span className="text-foreground/85">{other.phone}</span>
            </span>
            <span className="hidden md:inline">
              Email : <span className="text-foreground/85">{other.email}</span>
            </span>
          </p>
        )}
      </div>
    </div>
  )
}

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function fileKind(name: string) {
  const ext = name.split(".").pop()?.toUpperCase()
  return ext && ext !== name.toUpperCase() ? ext : "File"
}

/* A document waiting in the composer, with a way to take it back out. */
function AttachmentCard({
  file,
  onRemove,
}: {
  file: ChatAttachment
  onRemove: () => void
}) {
  return (
    <Attachment
      size="sm"
      className="w-72 max-w-full border-primary/30 bg-card has-[>a,>button]:hover:bg-card"
    >
      <AttachmentMedia className="rounded-lg bg-primary text-primary-foreground">
        {file.type.startsWith("image/") ? <IconImage /> : <IconFileText />}
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle className="line-clamp-2 text-[13px] whitespace-normal text-primary-tint">
          {file.name}
        </AttachmentTitle>
        <AttachmentDescription>
          {fileKind(file.name)}, {fileSize(file.size)}
        </AttachmentDescription>
      </AttachmentContent>
      <AttachmentActions>
        <AttachmentAction aria-label={`Remove ${file.name}`} onClick={onRemove}>
          <IconClose />
        </AttachmentAction>
      </AttachmentActions>
    </Attachment>
  )
}

/* A shared document, as chat apps show it: a look at the first page on
   top, then the file's name as a link and a download button. */
function DocumentCard({ file }: { file: ChatAttachment }) {
  const image = file.type.startsWith("image/")
  const preview = file.preview ?? (image ? file.url : undefined)
  return (
    <div className="w-80 max-w-full overflow-hidden rounded-xl border bg-card">
      <a
        href={file.url}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open ${file.name}`}
        className={cn(
          "block h-40 overflow-hidden border-b bg-muted/60 transition-opacity hover:opacity-90",
          preview && !image && "px-8 pt-4"
        )}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt=""
            className={cn(
              "size-full object-cover object-top",
              !image &&
                "rounded-t-sm bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.06)]"
            )}
          />
        ) : (
          <span className="flex size-full flex-col items-center justify-center gap-1.5 text-muted-foreground">
            <IconFileText className="size-9" />
            <span className="text-xs">{fileKind(file.name)}</span>
          </span>
        )}
      </a>
      <div className="flex items-center gap-2.5 py-1.5 pr-1.5 pl-3">
        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          {image ? (
            <IconImage className="size-3.5" />
          ) : (
            <IconFileText className="size-3.5" />
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <a
            href={file.url}
            target="_blank"
            rel="noreferrer"
            className="truncate text-sm font-medium text-primary-tint hover:underline"
          >
            {file.name}
          </a>
          <span className="text-[11px] text-muted-foreground">
            {fileKind(file.name)}, {fileSize(file.size)}
          </span>
        </span>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Download ${file.name}`}
                nativeButton={false}
                render={<a href={file.url} download={file.name} />}
                className="text-muted-foreground hover:text-foreground"
              />
            }
          >
            <IconDownload />
          </TooltipTrigger>
          <TooltipContent>Download</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}

/* The reference's chat cards: square corner and a small tail on the first
   card of a run, the author with a specialty tag, then the text and a footer
   with the seen count and the time. Mine sit right in the primary tint.
   Hovering a card shows like, dislike and reply beside it, as in chat apps;
   reactions collect under the card and a reply quotes the message above. */
const MINE_BG = "bg-[color-mix(in_oklch,var(--primary)_13%,var(--card))]"

const REACTION_LABEL: Record<Reaction, string> = {
  "👍": "Like",
  "👎": "Dislike",
}

function nameOf(id: string, people: Map<string, Provider>) {
  if (id === CHAT_ME) return "You"
  const p = people.get(id)
  return p ? providerName(p) : "Provider"
}

function HoverTool({
  label,
  onClick,
  pressed,
  children,
}: {
  label: string
  onClick: () => void
  pressed?: boolean
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            aria-pressed={pressed}
            onClick={onClick}
            className={cn(
              "size-7 text-base text-muted-foreground hover:text-foreground",
              pressed && "bg-primary-surface"
            )}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/** The answered message, quoted inside the reply. */
function Quote({
  message: q,
  people,
  onClick,
}: {
  message: ChatMessage
  people: Map<string, Provider>
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-0 flex-col rounded-md border-l-2 border-primary bg-foreground/[0.04] px-2.5 py-1.5 text-left text-xs leading-4 transition-colors hover:bg-foreground/[0.07]"
    >
      <span className="font-medium text-primary-tint">
        {nameOf(q.authorId, people)}
      </span>
      <span className="line-clamp-2 text-muted-foreground">{summaryOf(q)}</span>
    </button>
  )
}

function MessageItem({
  message: m,
  thread: t,
  people,
  showAuthor,
  flash,
  onReply,
  onJump,
}: {
  message: ChatMessage
  thread: ChatThread
  people: Map<string, Provider>
  showAuthor: boolean
  flash: boolean
  onReply: () => void
  onJump: (messageId: string) => void
}) {
  const mine = m.authorId === CHAT_ME
  const author = people.get(m.authorId)
  const bg = mine ? MINE_BG : "bg-card"
  const named = showAuthor && author && !mine
  const quoted = m.replyTo
    ? t.messages.find((x) => x.id === m.replyTo)
    : undefined
  const reacted = REACTIONS.filter((r) => (m.reactions?.[r]?.length ?? 0) > 0)

  return (
    <div
      className={cn(
        "group/msg flex items-start gap-2.5",
        mine && "flex-row-reverse"
      )}
    >
      <div
        className={cn(
          "flex max-w-[min(72%,600px)] min-w-0 flex-col gap-1",
          mine ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "relative flex max-w-full min-w-0 flex-col gap-1 rounded-lg px-3.5 pt-2.5 pb-2 text-[13px] leading-5 ring-primary/40 transition-shadow duration-500",
            bg,
            showAuthor && (mine ? "rounded-tr-none" : "rounded-tl-none"),
            flash && "ring-2"
          )}
        >
          {showAuthor && (
            <span
              aria-hidden
              className={cn(
                "absolute top-0 size-2.5",
                bg,
                mine
                  ? "-right-2.5 [clip-path:polygon(0_0,100%_0,0_100%)]"
                  : "-left-2.5 [clip-path:polygon(0_0,100%_0,100%_100%)]"
              )}
            />
          )}
          <div
            className={cn(
              "pointer-events-none absolute top-0 z-10 flex items-center gap-0.5 rounded-lg border bg-popover p-0.5 opacity-0 shadow-sm transition-opacity group-hover/msg:pointer-events-auto group-hover/msg:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100",
              mine ? "right-full mr-3" : "left-full ml-3"
            )}
          >
            {REACTIONS.map((r) => (
              <HoverTool
                key={r}
                label={REACTION_LABEL[r]}
                pressed={m.reactions?.[r]?.includes(CHAT_ME) ?? false}
                onClick={() => toggleReaction(t.id, m.id, r)}
              >
                {r}
              </HoverTool>
            ))}
            <span aria-hidden className="mx-0.5 h-4 w-px bg-border" />
            <HoverTool label="Reply" onClick={onReply}>
              <IconReply className="size-4" />
            </HoverTool>
          </div>
          {named && (
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
              {providerName(author)}
            </span>
          )}
          {quoted && (
            <Quote
              message={quoted}
              people={people}
              onClick={() => onJump(quoted.id)}
            />
          )}
          {m.text && (
            <p className="break-words whitespace-pre-wrap text-foreground">
              {m.text}
            </p>
          )}
          {m.attachments.length > 0 && (
            <div className="flex flex-col gap-2 py-1">
              {m.attachments.map((file) => (
                <DocumentCard key={file.id} file={file} />
              ))}
            </div>
          )}
          <span className="flex items-center justify-end gap-2 text-[11px] text-muted-foreground tabular-nums">
            {fmtTime(m.at)}
          </span>
        </div>
        {reacted.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {reacted.map((r) => {
              const ids = m.reactions![r]!
              const on = ids.includes(CHAT_ME)
              return (
                <Tooltip key={r}>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        aria-pressed={on}
                        aria-label={`${REACTION_LABEL[r]}, ${ids.length}`}
                        onClick={() => toggleReaction(t.id, m.id, r)}
                        className={cn(
                          "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs tabular-nums transition-colors",
                          on
                            ? "border-primary/40 bg-primary-surface font-medium text-primary-tint"
                            : "bg-card text-muted-foreground hover:bg-muted"
                        )}
                      />
                    }
                  >
                    <span className="text-sm leading-none">{r}</span>
                    {ids.length}
                  </TooltipTrigger>
                  <TooltipContent>
                    {ids.map((id) => nameOf(id, people)).join(", ")}
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const MAX_FILE = 10 * 1024 * 1024
const ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg"

function ComposerTool({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <InputGroupButton
            size="icon-xs"
            aria-label={label}
            onClick={onClick}
            className="text-muted-foreground hover:text-foreground"
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function ThreadView({
  thread: t,
  people,
  onBack,
}: {
  thread: ChatThread
  people: Map<string, Provider>
  onBack: () => void
}) {
  const [draft, setDraft] = React.useState("")
  const [files, setFiles] = React.useState<ChatAttachment[]>([])
  const [replyId, setReplyId] = React.useState<string | null>(null)
  const [flash, setFlash] = React.useState<string | null>(null)
  const replying = replyId
    ? t.messages.find((m) => m.id === replyId)
    : undefined
  const scroller = React.useRef<HTMLDivElement>(null)
  const input = React.useRef<HTMLTextAreaElement>(null)
  const fileInput = React.useRef<HTMLInputElement>(null)
  const count = t.messages.length

  const dictation = useDictation({
    onText: setDraft,
    onError: (message) => toast.error(message),
  })

  React.useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [count])

  /* A reaction on the newest message adds a row under it: keep it in view
     when the list was already at the bottom. */
  const tailReactions = JSON.stringify(lastOf(t)?.reactions ?? {})
  React.useEffect(() => {
    const el = scroller.current
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 160)
      el.scrollTop = el.scrollHeight
  }, [tailReactions])

  function addFiles(list: FileList | null) {
    if (!list) return
    const added: ChatAttachment[] = []
    for (const file of Array.from(list)) {
      if (file.size > MAX_FILE) {
        toast.error(`${file.name} is over 10 MB`)
        continue
      }
      added.push({
        id: `${file.name}-${file.size}-${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
      })
    }
    setFiles((cur) => [...cur, ...added])
  }

  function send(event?: React.FormEvent) {
    event?.preventDefault()
    if (dictation.listening) dictation.stop()
    const text = draft.trim()
    if (!text && files.length === 0) return
    sendMessage(t.id, text, files, replying?.id)
    setDraft("")
    setFiles([])
    setReplyId(null)
  }

  function reply(messageId: string) {
    setReplyId(messageId)
    input.current?.focus()
  }

  /* A quote takes you to the message it answers and marks it briefly. */
  const flashTimer = React.useRef<number | undefined>(undefined)
  React.useEffect(() => () => window.clearTimeout(flashTimer.current), [])
  function jump(messageId: string) {
    document
      .getElementById(`msg-${messageId}`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" })
    setFlash(messageId)
    window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(null), 1600)
  }

  return (
    <>
      <ThreadHeader thread={t} people={people} onBack={onBack} />

      <div
        ref={scroller}
        className="mx-4 no-scrollbar min-h-0 flex-1 overflow-y-auto rounded-lg border bg-surface-sunken px-4 py-4"
      >
        {count === 0 ? (
          <p className="py-16 text-center text-[13px] text-muted-foreground">
            No messages yet
          </p>
        ) : (
          <ol className="flex flex-col gap-4">
            {t.messages.map((m, i) => {
              const prev = t.messages[i - 1]
              const newDay = !prev || prev.at.slice(0, 10) !== m.at.slice(0, 10)
              const showAuthor = newDay || prev?.authorId !== m.authorId
              return (
                <li
                  key={m.id}
                  id={`msg-${m.id}`}
                  className="flex flex-col gap-4"
                >
                  {newDay && (
                    <div className="flex items-center gap-3 px-[8%] py-1 text-xs text-muted-foreground">
                      <span className="h-px flex-1 bg-border" />
                      {dayLabel(m.at)}
                      <span className="h-px flex-1 bg-border" />
                    </div>
                  )}
                  <MessageItem
                    message={m}
                    thread={t}
                    people={people}
                    showAuthor={showAuthor}
                    flash={flash === m.id}
                    onReply={() => reply(m.id)}
                    onJump={jump}
                  />
                </li>
              )
            })}
          </ol>
        )}
      </div>

      <div className="relative flex shrink-0 flex-col gap-2 p-4">
        {replying && (
          <div className="flex items-start gap-2.5 rounded-lg border-l-2 border-primary bg-primary-surface/60 py-2 pr-2 pl-3">
            <IconReply className="mt-0.5 size-4 shrink-0 text-primary-tint" />
            <div className="flex min-w-0 flex-1 flex-col text-xs leading-4">
              <span className="font-medium text-primary-tint">
                Replying to {nameOf(replying.authorId, people)}
              </span>
              <span className="truncate text-muted-foreground">
                {summaryOf(replying)}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Cancel reply"
              onClick={() => setReplyId(null)}
            >
              <IconClose />
            </Button>
          </div>
        )}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {files.map((file) => (
              <AttachmentCard
                key={file.id}
                file={file}
                onRemove={() =>
                  setFiles((cur) => cur.filter((f) => f.id !== file.id))
                }
              />
            ))}
          </div>
        )}
        <form onSubmit={send} className="flex items-end gap-3">
          <InputGroup className="h-auto min-h-10 rounded-lg border-input bg-card has-[textarea]:rounded-lg dark:bg-input/30">
            <InputGroupTextarea
              ref={input}
              rows={1}
              value={draft}
              placeholder={dictation.listening ? "Listening" : "Type a message"}
              aria-label="Message"
              className="max-h-32 min-h-10 py-2.5 text-[13px] md:text-[13px]"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && replying) {
                  e.preventDefault()
                  setReplyId(null)
                  return
                }
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                )
                  send(e)
              }}
            />
            <InputGroupAddon align="inline-end" className="self-end pb-1.5">
              <input
                ref={fileInput}
                type="file"
                multiple
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files)
                  e.target.value = ""
                }}
              />
              {dictation.listening ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  onClick={dictation.stop}
                  className="gap-1.5"
                >
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive/60" />
                    <span className="relative inline-flex size-2 rounded-full bg-destructive" />
                  </span>
                  Stop
                </Button>
              ) : (
                <ComposerTool
                  label="Speak to write"
                  onClick={() => dictation.start(draft)}
                >
                  <IconMic />
                </ComposerTool>
              )}
              <ComposerTool
                label="Attach document"
                onClick={() => fileInput.current?.click()}
              >
                <IconAttachment />
              </ComposerTool>
            </InputGroupAddon>
          </InputGroup>
          <Button
            type="submit"
            className="h-10 px-4"
            disabled={!draft.trim() && files.length === 0}
          >
            <IconSend />
            Send
          </Button>
        </form>
      </div>
    </>
  )
}

/* ------------------------------------------------------------- dialogs -- */

function ProviderPicker({
  people,
  selected,
  onToggle,
}: {
  people: Provider[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  const [query, setQuery] = React.useState("")
  const q = query.trim().toLowerCase()
  const shown = people.filter(
    (p) =>
      !q ||
      providerName(p).toLowerCase().includes(q) ||
      p.specialty.toLowerCase().includes(q)
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <InputGroup className="h-8 shrink-0">
        <InputGroupAddon>
          <IconSearch />
        </InputGroupAddon>
        <InputGroupInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search providers"
          aria-label="Search providers"
          autoFocus
        />
      </InputGroup>
      <ul
        role="listbox"
        className="-mx-2 no-scrollbar min-h-0 flex-1 overflow-y-auto"
      >
        {shown.map((p) => {
          const on = selected.includes(p.id)
          return (
            <li key={p.id} role="option" aria-selected={on}>
              <button
                type="button"
                onClick={() => onToggle(p.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors",
                  on ? "bg-primary-surface" : "hover:bg-muted/60"
                )}
              >
                <Avatar
                  name={`${p.firstName} ${p.lastName}`}
                  photo={p.photo}
                  size={30}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13px] font-medium">
                    {providerName(p)}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {p.specialty}
                  </span>
                </span>
                {on && <IconCheck className="size-4 text-primary" />}
              </button>
            </li>
          )
        })}
        {shown.length === 0 && (
          <li className="px-2 py-8 text-center text-[13px] text-muted-foreground">
            No providers match
          </li>
        )}
      </ul>
    </div>
  )
}

function NewChatDialog({
  open,
  onClose,
  onStart,
}: {
  open: boolean
  onClose: () => void
  onStart: (providerId: string) => void
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[min(560px,85dvh)] flex-col gap-0 rounded-xl p-0 sm:max-w-md">
        {open && <NewChatForm onClose={onClose} onStart={onStart} />}
      </DialogContent>
    </Dialog>
  )
}

/* Mounted only while the dialog is open, so every opening starts blank. */
function NewChatForm({
  onClose,
  onStart,
}: {
  onClose: () => void
  onStart: (providerId: string) => void
}) {
  const colleagues = useColleagues()
  const [picked, setPicked] = React.useState("")

  return (
    <>
      <DialogHeader className="shrink-0 border-b px-6 py-4">
        <DialogTitle className="text-base font-semibold">New chat</DialogTitle>
        <DialogDescription className="sr-only">
          Pick a provider in the practice to message.
        </DialogDescription>
      </DialogHeader>
      <div className="flex min-h-0 flex-1 flex-col px-6 py-4">
        <ProviderPicker
          people={colleagues}
          selected={picked ? [picked] : []}
          onToggle={(id) => setPicked((cur) => (cur === id ? "" : id))}
        />
      </div>
      <DialogFooter className="mt-0 shrink-0 flex-row justify-end gap-2 border-t px-6 py-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          disabled={!picked}
          onClick={() => onStart(picked)}
        >
          Start chat
        </Button>
      </DialogFooter>
    </>
  )
}
