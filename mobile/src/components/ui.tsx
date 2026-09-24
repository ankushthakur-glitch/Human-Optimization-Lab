import * as React from "react"
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
} from "react-native"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from "react-native-svg"

import { IconEye, IconEyeOff } from "@/components/icons"
import { color, font, gutter, radius, touchRadius } from "@/lib/theme"

/* The few building blocks the patient app's screens share, built to the web
   portal's design system so the app and the portal look like one product:
   the sign-in frame of src/components/auth/auth-shell.tsx (lockup, title,
   form, copyright line), shadcn's filled inputs and the default button,
   sized up for thumbs and set on a branded band and sheet. No subtitles or
   hint lines, per the portal's copy rules. */

const LOGO = require("../../assets/logo-lockup.png")

/** A scrolling form screen that keeps its fields above the keyboard: the
    lockup on a soft teal band, the form on a white sheet rising over it. */
export function Screen({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets()
  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.hero, { paddingTop: insets.top + 72 }]}>
            <HeroArt />
            <Image
              source={LOGO}
              style={styles.logo}
              resizeMode="contain"
              accessibilityRole="image"
              accessibilityLabel="Human Optimization Lab"
            />
          </View>
          <View style={styles.sheet}>
            <View style={styles.sheetBody}>{children}</View>
            <Text style={styles.copyright}>
              © {new Date().getFullYear()} Human Optimization. All rights reserved.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

/** The band behind the lockup: a teal wash with two soft rings of the brand
    colour, sliced to whatever width the phone is. */
function HeroArt() {
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id="wash" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color.primaryHalo} />
          <Stop offset="1" stopColor={color.brandTint} />
        </LinearGradient>
      </Defs>
      <Rect width="400" height="300" fill="url(#wash)" />
      <Circle cx="400" cy="0" r="130" fill={color.primary} fillOpacity={0.07} />
      <Circle cx="400" cy="0" r="75" fill={color.primary} fillOpacity={0.06} />
      <Circle cx="0" cy="300" r="110" fill={color.background} fillOpacity={0.45} />
    </Svg>
  )
}

export function Title({ children }: { children: React.ReactNode }) {
  return (
    <Text style={styles.title} accessibilityRole="header">
      {children}
    </Text>
  )
}

/** A form-level message, e.g. credentials that don't match. */
export function FormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <View style={styles.formError} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Text style={styles.formErrorText}>{message}</Text>
    </View>
  )
}

type FieldProps = TextInputProps & {
  label: string
  required?: boolean
  error?: string
  /** Drawn inside the input's box, on the left; teal while focused. */
  icon?: React.ComponentType<{ color: string }>
  /** Rendered inside the input's box, on the right. */
  trailing?: React.ReactNode
}

export const TextField = React.forwardRef<TextInput, FieldProps>(function TextField(
  { label, required, error, icon: Icon, trailing, style, onFocus, onBlur, ...input },
  ref
) {
  const [focused, setFocused] = React.useState(false)
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <View style={[styles.inputBox, focused && styles.inputBoxFocused, !!error && styles.inputBoxInvalid]}>
        {Icon && (
          <View style={styles.leading}>
            <Icon color={error ? color.error : focused ? color.primary : color.muted} />
          </View>
        )}
        <TextInput
          ref={ref}
          style={[styles.input, !!Icon && styles.inputWithIcon, style]}
          placeholderTextColor={color.placeholder}
          accessibilityLabel={label}
          accessibilityHint={error}
          {...input}
          onFocus={(e) => {
            setFocused(true)
            onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            onBlur?.(e)
          }}
        />
        {trailing}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  )
})

/** A text field with the portal's eye toggle to show or hide what's typed. */
export const PasswordField = React.forwardRef<TextInput, Omit<FieldProps, "trailing" | "secureTextEntry">>(
  function PasswordField(props, ref) {
    const [visible, setVisible] = React.useState(false)
    return (
      <TextField
        ref={ref}
        {...props}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        trailing={
          <Pressable
            onPress={() => setVisible((v) => !v)}
            hitSlop={8}
            style={({ pressed }) => [styles.toggle, pressed && styles.togglePressed]}
            accessibilityRole="button"
            accessibilityLabel={visible ? "Hide password" : "Show password"}
          >
            {visible ? <IconEyeOff color={color.muted} /> : <IconEye color={color.muted} />}
          </Pressable>
        }
      />
    )
  }
)

