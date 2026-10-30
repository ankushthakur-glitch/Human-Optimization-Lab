"use client"

import * as React from "react"
import { toast } from "@/design-system/ui/sonner"
import {
  IconAdd,
  IconCheckCircle,
  IconCreditCard,
  IconEdit,
  IconTrash,
} from "@/design-system/icons"

import { AdminShell } from "@/components/admin/admin-shell"
import { EMAIL, TextField, digits } from "@/components/form-kit"
import { createCollection } from "@/components/practice/collection-store"
import { RowMenu } from "@/components/practice/directory"
import {
  PRACTICE,
  REYES_ID,
  providerName,
  providers,
} from "@/components/practice/practice-data"
import { PracticeShell } from "@/components/practice/practice-shell"
import {
  DetailGrid,
  type DetailItem,
  PhotoField,
  RecordCard,
  RecordPage,
} from "@/components/practice/record-page"
import { ProviderShell } from "@/components/provider/provider-shell"
import { StatusDot } from "@/components/settings/settings-kit"
import { Avatar, AvatarFallback, AvatarImage } from "@/design-system/ui/avatar"
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

/* My profile, opened from the account menu in every portal: who is signed
   in, their role and organisation. The provider also keeps the cards the
   practice's invoices are paid with, since only the provider pays. */

export type ProfilePortal = "admin" | "practice" | "provider"

type Profile = {
  name: string
  email: string
  phone: string
  /** A URL or an uploaded data URL; empty shows the initials. */
  photo: string
  /** Set by the organisation, so shown but never edited here. */
  fixed: DetailItem[]
}

type ProfileEdit = { id: ProfilePortal } & Partial<
  Pick<Profile, "name" | "email" | "phone" | "photo">
>

/** The signed-in person's own changes, laid over their account. */
const profileEdits = createCollection<ProfileEdit>(
  "hol-my-profile",
  [],
  "profile-v1"
)

function useProfile(portal: ProfilePortal): Profile {
  const { items } = providers.use()
  const { items: edits } = profileEdits.use()
  const edit = edits.find((e) => e.id === portal)
  return { ...baseProfile(portal, items), ...edit }
}

function baseProfile(
  portal: ProfilePortal,
  items: ReturnType<typeof providers.get>
): Profile {
  if (portal === "admin")
    return {
      name: "Maya Chen",
      email: "maya.chen@humanoptimization.com",
      phone: "(858) 555-0110",
      photo:
        "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&crop=faces&w=192&h=192&q=80",
      fixed: [
        { label: "Role", value: "Super Admin" },
        { label: "Organisation", value: "Inlay Health" },
      ],
    }
  if (portal === "practice")
    return {
      name: PRACTICE.manager.name,
      email: PRACTICE.manager.email,
      phone: "(858) 555-0124",
      photo: PRACTICE.manager.photo,
      fixed: [
        { label: "Role", value: "Clinic manager" },
        { label: "Practice", value: `${PRACTICE.name} (${PRACTICE.id})` },
      ],
    }
  const me = items.find((p) => p.id === REYES_ID)
  return {
    name: me ? providerName(me) : "Dr. Daniel Reyes",
    email: me?.email ?? "",
    phone: me?.phone ?? "",
    photo: me?.photo ?? "",
    fixed: [
      { label: "Role", value: me?.role ?? "Physician" },
      { label: "Practice", value: `${PRACTICE.name} (${PRACTICE.id})` },
      { label: "Specialty", value: me?.specialty ?? "" },
      { label: "NPI", value: me?.npi ?? "" },
    ],
  }
}

const initialsOf = (name: string) =>
  name
    .replace(/^Dr\.?\s+/i, "")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

const HOME: Record<ProfilePortal, string> = {
  admin: "/screens/admin/dashboard",
  practice: "/screens/practice/dashboard",
  provider: "/screens/patients/dashboard",
}

