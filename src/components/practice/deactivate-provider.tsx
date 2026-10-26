"use client"

import * as React from "react"
import { toast } from "@/design-system/ui/sonner"
import {
  IconArrowLeft,
  IconArrowRight,
  IconBuilding,
  IconCheck,
  IconClose,
  IconLocation,
  IconSearch,
  IconSwitch,
  IconUserMinus,
  IconUsersGroup,
} from "@/design-system/icons"
import { cn } from "cn"

import { type Practice, usePractices } from "@/components/admin/practices-store"
import { avatarTone, initials } from "@/components/practice/directory"
import {
  PRACTICE,
  type Patient,
  type Provider,
  fullName,
  patients,
  providerName,
  providers,
  useLocationLookup,
} from "@/components/practice/practice-data"
import { today } from "@/components/practice/collection-store"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/design-system/ui/avatar"
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/design-system/ui/input-group"
import { Progress } from "@/design-system/ui/progress"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/ui/select"

/* Deactivating a provider never leaves patients without a physician. A
   centred dialog: first the clinic manager picks why the provider is
   going, then finishes that one path.
   - Moving to another clinic: the provider and every patient they look
     after move to a clinic on Inlay. Here the patients close as
     Transferred.
   - Leaving Inlay: the clinic manager selects patients and hands them to
     active providers of this practice (the AGC "Permanent assignment"
     transfer), reviews the split, then deactivates. */

type Step = "choose" | "move" | "leave"

const WIDTH: Record<Step, string> = {
  choose: "sm:max-w-2xl",
  move: "sm:max-w-xl",
  leave: "sm:max-w-5xl",
}

/** The patients a provider looks after: every open record. */
function panelOf(providerId: string, all: Patient[]) {
  return all.filter(
    (p) => p.providerId === providerId && p.status !== "Inactive"
  )
}

export function DeactivateProviderDialog({
  provider,
  onClose,
}: {
  /** null keeps the dialog closed. */
  provider: Provider | null
  onClose: () => void
}) {
  return (
    <Dialog open={provider !== null} onOpenChange={(o) => !o && onClose()}>
      {provider && <Body provider={provider} onClose={onClose} />}
    </Dialog>
  )
}

function Body({
  provider,
  onClose,
}: {
  provider: Provider
  onClose: () => void
}) {
  const { items: allPatients } = patients.use()
  const { items: allProviders } = providers.use()
  const { practices } = usePractices()

  const [step, setStep] = React.useState<Step>("choose")
  const [clinicId, setClinicId] = React.useState("")
  const [assign, setAssign] = React.useState<Record<string, string>>({})

  const panel = React.useMemo(
    () => panelOf(provider.id, allPatients),
    [provider.id, allPatients]
  )
  const name = providerName(provider)

  const clinics = practices
    .filter((c) => c.status === "Active" && c.id !== PRACTICE.id)
    .sort((a, b) => a.name.localeCompare(b.name))
  const clinic = clinics.find((c) => c.id === clinicId)

  /* Who can take patients on, with how many they already look after. */
  const takers = allProviders
    .filter((p) => p.id !== provider.id && p.status === "Active")
    .map((p) => ({ provider: p, load: panelOf(p.id, allPatients).length }))

  const moveAndDeactivate = () => {
    if (!clinic) return
    for (const p of panel)
      patients.patch(p.id, {
        status: "Inactive",
        inactiveReason: "Transferred",
      })
    providers.patch(provider.id, {
      status: "Inactive",
      departure: {
        kind: "moved",
        practiceId: clinic.id,
        practiceName: clinic.name,
        at: today(),
        patients: panel.length,
      },
    })
    toast.success(`${name} moved to ${clinic.name}`, {
      description: `${plural(panel.length, "patient")} moved with them.`,
    })
    onClose()
  }

  const reassignAndDeactivate = () => {
    for (const p of panel) patients.patch(p.id, { providerId: assign[p.id] })
    providers.patch(provider.id, {
      status: "Inactive",
      departure: { kind: "left", at: today(), patients: panel.length },
    })
    toast.success(`${name} is deactivated`, {
      description: panel.length
        ? `${plural(panel.length, "patient")} reassigned.`
        : undefined,
    })
    onClose()
  }

  let content: React.ReactNode
  if (step === "move")
    content = (
      <MoveStep
        name={name}
        panel={panel}
        clinics={clinics}
        clinicId={clinicId}
        onPick={setClinicId}
        onBack={() => setStep("choose")}
        onConfirm={moveAndDeactivate}
      />
    )
  else if (step === "leave")
    content = (
      <LeaveStep
        provider={provider}
        panel={panel}
        takers={takers}
        assign={assign}
        setAssign={setAssign}
        onBack={() => setStep("choose")}
        onConfirm={reassignAndDeactivate}
      />
    )
  else {
    const count = plural(panel.length, "patient")
    content = (
      <>
        <DialogHeader className="shrink-0 gap-4 px-6 pt-6 pb-2">
          <div className="flex items-center gap-3 pr-8">
            <PersonAvatar name={name} photo={provider.photo} size="lg" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <DialogTitle className="truncate text-base font-semibold">
                Deactivate {name}
              </DialogTitle>
              <span className="text-sm text-muted-foreground">
                {provider.role}, {count}
              </span>
            </div>
          </div>
          <DialogDescription className="text-sm text-foreground">
            Why is {provider.firstName} going?
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 px-6 pt-2 pb-6 sm:grid-cols-2">
          <OptionCard
            icon={<IconBuilding />}
            title="Moving to another clinic"
            text={`${provider.firstName} and ${count} move to a clinic you pick.`}
            onClick={() => setStep("move")}
          />
          <OptionCard
            icon={<IconUserMinus />}
            title="Leaving Inlay"
            text={
              panel.length
                ? `You hand the ${count} to providers here.`
                : "No patients to reassign."
            }
            onClick={() => setStep("leave")}
          />
        </div>
      </>
    )
  }

  return (
    <DialogContent
      className={cn(
        "flex max-h-[90dvh] flex-col gap-0 rounded-xl p-0",
        WIDTH[step]
      )}
    >
      {content}
    </DialogContent>
  )
}

