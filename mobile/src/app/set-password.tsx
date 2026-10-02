import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import type { TextInput } from "react-native"

import { Button, PasswordField, Screen, Stack } from "@/components/ui"
import { IconLock } from "@/components/icons"
import { useAuth } from "@/lib/auth"
import { PATIENT } from "@/lib/patient"
import { confirmError, newPasswordError } from "@/lib/validate"

/** Activation, step two: a new password and its confirmation. Same rules
    as the web portal. Activation passes the account's email on, for the
    sign in that follows. */
export default function SetPasswordScreen() {
  const { setPassword } = useAuth()
  const params = useLocalSearchParams<{ email?: string }>()
  const email = params.email ?? PATIENT.email
  const [password, setValue] = React.useState("")
  const [confirm, setConfirm] = React.useState("")
  const [errors, setErrors] = React.useState<{ password?: string; confirm?: string }>({})
  const [pending, setPending] = React.useState(false)
  const confirmRef = React.useRef<TextInput>(null)

  async function onSubmit() {
    if (pending) return
    const found = { password: newPasswordError(password), confirm: confirmError(password, confirm) }
    setErrors(found)
    if (found.password || found.confirm) return
    setPending(true)
    await setPassword(password)
    // The account is active but signed out, so the patient signs in once
    // with the new password, the email already filled in. Sign in replaces
    // everything behind it: Back never returns here or to the code.
    if (router.canDismiss()) router.dismissAll()
    router.replace({ pathname: "/sign-in", params: { created: "1", email } })
  }

  return (
    <Screen title="Create your password">
      <Stack>
        <PasswordField
          label="New password"
          icon={IconLock}
          required
          value={password}
          onChangeText={setValue}
          placeholder="Create a password"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          onSubmitEditing={() => confirmRef.current?.focus()}
          error={errors.password}
        />
        <PasswordField
          ref={confirmRef}
          label="Confirm password"
          icon={IconLock}
          required
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={onSubmit}
          error={errors.confirm}
        />
        <Button onPress={onSubmit} pending={pending}>
          Set password
        </Button>
      </Stack>
    </Screen>
  )
}
