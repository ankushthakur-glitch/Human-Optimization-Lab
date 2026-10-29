import * as React from "react"
import { KeyboardAvoidingView, Platform, StyleSheet, type TextInput } from "react-native"

import { IconLock } from "@/components/icons"
import { toast } from "@/components/record-kit"
import { Sheet } from "@/components/sheet"
import { Button, PasswordField } from "@/components/ui"
import { useAuth } from "@/lib/auth"
import { confirmError, newPasswordError, VALIDATE } from "@/lib/validate"

/** Change password, a popup over Profile's Security (29 Oct 2026): the
    current password, then a new one and its confirmation, with the same
    rules as activation. She stays signed in; it closes with a toast. */
export function ChangePasswordSheet({ onClose }: { onClose: () => void }) {
  const { changePassword } = useAuth()
  const [current, setCurrent] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirm, setConfirm] = React.useState("")
  const [errors, setErrors] = React.useState<{ current?: string; password?: string; confirm?: string }>({})
  const [pending, setPending] = React.useState(false)
  const newRef = React.useRef<TextInput>(null)
  const confirmRef = React.useRef<TextInput>(null)

  async function onSubmit() {
    if (pending) return
    const found = {
      current: VALIDATE && !current ? "Enter your current password." : undefined,
      password: newPasswordError(password),
      confirm: confirmError(password, confirm),
    }
    setErrors(found)
    if (found.current || found.password || found.confirm) return
    setPending(true)
    const result = await changePassword(current, password)
    setPending(false)
    if (!result.ok) return setErrors({ current: result.message })
    onClose()
    toast("Password changed")
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Sheet popup title="Change password" onClose={onClose} dismissOnScrim={false}>
        <PasswordField
          label="Current password"
          icon={IconLock}
          required
          value={current}
          onChangeText={setCurrent}
          placeholder="Enter your current password"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="next"
          onSubmitEditing={() => newRef.current?.focus()}
          error={errors.current}
        />
        <PasswordField
          ref={newRef}
          label="New password"
          icon={IconLock}
          required
          value={password}
          onChangeText={setPassword}
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
          Change password
        </Button>
      </Sheet>
    </KeyboardAvoidingView>
  )
}
