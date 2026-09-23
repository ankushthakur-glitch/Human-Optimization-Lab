import { LogoSplash } from "@/design-system/ui/logo-loader"

/* Shown by the router while any screen is on its way, so a slow page arrives
   behind the brand's own loader instead of a blank frame. */
export default function Loading() {
  return <LogoSplash />
}
