import { Fragment } from "react"
import Image from "next/image"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { BRAND_NAME, LOGO } from "@/lib/brand"
import {
  INVITEES,
  withInvitee,
  type InviteeKey,
} from "@/components/auth/invitees"

/* The invitation as it is sent, to a Super Admin or to a practice's clinic
   manager: a logo header, the letter, and a
   contact footer for the admin who sent it. Laid out from the approved email
   template (Figma "Main Container" for web, "Email Temp" for mobile), recoloured
   from its blue to the brand teal.

   Colours are literal because an email cannot follow the app's theme or read
   its CSS variables — it looks the same in every inbox. It is set in Inter,
   the template's face, which the root layout already loads.

   Per the product rules the email carries no health information. The
   one-time password is sample text. */

const TEAL = "#01837E"

const CONTACTS = [
  { icon: "/email/envelope.svg", text: "maya.chen@humanoptimization.com", link: true },
  { icon: "/email/globe.svg", text: "humanoptimizationlab.com", link: true },
  { icon: "/email/phone.svg", text: "(229) 555-0109" },
  { icon: "/email/map-pin.svg", text: "123 Main Street, Anytown, CA 12345" },
]

const FIRST_SIGN_IN = [
  "Create your own password",
  "Set up two-factor authentication with an authenticator app",
]

/* Long values (the console link, the email address) drop to their own line as
   a whole rather than leaving "https://" behind, and only wrap at a natural
   point: after a slash or before the @, never mid-word. */
function Breakable({ text }: { text: string }) {
  return text.split(/(?<=\/)(?!\/)|(?=@)/).map((part, i) => (
    <Fragment key={i}>
      {i > 0 && <wbr />}
      {part}
    </Fragment>
  ))
}

function EmailLink({ invitee, text }: { invitee: InviteeKey; text: string }) {
  return (
    <Link
      href={withInvitee("/screens/login/activate", invitee)}
      className="inline-block max-w-full underline decoration-from-font underline-offset-2"
      style={{ color: TEAL }}
    >
      <Breakable text={text} />
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
  const label = cn(web && "font-medium")

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
        {manager ? (
          <>
            <p>
              <span className="font-medium">Maya Chen</span>, platform admin at{" "}
              {BRAND_NAME} Lab, has added{" "}
              <span className="font-medium">{invitee.practice}</span> to{" "}
              {BRAND_NAME} and invited you as its Clinic Manager.
            </p>
            <p className="mb-[1.6em]">
              Your account is ready. Activate it to sign in and manage your
              practice&rsquo;s clinicians, patients and settings in one place.
            </p>
          </>
        ) : (
          <>
            <p>
              <span className="font-medium">Maya Chen</span>, platform admin at{" "}
              {BRAND_NAME} Lab, has invited you to the {BRAND_NAME} admin console
              as a Super Admin.
            </p>
            <p className="mb-[1.6em]">
              Your account is ready. Activate it to sign in and manage practices,
              users and platform settings in one place.
            </p>
          </>
        )}

        <p>Next Steps:</p>
        <ol className="list-decimal">
          <li className="ms-[21px] mb-[1.6em]">
            Click the link below to activate your {invitee.role} account:
            <br />
            <span className={label}>{invitee.consoleName} Link :</span>{" "}
            <EmailLink invitee={key} text={`https://${invitee.consoleUrl}`} />
            {invitee.orgId && (
              <>
                <br />
                <span className={label}>Organization ID :</span>{" "}
                <span className="tracking-wide tabular-nums">{invitee.orgId}</span>
              </>
            )}
            <br />
            <span className={label}>Email ID :</span>{" "}
            <EmailLink invitee={key} text={invitee.email} />
            <br />
            <span className={label}>One-Time Password :</span>{" "}
            <span className="tracking-wide whitespace-nowrap tabular-nums">Kq7-mW2p-Xa9</span>
          </li>
          <li className="ms-[21px] mb-[1.6em]">
            The first time you sign in, you&rsquo;ll be asked to:
            <ul className="list-disc">
              {FIRST_SIGN_IN.map((step) => (
                <li key={step} className="ms-[21px]">
                  {step}
                </li>
              ))}
            </ul>
          </li>
        </ol>

        <p className={cn(manager && "mb-[1.6em]")}>
          The one-time password works once. After you set your own password
          you won&rsquo;t need it again.
        </p>
        {manager && (
          <p>
            Keep your Organization ID. You&rsquo;ll enter it with your email
            and password each time you sign in.
          </p>
        )}
        <p>
          If you have any questions or need help accessing{" "}
          {manager ? "the portal" : "the admin console"}, please
          contact Maya Chen at{" "}
          <span className="underline underline-offset-2" style={{ color: TEAL }}>
            (229) 555-0109
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
              Maya Chen
            </span>
            <span className="text-[#606060]">( Platform Admin )</span>
          </p>
          <ul className="flex flex-col gap-2">
            {CONTACTS.map(({ icon, text, link }) => (
              <li key={text} className="flex items-center gap-2">
                <Image src={icon} alt="" width={20} height={20} className="shrink-0" />
                <span className={cn("min-w-0", link && "underline underline-offset-2")}>
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
