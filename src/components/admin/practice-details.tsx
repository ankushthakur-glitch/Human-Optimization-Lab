"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  IconArrowLeft,
  IconCopy,
  IconEdit,
  IconHospital,
  IconMail,
  IconMoreVertical,
  IconUserAdd,
} from "@/design-system/icons"

import { cn } from "@/lib/utils"
import { AdminShell } from "@/components/admin/admin-shell"
import { usePracticeActions } from "@/components/admin/practice-actions"
import {
  type Practice,
  formatDate,
  usePractices,
} from "@/components/admin/practices-store"
import { Badge } from "@/design-system/ui/badge"
import { Button } from "@/design-system/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/design-system/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/design-system/ui/empty"
import { Skeleton } from "@/design-system/ui/skeleton"

/* -------------------------------------------------------------------------- */
/*  Pieces                                                                     */
/* -------------------------------------------------------------------------- */

/* `wide` rows (emails, links) take the whole card width in two-column cards,
   so long values don't break mid-word. */
type Row = { label: string; value: React.ReactNode; wide?: boolean }

/* A titled block of "Label : Value" rows, the tenant-profile layout from the
   reference. `columns={2}` sets two pairs side by side on wide screens. */
function InfoCard({
  title,
  rows,
  columns = 1,
  action,
}: {
  title: string
  rows: Row[]
  columns?: 1 | 2
  action?: React.ReactNode
}) {
  return (
    <section className="@container overflow-hidden rounded-lg border bg-card">
      <header className="flex min-h-11 items-center justify-between gap-2 border-b px-4 py-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </header>
      <dl
        className={cn(
          "grid gap-x-8 gap-y-3 p-4",
          columns === 2 && "@2xl:grid-cols-2"
        )}
      >
        {rows.map((row) => (
          <InfoRow
            key={row.label}
            label={row.label}
            value={row.value}
            wide={row.wide}
          />
        ))}
      </dl>
    </section>
  )
}

/* Empty optional fields read "Not provided", so gaps stay visible. */
function InfoRow({ label, value, wide }: Row) {
  const empty = value === "" || value == null
  return (
    <div
      className={cn(
        "grid grid-cols-[8rem_minmax(0,1fr)] items-baseline gap-2 text-sm",
        wide && "@2xl:col-span-2"
      )}
    >
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "flex min-w-0 gap-1.5 break-words",
          empty && "text-muted-foreground/70"
        )}
      >
        <span aria-hidden className="text-muted-foreground">
          :
        </span>
        <span className="min-w-0">{empty ? "Not provided" : value}</span>
      </dd>
    </div>
  )
}

function copy(text: string, what: string) {
  navigator.clipboard?.writeText(text).then(
    () => toast.success(`${what} copied`),
    () => toast.error(`Couldn't copy the ${what.toLowerCase()}`)
  )
}

const LINK = "text-primary-tint underline-offset-4 hover:underline"

/* -------------------------------------------------------------------------- */
/*  Screen                                                                     */
/* -------------------------------------------------------------------------- */

export function PracticeDetails({ id }: { id: string }) {
  const { practices, ready } = usePractices()
  const router = useRouter()
  const actions = usePracticeActions({
    onDeleted: () => router.push("/screens/admin/practices"),
  })
  const practice = practices.find((p) => p.id === id)

  return (
    <AdminShell active="practices">
      {practice ? (
        <PracticeBody practice={practice} actions={actions} />
      ) : !ready ? (
        /* Saved changes load after mount; a practice created this session is
           only known once they have, so hold the frame until then. */
        <div className="flex flex-col gap-4 p-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-8 w-80" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <Empty className="flex-1">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconHospital />
            </EmptyMedia>
            <EmptyTitle>Practice not found</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/screens/admin/practices" />}
            >
              <IconArrowLeft />
              Back to practices
            </Button>
          </EmptyContent>
        </Empty>
      )}
      {actions.dialogs}
    </AdminShell>
  )
}

