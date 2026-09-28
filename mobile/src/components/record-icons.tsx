import Svg, { Circle, Path, Rect } from "react-native-svg"

/* Small line icons for the kinds of records and the places they come from,
   drawn to match the app's 1.5 stroke Hugeicons. */

export type RecordIconName =
  | "visits"
  | "conditions"
  | "medications"
  | "allergies"
  | "labs"
  | "vitals"
  | "procedures"
  | "immunizations"
  | "documents"
  | "clinic"
  | "hospital"
  | "lab"

export function RecordIcon({ name, size = 20, color }: { name: RecordIconName; size?: number; color: string }) {
  const p = { stroke: color, strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === "visits" && (
        <>
          <Rect x="3" y="5" width="18" height="16" rx="3" {...p} />
          <Path d="M3 10H21M8 3V7M16 3V7" {...p} />
          <Path d="M8 14.5H8.01M12 14.5H12.01M16 14.5H16.01" {...p} strokeWidth={2.2} />
        </>
      )}
      {name === "conditions" && (
        <>
          <Rect x="5" y="4" width="14" height="17" rx="3" {...p} />
          <Path d="M9 4C9 2.9 9.9 2 11 2H13C14.1 2 15 2.9 15 4V5H9V4Z" {...p} />
          <Path d="M9 11H15M9 15H13" {...p} />
        </>
      )}
      {name === "medications" && (
        <>
          <Path d="M4.8 12.2L12.2 4.8C14.2 2.8 17.2 2.8 19.2 4.8C21.2 6.8 21.2 9.8 19.2 11.8L11.8 19.2C9.8 21.2 6.8 21.2 4.8 19.2C2.8 17.2 2.8 14.2 4.8 12.2Z" {...p} />
          <Path d="M8.5 8.5L15.5 15.5" {...p} />
        </>
      )}
      {name === "allergies" && (
        <>
          <Path d="M12 3L21.5 19.5H2.5L12 3Z" {...p} />
          <Path d="M12 10V14M12 17H12.01" {...p} />
        </>
      )}
      {name === "labs" && (
        <>
          <Path d="M9 3H15M10 3V14.5C10 16.4 11 18 12 18C13 18 14 16.4 14 14.5V3" {...p} />
          <Path d="M10 10H14" {...p} />
          <Path d="M6 21H18" {...p} />
        </>
      )}
      {name === "vitals" && (
        <Path d="M3 12H7L9.5 6L14 18L16.5 12H21" {...p} />
      )}
      {name === "procedures" && (
        <>
          <Rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(-45 12 12)" {...p} />
          <Path d="M10.5 10.5H10.51M13.5 13.5H13.51M13.5 10.5H13.51M10.5 13.5H10.51" {...p} strokeWidth={2} />
        </>
      )}
      {name === "immunizations" && (
        <>
          <Path d="M18 2L22 6M20 4L15.5 8.5M17 10L14 7L5 16V19H8L17 10Z" {...p} />
          <Path d="M9 12L11 14M5 19L2 22" {...p} />
        </>
      )}
      {name === "documents" && (
        <>
          <Path d="M14 2H7C5.9 2 5 2.9 5 4V20C5 21.1 5.9 22 7 22H17C18.1 22 19 21.1 19 20V7L14 2Z" {...p} />
          <Path d="M14 2V7H19M9 13H15M9 17H13" {...p} />
        </>
      )}
      {name === "clinic" && (
        <>
          <Path d="M3 10.5L12 3L21 10.5V20C21 20.6 20.6 21 20 21H4C3.4 21 3 20.6 3 20V10.5Z" {...p} />
          <Path d="M12 10V16M9 13H15" {...p} />
        </>
      )}
      {name === "hospital" && (
        <>
          <Rect x="4" y="3" width="16" height="18" rx="2" {...p} />
          <Path d="M12 7V13M9 10H15M10 21V17H14V21" {...p} />
        </>
      )}
      {name === "lab" && (
        <>
          <Path d="M9 3H15M10 3V9L4.5 18.5C3.9 19.6 4.7 21 6 21H18C19.3 21 20.1 19.6 19.5 18.5L14 9V3" {...p} />
          <Circle cx="10" cy="16" r="1" {...p} />
          <Path d="M7 14H17" {...p} />
        </>
      )}
    </Svg>
  )
}
