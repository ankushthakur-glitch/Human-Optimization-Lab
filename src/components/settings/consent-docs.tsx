"use client"

import * as React from "react"
import { toast } from "@/design-system/ui/sonner"
import {
  IconAdd,
  IconArrowLeft,
  IconEdit,
  IconEye,
  IconHistory,
} from "@/design-system/icons"

import { DateField } from "@/components/form-kit"
import {
  type Column,
  Directory,
  NAME_LINK,
  RowMenu,
  avatarTone,
  initials,
} from "@/components/practice/directory"
import {
  type Patient,
  patients,
  usDate,
} from "@/components/practice/practice-data"
import { createCollection } from "@/components/practice/collection-store"
import {
  SettingsFrame,
  SettingsSection,
  SettingsTable,
  StatusDot,
} from "@/components/settings/settings-kit"
import {
  Avatar,
  AvatarFallback,
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
  | { kind: "view"; doc: ConsentDoc; version: DocVersion }

/* Who signed which version: every active patient accepted one version of
   each document. Where a document has more than one live version, about a
   third of patients still hold the earlier one. Sample data until the app
   reports signatures. */
type Signature = {
  id: string
  patientId: string
  name: string
  photo: string
  dob: string
  version: number
  signedOn: string
}

const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const daysBetween = (from: string, to: string) =>
  Math.max(
    1,
    Math.round(
      (new Date(`${to}T12:00:00`).getTime() -
        new Date(`${from}T12:00:00`).getTime()) /
        86_400_000
    )
  )

function signaturesFor(doc: ConsentDoc, people: Patient[]): Signature[] {
  const live = doc.versions.filter((v) => v.effective <= today())
  if (live.length === 0) return []
  return people
    .filter((p) => p.status === "Active")
    .map((p, i) => {
      const v =
        live.length > 1 && i % 3 === 0
          ? live[live.length - 2]
          : live[live.length - 1]
      const until =
        doc.versions.find((x) => x.version === v.version + 1)?.effective ??
        today()
      return {
        id: `${doc.id}-${p.id}`,
        patientId: p.id,
        name: `${p.firstName} ${p.lastName}`,
        photo: p.photo,
        dob: p.dob,
        version: v.version,
        signedOn: addDays(v.effective, (i * 7) % daysBetween(v.effective, until)),
      }
    })
}

export function ConsentDocsPage() {
  const { items } = consentDocs.use()
  const { items: people } = patients.use()
  const [openId, setOpenId] = React.useState<string | null>(null)
  const [open, setOpen] = React.useState<Open | null>(null)
  const doc = items.find((d) => d.id === openId)

  const dialog = (
    <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {open?.kind === "edit" && (
          <VersionForm doc={open.doc} onClose={() => setOpen(null)} />
        )}
        {open?.kind === "view" && (
          <ViewVersion
            doc={open.doc}
            version={open.version}
            onClose={() => setOpen(null)}
          />
        )}
      </DialogContent>
    </Dialog>
  )

  if (doc) {
    return (
      <>
        <DocumentDetail
          doc={doc}
          signatures={signaturesFor(doc, people)}
          onBack={() => setOpenId(null)}
          onOpen={setOpen}
        />
        {dialog}
      </>
    )
  }

  return (
    <SettingsFrame>
      <SettingsTable
        equal
        columns={[
          { header: "Document name" },
          { header: "Current version" },
          { header: "Effective" },
          { header: "Patients signed", className: "hidden md:table-cell" },
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
                  onClick={() => setOpenId(doc.id)}
                >
                  {doc.title}
                </Button>
              </TableCell>
              <TableCell className="tabular-nums">
                {live.version}
                {next && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    Version {next.version} from {usDate(next.effective)}
                  </span>
                )}
              </TableCell>
              <TableCell className="tabular-nums">
                {usDate(live.effective)}
              </TableCell>
              <TableCell className="hidden tabular-nums md:table-cell">
                {signaturesFor(doc, people).length}
              </TableCell>
              <TableCell className="text-right">
                <RowMenu label={`Actions for ${doc.title}`}>
                  <DropdownMenuItem onClick={() => setOpenId(doc.id)}>
                    <IconHistory />
                    Versions and signatures
                  </DropdownMenuItem>
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
                </RowMenu>
              </TableCell>
            </TableRow>
          )
        })}
      </SettingsTable>
      {dialog}
    </SettingsFrame>
  )
}

