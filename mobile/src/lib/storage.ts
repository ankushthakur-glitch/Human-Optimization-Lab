import * as SecureStore from "expo-secure-store"
import { Platform } from "react-native"

/* Where the prototype keeps what a server would: SecureStore (Android
   Keystore, iOS Keychain) on a phone, the browser's localStorage on the web
   build, which has no secure store. */
export const store =
  Platform.OS === "web"
    ? {
        getItemAsync: async (key: string) => localStorage.getItem(key),
        setItemAsync: async (key: string, value: string) => localStorage.setItem(key, value),
        deleteItemAsync: async (key: string) => localStorage.removeItem(key),
      }
    : SecureStore
