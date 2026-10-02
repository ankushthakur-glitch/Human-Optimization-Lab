import * as LocalAuthentication from "expo-local-authentication"
import { Platform } from "react-native"

/* Face ID to open the app. On a phone it's the device's own check (Face ID,
   or the fingerprint or face unlock an Android phone has). The web build has
   no biometrics, so there the check stands in and always passes, which keeps
   the flow reviewable in the browser. */

const web = Platform.OS === "web"

/* Stands in for the device's prompt on the web build. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 600))

/** Whether this device can check the patient's face: it has the hardware and
    a face or fingerprint is set up on it. */
export async function faceIdAvailable() {
  if (web) return true
  try {
    const [hardware, enrolled] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()])
    return hardware && enrolled
  } catch {
    return false
  }
}

/** Asks the device to check the patient's face; true when it matched. */
export async function checkFaceId(promptMessage: string) {
  if (web) {
    await settle()
    return true
  }
  try {
    const result = await LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel: "Cancel", fallbackLabel: "Use passcode" })
    return result.success
  } catch {
    return false
  }
}
