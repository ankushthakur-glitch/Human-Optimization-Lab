import * as Crypto from "expo-crypto"
import * as React from "react"
import { AppState } from "react-native"

import { PATIENT } from "@/lib/patient"
import { store } from "@/lib/storage"
import { VALIDATE } from "@/lib/validate"

/* Account state for the patient app.

   The flow: the invitation's Activate account button opens activation,
   where the patient enters the one-time code from the email, then sets their
   own password, and uses that from then
   on. No two-factor step.

   This is a prototype with no backend yet, so the device plays the server:
   it knows the one sample patient, and keeps a SHA-256 hash of the password
   they set in SecureStore (Android Keystore, iOS Keychain), never the
   password itself. The web build, used for prototype reviews, has no secure
   store and keeps it in the browser's localStorage instead. When the API
   exists, replace the bodies of `activate`, `setPassword` and `signIn` with
   calls to it; the screens need no change. */

const KEY_HASH = "hol.passwordHash"
const KEY_SIGNED_IN = "hol.signedIn"

/** A signed-in patient who leaves the app untouched this long is signed out,
    as the portal does. Checked every IDLE_CHECK_MS and on returning to the app. */
const IDLE_MS = 15 * 60 * 1000
const IDLE_CHECK_MS = 15 * 1000

export type Status =
  | "loading"
  /** No session. */
  | "signedOut"
  /** Activation code accepted; must set a password before going on. */
  | "mustSetPassword"
  | "signedIn"
  /** Signed out for inactivity; the patient sees why before signing in again. */
  | "expired"

type Result = { ok: true } | { ok: false; message: string }

type Auth = {
  status: Status
  /** A password has been set on this device, so the activation code is spent. */
  activated: boolean
  activate: (email: string, code: string) => Promise<Result>
  setPassword: (password: string) => Promise<Result>
  signIn: (email: string, password: string) => Promise<Result>
  signOut: () => Promise<void>
  /** Prototype reviews: forget the password so the next run starts at
      activation with the code, as a first-time patient would. */
  forget: () => Promise<void>
  /** Marks the patient as active, holding off the idle sign-out. */
  touch: () => void
}

const AuthContext = React.createContext<Auth | null>(null)

const sameEmail = (a: string) => a.trim().toLowerCase() === PATIENT.email
const hash = (value: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value)
/* Stands in for the network round trip, so the busy state shows. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 600))

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<Status>("loading")
  const [activated, setActivated] = React.useState(false)
  const lastActive = React.useRef(Date.now())
  const touch = React.useCallback(() => {
    lastActive.current = Date.now()
  }, [])

  React.useEffect(() => {
    Promise.all([store.getItemAsync(KEY_HASH), store.getItemAsync(KEY_SIGNED_IN)])
      .then(([saved, signedIn]) => {
        setActivated(!!saved)
        setStatus(saved && signedIn ? "signedIn" : "signedOut")
      })
      .catch(() => setStatus("signedOut"))
  }, [])

  React.useEffect(() => {
    if (status !== "signedIn") return
    touch()
    const check = () => {
      if (Date.now() - lastActive.current < IDLE_MS) return
      store.deleteItemAsync(KEY_SIGNED_IN)
      setStatus("expired")
    }
    // Timers stop while the app is in the background, so check on return too.
    const timer = setInterval(check, IDLE_CHECK_MS)
    const subscription = AppState.addEventListener("change", (state) => state === "active" && check())
    return () => {
      clearInterval(timer)
      subscription.remove()
    }
  }, [status, touch])

  const value = React.useMemo<Auth>(
    () => ({
      status,
      activated,

      async activate(email, code) {
        await settle()
        if (VALIDATE && (!sameEmail(email) || code.trim() !== PATIENT.activationCode)) {
          return { ok: false, message: "That code doesn’t match the one in your invitation email." }
        }
        if (VALIDATE && activated) {
          return {
            ok: false,
            message: "This code has already been used. Sign in with your password.",
          }
        }
        // Held in memory only: closing the app before a password is set
        // means entering the activation code again.
        setStatus("mustSetPassword")
        return { ok: true }
      },

      async setPassword(password) {
        await settle()
        await store.setItemAsync(KEY_HASH, await hash(password))
        await store.setItemAsync(KEY_SIGNED_IN, "1")
        setActivated(true)
        setStatus("signedIn")
        return { ok: true }
      },

      async signIn(email, password) {
        await settle()
        const saved = await store.getItemAsync(KEY_HASH)
        if (VALIDATE && !saved) {
          return {
            ok: false,
            message: "Activate your account with the code from your invitation email first.",
          }
        }
        if (VALIDATE && (!sameEmail(email) || (await hash(password)) !== saved)) {
          return { ok: false, message: "That email and password don’t match our records." }
        }
        await store.setItemAsync(KEY_SIGNED_IN, "1")
        // Signing in with a password means one was set, even when the demo
        // build waves the check through, so signing out (or timing out)
        // leads back to sign in rather than activation.
        setActivated(true)
        setStatus("signedIn")
        return { ok: true }
      },

      async signOut() {
        await store.deleteItemAsync(KEY_SIGNED_IN)
        setStatus("signedOut")
      },

      async forget() {
        await store.deleteItemAsync(KEY_HASH)
        await store.deleteItemAsync(KEY_SIGNED_IN)
        setActivated(false)
        setStatus("signedOut")
      },

      touch,
    }),
    [status, activated, touch]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const auth = React.useContext(AuthContext)
  if (!auth) throw new Error("useAuth must be used inside <AuthProvider>")
  return auth
}
