"use client"

import * as React from "react"
import { toast } from "@/design-system/ui/sonner"
import {
  IconAdd,
  IconCheck,
  IconEdit,
  IconSearch,
  IconTrash,
} from "@/design-system/icons"

import { cn } from "@/lib/utils"
import { TextField } from "@/components/form-kit"
import { usDate } from "@/components/practice/practice-data"
import {
  FLAG_COLORS,
  type PatientFlag,
  patientFlags,
} from "@/components/settings/settings-data"
import {
  SettingsFrame,
  SettingsTable,
} from "@/components/settings/settings-kit"
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
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/design-system/ui/input-group"
import { TableCell, TableRow } from "@/design-system/ui/table"

/* Patient flags, from the Solid EHR "Provider Account > Patient Flags"
   frames, with ready-made flags to start from. Shared by the provider's
   and the clinic manager's Settings. */

/* -------------------------------------------------------------------------- */
/*  Patient flags                                                              */
/* -------------------------------------------------------------------------- */

const today = () => new Date().toISOString().slice(0, 10)

/** The flag list with add, edit and delete; `actor` signs new flags. */
export function PatientFlagsPage({ actor }: { actor: string }) {
  const { items } = patientFlags.use()
  const [query, setQuery] = React.useState("")
  const [editing, setEditing] = React.useState<PatientFlag | "new" | null>(null)
  const q = query.trim().toLowerCase()
  const rows = q ? items.filter((f) => f.name.toLowerCase().includes(q)) : items

  const action = (
    <div className="flex items-center gap-2">
      <InputGroup className="w-56">
        <InputGroupAddon>
          <IconSearch />
        </InputGroupAddon>
        <InputGroupInput
          placeholder="Search"
          aria-label="Search flags"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </InputGroup>
      <Button size="sm" onClick={() => setEditing("new")}>
        <IconAdd />
        Add patient flag
      </Button>
    </div>
  )

  return (
    <SettingsFrame action={action}>
      <SettingsTable
        columns={[
          { header: "Flag name" },
          { header: "Colour", className: "w-32" },
          { header: "Created by", className: "hidden md:table-cell" },
          { header: "Created on", className: "hidden w-32 md:table-cell" },
          { header: "Updated on", className: "hidden w-32 lg:table-cell" },
          { header: "Actions", className: "w-24 text-right" },
        ]}
      >
        {rows.map((flag) => (
          <TableRow key={flag.id}>
            <TableCell className="font-medium">{flag.name}</TableCell>
            <TableCell>
              <span
                aria-label={`Colour ${flag.color}`}
                className="block h-5 w-10 rounded"
                style={{ background: flag.color }}
              />
            </TableCell>
            <TableCell className="hidden text-foreground/80 md:table-cell">
              {flag.createdBy}
            </TableCell>
            <TableCell className="hidden tabular-nums md:table-cell">
              {usDate(flag.createdOn)}
            </TableCell>
            <TableCell className="hidden tabular-nums lg:table-cell">
              {usDate(flag.updatedOn)}
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit ${flag.name}`}
                onClick={() => setEditing(flag)}
              >
                <IconEdit />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete ${flag.name}`}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  patientFlags.remove(flag.id)
                  toast.success(`${flag.name} deleted`)
                }}
              >
                <IconTrash />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </SettingsTable>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="sm:max-w-md">
          {editing && (
            <FlagForm
              flag={editing === "new" ? null : editing}
              count={items.length}
              actor={actor}
              onClose={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </SettingsFrame>
  )
}

function FlagForm({
  flag,
  count,
  actor,
  onClose,
}: {
  flag: PatientFlag | null
  count: number
  actor: string
  onClose: () => void
}) {
  const [name, setName] = React.useState(flag?.name ?? "")
  const [color, setColor] = React.useState(flag?.color ?? FLAG_COLORS[0])
  const [error, setError] = React.useState("")
  const custom = !FLAG_COLORS.includes(color.toUpperCase())

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setError("Enter the flag's name")
      return
    }
    if (flag) {
      patientFlags.patch(flag.id, {
        name: name.trim(),
        color,
        updatedOn: today(),
      })
      toast.success("Patient flag updated")
    } else {
      patientFlags.add([
        {
          id: `FL${String(count + 1).padStart(3, "0")}-${Date.now()}`,
          name: name.trim(),
          color,
          createdBy: actor,
          createdOn: today(),
          updatedOn: today(),
        },
      ])
      toast.success("Patient flag added")
    }
    onClose()
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>
          {flag ? "Edit patient flag" : "Add patient flag"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          The flag&apos;s name and colour.
        </DialogDescription>
      </DialogHeader>
      <TextField
        id="flag-name"
        label="Flag name"
        required
        value={name}
        error={error}
        onChange={(e) => {
          setName(e.target.value)
          setError("")
        }}
      />
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Flag colour</legend>
        <div className="flex flex-wrap gap-2">
          {FLAG_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Colour ${c}`}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              className={cn(
                "flex size-8 items-center justify-center rounded-md text-white ring-offset-2 ring-offset-background transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-ring",
                color === c && "ring-2 ring-foreground/70"
              )}
              style={{ background: c }}
            >
              {color === c && <IconCheck className="size-4" />}
            </button>
          ))}
          {/* Any other colour, from the system colour picker. */}
          <label
            className={cn(
              "relative flex size-8 cursor-pointer items-center justify-center rounded-md text-white ring-offset-2 ring-offset-background transition-shadow focus-within:ring-2 focus-within:ring-ring",
              custom && "ring-2 ring-foreground/70"
            )}
            style={{
              background: custom
                ? color
                : "conic-gradient(#DE6F68, #E3C04F, #5FB386, #6E9CE8, #9C86E6, #D97BB6, #DE6F68)",
            }}
          >
            <input
              type="color"
              aria-label="Custom colour"
              value={color}
              onChange={(e) => setColor(e.target.value.toUpperCase())}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
            />
            {custom ? (
              <IconCheck className="size-4" />
            ) : (
              <IconAdd className="size-4 drop-shadow" />
            )}
          </label>
        </div>
        {custom && (
          <TextField
            id="flag-hex"
            label="Custom colour"
            value={color}
            onChange={(e) => {
              const v = e.target.value.trim()
              setColor(v.startsWith("#") ? v : `#${v}`)
            }}
            className="mt-2 w-40"
          />
        )}
      </fieldset>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">
          {flag ? "Save changes" : "Add patient flag"}
        </Button>
      </DialogFooter>
    </form>
  )
}
