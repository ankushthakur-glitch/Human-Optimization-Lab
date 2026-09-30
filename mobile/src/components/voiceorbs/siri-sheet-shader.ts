/* Fragment shader of the Siri Sheet orb from VoiceOrbs
   (https://github.com/amunozdev/voiceorbs, MIT, see LICENSE in this folder).
   Unchanged except for the last step: the orb is drawn over the screen
   colour (uBg) instead of onto a transparent canvas. */

export const VERT = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`

export const FRAG = `
precision highp float;

uniform float uSize;
uniform float uPhase;
uniform float uLevel;
uniform float uWarp;
uniform float uRidge;
uniform float uSharp;
uniform float uZoom;
uniform float uExposure;
uniform float uGlow;
uniform float uRim;
uniform float uHear;
uniform float uFade;
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uColC;
uniform vec3 uColD;
uniform vec3 uHi;
uniform vec3 uCool;
uniform vec3 uWarm;
uniform vec3 uGlowCol;
uniform vec3 uBg;

vec4 outC;

const float RAD = 0.86;
const float SOFT = 0.005;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * noise(p);
    p = mat2(0.8, 0.6, -0.6, 0.8) * p * 2.03;
    a *= 0.5;
  }
  return s / 0.9375;
}

vec2 band(vec2 q, float drift, float offset, float amp, float mainY, float env, float soft) {
  float y = amp * env * sin(q.x * 1.0 + drift + offset);
  float d = abs(q.y - y);
  float line = 0.018 / (sqrt(d * d + soft * soft) + 0.026);
  float bd = max(0.0, max(q.y - max(mainY, y), min(mainY, y) - q.y));
  float fillB = 0.014 / (bd * bd * 5.0 + 0.06);
  return vec2(line, fillB);
}

vec3 sheet(vec2 p, float t) {
  float scale = 0.74 + uZoom * 0.34;
  vec2 q = p / scale;
  vec2 w = vec2(fbm(q * 1.1 + vec2(0.0, t * 0.09)), fbm(q * 1.1 + vec2(7.7, -t * 0.07))) - 0.5;
  q += uWarp * 0.075 * w;
  float xn = q.x;
  float envB = cos(1.57079633 * min(abs(0.9 * xn), 1.0));
  float env = envB * envB;
  float low = 0.5 + 0.5 * cos(t * 0.37);
  float mid = 0.5 + 0.5 * sin(t * 0.51 + 1.2);
  float high = 0.5 + 0.5 * cos(t * 0.73 + 2.1);
  float drift = t * 2.4;
  float mainAmp = 0.1 + uRidge * 0.17 + low * 0.018;
  float bandAmp = mainAmp + mid * 0.025 + high * 0.018;
  float mainY = mainAmp * env * sin(q.x * 1.1 + drift);
  float sep = 1.85 + uWarp * 0.12 + mid * 0.28;
  float soft = 0.03 / max(uSharp, 0.2) + mid * 0.006;

  vec2 b0 = band(q, drift, -sep, bandAmp, mainY, env, soft);
  vec2 b1 = band(q, drift, -sep * 0.34, bandAmp, mainY, env, soft);
  vec2 b2 = band(q, drift, sep * 0.34, bandAmp, mainY, env, soft);
  vec2 b3 = band(q, drift, sep, bandAmp, mainY, env, soft);
  float w0 = b0.x + b0.y;
  float w1 = b1.x + b1.y;
  float w2 = b2.x + b2.y;
  float w3 = b3.x + b3.y;
  float total = w0 + w1 + w2 + w3;
  float d0 = w0 * w0;
  float d1 = w1 * w1;
  float d2 = w2 * w2;
  float d3 = w3 * w3;
  vec3 spectral = (uColA * d0 + uColC * d1 + uColB * d2 + uColD * d3) / max(d0 + d1 + d2 + d3, 0.0001);
  float energy = (1.0 - exp(-max(total - 0.12, 0.0) * 0.75)) * env;
  float md = abs(q.y - mainY);
  float core = exp(-md * md / (0.0028 / max(uSharp, 0.2))) * env;

  float haze = fbm(q * 1.6 + vec2(t * 0.05, -t * 0.03));
  vec3 atmos = mix(uColD, uColB, smoothstep(-0.7, 0.7, q.y)) * (0.012 + 0.022 * haze);
  atmos += mix(uColA, uColC, haze) * 0.035 * exp(-q.y * q.y * 7.0) * haze;

  vec3 col = atmos + spectral * energy * 1.14;
  col += uHi * core * (0.2 + 0.1 * low);
  col = col / (1.0 + col * 0.18);
  col = mix(col, uHi, 0.06 * smoothstep(0.15, 1.15, dot(p, vec2(-0.32, 0.78))));
  col *= 1.0 - 0.3 * smoothstep(-0.1, 1.2, dot(p, vec2(0.45, -0.62)));
  return col;
}

