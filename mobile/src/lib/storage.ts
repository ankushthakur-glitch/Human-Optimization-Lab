import * as SecureStore from "expo-secure-store"
import { Platform } from "react-native"

/* Where the prototype keeps what a server would: SecureStore (Android
   Keystore, iOS Keychain) on a phone, the browser's localStorage on the web
   build, which has no secure store.

   On the web build every page load starts over: this module runs once per
   load, before the providers read anything, so a refresh finds the store
   empty, signed out and not activated, and lands on the first sign-up
   screen. Moving between screens never reloads the page, so the flow itself
   keeps its state. */
if (Platform.OS === "web" && typeof localStorage !== "undefined") {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith("hol."))
      .forEach((key) => localStorage.removeItem(key))
  } catch {}
}

export const store =
  Platform.OS === "web"
    ? {
        getItemAsync: async (key: string) => localStorage.getItem(key),
        setItemAsync: async (key: string, value: string) => localStorage.setItem(key, value),
        deleteItemAsync: async (key: string) => localStorage.removeItem(key),
      }
    : SecureStore
