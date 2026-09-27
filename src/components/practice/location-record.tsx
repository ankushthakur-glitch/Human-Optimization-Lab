"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "@/design-system/ui/sonner"
import {
  IconCopy,
  IconEdit,
  IconLock,
  IconLockOpen,
  IconMoreVertical,
} from "@/design-system/icons"

import {
  EMAIL,
  type Errors,
  VALIDATE,
  SelectField,
  TextField,
  digits,
  focusFirstError,
  formatPhone,
} from "@/components/form-kit"
import { StatusBadge } from "@/components/practice/directory"
import {
  type Location,
  type LocationInput,
  type LocationStatus,
  PLACES_OF_SERVICE,
  SPECIALTY_TYPES,
  TIME_ZONES,
  US_STATES,
  createLocation,
  emptyLocation,
  locations,
  personAddress,
  providers,
  time12,
} from "@/components/practice/practice-data"
import { PracticeShell } from "@/components/practice/practice-shell"
import { validNpi } from "@/components/practice/provider-record"
import {
  DetailGrid,
  PhotoField,
  ProfileAvatar,
  RecordCard,
  RecordPage,
} from "@/components/practice/record-page"
import { DeactivateDialog } from "@/components/practice/sheets"
import { Badge } from "@/design-system/ui/badge"
import { Button } from "@/design-system/ui/button"
import { Checkbox } from "@/design-system/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/design-system/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/design-system/ui/empty"
import { Field, FieldError } from "@/design-system/ui/field"
import { Input } from "@/design-system/ui/input"
import { Skeleton } from "@/design-system/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/design-system/ui/tooltip"
import { Illustration } from "@/components/illustrations/illustration"

const LIST_HREF = "/screens/practice/locations"
export const locationHref = (id: string) => `${LIST_HREF}/${id}`

const GRID = "grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
const ADDRESS_GRID = "grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-5"

/* ##-####### while typing. */
function formatFtin(value: string) {
  const d = digits(value).slice(0, 9)
  return d.length <= 2 ? d : `${d.slice(0, 2)}-${d.slice(2)}`
}

function validate(v: LocationInput, others: Location[]): Errors {
  const e: Errors = {}
  if (!VALIDATE) return e
  if (!v.name.trim()) e.name = "Enter a location name."
  else if (
    others.some((l) => l.name.toLowerCase() === v.name.trim().toLowerCase())
  )
    e.name = "Another location has this name."
  if (!v.phone) e.phone = "Enter a contact number."
  else if (digits(v.phone).length !== 10) e.phone = "Enter 10 digits."
  if (!v.placeOfService) e.placeOfService = "Select a place of service."
  if (v.email && !EMAIL.test(v.email.trim()))
    e.email = "Enter a valid email address."
  if (!v.timeZone) e.timeZone = "Select a time zone."
  if (v.groupNpi && !validNpi(v.groupNpi))
    e.groupNpi = "Enter a valid 10-digit NPI."
  if (v.fax && digits(v.fax).length !== 10) e.fax = "Enter 10 digits."
  if (v.ftin && digits(v.ftin).length !== 9) e.ftin = "Enter all 9 digits."
  if (v.website && !/^https?:\/\/[^\s.]+\.[^\s]+$/.test(v.website))
    e.website = "Start with https:// and include the domain."
  if (!v.address1.trim()) e.address1 = "Enter the street address."
  if (!/^\d{5}$/.test(v.zip)) e.zip = "Enter a 5-digit ZIP code."
  if (!v.city.trim()) e.city = "Enter a city."
  if (!v.state) e.state = "Select a state."
  v.hours.forEach((h, i) => {
    if (h.open && (!h.start || !h.end || h.end <= h.start))
      e[`hours${i}`] = "End after start."
  })
  return e
}

/* -------------------------------------------------------------------------- */
/*  Add / edit page                                                            */
/* -------------------------------------------------------------------------- */

export function LocationFormPage({ id }: { id?: string }) {
  const { items, ready } = locations.use()
  const location = id ? items.find((l) => l.id === id) : undefined
  if (id && !location) return <Missing ready={ready} />
  return (
    <PracticeShell active="locations">
      <LocationForm key={location?.id ?? "new"} location={location} />
    </PracticeShell>
  )
}