float profile(float t) {
  float d = clamp(t, 0.0, 1.0);
  return 1.0 - sqrt(max(1.0 - (1.0 - d) * (1.0 - d), 0.0));
}

float lobe(vec2 n, vec2 dir, float cut, float power) {
  return pow(clamp((dot(n, dir) - cut) / max(1.0 - cut, 0.001), 0.0, 1.0), power);
}

vec3 over(vec3 dst, vec3 src, float a) {
  float k = clamp(a, 0.0, 1.0);
  return src * k + dst * (1.0 - k);
}

void orb() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - uSize) / uSize;
  float r = length(uv);
  float ang = atan(uv.y, uv.x);
  float t = uPhase;

  float contour = uHear * uLevel * (0.011 * sin(ang * 3.0 + t * 1.9) + 0.006 * sin(ang * 5.0 - t * 1.3 + 1.7));
  float rad = RAD * (1.0 + contour);
  vec3 glowCol = uGlowCol * (0.6 + 0.4 * uHear * uLevel);
  float glowAmt = uGlow * (1.0 + 0.9 * uHear * uLevel);

  if (r > rad * (1.01 + SOFT)) {
    vec3 halo = glowCol * glowAmt * exp(-(r - rad) * 11.0) * (1.0 - smoothstep(rad, 0.995, r));
    halo = clamp(halo, 0.0, 1.0);
    outC = vec4(halo, max(halo.r, max(halo.g, halo.b))) * uFade;
    return;
  }

  vec2 p = uv / rad;
  float pd = length(p);
  vec2 n = pd > 0.0001 ? p / pd : vec2(0.0);
  float edge = max(1.0 - pd, 0.0);
  float prof = pow(profile(edge / 0.3), 0.68);
  vec2 rp = p - n * prof * 0.5;

  vec3 fcol;
  if (prof > 0.002) {
    float split = 0.12 * prof;
    fcol = vec3(sheet(rp - n * split, t).r, sheet(rp, t).g, sheet(rp + n * split, t).b);
  } else {
    fcol = sheet(p, t);
  }

  float lum = dot(fcol, vec3(0.213, 0.715, 0.072));
  vec3 col = clamp(vec3(lum) + (fcol - vec3(lum)) * 1.18, 0.0, 1.0);

  float rimReact = uRim * (1.0 + 0.45 * uHear * uLevel);
  float surfW = 0.035 + 0.03 * uHear * uLevel;
  float surf = 1.0 - smoothstep(0.0, surfW, edge);
  float optical = pow(surf, 1.8);
  col = over(col, mix(uColA, uHi, 0.5) * 0.35, optical * 0.1 * rimReact);

  float coolS = lobe(n, normalize(vec2(0.84, 0.54)), 0.05, 1.6);
  float warmS = lobe(n, normalize(vec2(-0.62, -0.78)), 0.05, 1.8);
  float disp = optical * 0.5 * rimReact;
  col = over(col, uCool, disp * coolS);
  col = over(col, uWarm, disp * warmS);

  col *= 1.0 - optical * 0.12 * (0.15 + 0.85 * max(dot(n, vec2(0.45, -0.89)), 0.0));

  float key = optical * lobe(n, normalize(vec2(-0.68, 0.73)), 0.2, 2.8) * 0.6 * rimReact;
  float fillL = optical * lobe(n, normalize(vec2(0.74, -0.67)), 0.4, 3.6) * 0.4 * rimReact;
  col = over(col, mix(uHi, vec3(1.0), 0.35), key);
  col = over(col, mix(uColC, uHi, 0.55), fillL);

  col *= 1.0 - 0.4 * smoothstep(0.95, 1.0, pd);
  col += mix(uColA, uColB, 0.3 + 0.3 * sin(ang + t * 0.6)) * optical * 0.3 * uHear * uLevel;

  float spec = exp(-dot(p - vec2(-0.38, 0.46), p - vec2(-0.38, 0.46)) * 22.0);
  col += uHi * spec * 0.07 * uRim;

  float ballA = 1.0 - smoothstep(0.99 - SOFT, 1.01 + SOFT, pd);
  col = clamp(col * max(uExposure, 0.0), 0.0, 1.0) * ballA;
  float outside = smoothstep(rad - SOFT, rad + SOFT, r);
  col += glowCol * glowAmt * exp(-max(r - rad, 0.0) * 11.0) * (1.0 - smoothstep(rad, 0.995, r)) * outside;
  col = clamp(col, 0.0, 1.0);
  float a = clamp(max(ballA, max(col.r, max(col.g, col.b))), 0.0, 1.0);
  outC = vec4(col, a) * uFade;
}

// Inlay: composite over the screen colour so the GL view can stay opaque.
void main() {
  orb();
  gl_FragColor = vec4(outC.rgb + uBg * (1.0 - outC.a), 1.0);
}
`
