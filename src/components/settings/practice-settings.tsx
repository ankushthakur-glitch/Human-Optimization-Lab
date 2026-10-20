"use client"

import * as React from "react"
import { toast } from "@/design-system/ui/sonner"
import {
  IconAdd,
  IconBriefcase,
  IconFlag,
  IconDrag,
  IconEdit,
  IconHistory,
  IconLock,
  IconLockOpen,
  IconMail,
  IconNotification,
  IconTrash,
  IconUpload,
  IconUsersGroup,
} from "@/design-system/icons"

import { cn } from "@/lib/utils"
import { SUBTLE } from "@/components/patient-dashboard/widgets/kit"
import { MultiSelectField, TextField } from "@/components/form-kit"
import { PersonCell, RowMenu } from "@/components/practice/directory"
import {
  PRACTICE,
  fullName,
  providerName,
  providers,
  usDate,
  users,
} from "@/components/practice/practice-data"
import { PracticeShell } from "@/components/practice/practice-shell"
import { PatientFlagsPage } from "@/components/settings/patient-flags"
import { RolesPage } from "@/components/settings/roles"
import { AuditLogPage } from "@/components/settings/audit-log"
import {
  ACTION_EVENTS,
  CHANNELS,
  type Employer,
  MATCH_ATTRIBUTES,
  NOTIFY_EVENTS,
  type InviteContact,
  SENDERS,
  employers,
  reminders,
} from "@/components/settings/settings-data"
import {
  ChoiceSelect,
  NumberInput,
  SettingsFrame,
  type SettingsGroup,
  SettingsHome,
  SettingsRoute,
  SettingsSection,
  SettingsTable,
  StatusDot,
  ValueCard,
  ValueRow,
  shown,
  useSettings,
} from "@/components/settings/settings-kit"
import { Button } from "@/design-system/ui/button"
import { Checkbox } from "@/design-system/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/design-system/ui/dialog"
import { DropdownMenuItem } from "@/design-system/ui/dropdown-menu"
import { Switch } from "@/design-system/ui/switch"
import { TableCell, TableRow } from "@/design-system/ui/table"
import { Textarea } from "@/design-system/ui/textarea"

/* The clinic manager's Settings: what a practice maintains for itself, per
   the "Practice Settings" tab of the settings scope sheet. Providers and
   users are managed in the Users module, so they are not repeated here. */

const BASE = "/screens/practice/settings"

const GROUPS: SettingsGroup[] = [
  {
    id: "people",
    title: "Providers and staff",
    icon: IconUsersGroup,
    pages: [
      {
        id: "roles",
        label: "Roles and permissions",
        render: () => <PracticeRoles />,
      },
      {
        id: "care-teams",
        label: "Care teams",
        status: "Open",
        render: () => <CareTeams />,
      },
    ],
  },
  {
    id: "patients",
    title: "Patients",
    icon: IconFlag,
    pages: [
      {
        id: "flags",
        label: "Patient flags",
        render: () => <PatientFlagsPage actor={PRACTICE.manager.name} />,
      },
    ],
  },
  {
    id: "employers",
    title: "Employer accounts",
    icon: IconBriefcase,
    pages: [
      { id: "list", label: "Employers", render: () => <Employers /> },
      {
        id: "matching",
        label: "Matching and reports",
        status: "Partly",
        render: () => <EmployerMatching />,
      },
    ],
  },
  {
    id: "invitations",
    title: "Patient invitation",
    icon: IconMail,
    pages: [
      { id: "channels", label: "Channels", render: () => <Channels /> },
      { id: "reminders", label: "Reminders", render: () => <Reminders /> },
    ],
  },
  {
    id: "alerts",
    title: "Alerts",
    icon: IconNotification,
    pages: [
      {
        id: "notifications",
        label: "Notifications",
        render: () => <Notifications />,
      },
      {
        id: "action-needed",
        label: "Action needed",
        status: "Open",
        render: () => <ActionNeeded />,
      },
    ],
  },
  {
    id: "security",
    title: "Security",
    icon: IconHistory,
    pages: [
      {
        id: "audit-log",
        label: "Audit log",
        render: () => <AuditLogPage scope="practice" />,
      },
    ],
  },
]