function LocationForm({ location }: { location?: Location }) {
  const router = useRouter()
  const { items } = locations.use()
  const [values, setValues] = React.useState<LocationInput>(() =>
    location ? structuredClone(location) : emptyLocation()
  )
  const [status, setStatus] = React.useState<LocationStatus>(
    location?.status ?? "Active"
  )
  const [attempted, setAttempted] = React.useState(false)
  const others = items.filter((l) => l.id !== location?.id)
  const errors = attempted ? validate(values, others) : {}

  const set =
    <K extends keyof LocationInput>(key: K) =>
    (value: LocationInput[K]) =>
      setValues((prev) => ({ ...prev, [key]: value }))
  const text =
    (key: keyof LocationInput, format?: (v: string) => string) =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
      set(key)(
        (format ? format(event.target.value) : event.target.value) as never
      )

  function setDay(i: number, changes: Partial<LocationInput["hours"][number]>) {
    setValues((prev) => ({
      ...prev,
      hours: prev.hours.map((h, j) => (j === i ? { ...h, ...changes } : h)),
    }))
  }

  /* The copy button puts one day's hours on every other open day. */
  function copyToAll(i: number) {
    const { start, end } = values.hours[i]
    setValues((prev) => ({
      ...prev,
      hours: prev.hours.map((h) => (h.open ? { ...h, start, end } : h)),
    }))
    toast.success(`${values.hours[i].day} hours copied to every open day`)
  }

  const allOpen = values.hours.every((h) => h.open)
  const someOpen = values.hours.some((h) => h.open)

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAttempted(true)
    const found = validate(values, others)
    if (focusFirstError(found, "location")) {
      toast.error("Some details need attention.")
      return
    }
    const clean: LocationInput = {
      ...values,
      name: values.name.trim(),
      email: values.email.trim(),
    }
    if (location) {
      locations.patch(location.id, { ...clean, status })
      toast.success("Location updated", { description: clean.name })
      router.push(locationHref(location.id))
    } else {
      const created = createLocation(clean)
      toast.success("Location added", { description: clean.name })
      router.push(locationHref(created.id))
    }
  }

  return (
    <RecordPage
      title={location ? `Edit ${location.name}` : "Add location"}
      backHref={location ? locationHref(location.id) : LIST_HREF}
      action={
        <Button type="submit" form="location-page-form">
          Save &amp; close
        </Button>
      }
    >
      <form
        id="location-page-form"
        noValidate
        onSubmit={submit}
        className="flex flex-col gap-4"
      >
        <RecordCard title="Basic details">
          <div className={GRID}>
            <TextField
              id="location-name"
              label="Location name"
              required
              value={values.name}
              onChange={text("name")}
              error={errors.name}
            />
            <TextField
              id="location-phone"
              label="Contact number"
              required
              type="tel"
              value={values.phone}
              onChange={text("phone", formatPhone)}
              error={errors.phone}
            />
            <TextField
              id="location-contactPerson"
              label="Contact person name"
              value={values.contactPerson}
              onChange={text("contactPerson")}
            />
            <SelectField
              id="location-placeOfService"
              label="Place of service"
              required
              options={PLACES_OF_SERVICE}
              value={values.placeOfService}
              onChange={set("placeOfService")}
              error={errors.placeOfService}
            />
            <SelectField
              id="location-specialtyType"
              label="Specialty type"
              options={SPECIALTY_TYPES}
              value={values.specialtyType}
              onChange={set("specialtyType")}
            />
            <TextField
              id="location-specialtyCode"
              label="Specialty code"
              value={values.specialtyCode}
              onChange={text("specialtyCode", (v) => v.toUpperCase())}
            />
            <TextField
              id="location-email"
              label="Email"
              type="email"
              autoComplete="off"
              value={values.email}
              onChange={text("email")}
              error={errors.email}
            />
            <SelectField
              id="location-timeZone"
              label="Time zone"
              required
              options={TIME_ZONES}
              value={values.timeZone}
              onChange={set("timeZone")}
              error={errors.timeZone}
            />
            <TextField
              id="location-groupNpi"
              label="Group NPI number"
              inputMode="numeric"
              maxLength={10}
              value={values.groupNpi}
              onChange={text("groupNpi", digits)}
              error={errors.groupNpi}
            />
            <TextField
              id="location-fax"
              label="Fax"
              type="tel"
              value={values.fax}
              onChange={text("fax", formatPhone)}
              error={errors.fax}
            />
            <TextField
              id="location-taxonomyCode"
              label="Taxonomy code"
              value={values.taxonomyCode}
              onChange={text("taxonomyCode", (v) => v.toUpperCase())}
            />
            <TextField
              id="location-ftin"
              label="FTIN"
              inputMode="numeric"
              placeholder="##-#######"
              value={values.ftin}
              onChange={text("ftin", formatFtin)}
              error={errors.ftin}
            />
            <TextField
              id="location-website"
              label="Website"
              type="url"
              placeholder="https://"
              value={values.website}
              onChange={text("website")}
              error={errors.website}
            />
            <PhotoField value={values.photo} onChange={set("photo")} />
            {location && !location.primary && (
              <SelectField
                id="location-status"
                label="Status"
                options={["Active", "Inactive"]}
                value={status}
                onChange={(v) => setStatus((v || "Active") as LocationStatus)}
              />
            )}
          </div>
        </RecordCard>

        <RecordCard title="Practice address">
          <div className={ADDRESS_GRID}>
            <TextField
              id="location-address1"
              label="Address line 1"
              required
              value={values.address1}
              onChange={text("address1")}
              error={errors.address1}
            />
            <TextField
              id="location-address2"
              label="Address line 2"
              value={values.address2}
              onChange={text("address2")}
            />
            <TextField
              id="location-zip"
              label="ZIP code"
              required
              inputMode="numeric"
              maxLength={5}
              value={values.zip}
              onChange={text("zip", digits)}
              error={errors.zip}
            />
            <TextField
              id="location-city"
              label="City"
              required
              value={values.city}
              onChange={text("city")}
              error={errors.city}
            />
            <SelectField
              id="location-state"
              label="State"
              required
              options={US_STATES}
              value={values.state}
              onChange={set("state")}
              error={errors.state}
            />
          </div>
        </RecordCard>

        <RecordCard title="Working hours">
          <Table
            containerClassName="overflow-hidden rounded-md border"
            className="table-fixed"
          >
            <TableHeader className="bg-surface-head [&_th]:h-auto [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-xs [&_th]:text-muted-foreground">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[41%]">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={allOpen}
                      indeterminate={someOpen && !allOpen}
                      onCheckedChange={() =>
                        set("hours")(
                          values.hours.map((h) => ({ ...h, open: !allOpen }))
                        )
                      }
                      aria-label="Open every day"
                    />
                    Day
                  </div>
                </TableHead>
                <TableHead>Start time</TableHead>
                <TableHead>End time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_td]:px-4 [&_td]:py-2.5 [&_td]:align-top">
              {values.hours.map((h, i) => (
                <TableRow key={h.day} className="hover:bg-transparent">
                  <TableCell>
                    <div className="flex h-9 items-center gap-3">
                      <Checkbox
                        checked={h.open}
                        onCheckedChange={(c) => setDay(i, { open: c === true })}
                        aria-label={`Open on ${h.day}`}
                      />
                      <span className="min-w-24 text-sm">{h.day}</span>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="text-primary-tint"
                              aria-label={`Copy ${h.day} hours to every open day`}
                              disabled={!h.open}
                              onClick={() => copyToAll(i)}
                            />
                          }
                        >
                          <IconCopy />
                        </TooltipTrigger>
                        <TooltipContent>Copy to every open day</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      id={`location-hours${i}`}
                      type="time"
                      aria-label={`${h.day} start time`}
                      disabled={!h.open}
                      value={h.start}
                      onChange={(e) => setDay(i, { start: e.target.value })}
                      aria-invalid={errors[`hours${i}`] ? true : undefined}
                      className="max-w-44"
                    />
                  </TableCell>
                  <TableCell>
                    <Field
                      data-invalid={errors[`hours${i}`] ? true : undefined}
                    >
                      <Input
                        type="time"
                        aria-label={`${h.day} end time`}
                        disabled={!h.open}
                        value={h.end}
                        onChange={(e) => setDay(i, { end: e.target.value })}
                        aria-invalid={errors[`hours${i}`] ? true : undefined}
                        className="max-w-44"
                      />
                      {errors[`hours${i}`] && (
                        <FieldError>{errors[`hours${i}`]}</FieldError>
                      )}
                    </Field>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </RecordCard>
      </form>
    </RecordPage>
  )
}

