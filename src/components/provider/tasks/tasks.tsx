"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  IconArrowDownDouble,
  IconArrowUpDouble,
  IconCalendar,
  IconCheck,
  IconClock,
  IconClose,
  IconComment,
  IconEqual,
  IconFileText,
  IconFlag,
  IconFolder,
  IconHistory,
  IconRefresh,
  IconSend,
  IconSwitch,
  IconTaskAdd,
  IconUndo,
  IconUser,
  IconUserAdd,
  IconUserCircle,
} from "@/design-system/icons"
import { cn } from "cn"

import { DateField, Required, SelectField, TextField } from "@/components/form-kit"
import {
  Directory,
  NAME_LINK,
  initials,
  SUB_TAB,
  SUB_TABS_LIST,
  useNewParam,
  type Column,
  type FilterDef,
} from "@/components/practice/directory"
import {
  fullName,
  patients,
  providerName,
  providers,
  users,
} from "@/components/practice/practice-data"
import { SUBTLE } from "@/components/patient-dashboard/widgets/kit"
import { NOW, ms } from "@/components/provider/mock-clock"
import { ProviderShell } from "@/components/provider/provider-shell"
import {
  ME,
  TASK_PRIORITIES,
  TASK_SOURCES,
  TASK_STATUSES,
  TASK_TYPE_NAMES,
  type Task,
  type TaskPriority,
  type TaskStatus,
  type TaskType,
  addTask,
  addTaskComment,
  isOverdue,
  reassignTask,
  setTaskPriority,
  setTaskStatus,
  tasks,
} from "@/components/provider/tasks/tasks-data"
import { Badge } from "@/design-system/ui/badge"
import { Button } from "@/design-system/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/design-system/ui/combobox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/design-system/ui/dialog"
import { Field, FieldLabel } from "@/design-system/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/design-system/ui/select"
import { toast } from "@/design-system/ui/sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/design-system/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/design-system/ui/avatar"
import { Textarea } from "@/design-system/ui/textarea"

/* The provider portal's Tasks module, laid out from the Amazing Grace Center
   task list (Figma OulMy5QOcLc2lJ6aX0GpFo, 40018606:285786 and
   40013160:247932): All tasks / My tasks, the worklist table, Add task in a
   dialog and the task in a side sheet with its activity. The reference's
   Job role column is the Assignee here. */

/* -------------------------------------------------------------------------- */
/*  People                                                                     */
/* -------------------------------------------------------------------------- */

type Person = { id: string; name: string; role: string; photo: string }

const CARE_TEAM_ROLES = new Set([
  "Nurse",
  "Medical assistant",
  "Care coordinator",
  "Front desk",
])

/** Everyone a task can go to: active providers, then the active care team. */
function usePeople() {
  const { items: provs } = providers.use()
  const { items: staff } = users.use()
  return React.useMemo(() => {
    const doctors: Person[] = provs
      .filter((p) => p.status === "Active")
      .map((p) => ({
        id: p.id,
        name: providerName(p),
        role: p.role === "Supervising provider" ? "Supervising provider" : "Provider",
        photo: p.photo,
      }))
    const team: Person[] = staff
      .filter((u) => u.status === "Active" && CARE_TEAM_ROLES.has(u.role))
      .map((u) => ({
        id: u.id,
        name: fullName(u),
        role: u.role,
        photo: u.photo,
      }))
    const byId = new Map(
      [...provs.map((p) => [p.id, providerName(p)] as const),
        ...staff.map((u) => [u.id, fullName(u)] as const)]
    )
    const all = [...doctors, ...team]
    return {
      doctors,
      team,
      find: (id: string) => all.find((p) => p.id === id),
      name: (id: string) =>
        id === "system" ? "System" : (byId.get(id) ?? "Unknown"),
    }
  }, [provs, staff])
}

type People = ReturnType<typeof usePeople>

function usePatientNames() {
  const { items } = patients.use()
  return React.useMemo(() => {
    const map = new Map(items.map((p) => [p.id, p]))
    return {
      list: items.filter((p) => p.status !== "Inactive"),
      get: (id: string) => map.get(id),
    }
  }, [items])
}

/* -------------------------------------------------------------------------- */
/*  Small pieces                                                               */
/* -------------------------------------------------------------------------- */

/* Priority reads as the patient list's risk arrow: red up, orange equals,
   green down. */
const PRIORITY_ICON: Record<
  TaskPriority,
  { Icon: typeof IconEqual; color: string }
> = {
  High: { Icon: IconArrowUpDouble, color: SUBTLE.red },
  Medium: { Icon: IconEqual, color: SUBTLE.orange },
  Low: { Icon: IconArrowDownDouble, color: SUBTLE.green },
}

