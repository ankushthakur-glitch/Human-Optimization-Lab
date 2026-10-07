import { router, useFocusEffect, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { Text } from "react-native"

import { IconCalendar, IconMail } from "@/components/icons"
import { Button, CodeField, FooterLink, FormError, Screen, Stack, TextField } from "@/components/ui"
import { InstallApp } from "@/components/install-app"
import { useAuth } from "@/lib/auth"
import { VALIDATE, emailError } from "@/lib/validate"
import { font } from "@/lib/theme"

/** First sign-in, step one: email address, date of birth, then the 6-digit
    activation code from the invitation. The email's Activate account button
    (hol://activate?email=...) fills the email in; otherwise it is typed. Under the fields,
    the Inlay Health lockup and what Inlay offers. Set password follows,
    over this screen: going back from it cancels the code, so it has to be
    entered again. */
export default function ActivateScreen() {
  const { activate, status, signOut } = useAuth()
  const params = useLocalSearchParams<{ email?: string }>()
  const [email, setEmail] = React.useState(params.email ?? "")
  const [dob, setDob] = React.useState("")
  const [code, setCode] = React.useState("")
  const [errors, setErrors] = React.useState<{ email?: string; dob?: string; code?: string; form?: string }>({})
  const [pending, setPending] = React.useState(false)

  // The code accepted: set password opens over this screen, carrying the
  // email on to the sign in that follows it.
  React.useEffect(() => {
    if (status === "mustSetPassword") router.push({ pathname: "/set-password", params: { email } })
  }, [status, email])

  // Back from set password: the accepted code no longer counts. Read
  // through a ref so this runs on focus only, not when the code is accepted.
  const latest = React.useRef({ status, signOut })
  latest.current = { status, signOut }
  useFocusEffect(
    React.useCallback(() => {
      if (latest.current.status === "mustSetPassword") latest.current.signOut()
    }, [])
  )

  async function onSubmit(value = code) {
    if (pending) return
    if (VALIDATE && (emailError(email) || dob.length < 10 || value.length < 6)) {
      setErrors({
        email: emailError(email),
        dob: dob.length < 10 ? "Enter your date of birth." : undefined,
        code: value.length < 6 ? "Enter all six digits." : undefined,
      })
      return
    }
    setErrors({})
    setPending(true)
    const result = await activate(email, dob, value)
    setPending(false)
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
          Enter your email, date of birth and the <Text style={{ fontFamily: font.semibold }}>6-digit code</Text> from your invitation.
        </>
      }
    >
      <Stack>
        <FormError message={errors.form} />
        <TextField
          label="Email address"
          icon={IconMail}
          required
          value={email}
          onChangeText={(text) => {
            setEmail(text)
            if (errors.email || errors.form) setErrors({})
          }}
          placeholder="Enter email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          error={errors.email}
        />
        <TextField
          label="Date of birth"
          icon={IconCalendar}
          value={dob}
          onChangeText={(text) => {
            setDob(asDate(text))
            if (errors.dob || errors.form) setErrors({})
          }}
          placeholder="MM/DD/YYYY"
          keyboardType="number-pad"
          maxLength={10}
          autoComplete="birthdate-full"
          error={errors.dob}
        />
        <CodeField
          label="One-time code"
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
      <FooterLink prompt="Already set a password?" action="Sign in" onPress={() => router.push("/sign-in")} />
      <InstallApp />
    </Screen>
  )
}

/** Digits typed into MM/DD/YYYY, slashes added as they go. */
function asDate(text: string) {
  const d = text.replace(/\D/g, "").slice(0, 8)
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join("/")
}
