#!/usr/bin/env node
/*
  Copy lint for the patient app (FINAL-SPEC G.4 step 4).

  Plain Node, no dependencies. Walks mobile/src, reads the string literals,
  template text and JSX text of every source file with a small TSX lexer, and
  prints one line per problem:

    src/<file>:<line> <rule>: <snippet>

  Rules
    dash                 U+2013 or U+2014 anywhere in mobile/src, comments
                         included (and their \u escapes or HTML entities in
                         strings and JSX); dot folders such as .rune hold
                         tool state and are skipped
    uppercase-transform  textTransform "uppercase"
    banned-word          words the spec keeps off patient screens, in strings
                         and JSX text under app/ and components/ (any case);
                         the review pages (app/demo) and the approved crash
                         message (components/error-state.tsx) are exempt
    all-caps             a word of four or more capitals outside the acronym
                         list (proper names the record shows included:
                         MEDITECH, TEFCA, KONZA, COVID), and "A1C" (written
                         A1c)
    price                a literal price ($ and a digit) outside lib/plans.ts,
                         lib/record.ts and lib/demo.ts
    price-label          priceLabel( outside the plan showroom, the checkout
                         sheet and the membership page
    router-replace       router.replace( outside the tab bar, the assistant's
                         close, the review pages (app/demo, record ready), the
                         error screens and the frozen sign in handoff after a
                         new password
    gesture-disabled     gestureEnabled: false anywhere but session expired
    one-art              a second <Art in a screen file under app/ (app/demo
                         is exempt)
    parse                the lexer could not read a file (nothing in it was
                         checked past that point)

  Only copy is read for banned-word and all-caps: identifiers, import paths,
  routes, keys, style values and comments are skipped. The frozen onboarding
  files skip banned-word and all-caps, and keep every other rule.

  Usage: node scripts/copy-lint.mjs [--json]
  Exit code 1 when anything is found, 0 when the tree is clean.
*/

import { readdirSync, readFileSync, realpathSync } from "node:fs"
import { dirname, extname, join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"

const MOBILE = join(dirname(fileURLToPath(import.meta.url)), "..")
const SRC = join(MOBILE, "src")

// ------------------------------------------------------------------ scope

/** Frozen onboarding files: no banned-word or all-caps check. */
const FROZEN = [
  "app/activate.tsx",
  "app/sign-in.tsx",
  "app/set-password.tsx",
  "app/onboarding/",
  "app/building.tsx",
  "app/connect.tsx",
  "app/record-ready/",
  "app/errors/",
  "components/flow.tsx",
  "components/ui.tsx",
  "components/chat.tsx",
  "components/consent-kit.tsx",
  "components/why-card.tsx",
  "components/flourish.tsx",
  "components/record-blocks.tsx",
  "components/record-ready-variants.tsx",
  "components/launch-screen.tsx",
  "lib/conversation.ts",
]
const isFrozen = (rel) => FROZEN.some((p) => (p.endsWith("/") ? rel.startsWith(p) : rel === p))

/** A file, or a folder when it ends in "/", matched against a path under src. */
const matches = (list, rel) => list.some((p) => (p.endsWith("/") ? rel.startsWith(p) : rel === p))

const PRICE_FILES = new Set(["lib/plans.ts", "lib/record.ts", "lib/demo.ts"])
const PRICE_LABEL_FILES = new Set(["components/plan-showroom.tsx", "components/checkout-sheet.tsx", "app/membership.tsx"])

/** Where router.replace( may stay (FINAL-SPEC B.2): the tab bar's openTab,
    the assistant's close fallback, and the screens where going back must
    never return: the review pages (app/demo and the record ready gallery),
    the error screens and the crash and offline body they share, session
    expired, and the frozen sign in after a new password (approved 1 Oct:
    sign in replaces activation and the password behind it). */
const REPLACE_ALLOWED = [
  "components/tab-bar.tsx",
  "app/assistant.tsx",
  "app/demo/",
  "app/record-ready/",
  "components/record-ready-variants.tsx",
  "app/errors/",
  "app/session-expired.tsx",
  "components/error-state.tsx",
  "app/set-password.tsx",
]
const replaceAllowed = (rel) => matches(REPLACE_ALLOWED, rel)
const isScreen = (rel) => rel.startsWith("app/") && !rel.startsWith("app/demo/") && /\.(tsx|jsx)$/.test(rel)

/** Outside the banned words rule, besides the frozen files: the review
    pages, which describe the kit to HOL ("a marker going the wrong way"),
    and the approved crash message ("Something went wrong"). */
const WORDS_EXEMPT = ["app/demo/", "components/error-state.tsx"]
const inWordScope = (rel) => (rel.startsWith("app/") || rel.startsWith("components/")) && !matches(WORDS_EXEMPT, rel)

const BANNED = [
  "abnormal",
  "outside target",
  "out of target",
  "Avg reading",
  "Toward target",
  "Away from target",
  "Missed follow-up",
  "may not know about this",
  "failed",
  "conflict",
  "wrong",
]
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
/* Whole words, any case, with the word's own endings ("conflicts",
   "Avg readings"); a hyphen also matches a space or nothing. */
const BANNED_RE = BANNED.map((phrase) => ({
  phrase,
  re: new RegExp(
    "(?<![A-Za-z0-9])" +
      phrase
        .split(/\s+/)
        .map((w) => w.split("-").map(escapeRe).join("[-\\s]?"))
        .join("\\s+") +
      "[A-Za-z]*",
    "gi",
  ),
}))

/** The spec's acronyms (C.0.6), and the proper names the record shows as
    their owners write them: the MEDITECH record system, the TEFCA and
    KONZA networks (records window list) and the COVID-19 vaccine. */
const ACRONYMS = new Set(["HIPAA", "DEXA", "eGFR", "LDL", "HDL", "BMI", "TSH", "ALT", "AST", "BUN", "AI", "AM", "PM", "MEDITECH", "TEFCA", "KONZA", "COVID"])

// ------------------------------------------------------------------ lexer

const SOURCE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"])
const JSX_EXT = new Set([".tsx", ".jsx", ".js"])
const BINARY_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".heic", ".ico", ".bmp", ".ttf", ".otf", ".woff", ".woff2",
  ".mp3", ".mp4", ".m4a", ".wav", ".mov", ".zip", ".gz", ".pdf", ".riv", ".glb", ".bin",
])