function PriorityIcon({ priority }: { priority: TaskPriority }) {
  const { Icon, color } = PRIORITY_ICON[priority]
  return (
    <span
      title={`${priority} priority`}
      className="flex [--icon-stroke-width:2.5]"
    >
      <Icon
        className="size-[18px]"
        style={{ color }}
        aria-label={`${priority} priority`}
      />
    </span>
  )
}

const STATUS_VARIANT: Record<TaskStatus, "info" | "warning" | "success"> = {
  Open: "info",
  Reopened: "warning",
  Completed: "success",
}

function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
}

const TIME = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
})
const DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })

/** "Today, 11:00 AM", "Tomorrow, 5:00 PM" or "Oct 6, 9:00 AM" on the mock clock. */
function whenLabel(iso: string) {
  const d = new Date(ms(iso))
  const dayOf = (x: string) => ms(x.slice(0, 10))
  const diff = Math.round((dayOf(iso) - dayOf(NOW)) / 86_400_000)
  const day =
    diff === 0
      ? "Today"
      : diff === 1
        ? "Tomorrow"
        : diff === -1
          ? "Yesterday"
          : DAY.format(d)
  return `${day}, ${TIME.format(d)}`
}

const OVERDUE = "#C2504A"

function DueCell({ task }: { task: Task }) {
  const late = isOverdue(task)
  return (
    <span
      title={late ? "Overdue" : undefined}
      className={cn(
        "whitespace-nowrap tabular-nums",
        task.status === "Completed" ? "text-muted-foreground" : "text-foreground"
      )}
      style={late ? { color: OVERDUE } : undefined}
    >
      {whenLabel(task.due)}
    </span>
  )
}

function AssigneeCell({ id, people }: { id: string; people: People }) {
  return (
    <span className="block truncate text-foreground">
      {people.name(id)}
      {id === ME && <span className="text-muted-foreground"> (you)</span>}
    </span>
  )
}

/* The library menu is frosted glass; over the panel's own rows that reads as
   text on text, so these menus sit on a solid popover surface. */
const SOLID_MENU =
  "bg-popover! rounded-xl shadow-lg ring-1 ring-border before:hidden"

/** Providers first, then the care team, each with its role. */
function AssigneeSelect({
  id,
  value,
  onChange,
  people,
  size = "default",
  invalid,
  open,
  onOpenChange,
  className,
  children,
}: {
  id?: string
  value: string
  onChange: (id: string) => void
  people: People
  size?: "sm" | "default"
  invalid?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
  /** Replaces the selected value in the trigger. */
  children?: React.ReactNode
}) {
  const items = [
    { label: "Select", value: null as string | null },
    ...[...people.doctors, ...people.team].map((p) => ({
      label: p.id === ME ? `${p.name} (you)` : p.name,
      value: p.id as string | null,
    })),
  ]
  const group = (title: string, list: Person[]) => (
    <SelectGroup>
      <SelectLabel>{title}</SelectLabel>
      {list.map((p) => (
        <SelectItem key={p.id} value={p.id}>
          <span className="flex w-full min-w-0 items-baseline justify-between gap-4">
            <span className="truncate">
              {p.id === ME ? `${p.name} (you)` : p.name}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {p.role}
            </span>
          </span>
        </SelectItem>
      ))}
    </SelectGroup>
  )
  return (
    <Select
      items={items}
      value={value || null}
      onValueChange={(next: string | null) => next && onChange(next)}
      open={open}
      onOpenChange={onOpenChange}
    >
      <SelectTrigger
        id={id}
        size={size}
        className={className ?? "w-full"}
        aria-invalid={invalid || undefined}
        aria-label="Assignee"
      >
        {children ?? <SelectValue />}
      </SelectTrigger>
      <SelectContent
        align="start"
        alignItemWithTrigger={false}
        className={cn(SOLID_MENU, "max-h-80 w-auto min-w-80")}
      >
        {group("Providers", people.doctors)}
        {group("Care team", people.team)}
      </SelectContent>
    </Select>
  )
}

/* -------------------------------------------------------------------------- */
/*  Screen                                                                     */
/* -------------------------------------------------------------------------- */

export function TasksScreen() {
  return (
    <ProviderShell active="tasks">
      <TaskList />
    </ProviderShell>
  )
}

/* Open work first, soonest due on top; completed work last. */
function byDue(a: Task, b: Task) {
  const done = Number(a.status === "Completed") - Number(b.status === "Completed")
  return done || ms(a.due) - ms(b.due)
}

