"use client"

import * as React from "react"
import { toast } from "@/design-system/ui/sonner"

import {
  PatientStack,
  PersonAvatar,
  ProviderSelect,
  plural,
} from "@/components/practice/deactivate-provider"
import {
  type Patient,
  fullName,
  patients,
  providerName,
  providers,
  useLocationLookup,
  useProviderLookup,
} from "@/components/practice/practice-data"
import { Button } from "@/design-system/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/design-system/ui/dialog"

/* Hands one patient, or a selection, to another primary provider from the
   patient list. Only active providers who work at every patient's location
   can take them on; a closed record keeps its provider. */

/** The patients a provider can be changed for: every open record. */
export const canReassign = (p: Patient) => p.status !== "Inactive"

export function ReassignProviderDialog({
  rows,
  onClose,
  onDone,
}: {
  /** null keeps the dialog closed. */
  rows: Patient[] | null
  onClose: () => void
  /** After the reassign, before closing. */
  onDone?: () => void
}) {
  return (
    <Dialog open={rows !== null} onOpenChange={(o) => !o && onClose()}>
      {rows && rows.length > 0 && <Body rows={rows} onClose={onClose} onDone={onDone} />}
    </Dialog>
  )
}

function Body({
  rows,
  onClose,
  onDone,
}: {
  rows: Patient[]
  onClose: () => void
  onDone?: () => void
}) {
  const { items: allPatients } = patients.use()
  const { items: allProviders } = providers.use()
  const loc = useLocationLookup()
  const prov = useProviderLookup()
  const [targetId, setTargetId] = React.useState("")

  const one = rows.length === 1 ? rows[0] : null
  const locationIds = [...new Set(rows.map((p) => p.locationId))]

  const items = allProviders
    .filter((p) => p.status === "Active")
    .map((p) => {
      const load = allPatients.filter(
        (x) => x.providerId === p.id && canReassign(x)
      ).length
      const covers = locationIds.every((id) => p.locationIds.includes(id))
      const note = rows.every((x) => x.providerId === p.id)
        ? "Current"
        : !covers
          ? one
            ? `Not at ${loc.name(one.locationId)}`
            : "Not at every location"
          : undefined
      return { value: p.id, label: providerName(p), load, note }
    })
    .sort((a, b) => Number(Boolean(a.note)) - Number(Boolean(b.note)))

  const target = allProviders.find((p) => p.id === targetId)
  const moving = rows.filter((p) => p.providerId !== targetId)

  const reassign = () => {
    if (!target) return
    for (const p of moving) patients.patch(p.id, { providerId: target.id })
    toast.success(
      one
        ? `${fullName(one)} reassigned`
        : `${plural(moving.length, "patient")} reassigned`,
      { description: `${providerName(target)} is now the primary provider.` }
    )
    onDone?.()
    onClose()
  }

  return (
    <DialogContent className="flex flex-col gap-0 rounded-xl p-0 sm:max-w-md">
      <DialogHeader className="gap-4 px-6 pt-6 pb-2">
        <div className="flex items-center gap-3 pr-8">
          {one ? (
            <PersonAvatar name={fullName(one)} photo={one.photo} size="lg" />
          ) : (
            <PatientStack rows={rows} />
          )}
          <div className="flex min-w-0 flex-col gap-0.5">
            <DialogTitle className="truncate text-base font-semibold">
              Reassign provider
            </DialogTitle>
            <span className="truncate text-sm text-muted-foreground">
              {one
                ? `${fullName(one)}, ${one.id}`
                : plural(rows.length, "patient")}
            </span>
          </div>
        </div>
        <DialogDescription className="sr-only">
          Pick the new primary provider.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4 px-6 pt-2 pb-6">
        {one && (
          <p className="text-sm">
            <span className="text-muted-foreground">Current provider : </span>
            <span className="font-medium">{prov.name(one.providerId)}</span>
          </p>
        )}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">New provider</span>
          <ProviderSelect
            label="New provider"
            items={items}
            value={targetId}
            placeholder="Select provider"
            onChange={setTargetId}
          />
        </div>
      </div>

      <DialogFooter className="mx-0 mb-0 flex-row justify-end gap-2 rounded-b-xl border-t px-6 py-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={!target || moving.length === 0} onClick={reassign}>
          Reassign
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