export function PracticeSettingsHome() {
  return (
    <PracticeShell active="settings">
      <SettingsHome base={BASE} groups={GROUPS} />
    </PracticeShell>
  )
}

export function PracticeSettingsPage({
  group,
  page,
}: {
  group: string
  page: string
}) {
  return (
    <PracticeShell active="settings">
      <SettingsRoute
        base={BASE}
        groups={GROUPS}
        groupId={group}
        pageId={page}
      />
    </PracticeShell>
  )
}

/* -------------------------------------------------------------------------- */
/*  Providers and staff                                                        */
/* -------------------------------------------------------------------------- */

/** The practice's roles and what each can open in the portal: add, edit,
    activate, deactivate and delete. People pick from these on the provider
    and user forms. */
function PracticeRoles() {
  const providerList = providers.use().items
  const staffList = users.use().items
  return (
    <RolesPage
      scope={{
        actor: PRACTICE.manager.name,
        manage: true,
        hidden: ["inlay-admin"],
        inUse: (name) =>
          providerList.filter((p) => p.role === name).length +
          staffList.filter((u) => u.role === name).length,
        onRename: (from, to) => {
          providerList
            .filter((p) => p.role === from)
            .forEach((p) => providers.patch(p.id, { role: to }))
          staffList
            .filter((u) => u.role === from)
            .forEach((u) => users.patch(u.id, { role: to }))
        },
      }}
    />
  )
}

/** Which providers each medical assistant supports: the same assignment
    the provider form sets, seen from the assistant's side. */
function CareTeams() {
  const providerList = providers
    .use()
    .items.filter((p) => p.status !== "Inactive")
  const staffList = users
    .use()
    .items.filter((u) => u.role === "Medical assistant")
  const names = providerList.map(providerName)
  const supportedBy = (uid: string) =>
    providerList
      .filter((p) => (p.assistantIds ?? []).includes(uid))
      .map(providerName)
  const [edits, setEdits] = React.useState<Record<string, string[]>>({})
  const dirty = Object.keys(edits).length > 0

  function save() {
    for (const p of providerList) {
      let ids = p.assistantIds ?? []
      for (const [uid, picked] of Object.entries(edits)) {
        const on = picked.includes(providerName(p))
        ids = on
          ? ids.includes(uid)
            ? ids
            : [...ids, uid]
          : ids.filter((x) => x !== uid)
      }
      if (ids !== (p.assistantIds ?? []))
        providers.patch(p.id, { assistantIds: ids })
    }
    setEdits({})
    toast.success("Settings saved")
  }

  const actions = (
    <div className="flex items-center gap-2">
      {dirty && (
        <Button variant="outline" size="sm" onClick={() => setEdits({})}>
          Discard
        </Button>
      )}
      <Button size="sm" disabled={!dirty} onClick={save}>
        Save
      </Button>
    </div>
  )

  return (
    <SettingsFrame action={actions}>
      <SettingsTable
        columns={[
          { header: "Medical assistant", className: "w-72" },
          { header: "Supports" },
        ]}
      >
        {staffList.map((member) => (
          <TableRow key={member.id}>
            <TableCell>
              <PersonCell
                name={fullName(member)}
                photo={member.photo}
                onOpen={() => {}}
              />
            </TableCell>
            <TableCell className="py-2">
              <MultiSelectField
                id={`team-${member.id}`}
                label={`Providers ${fullName(member)} supports`}
                options={names}
                value={edits[member.id] ?? supportedBy(member.id)}
                onChange={(next) =>
                  setEdits((all) => ({ ...all, [member.id]: next }))
                }
                placeholder="Select providers"
                className="[&>label]:sr-only"
              />
            </TableCell>
          </TableRow>
        ))}
      </SettingsTable>
    </SettingsFrame>
  )
}

/* -------------------------------------------------------------------------- */
/*  Employer accounts                                                          */
/* -------------------------------------------------------------------------- */

