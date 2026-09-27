"use client"

import * as React from "react"
import { toast } from "@/design-system/ui/sonner"
import {
  IconEdit,
  IconLock,
  IconLockOpen,
  IconMail,
  IconUserAdd,
} from "@/design-system/icons"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/design-system/ui/alert-dialog"
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
import { Field, FieldLabel } from "@/design-system/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/ui/select"
import { PracticeFormSheet } from "@/components/admin/practice-form"
import { TextField, VALIDATE } from "@/components/form-kit"
import {
  type ClinicManagerInput,
  type Practice,
  GENDERS,
  formatPhone,
  managerName,
  practiceStore,
} from "@/components/admin/practices-store"
import { Illustration } from "@/components/illustrations/illustration"

/* -------------------------------------------------------------------------- */
/*  Invite clinic manager                                                      */
/* -------------------------------------------------------------------------- */

const EMPTY_MANAGER: ClinicManagerInput = {
  email: "",
  firstName: "",
  lastName: "",
  middleName: "",
  phone: "",
  gender: "",
}

const GENDER_ITEMS = [
  { label: "Select gender", value: null },
  ...GENDERS.map((g) => ({ label: g, value: g })),
]

function validateManager(v: ClinicManagerInput) {
  const errors: Partial<Record<keyof ClinicManagerInput, string>> = {}
  if (!VALIDATE) return errors
  if (!v.email.trim()) errors.email = "Enter their work email."
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim()))
    errors.email = "Enter a valid email address."
  if (!v.firstName.trim()) errors.firstName = "Enter a first name."
  if (!v.lastName.trim()) errors.lastName = "Enter a last name."
  if (v.phone && v.phone.replace(/\D/g, "").length !== 10)
    errors.phone = "Enter a 10-digit phone number."
  return errors
}

