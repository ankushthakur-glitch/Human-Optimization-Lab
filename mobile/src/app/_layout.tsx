import { Stack } from "expo-router"
import { useFonts } from "expo-font"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import * as React from "react"

import { AuthProvider, useAuth } from "@/lib/auth"
import { color } from "@/lib/theme"

SplashScreen.preventAutoHideAsync()

/* Inter, the portal's face, in the three weights the app uses. The files
   live in assets/fonts rather than coming from @expo-google-fonts: the web
   build keeps an asset's source path, and the repo's .gitignore drops
   anything under a node_modules folder, so fonts from a package never
   reached the deployed site. */
const FONTS = {
  Inter_400Regular: require("../../assets/fonts/Inter_400Regular.ttf"),
  Inter_500Medium: require("../../assets/fonts/Inter_500Medium.ttf"),
  Inter_600SemiBold: require("../../assets/fonts/Inter_600SemiBold.ttf"),
}

/* Which screens exist depends on the account state:
   signed out            activate, sign-in
   one-time password in  set-password
   signed in             home (index)
   A screen whose guard turns false drops out of history, so Back never
   returns to a sign-in form after signing in. */
function Routes() {
  const { status, activated } = useAuth()
  const [fontsLoaded] = useFonts(FONTS)
  const ready = fontsLoaded && status !== "loading"

  React.useEffect(() => {
    if (ready) SplashScreen.hideAsync()
  }, [ready])

  if (!ready) return null

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.background } }}>
      <Stack.Protected guard={status === "signedOut"}>
        {/* The first screen listed is where a signed-out patient lands: a new
            install starts at activation, a returning patient at sign in. */}
        {activated ? <Stack.Screen name="sign-in" /> : <Stack.Screen name="activate" />}
        {activated ? <Stack.Screen name="activate" /> : <Stack.Screen name="sign-in" />}
      </Stack.Protected>
      <Stack.Protected guard={status === "mustSetPassword"}>
        <Stack.Screen name="set-password" options={{ gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Protected guard={status === "signedIn"}>
        <Stack.Screen name="index" />
      </Stack.Protected>
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Routes />
    </AuthProvider>
  )
}
