"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "@/design-system/ui/sonner"
import {
  IconArrowLeft,
  IconEdit,
  IconEye,
  IconImage,
  IconTrash,
  IconUpload,
} from "@/design-system/icons"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/design-system/ui/avatar"
import { avatarTone } from "@/components/practice/directory"
import { Button } from "@/design-system/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/design-system/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/design-system/ui/dialog"
import { Field, FieldLabel } from "@/design-system/ui/field"

/* The full-page record from the Solid EHR reference: a back arrow and title
   on the canvas with the page's one action on the right, then white section
   cards. Forms use outlined fields whose label sits on the border; views use
   label-over-value columns split by hairlines. */

/* -------------------------------------------------------------------------- */
/*  Frame                                                                      */
/* -------------------------------------------------------------------------- */

export function RecordPage({
  title,
  backHref,
  badge,
  action,
  fill,
  children,
}: {
  title: string
  backHref: string
  badge?: React.ReactNode
  action?: React.ReactNode
  /** For a page that is one table: the body takes the full height and the
      table scrolls inside it instead of the page. */
  fill?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface-sunken">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-4 pt-3 pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Back"
            nativeButton={false}
            render={<Link href={backHref} />}
          >
            <IconArrowLeft />
          </Button>
          <h1 className="truncate text-lg font-semibold tracking-tight">
            {title}
          </h1>
          {badge}
        </div>
        {action}
      </div>
      <div
        className={cn(
          "min-h-0 flex-1 px-4 pb-6",
          fill ? "flex flex-col overflow-hidden" : "overflow-y-auto"
        )}
      >
        <div className={cn("flex flex-col gap-4", fill && "min-h-0 flex-1")}>
          {children}
        </div>
      </div>
    </div>
  )
}

/* Destructive icon buttons carry a soft red tint so they read as delete. */
export const REMOVE_TINT =
  "bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive"

/* The delete button that ends a repeatable row of fields. An invisible label
   keeps it on the inputs' line while the row sits on one line; `labelClassName`
   hides that label at the breakpoints where the row wraps. */
export function RowRemoveButton({
  label,
  onClick,
  className,
  labelClassName,
}: {
  label: string
  onClick: () => void
  className?: string
  labelClassName?: string
}) {
  return (
    <Field className={cn("items-end", className)}>
      <FieldLabel aria-hidden className={cn("invisible", labelClassName)}>
        Remove
      </FieldLabel>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={label}
        className={cn("w-9!", REMOVE_TINT)}
        onClick={onClick}
      >
        <IconTrash />
      </Button>
    </Field>
  )
}