/* -------------------------------------------------------------------------- */
/*  Details page                                                               */
/* -------------------------------------------------------------------------- */

export function LocationProfile({ id }: { id: string }) {
  const { items, ready } = locations.use()
  const location = items.find((l) => l.id === id)
  if (!location) return <Missing ready={ready} />
  return (
    <PracticeShell active="locations">
      <ProfileBody location={location} />
    </PracticeShell>
  )
}

function ProfileBody({ location: l }: { location: Location }) {
  const { items: allProviders } = providers.use()
  const [deactivating, setDeactivating] = React.useState(false)
  const providerCount = allProviders.filter(
    (p) => p.status !== "Inactive" && p.locationIds.includes(l.id)
  ).length

  return (
    <RecordPage
      title={l.name}
      backHref={LIST_HREF}
      badge={l.primary ? <Badge variant="info">Primary</Badge> : undefined}
      action={
        <div className="flex items-center gap-2">
          <Button
            nativeButton={false}
            render={<Link href={`${locationHref(l.id)}/edit`} />}
          >
            <IconEdit />
            Edit info
          </Button>
          {/* The practice's primary location can't go offline. */}
          {!l.primary && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="More actions"
                  >
                    <IconMoreVertical />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => {
                      if (l.status === "Active") return setDeactivating(true)
                      locations.patch(l.id, { status: "Active" })
                      toast.success(`${l.name} is active again`)
                    }}
                  >
                    {l.status === "Active" ? <IconLock /> : <IconLockOpen />}
                    {l.status === "Active" ? "Deactivate" : "Activate"}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      }
    >
      <RecordCard title="Basic details">
        <div className="flex flex-col gap-5 md:flex-row">
          <ProfileAvatar
            name={l.name}
            photo={l.photo}
            onChange={(photo) => locations.patch(l.id, { photo })}
          />
          <div className="min-w-0 flex-1">
            <DetailGrid
              className="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
              items={[
                { label: "Location ID", value: l.id },
                { label: "Location name", value: l.name },
                { label: "Contact person name", value: l.contactPerson },
                { label: "Place of service", value: l.placeOfService },
                { label: "Specialty type", value: l.specialtyType },
                { label: "Specialty code", value: l.specialtyCode },
                { label: "Email", value: l.email },
                { label: "Time zone", value: l.timeZone },
                { label: "Group NPI number", value: l.groupNpi },
                { label: "Fax", value: l.fax },
                { label: "Taxonomy code", value: l.taxonomyCode },
                { label: "FTIN", value: l.ftin },
                { label: "Contact number", value: l.phone },
                {
                  label: "Website",
                  value: l.website && (
                    <Button
                      variant="link"
                      className="h-auto justify-start p-0 text-left font-normal [overflow-wrap:anywhere] whitespace-normal"
                      nativeButton={false}
                      render={
                        <a href={l.website} target="_blank" rel="noreferrer" />
                      }
                    >
                      {l.website.replace(/^https?:\/\//, "")}
                    </Button>
                  ),
                },
                { label: "Providers", value: providerCount },
                { label: "Status", value: <StatusBadge status={l.status} /> },
              ]}
            />
          </div>
        </div>
      </RecordCard>

      <RecordCard title="Address">
        <DetailGrid
          className="md:grid-cols-2"
          items={[{ label: "Practice address", value: personAddress(l) }]}
        />
      </RecordCard>

      <RecordCard title="Working hours">
        <DetailGrid
          className="sm:grid-cols-4 lg:grid-cols-7"
          items={l.hours.map((h) => ({
            label: h.day,
            value: h.open ? `${time12(h.start)} - ${time12(h.end)}` : "Closed",
          }))}
        />
      </RecordCard>

      <DeactivateDialog
        illustration="deactivate-location"
        target={deactivating ? l.name : null}
        message="Patients can no longer be booked here and it leaves provider and staff pickers. Its records stay."
        onCancel={() => setDeactivating(false)}
        onConfirm={() => {
          locations.patch(l.id, { status: "Inactive" })
          toast.success(`${l.name} is deactivated`)
          setDeactivating(false)
        }}
      />
    </RecordPage>
  )
}

function Missing({ ready }: { ready: boolean }) {
  return (
    <PracticeShell active="locations">
      {!ready ? (
        <div className="flex flex-col gap-4 p-6">
          <Skeleton className="h-6 w-60" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <Empty className="flex-1">
          <EmptyHeader>
            <EmptyMedia>
              <Illustration name="record-not-found" />
            </EmptyMedia>
            <EmptyTitle>Location not found</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={LIST_HREF} />}
            >
              Back to locations
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </PracticeShell>
  )
}
