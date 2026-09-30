import { GLView, type ExpoWebGLRenderingContext } from "expo-gl"
import * as React from "react"
import { AccessibilityInfo, View } from "react-native"

import { FRAG, VERT } from "@/components/voiceorbs/siri-sheet-shader"
import { hex, mix, rotateHue, type Rgb } from "@/components/voiceorbs/color"

/* The Siri Sheet orb from VoiceOrbs (MIT, see LICENSE here): a glass sphere
   with a sheet of light moving inside it, drawn by a fragment shader on the
   GPU through expo-gl, so the same code runs on iOS, Android and the web
   build. It stays in the "thinking" state of the original, since the app
   has no live voice. Still when the OS asks for reduced motion. */

const WHITE: Rgb = [255, 255, 255]
const unit = (c: Rgb): [number, number, number] => [c[0] / 255, c[1] / 255, c[2] / 255]

/** Inlay colours: pale mint into light teal. */
export const SHEET_FROM = "#C2FFF0"
export const SHEET_TO = "#5FB8B2"

export function SiriSheet({
  size,
  from = SHEET_FROM,
  to = SHEET_TO,
  background = "#FFFFFF",
}: {
  size: number
  from?: string
  to?: string
  /** The colour behind the orb; the view is opaque. */
  background?: string
}) {
  const frame = React.useRef(0)
  React.useEffect(() => () => cancelAnimationFrame(frame.current), [])

  const onContextCreate = React.useCallback(
    async (gl: ExpoWebGLRenderingContext) => {
      const compile = (type: number, source: string) => {
        const shader = gl.createShader(type)!
        gl.shaderSource(shader, source)
        gl.compileShader(shader)
        return shader
      }
      const program = gl.createProgram()!
      gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT))
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG))
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return
      gl.useProgram(program)

      const px = gl.drawingBufferWidth
      gl.viewport(0, 0, px, gl.drawingBufferHeight)
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
      const aPos = gl.getAttribLocation(program, "aPos")
      gl.enableVertexAttribArray(aPos)
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

      const u = (name: string) => gl.getUniformLocation(program, name)
      const set3 = (name: string, c: Rgb) => gl.uniform3f(u(name), ...unit(c))

      /* The palette and the thinking state values, as the original builds them. */
      const a = hex(from)
      const b = hex(to)
      const c = rotateHue(mix(a, b, 0.35), -38)
      const d = rotateHue(mix(a, b, 0.65), 42)
      const mid = mix(a, b, 0.5)
      gl.uniform1f(u("uSize"), px)
      gl.uniform1f(u("uLevel"), 0)
      gl.uniform1f(u("uWarp"), 3.2)
      gl.uniform1f(u("uRidge"), 1)
      gl.uniform1f(u("uSharp"), 2.2)
      gl.uniform1f(u("uZoom"), 1)
      gl.uniform1f(u("uExposure"), 1.9)
      gl.uniform1f(u("uGlow"), 0.28 * 0.45)
      gl.uniform1f(u("uRim"), 0.8)
      gl.uniform1f(u("uHear"), 0)
      gl.uniform1f(u("uFade"), 1)
      set3("uColA", a)
      set3("uColB", b)
      set3("uColC", c)
      set3("uColD", d)
      set3("uHi", mix(mid, WHITE, 0.82))
      set3("uCool", mix(a, WHITE, 0.15))
      set3("uWarm", mix(d, WHITE, 0.1))
      set3("uGlowCol", mid)
      set3("uBg", hex(background))

      const draw = (t: number) => {
        gl.uniform1f(u("uPhase"), 1.7 + t)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
        gl.flush()
        gl.endFrameEXP()
      }
      const still = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false)
      if (still) return draw(0)
      const start = Date.now()
      const loop = () => {
        draw((Date.now() - start) / 1000)
        frame.current = requestAnimationFrame(loop)
      }
      loop()
    },
    [from, to, background]
  )

  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden" }}>
      <GLView key={`${from}${to}${background}`} style={{ width: size, height: size }} onContextCreate={onContextCreate} />
    </View>
  )
}
