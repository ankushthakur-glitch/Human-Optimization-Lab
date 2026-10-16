import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg"

/* Draws a Hugeicons icon (the portal's icon set, @hugeicons/core-free-icons)
   with react-native-svg, so the app uses the same glyphs as the portal.
   Hugeicons' free set is outline only; `solid` lists the shapes to fill for a
   filled state, and every other shape is then drawn in `cut` so its lines
   read as cut out of the fill. */

/** One icon as @hugeicons/core-free-icons exports it. */
export type IconSvgObject = readonly (readonly [string, { readonly [key: string]: string | number }])[]

const SHAPES = { path: Path, circle: Circle, ellipse: Ellipse, rect: Rect } as const

export type HugeIconProps = {
  icon: IconSvgObject
  size?: number
  color: string
  strokeWidth?: number
  /** Indexes of the shapes to fill, for a filled state. */
  solid?: readonly number[]
  /** The colour of the lines inside a filled shape. */
  cut?: string
  /** Indexes of lines that sit outside every filled shape, kept in `color`
      in the filled state (the chart icon's arrow). */
  keep?: readonly number[]
}

const order = (n: number, solid?: readonly number[]) => {
  const all = Array.from({ length: n }, (_, i) => i)
  return solid ? [...all.filter((i) => solid.includes(i)), ...all.filter((i) => !solid.includes(i))] : all
}

export function HugeIcon({ icon, size = 20, color, strokeWidth = 1.5, solid, cut = "#FFFFFF", keep }: HugeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Filled shapes first, so the cut lines draw on top of them. */}
      {order(icon.length, solid).map((i) => {
        const [name, attrs] = icon[i]
        const Shape = SHAPES[name as keyof typeof SHAPES]
        if (!Shape) return null
        const { key: _key, stroke, fill, strokeWidth: _width, ...rest } = attrs as Record<string, string | number>
        const filled = solid?.includes(i)
        const ink = solid && !filled && !keep?.includes(i) ? cut : color
        return (
          <Shape
            key={i}
            {...(rest as object)}
            stroke={stroke ? ink : undefined}
            fill={filled ? color : fill && fill !== "none" ? ink : "none"}
            strokeWidth={strokeWidth}
          />
        )
      })}
    </Svg>
  )
}
