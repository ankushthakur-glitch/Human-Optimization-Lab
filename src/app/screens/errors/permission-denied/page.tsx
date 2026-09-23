import { forbidden } from "next/navigation"

/** A route the demo user's role can never open, so forbidden.tsx can be
    reviewed exactly as a real 403 renders it. */
export default function RestrictedScreen() {
  forbidden()
}
