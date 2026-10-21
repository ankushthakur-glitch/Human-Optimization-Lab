"use client"

import * as React from "react"
import { toast } from "@/design-system/ui/sonner"
import {
  IconAdd,
  IconEdit,
  IconEye,
  IconLock,
  IconLockOpen,
  IconSearch,
  IconTrash,
} from "@/design-system/icons"

import { TextField } from "@/components/form-kit"
import { NAME_LINK, RowMenu } from "@/components/practice/directory"
import { usDate } from "@/components/practice/practice-data"
import {
  SettingsFrame,
  SettingsTable,
  StatusDot,
  shown,
} from "@/components/settings/settings-kit"
import {
  ALL_PERMISSIONS,
  PERMISSION_GROUPS,
  type Role,
  roles,
} from "@/components/settings/settings-data"
import { Button } from "@/design-system/ui/button"
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/design-system/ui/input-group"

/* Roles and permissions, from the Solid EHR "Roles & Permissions" frames:
   the role list, then Add, View and Edit in one dialog whose permissions sit
   in tables by area with a switch each. The platform's standard roles can
   be edited but not deleted. */

/** What a console may do with roles, and who it signs changes as. */
export type RolesScope = {
  actor: string
  /** Add, deactivate and delete, as well as edit. */
  manage: boolean
  /** Roles this console never lists, e.g. the platform's own. */
  hidden?: string[]
  /** How many people hold a role, so one in use is not deleted. */
  inUse?: (name: string) => number
  /** Keeps people on a renamed role. */
  onRename?: (from: string, to: string) => void
}

const ADMIN_SCOPE: RolesScope = { actor: "Maya Chen", manage: shown("Open") }
const today = () => new Date().toISOString().slice(0, 10)

type Mode = { kind: "add" } | { kind: "view" | "edit"; role: Role }