function OptionCard({
  icon,
  title,
  text,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  text: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-full w-full flex-col items-start gap-4 rounded-xl border p-5 text-left transition-colors outline-none hover:border-primary hover:bg-primary-surface/40 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/30"
    >
      <span className="flex w-full items-center justify-between">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-surface text-primary [&_svg]:size-5">
          {icon}
        </span>
        <IconArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-sm text-muted-foreground">{text}</span>
      </span>
    </button>
  )
}

function StepHeader({
  title,
  description,
  onBack,
  aside,
}: {
  title: string
  description: string
  onBack: () => void
  aside?: React.ReactNode
}) {
  return (
    <DialogHeader className="shrink-0 flex-row items-center gap-2 border-b px-4 py-3 pr-14">
      <Button variant="ghost" size="icon-sm" aria-label="Back" onClick={onBack}>
        <IconArrowLeft />
      </Button>
      <DialogTitle className="min-w-0 flex-1 truncate text-base font-semibold">
        {title}
      </DialogTitle>
      {aside}
      <DialogDescription className="sr-only">{description}</DialogDescription>
    </DialogHeader>
  )
}

/* -------------------------------------------------------------------------- */
/*  Moving to another clinic                                                   */
/* -------------------------------------------------------------------------- */

function MoveStep({
  name,
  panel,
  clinics,
  clinicId,
  onPick,
  onBack,
  onConfirm,
}: {
  name: string
  panel: Patient[]
  clinics: Practice[]
  clinicId: string
  onPick: (id: string) => void
  onBack: () => void
  onConfirm: () => void
}) {
  const [query, setQuery] = React.useState("")
  const q = query.trim().toLowerCase()
  const shown = clinics.filter(
    (c) =>
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.locationName.toLowerCase().includes(q)
  )
  const clinic = clinics.find((c) => c.id === clinicId)

  return (
    <>
      <StepHeader
        title="Move to another clinic"
        description="Pick the clinic the provider and their patients move to."
        onBack={onBack}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 px-6 pt-4">
        <SearchBox
          value={query}
          onChange={setQuery}
          placeholder="Search clinics"
        />
        <div
          role="radiogroup"
          aria-label="Clinic"
          className="-mx-2 flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-2"
        >
          {shown.map((c) => {
            const on = c.id === clinicId
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onPick(c.id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border-2 border-transparent px-3 py-2.5 text-left transition-colors outline-none hover:bg-surface-hover focus-visible:ring-3 focus-visible:ring-ring/30",
                  on &&
                    "border-primary bg-primary-surface hover:bg-primary-surface"
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4",
                    on && "bg-primary text-primary-foreground"
                  )}
                >
                  <IconBuilding />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span
                    className={cn(
                      "truncate text-sm font-medium",
                      on && "font-semibold"
                    )}
                  >
                    {c.name}
                  </span>
                  <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <IconLocation className="size-3" />
                    {c.locationName}
                  </span>
                </span>
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-border",
                    on && "border-primary bg-primary text-primary-foreground"
                  )}
                >
                  {on && (
                    <IconCheck className="size-3 [--icon-stroke-width:3]" />
                  )}
                </span>
              </button>
            )
          })}
          {shown.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No clinics match
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 border-t bg-muted/40 px-6 py-3">
        <PatientStack rows={panel} />
        <span className="min-w-0 text-sm">
          {panel.length === 0 ? (
            "No patients move"
          ) : (
            <>
              <span className="font-medium">
                {plural(panel.length, "patient")}
              </span>{" "}
              move with {name.split(",")[0]}
              {clinic && (
                <>
                  {" "}
                  to <span className="font-medium">{clinic.name}</span>
                </>
              )}
            </>
          )}
        </span>
      </div>

      <DialogFooter className="mx-0 mb-0 shrink-0 flex-row justify-end gap-2 rounded-b-xl border-t px-6 py-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button variant="destructive" disabled={!clinic} onClick={onConfirm}>
          Move and deactivate
        </Button>
      </DialogFooter>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  Leaving Inlay                                                              */
/* -------------------------------------------------------------------------- */

type Taker = { provider: Provider; load: number }

function LeaveStep({
  provider,
  panel,
  takers,
  assign,
  setAssign,
  onBack,
  onConfirm,
}: {
  provider: Provider
  panel: Patient[]
  takers: Taker[]
  assign: Record<string, string>
  setAssign: React.Dispatch<React.SetStateAction<Record<string, string>>>
  onBack: () => void
  onConfirm: () => void
}) {
  const loc = useLocationLookup()
  const [reviewing, setReviewing] = React.useState(false)
  const [targetId, setTargetId] = React.useState("")
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [query, setQuery] = React.useState("")

  const target = takers.find((t) => t.provider.id === targetId)
  const assigned = panel.filter((p) => assign[p.id]).length
  const done = assigned === panel.length
  const first = provider.firstName

  /* Left: the patients still waiting for a provider. */
  const waiting = panel.filter((p) => !assign[p.id])
  const q = query.trim().toLowerCase()
  const shown = waiting.filter(
    (p) =>
      !q ||
      fullName(p).toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
  )
  const picked = shown.filter((p) => selected.has(p.id))

  /* Right: who the chosen provider takes on. */
  const taken = panel.filter((p) => assign[p.id] === targetId)
  const groups = takers
    .map((t) => ({
      ...t,
      rows: panel.filter((p) => assign[p.id] === t.provider.id),
    }))
    .filter((g) => g.rows.length > 0)

  const toggle = (id: string, on: boolean) =>
    setSelected((s) => {
      const next = new Set(s)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })

  const assignSelected = () => {
    if (!targetId || picked.length === 0) return
    setAssign((a) => ({
      ...a,
      ...Object.fromEntries(picked.map((p) => [p.id, targetId])),
    }))
    setSelected(new Set())
  }

  const unassign = (id: string) =>
    setAssign((a) => {
      const next = { ...a }
      delete next[id]
      return next
    })

  /* Round robin, lightest panel first, so the split stays even. */
  const splitRest = () => {
    const order = [...takers].sort((a, b) => a.load - b.load)
    if (order.length === 0) return
    setAssign((a) => ({
      ...a,
      ...Object.fromEntries(
        waiting.map((p, i) => [p.id, order[i % order.length].provider.id])
      ),
    }))
    setSelected(new Set())
  }

  const takerItems = takers.map(({ provider: p, load }) => ({
    value: p.id,
    label: providerName(p),
    load: load + panel.filter((x) => assign[x.id] === p.id).length,
  }))

  if (reviewing)
    return (
      <>
        <StepHeader
          title="Review reassignment"
          description="Check where each patient goes before deactivating."
          onBack={() => setReviewing(false)}
        />
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
          <p className="text-sm">
            {plural(panel.length, "patient")} move from{" "}
            <span className="font-medium">{providerName(provider)}</span> to{" "}
            {plural(groups.length, "provider")}. {first} is then deactivated.
          </p>
          {groups.map((g) => (
            <section key={g.provider.id} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <PersonAvatar
                  name={providerName(g.provider)}
                  photo={g.provider.photo}
                  size="sm"
                />
                <span className="text-sm font-semibold">
                  {providerName(g.provider)}
                </span>
                <span className="text-sm text-muted-foreground">
                  +{g.rows.length}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {g.rows.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-lg border px-3 py-2"
                  >
                    <PersonAvatar name={fullName(p)} photo={p.photo} />
                    <PatientText
                      patient={p}
                      location={loc.name(p.locationId)}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
        <DialogFooter className="mx-0 mb-0 shrink-0 flex-row justify-end gap-2 rounded-b-xl border-t px-6 py-4">
          <Button variant="outline" onClick={() => setReviewing(false)}>
            Back
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Reassign and deactivate
          </Button>
        </DialogFooter>
      </>
    )

  return (
    <>
      <StepHeader
        title={
          panel.length
            ? `Reassign ${first}'s ${plural(panel.length, "patient")}`
            : "Leaving Inlay"
        }
        description="Select patients, pick a provider and assign them, until every patient has a provider."
        onBack={onBack}
        aside={
          panel.length > 0 && (
            <Progress
              value={(assigned / panel.length) * 100}
              className="hidden w-48 items-center gap-2 sm:flex [&>[data-slot=progress-track]]:flex-1"
            >
              <span className="order-last shrink-0 text-xs font-medium tabular-nums">
                {assigned} of {panel.length}
              </span>
            </Progress>
          )
        }
      />

      {panel.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-muted-foreground">
          No patients to reassign
        </p>
      ) : (
        <div className="grid min-h-0 flex-1 auto-rows-max gap-3 overflow-y-auto bg-muted/40 p-4 md:h-[min(36rem,calc(90dvh-9rem))] md:flex-none md:auto-rows-auto md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:grid-rows-1 md:overflow-hidden">
          {/* Left: patients waiting */}
          <Pane
            title={`Waiting for a provider (${waiting.length})`}
            action={
              waiting.length > 0 && (
                <Button variant="ghost" size="sm" onClick={splitRest}>
                  <IconSwitch />
                  Split evenly
                </Button>
              )
            }
          >
            <div className="shrink-0 border-b p-3">
              <SearchBox
                value={query}
                onChange={setQuery}
                placeholder="Search patients"
              />
            </div>
            <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2">
              {shown.map((p) => {
                const on = selected.has(p.id)
                return (
                  <li key={p.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-hover",
                        on &&
                          "bg-primary-surface/50 hover:bg-primary-surface/50"
                      )}
                    >
                      <Checkbox
                        checked={on}
                        onCheckedChange={(next) => toggle(p.id, Boolean(next))}
                        aria-label={`Select ${fullName(p)}`}
                      />
                      <PersonAvatar name={fullName(p)} photo={p.photo} />
                      <PatientText
                        patient={p}
                        location={loc.name(p.locationId)}
                      />
                    </label>
                  </li>
                )
              })}
              {shown.length === 0 && (
                <EmptyNote
                  text={
                    waiting.length === 0
                      ? "Every patient has a provider"
                      : "No patients match"
                  }
                  done={waiting.length === 0}
                />
              )}
            </ul>
            <div className="flex shrink-0 items-center justify-between gap-2 border-t p-3">
              <span className="text-xs text-muted-foreground">
                {picked.length} selected
              </span>
              <Button
                size="sm"
                disabled={!target || picked.length === 0}
                onClick={assignSelected}
              >
                {target
                  ? `Assign to ${target.provider.firstName}`
                  : "Pick a provider"}
                <IconArrowRight />
              </Button>
            </div>
          </Pane>

          {/* Middle: move across */}
          <div className="flex items-center justify-center">
            <Button
              variant="outline"
              size="icon"
              aria-label="Assign selected patients"
              disabled={!target || picked.length === 0}
              onClick={assignSelected}
              className="rotate-90 rounded-full md:rotate-0"
            >
              <IconArrowRight />
            </Button>
          </div>

          {/* Right: the provider taking them on */}
          <Pane title="New provider">
            <div className="flex shrink-0 flex-col gap-3 border-b p-3">
              <ProviderSelect
                label="New provider"
                items={takerItems}
                value={targetId}
                placeholder="Select provider"
                onChange={setTargetId}
              />
              {target && (
                <div className="flex items-center gap-3 rounded-lg bg-primary-surface/50 px-3 py-2.5">
                  <PersonAvatar
                    name={providerName(target.provider)}
                    photo={target.provider.photo}
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">
                      {providerName(target.provider)}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {target.provider.role}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-xs">
                    <span className="block font-medium tabular-nums">
                      {target.load + taken.length} patients
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {target.load} now, +{taken.length}
                    </span>
                  </span>
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center px-4 pt-3 text-xs font-semibold text-muted-foreground">
              Assigned to {target ? target.provider.firstName : "provider"} (
              {taken.length})
            </div>
            <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2">
              {taken.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-hover"
                >
                  <PersonAvatar name={fullName(p)} photo={p.photo} />
                  <PatientText patient={p} location={loc.name(p.locationId)} />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Send ${fullName(p)} back`}
                    onClick={() => unassign(p.id)}
                  >
                    <IconClose />
                  </Button>
                </li>
              ))}
              {taken.length === 0 && (
                <EmptyNote
                  text={
                    target
                      ? "Select patients on the left and assign them"
                      : "Select a provider to start"
                  }
                />
              )}
            </ul>
            {groups.length > 0 && (
              <div className="flex shrink-0 flex-wrap gap-1.5 border-t p-3">
                {groups.map((g) => (
                  <button
                    key={g.provider.id}
                    type="button"
                    onClick={() => setTargetId(g.provider.id)}
                    className={cn(
                      "flex h-7 items-center gap-1.5 rounded-full border bg-background px-2.5 text-xs transition-colors hover:bg-surface-hover",
                      g.provider.id === targetId &&
                        "border-primary bg-primary-surface/50"
                    )}
                  >
                    {providerName(g.provider).split(",")[0]}
                    <span className="font-semibold tabular-nums">
                      {g.rows.length}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Pane>
        </div>
      )}

      <DialogFooter className="mx-0 mb-0 shrink-0 flex-row items-center justify-end gap-2 rounded-b-xl border-t px-6 py-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        {panel.length ? (
          <Button disabled={!done} onClick={() => setReviewing(true)}>
            Review
          </Button>
        ) : (
          <Button variant="destructive" onClick={onConfirm}>
            Deactivate
          </Button>
        )}
      </DialogFooter>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  Pieces                                                                     */
/* -------------------------------------------------------------------------- */

function Pane({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="flex h-[26rem] flex-col overflow-hidden rounded-xl border bg-background md:h-auto md:min-h-0">
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4">
        <h3 className="truncate text-sm font-semibold">{title}</h3>
        {action}
      </header>
      {children}
    </section>
  )
}

function PatientText({
  patient,
  location,
}: {
  patient: Patient
  location: string
}) {
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="truncate text-sm font-medium">{fullName(patient)}</span>
      <span className="truncate text-xs text-muted-foreground">
        {patient.id}, {location}
      </span>
    </span>
  )
}

function EmptyNote({ text, done }: { text: string; done?: boolean }) {
  return (
    <li className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center text-sm text-muted-foreground">
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-full bg-muted [&_svg]:size-5",
          done && "bg-primary-surface text-primary"
        )}
      >
        {done ? <IconCheck /> : <IconUsersGroup />}
      </span>
      {text}
    </li>
  )
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <InputGroup>
      <InputGroupAddon>
        <IconSearch className="size-4" />
      </InputGroupAddon>
      <InputGroupInput
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </InputGroup>
  )
}

export function ProviderSelect({
  label,
  className,
  items,
  value,
  placeholder,
  onChange,
}: {
  label: string
  className?: string
  /** note replaces the patient count, for an item that can't be picked. */
  items: { value: string; label: string; load: number; note?: string }[]
  value: string
  placeholder: string
  onChange: (id: string) => void
}) {
  return (
    <Select
      items={items}
      value={value || null}
      onValueChange={(next: string | null) => next && onChange(next)}
    >
      <SelectTrigger aria-label={label} className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="min-w-72">
        <SelectGroup>
          {items.map((item) => (
            <SelectItem
              key={item.value}
              value={item.value}
              disabled={Boolean(item.note)}
            >
              <span className="flex w-full items-center justify-between gap-4">
                {item.label}
                <span className="text-xs text-muted-foreground tabular-nums">
                  {item.note ?? plural(item.load, "patient")}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

export function PersonAvatar({
  name,
  photo,
  size,
}: {
  name: string
  photo?: string
  size?: "lg" | "sm"
}) {
  return (
    <Avatar
      className={cn(
        "shrink-0 bg-background",
        size === "lg" ? "size-11" : size === "sm" ? "size-7" : "size-8"
      )}
    >
      {photo && <AvatarImage src={photo} alt="" />}
      <AvatarFallback
        className={cn(
          "font-medium",
          size === "sm" && "text-[10px]",
          avatarTone(name)
        )}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  )
}

export function PatientStack({ rows }: { rows: Patient[] }) {
  if (rows.length === 0) return null
  const shown = rows.slice(0, 4)
  return (
    <AvatarGroup className="shrink-0 -space-x-1">
      {shown.map((p) => (
        <PersonAvatar key={p.id} name={fullName(p)} photo={p.photo} size="sm" />
      ))}
      {rows.length > shown.length && (
        <AvatarGroupCount className="size-7 text-xs">
          +{rows.length - shown.length}
        </AvatarGroupCount>
      )}
    </AvatarGroup>
  )
}

export function plural(n: number, noun: string) {
  return `${n} ${noun}${n === 1 ? "" : "s"}`
}