/** The clinic manager is the practice's own admin: invited here, by email. */
export function InviteManagerDialog({
  practice,
  onOpenChange,
}: {
  practice: Practice | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={practice !== null} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85svh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        {/* Mounted per open, so every invite starts from a fresh draft. */}
        {practice && (
          <InviteManagerBody
            practice={practice}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function InviteManagerBody({
  practice,
  onDone,
}: {
  practice: Practice
  onDone: () => void
}) {
  /* The primary contact is usually who runs the practice day to day, so the
     invite starts from them; the admin can change anyone. */
  const [values, setValues] = React.useState<ClinicManagerInput>(() => ({
    ...EMPTY_MANAGER,
    firstName: practice.primaryContact.firstName,
    lastName: practice.primaryContact.lastName,
    email: practice.primaryContact.email,
    phone: practice.primaryContact.phone,
  }))
  const [attempted, setAttempted] = React.useState(false)

  const errors = attempted ? validateManager(values) : {}
  const set =
    (key: keyof ClinicManagerInput) =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setValues((prev) => ({ ...prev, [key]: event.target.value }))

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAttempted(true)
    const found = validateManager(values)
    const first = Object.keys(found)[0]
    if (first) {
      document.getElementById(`manager-${first}`)?.focus()
      return
    }
    const manager = {
      ...values,
      email: values.email.trim(),
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      middleName: values.middleName.trim(),
    }
    practiceStore.inviteManager(practice.id, manager)
    onDone()
    toast.success("Invite sent", {
      description: `${managerName(manager)} will get an email with ${practice.name}’s Organization ID and a one-time password.`,
      // The prototype's inbox always shows the sample clinic manager's email.
      action: {
        label: "View email",
        onClick: () =>
          window.open(
            "/screens/login/invite-email?as=clinic-manager",
            "_blank"
          ),
      },
    })
  }

  return (
    <>
      <DialogHeader className="border-b p-6">
        <DialogTitle>Invite clinic manager</DialogTitle>
        <DialogDescription className="sr-only">
          Invite a clinic manager for {practice.name}.
        </DialogDescription>
      </DialogHeader>

      <form
        id="invite-manager-form"
        noValidate
        onSubmit={handleSubmit}
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6"
      >
        <TextField
          id="manager-email"
          label="Email"
          required
          type="email"
          autoComplete="email"
          placeholder="manager@practice.com"
          value={values.email}
          onChange={set("email")}
          error={errors.email}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="manager-firstName"
            label="First name"
            required
            autoComplete="given-name"
            placeholder="Jane"
            value={values.firstName}
            onChange={set("firstName")}
            error={errors.firstName}
          />
          <TextField
            id="manager-lastName"
            label="Last name"
            required
            autoComplete="family-name"
            placeholder="Doe"
            value={values.lastName}
            onChange={set("lastName")}
            error={errors.lastName}
          />
        </div>
        <TextField
          id="manager-middleName"
          label="Middle name"
          autoComplete="additional-name"
          placeholder="Optional"
          value={values.middleName}
          onChange={set("middleName")}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="manager-phone"
            label="Phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(123)-456-7890"
            value={values.phone}
            onChange={(event) =>
              setValues((prev) => ({
                ...prev,
                phone: formatPhone(event.target.value),
              }))
            }
            error={errors.phone}
          />
          <Field>
            <FieldLabel htmlFor="manager-gender">Gender</FieldLabel>
            <Select
              items={GENDER_ITEMS}
              value={values.gender || null}
              onValueChange={(gender: string | null) =>
                setValues((prev) => ({ ...prev, gender: gender ?? "" }))
              }
            >
              <SelectTrigger id="manager-gender" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {GENDER_ITEMS.map((item) => (
                    <SelectItem key={String(item.value)} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </form>

      <DialogFooter className="mt-0 shrink-0 flex-row items-center justify-end gap-2 border-t p-4">
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" form="invite-manager-form">
          <IconMail />
          Send invite
        </Button>
      </DialogFooter>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  Everything a practice's actions menu can open                              */
/* -------------------------------------------------------------------------- */

/**
 * One place for the practice actions, so the list's row menu and the details
 * page open the same sheets and dialogs. Render `dialogs` once on the screen;
 * call the openers from anywhere.
 */
export function usePracticeActions() {
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Practice | undefined>()
  const [created, setCreated] = React.useState<Practice | null>(null)
  const [inviting, setInviting] = React.useState<Practice | null>(null)
  const [deactivating, setDeactivating] = React.useState<Practice | null>(null)

  const openCreate = React.useCallback(() => {
    setEditing(undefined)
    setFormOpen(true)
  }, [])

  const openEdit = React.useCallback((practice: Practice) => {
    setEditing(practice)
    setFormOpen(true)
  }, [])

  const openInvite = React.useCallback(
    (practice: Practice) => setInviting(practice),
    []
  )

  function resendInvite(practice: Practice) {
    if (!practice.manager) return
    toast.success("Invite resent", {
      description: `A fresh link went to ${practice.manager.email}.`,
    })
  }

  function toggleStatus(practice: Practice) {
    if (practice.status === "Active") {
      setDeactivating(practice)
      return
    }
    practiceStore.setStatus(practice.id, "Active")
    toast.success(`${practice.name} is active again`)
  }

  /** The row menu's items, identical wherever a practice can be acted on. */
  function menuItems(practice: Practice, { includeEdit = true } = {}) {
    return (
      <>
        {!practice.manager ? (
          <DropdownMenuItem onClick={() => openInvite(practice)}>
            <IconUserAdd />
            Invite clinic manager
          </DropdownMenuItem>
        ) : practice.manager.status === "Invited" ? (
          <DropdownMenuItem onClick={() => resendInvite(practice)}>
            <IconMail />
            Resend invite
          </DropdownMenuItem>
        ) : null}
        {includeEdit && (
          <DropdownMenuItem onClick={() => openEdit(practice)}>
            <IconEdit />
            Edit
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => toggleStatus(practice)}>
          {practice.status === "Active" ? <IconLock /> : <IconLockOpen />}
          {practice.status === "Active" ? "Deactivate" : "Activate"}
        </DropdownMenuItem>
      </>
    )
  }

  const dialogs = (
    <>
      <PracticeFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        practice={editing}
        onSubmit={(input) => {
          setFormOpen(false)
          if (editing) {
            practiceStore.edit(editing.id, input)
            toast.success("Practice updated", { description: input.name })
          } else {
            setCreated(practiceStore.create(input))
          }
        }}
      />

      {/* Creating a practice ends on this question, because a practice with
          no clinic manager has nobody to run it. "Later" is fine: the row menu
          and the details page both offer the invite again. */}
      <AlertDialog
        open={created !== null}
        onOpenChange={(open) => !open && setCreated(null)}
      >
        <AlertDialogContent size="sm" className="gap-5 p-6 sm:max-w-sm">
          <div className="flex flex-col items-center gap-3 text-center">
            <Illustration name="practice-created" className="size-32" />
            <AlertDialogTitle>Practice created</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">
                {created?.name}
              </span>{" "}
              is ready. Add its clinic manager now?
            </AlertDialogDescription>
          </div>
          <div className="flex flex-col gap-2">
            <AlertDialogAction
              className="w-full"
              onClick={() => {
                const practice = created
                setCreated(null)
                if (practice) setInviting(practice)
              }}
            >
              <IconUserAdd />
              Add clinic manager
            </AlertDialogAction>
            <AlertDialogCancel variant="ghost" className="w-full">
              Later
            </AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <InviteManagerDialog
        practice={inviting}
        onOpenChange={(open) => !open && setInviting(null)}
      />

      <AlertDialog
        open={deactivating !== null}
        onOpenChange={(open) => !open && setDeactivating(null)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="size-28 rounded-none bg-transparent">
              <Illustration name="deactivate-practice" className="size-28" />
            </AlertDialogMedia>
            <AlertDialogTitle>
              Deactivate {deactivating?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Its clinic manager, clinicians and patients lose access until you
              activate it again. No data is deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!deactivating) return
                practiceStore.setStatus(deactivating.id, "Inactive")
                toast.success(`${deactivating.name} is deactivated`)
                setDeactivating(null)
              }}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )

  return { openCreate, openEdit, openInvite, toggleStatus, menuItems, dialogs }
}
