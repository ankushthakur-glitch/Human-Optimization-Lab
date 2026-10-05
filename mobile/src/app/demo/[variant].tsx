import { type Href, router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { ActivityIndicator, StyleSheet, View } from "react-native"

import { type Status, useAuth } from "@/lib/auth"
import { DEMOS, DEMO_ACCOUNT, type DemoId } from "@/lib/demo"
import { newSession } from "@/lib/offers"
import { STEP_ROUTE, useOnboarding } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { color } from "@/lib/theme"
import NotFoundScreen from "../+not-found"

/** Not a product screen: opens the app as one of the sample patients
    (/demo/free, /demo/member and the other states in lib/demo.ts). Most
    are signed in and past onboarding, and land on Home, which switches
    between the free and the member home by itself; a seed whose setup is
    not done lands on its step. The onboarding seeds that leave the
    account signed out land on activation, or on sign in just after the
    password was created. Like errors/, it sits outside every guard, so the
    link works whatever state the device is in. Each seed is a new session
    for the offer caps, as a fresh launch would be. */
export default function DemoScreen() {
  const { variant } = useLocalSearchParams<{ variant: string }>()
  // Own keys only, so a name such as "toString" is never a seed.
  const id = variant && Object.prototype.hasOwnProperty.call(DEMOS, variant) ? (variant as DemoId) : undefined
  const onboarding = useOnboarding()
  const auth = useAuth()
  const started = React.useRef(false)
  // Where the seed lands, opened once its account state has reached the
  // guards (app/_layout.tsx), so the screen exists by then.
  const [landing, setLanding] = React.useState<{ href: Href; status: Status } | null>(null)

  React.useEffect(() => {
    if (!id || started.current || !onboarding.loaded || auth.status === "loading") return
    started.current = true
    ;(async () => {
      newSession()
      const patch = DEMOS[id]()
      await onboarding.save(patch)
      const account = DEMO_ACCOUNT[id]
      if (account === "activate") {
        // No password on the device: activation with the code, as a new install.
        await auth.forget()
        setLanding({ href: "/activate", status: "signedOut" })
      } else if (account === "sign-in") {
        // Creating the password leaves the account signed out; sign in
        // follows with her email filled in.
        await auth.setPassword("demo")
        setLanding({ href: { pathname: "/sign-in", params: { created: "1", email: PATIENT.email } }, status: "signedOut" })
      } else if (account === "returning") {
        // A returning patient: her password set, the device signed out.
        await auth.setPassword("demo")
        setLanding({ href: "/sign-in", status: "signedOut" })
      } else {
        // Any password will do in the demo build; this signs the device in.
        if (auth.status !== "signedIn") {
          await auth.setPassword("demo")
          await auth.signIn(PATIENT.email, "demo")
        }
        const step = patch.step ?? "done"
        setLanding({ href: step === "done" ? "/" : STEP_ROUTE[step], status: "signedIn" })
      }
    })()
  }, [id, onboarding, auth])

  React.useEffect(() => {
    if (landing && auth.status === landing.status) router.replace(landing.href)
  }, [landing, auth.status])

  if (!id) return <NotFoundScreen />
  return (
    <View style={styles.fill}>
      <ActivityIndicator color={color.primary} />
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.page },
})
