"use client"

import * as React from "react"
import { toast } from "@/design-system/ui/sonner"
import { IconAdd, IconEdit, IconNote, IconTrash } from "@/design-system/icons"

import { cn } from "@/lib/utils"
import { createCollection, today } from "@/components/practice/collection-store"
import { type Patient, usDate } from "@/components/practice/practice-data"
import { ME } from "@/components/provider/chart-epic"
import {
  Section,
  SectionBar,
  SectionBody,
} from "@/components/provider/chart-layout"
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
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/design-system/ui/empty"
import { Textarea } from "@/design-system/ui/textarea"

/* Sticky notes, as in the Solid EHR chart: short reminders the care team
   leaves on a patient (not clinical data, never sent to the EHR). The
   newest one rides on the banner so it is seen on every section; the
   Sticky notes section lists them all, newest first. */

export type StickyNote = {
  id: string
  patientId: string
  text: string
  /** Local "2026-10-20T09:12". */
  at: string
  by: string
  editedAt?: string
}

const SEED: StickyNote[] = [
  {
    id: "SN-1005",
    patientId: "P10240",
    text: "Intake form not filled at the last visit. Please check while scheduling.",
    at: "2026-10-18T09:40",
    by: "Dr. Daniel Reyes",
  },
  {
    id: "SN-1004",
    patientId: "P10240",
    text: "Reported new fatigue during the last visit. Consider updating the care plan.",
    at: "2026-10-14T15:05",
    by: "Dr. Daniel Reyes",
  },
  {
    id: "SN-1003",
    patientId: "P10240",
    text: "Prefers morning appointments and text reminders.",
    at: "2026-10-09T11:20",
    by: "Rachel Kim, MA",
  },
]

export const stickyNotes = createCollection<StickyNote>(
  "hol-sticky-notes",
  SEED,
  "v1"
)

function nowLocal() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${today()}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** "10/18/2026, 9:40 AM". */
function when(at: string) {
  const [date, time = "00:00"] = at.split("T")
  const [h, m] = time.split(":").map(Number)
  return `${usDate(date)}, ${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`
}

/** The patient's notes, newest first. */
export function useStickyNotes(patientId: string) {
  const { items } = stickyNotes.use()
  return React.useMemo(
    () =>
      items
        .filter((n) => n.patientId === patientId)
        .sort((a, b) => b.at.localeCompare(a.at)),
    [items, patientId]
  )
}

/* -------------------------------------------------------------------------- */
/*  Add or edit                                                                */
/* -------------------------------------------------------------------------- */

const MAX = 300

/** Opens the add or edit dialog from anywhere in the chart. */
export function useStickyNoteDialog(patient: Patient) {
  const [state, setState] = React.useState<{
    open: boolean
    note?: StickyNote
  }>({ open: false })

  const dialog = (
    <StickyNoteDialog
      key={state.open ? (state.note?.id ?? "new") : "closed"}
      open={state.open}
      note={state.note}
      onOpenChange={(open) => setState((s) => ({ ...s, open }))}
      onSave={(text) => {
        if (state.note) {
          stickyNotes.patch(state.note.id, { text, editedAt: nowLocal() })
          toast.success("Sticky note updated")
        } else {
          stickyNotes.add([
            {
              id: `SN-${Date.now()}`,
              patientId: patient.id,
              text,
              at: nowLocal(),
              by: ME,
            },
          ])
          toast.success("Sticky note added")
        }
        setState({ open: false })
      }}
    />
  )

  return {
    add: () => setState({ open: true }),
    edit: (note: StickyNote) => setState({ open: true, note }),
    dialog,
  }
}

