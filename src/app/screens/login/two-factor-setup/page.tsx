import type { Metadata } from "next"

import { TwoFactorSetup } from "@/components/auth/two-factor-setup"
import { inviteeFrom } from "@/components/auth/invitees"

export const metadata: Metadata = { title: "Two-factor setup" }

export default async function TwoFactorSetupScreen({
  searchParams,
}: {
  searchParams: Promise<{ as?: string | string[] }>
}) {
  const invitee = inviteeFrom((await searchParams).as)
  return <TwoFactorSetup invitee={invitee.key} />
}
