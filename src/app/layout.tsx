import {
  DM_Sans,
  Figtree,
  Geist,
  Geist_Mono,
  IBM_Plex_Sans,
  Inter,
  Manrope,
  Noto_Sans,
  Public_Sans,
  Roboto,
  Roboto_Slab,
  Source_Sans_3,
} from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/design-system/providers/theme-provider"
import {
  DesignSystemBootstrap,
  DesignSystemProvider,
} from "@/design-system/providers/design-system-provider"
import { PrototypeHotspots } from "@/components/prototype-hotspots"
import { Toaster } from "@/design-system/ui/sonner"
import { TooltipProvider } from "@/design-system/ui/tooltip"
import { cn } from "@/lib/utils"
import { BRAND_NAME, BRAND_SLUG } from "@/lib/brand"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const roboto = Roboto({ subsets: ["latin"], variable: "--font-roboto", preload: false })
const notoSans = Noto_Sans({ subsets: ["latin"], variable: "--font-noto-sans", preload: false })
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
  preload: false,
})
const sourceSans3 = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans-3",
  preload: false,
})
const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-public-sans", preload: false })
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", preload: false })
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", preload: false })
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", preload: false })
const geist = Geist({ subsets: ["latin"], variable: "--font-geist", preload: false })
const robotoSlab = Roboto_Slab({ subsets: ["latin"], variable: "--font-roboto-slab", preload: false })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

const fontVariables = [
  inter,
  roboto,
  notoSans,
  ibmPlexSans,
  sourceSans3,
  publicSans,
  dmSans,
  figtree,
  manrope,
  geist,
  robotoSlab,
  geistMono,
].map((f) => f.variable)

/**
 * Comment Kit's colours, handed the design-system tokens so the review layer
 * follows the active accent and light/dark mode. Values are written into CSS
 * verbatim — see public/comment-kit/src/themes.js for the roles.
 */
const commentKitTheme = {
  surface: "var(--popover)",
  sunken: "var(--muted)",
  hover: "var(--muted)",
  text: "var(--popover-foreground)",
  muted: "var(--muted-foreground)",
  faint: "var(--muted-foreground)",
  line: "var(--border)",
  "line-strong": "var(--input)",
  brand: "var(--primary)",
  "brand-hover": "var(--primary)",
  "brand-tint": "color-mix(in oklab, var(--primary) 14%, transparent)",
  "on-brand": "var(--primary-foreground)",
}

export const metadata = {
  title: `${BRAND_NAME} — Design System`,
  description: `Base design system and component library for the ${BRAND_NAME} product.`,
  /*
   * The mark is duotone — a white figure knocked out of a black disc — so it
   * cannot sit on transparency and stay legible against both light and dark
   * browser chrome. Two variants are shipped and the browser picks by
   * prefers-color-scheme; `favicon.ico` in src/app/ is the multi-resolution
   * fallback for anything that ignores `media` (and for bookmarks).
   *
   * At 16px the fan of ~20 spokes aliases into a grey smudge. The H and the
   * disc still read. Fixing it needs a reduced-detail glyph drawn for small
   * sizes, not a rescale; most browsers reach for the 32px asset anyway.
   */
  icons: {
    icon: [
      { url: "/brand/favicon/hol-favicon-light-32.png", media: "(prefers-color-scheme: light)", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon/hol-favicon-light-16.png", media: "(prefers-color-scheme: light)", sizes: "16x16", type: "image/png" },
      { url: "/brand/favicon/hol-favicon-dark-32.png", media: "(prefers-color-scheme: dark)", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon/hol-favicon-dark-16.png", media: "(prefers-color-scheme: dark)", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/brand/favicon/hol-favicon-light-180.png", media: "(prefers-color-scheme: light)", sizes: "180x180" },
      { url: "/brand/favicon/hol-favicon-dark-180.png", media: "(prefers-color-scheme: dark)", sizes: "180x180" },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  /*
   * data-accent is what actually paints --primary, so the accent set here is
   * the product's brand colour rather than a starting suggestion: with a stock preset
   * the header rendered a different colour from the one the design system was
   * built and contrast-checked against.
   */
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-base="neutral"
      data-accent="brand-blue"
      data-font="inter"
      data-heading="inherit"
      data-radius="small"
      data-icon-stroke="regular"
      className={cn("antialiased", ...fontVariables)}
    >
      <head>
        {/* Comment Kit — design-review pins and threads over every page. Plain
            ES modules served from public/, so it stays outside the app bundle.
            With the Supabase env vars unset it falls back to localStorage. */}
        <script
          type="module"
          src="/comment-kit/comment-kit.js"
          data-namespace={BRAND_SLUG}
          data-product="design-system"
          data-brand-words={`${BRAND_NAME},Design System`}
          data-supabase-url={process.env.NEXT_PUBLIC_SUPABASE_URL}
          data-supabase-key={process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}
          data-theme={JSON.stringify(commentKitTheme)}
        />
      </head>
      <body>
        <DesignSystemBootstrap />
        <ThemeProvider>
          <DesignSystemProvider>
            <TooltipProvider>{children}</TooltipProvider>
            <Toaster />
            {/* Click any dead space and every clickable thing on screen blinks —
                the Figma-prototype cue, so a client can find the flow alone. */}
            <PrototypeHotspots />
          </DesignSystemProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