function TaskList() {
  const { items } = tasks.use()
  const router = useRouter()
  const people = usePeople()
  const pts = usePatientNames()
  const [tab, setTab] = React.useState<"all" | "mine">("all")
  const [openId, setOpenId] = React.useState<string | null>(null)
  const [adding, setAdding] = React.useState(false)
  const openAdd = React.useCallback(() => setAdding(true), [])
  useNewParam(openAdd)

  const all = React.useMemo(() => [...items].sort(byDue), [items])
  const mine = all.filter((t) => t.assigneeId === ME)
  const rows = tab === "mine" ? mine : all
  const open = items.find((t) => t.id === openId) ?? null

  const patientName = (id: string) => {
    const p = pts.get(id)
    return p ? fullName(p) : ""
  }

  const columns: Column<Task>[] = [
    {
      id: "priority",
      header: "Priority",
      className: "w-px whitespace-nowrap pr-1!",
      cell: (t) => <PriorityIcon priority={t.priority} />,
      sortValue: (t) => TASK_PRIORITIES.indexOf(t.priority),
    },
    {
      id: "id",
      header: "ID",
      className: "w-px whitespace-nowrap",
      cell: (t) => (
        <Button
          variant="link"
          className="h-auto p-0 font-medium text-primary-tint tabular-nums"
          onClick={() => setOpenId(t.id)}
        >
          {t.id}
        </Button>
      ),
      sortValue: (t) => t.id,
    },
    {
      id: "type",
      header: "Task type",
      className: "hidden lg:table-cell",
      cell: (t) => <span className="text-foreground">{t.type}</span>,
      sortValue: (t) => t.type,
    },
    {
      id: "patient",
      header: "Patient",
      cell: (t) => {
        const p = pts.get(t.patientId)
        if (!p) return <span className="text-muted-foreground">No patient</span>
        return (
          <Button
            variant="link"
            className={NAME_LINK}
            onClick={() => router.push(`/screens/patients/${p.id}`)}
          >
            {fullName(p)}
          </Button>
        )
      },
      sortValue: (t) => patientName(t.patientId),
    },
    {
      id: "assignee",
      header: "Assignee",
      cell: (t) => <AssigneeCell id={t.assigneeId} people={people} />,
      sortValue: (t) => people.name(t.assigneeId),
    },
    {
      id: "title",
      header: "Title",
      className: "hidden max-w-0 w-[26%] xl:table-cell",
      cell: (t) => (
        <button
          type="button"
          onClick={() => setOpenId(t.id)}
          className="block w-full truncate text-left text-foreground"
        >
          {t.title}
        </button>
      ),
      sortValue: (t) => t.title,
    },
    {
      id: "status",
      header: "Status",
      cell: (t) => <TaskStatusBadge status={t.status} />,
      sortValue: (t) => TASK_STATUSES.indexOf(t.status),
    },
    {
      id: "due",
      header: "Due",
      cell: (t) => <DueCell task={t} />,
      sortValue: (t) => ms(t.due),
    },
  ]

  const shown = open
    ? columns.filter((c) => c.id !== "title")
    : columns

  const assigneeNames = [...people.doctors, ...people.team].map((p) => p.name)
  const filters: FilterDef<Task>[] = [
    {
      id: "status",
      label: "Status",
      all: "All statuses",
      options: [...TASK_STATUSES, "Overdue"],
      match: (t, v) => (v === "Overdue" ? isOverdue(t) : t.status === v),
    },
    {
      id: "priority",
      label: "Priority",
      all: "All priorities",
      options: TASK_PRIORITIES,
      match: (t, v) => t.priority === v,
    },
    {
      id: "type",
      label: "Task type",
      all: "All task types",
      options: TASK_TYPE_NAMES,
      match: (t, v) => t.type === v,
    },
    {
      id: "source",
      label: "Source",
      all: "All sources",
      options: TASK_SOURCES,
      match: (t, v) => t.source === v,
    },
    ...(tab === "all"
      ? [
          {
            id: "assignee",
            label: "Assignee",
            all: "All assignees",
            options: assigneeNames,
            match: (t: Task, v: string) => people.name(t.assigneeId) === v,
          },
        ]
      : []),
  ]

  const count = (list: Task[]) => list.filter((t) => t.status !== "Completed").length

  return (
    <>
      <Directory<Task>
        key={tab}
        title="Tasks"
        noun="tasks"
        heading={
          <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "mine")}>
            <TabsList className={SUB_TABS_LIST}>
              <TabsTrigger value="all" className={SUB_TAB}>
                All tasks ({count(all)})
              </TabsTrigger>
              <TabsTrigger value="mine" className={SUB_TAB}>
                My tasks ({count(mine)})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        }
        rows={rows}
        columns={shown}
        search={(t) => [
          t.id,
          t.type,
          t.title,
          t.description,
          patientName(t.patientId),
          people.name(t.assigneeId),
        ]}
        filters={filters}
        primaryAction={{
          label: "Add task",
          icon: <IconTaskAdd />,
          onClick: openAdd,
        }}
        bulkActions={(selected, clear) => {
          const pending = selected.filter((t) => t.status !== "Completed")
          if (pending.length === 0) return null
          return (
            <Button
              variant="outline"
              size="sm"
              className="rounded-md"
              onClick={() => {
                pending.forEach((t) => setTaskStatus(t.id, "Completed"))
                toast.success(
                  pending.length === 1
                    ? "Task completed"
                    : `${pending.length} tasks completed`
                )
                clear()
              }}
            >
              <IconCheck />
              Mark complete ({pending.length})
            </Button>
          )
        }}
        exportName="Tasks"
        exportRow={(t) => ({
          ID: t.id,
          Priority: t.priority,
          "Task type": t.type,
          Title: t.title,
          Patient: patientName(t.patientId),
          "Patient ID": t.patientId,
          Assignee: people.name(t.assigneeId),
          Description: t.description,
          Status: isOverdue(t) ? `${t.status}, overdue` : t.status,
          Due: whenLabel(t.due),
          Source: t.source,
          Created: whenLabel(t.createdAt),
        })}
        emptyIllustration="no-results"
        activeRowId={open?.id}
        aside={
          open && (
            <TaskPanel
              key={open.id}
              task={open}
              people={people}
              patientName={patientName}
              onClose={() => setOpenId(null)}
            />
          )
        }
      />

      <AddTaskDialog
        open={adding}
        people={people}
        onClose={() => setAdding(false)}
        onCreated={(t) => {
          setAdding(false)
          toast.success("Task added", {
            description: `${t.id} assigned to ${people.name(t.assigneeId)}.`,
          })
        }}
      />
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  Task panel                                                                 */
/* -------------------------------------------------------------------------- */

