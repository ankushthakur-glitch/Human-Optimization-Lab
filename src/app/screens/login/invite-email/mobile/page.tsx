import type { Metadata } from "next"
import Image from "next/image"

import { BRAND_NAME, MARK } from "@/lib/brand"
import { InviteEmailTemplate } from "@/components/auth/invite-email-template"
import { inviteeFrom } from "@/components/auth/invitees"
import {
  IconButton,
  InboxChip,
  MailFonts,
  ROBOTO,
  SANS,
  Sym,
} from "@/components/auth/mail-chrome"

export const metadata: Metadata = { title: "Invitation email (mobile)" }

/* The invitation as it arrives on a phone: open in a mail app, laid out from
   the approved mobile email frame (375 × 812). On a phone the frame fills the
   screen; on anything wider it sits in a device outline so the proportions
   hold.

   Like the web screen, the app is always light and carries no mail provider's
   logo or wordmark. The letter is the shared email template. */

const TOP_ACTIONS = [
  { name: "archive", label: "Archive" },
  { name: "delete", label: "Delete" },
  { name: "mark_email_unread", label: "Mark as unread" },
]

function StatusBar() {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between px-4" style={ROBOTO}>
      <span className="w-9 text-[15px] font-medium tracking-tight">9:16</span>
      <span className="flex items-center gap-1">
        <Sym name="signal_cellular_alt" size={20} fill />
        <Sym name="wifi" size={20} fill />
        {/* battery, drawn: the icon fonts only have an upright one */}
        <span className="relative ml-0.5 flex h-[12px] w-[24px] items-center rounded-[4px] border border-[#1f1f1f]/40 p-[1.5px]">
          <span className="h-full w-[75%] rounded-[2px] bg-[#1f1f1f]" />
          <span className="absolute -right-[3px] h-1 w-[1.5px] rounded-r bg-[#1f1f1f]/40" />
        </span>
      </span>
    </div>
  )
}

export default async function InviteEmailMobileScreen({
  searchParams,
}: {
  searchParams: Promise<{ as?: string | string[] }>
}) {
  const invitee = inviteeFrom((await searchParams).as)

  return (
    <div
      className="flex min-h-svh items-center justify-center bg-[#e9eef6] text-[#1f1f1f] [color-scheme:light] sm:py-8"
      style={SANS}
    >
      <MailFonts />

      <div className="flex h-svh w-full max-w-[375px] flex-col overflow-hidden bg-[#f8fafd] sm:h-[812px] sm:rounded-[44px] sm:shadow-[0_0_0_10px_#1f1f1f,0_24px_60px_rgba(0,0,0,0.25)]">
        <StatusBar />

        {/* app bar */}
        <div className="flex h-14 shrink-0 items-center justify-between px-1">
          <IconButton name="arrow_back" label="Back to inbox" size={48} icon={24} />
          <div className="flex">
            {TOP_ACTIONS.map(({ name, label }) => (
              <IconButton key={name} name={name} label={label} size={48} icon={24} fill />
            ))}
            <IconButton name="more_vert" label="More" size={48} icon={24} />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* subject */}
          <div className="flex h-11 items-center gap-2 pr-4 pl-4">
            <h1 className="min-w-0 flex-1 truncate text-[22px] leading-7">
              Welcome to {BRAND_NAME}: Activate Your {invitee.role} Account
            </h1>
            <Sym name="label_important" size={22} className="text-[#747775]" />
            <InboxChip />
            <IconButton name="star" label="Not starred" size={32} icon={22} className="-mr-1 ml-1" />
          </div>

          {/* sender */}
          <div className="mt-3 flex h-16 items-center pr-2 pl-4">
            <span className="flex size-[42px] shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-[#e3e3e3]">
              <Image src={MARK.light} alt="" width={MARK.size} height={MARK.size} className="size-7" />
            </span>
            <div className="ml-4 min-w-0 flex-1">
              <p className="flex items-baseline gap-2">
                <span className="truncate text-base leading-6 font-medium">{BRAND_NAME}</span>
                <span className="shrink-0 text-xs text-[#5e5e5e]" style={ROBOTO}>
                  (2 min. ago)
                </span>
              </p>
              <p className="flex items-center text-sm leading-6 text-[#444746]" style={ROBOTO}>
                to me
                <Sym name="keyboard_arrow_down" size={24} className="text-[#444746]" />
              </p>
            </div>
            <IconButton name="reply" label="Reply" size={38} icon={22} />
            <IconButton name="more_vert" label="More" size={38} icon={22} className="ml-1.5" />
          </div>

          {/* message */}
          <div className="px-2 pt-4 pb-4">
            <InviteEmailTemplate variant="mobile" invitee={invitee.key} />
          </div>
        </div>

        {/* bottom navigation + home indicator */}
        <div className="shrink-0 bg-[#e9eef6]">
          <div className="flex h-11 px-4">
            <span className="flex flex-1 items-center justify-center">
              <span className="flex h-7 w-14 items-center justify-center rounded-full bg-[#d3e3fd] text-[#041e49]">
                <Sym name="mail" size={24} fill />
              </span>
            </span>
            <span className="flex flex-1 items-center justify-center text-[#444746]">
              <Sym name="videocam" size={24} />
            </span>
          </div>
          <div className="flex h-7 items-start justify-center pt-3.5">
            <span className="h-1 w-[134px] rounded-full bg-[#1f1f1f]" />
          </div>
        </div>
      </div>
    </div>
  )
}
