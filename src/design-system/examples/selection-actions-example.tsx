"use client"

import * as React from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Archive03Icon,
  Delete02Icon,
  Mail01Icon,
  Tag01Icon,
} from "@hugeicons/core-free-icons"

import { Example, ExampleWrapper } from "@/design-system/examples/example"
import {
  SelectionActions,
  SelectionActionsCount,
  SelectionActionsGroup,
  SelectionActionsSeparator,
} from "@/design-system/ui/selection-actions"
import { Button } from "@/design-system/ui/button"
import { Checkbox } from "@/design-system/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/ui/table"

const ROWS = [
  { id: "40921", name: "R. Álvarez", due: "41 days overdue" },
  { id: "38117", name: "J. Okafor", due: "Due in 4 days" },
  { id: "41550", name: "M. Lindqvist", due: "Scheduled" },
  { id: "37788", name: "S. Haddad", due: "66 days overdue" },
]

export default function SelectionActionsExample() {
  return (
    <ExampleWrapper>
      <SelectionOnTable />
      <SelectionStatic />
      <SelectionDestructive />
    </ExampleWrapper>
  )
}

function SelectionOnTable() {
  const [selected, setSelected] = React.useState<string[]>([])
  const allSelected = selected.length === ROWS.length

  const toggle = (id: string) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    )

  return (
    <Example title="Over a selection">
      <div className="flex w-full flex-col gap-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  aria-label="Select all"
                  checked={allSelected}
                  indeterminate={selected.length > 0 && !allSelected}
                  onCheckedChange={(checked) =>
                    setSelected(checked === true ? ROWS.map((r) => r.id) : [])
                  }
                />
              </TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Follow-up</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROWS.map((r) => (
              <TableRow
                key={r.id}
                data-selected={selected.includes(r.id) || undefined}
                className="data-selected:bg-surface-selected"
              >
                <TableCell>
                  <Checkbox
                    aria-label={`Select ${r.name}`}
                    checked={selected.includes(r.id)}
                    onCheckedChange={() => toggle(r.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-muted-foreground">{r.due}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {selected.length ? (
          <SelectionActions position="floating">
            <SelectionActionsCount count={selected.length} noun="patient" />
            <SelectionActionsSeparator />
            <SelectionActionsGroup>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toast(`Messaged ${selected.length}`)}
              >
                <HugeiconsIcon icon={Mail01Icon} data-icon="inline-start" />
                Message
              </Button>
              <Button variant="ghost" size="sm">
                <HugeiconsIcon icon={Tag01Icon} data-icon="inline-start" />
                Tag
              </Button>
            </SelectionActionsGroup>
            <SelectionActionsSeparator />
            <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
              Clear
            </Button>
          </SelectionActions>
        ) : (
          <p className="text-xs text-muted-foreground">
            Select a row to reveal the action bar.
          </p>
        )}
      </div>
    </Example>
  )
}

function SelectionStatic() {
  return (
    <Example title="Inline">
      <SelectionActions>
        <SelectionActionsCount count={1} noun="record" />
        <SelectionActionsSeparator />
        <SelectionActionsGroup>
          <Button variant="ghost" size="sm">
            <HugeiconsIcon icon={Archive03Icon} data-icon="inline-start" />
            Archive
          </Button>
          <Button variant="ghost" size="sm">
            Export
          </Button>
        </SelectionActionsGroup>
      </SelectionActions>
    </Example>
  )
}

function SelectionDestructive() {
  return (
    <Example title="With a destructive action">
      <SelectionActions>
        <SelectionActionsCount count={12} noun="draft" />
        <SelectionActionsSeparator />
        <SelectionActionsGroup>
          <Button variant="ghost" size="sm">
            Move
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => toast("12 drafts discarded")}
          >
            <HugeiconsIcon icon={Delete02Icon} data-icon="inline-start" />
            Discard
          </Button>
        </SelectionActionsGroup>
      </SelectionActions>
    </Example>
  )
}
