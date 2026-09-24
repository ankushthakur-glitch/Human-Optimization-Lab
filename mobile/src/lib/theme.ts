/* The patient app's tokens: the web portal's design system (src/app/globals.css
   with the brand-teal accent), resolved to the colours the portal renders so
   the app and the portal read as one product. The app is light only for now,
   like the invitation email. */

export const color = {
  /** --primary */
  primary: "#01837E",
  /** --primary at 80%, the portal's button hover; used for pressed. */
  primaryPressed: "#4F9B97",
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
} as const

export const font = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
} as const

/** --radius (0.45rem) as the portal's inputs and buttons render it. */
export const radius = 7.2
export const gutter = 24
