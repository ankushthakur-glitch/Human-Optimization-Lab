import { Fragment } from "react"
import Image from "next/image"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { BRAND_NAME, LOGO, MARK } from "@/lib/brand"
import {
  INVITEES,
  withInvitee,
  type InviteeKey,
} from "@/components/auth/invitees"

/* The invitation as it is sent, to a Super Admin, a practice's clinic
   manager or a provider: a logo header, the letter, and a contact footer
   for whoever sent it. Laid out from the approved email
   template (Figma "Main Container" for web, "Email Temp" for mobile), recoloured
   from its blue to the brand teal.

   Colours are literal because an email cannot follow the app's theme or read
   its CSS variables — it looks the same in every inbox. It is set in Inter,
   the template's face, which the root layout already loads.

   Per the product rules the email carries no health information. It carries
   no link text or sign-in details either: a one-time activation code and an
   Activate account button, which opens the page that asks for the code and
   then a new password. The code is sample text. */

/* The brand teal, the portal primary: the fill for the button, the deeper
   step for text drawn in it. */
const PRIMARY = "#01837E"
const PRIMARY_TINT = "#005350"

/* Who sent the invitation and the practice it is for stand out in the
   letter: set heavier and in the darkest ink. */
function Name({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-[#171717]">{children}</span>
}

/* Long values (an email address, a website) drop to their own line as a
   whole, and only wrap at a natural point: after a slash or before the @,
   never mid-word. */
function Breakable({ text }: { text: string }) {
  return text.split(/(?<=\/)(?!\/)|(?=@)/).map((part, i) => (
    <Fragment key={i}>
      {i > 0 && <wbr />}
      {part}
    </Fragment>
  ))
}

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden>
      <path
        d="M3 8h10M9 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* The button the letter is built around: it opens the portal's activate
   page. Drawn as a styled link, which is how a button is made in an email. */
function ActivateButton({ invitee }: { invitee: InviteeKey }) {
  const className =
    "inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-[15px] font-semibold text-white no-underline"
  return (
    <Link
      href={withInvitee("/screens/login/activate", invitee)}
      className={className}
      style={{ backgroundColor: PRIMARY }}
    >
      Activate account
      <Arrow />
    </Link>
  )
}

export function InviteEmailTemplate({
  variant = "web",
  invitee: key = "super-admin",
  className,
}: {
  variant?: "web" | "mobile"
  invitee?: InviteeKey
  className?: string
}) {
  const web = variant === "web"
  const invitee = INVITEES[key]
  const manager = key === "clinic-manager"
  const provider = key === "provider"
  /* Practice staff get help with the portal, not the admin console. */
  const staff = manager || provider
  const { sender } = invitee
  const contacts = [
    { icon: "/email/envelope.svg", text: sender.email, link: true },
    { icon: "/email/globe.svg", text: sender.website, link: true },
    { icon: "/email/phone.svg", text: sender.phone },
    { icon: "/email/map-pin.svg", text: sender.address },
  ]

  return (
    <div
      className={cn(
        "@container flex flex-col overflow-hidden rounded-2xl border border-[#e6e6e6] bg-[#fafafa] text-sm leading-[1.6] text-[#393939]",
        className
      )}
      style={{ fontFamily: "var(--font-inter), Inter, Arial, sans-serif" }}
    >
      <div className={web ? "px-7 py-4" : "p-4"}>
        <Image
          src={LOGO.light}
          alt={BRAND_NAME}
          width={LOGO.width}
          height={LOGO.height}
          className={cn("w-auto", web ? "h-[42px]" : "h-8")}
        />
      </div>

      <div className={web ? "px-7 py-5" : "px-4 py-5"}>
        <p className={cn(!web && "mb-[1.6em]")}>Dear {invitee.firstName},</p>
        {provider ? (
          <>
            <p>
              <Name>{sender.name}</Name>, clinic manager at{" "}
              <Name>{invitee.practice}</Name>, has invited you to the {BRAND_NAME} provider portal.
            </p>
            <p className="mb-[1.6em]">
              Your account is ready. Activate it to add your patients and invite
              them to the {BRAND_NAME} app.
            </p>
          </>
        ) : manager ? (
          <>
            <p>
              <Name>{sender.name}</Name>, platform admin at {BRAND_NAME} Lab,
              has added <Name>{invitee.practice}</Name> to{" "}
              {BRAND_NAME} and invited you as its Clinic Manager.
            </p>
            <p className="mb-[1.6em]">
              Your account is ready. Activate it to manage your practice&rsquo;s
              clinicians, patients and settings in one place.
            </p>
          </>
        ) : (
          <>
            <p>
              <Name>{sender.name}</Name>, platform admin at {BRAND_NAME} Lab,
              has invited you to the {BRAND_NAME} admin
              console as a Super Admin.
            </p>
            <p className="mb-[1.6em]">
              Your account is ready. Activate it to manage practices, users and
              platform settings in one place.
            </p>
          </>
        )}

        {/* The activation ticket: who it admits on the stub, then the code
            and the button that uses it below the tear line. On the web it
            keeps half the letter's width, on the left. */}
        <div className="mb-[1.6em] flex">
          <div
            className={cn(
              "w-full rounded-2xl border border-[#e8ecec] bg-white",
              web && "max-w-[calc(50%-0.5rem)] min-w-0"
            )}
          >
            <div
              className={cn(
                "flex items-center justify-between gap-4 pt-6 pb-7",
                web ? "px-7" : "px-5"
              )}
            >
              <div className="min-w-0 leading-[1.5]">
                <p className="text-[13px] text-[#6b7280]">Admit one</p>
                <p className="font-semibold text-[#171717]">{invitee.role}</p>
                <p className="text-[13px] text-[#6b7280]">
                  <Breakable text={invitee.email} />
                </p>
              </div>
              <Image
                src={MARK.light}
                alt=""
                width={48}
                height={48}
                className="size-10 shrink-0"
              />
            </div>
            {/* the tear line, its notches cut in the letter's grey: half
                circles laid over the ticket's edge, so each arc starts and
                ends on the border line */}
            <div className="flex items-center">
              <span className="-ml-px h-6 w-3 shrink-0 rounded-r-full border border-l-0 border-[#e8ecec] bg-[#fafafa]" />
              <span className="mx-3 flex-1 border-t-2 border-dashed border-[#d5e3e1]" />
              <span className="-mr-px h-6 w-3 shrink-0 rounded-l-full border border-r-0 border-[#e8ecec] bg-[#fafafa]" />
            </div>
            <div
              className={cn(
                "flex flex-col items-center gap-4 pt-6 pb-7 text-center",
                web ? "px-7" : "px-5"
              )}
            >
              {/* The button and the code share one width: the wider of the
                  two, so the label stays on one line. The code's trailing
                  letter spacing is pulled back so the edges line up with the
                  digits. */}
              <div className="grid w-fit gap-4">
                <p
                  className={cn(
                    "-mr-[0.35em] font-semibold tracking-[0.35em] tabular-nums",
                    web ? "text-[34px]" : "text-[30px]"
                  )}
                  style={{ color: PRIMARY_TINT }}
                >
                  {invitee.activationCode}
                </p>
                <ActivateButton invitee={key} />
              </div>
              <p className="text-[13px] text-[#6b7280]">
                Works once. Expires in 48 hours.
              </p>
            </div>
          </div>
        </div>

        <p className="mb-[1.6em]">
          If the code runs out, ask <Name>{sender.name}</Name> to send a new
          invitation.
        </p>
        <p>
          If you have any questions or need help accessing{" "}
          {staff ? "the portal" : "the admin console"},
          please contact <Name>{sender.name}</Name> at{" "}
          <span
            className="underline underline-offset-2"
            style={{ color: PRIMARY_TINT }}
          >
            {sender.phone}
          </span>
          .
        </p>
        <p className="mb-[1.6em]">We look forward to working with you.</p>
        <p>
          Warm regards,
          <br />
          The {BRAND_NAME} team
        </p>
      </div>

      <div
        className={cn(
          "flex items-center gap-x-10 gap-y-2 rounded-b-[4px] border border-[#dfdfe4] bg-[#eef7f6] py-5",
          web ? "px-7" : "px-4"
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-[11px]">
          <p className="flex flex-wrap items-baseline gap-2">
            <span
              className={cn(
                "font-medium",
                web ? "text-xl leading-[1.4]" : "text-lg leading-[1.45]"
              )}
            >
              {sender.name}
            </span>
            <span className="text-[#606060]">( {sender.title} )</span>
          </p>
          {invitee.practice && (
            <p className="-mt-[7px] font-medium text-[#171717]">
              {invitee.practice}
            </p>
          )}
          <ul className="flex flex-col gap-2">
            {contacts.map(({ icon, text, link }) => (
              <li key={text} className="flex items-center gap-2">
                <Image
                  src={icon}
                  alt=""
                  width={20}
                  height={20}
                  className="shrink-0"
                />
                <span
                  className={cn(
                    "min-w-0",
                    link && "underline underline-offset-2"
                  )}
                >
                  <Breakable text={text} />
                </span>
              </li>
            ))}
          </ul>
        </div>
        {web ? (
          <Image
            src={LOGO.light}
            alt=""
            width={LOGO.width}
            height={LOGO.height}
            className="hidden h-12 w-auto shrink-0 @xl:block"
          />
        ) : null}
      </div>
    </div>
  )
}