export function RolesPage({ scope = ADMIN_SCOPE }: { scope?: RolesScope }) {
  const items = roles.use().items.filter((r) => !scope.hidden?.includes(r.id))
  const [query, setQuery] = React.useState("")
  const [mode, setMode] = React.useState<Mode | null>(null)

  const q = query.trim().toLowerCase()
  const rows = q
    ? items.filter((r) =>
        `${r.name} ${r.description}`.toLowerCase().includes(q)
      )
    : items

  const action = (
    <div className="flex items-center gap-2">
      <InputGroup className="w-56">
        <InputGroupAddon>
          <IconSearch />
        </InputGroupAddon>
        <InputGroupInput
          placeholder="Search"
          aria-label="Search roles"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </InputGroup>
      {/* Creating, deactivating and deleting roles is still open. */}
      {scope.manage && (
        <Button size="sm" onClick={() => setMode({ kind: "add" })}>
          <IconAdd />
          Add role
        </Button>
      )}
    </div>
  )

  return (
    <SettingsFrame action={action}>
      <SettingsTable
        columns={[
          { header: "Role name", className: "w-48" },
          { header: "Description" },
          { header: "Permissions", className: "hidden lg:table-cell" },
          { header: "Created by", className: "hidden md:table-cell" },
          { header: "Created on", className: "hidden md:table-cell" },
          { header: "Updated by", className: "hidden xl:table-cell" },
          { header: "Updated on", className: "hidden xl:table-cell" },
          { header: "Status" },
          { header: "Actions", className: "w-16 text-right" },
        ]}
      >
        {rows.map((role) => (
          <TableRow key={role.id}>
            <TableCell>
              <Button
                variant="link"
                className={`${NAME_LINK} font-medium text-primary-tint`}
                onClick={() => setMode({ kind: "view", role })}
              >
                {role.name}
              </Button>
            </TableCell>
            <TableCell className="max-w-96 truncate text-foreground/80">
              {role.description}
            </TableCell>
            <TableCell className="hidden text-muted-foreground tabular-nums lg:table-cell">
              {role.permissions.length} of {ALL_PERMISSIONS.length}
            </TableCell>
            <TableCell className="hidden md:table-cell">
              {role.createdBy}
            </TableCell>
            <TableCell className="hidden tabular-nums md:table-cell">
              {usDate(role.createdOn)}
            </TableCell>
            <TableCell className="hidden xl:table-cell">
              {role.updatedBy || "None"}
            </TableCell>
            <TableCell className="hidden tabular-nums xl:table-cell">
              {role.updatedOn ? usDate(role.updatedOn) : "None"}
            </TableCell>
            <TableCell>
              <StatusDot tone={role.status === "Active" ? "success" : "muted"}>
                {role.status}
              </StatusDot>
            </TableCell>
            <TableCell className="text-right">
              <RowMenu label={`Actions for ${role.name}`}>
                <DropdownMenuItem
                  onClick={() => setMode({ kind: "view", role })}
                >
                  <IconEye />
                  View
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setMode({ kind: "edit", role })}
                >
                  <IconEdit />
                  Edit
                </DropdownMenuItem>
                {scope.manage && role.id !== "inlay-admin" && (
                  <DropdownMenuItem
                    onClick={() => {
                      const status =
                        role.status === "Active" ? "Inactive" : "Active"
                      roles.patch(role.id, { status })
                      toast.success(
                        status === "Active"
                          ? `${role.name} activated`
                          : `${role.name} deactivated`
                      )
                    }}
                  >
                    {role.status === "Active" ? <IconLock /> : <IconLockOpen />}
                    {role.status === "Active" ? "Deactivate" : "Activate"}
                  </DropdownMenuItem>
                )}
                {scope.manage && role.id !== "inlay-admin" && (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      const holders = scope.inUse?.(role.name) ?? 0
                      if (holders > 0) {
                        toast.error(
                          holders === 1
                            ? `1 person has ${role.name}. Give them another role first.`
                            : `${holders} people have ${role.name}. Give them another role first.`
                        )
                        return
                      }
                      roles.remove(role.id)
                      toast.success(`${role.name} deleted`)
                    }}
                  >
                    <IconTrash />
                    Delete
                  </DropdownMenuItem>
                )}
              </RowMenu>
            </TableCell>
          </TableRow>
        ))}
      </SettingsTable>

      <Dialog open={mode !== null} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-3xl">
          {mode && (
            <RoleForm
              key={mode.kind === "add" ? "add" : `${mode.kind}-${mode.role.id}`}
              mode={mode}
              scope={scope}
              onEdit={(role) => setMode({ kind: "edit", role })}
              onClose={() => setMode(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </SettingsFrame>
  )
}

function RoleForm({
  mode,
  scope,
  onEdit,
  onClose,
}: {
  mode: Mode
  scope: RolesScope
  onEdit: (role: Role) => void
  onClose: () => void
}) {
  const role = mode.kind === "add" ? null : mode.role
  const readOnly = mode.kind === "view"
  const [name, setName] = React.useState(role?.name ?? "")
  const [description, setDescription] = React.useState(role?.description ?? "")
  const [granted, setGranted] = React.useState<string[]>(
    role?.permissions ?? []
  )
  const [error, setError] = React.useState("")

  function toggle(id: string, on: boolean) {
    setGranted((current) =>
      on ? [...current, id] : current.filter((p) => p !== id)
    )
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setError("Enter a role name")
      return
    }
    if (role) {
      roles.patch(role.id, {
        name: name.trim(),
        description: description.trim(),
        permissions: granted,
        updatedBy: scope.actor,
        updatedOn: today(),
      })
      if (role.name !== name.trim()) scope.onRename?.(role.name, name.trim())
      toast.success("Role updated")
    } else {
      roles.add([
        {
          id: `role-${Date.now()}`,
          name: name.trim(),
          description: description.trim(),
          permissions: granted,
          system: false,
          createdBy: scope.actor,
          createdOn: today(),
          updatedBy: "",
          updatedOn: "",
          status: "Active",
        },
      ])
      toast.success("Role added")
    }
    onClose()
  }

  const title =
    mode.kind === "add"
      ? "Add role"
      : mode.kind === "edit"
        ? "Edit role"
        : "View role"

  return (
    <form onSubmit={submit} noValidate className="flex max-h-[90vh] flex-col">
      <DialogHeader className="border-b px-5 py-4">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className="sr-only">
          The role&apos;s name and what it is allowed to do.
        </DialogDescription>
      </DialogHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
          <TextField
            id="role-name"
            label="Role name"
            required
            value={name}
            readOnly={readOnly}
            error={error}
            onChange={(e) => {
              setName(e.target.value)
              setError("")
            }}
          />
          <TextField
            id="role-description"
            label="Description"
            value={description}
            readOnly={readOnly}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {PERMISSION_GROUPS.map((group) => (
          <section key={group.title} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">{group.title}</h3>
            <SettingsTable
              columns={[
                { header: "Permission", className: "w-56" },
                { header: "Description" },
                { header: "Allowed", className: "w-24" },
              ]}
            >
              {group.items.map((permission) => {
                const on = granted.includes(permission.id)
                return (
                  <TableRow key={permission.id}>
                    <TableCell className="font-medium">
                      {permission.name}
                    </TableCell>
                    <TableCell className="text-foreground/80">
                      {permission.description}
                    </TableCell>
                    <TableCell>
                      <Switch
                        size="sm"
                        checked={on}
                        disabled={readOnly}
                        aria-label={`Allow ${permission.name}`}
                        onCheckedChange={(next) => toggle(permission.id, next)}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </SettingsTable>
          </section>
        ))}
      </div>

      <DialogFooter className="mx-0 mb-0 flex-row justify-end gap-2 border-t px-5 py-3">
        <Button type="button" variant="outline" onClick={onClose}>
          {readOnly ? "Close" : "Cancel"}
        </Button>
        {readOnly && role ? (
          <Button type="button" onClick={() => onEdit(role)}>
            <IconEdit />
            Edit role
          </Button>
        ) : (
          <Button type="submit">{role ? "Save changes" : "Add role"}</Button>
        )}
      </DialogFooter>
    </form>
  )
}
