// `nativestep lint` (COMPONENTS.md §1): the rules tagged *lint* in ARCHITECTURE.md.
// shortcut: text patterns over comment-free source, not Swift or Kotlin parsers; upgrade when a rule needs types.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { type Args, loadProject } from "./config.ts";

export interface Violation {
  rule: string;
  file: string;
  line?: number;
  message: string;
}

interface Source {
  path: string; // relative to the project root
  code: string; // comments blanked, strings kept
  bare: string; // comments and strings blanked
}

const SKIP = new Set([".build", "build", ".gradle", ".kotlin", ".swiftpm", "node_modules"]);

export function lint(args: Args): number {
  const project = loadProject();
  const found = lintProject(project.root, project.config.app.androidPackage);
  if (args.flags.json) console.log(JSON.stringify(found, null, 2));
  else {
    for (const v of found) console.log(`${v.rule} ${v.file}${v.line ? `:${v.line}` : ""}  ${v.message}`);
    console.log(found.length ? `lint: ${found.length} violation(s)` : "lint: clean");
  }
  return found.length ? 1 : 0;
}

export function lintProject(root: string, androidPackage: string): Violation[] {
  const pkg = androidPackage.replaceAll(".", "/");
  const dirs = {
    iosCore: "ios/Core/Sources",
    iosApp: "ios/App",
    androidCore: `android/core/src/main/kotlin/${pkg}`,
    androidApp: `android/app/src/main/kotlin/${pkg}`,
  };
  const p = {
    iosCore: read(root, dirs.iosCore, ".swift"),
    iosApp: read(root, dirs.iosApp, ".swift"),
    androidCore: read(root, dirs.androidCore, ".kt"),
    androidApp: read(root, dirs.androidApp, ".kt"),
  };
  const out: Violation[] = [];
  const add = (rule: string, s: Source | string, index: number | undefined, message: string) =>
    out.push({
      rule,
      file: typeof s === "string" ? s : s.path,
      line: typeof s === "string" || index === undefined ? undefined : lineOf(s.code, index),
      message,
    });

  // R1 · Core does not depend on the platform.
  for (const s of p.iosCore) {
    for (const m of s.code.matchAll(/^[ \t]*import[ \t]+(UIKit|SwiftUI|AppKit|WatchKit)\b/gm)) add("R1", s, m.index, `Core imports ${m[1]}`);
  }
  for (const s of p.androidCore) {
    for (const m of s.code.matchAll(/^[ \t]*import[ \t]+(androidx?\.[\w.]+)/gm)) add("R1", s, m.index, `Core imports ${m[1]}`);
  }

  // R6 · Time, randomness and id generation are services too.
  const swiftClock = /\bDate\(\s*\)|\bDate\.now\b|\bUUID\(\s*\)|\.random(?:Element)?\(|\.shuffled?\(|\barc4random\w*\(|\bCFAbsoluteTimeGetCurrent\(/g;
  const kotlinClock =
    /\bSystem\.(?:currentTimeMillis|nanoTime)\(|\b(?:Instant|LocalDate|LocalDateTime|LocalTime|ZonedDateTime|OffsetDateTime)\.now\(|\bUUID\.randomUUID\(|\bRandom\.\w|\bMath\.random\(|\bClock\.System\.now\(|\.shuffled\(|\.random\(\)/g;
  for (const [sources, pattern] of [[p.iosCore, swiftClock], [p.androidCore, kotlinClock]] as const) {
    for (const s of sources) {
      for (const m of s.bare.matchAll(pattern)) add("R6", s, m.index, `Core calls ${m[0].trim()} directly; use the Clock or IdGenerator service`);
    }
  }

  // R10 · Every ViewModel has a node.
  for (const s of p.iosCore) {
    for (const m of s.bare.matchAll(/\bclass\s+(\w+ViewModel)\b/g)) {
      const file = p.iosCore.find((f) => f.path.endsWith(`/${m[1]}+Introspection.swift`));
      const conforms = new RegExp(`\\bextension\\s+${m[1]}\\s*:[^{]*\\bIntrospectionNodeProviding\\b`);
      if (!file || !conforms.test(file.bare)) add("R10", s, m.index, `${m[1]} has no node in ${m[1]}+Introspection.swift`);
    }
  }
  for (const s of p.androidCore) {
    for (const m of s.bare.matchAll(/\bclass\s+(\w+)ViewModel\b/g)) {
      const node = new RegExp(`\\bclass\\s+${m[1]}Node\\b[^{]*\\bIntrospectionNode\\b`);
      if (!p.androidCore.some((f) => node.test(f.bare))) add("R10", s, m.index, `${m[1]}ViewModel has no ${m[1]}Node class`);
    }
  }

  // R12 · Names are identical on both platforms.
  const iosNodes = nodes(p.iosCore, /^(?:(?:public|private|internal|fileprivate|open|final|@\w+)\s+)*(?:extension|class|struct|enum|actor)\b/gm, /\bIntrospectionNode\(\s*name:\s*"([^"]+)"/);
  const androidNodes = nodes(p.androidCore, /^(?:(?:public|private|internal|data|sealed|abstract|open|enum|value)\s+)*(?:class|object|interface)\b/gm, /\boverride\s+val\s+name\s*(?::\s*String\s*)?=\s*"([^"]+)"/);
  for (const [nodeSet] of [[iosNodes], [androidNodes]]) {
    for (const [name, n] of nodeSet) {
      if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) add("R12", n.source, n.index, `node name ${name} is not PascalCase`);
      for (const a of n.actions) if (!/^_?[a-z][A-Za-z0-9]*$/.test(a)) add("R12", n.source, n.index, `action ${name}.${a} is not lowerCamelCase`);
    }
  }
  if (p.iosCore.length && p.androidCore.length) {
    for (const [here, there, platform, other] of [[iosNodes, androidNodes, "iOS", "Android"], [androidNodes, iosNodes, "Android", "iOS"]] as const) {
      for (const [name, n] of here) {
        const twin = there.get(name);
        if (!twin) {
          add("R12", n.source, n.index, `node ${name} exists only on ${platform}`);
          continue;
        }
        for (const a of n.actions) if (!twin.actions.has(a)) add("R12", n.source, n.index, `action ${name}.${a} exists only on ${platform}, not on ${other}`);
      }
    }
  }

  // R5 · Services have the same shape on both platforms.
  if (p.iosCore.length && p.androidCore.length) {
    const ios = services(p.iosCore, /\bstruct\s+Services\b/, /\b(?:var|let)\s+(\w+)\s*:\s*(?:any\s+)?(\w+)/g, "protocol", swiftParam);
    const android = services(p.androidCore, /\bclass\s+Services\s*\(/, /\b(?:val|var)\s+(\w+)\s*:\s*(\w+)/g, "interface", kotlinParam);
    for (const [here, there, platform] of [[ios, android, "iOS"], [android, ios, "Android"]] as const) {
      for (const [field, svc] of here) {
        const twin = there.get(field);
        if (!twin) add("R5", svc.source, svc.index, `service ${field}: ${svc.type} exists only on ${platform}`);
        else if (twin.type !== svc.type) add("R5", svc.source, svc.index, `service ${field} is ${svc.type} on ${platform} but ${twin.type} on the other platform`);
        else if (!svc.methods) add("R5", svc.source, svc.index, `no ${platform === "iOS" ? "protocol" : "interface"} ${svc.type} in Core`);
        else if (twin.methods) {
          for (const [method, m] of svc.methods) {
            const other = twin.methods.get(method);
            if (!other) add("R5", m.source, m.index, `${svc.type}.${method} exists only on ${platform}`);
            else if (platform === "iOS" && other.params.join() !== m.params.join()) {
              add("R5", m.source, m.index, `${svc.type}.${method} takes (${m.params.join(", ")}) on iOS but (${other.params.join(", ")}) on Android`);
            }
          }
        }
      }
    }
  }

  // R17 · Every feature has its own folder.
  const folders = (dir: string) => (existsSync(join(root, dir)) ? readdirSync(join(root, dir)).filter((f) => statSync(join(root, dir, f)).isDirectory()) : []);
  for (const [sources, dir] of [[p.iosCore, dirs.iosCore], [p.androidCore, dirs.androidCore]] as const) {
    for (const s of sources) if (!relative(dir, s.path).includes("/")) add("R17", s.path, undefined, `Core file outside a feature folder; move it under ${dir}/<Feature>/`);
  }
  const iosFeatures = folders(dirs.iosCore);
  const androidFeatures = folders(dirs.androidCore);
  if (p.iosCore.length && p.androidCore.length) {
    for (const f of iosFeatures) if (!androidFeatures.includes(f.toLowerCase())) add("R17", `${dirs.iosCore}/${f}`, undefined, `feature ${f} has no ${dirs.androidCore}/${f.toLowerCase()}/`);
    for (const f of androidFeatures) if (!iosFeatures.some((i) => i.toLowerCase() === f)) add("R17", `${dirs.androidCore}/${f}`, undefined, `feature ${f} has no folder in ${dirs.iosCore}/`);
  }
  for (const [dir, features] of [[dirs.iosApp, [...iosFeatures, "Shared"]], [dirs.androidApp, [...androidFeatures, "shared"]]] as const) {
    for (const f of folders(dir)) if (!features.includes(f)) add("R17", `${dir}/${f}`, undefined, `${f} is not a Core feature or Shared`);
  }

  // R20 · The protocol server does not ship in release builds.
  for (const s of p.iosApp) {
    const lines = s.code.split("\n");
    const stack: string[] = [];
    lines.forEach((line, i) => {
      const t = line.trim();
      if (/^#if\s+DEBUG\b/.test(t)) stack.push("debug");
      else if (t.startsWith("#if")) stack.push("other");
      else if (/^#(else|elseif)\b/.test(t) && stack.length) stack[stack.length - 1] = stack.at(-1) === "debug" ? "release" : stack.at(-1)!;
      else if (t.startsWith("#endif")) stack.pop();
      else if (!stack.includes("debug") && /\bimport\s+(?:NativeStepHostKit|CoreHost)\b|\bNativeStepHost\.|\bfixtureCore\(/.test(line)) {
        out.push({ rule: "R20", file: s.path, line: i + 1, message: "protocol server code outside #if DEBUG" });
      }
    });
  }
  const gradle = "android/app/build.gradle.kts";
  if (existsSync(join(root, gradle))) {
    readFileSync(join(root, gradle), "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (/^\s*(?:implementation|api|compileOnly|runtimeOnly|releaseImplementation)\s*\(.*(?:":host"|nativestep-kit-host|nativestep\.kit\.host)/.test(line)) {
          out.push({ rule: "R20", file: gradle, line: i + 1, message: "the protocol server reaches release builds; use debugImplementation" });
        }
      });
  }
  const hostPackage = new RegExp(`^[ \\t]*import[ \\t]+(?:dev\\.nativestep\\.kit\\.host|${androidPackage.replaceAll(".", "\\.")}\\.host)\\.`, "gm");
  for (const s of p.androidApp) {
    for (const m of s.code.matchAll(hostPackage)) add("R20", s, m.index, "src/main uses the host; only src/debug may");
  }
  return out;
}

interface NodeInfo {
  source: Source;
  index: number;
  actions: Set<string>;
}

/** Node names and their actions, per top-level declaration (an extension or a class). */
function nodes(sources: Source[], declaration: RegExp, name: RegExp): Map<string, NodeInfo> {
  const found = new Map<string, NodeInfo>();
  for (const s of sources) {
    const starts = [...s.code.matchAll(declaration)].map((m) => m.index!);
    starts.forEach((start, i) => {
      const block = s.code.slice(start, starts[i + 1] ?? s.code.length);
      const m = block.match(name);
      if (!m) return;
      const node = found.get(m[1]) ?? { source: s, index: start + m.index!, actions: new Set<string>() };
      for (const a of block.matchAll(/\bNodeAction\(\s*"([^"]+)"/g)) node.actions.add(a[1]);
      found.set(m[1], node);
    });
  }
  return found;
}

interface ServiceInfo {
  type: string;
  source: Source;
  index: number;
  methods?: Map<string, { source: Source; index: number; params: string[] }>;
}

/** The fields of `Services` and the methods of each service's protocol or interface. */
function services(
  sources: Source[],
  holder: RegExp,
  field: RegExp,
  keyword: string,
  param: (p: string) => string,
): Map<string, ServiceInfo> {
  const found = new Map<string, ServiceInfo>();
  for (const s of sources) {
    const h = s.code.match(holder);
    if (!h) continue;
    const open = s.code.indexOf(keyword === "protocol" ? "{" : "(", h.index!);
    const body = balanced(s.code, open);
    for (const m of body.matchAll(field)) found.set(m[1], { type: m[2], source: s, index: open + 1 + m.index! });
  }
  for (const svc of found.values()) {
    for (const s of sources) {
      const decl = s.code.match(new RegExp(`\\b${keyword}\\s+${svc.type}\\b`));
      if (!decl) continue;
      const open = s.code.indexOf("{", decl.index!);
      const body = balanced(s.code, open);
      svc.methods = new Map();
      for (const m of body.matchAll(/\bfunc\s+(\w+)\s*(?:<[^>]*>)?\s*\(|\bfun\s+(\w+)\s*\(/g)) {
        const paren = open + 1 + m.index! + m[0].length - 1; // body starts after the brace
        const params = splitTopLevel(balanced(s.code, paren)).map(param).filter(Boolean);
        svc.methods.set(m[1] ?? m[2], { source: s, index: paren, params });
      }
    }
  }
  return found;
}

/** `label name: Type` → name; `name: Type` → name. */
function swiftParam(p: string): string {
  const words = p.split(":")[0].trim().split(/\s+/);
  return words.at(-1) ?? "";
}

/** `vararg name: Type = x` → name. */
function kotlinParam(p: string): string {
  return p.split(":")[0].trim().split(/\s+/).at(-1) ?? "";
}

/** The text inside the bracket at `open`, up to its matching close. */
function balanced(text: string, open: number): string {
  const pairs: Record<string, string> = { "(": ")", "{": "}", "[": "]", "<": ">" };
  const close = pairs[text[open]];
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === text[open]) depth++;
    else if (text[i] === close && --depth === 0) return text.slice(open + 1, i);
  }
  return text.slice(open + 1);
}

function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if ("([{<".includes(text[i])) depth++;
    else if (")]}>".includes(text[i]) && text[i - 1] !== "-") depth--;
    else if (text[i] === "," && depth === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  if (text.slice(start).trim()) parts.push(text.slice(start));
  return parts;
}

function read(root: string, dir: string, ext: string): Source[] {
  const out: Source[] = [];
  const walk = (d: string) => {
    if (!existsSync(d)) return;
    for (const name of readdirSync(d)) {
      if (SKIP.has(name)) continue;
      const path = join(d, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith(ext)) {
        const text = readFileSync(path, "utf8");
        out.push({ path: relative(root, path), code: blank(text, false), bare: blank(text, true) });
      }
    }
  };
  walk(join(root, dir));
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

/** Blanks comments (and strings when asked) with spaces, keeping line numbers and offsets. */
function blank(text: string, strings: boolean): string {
  let out = "";
  let i = 0;
  const spaces = (s: string) => s.replace(/[^\n]/g, " ");
  while (i < text.length) {
    if (text.startsWith("//", i)) {
      const end = text.indexOf("\n", i);
      const e = end < 0 ? text.length : end;
      out += spaces(text.slice(i, e));
      i = e;
    } else if (text.startsWith("/*", i)) {
      const end = text.indexOf("*/", i + 2);
      const e = end < 0 ? text.length : end + 2;
      out += spaces(text.slice(i, e));
      i = e;
    } else if (text[i] === '"') {
      const quote = text.startsWith('"""', i) ? '"""' : '"';
      let j = i + quote.length;
      while (j < text.length && !text.startsWith(quote, j) && (quote.length === 3 || text[j] !== "\n")) j += text[j] === "\\" ? 2 : 1;
      const e = Math.min(text.length, j + quote.length);
      const literal = text.slice(i, e);
      out += strings ? quote + spaces(literal.slice(quote.length, literal.length - quote.length)) + quote : literal;
      i = e;
    } else out += text[i++];
  }
  return out;
}

function lineOf(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (text[i] === "\n") line++;
  return line;
}