function Employers() {
  const { items } = employers.use()
  const [editing, setEditing] = React.useState<Employer | "new" | null>(null)
  const upload = React.useRef<HTMLInputElement>(null)
  const [uploadFor, setUploadFor] = React.useState<Employer | null>(null)

  return (
    <SettingsFrame
      action={
        <Button size="sm" onClick={() => setEditing("new")}>
          <IconAdd />
          Add employer
        </Button>
      }
    >
      <input
        ref={upload}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          event.target.value = ""
          if (!uploadFor) return
          employers.patch(uploadFor.id, {
            lastFile: new Date().toISOString().slice(0, 10),
          })
          toast.success(`${uploadFor.name} file uploaded`)
          setUploadFor(null)
        }}
      />
      <SettingsTable
        columns={[
          { header: "Employer" },
          { header: "Eligible", className: "w-24 text-right" },
          { header: "Matched", className: "w-24 text-right" },
          { header: "Last file", className: "hidden w-28 md:table-cell" },
          ...(shown("Partly")
            ? [{ header: "Reports", className: "w-24" }]
            : []),
          { header: "Status", className: "w-28" },
          { header: "", className: "w-12" },
        ]}
      >
        {items.map((employer) => (
          <TableRow key={employer.id}>
            <TableCell>
              <Button
                variant="link"
                className="h-auto p-0 font-medium text-foreground"
                onClick={() => setEditing(employer)}
              >
                {employer.name}
              </Button>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {employer.eligible.toLocaleString()}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {employer.matched.toLocaleString()}
            </TableCell>
            <TableCell className="hidden tabular-nums md:table-cell">
              {employer.lastFile ? usDate(employer.lastFile) : "None"}
            </TableCell>
            {shown("Partly") && (
              <TableCell>
                <Switch
                  size="sm"
                  checked={employer.reporting}
                  aria-label={`Reports for ${employer.name}`}
                  onCheckedChange={(reporting) =>
                    employers.patch(employer.id, { reporting })
                  }
                />
              </TableCell>
            )}
            <TableCell>
              <StatusDot
                tone={employer.status === "Active" ? "success" : "muted"}
              >
                {employer.status}
              </StatusDot>
            </TableCell>
            <TableCell className="text-right">
              <RowMenu label={`Actions for ${employer.name}`}>
                <DropdownMenuItem
                  onClick={() => {
                    setUploadFor(employer)
                    upload.current?.click()
                  }}
                >
                  <IconUpload />
                  Upload eligibility file
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditing(employer)}>
                  <IconEdit />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const status =
                      employer.status === "Active" ? "Inactive" : "Active"
                    employers.patch(employer.id, { status })
                    toast.success(
                      status === "Active"
                        ? `${employer.name} activated`
                        : `${employer.name} deactivated`
                    )
                  }}
                >
                  {employer.status === "Active" ? (
                    <IconLock />
                  ) : (
                    <IconLockOpen />
                  )}
                  {employer.status === "Active" ? "Deactivate" : "Activate"}
                </DropdownMenuItem>
              </RowMenu>
            </TableCell>
          </TableRow>
        ))}
      </SettingsTable>

      <Dialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
      >
        <DialogContent className="sm:max-w-md">
          {editing && (
            <EmployerForm
              employer={editing === "new" ? null : editing}
              count={items.length}
              onClose={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </SettingsFrame>
  )
}

function EmployerForm({
  employer,
  count,
  onClose,
}: {
  employer: Employer | null
  count: number
  onClose: () => void
}) {
  const [name, setName] = React.useState(employer?.name ?? "")
  const [error, setError] = React.useState("")
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) {
          setError("Enter the employer's name")
          return
        }
        if (employer) {
          employers.patch(employer.id, { name: name.trim() })
          toast.success("Employer updated")
        } else {
          employers.add([
            {
              id: `EM${String(count + 1).padStart(2, "0")}`,
              name: name.trim(),
              eligible: 0,
              matched: 0,
              lastFile: "",
              reporting: false,
              status: "Active",
            },
          ])
          toast.success("Employer added")
        }
        onClose()
      }}
    >
      <DialogHeader>
        <DialogTitle>{employer ? "Edit employer" : "Add employer"}</DialogTitle>
        <DialogDescription className="sr-only">
          The employer&apos;s name.
        </DialogDescription>
      </DialogHeader>
      <TextField
        id="employer-name"
        label="Employer name"
        required
        value={name}
        error={error}
        onChange={(e) => {
          setName(e.target.value)
          setError("")
        }}
      />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">
          {employer ? "Save changes" : "Add employer"}
        </Button>
      </DialogFooter>
    </form>
  )
}