const WS = new Set([" ", "\t", "\n", "\r", "\v", "\f", "\u00a0", "\ufeff", "\u2028", "\u2029"])
const isDigit = (c) => c >= "0" && c <= "9"
const isIdStart = (c) =>
  c !== undefined && ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_" || c === "$" || (c > "\u007f" && !WS.has(c)))
const isIdPart = (c) => isIdStart(c) || isDigit(c)

/** Keywords after which an expression (a regex, or JSX) can start. */
const KW_EXPR = new Set(["return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "throw", "case", "do", "else", "yield", "await", "default"])
/** Words before "(" that are not a call. */
const NOT_CALLEE = new Set([
  "if", "for", "while", "switch", "catch", "with", "return", "typeof", "function", "void", "await", "yield",
  "in", "of", "instanceof", "delete", "throw", "case", "else", "do", "new",
])
/** Calls whose arguments are never shown to the patient. */
const QUIET_CALLS = new Set([
  "require", "import", "Error", "TypeError", "RangeError", "RegExp", "Symbol",
  "getItem", "setItem", "removeItem", "mergeItem", "getItemAsync", "setItemAsync", "deleteItemAsync",
  "addEventListener", "removeEventListener", "addListener",
])
/** Methods whose first argument is something to look for, not something to show. */
const PATTERN_METHODS = new Set([
  "includes", "startsWith", "endsWith", "indexOf", "lastIndexOf", "split", "match", "matchAll", "search",
  "replace", "replaceAll", "has", "get", "delete", "localeCompare",
])
/** JSX attributes that never hold copy. */
const CODE_ATTRS = new Set([
  "d", "viewBox", "points", "transform", "href", "key", "source", "fontFamily", "fontWeight",
  "accessibilityRole", "role", "pointerEvents", "keyboardType", "inputMode", "autoComplete", "autoCapitalize",
  "textContentType", "returnKeyType", "enterKeyHint", "resizeMode", "contentFit", "fill", "stroke",
  "strokeLinecap", "strokeLinejoin", "fillRule", "clipRule", "id", "xmlns", "className", "barStyle",
])
const isCodeAttr = (a) => a != null && (CODE_ATTRS.has(a) || /(style|Style|color|Color|ID|Id)$/.test(a))

const PUNCTS = [
  ">>>=", "...", "===", "!==", "**=", "<<=", ">>=", ">>>", "&&=", "||=", "??=",
  "=>", "==", "!=", "<=", ">=", "&&", "||", "??", "?.", "++", "--",
  "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "**", "<<", ">>",
]
const CLOSE = { "(": ")", "[": "]", "{": "}" }
const NO_FLAGS = Object.freeze({ quiet: false, style: false })

/**
 * Splits a TS/TSX source into tokens: identifiers, punctuation, strings,
 * templates (with their text parts), regexes, JSX text, JSX attribute
 * strings and attribute names. Comments are kept apart. Each string-like
 * token carries the context it sits in: the call or bracket around it and
 * whether it is inside a style object or a call whose text is never shown.
 */
function lex(src, jsx) {
  const n = src.length
  const tokens = []
  const comments = []
  const tags = [] // JSX opening tags: { name, start, end, attrs: [{ name, value }] }
  const errors = []
  const root = { mode: "code", kind: "root", brackets: [], prev: null, flags: NO_FLAGS }
  const frames = [root]
  let i = 0

  const top = () => frames[frames.length - 1]
  const err = (msg, at = i) => errors.push({ offset: at, msg })
  const push = (tok) => {
    tok.idx = tokens.length
    tokens.push(tok)
    return tok
  }
  const flagsOf = (f) => (f.brackets.length ? f.brackets[f.brackets.length - 1].flags : f.flags)
  const ctxOf = (f) => {
    const b = f.brackets[f.brackets.length - 1]
    return b ? { ch: b.ch, callee: b.callee, obj: b.obj, member: b.member, argIndex: b.argIndex } : null
  }

  const exprCanStart = (prev) => {
    if (!prev) return true
    switch (prev.type) {
      case "num":
      case "string":
      case "template":
      case "regex":
      case "jsxEnd":
        return false
      case "ident":
        return KW_EXPR.has(prev.value)
      case "punct":
        return !(prev.value === ")" || prev.value === "]" || prev.value === "++" || prev.value === "--" || prev.postfix)
      default:
        return true
    }
  }
  const isTagPrefix = (prev) =>
    !!prev && ((prev.type === "ident" && !KW_EXPR.has(prev.value)) || (prev.type === "punct" && (prev.value === ")" || prev.value === "]")))

  const jsxStartsAt = (at) => {
    const c2 = src[at + 1]
    if (c2 === ">") return true
    if (!isIdStart(c2)) return false
    const rest = src.slice(at, at + 200)
    if (/^<\s*[A-Za-z_$][\w$]*\s*(,|extends\b)/.test(rest)) return false // <T,>() => and <T extends X>
    if (/^<[A-Z]\d*>\s*\(/.test(rest)) return false // <T>(x: T) => in a type
    return true
  }

  const lineComment = () => {
    const e = src.indexOf("\n", i)
    const end = e === -1 ? n : e
    comments.push([i, end])
    i = end
  }
  const blockComment = () => {
    const e = src.indexOf("*/", i + 2)
    if (e === -1) err("unterminated comment")
    const end = e === -1 ? n : e + 2
    comments.push([i, end])
    i = end
  }
  const endOfString = (at, q) => {
    let j = at + 1
    while (j < n) {
      const c = src[j]
      if (c === "\\") {
        j += 2
        continue
      }
      if (c === q) return j + 1
      if (c === "\n") {
        err("unterminated string", at)
        return j
      }
      j++
    }
    err("unterminated string", at)
    return n
  }
  const endOfRegex = (at) => {
    let j = at + 1
    let inClass = false
    while (j < n) {
      const c = src[j]
      if (c === "\\") {
        j += 2
        continue
      }
      if (c === "\n" || c === "\r") return -1
      if (inClass) {
        if (c === "]") inClass = false
      } else if (c === "[") inClass = true
      else if (c === "/") {
        j++
        while (j < n && /[a-z]/i.test(src[j])) j++
        return j
      }
      j++
    }
    return -1
  }

  const openBracket = (f, ch) => {
    const parent = flagsOf(f)
    let callee = null
    let obj = null
    let member = false
    const p = f.prev
    if (ch === "(" && p && p.type === "ident" && !NOT_CALLEE.has(p.value)) {
      callee = p.value
      const dot = tokens[p.idx - 1]
      const o = tokens[p.idx - 2]
      if (dot && dot.type === "punct" && (dot.value === "." || dot.value === "?.")) {
        member = true
        if (o && o.type === "ident") obj = o.value
      }
    }
    let flags = parent
    const quiet = !!callee && (QUIET_CALLS.has(callee) || obj === "console")
    const style = callee === "create" && obj === "StyleSheet"
    if ((quiet && !parent.quiet) || (style && !parent.style)) flags = { quiet: parent.quiet || quiet, style: parent.style || style }
    f.brackets.push({ ch, callee, obj, member, argIndex: 0, flags })
    f.prev = push({ type: "punct", value: ch, start: i, end: i + 1 })
    i++
  }
  const closeBracket = (f, ch) => {
    const b = f.brackets.pop()
    if (!b || b.ch !== ch) err(`unbalanced ${CLOSE[ch]}`)
    f.prev = push({ type: "punct", value: CLOSE[ch], start: i, end: i + 1 })
    i++
  }
  const endElement = () => {
    const t = top()
    if (t.mode === "code") t.prev = { type: "jsxEnd" }
  }
  const openTag = (flags, closing) => ({ mode: "jsxTag", closing, name: null, start: i, attrs: [], attr: null, eq: false, tag: null, flags })

  function stepCode(f) {
    const c = src[i]
    if (WS.has(c)) {
      i++
      return
    }
    const c2 = src[i + 1]
    if (c === "/" && c2 === "/") return lineComment()
    if (c === "/" && c2 === "*") return blockComment()
    if (c === '"' || c === "'") {
      const start = i
      i = endOfString(i, c)
      f.prev = push({ type: "string", start, end: i, raw: src.slice(start + 1, Math.max(start + 1, i - 1)), flags: flagsOf(f), ctx: ctxOf(f) })
      return
    }
    if (c === "`") {
      const tok = push({ type: "template", start: i, end: n, quasis: [], tagged: isTagPrefix(f.prev), flags: flagsOf(f), ctx: ctxOf(f) })
      frames.push({ mode: "template", tok, parent: f, qStart: i + 1 })
      i++
      return
    }
    if (isIdStart(c) || (c === "#" && isIdStart(c2))) {
      const start = i
      i++
      while (i < n && isIdPart(src[i])) i++
      f.prev = push({ type: "ident", value: src.slice(start, i), start, end: i })
      return
    }
    if (isDigit(c) || (c === "." && isDigit(c2))) {
      const start = i
      i++
      while (i < n) {
        const d = src[i]
        if (isIdPart(d)) i++
        else if (d === "." && isDigit(src[i + 1])) i++
        else if ((d === "+" || d === "-") && (src[i - 1] === "e" || src[i - 1] === "E") && !/^0[xXbBoO]/.test(src.slice(start, i))) i++
        else break
      }
      f.prev = push({ type: "num", start, end: i })
      return
    }
    if (c === "/" && exprCanStart(f.prev)) {
      const end = endOfRegex(i)
      if (end > 0) {
        f.prev = push({ type: "regex", start: i, end })
        i = end
        return
      }
    }
    if (c === "<" && jsx && exprCanStart(f.prev) && jsxStartsAt(i)) {
      push({ type: "punct", value: "<", start: i, end: i + 1, jsx: true })
      frames.push(openTag(flagsOf(f), false))
      i++
      return
    }
    if (c === "{" || c === "(" || c === "[") return openBracket(f, c)
    if (c === "}") {
      if (!f.brackets.length) {
        if (f.kind === "root") {
          err("unmatched }")
          i++
          return
        }
        // The end of a ${...} or a JSX {...}.
        frames.pop()
        push({ type: "punct", value: "}", start: i, end: i + 1 })
        const t = top()
        if (t.mode === "template") t.qStart = i + 1
        i++
        return
      }
      return closeBracket(f, "{")
    }
    if (c === ")") return closeBracket(f, "(")
    if (c === "]") return closeBracket(f, "[")
    if (c === "," && f.brackets.length) f.brackets[f.brackets.length - 1].argIndex++
    let p = c
    for (const q of PUNCTS) {
      if (src.startsWith(q, i)) {
        p = q
        break
      }
    }
    if (p === "?." && isDigit(src[i + 2])) p = "?"
    const tok = { type: "punct", value: p, start: i, end: i + p.length }
    // x! is a non-null assertion: what follows divides, it does not open a regex.
    if (p === "!" && (isIdPart(src[i - 1]) || src[i - 1] === ")" || src[i - 1] === "]")) tok.postfix = true
    f.prev = push(tok)
    i += p.length
  }

  function stepTemplate(f) {
    while (i < n) {
      const c = src[i]
      if (c === "\\") {
        i += 2
        continue
      }
      if (c === "`") {
        f.tok.quasis.push({ start: f.qStart, end: i, raw: src.slice(f.qStart, i) })
        f.tok.end = i + 1
        frames.pop()
        f.parent.prev = f.tok
        i++
        return
      }
      if (c === "$" && src[i + 1] === "{") {
        f.tok.quasis.push({ start: f.qStart, end: i, raw: src.slice(f.qStart, i) })
        push({ type: "punct", value: "${", start: i, end: i + 2 })
        frames.push({ mode: "code", kind: "expr", brackets: [], prev: null, flags: f.tok.flags })
        i += 2
        return
      }
      i++
    }
    err("unterminated template", f.tok.start)
  }

  function stepJsxTag(f) {
    const c = src[i]
    if (WS.has(c)) {
      i++
      return
    }
    if (f.name === null) {
      const start = i
      while (i < n && (isIdPart(src[i]) || src[i] === "." || src[i] === ":" || src[i] === "-")) i++
      f.name = src.slice(start, i)
      if (!f.closing) {
        f.tag = { name: f.name, start: f.start, end: -1, attrs: f.attrs }
        tags.push(f.tag)
      }
      return
    }
    const c2 = src[i + 1]
    if (c === "/" && c2 === "/") return lineComment()
    if (c === "/" && c2 === "*") return blockComment()
    if (c === "/" && c2 === ">") {
      push({ type: "punct", value: "/>", start: i, end: i + 2, jsx: true })
      i += 2
      if (f.tag) f.tag.end = i
      frames.pop()
      if (f.closing) err("self-closing closing tag")
      endElement()
      return
    }
    if (c === ">") {
      push({ type: "punct", value: ">", start: i, end: i + 1, jsx: true })
      i++
      frames.pop()
      if (f.closing) {
        const children = frames.pop()
        if (!children || children.mode !== "jsxChildren") {
          err(`stray </${f.name}>`)
          if (children) frames.push(children)
          return
        }
        if (children.name !== f.name) err(`<${children.name}> closed by </${f.name}>`)
        endElement()
      } else {
        if (f.tag) f.tag.end = i
        frames.push({ mode: "jsxChildren", name: f.name, flags: f.flags })
      }
      return
    }
    if (c === "{") {
      push({ type: "punct", value: "{", start: i, end: i + 1, jsx: true })
      const a = f.eq ? f.attr : null
      const flags =
        a !== null && (isCodeAttr(a) || /style$/i.test(a))
          ? { quiet: f.flags.quiet || isCodeAttr(a), style: f.flags.style || /style$/i.test(a) }
          : f.flags
      frames.push({ mode: "code", kind: "expr", brackets: [], prev: null, flags, attr: a })
      f.eq = false
      i++
      return
    }
    if (c === '"' || c === "'") {
      if (!f.eq) err("attribute string without a name")
      const e = src.indexOf(c, i + 1)
      if (e === -1) err("unterminated attribute string")
      const end = e === -1 ? n : e + 1
      const tok = push({ type: "jsxAttrString", start: i, end, raw: src.slice(i + 1, end - 1), attr: f.attr, tag: f.name, flags: f.flags })
      const last = f.attrs[f.attrs.length - 1]
      if (last && last.name === f.attr) last.value = tok.raw
      f.eq = false
      i = end
      return
    }
    if (c === "=") {
      f.eq = true
      i++
      return
    }
    if (c === "<") {
      if (f.eq) {
        // A JSX element as an attribute value.
        push({ type: "punct", value: "<", start: i, end: i + 1, jsx: true })
        f.eq = false
        frames.push(openTag(f.flags, false))
        i++
        return
      }
      // Type arguments after the tag name, <List<Item | ""> ...>: types, never copy.
      let depth = 0
      while (i < n) {
        const d = src[i]
        if (d === '"' || d === "'" || d === "`") {
          const e = src.indexOf(d, i + 1)
          i = e === -1 ? n : e + 1
          continue
        }
        if (d === "=" && src[i + 1] === ">") i += 2
        else if (d === "<") depth++, i++
        else if (d === ">" && --depth === 0) {
          i++
          break
        } else i++
      }
      return
    }
    if (isIdStart(c)) {
      const start = i
      while (i < n && (isIdPart(src[i]) || src[i] === "-" || src[i] === ":" || src[i] === ".")) i++
      f.attr = src.slice(start, i)
      f.eq = false
      f.attrs.push({ name: f.attr, value: undefined })
      push({ type: "jsxAttr", value: f.attr, start, end: i })
      return
    }
    err(`unexpected ${JSON.stringify(c)} in <${f.name}>`)
    i++
  }

  function stepJsxChildren(f) {
    const c = src[i]
    if (c === "{") {
      push({ type: "punct", value: "{", start: i, end: i + 1, jsx: true })
      frames.push({ mode: "code", kind: "expr", brackets: [], prev: null, flags: f.flags })
      i++
      return
    }
    if (c === "<") {
      let j = i + 1
      while (j < n && WS.has(src[j])) j++
      push({ type: "punct", value: "<", start: i, end: i + 1, jsx: true })
      if (src[j] === "/") {
        frames.push(openTag(f.flags, true))
        i = j + 1
        return
      }
      frames.push(openTag(f.flags, false))
      i++
      return
    }
    const start = i
    while (i < n && src[i] !== "{" && src[i] !== "<") i++
    push({ type: "jsxText", start, end: i, raw: src.slice(start, i), flags: f.flags })
  }

  while (i < n) {
    const f = top()
    if (f.mode === "code") stepCode(f)
    else if (f.mode === "template") stepTemplate(f)
    else if (f.mode === "jsxTag") stepJsxTag(f)
    else stepJsxChildren(f)
  }
  if (frames.length > 1) {
    const f = top()
    err(`file ends inside ${f.mode === "jsxChildren" ? `<${f.name}>` : f.mode === "jsxTag" ? "a JSX tag" : f.mode === "template" ? "a template" : "an expression"}`, n)
  }
  if (root.brackets.length) err(`unclosed ${root.brackets[root.brackets.length - 1].ch}`, n)
  return { tokens, comments, tags, errors }
}

// ------------------------------------------------------------------ text helpers

/** The value of a JS string or template part, escapes resolved. */
function cook(raw) {
  if (!raw.includes("\\")) return raw
  return raw.replace(/\\(u\{([0-9a-fA-F]+)\}|u([0-9a-fA-F]{4})|x([0-9a-fA-F]{2})|\r\n|[\s\S])/g, (m, all, cp, u4, x2) => {
    if (cp) return String.fromCodePoint(parseInt(cp, 16))
    if (u4) return String.fromCharCode(parseInt(u4, 16))
    if (x2) return String.fromCharCode(parseInt(x2, 16))
    const e = all
    if (e === "\n" || e === "\r\n" || e === "\r" || e === "\u2028" || e === "\u2029") return ""
    return { n: "\n", t: "\t", r: "\r", b: "\b", f: "\f", v: "\v", 0: "\0" }[e] ?? e
  })
}

const ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0", ndash: "\u2013", mdash: "\u2014",
  hellip: "\u2026", rsquo: "\u2019", lsquo: "\u2018", rdquo: "\u201d", ldquo: "\u201c", middot: "\u00b7",
  bull: "\u2022", copy: "\u00a9", reg: "\u00ae", trade: "\u2122", deg: "\u00b0", times: "\u00d7",
}
/** JSX text and JSX attribute strings: HTML entities resolved. */
function decodeEntities(raw) {
  if (!raw.includes("&")) return raw
  return raw.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[A-Za-z]+);/g, (m, e) => {
    if (e[0] === "#") return String.fromCodePoint(e[1] === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10))
    return ENTITIES[e] ?? m
  })
}

