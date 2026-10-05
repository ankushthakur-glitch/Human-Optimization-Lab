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
   manager, or a patient invited to the mobile app: a logo header, the letter,
   and a contact footer for whoever sent it. Laid out from the approved email
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

/* A patient's app link, as the prototype follows it: the patient app's web
   build, served by this site at /app, opening on activation with the email
   filled in. The live link will be a store redirect that does the same. */
const appLink = (email: string) =>
  `/app/activate?email=${encodeURIComponent(email)}`

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

/* The button the letter is built around. Staff land on the portal's activate
   page; a patient on the app's, with their email filled in. Drawn as a styled
   link, which is how a button is made in an email. */
function ActivateButton({ invitee }: { invitee: InviteeKey }) {
  const className =
    "inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-[15px] font-semibold text-white no-underline"
  if (invitee === "patient") {
    return (
      <a
        href={appLink(INVITEES.patient.email)}
        className={className}
        style={{ backgroundColor: PRIMARY }}
      >
        Activate account
        <Arrow />
      </a>
    )
  }
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

/* Store buttons for the patient invitation read on a phone, drawn in the
   stores' black badge style, each mark as on its official badge: Apple's in
   white, Google Play's in its four colours. Both follow the same app link for
   now; the live email points each at its own store listing. */

const STORES = [
  {
    name: "App Store",
    caption: "Download on the",
    paths: [
      {
        d: "M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701",
      },
    ],
  },
  {
    name: "Google Play",
    caption: "GET IT ON",
    paths: [
      /* right, yellow */
      {
        d: "M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594z",
        color: "#FBBC04",
      },
      /* left, blue */
      {
        d: "M1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924z",
        color: "#4285F4",
      },
      /* top, green */
      {
        d: "M13.544 10.989l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973z",
        color: "#34A853",
      },
      /* bottom, red */
      {
        d: "M13.544 13.056l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z",
        color: "#EA4335",
      },
    ],
  },
]

function StoreButtons({ email }: { email: string }) {
  return (
    <span className="mt-2 flex flex-wrap gap-2">
      {STORES.map(({ name, caption, paths }) => (
        <a
          key={name}
          href={appLink(email)}
          aria-label={`${caption} ${name}`}
          className="flex h-11 items-center gap-2 rounded-lg bg-black pr-3.5 pl-3 text-white"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-6 shrink-0"
            fill="currentColor"
            aria-hidden
          >
            {paths.map(({ d, color }: { d: string; color?: string }) => (
              <path key={d} d={d} fill={color} />
            ))}
          </svg>
          <span className="flex flex-col leading-none">
            <span className="text-[10px]">{caption}</span>
            <span className="mt-0.5 text-[17px] font-medium tracking-tight">
              {name}
            </span>
          </span>
        </a>
      ))}
    </span>
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
  const patient = key === "patient"
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
        {patient ? (
          <>
            <p>
              <span className="font-medium">{invitee.practice}</span> has
              invited you to the {BRAND_NAME} app.
            </p>
            <p className="mb-[1.6em]">
              Your account is ready. Download the app on your phone and activate
              your account to get started.
            </p>
          </>
        ) : provider ? (
          <>
            <p>
              <span className="font-medium">{sender.name}</span>, clinic manager
              at <span className="font-medium">{invitee.practice}</span>, has
              invited you to the {BRAND_NAME} provider portal.
            </p>
            <p className="mb-[1.6em]">
              Your account is ready. Activate it to add your patients and invite
              them to the {BRAND_NAME} app.
            </p>
          </>
        ) : manager ? (
          <>
            <p>
              <span className="font-medium">Maya Chen</span>, platform admin at{" "}
              {BRAND_NAME} Lab, has added{" "}
              <span className="font-medium">{invitee.practice}</span> to{" "}
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
              <span className="font-medium">Maya Chen</span>, platform admin at{" "}
              {BRAND_NAME} Lab, has invited you to the {BRAND_NAME} admin
              console as a Super Admin.
            </p>
            <p className="mb-[1.6em]">
              Your account is ready. Activate it to manage practices, users and
              platform settings in one place.
            </p>
          </>
        )}

        {patient && (
          <div className="mb-[1.6em]">
            <p>First, get the {BRAND_NAME} app on your phone:</p>
            <StoreButtons email={invitee.email} />
          </div>
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
          If the code runs out, ask {patient ? invitee.practice : sender.name}{" "}
          to send a new invitation.
        </p>
        <p>
          If you have any questions or need help accessing{" "}
          {patient ? "the app" : staff ? "the portal" : "the admin console"},
          please contact {patient ? invitee.practice : sender.name} at{" "}
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
