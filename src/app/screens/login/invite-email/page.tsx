import type { Metadata } from "next"
import Image from "next/image"

import { cn } from "@/lib/utils"
import { BRAND_NAME, LOGO, MARK } from "@/lib/brand"
import { InviteEmailTemplate } from "@/components/auth/invite-email-template"
import { emailInviteeFrom } from "@/components/auth/invitees"
import {
  IconButton,
  InboxChip,
  MailFonts,
  ROBOTO,
  SANS,
  Sym,
} from "@/components/auth/mail-chrome"

export const metadata: Metadata = { title: "Invitation email" }

/* The invitation as the recipient meets it: open in their inbox. The chrome
   follows the webmail layout people already know — rail, folders, reading
   pane, side panel — measured from a real inbox, but it carries no mail
   provider's logo, wordmark or app icons, so it reads as "an email arrived"
   without passing itself off as anyone's product.

   The chrome is always light: it stands for someone else's app, which does not
   follow this prototype's theme. Colours are therefore literal, not tokens.

   The message itself is the shared email template, so the web and mobile
   screens send the same letter. The mobile screen lives at ./mobile. */

const RAIL = [
  { icon: "mail", label: "Mail", badge: "3", active: true },
  { icon: "chat_bubble", label: "Chat" },
  { icon: "videocam", label: "Meet" },
]

const FOLDERS = [
  { icon: "inbox", label: "Inbox", count: "3", active: true },
  { icon: "star", label: "Starred" },
  { icon: "schedule", label: "Snoozed" },
  { icon: "send", label: "Sent" },
  { icon: "draft", label: "Drafts", count: "1", bold: true },
  { icon: "label", label: "Categories", caret: true },
  { icon: "expand_more", label: "More" },
]

const TOOLBAR = [
  ["archive", "report", "delete"],
  ["mark_email_unread", "schedule", "add_task"],
  ["drive_file_move", "label", "more_vert"],
]

const REPLY_ACTIONS = [
  { icon: "reply", label: "Reply" },
  { icon: "reply_all", label: "Reply to all" },
  { icon: "forward", label: "Forward" },
]

const SIDE_PANEL = ["calendar_today", "lightbulb", "task_alt", "person"]

