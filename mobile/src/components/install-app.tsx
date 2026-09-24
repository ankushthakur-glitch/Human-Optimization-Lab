import * as React from "react"
import { Platform, StyleSheet, View } from "react-native"

import { Button } from "@/components/ui"

/* The web build's "Install app" button. Chrome (Android and desktop) offers
   to install a site with a manifest by firing `beforeinstallprompt`; keeping
   that event lets the button open the install dialog, after which the app
   has its own icon on the home screen and opens full screen. The button
   hides when the browser can't install (Safari, already installed) and when
   the app is already running installed. Native builds never show it. */

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<unknown> }

let deferred: InstallPrompt | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

// Listen from load: Chrome can fire the event before the first screen mounts.
if (Platform.OS === "web" && typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault()
    deferred = event as InstallPrompt
    notify()
  })
  window.addEventListener("appinstalled", () => {
    deferred = null
    notify()
  })
}

const standalone = () =>
  Platform.OS === "web" && typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches

export function InstallApp() {
  const [available, setAvailable] = React.useState(() => !!deferred)

  React.useEffect(() => {
    const update = () => setAvailable(!!deferred)
    listeners.add(update)
    return () => {
      listeners.delete(update)
    }
  }, [])

  if (Platform.OS !== "web" || !available || standalone()) return null

  async function install() {
    const prompt = deferred
    if (!prompt) return
    await prompt.prompt()
    await prompt.userChoice
    deferred = null
    notify()
  }

  return (
    <View style={styles.wrap}>
      <Button variant="outline" onPress={install}>
        Install app
      </Button>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginTop: "auto", paddingTop: 32 },
})
