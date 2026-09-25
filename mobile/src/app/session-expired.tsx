import { SessionExpiredState } from "@/components/error-state"
import { useAuth } from "@/lib/auth"

/** Shown in place of home once the idle timeout signs the patient out.
    Signing out for real hands them to the sign-in screen. */
export default function SessionExpiredScreen() {
  const { signOut } = useAuth()
  return <SessionExpiredState onSignIn={signOut} />
}
