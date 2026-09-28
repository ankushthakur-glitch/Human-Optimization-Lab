import Svg, { Path } from "react-native-svg"

/* The portal's show/hide password icons (Hugeicons ViewIcon and
   ViewOffSlashIcon, as src/design-system/icons.tsx maps IconEye and
   IconEyeOff), drawn at the portal's 1.5 stroke. */

type IconProps = { size?: number; color: string }

export function IconEye({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21.544 11.045C21.848 11.4713 22 11.6845 22 12C22 12.3155 21.848 12.5287 21.544 12.955C20.1779 14.8706 16.6892 19 12 19C7.31078 19 3.8221 14.8706 2.45604 12.955C2.15201 12.5287 2 12.3155 2 12C2 11.6845 2.15201 11.4713 2.45604 11.045C3.8221 9.12944 7.31078 5 12 5C16.6892 5 20.1779 9.12944 21.544 11.045Z"
        stroke={color}
        strokeWidth={1.5}
      />
      <Path
        d="M15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12Z"
        stroke={color}
        strokeWidth={1.5}
      />
    </Svg>
  )
}

export function IconEyeOff({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19.439 15.439C20.3636 14.5212 21.0775 13.6091 21.544 12.955C21.848 12.5287 22 12.3155 22 12C22 11.6845 21.848 11.4713 21.544 11.045C20.1779 9.12944 16.6892 5 12 5C11.0922 5 10.2294 5.15476 9.41827 5.41827M6.74742 6.74742C4.73118 8.1072 3.24215 9.94266 2.45604 11.045C2.15201 11.4713 2 11.6845 2 12C2 12.3155 2.15201 12.5287 2.45604 12.955C3.8221 14.8706 7.31078 19 12 19C13.9908 19 15.7651 18.2557 17.2526 17.2526"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9.85786 10C9.32783 10.53 9 11.2623 9 12.0711C9 13.6887 10.3113 15 11.9289 15C12.7377 15 13.47 14.6722 14 14.1421"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path d="M3 3L21 21" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

/* Leading field icons (Hugeicons Mail01 and SquareLock02), same stroke. */

export function IconMail({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 6L8.91302 9.91697C11.4616 11.361 12.5384 11.361 15.087 9.91697L22 6"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Path
        d="M2.01577 13.4756C2.08114 16.5412 2.11383 18.0739 3.24496 19.2094C4.37608 20.3448 5.95033 20.3843 9.09883 20.4634C11.0393 20.5122 12.9607 20.5122 14.9012 20.4634C18.0497 20.3843 19.6239 20.3448 20.7551 19.2094C21.8862 18.0739 21.9189 16.5412 21.9842 13.4756C22.0053 12.4899 22.0053 11.5101 21.9842 10.5244C21.9189 7.45886 21.8862 5.92609 20.7551 4.79066C19.6239 3.65523 18.0497 3.61568 14.9012 3.53657C12.9607 3.48781 11.0393 3.48781 9.09882 3.53656C5.95033 3.61566 4.37608 3.65521 3.24495 4.79065C2.11382 5.92608 2.08114 7.45885 2.01576 10.5244C1.99474 11.5101 1.99475 12.4899 2.01577 13.4756Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function IconLock({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4.26781 18.8447C4.49269 20.515 5.87613 21.8235 7.55966 21.9009C8.97627 21.966 10.4153 22 12 22C13.5847 22 15.0237 21.966 16.4403 21.9009C18.1239 21.8235 19.5073 20.515 19.7322 18.8447C19.879 17.7547 20 16.6376 20 15.5C20 14.3624 19.879 13.2453 19.7322 12.1553C19.5073 10.485 18.1239 9.17649 16.4403 9.09909C15.0237 9.03397 13.5847 9 12 9C10.4153 9 8.97627 9.03397 7.55966 9.09909C5.87613 9.17649 4.49269 10.485 4.26781 12.1553C4.12104 13.2453 4 14.3624 4 15.5C4 16.6376 4.12104 17.7547 4.26781 18.8447Z"
        stroke={color}
        strokeWidth={1.5}
      />
      <Path
        d="M7.5 9V6.5C7.5 4.01472 9.51472 2 12 2C14.4853 2 16.5 4.01472 16.5 6.5V9"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M11.9961 15.5H12.0051" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

/* Face ID, drawn to match: four corner brackets around a face. */

export function IconFaceId({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 9v1M15 9v1M12 9v4h-1M9 16c1.7 1.3 4.3 1.3 6 0"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/** Hugeicons ArrowRight01, the portal's row chevron. */
export function IconChevronRight({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 6C9 6 15 10.4189 15 12C15 13.5812 9 18 9 18"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/** Hugeicons ArrowLeft01, the back chevron. */
export function IconChevronLeft({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 6C15 6 9 10.4189 9 12C9 13.5812 15 18 15 18"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/** Hugeicons Tick02: checkboxes, done rows and plan features. */
export function IconCheck({ size = 16, color, strokeWidth = 2 }: IconProps & { strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 14L8.5 17.5L19 6.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

/** Hugeicons SparklesIcon: marks what the record recommends. */
export function IconSparkle({ size = 16, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10 4C10.5 8.5 11.5 9.5 16 10C11.5 10.5 10.5 11.5 10 16C9.5 11.5 8.5 10.5 4 10C8.5 9.5 9.5 8.5 10 4Z"
        fill={color}
      />
      <Path d="M17.5 14C17.75 16.25 18.25 16.75 20.5 17C18.25 17.25 17.75 17.75 17.5 20C17.25 17.75 16.75 17.25 14.5 17C16.75 16.75 17.25 16.25 17.5 14Z" fill={color} />
    </Svg>
  )
}

/** Hugeicons SecurityCheck: the authorization. */
export function IconShield({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 11.1833V8.28029C21 6.64029 21 5.82028 20.5959 5.28529C20.1918 4.75029 19.2781 4.49056 17.4507 3.9711C16.2022 3.61619 15.1016 3.18863 14.2223 2.79829C13.0234 2.2661 12.424 2 12 2C11.576 2 10.9766 2.2661 9.77771 2.79829C8.89839 3.18863 7.79784 3.61619 6.54933 3.9711C4.72193 4.49056 3.80822 4.75029 3.40411 5.28529C3 5.82028 3 6.64029 3 8.28029V11.1833C3 16.8085 8.06277 20.1835 10.594 21.5194C11.2011 21.8398 11.5046 22 12 22C12.4954 22 12.7989 21.8398 13.406 21.5194C15.9372 20.1835 21 16.8085 21 11.1833Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path d="M9 12.5L10.8 14.5L15 10" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

/* Detail row icons for the identity check (Hugeicons Calendar03, Call,
   Location01), same 1.5 stroke. */

export function IconCalendar({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M16 2V6M8 2V6M3 10H21" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path
        d="M3 9C3 6.79 4.79 5 7 5H17C19.21 5 21 6.79 21 9V18C21 20.21 19.21 22 17 22H7C4.79 22 3 20.21 3 18V9Z"
        stroke={color}
        strokeWidth={1.5}
      />
    </Svg>
  )
}

export function IconPhone({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 16.4V19.1C21 20.1 20.2 21 19.1 21C10.8 20.5 3.5 13.2 3 4.9C3 3.8 3.9 3 4.9 3H7.6C8.5 3 9.3 3.7 9.4 4.6C9.5 5.5 9.8 6.4 10.1 7.3C10.4 8 10.2 8.8 9.6 9.3L8.5 10.4C9.8 12.7 11.3 14.2 13.6 15.5L14.7 14.4C15.2 13.8 16 13.6 16.7 13.9C17.6 14.2 18.5 14.5 19.4 14.6C20.3 14.7 21 15.5 21 16.4Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function IconPin({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22C12 22 19.5 15.5 19.5 9.5C19.5 5.36 16.14 2 12 2C7.86 2 4.5 5.36 4.5 9.5C4.5 15.5 12 22 12 22Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Path d="M14.5 9.5C14.5 10.88 13.38 12 12 12C10.62 12 9.5 10.88 9.5 9.5C9.5 8.12 10.62 7 12 7C13.38 7 14.5 8.12 14.5 9.5Z" stroke={color} strokeWidth={1.5} />
    </Svg>
  )
}

/* The tab bar's icons: filled, as Superpower draws its tabs, so the active
   and resting tabs differ by colour alone. */

export function IconHome({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 10.6C3 9.98 3.29 9.4 3.78 9.02L10.78 3.62C11.5 3.07 12.5 3.07 13.22 3.62L20.22 9.02C20.71 9.4 21 9.98 21 10.6V19C21 20.1 20.1 21 19 21H15.5V15.5C15.5 14.95 15.05 14.5 14.5 14.5H9.5C8.95 14.5 8.5 14.95 8.5 15.5V21H5C3.9 21 3 20.1 3 19V10.6Z"
        fill={color}
      />
    </Svg>
  )
}

export function IconResults({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 14.5C3 13.67 3.67 13 4.5 13H6.5C7.33 13 8 13.67 8 14.5V19.5C8 20.33 7.33 21 6.5 21H4.5C3.67 21 3 20.33 3 19.5V14.5ZM9.5 4.5C9.5 3.67 10.17 3 11 3H13C13.83 3 14.5 3.67 14.5 4.5V19.5C14.5 20.33 13.83 21 13 21H11C10.17 21 9.5 20.33 9.5 19.5V4.5ZM16 9.5C16 8.67 16.67 8 17.5 8H19.5C20.33 8 21 8.67 21 9.5V19.5C21 20.33 20.33 21 19.5 21H17.5C16.67 21 16 20.33 16 19.5V9.5Z"
        fill={color}
      />
    </Svg>
  )
}

export function IconPlan({ size = 20, color, cut = "#FFFFFF" }: IconProps & { cut?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 2.5H15C15.55 2.5 16 2.95 16 3.5V4.5H17.5C18.88 4.5 20 5.62 20 7V19C20 20.38 18.88 21.5 17.5 21.5H6.5C5.12 21.5 4 20.38 4 19V7C4 5.62 5.12 4.5 6.5 4.5H8V3.5C8 2.95 8.45 2.5 9 2.5Z"
        fill={color}
      />
      <Path d="M8.5 11H15.5M8.5 15H13" stroke={cut} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  )
}

export function IconCareTeam({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3C17.2 3 21 6.58 21 11C21 15.42 17.2 19 12 19C10.85 19 9.75 18.83 8.74 18.51L4.6 20.4C4.04 20.66 3.43 20.12 3.63 19.53L4.7 16.4C3.63 14.94 3 13.03 3 11C3 6.58 6.8 3 12 3Z"
        fill={color}
      />
    </Svg>
  )
}

/** Hugeicons Cancel01: closes a full screen view. */
export function IconClose({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6L18 18" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

/** Hugeicons ArrowUp02: sends a chat message. */
export function IconSend({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 19V5M12 5L6 11M12 5L18 11" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}
