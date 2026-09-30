import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { Text } from "react-native"

import { Button, CodeField, FooterLink, FormError, Screen, Stack } from "@/components/ui"
import { InstallApp } from "@/components/install-app"
import { useAuth } from "@/lib/auth"
import { PATIENT } from "@/lib/patient"
import { VALIDATE } from "@/lib/validate"
import { font } from "@/lib/theme"

/** First sign-in, step one, as on the web portal: only the 6-digit
    activation code from the invitation. The email's Activate account button
    (hol://activate?email=...) names the account, so there is no email to
    type; the prototype falls back to the sample patient. Set password
    follows. */
export default function ActivateScreen() {
  const { activate } = useAuth()
  const params = useLocalSearchParams<{ email?: string }>()
  const email = params.email ?? PATIENT.email
  const [code, setCode] = React.useState("")
  const [errors, setErrors] = React.useState<{ code?: string; form?: string }>({})
  const [pending, setPending] = React.useState(false)

  async function onSubmit(value = code) {
    if (pending) return
    if (VALIDATE && value.length < 6) {
      setErrors({ code: "Enter all six digits." })
      return
    }
    setErrors({})
    setPending(true)
    const result = await activate(email, value)
    setPending(false)
    // On success the route guard moves the patient on to set a password.
    if (!result.ok) {
      setErrors({ form: result.message })
      setCode("")
    }
  }

  return (
    <Screen
      title="Activate your account"
      description={
        <>
          Enter the 6-digit code we sent to <Text style={{ fontFamily: font.semibold }}>{email}</Text>.
        </>
      }
    >
      <Stack>
        <FormError message={errors.form} />
        <CodeField
          label="Activation code"
          value={code}
          onChange={(value) => {
            setCode(value)
            if (errors.code || errors.form) setErrors({})
          }}
          onComplete={onSubmit}
          error={errors.code}
        />
        <Button onPress={() => onSubmit()} pending={pending}>
          Verify code
        </Button>
      </Stack>
      <FooterLink prompt="Already set a password?" action="Sign in" onPress={() => router.replace("/sign-in")} />
      <InstallApp />
    </Screen>
  )
}
