"use client"

import * as React from "react"
import { toast } from "@/design-system/ui/sonner"
import {
  IconEdit,
  IconEye,
  IconLock,
  IconLockOpen,
  IconMail,
  IconUserAdd,
} from "@/design-system/icons"

import {
  EMAIL,
  type Errors,
  VALIDATE,
  MultiSelectField,
  SelectField,
  TextField,
  digits,
  focusFirstError,
  formatPhone,
} from "@/components/form-kit"
import {
  BulkResend,
  Directory,
  ID_CELL,
  PersonCell,
  RowMenu,
  StatusBadge,
  useNewParam,
  type Column,
} from "@/components/practice/directory"
import {
  type PersonStatus,
  type StaffUser,
  type StaffUserInput,
  fullName,
  inviteUser,
  shortDate,
  useLocationLookup,
  users,
} from "@/components/practice/practice-data"
import {
  DetailGrid,
  PhotoField,
  ProfileAvatar,
} from "@/components/practice/record-page"
import {
  DeactivateDialog,
  FormFooter,
  SideSheet,
  SideSheetHeader,
  ViewBody,
} from "@/components/practice/sheets"
import { Badge } from "@/design-system/ui/badge"
import { DropdownMenuItem } from "@/design-system/ui/dropdown-menu"
import { useAccessRoles } from "@/components/settings/settings-data"

/* Non-clinical users: each has one role, from Roles and permissions.
   Add, view and edit open in the right-hand panel, as in the reference. */

const EMPTY: StaffUserInput = {
  firstName: "",
  lastName: "",
  role: "",
  email: "",
  phone: "",
  locationIds: [],
  photo: "",
}

const roleOf = (u: StaffUser) => u.role

function validate(v: StaffUserInput, others: StaffUser[]): Errors {
  const e: Errors = {}
  if (!VALIDATE) return e
  if (!v.firstName.trim()) e.firstName = "Enter a first name."
  if (!v.lastName.trim()) e.lastName = "Enter a last name."
  if (!v.role) e.role = "Select a role."
  if (v.phone && digits(v.phone).length !== 10) e.phone = "Enter 10 digits."
  if (!v.email.trim()) e.email = "Enter their email."
  else if (!EMAIL.test(v.email.trim())) e.email = "Enter a valid email address."
  else if (
    others.some((u) => u.email.toLowerCase() === v.email.trim().toLowerCase())
  )
    e.email = "Another user has this email."
  if (v.locationIds.length === 0)
    e.locationIds = "Select at least one location."
  return e
}

/* -------------------------------------------------------------------------- */
/*  Add / edit                                                                 */
/* -------------------------------------------------------------------------- */

