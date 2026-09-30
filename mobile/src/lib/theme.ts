/* The patient app's tokens: the web portal's design system (src/app/globals.css
   with the Inlay P7 accent), resolved to the colours the portal renders so
   the app and the portal read as one product. The app is light only for now,
   like the invitation email. */

export const color = {
  /** --primary: Inlay P7, the portal primary */
  primary: "#417D88",
  /** P02 of the P7 ramp: the focus halo. */
  primaryHalo: "#C0E0E6",
  /** --primary-hover, the portal's button hover; used for pressed. */
  primaryPressed: "#336771",
  onPrimary: "#FFFFFF",
  /** --foreground */
  text: "#0A0A0A",
  /** --muted-foreground: secondary text and placeholders */
  muted: "#67656B",
  placeholder: "#67656B",
  /** --border / --input */
  border: "#E5E5E5",
  /** --input at 50%: the portal's filled inputs */
  inputFill: "#F2F2F2",
  /** The outlined inputs' resting border, a grey tinted toward the brand. */
  inputBorder: "#D5E2E1",
  /** --ring and --ring at 30%: the focus border and its halo */
  ring: "#A1A1A1",
  ringHalo: "#E2E2E2",
  /** --muted: pressed outline buttons */
  surface: "#F5F5F5",
  background: "#FFFFFF",
  /** --destructive, at 20% for the invalid halo, at 10% for message tints */
  error: "#B70000",
  errorHalo: "#F8D3CE",
  errorTint: "#FCE9E6",
  /** The onboarding screens' soft grey ground for cards and tracks. */
  canvas: "#F6F6F4",
  /** --primary-surface (P00), for selected cards and chips. */
  primaryTint: "#EEF9FC",
  /** Result flags, tint plus text as the portal draws them. */
  high: "#C72B32",
  highTint: "#FDECEE",
  low: "#B25A12",
  lowTint: "#FEF4E5",
  ok: "#2F7F4D",
  okTint: "#E9FAEF",
} as const

export const font = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
} as const

/** --radius (0.45rem) as the portal renders it; fields and buttons on a
    phone use the rounder, taller touch size. */
export const radius = 7.2
export const touchRadius = 12
export const buttonRadius = 999
export const gutter = 24