export function MyProfileScreen({ portal }: { portal: ProfilePortal }) {
  const profile = useProfile(portal)
  const [editing, setEditing] = React.useState(false)
  const body = (
    <RecordPage title="My profile" backHref={HOME[portal]}>
      <RecordCard
        title="Personal details"
        action={
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <IconEdit />
            Edit
          </Button>
        }
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar className="size-20 shrink-0 border">
            {profile.photo && (
              <AvatarImage src={profile.photo} alt={profile.name} />
            )}
            <AvatarFallback className="text-lg font-medium">
              {initialsOf(profile.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <p className="text-lg font-semibold">{profile.name}</p>
            <DetailGrid
              items={[
                { label: "Email", value: profile.email },
                { label: "Phone", value: profile.phone },
                ...profile.fixed,
              ]}
              className="sm:grid-cols-2 lg:grid-cols-3"
            />
          </div>
        </div>
      </RecordCard>
      {portal === "provider" && <PaymentCards />}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-md">
          {editing && (
            <EditProfileForm
              portal={portal}
              profile={profile}
              onClose={() => setEditing(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </RecordPage>
  )
  if (portal === "admin")
    return <AdminShell active="settings">{body}</AdminShell>
  if (portal === "practice")
    return <PracticeShell active="settings">{body}</PracticeShell>
  return <ProviderShell active="settings">{body}</ProviderShell>
}

function EditProfileForm({
  portal,
  profile,
  onClose,
}: {
  portal: ProfilePortal
  profile: Profile
  onClose: () => void
}) {
  const [draft, setDraft] = React.useState({
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    photo: profile.photo,
  })
  const set = (changes: Partial<typeof draft>) =>
    setDraft((d) => ({ ...d, ...changes }))
  const valid = draft.name.trim() && EMAIL.test(draft.email.trim())

  function save(event: React.FormEvent) {
    event.preventDefault()
    if (!valid) return
    const changes = {
      name: draft.name.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      photo: draft.photo,
    }
    if (profileEdits.get().some((e) => e.id === portal))
      profileEdits.patch(portal, changes)
    else profileEdits.add([{ id: portal, ...changes }])
    toast.success("Profile updated")
    onClose()
  }

  return (
    <form noValidate onSubmit={save} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Edit profile</DialogTitle>
        <DialogDescription className="sr-only">
          Change your name, contact details and picture.
        </DialogDescription>
      </DialogHeader>
      <PhotoField value={draft.photo} onChange={(photo) => set({ photo })} />
      <TextField
        id="profile-name"
        label="Full name"
        required
        autoComplete="name"
        value={draft.name}
        onChange={(e) => set({ name: e.target.value })}
      />
      <TextField
        id="profile-email"
        label="Email"
        required
        type="email"
        autoComplete="email"
        value={draft.email}
        onChange={(e) => set({ email: e.target.value })}
      />
      <TextField
        id="profile-phone"
        label="Phone"
        type="tel"
        autoComplete="tel"
        value={draft.phone}
        onChange={(e) => set({ phone: e.target.value })}
      />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!valid}>
          Save
        </Button>
      </DialogFooter>
    </form>
  )
}

/* -------------------------------------------------------------------------- */
/*  Payment cards                                                              */
/* -------------------------------------------------------------------------- */

type SavedCard = {
  id: string
  brand: string
  /** Only the last four digits are kept. */
  last4: string
  name: string
  expiry: string
  isDefault: boolean
}

const cards = createCollection<SavedCard>(
  "hol-provider-cards",
  [
    {
      id: "card-1",
      brand: "Visa",
      last4: "4242",
      name: "Daniel Reyes",
      expiry: "08/28",
      isDefault: true,
    },
  ],
  "cards-v1"
)

function brandOf(number: string) {
  if (/^4/.test(number)) return "Visa"
  if (/^(5[1-5]|2[2-7])/.test(number)) return "Mastercard"
  if (/^3[47]/.test(number)) return "American Express"
  if (/^6/.test(number)) return "Discover"
  return "Card"
}

function makeDefault(id: string) {
  cards.get().forEach((c) => cards.patch(c.id, { isDefault: c.id === id }))
}

function PaymentCards() {
  const { items } = cards.use()
  const [adding, setAdding] = React.useState(false)
  return (
    <RecordCard
      title="Payment cards"
      action={
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          <IconAdd />
          Add card
        </Button>
      }
    >
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No cards added yet</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {items.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-surface text-primary-tint">
                <IconCreditCard className="size-5" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm font-medium">
                  {c.brand} ending {c.last4}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {c.name}, expires {c.expiry}
                </span>
              </span>
              {c.isDefault && <StatusDot tone="success">Default</StatusDot>}
              <RowMenu label={`Actions for card ending ${c.last4}`}>
                {!c.isDefault && (
                  <DropdownMenuItem onClick={() => makeDefault(c.id)}>
                    <IconCheckCircle />
                    Make default
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    cards.remove(c.id)
                    const rest = cards.get()
                    if (c.isDefault && rest[0]) makeDefault(rest[0].id)
                    toast.success(`Card ending ${c.last4} removed`)
                  }}
                >
                  <IconTrash />
                  Remove
                </DropdownMenuItem>
              </RowMenu>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="sm:max-w-md">
          {adding && (
            <AddCardForm
              first={items.length === 0}
              onClose={() => setAdding(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </RecordCard>
  )
}

function AddCardForm({
  first,
  onClose,
}: {
  first: boolean
  onClose: () => void
}) {
  const [name, setName] = React.useState("")
  const [number, setNumber] = React.useState("")
  const [expiry, setExpiry] = React.useState("")
  const [cvc, setCvc] = React.useState("")
  const [zip, setZip] = React.useState("")
  const [isDefault, setIsDefault] = React.useState(first)
  const raw = digits(number)
  const valid =
    name.trim() &&
    raw.length >= 13 &&
    /^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry) &&
    digits(cvc).length >= 3 &&
    digits(zip).length === 5

  function save(event: React.FormEvent) {
    event.preventDefault()
    if (!valid) return
    const card: SavedCard = {
      id: `card-${Date.now()}`,
      brand: brandOf(raw),
      last4: raw.slice(-4),
      name: name.trim(),
      expiry,
      isDefault: false,
    }
    cards.add([card])
    if (isDefault) makeDefault(card.id)
    toast.success(`${card.brand} ending ${card.last4} added`)
    onClose()
  }

  return (
    <form noValidate onSubmit={save} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Add card</DialogTitle>
        <DialogDescription className="sr-only">
          Add a card to pay the practice&apos;s invoices with.
        </DialogDescription>
      </DialogHeader>
      <TextField
        id="card-name"
        label="Name on card"
        required
        autoComplete="cc-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <TextField
        id="card-number"
        label="Card number"
        required
        inputMode="numeric"
        autoComplete="cc-number"
        placeholder="1234 5678 9012 3456"
        className="tabular-nums"
        value={number}
        onChange={(e) =>
          setNumber(
            digits(e.target.value)
              .slice(0, 19)
              .replace(/(\d{4})(?=\d)/g, "$1 ")
          )
        }
      />
      <div className="grid grid-cols-3 gap-3">
        <TextField
          id="card-expiry"
          label="Expiry"
          required
          inputMode="numeric"
          autoComplete="cc-exp"
          placeholder="MM/YY"
          value={expiry}
          onChange={(e) => {
            const d = digits(e.target.value).slice(0, 4)
            setExpiry(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d)
          }}
        />
        <TextField
          id="card-cvc"
          label="CVC"
          required
          inputMode="numeric"
          autoComplete="cc-csc"
          value={cvc}
          onChange={(e) => setCvc(digits(e.target.value).slice(0, 4))}
        />
        <TextField
          id="card-zip"
          label="Billing ZIP"
          required
          inputMode="numeric"
          autoComplete="postal-code"
          value={zip}
          onChange={(e) => setZip(digits(e.target.value).slice(0, 5))}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={isDefault}
          disabled={first}
          onCheckedChange={(on) => setIsDefault(on === true)}
        />
        Make this the default card
      </label>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!valid}>
          Add card
        </Button>
      </DialogFooter>
    </form>
  )
}