function EmployerMatching() {
  const settings = useSettings("employer-matching", {
    attributes: MATCH_ATTRIBUTES,
    reportAll: false,
    threshold: 500,
  })
  const d = settings.draft
  return (
    <SettingsFrame action={settings.actions}>
      <SettingsSection title="Match employer files on">
        <SettingsTable
          columns={[
            { header: "Attribute" },
            { header: "Used", className: "w-28" },
          ]}
        >
          {d.attributes.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-medium">{a.name}</TableCell>
              <TableCell>
                <Switch
                  size="sm"
                  checked={a.on}
                  aria-label={`Match on ${a.name}`}
                  onCheckedChange={(on) =>
                    settings.patch({
                      attributes: d.attributes.map((x) =>
                        x.id === a.id ? { ...x, on } : x
                      ),
                    })
                  }
                />
              </TableCell>
            </TableRow>
          ))}
        </SettingsTable>
      </SettingsSection>
      <SettingsSection title="Reports">
        <ValueCard>
          <ValueRow label="Report every employer">
            <Switch
              checked={d.reportAll}
              aria-label="Report every employer"
              onCheckedChange={(reportAll) => settings.patch({ reportAll })}
            />
          </ValueRow>
          {!d.reportAll && (
            <ValueRow label="Report employers with at least">
              <NumberInput
                label="Minimum eligible patients"
                unit="eligible"
                value={d.threshold}
                onChange={(threshold) => settings.patch({ threshold })}
                className="w-44"
              />
            </ValueRow>
          )}
        </ValueCard>
      </SettingsSection>
    </SettingsFrame>
  )
}

/* -------------------------------------------------------------------------- */
/*  Patient invitation                                                         */
/* -------------------------------------------------------------------------- */

function Channels() {
  const settings = useSettings("invite-channels", {
    channels: CHANNELS,
    sender: SENDERS[0] as string,
  })
  const list = settings.draft.channels
  const [dragging, setDragging] = React.useState<string | null>(null)

  /* Drag a row onto another to take its place; the order is the order
     channels are tried in. */
  function moveTo(id: string, over: string) {
    if (id === over) return
    const from = list.findIndex((c) => c.id === id)
    const to = list.findIndex((c) => c.id === over)
    const next = [...list]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    settings.patch({ channels: next })
  }

  return (
    <SettingsFrame action={settings.actions}>
      <SettingsSection title="Channels">
        <SettingsTable
          columns={[
            { header: "", className: "w-10" },
            { header: "Order", className: "w-20" },
            { header: "Channel" },
            { header: "Used", className: "w-24" },
          ]}
        >
          {list.map((channel, i) => (
            <TableRow
              key={channel.id}
              draggable
              onDragStart={(e) => {
                setDragging(channel.id)
                e.dataTransfer.effectAllowed = "move"
              }}
              onDragOver={(e) => {
                e.preventDefault()
                if (dragging) moveTo(dragging, channel.id)
              }}
              onDragEnd={() => setDragging(null)}
              className={cn(
                "cursor-grab active:cursor-grabbing",
                dragging === channel.id && "bg-surface-selected opacity-70"
              )}
            >
              <TableCell className="text-muted-foreground">
                <IconDrag className="size-4" aria-hidden />
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {i + 1}
              </TableCell>
              <TableCell className="font-medium">{channel.name}</TableCell>
              <TableCell>
                <Switch
                  size="sm"
                  checked={channel.on}
                  aria-label={`Use ${channel.name}`}
                  onCheckedChange={(on) =>
                    settings.patch({
                      channels: list.map((c) =>
                        c.id === channel.id ? { ...c, on } : c
                      ),
                    })
                  }
                />
              </TableCell>
            </TableRow>
          ))}
        </SettingsTable>
      </SettingsSection>
      {shown("Open") && (
        <SettingsSection title="Sender">
          <ValueCard>
            <ValueRow label="Invitations are sent by">
              <ChoiceSelect
                label="Invitations are sent by"
                value={settings.draft.sender}
                options={SENDERS}
                onChange={(sender) => settings.patch({ sender })}
                className="w-60"
              />
            </ValueRow>
          </ValueCard>
        </SettingsSection>
      )}
    </SettingsFrame>
  )
}