export function RecordCard({
  title,
  action,
  className,
  children,
}: {
  title: string
  action?: React.ReactNode
  className?: string
  children?: React.ReactNode
}) {
  return (
    <Card
      className={cn(
        "min-w-0 gap-3 rounded-lg border shadow-[0_0_5px_rgb(0_0_0/0.06)] ring-0 [--card-spacing:--spacing(5)]",
        className
      )}
    >
      <CardHeader className="min-h-7 items-center">
        <CardTitle
          role="heading"
          aria-level={2}
          className="text-[15px] font-semibold"
        >
          {title}
        </CardTitle>
        {action && <CardAction className="self-center">{action}</CardAction>}
      </CardHeader>
      {children && <CardContent>{children}</CardContent>}
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/*  View                                                                       */
/* -------------------------------------------------------------------------- */

export type DetailItem = {
  label: string
  value: React.ReactNode
  /** Spans the whole row, for addresses and free text. */
  wide?: boolean
}

/**
 * Label over value, in columns split by a hairline. The grid is pulled left
 * under a clipping wrapper so the first column's rule falls outside the card
 * and its text lines up with the card title.
 */
export function DetailGrid({
  items,
  className,
}: {
  items: DetailItem[]
  /** Column counts, e.g. "sm:grid-cols-2 lg:grid-cols-4". */
  className?: string
}) {
  return (
    <div className="min-w-0 overflow-hidden">
      <dl className={cn("-ml-4 grid grid-cols-1 gap-y-4", className)}>
        {items.map((item) => {
          const empty = item.value === "" || item.value == null
          return (
            <div
              key={item.label}
              className={cn(
                "min-w-0 border-l pr-4 pl-4",
                item.wide && "col-span-full"
              )}
            >
              <dt className="text-xs text-muted-foreground">{item.label}</dt>
              <dd
                className={cn(
                  "mt-1 text-sm break-words",
                  empty && "text-muted-foreground/70"
                )}
              >
                {empty ? "Not provided" : item.value}
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Pictures                                                                   */
/* -------------------------------------------------------------------------- */

const MAX_PHOTO = 2 * 1024 * 1024

function readImage(file: File | undefined, onRead: (dataUrl: string) => void) {
  if (!file) return
  if (!file.type.startsWith("image/")) {
    toast.error("Choose an image file (PNG or JPG).")
    return
  }
  if (file.size > MAX_PHOTO) {
    toast.error("Choose an image under 2 MB.")
    return
  }
  const reader = new FileReader()
  reader.onload = () => onRead(String(reader.result))
  reader.readAsDataURL(file)
}

function useImagePicker(onRead: (dataUrl: string) => void) {
  const ref = React.useRef<HTMLInputElement>(null)
  const input = (
    <input
      ref={ref}
      type="file"
      accept="image/png,image/jpeg"
      className="sr-only"
      tabIndex={-1}
      onChange={(event) => {
        readImage(event.target.files?.[0], onRead)
        event.target.value = ""
      }}
    />
  )
  return { open: () => ref.current?.click(), input }
}

/** The form's profile picture slot: labelled like its neighbours so the
    dashed upload (then the file chip) lines up with the input boxes. */
export function PhotoField({
  value,
  onChange,
}: {
  value: string
  onChange: (dataUrl: string) => void
}) {
  const picker = useImagePicker(onChange)
  const [preview, setPreview] = React.useState(false)

  return (
    <Field>
      {picker.input}
      <FieldLabel>Profile picture</FieldLabel>
      {!value ? (
        <Button
          type="button"
          variant="outline"
          onClick={picker.open}
          className="w-full gap-2 border-dashed border-primary-tint/70 bg-transparent text-primary-tint hover:bg-primary-surface/50 hover:text-primary-tint"
        >
          <IconUpload />
          Upload picture
        </Button>
      ) : (
        <div className="flex h-9 items-center gap-2 rounded-lg bg-input/50 pr-0.5 pl-1.5">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-primary-surface text-primary-tint">
            <IconImage className="size-4" />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm">
            Profile picture
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Preview picture"
            onClick={() => setPreview(true)}
          >
            <IconEye />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Replace picture"
            onClick={picker.open}
          >
            <IconUpload />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Remove picture"
            className={REMOVE_TINT}
            onClick={() => onChange("")}
          >
            <IconTrash />
          </Button>
        </div>
      )}
      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Profile picture</DialogTitle>
            <DialogDescription className="sr-only">
              Preview of the uploaded picture.
            </DialogDescription>
          </DialogHeader>
          {/* eslint-disable-next-line @next/next/no-img-element -- a local data URL */}
          <img
            src={value}
            alt="Profile"
            className="aspect-square w-full rounded-md object-cover"
          />
        </DialogContent>
      </Dialog>
    </Field>
  )
}

/** The view's round portrait, with a small button to change it in place. */
export function ProfileAvatar({
  name,
  photo,
  onChange,
}: {
  name: string
  photo: string
  onChange: (dataUrl: string) => void
}) {
  const picker = useImagePicker((url) => {
    onChange(url)
    toast.success("Profile picture updated")
  })
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
  return (
    <div className="relative size-24 shrink-0">
      {picker.input}
      <Avatar className="size-24 border">
        {photo && <AvatarImage src={photo} alt={name} />}
        <AvatarFallback className={cn("text-xl font-medium", avatarTone(name))}>
          {initials}
        </AvatarFallback>
      </Avatar>
      <Button
        variant="outline"
        size="icon-xs"
        aria-label="Change profile picture"
        className="absolute right-0 bottom-1 bg-card text-primary-tint"
        onClick={picker.open}
      >
        <IconEdit />
      </Button>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Signature                                                                  */
/* -------------------------------------------------------------------------- */

/** Draw a signature with a mouse, pen or finger; saves a PNG data URL. */
export function SignatureDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (dataUrl: string) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open && (
          <SignaturePad onCancel={() => onOpenChange(false)} onSave={onSave} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function SignaturePad({
  onCancel,
  onSave,
}: {
  onCancel: () => void
  onSave: (dataUrl: string) => void
}) {
  const canvas = React.useRef<HTMLCanvasElement>(null)
  const drawing = React.useRef(false)
  const [drawn, setDrawn] = React.useState(false)

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvas.current!
    const rect = c.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * c.width,
      y: ((event.clientY - rect.top) / rect.height) * c.height,
    }
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvas.current?.getContext("2d")
    if (!ctx) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drawing.current = true
    const { x, y } = point(event)
    ctx.lineWidth = 2.5
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = "#1f2937"
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    const ctx = canvas.current?.getContext("2d")
    if (!ctx) return
    const { x, y } = point(event)
    ctx.lineTo(x, y)
    ctx.stroke()
    setDrawn(true)
  }

  function clear() {
    const c = canvas.current
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height)
    setDrawn(false)
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Signature</DialogTitle>
        <DialogDescription className="sr-only">
          Draw the signature in the box.
        </DialogDescription>
      </DialogHeader>
      <canvas
        ref={canvas}
        width={960}
        height={320}
        aria-label="Signature pad"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={() => (drawing.current = false)}
        onPointerLeave={() => (drawing.current = false)}
        className="h-40 w-full touch-none rounded-md border border-dashed bg-surface-sunken"
      />
      <DialogFooter className="flex-row items-center justify-between sm:justify-between">
        <Button variant="ghost" onClick={clear} disabled={!drawn}>
          Clear
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            disabled={!drawn}
            onClick={() => onSave(canvas.current!.toDataURL("image/png"))}
          >
            Save signature
          </Button>
        </div>
      </DialogFooter>
    </>
  )
}