/** "assigned this task to @U53165" with the id spelled as the person. */
function eventText(text: string, people: People) {
  return text.replace(/@(\S+)/, (_, id: string) => people.name(id))
}

/* A value in the panel's details card that opens a menu: plain text with a
   chevron, no field box, as in the reference. */
const INLINE_TRIGGER =
  "h-auto! w-auto gap-1.5 rounded-sm border-0 bg-transparent p-0 font-medium " +
  "text-foreground/80 hover:bg-transparent hover:text-foreground " +
  "focus-visible:ring-2 dark:bg-transparent"

function PanelRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-10 items-center gap-3 border-b px-3 py-2 last:border-b-0">
      <span className="flex w-[100px] shrink-0 items-center gap-1.5 font-medium text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </span>
      <div className="min-w-0 flex-1 font-medium text-foreground/80">
        {children}
      </div>
    </div>
  )
}

/* Each kind of event gets its own mark, read from what the event says. */
function eventIcon(text: string) {
  if (text.startsWith("created")) return IconTaskAdd
  if (text.includes("assigned")) return IconUserAdd
  if (text.startsWith("moved")) return IconRefresh
  if (text.includes("priority")) return IconFlag
  return IconClock
}

function PersonAvatar({ id, people }: { id: string; people: People }) {
  const person = people.find(id)
  const name = people.name(id)
  return (
    <Avatar className="size-7 shrink-0">
      {person?.photo && <AvatarImage src={person.photo} alt="" />}
      <AvatarFallback className="bg-primary-surface text-[11px] font-medium text-primary">
        {initials(name.replace(/,.*$/, ""))}
      </AvatarFallback>
    </Avatar>
  )
}

/** How a person is tagged: the name without the credential. */
function tagName(people: People, id: string) {
  return people.name(id).replace(/,.*$/, "")
}