/** A single-token or code-shaped value is not copy (keys, slugs, routes, colours, shader source, markup). */
function looksLikeCopy(value) {
  const t = value.trim()
  if (!/[A-Za-z]/.test(t)) return false
  if (/\s/.test(t)) return !((/\n/.test(t) && /[;{}]\s*$/m.test(t)) || /^<[A-Za-z!?/]/.test(t))
  if (/^(\/|\.{1,2}\/|@\/|~\/)/.test(t)) return false // route or path
  if (/^[a-z][a-z0-9+.-]*:/.test(t)) return false // https:, mailto:, tel:, data:
  if (/^#[0-9a-f]{3,8}$/i.test(t) || /^(rgb|hsl)a?\(/i.test(t)) return false
  if (!/[A-Z]/.test(t)) return false // slug, key, lowercase id
  if (/^[a-z][a-z0-9]*([A-Z][a-z0-9]*)+$/.test(t)) return false // camelCase
  if (/^[A-Z][a-z0-9]+([A-Z][a-z0-9]*)+$/.test(t)) return false // PascalCase
  if (t.includes("_")) return false // CONSTANT_CASE, snake_case, font names
  if (/^[\w$]+([.:#@][\w$]+)+$/.test(t)) return false // dotted key
  return true
}

const oneLine = (s) => s.replace(/\s+/g, " ").trim()
function excerpt(value, index, length) {
  const flat = oneLine(value)
  if (flat.length <= 110) return `"${flat}"`
  // Keep the match in view.
  const before = oneLine(value.slice(0, index))
  const at = before.length
  const from = Math.max(0, at - 45)
  const to = Math.min(flat.length, at + length + 45)
  return `"${from > 0 ? "..." : ""}${flat.slice(from, to)}${to < flat.length ? "..." : ""}"`
}
const showDash = (s) => s.replace(/\u2013/g, "<U+2013>").replace(/\u2014/g, "<U+2014>")

// ------------------------------------------------------------------ checks

function checkFile(rel, text) {
  const found = []
  const lineStarts = [0]
  for (let k = 0; k < text.length; k++) if (text[k] === "\n") lineStarts.push(k + 1)
  const lineOf = (offset) => {
    let lo = 0
    let hi = lineStarts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (lineStarts[mid] <= offset) lo = mid
      else hi = mid - 1
    }
    return lo + 1
  }
  const lineText = (offset) => {
    const l = lineOf(offset)
    const end = l < lineStarts.length ? lineStarts[l] - 1 : text.length
    return text.slice(lineStarts[l - 1], end)
  }
  const add = (offset, rule, snippet) => found.push({ file: `src/${rel}`, line: lineOf(offset), rule, snippet })

  // dash: the characters themselves, anywhere (comments included).
  for (const m of text.matchAll(/[\u2013\u2014]/g)) {
    const from = Math.max(0, m.index - 40)
    const to = Math.min(text.length, m.index + 41)
    add(m.index, "dash", `"${showDash(oneLine(text.slice(from, to)))}"`)
  }
  if (!SOURCE_EXT.has(extname(rel))) return found

  const { tokens, tags, errors } = lex(text, JSX_EXT.has(extname(rel)))
  for (const e of errors) add(e.offset, "parse", e.msg)

  const frozen = isFrozen(rel)
  const wordRule = inWordScope(rel) && !frozen
  const capsRule = !frozen
  const priceRule = !PRICE_FILES.has(rel)

  /** Where a match inside a token's value sits in the file. */
  const locate = (rawStart, raw, value, index, match) => {
    if (raw === value) return rawStart + index
    const k = raw.indexOf(match)
    return k === -1 ? rawStart : rawStart + k
  }

  const checkText = (value, rawStart, raw, { copy, price = true }) => {
    if (priceRule && price) {
      for (const m of value.matchAll(/\$ ?\d[\d,.]*/g)) add(locate(rawStart, raw, value, m.index, m[0]), "price", `${excerpt(value, m.index, m[0].length)} [${m[0]}]`)
    }
    if (!copy) return
    if (wordRule) {
      for (const { re } of BANNED_RE) {
        for (const m of value.matchAll(re)) add(locate(rawStart, raw, value, m.index, m[0]), "banned-word", `${excerpt(value, m.index, m[0].length)} [${oneLine(m[0])}]`)
      }
    }
    if (capsRule) {
      const plain = value.replace(/#[0-9a-fA-F]{3,8}\b/g, (s) => " ".repeat(s.length)).replace(/\b0x[0-9a-fA-F]+\b/g, (s) => " ".repeat(s.length))
      for (const m of plain.matchAll(/[A-Za-z0-9]+/g)) {
        const w = m[0]
        if (/[a-z]/.test(w) || ACRONYMS.has(w)) continue
        if ((w.match(/[A-Z]/g) || []).length >= 4) add(locate(rawStart, raw, value, m.index, w), "all-caps", `${excerpt(value, m.index, w.length)} [${w}]`)
        else if (w === "A1C") add(locate(rawStart, raw, value, m.index, w), "all-caps", `${excerpt(value, m.index, w.length)} [A1C, written A1c]`)
      }
    }
  }
  const checkEscapes = (raw, rawStart, jsxEntities) => {
    const re = jsxEntities ? /&(ndash|mdash);|&#(8211|8212);|&#x0*201[34];/gi : /\\u(201[34]|\{0*201[34]\})/gi
    for (const m of raw.matchAll(re)) add(rawStart + m.index, "dash", `"${oneLine(raw).slice(0, 110)}" [${m[0]}]`)
  }
  const checkUppercase = (value, offset) => {
    if (value === "uppercase" || /text-transform\s*:\s*uppercase/i.test(value)) add(offset, "uppercase-transform", oneLine(lineText(offset)).slice(0, 120))
  }

  const nextAfter = (k) => {
    const t = tokens[k]
    for (let j = k + 1; j < tokens.length; j++) if (tokens[j].start >= t.end) return tokens[j]
    return undefined
  }
  const isP = (tok, ...values) => !!tok && tok.type === "punct" && values.includes(tok.value)
  const isW = (tok, ...values) => !!tok && tok.type === "ident" && values.includes(tok.value)

  /** A string's place in the code says it is not copy: a module path, a key, a compared value, a type. */
  const codePlace = (k, next) => {
    const t = tokens[k]
    const prev = tokens[k - 1]
    if (t.flags.quiet || t.flags.style) return true
    if (isW(prev, "from", "import", "module", "require")) return true
    if (isP(next, ":") && isP(prev, "{", ",")) return true // object or type key
    if (isW(prev, "case")) return true
    if (isP(prev, "===", "!==", "==", "!=") || isP(next, "===", "!==", "==", "!=")) return true
    if (isP(prev, "|", "&", "<") || isP(next, "|", "&", ">", ">>", ">>>")) return true // types
    if (isW(prev, "as", "satisfies", "keyof", "extends", "is") || isW(next, "extends")) return true
    if (isP(prev, "[") && isP(next, "]")) {
      const before = tokens[k - 2]
      if (before && (before.type === "ident" || before.type === "string" || before.type === "template" || isP(before, ")", "]", "?."))) return true // obj["key"]
    }
    const b = t.ctx
    if (b && b.ch === "(" && b.member && b.argIndex === 0 && PATTERN_METHODS.has(b.callee)) return true
    return false
  }
  const isReplacement = (t) => !!t.ctx && t.ctx.ch === "(" && t.ctx.member && (t.ctx.callee === "replace" || t.ctx.callee === "replaceAll") && t.ctx.argIndex === 1

  for (let k = 0; k < tokens.length; k++) {
    const t = tokens[k]
    if (t.type === "string") {
      const value = cook(t.raw)
      checkEscapes(t.raw, t.start + 1, false)
      checkUppercase(value, t.start)
      const copy = !codePlace(k, tokens[k + 1]) && looksLikeCopy(value)
      // A .replace() output names its groups with $1, $2: not a price.
      checkText(value, t.start + 1, t.raw, { copy, price: !isReplacement(t) })
    } else if (t.type === "template") {
      const parts = t.quasis.map((q) => ({ ...q, value: cook(q.raw) }))
      for (const q of parts) checkEscapes(q.raw, q.start, false)
      if (parts.length === 1) checkUppercase(parts[0].value, t.start)
      const copy = !t.tagged && !codePlace(k, nextAfter(k)) && looksLikeCopy(parts.map((q) => q.value).join("x"))
      for (const q of parts) checkText(q.value, q.start, q.raw, { copy, price: !isReplacement(t) })
    } else if (t.type === "jsxText") {
      if (!t.raw.trim()) continue
      const value = decodeEntities(t.raw)
      checkEscapes(t.raw, t.start, true)
      checkText(value, t.start, t.raw, { copy: true })
    } else if (t.type === "jsxAttrString") {
      const value = decodeEntities(t.raw)
      checkEscapes(t.raw, t.start + 1, true)
      if (t.attr === "textTransform") checkUppercase(value, t.start)
      const copy = !t.flags.quiet && !t.flags.style && !isCodeAttr(t.attr) && looksLikeCopy(value)
      checkText(value, t.start + 1, t.raw, { copy })
    } else if (t.type === "ident") {
      const a = tokens[k + 1]
      const b = tokens[k + 2]
      const c = tokens[k + 3]
      if (t.value === "priceLabel" && isP(a, "(") && !isW(tokens[k - 1], "function") && !PRICE_LABEL_FILES.has(rel)) {
        add(t.start, "price-label", oneLine(lineText(t.start)).slice(0, 120))
      }
      if (t.value === "router" && isP(a, ".", "?.") && isW(b, "replace") && isP(c, "(") && !replaceAllowed(rel)) {
        add(t.start, "router-replace", oneLine(lineText(t.start)).slice(0, 120))
      }
      if (t.value === "gestureEnabled" && isP(a, ":") && isW(b, "false")) gesture(t.start)
    } else if (t.type === "jsxAttr" && t.value === "gestureEnabled") {
      const a = tokens[k + 1]
      const b = tokens[k + 2]
      if (isP(a, "{") && isW(b, "false")) gesture(t.start)
    }
  }

  function gesture(offset) {
    if (rel === "app/session-expired.tsx") return
    if (rel === "app/_layout.tsx") {
      // Allowed on the session expired screen's own Stack.Screen.
      const tag = tags.filter((g) => g.start <= offset && (g.end === -1 || g.end >= offset)).sort((x, y) => y.start - x.start)[0]
      if (tag && tag.attrs.some((a) => a.name === "name" && a.value === "session-expired")) return
    }
    add(offset, "gesture-disabled", oneLine(lineText(offset)).slice(0, 120))
  }

  if (isScreen(rel)) {
    const arts = tags.filter((g) => g.name === "Art")
    arts.slice(1).forEach((g, j) => {
      const name = g.attrs.find((a) => a.name === "name")?.value
      add(g.start, "one-art", `<Art${name ? ` name="${name}"` : ""}> is object ${j + 2} on this screen (first <Art> at line ${lineOf(arts[0].start)})`)
    })
  }
  return found
}

// ------------------------------------------------------------------ run

function walk(dir, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (entry.isFile() && !BINARY_EXT.has(extname(entry.name).toLowerCase())) out.push(full)
  }
  return out
}

export { lex, checkFile, looksLikeCopy }

function main() {
  const files = walk(SRC, []).sort()
  const problems = []
  for (const full of files) {
    const buf = readFileSync(full)
    if (buf.includes(0)) continue // binary
    const rel = relative(SRC, full).split(sep).join("/")
    problems.push(...checkFile(rel, buf.toString("utf8").replace(/^\ufeff/, "")))
  }
  problems.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line || (a.rule < b.rule ? -1 : a.rule > b.rule ? 1 : 0)))

  if (process.argv.includes("--json")) {
    process.stdout.write(JSON.stringify(problems, null, 2) + "\n")
  } else {
    for (const p of problems) process.stdout.write(`${p.file}:${p.line} ${p.rule}: ${p.snippet}\n`)
  }
  const byRule = {}
  for (const p of problems) byRule[p.rule] = (byRule[p.rule] || 0) + 1
  const fileCount = new Set(problems.map((p) => p.file)).size
  process.stderr.write(
    problems.length
      ? `\ncopy-lint: ${problems.length} problem${problems.length === 1 ? "" : "s"} in ${fileCount} file${fileCount === 1 ? "" : "s"} (${Object.entries(byRule)
          .map(([r, c]) => `${r} ${c}`)
          .join(", ")})\n`
      : `copy-lint: clean (${files.length} files)\n`,
  )
  process.exitCode = problems.length ? 1 : 0
}

// Runs when called as a script; importing it (for a test) only loads the functions.
const calledDirectly = () => {
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])
  } catch {
    return false
  }
}
if (calledDirectly()) main()
