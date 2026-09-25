import { router } from "expo-router"

import { SessionExpiredState } from "@/components/error-state"
import { useAuth } from "@/lib/auth"

/** The session expired state on its own, for review without waiting out the
    idle timeout. Sign in again behaves as it does for real. */
export default function SessionExpiredPreviewScreen() {
  const { signOut } = useAuth()
  return (
    <SessionExpiredState
      onSignIn={async () => {
        await signOut()
        router.replace("/sign-in")
      }}
    />
  )
}
