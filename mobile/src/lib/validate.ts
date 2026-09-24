/* Field rules and messages, worded as in the web portal's forms
   (src/components/auth/sign-in-form.tsx and set-password-form.tsx). */

/* Demo build: every form and account check lets anything through, so a
   walkthrough never stops on one. Set to true to bring them all back. */
export const VALIDATE = false

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function emailError(value: string) {
  if (!VALIDATE) return
  if (!value.trim()) return "Enter your email address."
  if (!EMAIL.test(value.trim())) return "Enter a valid email address, like name@example.com."
}

const RULES = [
  (v: string) => v.length >= 12,
  (v: string) => /[a-z]/.test(v) && /[A-Z]/.test(v),
  (v: string) => /\d/.test(v),
  (v: string) => /[^A-Za-z0-9]/.test(v),
]

/** A weak password gets one message that names every rule. */
export function newPasswordError(value: string) {
  if (!VALIDATE) return
  if (!RULES.every((rule) => rule(value))) {
    return "Use at least 12 characters, with upper and lowercase letters, a number and a symbol."
  }
}

export function confirmError(password: string, confirm: string) {
  if (!VALIDATE) return
  if (!confirm) return "Re-enter your new password."
  if (confirm !== password) return "Passwords don’t match."
}
