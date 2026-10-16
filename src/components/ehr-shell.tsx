"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  IconChat,
  IconDashboard,
  IconFileList,
  IconLogout,
  IconNotification,
  IconPalette,
  IconSearch,
  IconSettings,
  IconUser,
  IconUserAdd,
  IconUserCircle,
} from "@/design-system/icons"

import { cn } from "@/lib/utils"
import { BRAND_NAME, LOGO, MARK } from "@/lib/brand"
import { AppearanceMenuSection } from "@/design-system/appearance-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/design-system/ui/avatar"
import { Button } from "@/design-system/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/design-system/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/design-system/ui/dropdown-menu"
import { Kbd } from "@/design-system/ui/kbd"
import { SessionTimeout } from "@/components/session-timeout"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/design-system/ui/tooltip"
import { Illustration } from "@/components/illustrations/illustration"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/design-system/ui/popover"

/* ------------------------------------------------------------------- nav -- */

export type ModuleId =
  "dashboard" | "patients" | "tasks" | "communication" | "settings"

export type NavItem = {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
  count?: number
}

const PRIMARY_NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: IconDashboard },
  {
    id: "patients",
    label: "Patients",
    icon: IconUser,
    href: "/screens/patients",
  },
  { id: "tasks", label: "Tasks", icon: IconFileList },
  { id: "communication", label: "Communication", icon: IconChat },
  { id: "settings", label: "Settings", icon: IconSettings },
]

/* The top bar is global — identity, search, inbox, account. The sidebar is
   module navigation. Keeping the two responsibilities apart is what lets the
   same shell wrap a worklist and a full-page form without either fighting the
   other for the top row. */

function SideNavLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem
  active: boolean
  collapsed: boolean
}) {
  const content = (
    <>
      <item.icon className="size-5 shrink-0" />
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 truncate text-left">
            {item.label}
          </span>
          {item.count ? (
            <span
              className={cn(
                "shrink-0 text-xs tabular-nums",
                active
                  ? "text-primary-foreground/75"
                  : "text-sidebar-foreground/55"
              )}
            >
              {item.count}
            </span>
          ) : null}
        </>
      )}
    </>
  )

  /* The rail marks the current module with a solid brand fill — the one
     saturated shape in the sidebar, so the module you are in is legible from
     the far side of the screen. The pair is --primary / --primary-foreground
     rather than a hand-picked ink: every preset ships that pair with
     guaranteed contrast in both themes, including the presets whose --primary
     is a *light* fill carrying dark ink, so the row inverts correctly
     whichever palette is active. The count keeps the same ink at 75%, which
     is the one place a muted step still has to come from the fill's side. */
  const className = cn(
    "flex items-center gap-3 rounded-lg text-sm transition-colors",
    collapsed ? "size-10 justify-center" : "w-full px-3 py-2.5",
    active
      ? "bg-primary font-medium text-primary-foreground"
      : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
  )

  const node = item.href ? (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={className}
    >
      {content}
    </Link>
  ) : (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      className={className}
    >
      {content}
    </button>
  )

  if (!collapsed) return node

  return (
    <Tooltip>
      <TooltipTrigger render={node} />
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  )
}

/* Who the top bar says is signed in. The EHR screens default to a clinician;
   the admin console passes its own platform admin. */
export type ShellAccount = {
  name: string
  email: string
  initials: string
  avatar?: string
}

/* A shortcut the command palette offers above "Go to". */
/** One line in the bell's panel; any listed one counts as unread. */
export type ShellNotification = {
  id: string
  title: string
  meta: string
  href: string
}

export type ShellAction = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const EHR_ACCOUNT: ShellAccount = {
  name: "Dr. Reyes",
  email: "m.reyes@humanoptimization.com",
  initials: "RM",
  avatar:
    "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=96&h=96&q=80",
}

const EHR_ACTIONS: ShellAction[] = [
  { label: "Add patient", href: "/screens/patients/new", icon: IconUserAdd },
]

/* ----------------------------------------------------------------- shell -- */

/* A demo can put the same screens in a different frame without forking them:
   inside this provider the shell hands its children to the override instead. */
export type EhrShellFrame = (props: {
  active: string
  children: React.ReactNode
}) => React.ReactNode

export const EhrShellOverride = React.createContext<EhrShellFrame | null>(null)