/** Comment text with each tagged name picked out. */
function WithMentions({ text, names }: { text: string; names: string[] }) {
  if (names.length === 0) return <>{text}</>
  const escaped = names
    .sort((a, b) => b.length - a.length)
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  const parts = text.split(new RegExp(`(@(?:${escaped.join("|")}))`, "g"))
  return (
    <>
      {parts.map((part, i) =>
        i % 2 ? (
          <span key={i} className="font-medium text-primary">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  )
}

/* Where a character of a textarea sits, in px from the textarea's top left:
   a hidden copy with the same box and font, cut at that character. */
function caretPoint(el: HTMLTextAreaElement, index: number) {
  const style = getComputedStyle(el)
  const mirror = document.createElement("div")
  for (const prop of [
    "boxSizing", "width", "paddingTop", "paddingRight", "paddingBottom",
    "paddingLeft", "borderTopWidth", "borderRightWidth", "borderBottomWidth",
    "borderLeftWidth", "fontFamily", "fontSize", "fontWeight", "fontStyle",
    "letterSpacing", "lineHeight", "textTransform", "wordSpacing", "tabSize",
  ] as const)
    mirror.style[prop] = style[prop]
  Object.assign(mirror.style, {
    position: "absolute",
    visibility: "hidden",
    top: "0",
    left: "-9999px",
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
  })
  mirror.textContent = el.value.slice(0, index)
  const mark = document.createElement("span")
  mark.textContent = el.value.slice(index) || "."
  mirror.appendChild(mark)
  document.body.appendChild(mirror)
  const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.4
  const point = {
    top: mark.offsetTop - el.scrollTop + lineHeight,
    left: mark.offsetLeft - el.scrollLeft,
  }
  mirror.remove()
  return point
}

const TAG_MENU_WIDTH = 256

/* The comment box. Typing @ opens the care team under the
   box; picking someone writes @Name into the text and tags them. */
function CommentComposer({
  people,
  onPost,
}: {
  people: People
  onPost: (text: string, mentions: string[]) => void
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null)
  const [draft, setDraft] = React.useState("")
  const [tagged, setTagged] = React.useState<string[]>([])
  const [query, setQuery] = React.useState<{ start: number; text: string } | null>(null)
  const [active, setActive] = React.useState(0)
  const [anchor, setAnchor] = React.useState({ top: 0, left: 0 })
  const menuRef = React.useRef<HTMLUListElement>(null)

  const everyone = [...people.doctors, ...people.team]
  /* First names that start with the query, then last names, then anywhere. */
  const matches = query
    ? everyone
        .map((p) => {
          const name = tagName(people, p.id).toLowerCase()
          const q = query.text.toLowerCase()
          const rank = name.startsWith(q)
            ? 0
            : name.split(" ").some((w) => w.startsWith(q))
              ? 1
              : name.includes(q)
                ? 2
                : 3
          return { p, rank }
        })
        .filter((m) => m.rank < 3)
        .sort((a, b) => a.rank - b.rank)
        .slice(0, 6)
        .map((m) => m.p)
    : []

  const open = matches.length > 0
  React.useEffect(() => {
    if (open) menuRef.current?.scrollIntoView({ block: "nearest" })
  }, [open, anchor])

  /* Where the caret goes after the text is rewritten, set before paint so
     the next keystroke lands after the tag. */
  const caretAfter = React.useRef<number | null>(null)
  React.useLayoutEffect(() => {
    if (caretAfter.current === null || !ref.current) return
    ref.current.focus()
    ref.current.setSelectionRange(caretAfter.current, caretAfter.current)
    caretAfter.current = null
  }, [draft])

  function readQuery(value: string, caret: number) {
    const m = /(^|\s)@([A-Za-z'-]*)$/.exec(value.slice(0, caret))
    const start = m ? caret - m[2].length - 1 : -1
    setQuery(m ? { start, text: m[2] } : null)
    setActive(0)
    const el = ref.current
    if (!m || !el) return
    /* The menu opens under the @, kept inside the box's width. */
    const at = caretPoint(el, start)
    const room = (el.parentElement?.clientWidth ?? el.clientWidth) - TAG_MENU_WIDTH
    setAnchor({
      top: el.offsetTop + at.top + 4,
      left: Math.max(0, Math.min(el.offsetLeft + at.left - 8, room)),
    })
  }

  function place(value: string, caret: number) {
    caretAfter.current = caret
    setDraft(value)
  }

  function pick(p: Person) {
    if (!query) return
    const caret = ref.current?.selectionStart ?? draft.length
    const name = tagName(people, p.id)
    place(
      `${draft.slice(0, query.start)}@${name} ${draft.slice(caret)}`,
      query.start + name.length + 2
    )
    setTagged((prev) => (prev.includes(p.id) ? prev : [...prev, p.id]))
    setQuery(null)
  }

  function post() {
    const text = draft.trim()
    if (!text) return
    onPost(
      text,
      tagged.filter((id) => text.includes(`@${tagName(people, id)}`))
    )
    setDraft("")
    setTagged([])
    setQuery(null)
  }

  return (
    <div className="flex gap-2.5">
      <PersonAvatar id={ME} people={people} />
      <div className="relative min-w-0 flex-1">
        <div className="overflow-hidden rounded-lg border bg-card focus-within:ring-2 focus-within:ring-ring/30">
          <Textarea
            ref={ref}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              readQuery(e.target.value, e.target.selectionStart)
            }}
            onKeyDown={(e) => {
              if (matches.length) {
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                  e.preventDefault()
                  const step = e.key === "ArrowDown" ? 1 : -1
                  setActive((i) => (i + step + matches.length) % matches.length)
                  return
                }
                if (e.key === "Enter" || e.key === "Tab") {
                  e.preventDefault()
                  pick(matches[active])
                  return
                }
                if (e.key === "Escape") {
                  e.preventDefault()
                  setQuery(null)
                  return
                }
              }
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) post()
            }}
            onBlur={() => setQuery(null)}
            rows={3}
            placeholder="Add a comment, type @ to tag someone"
            aria-label="Add a comment"
            aria-expanded={matches.length > 0}
            className="min-h-20 resize-none rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          <div className="flex items-center justify-end border-t bg-muted/60 p-1.5">
            <Button size="sm" disabled={!draft.trim()} onClick={post}>
              <IconSend />
              Comment
            </Button>
          </div>
        </div>

        {matches.length > 0 && (
          <ul
            ref={menuRef}
            role="listbox"
            aria-label="People to tag"
            style={{ top: anchor.top, left: anchor.left, width: TAG_MENU_WIDTH }}
            className="absolute z-20 flex flex-col rounded-xl border bg-popover p-1 shadow-lg"
          >
            {matches.map((p, i) => (
              <li key={p.id} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(p)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left",
                    i === active && "bg-surface-hover"
                  )}
                >
                  <PersonAvatar id={p.id} people={people} />
                  <span className="flex min-w-0 flex-1 flex-col leading-tight">
                    <span className="truncate font-medium text-foreground">
                      {tagName(people, p.id)}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {p.role}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/** Timeline and Comments, side by side as line tabs. */
function TaskActivity({ task: t, people }: { task: Task; people: People }) {
  const ACTIVITY_TAB =
    "h-9 flex-none gap-1.5 rounded-none px-0 font-medium text-muted-foreground " +
    "data-active:text-primary dark:data-active:text-primary-tint " +
    "group-data-horizontal/tabs:after:bottom-0 h-full"

  return (
    <Tabs defaultValue="timeline" className="gap-3">
      <TabsList variant="line" className="h-9! w-full justify-start gap-6 border-b p-0">
        <TabsTrigger value="timeline" className={ACTIVITY_TAB}>
          <IconHistory />
          Timeline
        </TabsTrigger>
        <TabsTrigger value="comments" className={ACTIVITY_TAB}>
          <IconComment />
          Comments
          {t.comments.length > 0 && (
            <span className="rounded-full bg-primary-surface px-1.5 text-xs leading-5 font-semibold text-primary tabular-nums">
              {t.comments.length}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="timeline">
        <ol className="flex flex-col">
          {t.events.map((e, i, list) => {
            const Icon = eventIcon(e.text)
            return (
              <li key={`${e.at}-${i}`} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-primary-surface text-primary">
                    <Icon className="size-3.5" />
                  </span>
                  {i < list.length - 1 && (
                    <span className="w-0.5 flex-1 bg-primary/15" />
                  )}
                </div>
                <div className="min-w-0 flex-1 pb-4">
                  <p className="text-sm leading-5">
                    <span className="font-medium text-foreground">
                      {people.name(e.by)}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {eventText(e.text, people)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                    {whenLabel(e.at)}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      </TabsContent>

      <TabsContent value="comments" className="flex flex-col gap-4">
        <CommentComposer
          people={people}
          onPost={(text, mentions) => {
            addTaskComment(t.id, text, mentions)
            if (mentions.length)
              toast.success("Comment added", {
                description: `${mentions.map((id) => tagName(people, id)).join(", ")} will be notified.`,
              })
          }}
        />

        <ul className="flex flex-col gap-4">
          {[...t.comments].reverse().map((c) => (
            <li key={c.id} className="flex gap-2.5">
              <PersonAvatar id={c.by} people={people} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="font-medium text-foreground">
                    {people.name(c.by)}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {whenLabel(c.at)}
                  </span>
                </p>
                <p className="mt-0.5 text-sm break-words whitespace-pre-line text-foreground/80">
                  <WithMentions
                    text={c.text}
                    names={c.mentions.map((id) => tagName(people, id))}
                  />
                </p>
              </div>
            </li>
          ))}
        </ul>
      </TabsContent>
    </Tabs>
  )
}

/** The open task, joined to the table's right edge (reference "Open" state). */
function TaskPanel({
  task: t,
  people,
  patientName,
  onClose,
}: {
  task: Task
  people: People
  patientName: (id: string) => string
  onClose: () => void
}) {
  const [picking, setPicking] = React.useState(false)
  const late = isOverdue(t)
  const next: { label: string; status: TaskStatus; icon: React.ReactNode } =
    t.status === "Completed"
      ? { label: "Reopen", status: "Reopened", icon: <IconUndo /> }
      : { label: "Mark completed", status: "Completed", icon: <IconCheck /> }

  return (
    <aside
      aria-label={`Task ${t.id}`}
      className={cn(
        "flex w-[354px] shrink-0 flex-col overflow-hidden rounded-r-md border-y border-r bg-surface-sunken text-sm",
        "max-lg:fixed max-lg:inset-y-0 max-lg:right-0 max-lg:z-40 max-lg:w-full max-lg:max-w-[354px] max-lg:rounded-none max-lg:border-l max-lg:shadow-xl"
      )}
    >
      <header className="flex h-9 shrink-0 items-center justify-between gap-2 border-b bg-surface-head pr-3 pl-4">
        <div className="flex min-w-0 items-center gap-2">
          <PriorityIcon priority={t.priority} />
          <span className="truncate font-medium text-primary-tint tabular-nums">
            {t.id}
          </span>
          <TaskStatusBadge status={t.status} />
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Close task"
          onClick={onClose}
        >
          <IconClose />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pt-4 pb-3 *:shrink-0">
        <h2 className="text-base leading-snug font-medium text-foreground">
          {t.title}
        </h2>

        <section className="flex flex-col gap-2">
          <h3 className="flex items-center gap-1.5 font-medium text-muted-foreground">
            <IconFileText className="size-4" />
            Description
          </h3>
          <p className="text-muted-foreground">{t.description}</p>
        </section>

        <div className="overflow-hidden rounded-xl border bg-card">
          <PanelRow icon={IconFolder} label="Type">
            {t.type}
          </PanelRow>
          <PanelRow icon={IconFlag} label="Priority">
            <Select
              items={TASK_PRIORITIES.map((p) => ({ label: p, value: p }))}
              value={t.priority}
              onValueChange={(v: string | null) =>
                v &&
                v !== t.priority &&
                setTaskPriority(t.id, v as TaskPriority)
              }
            >
              <SelectTrigger
                size="sm"
                className={INLINE_TRIGGER}
                aria-label="Priority"
              >
                <PriorityIcon priority={t.priority} />
                {t.priority}
              </SelectTrigger>
              <SelectContent
                align="start"
                alignItemWithTrigger={false}
                className={SOLID_MENU}
              >
                <SelectGroup>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem
                      key={p}
                      value={p}
                      className="not-data-[variant=destructive]:focus:**:text-inherit"
                    >
                      <PriorityIcon priority={p} />
                      {p}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </PanelRow>
          <PanelRow icon={IconUser} label="Assignee">
            <AssigneeSelect
              size="sm"
              value={t.assigneeId}
              people={people}
              open={picking}
              onOpenChange={setPicking}
              className={cn(INLINE_TRIGGER, "max-w-full")}
              onChange={(id) => {
                if (id === t.assigneeId) return
                reassignTask(t.id, id)
                toast.success("Task reassigned", {
                  description: `${t.id} now sits with ${people.name(id)}.`,
                })
              }}
            >
              <span className="truncate">{people.name(t.assigneeId)}</span>
            </AssigneeSelect>
          </PanelRow>
          <PanelRow icon={IconCalendar} label="Due">
            <span
              className="tabular-nums"
              style={late ? { color: OVERDUE } : undefined}
            >
              {whenLabel(t.due)}
            </span>
          </PanelRow>
          <PanelRow icon={IconUserCircle} label="Patient">
            {t.patientId ? (
              <Link
                href={`/screens/patients/${t.patientId}`}
                className="block truncate text-primary-tint hover:underline"
              >
                {patientName(t.patientId)}
              </Link>
            ) : (
              <span className="text-muted-foreground">No patient</span>
            )}
          </PanelRow>
          <PanelRow icon={IconClock} label="Created">
            <span className="tabular-nums">{whenLabel(t.createdAt)}</span>
          </PanelRow>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => setPicking(true)}>
            <IconSwitch />
            Reassign
          </Button>
          <Button
            variant={t.status === "Completed" ? "outline" : "default"}
            onClick={() => {
              setTaskStatus(t.id, next.status)
              toast.success(
                next.status === "Completed" ? "Task completed" : "Task reopened"
              )
            }}
          >
            {next.icon}
            {next.label}
          </Button>
        </div>

        <TaskActivity task={t} people={people} />
      </div>
    </aside>
  )
}

/* -------------------------------------------------------------------------- */
/*  Add task                                                                   */
/* -------------------------------------------------------------------------- */

const TIMES = Array.from({ length: 21 }, (_, i) => {
  const h = 8 + Math.floor(i / 2)
  const m = i % 2 ? "30" : "00"
  const value = `${String(h).padStart(2, "0")}:${m}`
  const label = `${h > 12 ? h - 12 : h}:${m} ${h >= 12 ? "PM" : "AM"}`
  return { value, label }
})

type Draft = {
  type: TaskType | ""
  priority: TaskPriority | ""
  assigneeId: string
  date: string
  time: string
  patientId: string
  title: string
  description: string
}

const emptyDraft = (): Draft => ({
  type: "",
  priority: "",
  assigneeId: "",
  date: NOW.slice(0, 10),
  time: "17:00",
  patientId: "",
  title: "",
  description: "",
})

function AddTaskDialog({
  open,
  people,
  onClose,
  onCreated,
}: {
  open: boolean
  people: People
  onClose: () => void
  onCreated: (task: Task) => void
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 rounded-xl p-0 sm:max-w-2xl">
        {open && (
          <AddTaskForm people={people} onClose={onClose} onCreated={onCreated} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function AddTaskForm({
  people,
  onClose,
  onCreated,
}: {
  people: People
  onClose: () => void
  onCreated: (task: Task) => void
}) {
  const pts = usePatientNames()
  const [d, setD] = React.useState<Draft>(emptyDraft)
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setD((prev) => ({ ...prev, [key]: value }))

  const patientLabel = (id: string) => {
    const p = pts.get(id)
    return p ? `${fullName(p)}, ${p.id}` : ""
  }
  const patientItems = pts.list.map((p) => `${fullName(p)}, ${p.id}`)

  const ready =
    d.type && d.priority && d.assigneeId && d.date && d.time && d.title.trim()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!ready) return
    const task = addTask({
      type: d.type as TaskType,
      priority: d.priority as TaskPriority,
      assigneeId: d.assigneeId,
      due: `${d.date}T${d.time}`,
      patientId: d.patientId,
      title: d.title.trim(),
      description: d.description.trim(),
    })
    onCreated(task)
  }

  return (
    <form noValidate onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <DialogHeader className="shrink-0 border-b px-6 py-4">
        <DialogTitle className="text-base font-semibold">Add task</DialogTitle>
        <DialogDescription className="sr-only">
          Create a task and assign it to someone on the care team.
        </DialogDescription>
      </DialogHeader>

      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-6 py-5 sm:grid-cols-2">
        <SelectField
          id="task-type"
          label="Task type"
          required
          options={TASK_TYPE_NAMES}
          value={d.type}
          onChange={(v) => set("type", v as TaskType)}
        />
        <SelectField
          id="task-priority"
          label="Priority"
          required
          options={TASK_PRIORITIES}
          value={d.priority}
          onChange={(v) => set("priority", v as TaskPriority)}
        />
        <Field>
          <FieldLabel htmlFor="task-assignee">
            Assignee
            <Required />
          </FieldLabel>
          <AssigneeSelect
            id="task-assignee"
            value={d.assigneeId}
            people={people}
            onChange={(id) => set("assigneeId", id)}
          />
        </Field>
        <div className="grid grid-cols-[minmax(0,1fr)_8rem] items-end gap-2">
          <DateField
            id="task-due"
            label="Due"
            required
            value={d.date}
            min={NOW.slice(0, 10)}
            onChange={(v) => set("date", v)}
          />
          <Select
            items={TIMES}
            value={d.time}
            onValueChange={(v: string | null) => v && set("time", v)}
          >
            <SelectTrigger className="w-full" aria-label="Due time">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {TIMES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="task-patient">Patient</FieldLabel>
          <Combobox
            items={patientItems}
            value={d.patientId ? patientLabel(d.patientId) : null}
            onValueChange={(v: string | null) =>
              set("patientId", v ? (v.split(", ").pop() ?? "") : "")
            }
          >
            <ComboboxInput
              id="task-patient"
              className="w-full"
              placeholder="Search by name or ID"
              showClear={!!d.patientId}
            />
            <ComboboxContent>
              <ComboboxEmpty>No matches</ComboboxEmpty>
              <ComboboxList>
                {(item: string) => (
                  <ComboboxItem key={item} value={item}>
                    {item}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </Field>
        <TextField
          id="task-title"
          label="Title"
          required
          className="sm:col-span-2"
          value={d.title}
          onChange={(e) => set("title", e.target.value)}
        />
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="task-description">Description</FieldLabel>
          <Textarea
            id="task-description"
            rows={4}
            placeholder="Type here..."
            value={d.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>
      </div>

      <DialogFooter className="mt-0 shrink-0 flex-row justify-end gap-2 border-t px-6 py-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!ready}>
          Add task
        </Button>
      </DialogFooter>
    </form>
  )
}