/** One document: every version it has had, then the patients who signed
    each one, switched by version. */
function DocumentDetail({
  doc,
  signatures,
  onBack,
  onOpen,
}: {
  doc: ConsentDoc
  signatures: Signature[]
  onBack: () => void
  onOpen: (open: Open) => void
}) {
  const live = current(doc)
  const versions = [...doc.versions].reverse()
  const signed = (v: DocVersion) =>
    signatures.filter((s) => s.version === v.version).length

  const columns: Column<Signature>[] = [
    {
      id: "name",
      header: "Patient",
      cell: (s) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar className="size-8 shrink-0">
            {s.photo && <AvatarImage src={s.photo} alt="" />}
            <AvatarFallback className={`font-medium ${avatarTone(s.name)}`}>
              {initials(s.name)}
            </AvatarFallback>
          </Avatar>
          <span className="truncate font-medium">{s.name}</span>
        </div>
      ),
      sortValue: (s) => s.name,
    },
    {
      id: "patientId",
      header: "Patient ID",
      className: "hidden text-primary-tint tabular-nums md:table-cell",
      cell: (s) => s.patientId,
      sortValue: (s) => s.patientId,
    },
    {
      id: "dob",
      header: "Date of birth",
      className: "hidden tabular-nums lg:table-cell text-foreground/80",
      cell: (s) => usDate(s.dob),
      sortValue: (s) => s.dob,
    },
    {
      id: "version",
      header: "Version",
      className: "tabular-nums",
      cell: (s) => s.version,
      sortValue: (s) => s.version,
    },
    {
      id: "signedOn",
      header: "Signed on",
      className: "tabular-nums",
      cell: (s) => usDate(s.signedOn),
      sortValue: (s) => s.signedOn,
    },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-surface-sunken">
      <div className="flex shrink-0 flex-col gap-4 px-4 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Back to consent documents"
              onClick={onBack}
            >
              <IconArrowLeft className="size-5" />
            </Button>
            <h1 className="truncate text-lg font-semibold">{doc.title}</h1>
          </div>
          <Button size="sm" onClick={() => onOpen({ kind: "edit", doc })}>
            <IconAdd />
            New version
          </Button>
        </div>
        <SettingsSection title="Versions">
          <SettingsTable
            equal
            columns={[
              { header: "Version" },
              { header: "Effective" },
              { header: "Published by", className: "hidden md:table-cell" },
              { header: "Status" },
              { header: "Patients signed" },
              { header: "", className: "w-16" },
            ]}
          >
            {versions.map((v) => (
              <TableRow key={v.version}>
                <TableCell className="font-medium tabular-nums">
                  {v.version}
                </TableCell>
                <TableCell className="tabular-nums">
                  {usDate(v.effective)}
                </TableCell>
                <TableCell className="hidden text-foreground/80 md:table-cell">
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
                <TableCell className="tabular-nums">{signed(v)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`View version ${v.version}`}
                    onClick={() => onOpen({ kind: "view", doc, version: v })}
                  >
                    <IconEye />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </SettingsTable>
        </SettingsSection>
      </div>
      <div className="flex min-h-[32rem] flex-1 flex-col">
        <Directory
          key={doc.id}
          title={`${doc.title}: signed by`}
          leading={
            <h2 className="mr-2 text-[15px] font-semibold">Signed by</h2>
          }
          noun="patients"
          rows={signatures}
          columns={columns}
          search={(s) => [s.name, s.patientId]}
          statusTabs={{
            options: versions.map((v) => `Version ${v.version}`),
            value: (s) => `Version ${s.version}`,
          }}
          exportName={`${doc.title} signatures`}
          exportRow={(s) => ({
            Patient: s.name,
            "Patient ID": s.patientId,
            "Date of birth": usDate(s.dob),
            Version: s.version,
            "Signed on": usDate(s.signedOn),
          })}
          emptyIllustration="no-results"
        />
      </div>
    </div>
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

function ViewVersion({
  doc,
  version,
  onClose,
}: {
  doc: ConsentDoc
  version: DocVersion
  onClose: () => void
}) {
  return (
    <Frame
      title={doc.title}
      footer={
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
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
