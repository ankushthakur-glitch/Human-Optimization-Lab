import type { Metadata } from "next"

import { MyProfileScreen } from "@/components/settings/my-profile"

export const metadata: Metadata = { title: "My profile" }

export default function Page() {
  return <MyProfileScreen portal="admin" />
}
