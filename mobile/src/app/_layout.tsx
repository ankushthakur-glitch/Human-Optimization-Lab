// Each weight from its own entry, so the web build ships only these three.
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular"
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium"
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold"
import { Stack } from "expo-router"
import { useFonts } from "expo-font"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import * as React from "react"

import { AuthProvider, useAuth } from "@/lib/auth"
import { color } from "@/lib/theme"

SplashScreen.preventAutoHideAsync()

/* Which screens exist depends on the account state:
   signed out            activate, sign-in
   one-time password in  set-password
   signed in             home (index)
   A screen whose guard turns false drops out of history, so Back never
   returns to a sign-in form after signing in. */
function Routes() {
  const { status, activated } = useAuth()
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold })
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