export function Button({
  children,
  onPress,
  pending = false,
  variant = "primary",
}: {
  children: string
  onPress: () => void
  pending?: boolean
  variant?: "primary" | "outline"
}) {
  const primary = variant === "primary"
  return (
    <Pressable
      onPress={onPress}
      disabled={pending}
      accessibilityRole="button"
      accessibilityState={{ disabled: pending, busy: pending }}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.buttonPrimary : styles.buttonOutline,
        pressed && (primary ? styles.buttonPrimaryPressed : styles.buttonOutlinePressed),
        pending && styles.buttonPending,
      ]}
    >
      {pending && <ActivityIndicator color={primary ? color.onPrimary : color.primary} size="small" />}
      <Text style={[styles.buttonText, !primary && styles.buttonTextOutline]}>{children}</Text>
    </Pressable>
  )
}

/** "Already set a password? Sign in", centred under the form. */
export function FooterLink({ prompt, action, onPress }: { prompt: string; action: string; onPress: () => void }) {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>{prompt} </Text>
      <Pressable onPress={onPress} hitSlop={8} accessibilityRole="link">
        <Text style={styles.link}>{action}</Text>
      </Pressable>
    </View>
  )
}

export const Stack = ({ children, gap = 20 }: { children: React.ReactNode; gap?: number }) => (
  <View style={{ gap }}>{children}</View>
)

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.background },
  fill: { flex: 1 },
  // On a wide screen the form keeps the portal's 420 width.
  scroll: { flexGrow: 1 },
  hero: { alignItems: "center", paddingBottom: 96, overflow: "hidden", backgroundColor: color.brandTint },
  logo: { width: 208, height: 52 },
  // Rises 32 over the band so the band reads as the sheet's backdrop.
  sheet: {
    flex: 1,
    marginTop: -32,
    backgroundColor: color.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 36,
    paddingBottom: 20,
    boxShadow: "0 -6px 24px rgba(1, 131, 126, 0.08)",
  },
  // On a wide screen the form keeps the portal's 420 width.
  sheetBody: {
    flex: 1,
    width: "100%",
    maxWidth: 420 + gutter * 2,
    alignSelf: "center",
    paddingHorizontal: gutter,
  },
  title: {
    fontFamily: font.semibold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.7,
    color: color.text,
    marginBottom: 28,
  },

  field: { gap: 6 },
  label: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: color.text },
  required: { color: color.error },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: touchRadius,
    backgroundColor: color.inputFill,
  },
  inputBoxFocused: {
    borderColor: color.primary,
    backgroundColor: color.background,
    boxShadow: `0 0 0 3px ${color.primaryHalo}`,
  },
  inputBoxInvalid: { borderColor: color.error, boxShadow: `0 0 0 3px ${color.errorHalo}` },
  input: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 14,
    fontFamily: font.regular,
    fontSize: 16,
    color: color.text,
    // The box draws the focus state; the browser's own ring would double it
    // and, even transparent, paints over the box's border.
    ...Platform.select({ web: { outlineStyle: "none" } as unknown as TextStyle }),
  },
  leading: { paddingLeft: 14 },
  inputWithIcon: { paddingLeft: 10 },
  error: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.error },
  toggle: {
    width: 36,
    height: 36,
    marginRight: 8,
    borderRadius: radius,
    alignItems: "center",
    justifyContent: "center",
  },
  togglePressed: { backgroundColor: color.border },

  formError: {
    borderRadius: touchRadius,
    backgroundColor: color.errorTint,
    borderWidth: 1,
    borderColor: color.errorHalo,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  formErrorText: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.error },

  button: {
    height: 52,
    marginTop: 4,
    borderRadius: touchRadius,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  buttonPrimary: { backgroundColor: color.primary, boxShadow: "0 6px 16px rgba(1, 131, 126, 0.28)" },
  buttonPrimaryPressed: { backgroundColor: color.primaryPressed },
  buttonOutline: { borderWidth: 1, borderColor: color.border, backgroundColor: color.background },
  buttonOutlinePressed: { backgroundColor: color.surface },
  buttonPending: { opacity: 0.7 },
  buttonText: { fontFamily: font.semibold, fontSize: 16, color: color.onPrimary },
  buttonTextOutline: { color: color.text },

  footer: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", marginTop: 28 },
  footerText: { fontFamily: font.regular, fontSize: 15, color: color.muted },
  link: { fontFamily: font.semibold, fontSize: 15, color: color.primary },

  copyright: {
    marginTop: 40,
    textAlign: "center",
    fontFamily: font.regular,
    fontSize: 12,
    color: color.muted,
  },
})
