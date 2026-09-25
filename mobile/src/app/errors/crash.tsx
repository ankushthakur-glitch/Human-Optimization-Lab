/** A screen that always fails to render, so the crash state can be reviewed
    exactly as a real one shows it: through the Stack's screen error boundary. */
export default function CrashPreviewScreen(): never {
  throw new Error("Preview of the crash state")
}