/* The same frame wraps the EHR and the admin console; only the module list,
   the home link, the palette shortcuts and the signed-in account differ, so
   those come in as props with the EHR's as defaults. */
export function EhrShell({
  active = "patients",
  nav = PRIMARY_NAV,
  homeHref = "/screens/patients",
  account = EHR_ACCOUNT,
  actions = EHR_ACTIONS,
  notifications = [],
  children,
}: {
  active?: ModuleId | (string & {})
  nav?: NavItem[]
  homeHref?: string
  account?: ShellAccount
  actions?: ShellAction[]
  notifications?: ShellNotification[]
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = React.useState(true)
  const [searchOpen, setSearchOpen] = React.useState(false)
  const router = useRouter()
  const frame = React.useContext(EhrShellOverride)

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setSearchOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  function go(href: string) {
    setSearchOpen(false)
    router.push(href)
  }

  if (frame) return frame({ active, children })

  return (
    /* The approved layout puts the rail against the window edge, full height,
       with the brand at its top — so the header is a sibling of the rail, not
       a bar above it. That is what lets the mark sit in the rail's own column
       and stay put when the rail collapses to icons. */
    <div className="flex h-svh min-h-0 bg-muted/30">
      <SessionTimeout />
      {/* side nav */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r bg-card text-sidebar-foreground transition-[width] duration-200 sm:flex",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* The brand block lines up with the header beside it, so the rule
            under the header reads as one line across the whole window. */}
        <Link
          href={homeHref}
          className={cn(
            "flex h-14 shrink-0 items-center border-b",
            collapsed ? "justify-center px-0" : "px-4"
          )}
        >
          {/* The supplied artwork rather than a stand-in glyph and type, so the
              rail, the design-system header and the browser tab all show the
              same mark. Both tones ship and CSS hides one: next-themes toggles
              a class rather than following prefers-color-scheme, so a media
              query would ignore the in-app switch and picking in JS would flash
              the wrong tone before hydration.

              The lockup sits at h-8 and the rail's disc at size-8, which is the
              height the disc inside the lockup renders at — so collapsing the
              rail drops the wordmark without resizing the mark. */}
          {collapsed ? (
            <>
              <Image
                src={MARK.light}
                alt={BRAND_NAME}
                width={MARK.size}
                height={MARK.size}
                priority
                className="size-8 dark:hidden"
              />
              <Image
                src={MARK.dark}
                alt={BRAND_NAME}
                width={MARK.size}
                height={MARK.size}
                priority
                className="hidden size-8 dark:block"
              />
            </>
          ) : (
            <>
              <Image
                src={LOGO.light}
                alt={BRAND_NAME}
                width={LOGO.width}
                height={LOGO.height}
                priority
                className="h-8 w-auto dark:hidden"
              />
              <Image
                src={LOGO.dark}
                alt={BRAND_NAME}
                width={LOGO.width}
                height={LOGO.height}
                priority
                className="hidden h-8 w-auto dark:block"
              />
            </>
          )}
        </Link>

        <nav
          className={cn("flex flex-col gap-1 p-3", collapsed && "items-center")}
        >
          {nav.map((item) => (
            <SideNavLink
              key={item.id}
              item={item}
              active={item.id === active}
              collapsed={collapsed}
            />
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* global bar */}
        <header className="relative flex h-14 shrink-0 items-center gap-3 border-b bg-card px-3 sm:px-4">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            onClick={() => setCollapsed((v) => !v)}
            className="shrink-0"
          >
            <IconMenuGlyph />
          </Button>

          {/* Search sits on the bar's true centre, which means taking it out of
              the flow: the account cluster on the right is several times wider
              than the collapse button on the left, so a flowed field centres
              itself in the gap between them and lands visibly left of the
              window's middle. Out of the flow it stays put whichever side
              grows later — a longer name, one more icon. The wrapper spans the
              bar and ignores the pointer so the bar stays clickable either side
              of the field; only the field itself takes events back. */}
          <div className="pointer-events-none absolute inset-x-0 hidden justify-center px-3 sm:px-4 lg:flex">
            <div className="pointer-events-auto w-full max-w-md">
              {/* A trigger, not a field: typing happens in the palette, which
                  opens centred over a backdrop so the page recedes while you
                  search. */}
              <Button
                type="button"
                variant="outline"
                onClick={() => setSearchOpen(true)}
                aria-label="Open global search"
                className="h-8 w-full justify-start gap-2 rounded-md border-input bg-input/30 px-2.5 font-normal text-muted-foreground hover:bg-input/50 hover:text-muted-foreground dark:bg-input/30"
              >
                <IconSearch />
                <span className="flex-1 truncate text-left">
                  Search {BRAND_NAME}
                </span>
                <Kbd>⌘K</Kbd>
              </Button>
            </div>
          </div>

          <CommandDialog
            open={searchOpen}
            onOpenChange={setSearchOpen}
            title="Global search"
            description="Search modules and actions"
            className="top-1/2 -translate-y-1/2 sm:max-w-lg"
          >
            <Command>
              <CommandInput placeholder={`Search ${BRAND_NAME}...`} />
              <CommandList>
                <CommandEmpty className="flex flex-col items-center gap-2 py-6">
                  <Illustration name="command-empty" className="size-28" />
                  No results found
                </CommandEmpty>
                {actions.length > 0 && (
                  <CommandGroup heading="Actions">
                    {actions.map((action) => (
                      <CommandItem
                        key={action.href}
                        onSelect={() => go(action.href)}
                      >
                        <action.icon />
                        {action.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                <CommandGroup heading="Go to">
                  {nav
                    .filter((item) => item.href)
                    .map((item) => (
                      <CommandItem
                        key={item.id}
                        onSelect={() => go(item.href!)}
                      >
                        <item.icon />
                        {item.label}
                      </CommandItem>
                    ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </CommandDialog>

          {/* The reference carries one bell and the account, nothing else. */}
          <div className="ml-auto flex shrink-0 items-center gap-1">
            {/* Below lg the centred field would run under this cluster, so the
                palette opens from an icon instead. */}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Open global search"
              onClick={() => setSearchOpen(true)}
              className="lg:hidden"
            >
              <IconSearch />
            </Button>
            {/* The bell lists what the portal passes in, with a dot while
                there is anything; empty, it shows the all clear. */}
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={
                      notifications.length
                        ? `Notifications, ${notifications.length} new`
                        : "Notifications"
                    }
                    className="relative"
                  />
                }
              >
                <IconNotification />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 size-2 rounded-full bg-[#DE6F68] ring-2 ring-background" />
                )}
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 gap-0 p-0">
                {notifications.length > 0 ? (
                  <>
                    <div className="border-b px-4 py-2.5 text-sm font-semibold">
                      Notifications
                    </div>
                    <ul className="flex max-h-80 flex-col overflow-y-auto py-1">
                      {notifications.map((n) => (
                        <li key={n.id}>
                          <Link
                            href={n.href}
                            className="flex gap-2.5 px-4 py-2.5 hover:bg-surface-hover"
                          >
                            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                            <span className="flex min-w-0 flex-col gap-0.5">
                              <span className="text-sm">{n.title}</span>
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {n.meta}
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                  <Illustration
                    name="notifications-clear"
                    className="size-28"
                  />
                  <p className="text-sm font-medium">All caught up</p>
                  <p className="text-xs text-muted-foreground">
                    New notifications show up here.
                  </p>
                </div>
                )}
              </PopoverContent>
            </Popover>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="sm" className="gap-2 px-1.5">
                    <Avatar className="size-7">
                      {account.avatar && (
                        <AvatarImage src={account.avatar} alt={account.name} />
                      )}
                      <AvatarFallback>{account.initials}</AvatarFallback>
                    </Avatar>
                    <span className="hidden text-left text-xs font-medium sm:block">
                      {account.name}
                    </span>
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-72">
                {/* Base UI requires GroupLabel to live inside a Group. */}
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex flex-col gap-0.5 px-2.5 py-2 font-normal">
                    <span className="text-sm font-medium text-foreground">
                      {account.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {account.email}
                    </span>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <IconUserCircle />
                    My profile
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <IconSettings />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<Link href="/" />}>
                    <IconPalette />
                    Design system
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                {/* Light, dark or follow the OS. The accent is the product's,
                    not the clinician's, so the colour row stays out of here. */}
                <AppearanceMenuSection showAccent={false} />
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  render={<Link href="/screens/login" />}
                >
                  <IconLogout />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}

/* The icon set has no hamburger that reads well at 16px next to the brand mark,
   so the rail toggle draws its own. */
function IconMenuGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-4" aria-hidden>
      <path
        d="M4 6h16M4 12h10M4 18h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