const SMS_LIMIT = 160

/** The invitation and its reminders as a list; each goes out on every
    channel in use (see Channels). Adding or editing one opens its details:
    day, heading, message and whether it carries the decline link. */
function Reminders() {
  const { items } = reminders.use()
  const sorted = [...items].sort((a, b) => a.day - b.day)
  const [editing, setEditing] = React.useState<InviteContact | "new" | null>(
    null
  )
  const last = sorted[sorted.length - 1]
  const label = (c: InviteContact) => {
    const i = sorted.findIndex((x) => x.id === c.id)
    return i === 0 ? "Invitation" : `Reminder ${i}`
  }

  return (
    <SettingsFrame
      action={
        <Button size="sm" onClick={() => setEditing("new")}>
          <IconAdd />
          Add reminder
        </Button>
      }
    >
      <SettingsTable
        columns={[
          { header: "Contact", className: "w-36" },
          { header: "Day", className: "w-24" },
          { header: "Heading" },
          { header: "Decline link", className: "hidden w-32 md:table-cell" },
          { header: "Actions", className: "w-24 text-right" },
        ]}
      >
        {sorted.map((contact, i) => (
          <TableRow key={contact.id}>
            <TableCell>
              <Button
                variant="link"
                className="h-auto p-0 font-medium text-primary-tint"
                onClick={() => setEditing(contact)}
              >
                {label(contact)}
              </Button>
            </TableCell>
            <TableCell className="tabular-nums">Day {contact.day}</TableCell>
            <TableCell className="max-w-0 truncate text-foreground/80">
              {contact.heading}
            </TableCell>
            <TableCell className="hidden md:table-cell">
              {contact.decline ? (
                <StatusDot tone="success">Included</StatusDot>
              ) : (
                <span className="text-muted-foreground">No</span>
              )}
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit ${label(contact)}`}
                onClick={() => setEditing(contact)}
              >
                <IconEdit />
              </Button>
              {i > 0 && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete ${label(contact)}`}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    reminders.remove(contact.id)
                    toast.success(`${label(contact)} deleted`)
                  }}
                >
                  <IconTrash />
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </SettingsTable>

      <Dialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
      >
        <DialogContent className="sm:max-w-xl">
          {editing && (
            <ReminderForm
              contact={editing === "new" ? null : editing}
              title={
                editing === "new"
                  ? "Add reminder"
                  : `Edit ${label(editing).toLowerCase()}`
              }
              nextDay={(last?.day ?? 0) + 7}
              onClose={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </SettingsFrame>
  )
}

function ReminderForm({
  contact,
  title,
  nextDay,
  onClose,
}: {
  contact: InviteContact | null
  title: string
  nextDay: number
  onClose: () => void
}) {
  const [draft, setDraft] = React.useState<Omit<InviteContact, "id">>({
    day: contact?.day ?? nextDay,
    heading: contact?.heading ?? "",
    message: contact?.message ?? "",
    decline: contact?.decline ?? false,
  })
  const [error, setError] = React.useState("")
  const set = (changes: Partial<typeof draft>) =>
    setDraft((d) => ({ ...d, ...changes }))
  const over = draft.message.length > SMS_LIMIT

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!draft.message.trim()) {
      setError("Enter the message")
      return
    }
    /* Only one contact carries the decline link. */
    if (draft.decline)
      reminders
        .get()
        .filter((c) => c.decline && c.id !== contact?.id)
        .forEach((c) => reminders.patch(c.id, { decline: false }))
    if (contact) {
      reminders.patch(contact.id, draft)
      toast.success("Reminder updated")
    } else {
      reminders.add([{ ...draft, id: `r${Date.now()}` }])
      toast.success("Reminder added")
    }
    onClose()
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className="sr-only">
          When the reminder goes out and what it says.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Send on</span>
          <NumberInput
            label="Day"
            prefix="Day"
            value={draft.day}
            onChange={(day) => set({ day })}
            className="w-32"
          />
        </div>
        <label className="flex h-9 items-center gap-2 text-sm">
          <Checkbox
            checked={draft.decline}
            onCheckedChange={(on) => set({ decline: on === true })}
          />
          Include decline link
        </label>
      </div>
      <TextField
        id="reminder-heading"
        label="Heading"
        value={draft.heading}
        onChange={(e) => set({ heading: e.target.value })}
      />
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="reminder-message" className="text-sm font-medium">
            Message
          </label>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
            {over && (
              <span
                aria-hidden
                className="size-1.5 rounded-full"
                style={{ background: SUBTLE.red }}
              />
            )}
            {draft.message.length} of {SMS_LIMIT} characters
          </span>
        </div>
        <Textarea
          id="reminder-message"
          rows={4}
          value={draft.message}
          aria-invalid={error ? true : undefined}
          onChange={(e) => {
            set({ message: e.target.value })
            setError("")
          }}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">
          {contact ? "Save changes" : "Add reminder"}
        </Button>
      </DialogFooter>
    </form>
  )
}

/* -------------------------------------------------------------------------- */
/*  Alerts                                                                     */
/* -------------------------------------------------------------------------- */

type ChannelKey = "push" | "text" | "email"

/** What reaches the physician and on which channel, from the AGC
    "Provider Account > Notification" frame. */
function Notifications() {
  const settings = useSettings("notifications-v2", { groups: NOTIFY_EVENTS })
  const groups = settings.draft.groups

  function set(id: string, key: ChannelKey, on: boolean) {
    settings.patch({
      groups: groups.map((g) => ({
        ...g,
        items: g.items.map((item) =>
          item.id === id ? { ...item, [key]: on } : item
        ),
      })),
    })
  }

  const action = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => settings.patch({ groups: NOTIFY_EVENTS })}
      >
        Default
      </Button>
      {settings.actions}
    </div>
  )

  return (
    <SettingsFrame action={action}>
      {groups.map((group) => (
        <SettingsSection key={group.group} title={group.group}>
          <SettingsTable
            columns={[
              { header: "Event" },
              { header: "Push", className: "w-28" },
              { header: "Text", className: "w-28" },
              { header: "Email", className: "w-28" },
            ]}
          >
            {group.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                {(["push", "text", "email"] as const).map((key) => (
                  <TableCell key={key}>
                    <Checkbox
                      checked={item[key]}
                      aria-label={`${key} for ${item.name}`}
                      onCheckedChange={(on) => set(item.id, key, on === true)}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </SettingsTable>
        </SettingsSection>
      ))}
    </SettingsFrame>
  )
}

/** The events that put a patient on the Important updates card. */
function ActionNeeded() {
  const settings = useSettings("action-needed", { events: ACTION_EVENTS })
  const events = settings.draft.events
  return (
    <SettingsFrame action={settings.actions}>
      <SettingsSection title="Important updates">
        <SettingsTable
          columns={[
            { header: "Event" },
            { header: "Shown", className: "w-28" },
          ]}
        >
          {events.map((event) => (
            <TableRow key={event.id}>
              <TableCell className="font-medium">{event.name}</TableCell>
              <TableCell>
                <Switch
                  size="sm"
                  checked={event.on}
                  aria-label={`Show ${event.name}`}
                  onCheckedChange={(on) =>
                    settings.patch({
                      events: events.map((e) =>
                        e.id === event.id ? { ...e, on } : e
                      ),
                    })
                  }
                />
              </TableCell>
            </TableRow>
          ))}
        </SettingsTable>
      </SettingsSection>
    </SettingsFrame>
  )
}
