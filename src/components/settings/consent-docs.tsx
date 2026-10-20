"use client"

import * as React from "react"
import { toast } from "@/design-system/ui/sonner"
import { IconEdit, IconEye, IconHistory } from "@/design-system/icons"

import { DateField } from "@/components/form-kit"
import { NAME_LINK, RowMenu } from "@/components/practice/directory"
import { usDate } from "@/components/practice/practice-data"
import { createCollection } from "@/components/practice/collection-store"
import {
  SettingsFrame,
  SettingsTable,
  StatusDot,
} from "@/components/settings/settings-kit"
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
import { TableCell, TableRow } from "@/design-system/ui/table"
import { Textarea } from "@/design-system/ui/textarea"

/* The documents the patient app's consent screen links to (authorization,
   privacy policy, terms and the rest), kept by the Inlay team and versioned
   over time. Publishing makes a new version; the app shows the current one
   with its version and the day it took effect. The starting text matches
   the app's (mobile/src/lib/consent.ts); {practice_name} is filled in for
   each patient. */

const ACTOR = "Maya Chen"
const today = () => new Date().toISOString().slice(0, 10)

export type DocVersion = {
  version: number
  effective: string
  text: string
  publishedBy: string
  publishedOn: string
  /** Patients who accepted an earlier version are asked to accept again. */
  reaccept: boolean
}

export type ConsentDoc = {
  id: string
  title: string
  versions: DocVersion[]
}

const v1 = (text: string[]): DocVersion => ({
  version: 1,
  effective: "2026-09-22",
  text: text.join("\n\n"),
  publishedBy: "Maya Chen",
  publishedOn: "2026-09-22",
  reaccept: false,
})

const SEED: ConsentDoc[] = [
  {
    id: "authorization",
    title: "HIPAA authorization",
    versions: [
      v1([
        "I authorize Inlay Health to request, receive and store my health records from my healthcare providers, hospitals, laboratories and imaging centers, through national health information networks, and to share them with {practice_name} for my care.",
        "This includes visit notes, lab results, medications, conditions, allergies, procedures, immunizations and reports. It may include sensitive information such as mental health or substance use records where the law allows.",
        "Inlay Health protects this information as required by HIPAA. Information shared under this authorization may no longer be protected by federal privacy law if it is disclosed again by the recipient.",
        "This authorization lasts for the period I choose, and I will be asked before it is renewed. I can withdraw it at any time in the app, which stops future collection but does not undo information already shared. Inlay Health records the date I signed it and exactly what it covers.",
        "My treatment by my practice does not depend on signing this authorization.",
      ]),
    ],
  },
  {
    id: "privacy",
    title: "Privacy policy",
    versions: [
      v1([
        "Inlay Health collects the health records you authorize, the answers you give in the app and how you use it, to build your record and support your care.",
        "We share your information with {practice_name} and the services that run Inlay for us, under agreements that protect it. We never sell it.",
        "You can see your information, ask us to correct it and turn sharing off at any time in the app.",
      ]),
      {
        version: 2,
        effective: "2026-10-01",
        text: [
          "Inlay Health collects the health records you authorize, the answers you give in the app and how you use it, to build your record and support your care.",
          "We share your information with {practice_name}, the labs you choose and the services that run Inlay for us, under agreements that protect it. We never sell it.",
          "You can see your information, ask us to correct it and turn sharing off at any time in the app.",
        ].join("\n\n"),
        publishedBy: "Maya Chen",
        publishedOn: "2026-09-29",
        reaccept: false,
      },
    ],
  },
  {
    id: "terms",
    title: "Terms of service",
    versions: [
      v1([
        "Inlay Health gives you a copy of your health record, tools to understand it and a way to work on it with your practice. It does not replace your doctor or emergency care. In an emergency, call 911.",
        "You agree to give accurate information, keep your password private and use the app for your own care.",
        "Your free record stays free. Paid plans are billed as shown before you join, and you can cancel at any time.",
        "We will tell you in the app before these terms change.",
      ]),
    ],
  },
  {
    id: "lab",
    title: "Lab request terms",
    versions: [
      v1([
        "When you book a test through Inlay, a licensed physician reviews the request and orders it, and a partner lab collects your sample and runs the test.",
        "Your results go to your record and to your practice, whose doctors review anything that needs follow up.",
        "Tests paid through Inlay are billed at the price shown when you book, not to your insurance.",
      ]),
    ],
  },
  {
    id: "texts",
    title: "Messaging terms",
    versions: [
      v1([
        "Inlay Health will text and message you about your care, such as new results, reminders and notes from your care team. How often depends on your care.",
        "Message and data rates may apply. Reply “Stop” at any time to stop texts, or “Help” for help. You can also turn texts off in Profile.",
        "Agreeing to texts is not required to use Inlay.",
      ]),
    ],
  },
]