export default async function InviteEmailScreen({
  searchParams,
}: {
  searchParams: Promise<{ as?: string | string[] }>
}) {
  const invitee = emailInviteeFrom((await searchParams).as)

  return (
    <div
      className="relative flex h-svh flex-col overflow-hidden bg-[#f8fafd] text-[#1f1f1f] [color-scheme:light]"
      style={SANS}
    >
      <MailFonts />

      {/* the rail's tint runs the full height, behind the menu button too */}
      <div aria-hidden className="absolute inset-y-0 left-0 hidden w-[68px] bg-[#e9eef6]/70 md:block" />

      {/* top bar */}
      <header className="relative flex h-[60px] shrink-0 items-center pr-4">
        <div className="flex shrink-0 items-center pr-2 lg:w-[324px] lg:pr-0">
          <IconButton name="menu" label="Main menu" size={48} icon={24} className="ml-[10px]" />
          <span className="ml-2 flex items-center gap-2 text-[22px] text-[#444746] sm:ml-[22px]">
            <span className="flex size-[30px] items-center justify-center rounded-md bg-[#444746] text-white">
              <Sym name="mail" size={20} fill />
            </span>
            <span className="hidden sm:inline">Mail</span>
          </span>
        </div>
        <div className="flex h-12 max-w-[720px] min-w-0 flex-1 items-center rounded-full bg-[#e9eef6] pr-1 pl-2 text-[#444746]">
          <IconButton name="search" label="Search" size={40} icon={24} />
          <span className="ml-2 min-w-0 flex-1 truncate text-base">Search mail</span>
          <IconButton name="tune" label="Search options" size={40} icon={24} />
        </div>
        <div className="ml-auto hidden items-center lg:flex">
          <span className="mr-2 flex h-12 items-center gap-2 rounded-full bg-[#e9eef6] pr-3 pl-3.5 text-base text-[#1f1f1f]">
            <span className="size-3 rounded-full bg-[#1e8e3e]" />
            Active
            <Sym name="keyboard_arrow_down" size={18} className="text-[#444746]" />
          </span>
          <IconButton name="help" label="Support" size={48} icon={24} />
          <IconButton name="settings" label="Settings" size={48} icon={24} />
          <IconButton name="apps" label="Apps" size={48} icon={24} />
          <span className="ml-2 flex h-12 items-center gap-2 rounded-full border border-[#747775] pr-1 pl-3">
            <Image
              src={LOGO.light}
              alt={`${BRAND_NAME} Lab`}
              width={LOGO.width}
              height={LOGO.height}
              className="h-7 w-auto"
            />
            <span className="flex size-8 items-center justify-center rounded-full bg-[#5c6bc0] text-base text-white">
              {invitee.firstName[0]}
            </span>
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* app rail */}
        <nav className="relative hidden w-[68px] shrink-0 flex-col items-center gap-3 pt-[18px] md:flex">
          {RAIL.map(({ icon, label, badge, active }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "relative flex h-8 w-14 items-center justify-center rounded-full text-[#444746]",
                  active && "bg-[#d3e3fd] text-[#041e49]"
                )}
              >
                <Sym name={icon} size={24} fill={active} />
                {badge ? (
                  <span
                    className="absolute -top-1.5 left-[30px] flex h-4 min-w-4 items-center justify-center rounded-full bg-[#b3261e] px-1 text-[11px] font-bold text-white ring-2 ring-[#eef2f9]"
                    style={ROBOTO}
                  >
                    {badge}
                  </span>
                ) : null}
              </span>
              <span className={cn("text-xs text-[#444746]", active && "font-bold text-[#1f1f1f]")}>
                {label}
              </span>
            </div>
          ))}
        </nav>

        {/* folders */}
        <nav className="hidden w-[256px] shrink-0 flex-col pr-3 pl-3 lg:flex">
          <span
            role="button"
            className="mt-[11px] mb-4 flex h-12 w-[138px] items-center gap-[14px] rounded-2xl bg-[#c2e7ff] pl-[14px] text-sm font-medium text-[#001d35] hover:shadow-md"
          >
            <Sym name="edit" size={24} />
            Compose
          </span>
          <ul>
            {FOLDERS.map(({ icon, label, count, active, bold, caret }) => (
              <li
                key={label}
                className={cn(
                  "relative flex h-6 items-center rounded-full pr-3 pl-[14px] text-sm text-[#1f1f1f]",
                  active && "bg-[#d3e3fd] font-bold text-[#001d35]",
                  bold && "font-bold"
                )}
              >
                {caret ? (
                  <Sym name="arrow_right" size={20} fill className="absolute -left-[6px] text-[#444746]" />
                ) : null}
                <Sym name={icon} size={20} fill={active} className="text-[#444746]" />
                <span className="ml-[16px] flex-1">{label}</span>
                {count ? (
                  <span className={cn("text-xs", active ? "font-bold" : "font-normal")}>
                    {count}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex h-8 items-center justify-between pr-2 pl-4">
            <span className="text-base font-medium">Labels</span>
            <Sym name="add" size={24} className="text-[#444746]" />
          </div>
          <ul className="mt-1">
            <li className="flex h-6 items-center pl-[14px] text-sm">
              <Sym name="label" size={20} fill className="text-[#444746]" />
              <span className="ml-[16px]">Team</span>
            </li>
            <li className="flex h-6 items-center pl-[14px] text-sm">
              <Sym name="expand_more" size={20} className="text-[#444746]" />
              <span className="ml-[16px]">More</span>
            </li>
          </ul>
        </nav>

        {/* reading pane */}
        <main className="mx-2 mb-4 flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white md:ml-0">
          <div className="flex h-12 shrink-0 items-center px-1.5">
            <IconButton name="arrow_back" label="Back to inbox" />
            {TOOLBAR.map((group, i) => (
              <div key={i} className="hidden items-center lg:flex">
                <span className={cn("mr-[9px] ml-[5px] h-5 w-px bg-[#e0e0e0]", i === 0 && "invisible mr-[7px] ml-[8px]")} />
                {group.map((name) => (
                  <IconButton key={name} name={name} className="mr-1" />
                ))}
              </div>
            ))}
            <span className="ml-auto pr-4 text-xs text-[#444746]" style={ROBOTO}>
              1 of 2,619
            </span>
            <IconButton name="chevron_left" label="Newer" className="text-[#c4c7c5]" />
            <IconButton name="chevron_right" label="Older" className="mr-2" />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="pr-4 pb-6 pl-4 sm:pr-8">
              {/* subject */}
              <div className="flex items-start gap-2 pt-[22px] sm:pl-[56px]">
                <h1 className="flex-1 text-[22px] leading-7 text-[#1f1f1f]">
                  Welcome to {BRAND_NAME}: Activate Your {invitee.key === "patient" ? "" : `${invitee.role} `}Account
                  <Sym
                    name="label_important"
                    size={20}
                    className="ml-2 -translate-y-px align-middle text-[#747775]"
                  />
                  <span className="ml-2 inline-block -translate-y-0.5">
                    <InboxChip />
                  </span>
                </h1>
                <div className="-mt-1.5 flex">
                  <IconButton name="print" label="Print all" />
                  <IconButton name="open_in_new" label="In new window" />
                </div>
              </div>

              {/* sender */}
              <div className="mt-[22px] flex items-start">
                <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-[#e3e3e3]">
                  <Image
                    src={MARK.light}
                    alt=""
                    width={MARK.size}
                    height={MARK.size}
                    className="size-7"
                  />
                </span>
                <div className="ml-4 min-w-0 flex-1 pt-px">
                  <p className="truncate text-sm leading-5">
                    <span className="font-bold text-[#1f1f1f]">{BRAND_NAME}</span>{" "}
                    <span className="text-xs text-[#5e5e5e]" style={ROBOTO}>
                      &lt;no-reply@humanoptimization.com&gt;
                    </span>
                  </p>
                  <p className="flex items-center text-xs leading-5 text-[#5e5e5e]" style={ROBOTO}>
                    to me
                    <Sym name="arrow_drop_down" size={20} className="text-[#444746]" />
                  </p>
                </div>
                <span className="hidden pt-[10px] pr-3 text-xs text-[#5e5e5e] sm:inline" style={ROBOTO}>
                  9:14 AM (2 minutes ago)
                </span>
                <IconButton name="star" label="Not starred" />
                <IconButton name="add_reaction" label="Add reaction" />
                <IconButton name="reply" label="Reply" />
                <IconButton name="more_vert" label="More" />
              </div>

              {/* body */}
              <div className="mt-5 sm:pl-[56px]">
                <InviteEmailTemplate invitee={invitee.key} />
                <div className="mt-6 flex flex-wrap gap-2">
                  {REPLY_ACTIONS.map(({ icon, label }) => (
                    <span
                      key={label}
                      role="button"
                      className="flex h-9 items-center gap-2 rounded-full border border-[#747775] pr-6 pl-4 text-sm font-medium text-[#444746] hover:bg-[#1f1f1f]/[0.04]"
                    >
                      <Sym name={icon} size={20} />
                      {label}
                    </span>
                  ))}
                  <span
                    role="button"
                    aria-label="Add reaction"
                    className="flex size-9 items-center justify-center rounded-full border border-[#747775] text-[#444746]"
                  >
                    <Sym name="add_reaction" size={20} />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* side panel */}
        <aside className="hidden w-14 shrink-0 flex-col items-center pt-[10px] lg:flex">
          {SIDE_PANEL.map((name) => (
            <IconButton key={name} name={name} icon={22} className="mb-[17px]" />
          ))}
          <span className="mb-4 h-px w-5 bg-[#c4c7c5]" />
          <IconButton name="add" label="Get add-ons" icon={22} />
          <IconButton name="chevron_right" label="Hide side panel" className="mt-auto mb-2" />
        </aside>
      </div>
    </div>
  )
}
