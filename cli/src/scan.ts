// `nativestep scan` (COMPONENTS.md §1): the raw facts that look the same in every Flutter project.
// It only reads the Flutter project; it writes spec/inventory.json `raw` and .nativestep/scan/imports.json.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, normalize, relative, resolve } from "node:path";
import { type Args, loadProject, UsageError } from "./config.ts";

export interface Raw {
  packages: { name: string; version: string; direct: boolean }[];
  dartFiles: number;
  assets: number;
  nativeCode: { path: string; channels: string[] }[];
}

const NATIVE = /\.(swift|m|mm|h|kt|java|c|cc|cpp)$/;
// Generated, vendored or build output; not code anyone wrote for the app.
const SKIP = new Set(["Pods", ".symlinks", "Flutter", "build", ".gradle", ".cxx", "DerivedData", "RunnerTests", ".dart_tool", "ephemeral"]);

export function scan(args: Args): number {
  const project = loadProject();
  const given = args.positional[0];
  const configured = project.config.targets.flutter?.path;
  if (!given && !configured) throw new UsageError("usage: nativestep scan [<flutter-path>]; or set targets.flutter.path in nativestep.json");
  const flutter = given ? resolve(given) : resolve(project.root, configured!);
  const { raw, imports } = scanFlutter(flutter);

  const file = join(project.root, "spec/inventory.json");
  const inventory = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { screens: [], features: [] };
  writeFileSync(file, JSON.stringify({ ...inventory, raw }, null, 2) + "\n");
  mkdirSync(join(project.stateDir, "scan"), { recursive: true });
  writeFileSync(join(project.stateDir, "scan/imports.json"), JSON.stringify(imports, null, 2) + "\n");

  if (args.flags.json) console.log(JSON.stringify(raw, null, 2));
  else {
    const direct = raw.packages.filter((p) => p.direct).length;
    const channels = new Set(raw.nativeCode.flatMap((n) => n.channels));
    console.log(`scanned ${relative(process.cwd(), flutter) || "."}`);
    console.log(`  packages     ${raw.packages.length} (${direct} direct)`);
    console.log(`  dart files   ${raw.dartFiles} under lib/`);
    console.log(`  assets       ${raw.assets}`);
    console.log(`  native code  ${raw.nativeCode.length} files, ${channels.size} channels${channels.size ? `: ${[...channels].join(", ")}` : ""}`);
    console.log(`wrote spec/inventory.json (raw) and .nativestep/scan/imports.json`);
  }
  return 0;
}

export function scanFlutter(dir: string): { raw: Raw; imports: Record<string, string[]> } {
  const pubspecPath = join(dir, "pubspec.yaml");
  if (!existsSync(pubspecPath)) throw new UsageError(`${dir} has no pubspec.yaml; not a Flutter project`);
  const pubspec = (Bun.YAML.parse(readFileSync(pubspecPath, "utf8")) ?? {}) as Record<string, any>;

  const lockPath = join(dir, "pubspec.lock");
  if (!existsSync(lockPath)) console.error("nativestep: no pubspec.lock; run `flutter pub get` for the package list");
  const lock = existsSync(lockPath) ? ((Bun.YAML.parse(readFileSync(lockPath, "utf8")) ?? {}) as Record<string, any>) : {};
  const packages = Object.entries((lock.packages ?? {}) as Record<string, any>)
    .map(([name, p]) => ({ name, version: String(p.version ?? ""), direct: String(p.dependency ?? "").startsWith("direct") }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const dart = files(join(dir, "lib"), (f) => f.endsWith(".dart"));
  const imports: Record<string, string[]> = {};
  for (const path of dart) {
    const rel = relative(dir, path);
    const text = readFileSync(path, "utf8");
    imports[rel] = [...text.matchAll(/^\s*(?:import|export|part)\s+['"]([^'"]+)['"]/gm)].map(([, uri]) => {
      if (uri.startsWith(`package:${pubspec.name}/`)) return `lib/${uri.slice(`package:${pubspec.name}/`.length)}`;
      if (/^(package|dart):/.test(uri)) return uri;
      return normalize(join(dirname(rel), uri));
    });
  }

  return {
    raw: { packages, dartFiles: dart.length, assets: countAssets(dir, pubspec.flutter ?? {}), nativeCode: nativeCode(dir) },
    imports,
  };
}

/** Files named in `flutter.assets` and `flutter.fonts`; a directory entry adds the files directly in it, as Flutter does. */
function countAssets(dir: string, flutter: Record<string, any>): number {
  const found = new Set<string>();
  for (const entry of flutter.assets ?? []) {
    const path = typeof entry === "string" ? entry : entry?.path;
    if (typeof path !== "string") continue;
    const full = join(dir, path);
    if (!existsSync(full)) continue;
    if (statSync(full).isDirectory()) {
      for (const f of readdirSync(full)) if (statSync(join(full, f)).isFile() && !f.startsWith(".")) found.add(join(path, f));
    } else found.add(normalize(path));
  }
  for (const family of flutter.fonts ?? []) {
    for (const font of family?.fonts ?? []) if (font?.asset && existsSync(join(dir, font.asset))) found.add(normalize(font.asset));
  }
  return found.size;
}

/** Native source under ios/ and android/, with the platform channel names each file opens. */
function nativeCode(dir: string): Raw["nativeCode"] {
  const out: Raw["nativeCode"] = [];
  for (const platform of ["ios", "android"]) {
    for (const path of files(join(dir, platform), (f) => NATIVE.test(f) && !f.includes("GeneratedPluginRegistrant"))) {
      const text = readFileSync(path, "utf8");
      const channels = new Set<string>();
      // A literal name: FlutterMethodChannel(name: "x"), MethodChannel(messenger, "x"), methodChannelWithName:@"x".
      for (const m of text.matchAll(/(?:Method|Event|BasicMessage)Channel\s*\(\s*(?:name:\s*)?(?:[\w.!?]+\s*,\s*)?(?:name:\s*)?"([^"]+)"|ChannelWithName:\s*@"([^"]+)"/g)) {
        channels.add(m[1] ?? m[2]);
      }
      // A named constant, when the file opens a channel at all: private val CHANNEL = "x".
      if (/(?:Method|Event|BasicMessage)Channel\b/.test(text)) {
        for (const m of text.matchAll(/\b(\w*[Cc][Hh][Aa][Nn][Nn][Ee][Ll]\w*)\s*(?::\s*String)?\s*=\s*@?"([^"]+)"/g)) channels.add(m[2]);
      }
      out.push({ path: relative(dir, path), channels: [...channels].sort() });
    }
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

function files(dir: string, keep: (name: string) => boolean): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name) || name.startsWith(".")) continue;
    const path = join(dir, name);
    const stat = statSync(path, { throwIfNoEntry: false });
    if (!stat) continue; // a dangling symlink
    if (stat.isDirectory()) out.push(...files(path, keep));
    else if (keep(name)) out.push(path);
  }
  return out.sort();
}
