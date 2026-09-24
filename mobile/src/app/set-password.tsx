import * as React from "react"
import type { TextInput } from "react-native"

import { Button, PasswordField, Screen, Stack, Title } from "@/components/ui"
import { useAuth } from "@/lib/auth"
import { confirmError, newPasswordError } from "@/lib/validate"

/** Replaces the one-time password. Same rules as the web portal. */
export default function SetPasswordScreen() {
  const { setPassword } = useAuth()
  const [password, setValue] = React.useState("")
  const [confirm, setConfirm] = React.useState("")
  const [errors, setErrors] = React.useState<{ password?: string; confirm?: string }>({})
  const [pending, setPending] = React.useState(false)
  const confirmRef = React.useRef<TextInput>(null)

  async function onSubmit() {
    const found = { password: newPasswordError(password), confirm: confirmError(password, confirm) }
    setErrors(found)
    if (found.password || found.confirm) return
    setPending(true)
    // On success the route guard takes the patient home.
    await setPassword(password)
  }

  return (
    <Screen>
      <Title>Set your password</Title>
      <Stack>
        <PasswordField
          label="New password"
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
