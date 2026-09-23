"use client"

import * as React from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { BRAND_NAME } from "@/lib/brand"
import { Badge } from "@/design-system/ui/badge"
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/design-system/ui/breadcrumb"
import { Button } from "@/design-system/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
  CommandDialog,
} from "@/design-system/ui/command"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/design-system/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/design-system/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/design-system/ui/avatar"
import { Kbd, KbdGroup } from "@/design-system/ui/kbd"
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/design-system/ui/menubar"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/design-system/ui/navigation-menu"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/design-system/ui/pagination"
import { Separator } from "@/design-system/ui/separator"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/design-system/ui/tabs"
import {
  IconAdd,
  IconAlert,
  IconChevronRight,
  IconChart,
  IconCalendar,
  IconMedication,
  IconCheck,
  IconFileList,
  IconFileText,
  IconLab,
  IconHeartPulse,
  IconHome,
  IconLogout,
  IconMail,
  IconBilling,
  IconMore,
  IconNotification,
  IconEdit,
  IconPrint,
  IconSearch,
  IconSettings,
  IconShare,
  IconStethoscope,
  IconTeam,
  IconUser,
} from "@/design-system/icons"

/* -------------------------------------------------------------------------- */
/*  Page scaffolding                                                          */
/* -------------------------------------------------------------------------- */

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-heading text-xl font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Demo({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <h3 className="font-heading text-sm font-semibold tracking-tight">
        {title}
      </h3>
      <div className={cn("rounded-xl border bg-card p-6", className)}>
        {children}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  1. App shell / sidebar variants                                           */
/* -------------------------------------------------------------------------- */

const SIDEBAR_VARIANTS = [
  {
    slug: "sidebar",
    title: "Standard sidebar",
  },
  {
    slug: "sidebar-icon",
    title: "Icon sidebar",
  },
  {
    slug: "sidebar-inset",
    title: "Inset sidebar",
  },
  {
    slug: "sidebar-floating",
    title: "Floating sidebar",
  },
] as const

function SidebarDiagram({
  variant,
}: {
  variant: (typeof SIDEBAR_VARIANTS)[number]["slug"]
}) {
  const rows = (
    <>
      <div className="h-1.5 w-full rounded-full bg-sidebar-foreground/25" />
      <div className="h-1.5 w-4/5 rounded-full bg-sidebar-foreground/15" />
      <div className="h-1.5 w-3/5 rounded-full bg-sidebar-foreground/15" />
    </>
  )

  const contentBody = (
    <div className="flex h-full flex-col gap-1.5">
      <div className="h-2.5 w-1/3 rounded-full bg-foreground/25" />
      <div className="flex-1 rounded-md bg-muted" />
    </div>
  )

  if (variant === "sidebar") {
    return (
      <div className="flex h-28 overflow-hidden rounded-lg border bg-background">
        <div className="flex w-1/4 flex-col gap-1.5 border-r border-sidebar-border bg-sidebar p-2">
          {rows}
        </div>
        <div className="flex-1 p-2">{contentBody}</div>
      </div>
    )
  }

  if (variant === "sidebar-icon") {
    return (
      <div className="flex h-28 overflow-hidden rounded-lg border bg-background">
        <div className="flex w-8 flex-col items-center gap-1.5 border-r border-sidebar-border bg-sidebar p-2">
          <div className="size-4 rounded-md bg-sidebar-primary" />
          <div className="size-4 rounded-md bg-sidebar-foreground/15" />
          <div className="size-4 rounded-md bg-sidebar-foreground/15" />
        </div>
        <div className="flex-1 p-2">{contentBody}</div>
      </div>
    )
  }

  if (variant === "sidebar-inset") {
    return (
      <div className="flex h-28 gap-2 rounded-lg bg-sidebar p-2">
        <div className="flex w-1/4 flex-col gap-1.5 py-1">{rows}</div>
        <div className="flex-1 rounded-lg border bg-background p-2 shadow-sm">
          {contentBody}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-28 gap-2 rounded-lg border bg-background p-2">
      <div className="flex w-1/4 flex-col gap-1.5 rounded-lg border border-sidebar-border bg-sidebar p-2 shadow-sm">
        {rows}
      </div>
      <div className="flex-1 p-1">{contentBody}</div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  2. Top navigation bar                                                     */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*  3. Navigation menu / mega menu                                            */
/* -------------------------------------------------------------------------- */

const PATIENT_LINKS = [
  { title: "Patient search", description: "Find by name, MRN, DOB, or phone." },
  { title: "My panel", description: "Patients empanelled to you as PCP." },
  { title: "Recent charts", description: "The last 20 charts you opened." },
  {
    title: "Register patient",
    description: "Create a new medical record number.",
  },
]

const CLINICAL_LINKS = [
  {
    title: "Encounters",
    description: "Office visits, telehealth, and inpatient stays.",
  },
  {
    title: "Medications",
    description: "Active list, renewals, and e-prescribing.",
  },
  {
    title: "Allergies & intolerances",
    description: "Reactions, severity, and reconciliation.",
  },
  {
    title: "Results review",
    description: "Labs, pathology, and imaging inbox.",
  },
  {
    title: "Vitals & flowsheets",
    description: "Trended observations over time.",
  },
  {
    title: "Care plans",
    description: "Goals, problems, and longitudinal plans.",
  },
]

function MegaMenuDemo() {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Patients</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="w-96">
              {PATIENT_LINKS.map((link) => (
                <MegaMenuLink key={link.title} title={link.title}>
                  {link.description}
                </MegaMenuLink>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger>Clinical</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[400px] gap-2 md:w-[520px] md:grid-cols-2">
              {CLINICAL_LINKS.map((link) => (
                <MegaMenuLink key={link.title} title={link.title}>
                  {link.description}
                </MegaMenuLink>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger>Orders</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[230px]">
              <li>
                <NavigationMenuLink
                  render={
                    <Link href="#" className="flex-row items-center gap-2" />
                  }
                >
                  <IconLab />
                  Lab orders
                </NavigationMenuLink>
                <NavigationMenuLink
                  render={
                    <Link href="#" className="flex-row items-center gap-2" />
                  }
                >
                  <IconMedication />
                  Prescriptions
                </NavigationMenuLink>
                <NavigationMenuLink
                  render={
                    <Link href="#" className="flex-row items-center gap-2" />
                  }
                >
                  <IconFileText />
                  Referrals
                </NavigationMenuLink>
                <NavigationMenuLink
                  render={
                    <Link href="#" className="flex-row items-center gap-2" />
                  }
                >
                  <IconChart />
                  Order sets
                </NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuLink
            render={<Link href="#" />}
            className={navigationMenuTriggerStyle()}
          >
            Reports
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}

function MegaMenuLink({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <li>
      <NavigationMenuLink render={<Link href="#" />}>
        <div className="flex flex-col gap-1 text-sm">
          <div className="leading-none font-medium">{title}</div>
          <div className="line-clamp-2 text-muted-foreground">{children}</div>
        </div>
      </NavigationMenuLink>
    </li>
  )
}

/* -------------------------------------------------------------------------- */
/*  4. Menubar                                                                */
/* -------------------------------------------------------------------------- */

function MenubarDemo() {
  const [showInactive, setShowInactive] = React.useState(false)
  const [showDiscontinued, setShowDiscontinued] = React.useState(true)

  return (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>Chart</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            <IconAdd />
            New encounter <MenubarShortcut>⌘E</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            <IconFileText />
            New progress note <MenubarShortcut>⌘N</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarSub>
            <MenubarSubTrigger>Send chart</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem>Direct secure message</MenubarItem>
              <MenubarItem>Referral packet</MenubarItem>
              <MenubarItem>Release of information</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarItem>
            <IconPrint />
            Print chart summary <MenubarShortcut>⌘P</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger>Orders</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            <IconLab />
            Order labs <MenubarShortcut>⌘L</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            <IconMedication />
            Prescribe medication <MenubarShortcut>⌘R</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            <IconShare />
            Place referral
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem disabled>
            Sign &amp; hold (no pending orders)
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger>View</MenubarTrigger>
        <MenubarContent className="w-60">
          <MenubarCheckboxItem
            checked={showInactive}
            onCheckedChange={setShowInactive}
          >
            Show inactive problems
          </MenubarCheckboxItem>
          <MenubarCheckboxItem
            checked={showDiscontinued}
            onCheckedChange={setShowDiscontinued}
          >
            Show discontinued medications
          </MenubarCheckboxItem>
          <MenubarSeparator />
          <MenubarItem inset>
            Flowsheet view <MenubarShortcut>⌘1</MenubarShortcut>
          </MenubarItem>
          <MenubarItem inset>
            Timeline view <MenubarShortcut>⌘2</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger>Help</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Keyboard shortcuts</MenubarItem>
          <MenubarItem>Clinical content release notes</MenubarItem>
          <MenubarSeparator />
          <MenubarItem>Contact the help desk</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  )
}

/* -------------------------------------------------------------------------- */
/*  5. Tabs                                                                   */
/* -------------------------------------------------------------------------- */

const CHART_TAB_BODY: Record<string, string> = {
  summary:
    "Snapshot of active problems, medications, allergies, and the last three encounters.",
  vitals:
    "BP 138/86 · HR 78 · Temp 36.8 °C · SpO₂ 97% · BMI 29.4 · recorded 2026-09-15 09:32.",
  meds: "Metformin 1000 mg BID · Lisinopril 10 mg daily · Atorvastatin 20 mg nightly.",
  labs: "A1c 7.4% (H) · eGFR 68 · LDL 112 (H) · resulted 2026-09-11.",
  notes: "12 progress notes, 3 telephone encounters, 1 discharge summary.",
}

/* -------------------------------------------------------------------------- */
/*  6. Command palette                                                        */
/* -------------------------------------------------------------------------- */

function CommandPaletteDemo() {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="outline"
        className="w-full max-w-md justify-start gap-2 text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <IconSearch />
        Search patients, orders, and actions…
        <KbdGroup className="ml-auto">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          <CommandInput placeholder="Jump to a patient, order, or screen…" />
          <CommandList>
            <CommandEmpty>No matching patients or commands.</CommandEmpty>
            <CommandGroup heading="Patients">
              <CommandItem onSelect={() => setOpen(false)}>
                <IconUser />
                <span>Alvarez, Maria · MRN-10241 · 58F</span>
              </CommandItem>
              <CommandItem onSelect={() => setOpen(false)}>
                <IconUser />
                <span>Okafor, Daniel · MRN-10877 · 41M</span>
              </CommandItem>
              <CommandItem onSelect={() => setOpen(false)}>
                <IconUser />
                <span>Nakamura, Yuki · MRN-11002 · 33F</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Actions">
              <CommandItem onSelect={() => setOpen(false)}>
                <IconMedication />
                <span>Prescribe medication</span>
                <CommandShortcut>⌘R</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => setOpen(false)}>
                <IconLab />
                <span>Order labs</span>
                <CommandShortcut>⌘L</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => setOpen(false)}>
                <IconFileText />
                <span>Start progress note</span>
                <CommandShortcut>⌘N</CommandShortcut>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Go to">
              <CommandItem onSelect={() => setOpen(false)}>
                <IconCalendar />
                <span>Today&apos;s schedule</span>
              </CommandItem>
              <CommandItem onSelect={() => setOpen(false)}>
                <IconMail />
                <span>Results inbox</span>
              </CommandItem>
              <CommandItem onSelect={() => setOpen(false)}>
                <IconBilling />
                <span>Billing worklist</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  7. Pagination                                                             */
/* -------------------------------------------------------------------------- */

function PaginationDemo() {
  const [page, setPage] = React.useState(4)
  const totalPages = 52
  const pageSize = 25
  const totalRows = 1284
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalRows)

  const windowPages = [page - 1, page, page + 1].filter(
    (p) => p > 1 && p < totalPages
  )

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-mono text-foreground">{from}</span>-
        <span className="font-mono text-foreground">{to}</span> of{" "}
        <span className="font-mono text-foreground">{totalRows}</span> patients
      </p>
      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(event) => {
                event.preventDefault()
                setPage((p) => Math.max(1, p - 1))
              }}
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink
              href="#"
              isActive={page === 1}
              onClick={(event) => {
                event.preventDefault()
                setPage(1)
              }}
            >
              1
            </PaginationLink>
          </PaginationItem>
          {page > 3 ? (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          ) : null}
          {windowPages.map((p) => (
            <PaginationItem key={p}>
              <PaginationLink
                href="#"
                isActive={page === p}
                onClick={(event) => {
                  event.preventDefault()
                  setPage(p)
                }}
              >
                {p}
              </PaginationLink>
            </PaginationItem>
          ))}
          {page < totalPages - 2 ? (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          ) : null}
          <PaginationItem>
            <PaginationLink
              href="#"
              isActive={page === totalPages}
              onClick={(event) => {
                event.preventDefault()
                setPage(totalPages)
              }}
            >
              {totalPages}
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(event) => {
                event.preventDefault()
                setPage((p) => Math.min(totalPages, p + 1))
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  8. Stepper / wizard                                                       */
/* -------------------------------------------------------------------------- */

const INTAKE_STEPS = [
  {
    id: "demographics",
    label: "Demographics",
    hint: "Legal name, date of birth, contact, preferred language.",
  },
  {
    id: "insurance",
    label: "Insurance",
    hint: "Payer, plan, subscriber, and eligibility check.",
  },
  {
    id: "history",
    label: "History",
    hint: "Problems, medications, allergies, and family history.",
  },
  {
    id: "review",
    label: "Review",
    hint: "Confirm every section, then submit for registration.",
  },
]

function StepperDemo() {
  const [step, setStep] = React.useState(1)
  const current = INTAKE_STEPS[step]

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {INTAKE_STEPS.map((item, index) => {
          const isComplete = index < step
          const isCurrent = index === step

          return (
            <li key={item.id} className="flex flex-1 items-center gap-3">
              <button
                type="button"
                onClick={() => setStep(index)}
                aria-current={isCurrent ? "step" : undefined}
                className="flex items-center gap-2.5 rounded-3xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                    isComplete &&
                      "border-primary bg-primary text-primary-foreground",
                    isCurrent &&
                      "border-primary bg-primary-surface text-primary-tint",
                    !isComplete &&
                      !isCurrent &&
                      "border-border text-muted-foreground"
                  )}
                >
                  {isComplete ? <IconCheck className="size-3.5" /> : index + 1}
                </span>
                <span
                  className={cn(
                    "text-sm font-medium whitespace-nowrap transition-colors",
                    isCurrent ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </button>
              {index < INTAKE_STEPS.length - 1 ? (
                <Separator className="hidden min-w-4 flex-1 sm:block" />
              ) : null}
            </li>
          )
        })}
      </ol>

      <div className="rounded-lg border bg-background p-4">
        <div className="mb-1.5 flex items-center gap-2">
          <h4 className="font-heading text-sm font-semibold">
            {current.label}
          </h4>
          <Badge variant="secondary">
            Step {step + 1} of {INTAKE_STEPS.length}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{current.hint}</p>
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          disabled={step === 0}
          onClick={() => setStep((s) => s - 1)}
        >
          Back
        </Button>
        <Button
          disabled={step === INTAKE_STEPS.length - 1}
          onClick={() =>
            setStep((s) => Math.min(INTAKE_STEPS.length - 1, s + 1))
          }
        >
          Continue
          <IconChevronRight data-icon="inline-end" />
        </Button>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  9. Contextual navigation                                                  */
/* -------------------------------------------------------------------------- */

const WORKLIST_ROWS = [
  {
    name: "Alvarez, Maria",
    mrn: "MRN-10241",
    reason: "Diabetes follow-up",
    time: "09:30",
  },
  {
    name: "Okafor, Daniel",
    mrn: "MRN-10877",
    reason: "Hypertension recheck",
    time: "10:00",
  },
  {
    name: "Nakamura, Yuki",
    mrn: "MRN-11002",
    reason: "Annual wellness visit",
    time: "10:30",
  },
]

function RowActionsDemo() {
  return (
    <div className="divide-y rounded-lg border bg-background">
      {WORKLIST_ROWS.map((row) => (
        <div key={row.mrn} className="flex items-center gap-3 px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{row.name}</div>
            <div className="truncate font-mono text-xs text-muted-foreground">
              {row.mrn} · {row.reason}
            </div>
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            {row.time}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-sm" />}
            >
              <IconMore />
              <span className="sr-only">Actions for {row.name}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
              <DropdownMenuLabel>{row.mrn}</DropdownMenuLabel>
              <DropdownMenuItem>
                <IconFileText />
                Open chart
              </DropdownMenuItem>
              <DropdownMenuItem>
                <IconEdit />
                Start progress note
              </DropdownMenuItem>
              <DropdownMenuItem>
                <IconCalendar />
                Reschedule appointment
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                Mark as no-show
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
    </div>
  )
}

function ContextMenuDemo() {
  return (
    <ContextMenu>
      <ContextMenuTrigger className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed bg-background text-sm text-muted-foreground">
        <IconMedication className="size-5" />
        Right-click the medication row (Lisinopril 10 mg daily)
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-56">
        <ContextMenuLabel>Lisinopril 10 mg · active</ContextMenuLabel>
        <ContextMenuItem>
          Renew <ContextMenuShortcut>⌘R</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem>Modify dose</ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>Reconcile</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem>Mark as taking</ContextMenuItem>
            <ContextMenuItem>Mark as not taking</ContextMenuItem>
            <ContextMenuItem>Add pharmacy note</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive">
          Discontinue medication
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

/* -------------------------------------------------------------------------- */
/*  10. In-page section nav                                                   */
/* -------------------------------------------------------------------------- */

const CHART_SECTIONS = [
  {
    id: "onthispage-problems",
    label: "Problem list",
    body: "Type 2 diabetes mellitus, essential hypertension, hyperlipidemia.",
  },
  {
    id: "onthispage-meds",
    label: "Medications",
    body: "Metformin, lisinopril, atorvastatin. Last reconciled 2026-08-30.",
  },
  {
    id: "onthispage-allergies",
    label: "Allergies",
    body: "Penicillin: hives (high severity). Latex: contact dermatitis.",
  },
  {
    id: "onthispage-vitals",
    label: "Vitals",
    body: "BP 138/86, HR 78, Temp 36.8 °C, SpO₂ 97%, BMI 29.4.",
  },
  {
    id: "onthispage-labs",
    label: "Lab results",
    body: "A1c 7.4% (H), eGFR 68, LDL 112 (H). Resulted 2026-09-11.",
  },
  {
    id: "onthispage-immunizations",
    label: "Immunizations",
    body: "Influenza 2025-10-04, Tdap 2019-06-12, COVID-19 booster 2025-11-02.",
  },
  {
    id: "onthispage-notes",
    label: "Encounter notes",
    body: "12 progress notes, 3 telephone encounters, 1 discharge summary.",
  },
]

function OnThisPageDemo() {
  const [active, setActive] = React.useState(CHART_SECTIONS[0].id)

  function jump(event: React.MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault()
    setActive(id)
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }

  return (
    <div className="flex flex-col gap-6 sm:flex-row">
      <nav aria-label="On this page" className="sm:w-48 sm:shrink-0">
        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          On this page
        </p>
        <ul className="flex flex-col gap-0.5 border-l">
          {CHART_SECTIONS.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                onClick={(event) => jump(event, section.id)}
                aria-current={active === section.id ? "true" : undefined}
                className={cn(
                  "-ml-px block border-l py-1 pl-3 text-sm transition-colors",
                  active === section.id
                    ? "border-primary font-medium text-primary-tint"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="h-64 flex-1 overflow-y-auto rounded-lg border bg-background p-4">
        <div className="flex flex-col gap-5">
          {CHART_SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-4">
              <h4 className="font-heading text-sm font-semibold">
                {section.label}
              </h4>
              <p className="mt-1 text-sm text-muted-foreground">
                {section.body}
              </p>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function Page() {
  return (
    <div>
      <header className="mb-10">
        <Badge variant="secondary" className="mb-3">
          Patterns
        </Badge>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Navigation patterns
        </h1>
      </header>

      <div className="flex flex-col gap-14">
        {/* ---------------------------------------------------------------- */}
        <Section title="App shell">
          <div className="grid gap-4 sm:grid-cols-2">
            {SIDEBAR_VARIANTS.map((variant) => (
              <div
                key={variant.slug}
                className="flex flex-col gap-3 rounded-xl border bg-card p-6"
              >
                <SidebarDiagram variant={variant.slug} />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading text-sm font-semibold tracking-tight">
                      {variant.title}
                    </h3>
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {variant.slug}
                    </code>
                  </div>
                </div>
                <Link
                  href={`/components/${variant.slug}`}
                  className="mt-auto inline-flex w-fit items-center gap-1 text-sm font-medium text-primary-tint hover:underline"
                >
                  View full-page example
                  <IconChevronRight className="size-4" />
                </Link>
              </div>
            ))}
          </div>
        </Section>

        {/* ---------------------------------------------------------------- */}
        <Section title="Global navigation">
          <Demo title="Navigation menu / mega menu">
            <MegaMenuDemo />
          </Demo>

          <Demo title="Menubar">
            <MenubarDemo />
          </Demo>

          <Demo title="Command palette">
            <CommandPaletteDemo />
          </Demo>
        </Section>

        {/* ---------------------------------------------------------------- */}
        <Section title="Positional navigation">
          <Demo title="Breadcrumbs: deep clinical path">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="#">Patients</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="#">Alvarez, Maria</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="#">Encounters</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="#">
                    2026-09-15 Office visit
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Lipid panel</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </Demo>

          <Demo title="Breadcrumbs: truncated">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="#">Patients</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button size="icon-sm" variant="ghost" />}
                    >
                      <BreadcrumbEllipsis />
                      <span className="sr-only">Show collapsed path</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem>Alvarez, Maria</DropdownMenuItem>
                      <DropdownMenuItem>Encounters</DropdownMenuItem>
                      <DropdownMenuItem>
                        2026-09-15 Office visit
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="#">Results</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Lipid panel</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </Demo>

          <Demo title="In-page section nav">
            <OnThisPageDemo />
          </Demo>
        </Section>

        {/* ---------------------------------------------------------------- */}
        <Section title="Switching within a record">
          <Demo title="Tabs: default (segmented)">
            <Tabs defaultValue="summary">
              <TabsList>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="vitals">Vitals</TabsTrigger>
                <TabsTrigger value="meds">Medications</TabsTrigger>
                <TabsTrigger value="labs">Labs</TabsTrigger>
              </TabsList>
              <div className="mt-2 rounded-xl border p-6 text-muted-foreground">
                <TabsContent value="summary">
                  {CHART_TAB_BODY.summary}
                </TabsContent>
                <TabsContent value="vitals">
                  {CHART_TAB_BODY.vitals}
                </TabsContent>
                <TabsContent value="meds">{CHART_TAB_BODY.meds}</TabsContent>
                <TabsContent value="labs">{CHART_TAB_BODY.labs}</TabsContent>
              </div>
            </Tabs>
          </Demo>

          <Demo title="Tabs: line">
            <Tabs defaultValue="summary">
              <TabsList variant="line">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="vitals">Vitals</TabsTrigger>
                <TabsTrigger value="meds">Medications</TabsTrigger>
                <TabsTrigger value="labs">Lab results</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>
              <div className="mt-3 rounded-xl border p-6 text-muted-foreground">
                <TabsContent value="summary">
                  {CHART_TAB_BODY.summary}
                </TabsContent>
                <TabsContent value="vitals">
                  {CHART_TAB_BODY.vitals}
                </TabsContent>
                <TabsContent value="meds">{CHART_TAB_BODY.meds}</TabsContent>
                <TabsContent value="labs">{CHART_TAB_BODY.labs}</TabsContent>
                <TabsContent value="notes">{CHART_TAB_BODY.notes}</TabsContent>
              </div>
            </Tabs>
          </Demo>

          <Demo title="Tabs: vertical">
            <Tabs defaultValue="summary" orientation="vertical">
              <TabsList>
                <TabsTrigger value="summary">Encounter summary</TabsTrigger>
                <TabsTrigger value="vitals">
                  Vitals &amp; observations
                </TabsTrigger>
                <TabsTrigger value="meds">Medication list</TabsTrigger>
                <TabsTrigger value="labs">Lab results</TabsTrigger>
              </TabsList>
              <div className="rounded-xl border p-6 text-muted-foreground">
                <TabsContent value="summary">
                  {CHART_TAB_BODY.summary}
                </TabsContent>
                <TabsContent value="vitals">
                  {CHART_TAB_BODY.vitals}
                </TabsContent>
                <TabsContent value="meds">{CHART_TAB_BODY.meds}</TabsContent>
                <TabsContent value="labs">{CHART_TAB_BODY.labs}</TabsContent>
              </div>
            </Tabs>
          </Demo>
        </Section>

        {/* ---------------------------------------------------------------- */}
        <Section title="Sequential navigation">
          <Demo title="Stepper / wizard">
            <StepperDemo />
          </Demo>

          <Demo title="Pagination">
            <PaginationDemo />
          </Demo>
        </Section>

        {/* ---------------------------------------------------------------- */}
        <Section title="Contextual navigation">
          <Demo title="Row actions: dropdown menu">
            <RowActionsDemo />
          </Demo>

          <Demo title="Row actions: context menu">
            <ContextMenuDemo />
          </Demo>
        </Section>

        {/* ---------------------------------------------------------------- */}
        <Section title="Choosing a pattern">
          <dl className="grid gap-x-8 gap-y-3 rounded-xl border bg-card p-6 sm:grid-cols-2">
            {[
              [
                "Switching modules",
                "Sidebar (default) or top bar (≤5 modules)",
              ],
              [
                "Switching patients",
                "Command palette or patient search, never tabs",
              ],
              ["Switching views in one chart", "Tabs, line variant"],
              ["Many labelled destinations", "Navigation menu / mega menu"],
              ["Document-editor commands", "Menubar"],
              ["Where am I?", "Breadcrumbs + patient context bar"],
              ["Long scrolling chart", "In-page section nav"],
              ["Gated multi-step form", "Stepper"],
              ["Long result set", "Pagination"],
              ["Actions on one row", "Dropdown menu, mirrored by context menu"],
            ].map(([question, answer]) => (
              <div
                key={question}
                className="flex items-baseline justify-between gap-4 border-b border-dashed pb-2 last:border-0"
              >
                <dt className="text-sm text-muted-foreground">{question}</dt>
                <dd className="text-right text-sm font-medium">{answer}</dd>
              </div>
            ))}
          </dl>
        </Section>
      </div>
    </div>
  )
}
