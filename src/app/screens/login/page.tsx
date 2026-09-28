import type { Metadata } from "next"

import { AuthShell } from "@/components/auth/auth-shell"
import { SignInForm } from "@/components/auth/sign-in-form"
import { INVITEES, inviteeFrom, safeNext } from "@/components/auth/invitees"

export const metadata: Metadata = { title: "Sign in" }

/** Returning user: Organization ID, email and password, then the
    authenticator code. Practice staff give their ID; the Super Admin doesn't.

    After an expired session the link carries `?next=` (the page it ended on)
    and, for practice staff, `?as=`: the form is filled in for that person and
    every path through it returns to their portal, never the admin console. */
export default async function SignInScreen({
  searchParams,
}: {
  searchParams: Promise<{ as?: string | string[]; next?: string | string[] }>
}) {
  const params = await searchParams
  const next = safeNext(params.next)

  if (next) {
    const invitee = inviteeFrom(params.as)
    const query = new URLSearchParams()
    if (invitee.key !== "super-admin") query.set("as", invitee.key)
    query.set("next", next)
    const verify = `/screens/login/verify?${query}`
    return (
      <AuthShell title="Sign in to your account">
        <SignInForm
          next={verify}
          nextForPractice={verify}
          defaultOrgId={invitee.orgId ?? ""}
          defaultEmail={invitee.email}
          showOrgId={invitee.key !== "super-admin"}
          orgRequired={invitee.key !== "super-admin"}
        />
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Sign in to your account">
      <SignInForm
        next="/screens/login/verify"
        nextForPractice="/screens/login/verify?as=clinic-manager"
        practiceByEmail={{
          [INVITEES.provider.email]: "/screens/login/verify?as=provider",
        }}
      />
    </AuthShell>
  )
}