function UserForm({ user, onDone }: { user?: StaffUser; onDone: () => void }) {
  const { items } = users.use()
  const loc = useLocationLookup()
  const accessRoles = useAccessRoles()
  const [values, setValues] = React.useState<StaffUserInput>(() =>
    user ? { ...user } : EMPTY
  )
  /* Status moves between Active and Inactive; a pending invite becomes
     Active only when the person accepts it. */
  const [status, setStatus] = React.useState<PersonStatus>(
    user?.status ?? "Invited"
  )
  const [attempted, setAttempted] = React.useState(false)
  const others = items.filter((u) => u.id !== user?.id)
  const errors = attempted ? validate(values, others) : {}

  const set =
    <K extends keyof StaffUserInput>(key: K) =>
    (value: StaffUserInput[K]) =>
      setValues((prev) => ({ ...prev, [key]: value }))

  const locationOptions = loc.all.filter(
    (l) => l.status === "Active" || values.locationIds.includes(l.id)
  )

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAttempted(true)
    const found = validate(values, others)
    if (focusFirstError(found, "user")) return
    const clean = {
      ...values,
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
    }
    if (user) {
      users.patch(user.id, { ...clean, status })
      toast.success("User updated", { description: fullName(clean) })
    } else {
      inviteUser(clean)
      toast.success("Invite sent", {
        description: `${fullName(clean)} will get an email to set up their account.`,
      })
    }
    onDone()
  }

  return (
    <>
      <SideSheetHeader
        title={user ? "Edit user" : "Add user"}
        description="The user's name, role, contact and locations."
      />
      <form
        id="user-form"
        noValidate
        onSubmit={submit}
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6"
      >
        {user && (
          <div className="flex min-h-11 items-end justify-end gap-4">
            {user.status !== "Invited" ? (
              <SelectField
                id="user-status"
                label="Status"
                className="w-36"
                options={["Active", "Inactive"]}
                value={status}
                onChange={(v) => setStatus((v || "Active") as PersonStatus)}
              />
            ) : (
              <Badge variant="warning">Invite pending</Badge>
            )}
          </div>
        )}

        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-3">
          <TextField
            id="user-firstName"
            label="First name"
            required
            value={values.firstName}
            onChange={(e) => set("firstName")(e.target.value)}
            error={errors.firstName}
          />
          <TextField
            id="user-lastName"
            label="Last name"
            required
            value={values.lastName}
            onChange={(e) => set("lastName")(e.target.value)}
            error={errors.lastName}
          />
          <SelectField
            id="user-role"
            label="Role"
            required
            options={accessRoles}
            value={values.role}
            onChange={set("role")}
            error={errors.role}
          />
          <TextField
            id="user-phone"
            label="Contact number"
            type="tel"
            value={values.phone}
            onChange={(e) => set("phone")(formatPhone(e.target.value))}
            error={errors.phone}
          />
          <TextField
            id="user-email"
            label="Email"
            required
            type="email"
            autoComplete="off"
            value={values.email}
            onChange={(e) => set("email")(e.target.value)}
            error={errors.email}
            disabled={user?.status === "Active"}
          />
          <MultiSelectField
            id="user-locationIds"
            label="Locations"
            required
            options={locationOptions.map((l) => l.name)}
            value={values.locationIds.map(loc.name)}
            onChange={(names) =>
              set("locationIds")(
                names
                  .map((n) => loc.idFor(n))
                  .filter((id): id is string => !!id)
              )
            }
            error={errors.locationIds}
          />
          <PhotoField value={values.photo} onChange={set("photo")} />
        </div>
      </form>
      <FormFooter
        formId="user-form"
        submitLabel={user ? "Save changes" : "Add user"}
        onCancel={onDone}
      />
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  View                                                                       */
/* -------------------------------------------------------------------------- */

function UserView({
  user: u,
  locationNames,
  onEdit,
  onClose,
}: {
  user: StaffUser
  locationNames: string
  onEdit?: () => void
  onClose: () => void
}) {
  return (
    <>
      <SideSheetHeader
        title="View user"
        description={`Details for ${fullName(u)}.`}
      />
      <ViewBody onEdit={onEdit} onClose={onClose}>
        <section>
          <header className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Basic details</h3>
            <StatusBadge status={u.status} />
          </header>
          <div className="flex flex-col gap-4 sm:flex-row">
            <ProfileAvatar
              name={fullName(u)}
              photo={u.photo}
              onChange={(photo) => users.patch(u.id, { photo })}
            />
            <div className="min-w-0 flex-1">
              <DetailGrid
                className="sm:grid-cols-3"
                items={[
                  { label: "User ID", value: u.id },
                  { label: "First name", value: u.firstName },
                  { label: "Last name", value: u.lastName },
                  { label: "Role", value: roleOf(u) },
                  { label: "Email", value: u.email },
                  { label: "Contact number", value: u.phone },
                  { label: "Locations", value: locationNames },
                  { label: "Created on", value: shortDate(u.invitedAt) },
                ]}
              />
            </div>
          </div>
        </section>
      </ViewBody>
    </>
  )
}

function resend(u: StaffUser) {
  toast.success("Invite resent", {
    description: `A fresh link went to ${u.email}.`,
  })
}

/* -------------------------------------------------------------------------- */
/*  List                                                                       */
/* -------------------------------------------------------------------------- */

type Panel = { kind: "form"; id?: string } | { kind: "view"; id: string } | null

export function StaffPanel({ heading }: { heading: React.ReactNode }) {
  const { items } = users.use()
  const accessRoles = useAccessRoles()
  const loc = useLocationLookup()
  const [panel, setPanel] = React.useState<Panel>(null)
  const [deactivating, setDeactivating] = React.useState<StaffUser | null>(null)

  /* The React Compiler memoizes this, which keeps useNewParam's effect stable. */
  const openCreate = () => setPanel({ kind: "form" })
  useNewParam(openCreate)

  const locationNames = (u: StaffUser) =>
    u.self
      ? "All locations"
      : u.locationIds.map(loc.name).filter(Boolean).join(", ")
  const current = panel?.id ? items.find((u) => u.id === panel.id) : undefined

  const columns: Column<StaffUser>[] = [
    {
      id: "id",
      header: "User ID",
      className: ID_CELL,
      sortValue: (u) => u.id,
      cell: (u) => u.id,
    },
    {
      id: "name",
      header: "User name",
      className: "max-w-[14rem]",
      sortValue: fullName,
      cell: (u) => (
        <PersonCell
          name={fullName(u)}
          photo={u.photo}
          onOpen={() => setPanel({ kind: "view", id: u.id })}
          badge={u.self ? <Badge variant="info">You</Badge> : undefined}
        />
      ),
    },
    {
      id: "role",
      header: "Role",
      className: "hidden md:table-cell",
      sortValue: roleOf,
      cell: roleOf,
    },
    {
      id: "phone",
      header: "Contact number",
      className: "hidden tabular-nums lg:table-cell",
      sortValue: (u) => u.phone,
      cell: (u) => u.phone,
    },
    {
      id: "email",
      header: "Email",
      className: "hidden max-w-[16rem] truncate lg:table-cell",
      sortValue: (u) => u.email,
      cell: (u) => u.email,
    },
    {
      id: "active",
      header: "Last activity",
      className: "hidden text-muted-foreground tabular-nums xl:table-cell",
      sortValue: (u) => u.lastActive,
      cell: (u) => shortDate(u.lastActive) || "Never",
    },
    {
      id: "status",
      header: "Status",
      sortValue: (u) => u.status,
      cell: (u) => <StatusBadge status={u.status} />,
    },
    {
      id: "actions",
      header: "Actions",
      className: "w-10 text-right",
      cell: (u) => (
        <RowMenu label={`Actions for ${fullName(u)}`}>
          <DropdownMenuItem
            onClick={() => setPanel({ kind: "view", id: u.id })}
          >
            <IconEye />
            View
          </DropdownMenuItem>
          {/* The clinic manager's own account is managed by the Super Admin. */}
          {!u.self && (
            <>
              <DropdownMenuItem
                onClick={() => setPanel({ kind: "form", id: u.id })}
              >
                <IconEdit />
                Edit
              </DropdownMenuItem>
              {u.status === "Invited" && (
                <DropdownMenuItem onClick={() => resend(u)}>
                  <IconMail />
                  Resend invite
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => {
                  if (u.status !== "Inactive") return setDeactivating(u)
                  users.patch(u.id, {
                    status: u.lastActive ? "Active" : "Invited",
                  })
                  toast.success(`${fullName(u)} is active again`)
                }}
              >
                {u.status === "Inactive" ? <IconLockOpen /> : <IconLock />}
                {u.status === "Inactive" ? "Activate" : "Deactivate"}
              </DropdownMenuItem>
            </>
          )}
        </RowMenu>
      ),
    },
  ]

  return (
    <>
      <Directory
        title="Non-clinical users"
        heading={heading}
        noun="users"
        rows={items}
        columns={columns}
        search={(u) => [u.id, fullName(u), u.email, u.role, u.phone]}
        filters={[
          {
            id: "status",
            label: "Status",
            all: "All statuses",
            options: ["Active", "Invited", "Inactive"],
            match: (u, v) => u.status === v,
          },
          {
            id: "role",
            label: "Role",
            all: "All roles",
            options: accessRoles,
            match: (u, v) => u.role === v,
          },
        ]}
        primaryAction={{
          label: "Add user",
          icon: <IconUserAdd />,
          onClick: openCreate,
        }}
        bulkActions={(rows, clear) => (
          <BulkResend rows={rows.filter((u) => !u.self)} onDone={clear} />
        )}
        exportName="Non-clinical users"
        exportRow={(u) => ({
          "User ID": u.id,
          "User name": fullName(u),
          Role: roleOf(u),
          "Contact number": u.phone,
          Email: u.email,
          Locations: locationNames(u),
          "Last activity": shortDate(u.lastActive),
          Status: u.status,
        })}
        emptyIllustration="users-empty"
      />

      <SideSheet
        open={panel !== null}
        onOpenChange={(open) => !open && setPanel(null)}
        wide
      >
        {panel?.kind === "form" ? (
          <UserForm user={current} onDone={() => setPanel(null)} />
        ) : panel?.kind === "view" && current ? (
          <UserView
            user={current}
            locationNames={locationNames(current)}
            onEdit={
              current.self
                ? undefined
                : () => setPanel({ kind: "form", id: current.id })
            }
            onClose={() => setPanel(null)}
          />
        ) : null}
      </SideSheet>

      <DeactivateDialog
        illustration="deactivate-person"
        target={deactivating ? fullName(deactivating) : null}
        message="They lose access to the portal until you activate them again. Nothing they recorded is deleted."
        onCancel={() => setDeactivating(null)}
        onConfirm={() => {
          if (!deactivating) return
          users.patch(deactivating.id, { status: "Inactive" })
          toast.success(`${fullName(deactivating)} is deactivated`)
          setDeactivating(null)
        }}
      />
    </>
  )
}