function PracticeBody({
  practice,
  actions,
}: {
  practice: Practice
  actions: ReturnType<typeof usePracticeActions>
}) {
  /* Same frame as the Practices list: the practice's name where the list has
     its heading, actions on the right, and the cards on the sunken canvas. */
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-surface-sunken px-4 pt-4 pb-6 sm:px-6">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Back to practices"
            nativeButton={false}
            render={<Link href="/screens/admin/practices" />}
          >
            <IconArrowLeft />
          </Button>
          <h1 className="truncate font-heading text-xl font-semibold tracking-tight">
            {practice.name}
          </h1>
          <Badge
            variant={practice.status === "Active" ? "success" : "destructive"}
          >
            {practice.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => actions.openEdit(practice)}>
            <IconEdit />
            Edit practice
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="More actions"
                >
                  <IconMoreVertical />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuGroup>
                {actions.menuItems(practice, { includeEdit: false })}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <DetailsCards practice={practice} onInvite={actions.openInvite} />
    </div>
  )
}

function DetailsCards({
  practice,
  onInvite,
}: {
  practice: Practice
  onInvite: (practice: Practice) => void
}) {
  const { manager, primaryContact: contact } = practice

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="flex flex-col gap-4">
        <InfoCard
          title="Practice information"
          columns={2}
          rows={[
            { label: "Practice name", value: practice.name },
            { label: "Practice ID", value: practice.id },
            { label: "Group NPI", value: practice.npi },
            {
              label: "Tenant name",
              value: <span>{practice.tenant}</span>,
            },
            { label: "Created", value: formatDate(practice.createdAt) },
            { label: "Clinicians", value: practice.clinicians },
            { label: "Patients", value: practice.patients },
          ]}
        />
        <InfoCard
          title="Referral"
          rows={[
            {
              label: "Referral URL",
              value: (
                <span className="flex items-center gap-1">
                  <span className="min-w-0 truncate">
                    {practice.referralUrl}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Copy referral URL"
                    onClick={() => copy(practice.referralUrl, "Referral URL")}
                  >
                    <IconCopy />
                  </Button>
                </span>
              ),
            },
          ]}
        />
        <InfoCard
          title="Location"
          columns={2}
          action={
            practice.defaultLocation ? (
              <Badge variant="info">Default location</Badge>
            ) : null
          }
          rows={[
            { label: "Location name", value: practice.locationName },
            { label: "Contact number", value: practice.contactNumber },
            { label: "Fax", value: practice.fax },
            {
              label: "Email",
              wide: true,
              value: practice.email && (
                <a href={`mailto:${practice.email}`} className={LINK}>
                  {practice.email}
                </a>
              ),
            },
            {
              label: "Website",
              wide: true,
              value: practice.website && (
                <a
                  href={practice.website}
                  target="_blank"
                  rel="noreferrer"
                  className={LINK}
                >
                  {practice.website.replace(/^https?:\/\//, "")}
                </a>
              ),
            },
          ]}
        />
      </div>

      <div className="flex flex-col gap-4">
        <InfoCard
          title="Primary contact"
          rows={[
            {
              label: "Name",
              value: `${contact.firstName} ${contact.lastName}`.trim(),
            },
            {
              label: "Email",
              value: contact.email && (
                <a href={`mailto:${contact.email}`} className={LINK}>
                  {contact.email}
                </a>
              ),
            },
            { label: "Phone", value: contact.phone },
          ]}
        />
        <InfoCard
          title="Clinic manager"
          action={
            !manager ? (
              <Button size="xs" onClick={() => onInvite(practice)}>
                <IconUserAdd />
                Invite
              </Button>
            ) : manager.status === "Invited" ? (
              <div className="flex items-center gap-2">
                <Badge variant="warning">Invite pending</Badge>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() =>
                    toast.success("Invite resent", {
                      description: `A fresh link went to ${manager.email}.`,
                    })
                  }
                >
                  <IconMail />
                  Resend
                </Button>
              </div>
            ) : (
              <Badge variant="success">Active</Badge>
            )
          }
          rows={
            manager
              ? [
                  {
                    label: "Name",
                    value: [
                      manager.firstName,
                      manager.middleName,
                      manager.lastName,
                    ]
                      .filter(Boolean)
                      .join(" "),
                  },
                  { label: "Email", value: manager.email },
                  { label: "Phone", value: manager.phone },
                  { label: "Gender", value: manager.gender },
                  { label: "Invited", value: formatDate(manager.invitedAt) },
                ]
              : [{ label: "Name", value: "" }]
          }
        />
      </div>
    </div>
  )
}
