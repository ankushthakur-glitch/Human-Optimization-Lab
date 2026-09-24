import * as Crypto from "expo-crypto"
import * as SecureStore from "expo-secure-store"
import * as React from "react"
import { Platform } from "react-native"

import { PATIENT } from "@/lib/patient"
import { VALIDATE } from "@/lib/validate"

/* Account state for the patient app.

   The flow: the patient signs in once with the email and one-time password
   from their invitation, sets their own password, and uses that from then
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

export type Status =
  | "loading"
  /** No session. */
  | "signedOut"
  /** Signed in with the one-time password; must set a password before going on. */
  | "mustSetPassword"
  | "signedIn"

type Result = { ok: true } | { ok: false; message: string }

type Auth = {
  status: Status
  /** A password has been set on this device, so the one-time password is spent. */
  activated: boolean
  activate: (email: string, oneTimePassword: string) => Promise<Result>
  setPassword: (password: string) => Promise<Result>
  signIn: (email: string, password: string) => Promise<Result>
  signOut: () => Promise<void>
}

const AuthContext = React.createContext<Auth | null>(null)

const store =
  Platform.OS === "web"
    ? {
        getItemAsync: async (key: string) => localStorage.getItem(key),
        setItemAsync: async (key: string, value: string) => localStorage.setItem(key, value),
        deleteItemAsync: async (key: string) => localStorage.removeItem(key),
      }
    : SecureStore

const sameEmail = (a: string) => a.trim().toLowerCase() === PATIENT.email
const hash = (value: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value)
/* Stands in for the network round trip, so the busy state shows. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 600))

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<Status>("loading")
  const [activated, setActivated] = React.useState(false)

  React.useEffect(() => {
    Promise.all([store.getItemAsync(KEY_HASH), store.getItemAsync(KEY_SIGNED_IN)])
      .then(([saved, signedIn]) => {
        setActivated(!!saved)
        setStatus(saved && signedIn ? "signedIn" : "signedOut")
      })
      .catch(() => setStatus("signedOut"))
  }, [])

  const value = React.useMemo<Auth>(
    () => ({
      status,
      activated,

      async activate(email, oneTimePassword) {
        await settle()
        if (VALIDATE && (!sameEmail(email) || oneTimePassword.trim() !== PATIENT.oneTimePassword)) {
          return { ok: false, message: "That email and one-time password don’t match our records." }
        }
        if (VALIDATE && activated) {
          return {
            ok: false,
            message: "This one-time password has already been used. Sign in with your password.",
          }
        }
        // Held in memory only: closing the app before a password is set
        // means signing in with the one-time password again.
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
            message: "Activate your account with the one-time password from your invitation email first.",
          }
        }
        if (VALIDATE && (!sameEmail(email) || (await hash(password)) !== saved)) {
          return { ok: false, message: "That email and password don’t match our records." }
        }
        await store.setItemAsync(KEY_SIGNED_IN, "1")
        setStatus("signedIn")
        return { ok: true }
      },

      async signOut() {
        await store.deleteItemAsync(KEY_SIGNED_IN)
        setStatus("signedOut")
      },
    }),
    [status, activated]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const auth = React.useContext(AuthContext)
  if (!auth) throw new Error("useAuth must be used inside <AuthProvider>")
  return auth
}