export const consentDocs = createCollection(
  "hol-settings-consent-docs",
  SEED,
  "consent-v1"
)

/** The version patients see today: the newest one already in effect. */
function current(doc: ConsentDoc) {
  const live = doc.versions.filter((v) => v.effective <= today())
  return live[live.length - 1] ?? doc.versions[0]
}

/** A published version that has not taken effect yet. */
function upcoming(doc: ConsentDoc) {
  return doc.versions.find((v) => v.effective > today())
}

type Open =
  | { kind: "edit"; doc: ConsentDoc }
  | { kind: "history"; doc: ConsentDoc }
  | { kind: "view"; doc: ConsentDoc; version: DocVersion }

export function ConsentDocsPage() {
  const { items } = consentDocs.use()
  const [open, setOpen] = React.useState<Open | null>(null)

  return (
    <SettingsFrame>
      <SettingsTable
        equal
        columns={[
          { header: "Document" },
          { header: "Version" },
          { header: "Effective" },
          { header: "Published by", className: "hidden md:table-cell" },
          { header: "Next version", className: "hidden lg:table-cell" },
          { header: "Actions", className: "w-24 text-right" },
        ]}
      >
        {items.map((doc) => {
          const live = current(doc)
          const next = upcoming(doc)
          return (
            <TableRow key={doc.id}>
              <TableCell>
                <Button
                  variant="link"
                  className={`${NAME_LINK} font-medium text-primary-tint`}
                  onClick={() => setOpen({ kind: "view", doc, version: live })}
                >
                  {doc.title}
                </Button>
              </TableCell>
              <TableCell className="tabular-nums">{live.version}</TableCell>
              <TableCell className="tabular-nums">
                {usDate(live.effective)}
              </TableCell>
              <TableCell className="hidden text-foreground/80 md:table-cell">
                {live.publishedBy}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {next ? (
                  <StatusDot tone="warning">
                    {next.version}, from {usDate(next.effective)}
                  </StatusDot>
                ) : (
                  <span className="text-muted-foreground">None</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <RowMenu label={`Actions for ${doc.title}`}>
                  <DropdownMenuItem
                    onClick={() =>
                      setOpen({ kind: "view", doc, version: live })
                    }
                  >
                    <IconEye />
                    View
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setOpen({ kind: "edit", doc })}
                  >
                    <IconEdit />
                    New version
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setOpen({ kind: "history", doc })}
                  >
                    <IconHistory />
                    Version history
                  </DropdownMenuItem>
                </RowMenu>
              </TableCell>
            </TableRow>
          )
        })}
      </SettingsTable>

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
          {open?.kind === "edit" && (
            <VersionForm doc={open.doc} onClose={() => setOpen(null)} />
          )}
          {open?.kind === "history" && (
            <History
              doc={open.doc}
              onView={(version) =>
                setOpen({ kind: "view", doc: open.doc, version })
              }
              onClose={() => setOpen(null)}
            />
          )}
          {open?.kind === "view" && (
            <ViewVersion
              doc={open.doc}
              version={open.version}
              onEdit={() => setOpen({ kind: "edit", doc: open.doc })}
              onClose={() => setOpen(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </SettingsFrame>
  )
}

function Frame({
  title,
  footer,
  children,
}: {
  title: string
  footer: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex max-h-[90vh] flex-col">
      <DialogHeader className="border-b px-5 py-4">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className="sr-only">{title}</DialogDescription>
      </DialogHeader>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
        {children}
      </div>
      <DialogFooter className="mx-0 mb-0 flex-row justify-end gap-2 border-t px-5 py-3">
        {footer}
      </DialogFooter>
    </div>
  )
}

/** Publishing a new version: the text, the day it takes effect, and whether
    patients who accepted the old one must accept again. */
function VersionForm({
  doc,
  onClose,
}: {
  doc: ConsentDoc
  onClose: () => void
}) {
  const latest = doc.versions[doc.versions.length - 1]
  const [text, setText] = React.useState(latest.text)
  const [effective, setEffective] = React.useState(today())
  const [reaccept, setReaccept] = React.useState(false)
  const next = latest.version + 1
  const unchanged = text.trim() === latest.text.trim()

  function publish() {
    consentDocs.patch(doc.id, {
      versions: [
        ...doc.versions,
        {
          version: next,
          effective: effective || today(),
          text: text.trim(),
          publishedBy: ACTOR,
          publishedOn: today(),
          reaccept,
        },
      ],
    })
    toast.success(`${doc.title} version ${next} published`)
    onClose()
  }

  return (
    <Frame
      title={`${doc.title}: version ${next}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={unchanged || !text.trim()} onClick={publish}>
            Publish version {next}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-[14rem_1fr] sm:items-end">
        <DateField
          id="doc-effective"
          label="Effective from"
          required
          min={today()}
          value={effective}
          onChange={setEffective}
        />
        <label className="flex h-9 items-center gap-2 text-sm">
          <Checkbox
            checked={reaccept}
            onCheckedChange={(on) => setReaccept(on === true)}
          />
          Patients accept this version again
        </label>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="doc-text" className="text-sm font-medium">
          Document text
        </label>
        <Textarea
          id="doc-text"
          rows={16}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
    </Frame>
  )
}

function History({
  doc,
  onView,
  onClose,
}: {
  doc: ConsentDoc
  onView: (version: DocVersion) => void
  onClose: () => void
}) {
  const live = current(doc)
  return (
    <Frame
      title={`${doc.title}: version history`}
      footer={
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      <SettingsTable
        equal
        columns={[
          { header: "Version" },
          { header: "Effective" },
          { header: "Published by" },
          { header: "Status" },
          { header: "", className: "w-16" },
        ]}
      >
        {[...doc.versions].reverse().map((v) => (
          <TableRow key={v.version}>
            <TableCell className="font-medium tabular-nums">
              {v.version}
            </TableCell>
            <TableCell className="tabular-nums">
              {usDate(v.effective)}
            </TableCell>
            <TableCell className="text-foreground/80">
              {v.publishedBy}, {usDate(v.publishedOn)}
            </TableCell>
            <TableCell>
              {v.version === live.version ? (
                <StatusDot tone="success">Current</StatusDot>
              ) : v.effective > today() ? (
                <StatusDot tone="warning">Upcoming</StatusDot>
              ) : (
                <StatusDot tone="muted">Replaced</StatusDot>
              )}
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`View version ${v.version}`}
                onClick={() => onView(v)}
              >
                <IconEye />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </SettingsTable>
    </Frame>
  )
}

function ViewVersion({
  doc,
  version,
  onEdit,
  onClose,
}: {
  doc: ConsentDoc
  version: DocVersion
  onEdit: () => void
  onClose: () => void
}) {
  return (
    <Frame
      title={doc.title}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onEdit}>
            <IconEdit />
            New version
          </Button>
        </>
      }
    >
      <p className="text-xs text-muted-foreground tabular-nums">
        Version {version.version}, effective {usDate(version.effective)}
        {version.reaccept && ", patients accept again"}
      </p>
      <div className="flex flex-col gap-3 text-sm leading-6">
        {version.text.split(/\n\s*\n/).map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
    </Frame>
  )
}
