// `nativestep doctor` (COMPONENTS.md §1): checks the machine and the project before the first command fails.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { type Args, type Project, loadProject, sh, UsageError } from "./config.ts";
import { KITS_VERSION } from "./kits.ts";

export interface Check {
  level: "ok" | "warn" | "fail";
  what: string;
  detail: string;
}

const MIN_BUN = "1.4.4";

/** a < b for dotted versions. */
export function older(a: string, b: string): boolean {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) < (pb[i] ?? 0);
  }
  return false;
}

function has(command: string): boolean {
  return sh(`command -v ${command}`, process.cwd()).ok;
}

/** Flutter is needed while a Flutter app is the reference, and may be before a project exists. */
export function flutterNeed(project: Project | undefined): Check["level"] | undefined {
  if (!project) return "warn";
  return Object.values(project.config.targets).some((t) => t.role === "reference") ? "fail" : undefined;
}

/** Checks that read only the project, not the machine. */
export function projectChecks(project: Project): Check[] {
  const kits = project.config.kits;
  return [
    kits === KITS_VERSION
      ? { level: "ok", what: "kits", detail: kits }
      : { level: "warn", what: "kits", detail: `project has ${kits}, this nativestep has ${KITS_VERSION}: nativestep kits update` },
  ];
}

export function checks(project: Project | undefined): Check[] {
  const out: Check[] = [];
  const add = (level: Check["level"], what: string, detail: string) => out.push({ level, what, detail });

  add(older(Bun.version, MIN_BUN) ? "fail" : "ok", "bun", older(Bun.version, MIN_BUN) ? `${Bun.version}; nativestep test needs ${MIN_BUN} or later` : Bun.version);

  if (!has("xcrun")) add("fail", "xcode", "xcrun not found; install Xcode and run xcode-select --install");
  else {
    const booted = sh("xcrun simctl list devices booted", process.cwd()).output.split("\n").filter((l) => l.includes("(Booted)"));
    add(booted.length ? "ok" : "warn", "ios simulator", booted.length ? booted.map((l) => l.trim().replace(/\s*\(Booted\)\s*$/, "")).join(", ") : "none booted; device runs need one: xcrun simctl boot <device>");
  }
  add(has("xcodegen") ? "ok" : "fail", "xcodegen", has("xcodegen") ? "found" : "not found; brew install xcodegen");

  const java = process.env.JAVA_HOME;
  if (!java) add("fail", "JAVA_HOME", 'not set; Android Studio\'s JDK works: export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"');
  else add(existsSync(join(java, "bin/java")) ? "ok" : "fail", "JAVA_HOME", existsSync(join(java, "bin/java")) ? java : `${java} has no bin/java`);
  if (!has("adb")) add("warn", "android emulator", "adb not found; add Android SDK platform-tools to PATH for device runs");
  else {
    const devices = sh("adb devices", process.cwd()).output.split("\n").slice(1).filter((l) => /\tdevice$/.test(l));
    add(devices.length ? "ok" : "warn", "android emulator", devices.length ? devices.map((l) => l.split("\t")[0]).join(", ") : "none running; device runs need one: emulator -avd <name>");
  }

  const need = flutterNeed(project);
  if (need) add(has("flutter") ? "ok" : need, "flutter", has("flutter") ? "found" : "not found; only a migration needs it");
  return project ? [...out, ...projectChecks(project)] : out;
}

export function doctor(args: Args): number {
  let project: Project | undefined;
  try {
    project = loadProject();
  } catch (e) {
    if (!(e instanceof UsageError)) throw e;
  }
  const list = checks(project);
  if (args.flags.json) console.log(JSON.stringify(list, null, 2));
  else for (const c of list) console.log(`${c.level.padEnd(5)} ${c.what.padEnd(17)} ${c.detail}`);
  return list.some((c) => c.level === "fail") ? 1 : 0;
}
