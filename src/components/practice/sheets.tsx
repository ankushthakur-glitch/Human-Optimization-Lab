"use client"

import * as React from "react"
import { IconEdit, IconLock } from "@/design-system/icons"

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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/design-system/ui/sheet"

/**
 * The right-hand sheet every practice portal form and record opens in. The
 * body mounts with the sheet, so each open starts from a clean draft and a
 * cancelled one never leaks into the next record.
 */
export function SideSheet({
  open,
  onOpenChange,
  wide,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={
          wide
            ? "w-full gap-0 p-0 data-[side=right]:sm:max-w-3xl"
            : "w-full gap-0 p-0 data-[side=right]:sm:max-w-xl"
        }
      >
        {open && children}
      </SheetContent>
    </Sheet>
  )
}

export function SideSheetHeader({
  title,
  description,
  badge,
}: {
  title: string
  /** Read by screen readers only: the portal shows no helper text. */
  description: string
  badge?: React.ReactNode
}) {
  return (
    <SheetHeader className="shrink-0 border-b">
      <SheetTitle className="flex items-center gap-2 pr-10">
        <span className="truncate">{title}</span>
        {badge}
      </SheetTitle>
      <SheetDescription className="sr-only">{description}</SheetDescription>
    </SheetHeader>
  )
}

export function FormFooter({
  formId,
  submitLabel,
  onCancel,
}: {
  formId: string
  submitLabel: string
  onCancel: () => void
}) {
  return (
    <SheetFooter className="mt-0 shrink-0 flex-row items-center justify-end gap-2 border-t p-4">
      <Button variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" form={formId}>
        {submitLabel}
      </Button>
    </SheetFooter>
  )
}

/** A read-only record: sections of Label : Value rows, Edit in the footer. */
export function ViewBody({
  onEdit,
  onClose,
  extra,
  children,
}: {
  onEdit?: () => void
  onClose: () => void
  extra?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto p-6">
        {children}
      </div>
      <SheetFooter className="mt-0 shrink-0 flex-row items-center justify-end gap-2 border-t p-4">
        {extra}
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        {onEdit && (
          <Button onClick={onEdit}>
            <IconEdit />
            Edit info
          </Button>
        )}
      </SheetFooter>
    </>
  )
}

/** Deactivation is the only way to take someone or somewhere offline. */
export function DeactivateDialog({
  target,
  message,
  onConfirm,
  onCancel,
}: {
  /** The name shown in the title; null keeps the dialog closed. */
  target: string | null
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <AlertDialog
      open={target !== null}
      onOpenChange={(open) => !open && onCancel()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <IconLock />
          </AlertDialogMedia>
          <AlertDialogTitle>Deactivate {target}?</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Deactivate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