function StickyNoteDialog({
  open,
  note,
  onOpenChange,
  onSave,
}: {
  open: boolean
  note?: StickyNote
  onOpenChange: (open: boolean) => void
  onSave: (text: string) => void
}) {
  const [text, setText] = React.useState(note?.text ?? "")
  const value = text.trim().replace(/\s+/g, " ")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{note ? "Edit sticky note" : "Add sticky note"}</DialogTitle>
          <DialogDescription className="sr-only">
            A short reminder for the care team, shown on the patient banner.
          </DialogDescription>
        </DialogHeader>
        <form
          id="sticky-note-form"
          className="flex flex-col gap-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            if (value) onSave(value)
          }}
        >
          <label htmlFor="sticky-note" className="text-sm font-medium">
            Note
          </label>
          <Textarea
            id="sticky-note"
            autoFocus
            rows={4}
            maxLength={MAX}
            value={text}
            placeholder="Type a reminder for the care team"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && value)
                onSave(value)
            }}
          />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="sticky-note-form" disabled={!value}>
            {note ? "Save" : "Add note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* -------------------------------------------------------------------------- */
/*  Banner card                                                                */
/* -------------------------------------------------------------------------- */

/* The newest note on a soft amber card, as Solid EHR's banner shows it,
   with a plus to add another. Clicking the note opens the section. */
export function StickyNoteCard({
  patient,
  collapsed,
  onOpen,
}: {
  patient: Patient
  collapsed: boolean
  onOpen: () => void
}) {
  const notes = useStickyNotes(patient.id)
  const { add, dialog } = useStickyNoteDialog(patient)
  const latest = notes[0]

  return (
    <div
      className={cn(
        "flex w-[280px] min-w-0 items-start gap-2 rounded-md border border-amber-200/80 bg-amber-50 px-3 dark:border-amber-500/25 dark:bg-amber-500/10 max-xl:w-[220px]",
        collapsed ? "py-1.5" : "py-2"
      )}
    >
      <button
        type="button"
        onClick={latest ? onOpen : add}
        className="flex min-w-0 flex-1 flex-col gap-0.5 text-left"
      >
        <span className="flex items-center gap-1.5 text-xs leading-4 text-amber-900/70 dark:text-amber-200/70">
          <IconNote className="size-3.5 shrink-0" />
          Sticky note
          {notes.length > 1 && (
            <span className="tabular-nums">({notes.length})</span>
          )}
        </span>
        <span
          title={latest?.text}
          className={cn(
            "text-[13px] leading-5 font-medium text-amber-950/85 dark:text-amber-100/90",
            collapsed ? "truncate" : "line-clamp-2"
          )}
        >
          {latest ? latest.text : "No notes yet"}
        </span>
      </button>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={add}
        aria-label="Add sticky note"
        className="text-amber-900/70 hover:bg-amber-100 hover:text-amber-950 dark:text-amber-200/80 dark:hover:bg-amber-500/15"
      >
        <IconAdd />
      </Button>
      {dialog}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Section                                                                    */
/* -------------------------------------------------------------------------- */

export function StickyNotesView({ patient }: { patient: Patient }) {
  const notes = useStickyNotes(patient.id)
  const { add, edit, dialog } = useStickyNoteDialog(patient)

  function remove(note: StickyNote) {
    stickyNotes.remove(note.id)
    toast.success("Sticky note deleted", {
      action: { label: "Undo", onClick: () => stickyNotes.add([note]) },
    })
  }

  return (
    <Section>
      <SectionBar
        title={`Sticky notes${notes.length ? ` (${notes.length})` : ""}`}
        actions={
          <Button size="sm" onClick={add}>
            <IconAdd />
            Add note
          </Button>
        }
      />
      <SectionBody>
        {notes.length ? (
          <ul className="flex flex-col gap-2">
            {notes.map((n) => (
              <li
                key={n.id}
                className="group flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-xs text-muted-foreground">
                    {when(n.at)} · {n.by}
                    {n.editedAt && ` · Edited ${when(n.editedAt)}`}
                  </span>
                  <p className="text-sm leading-5 whitespace-pre-wrap text-foreground/90">
                    {n.text}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Edit note"
                    onClick={() => edit(n)}
                  >
                    <IconEdit />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete note"
                    onClick={() => remove(n)}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <IconTrash />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconNote />
              </EmptyMedia>
              <EmptyTitle>No sticky notes</EmptyTitle>
              <EmptyDescription>
                Leave a reminder for the care team. The newest one shows on the
                patient banner.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button size="sm" onClick={add}>
                <IconAdd />
                Add note
              </Button>
            </EmptyContent>
          </Empty>
        )}
      </SectionBody>
      {dialog}
    </Section>
  )
}
