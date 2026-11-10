import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export interface DeviceConfig {
  /** Builds and installs the debug app; runs once per command. */
  build?: string;
  /** Launches the app and opens ports; runs before connecting. */
  setup?: string;
  connect?: string;
  /** Screenshot command; `{out}` is replaced with the file path. */
  screenshot?: string;
}

export interface Target {
  role?: string;
  /** The Flutter project, relative to nativestep.json; `nativestep scan` reads it. */
  path?: string;
  build?: string;
  headless?: string;
  device?: DeviceConfig;
}

export interface Config {
  protocol: number;
  kits: string;
  app: { name: string; iosBundleId: string; androidPackage: string };
  paths?: { tests?: string; fixtures?: string };
  targets: Record<string, Target>;
}

export class UsageError extends Error {}

export interface Project {
  root: string;
  config: Config;
  testsDir: string;
  fixturesDir: string;
  stateDir: string;
}

export function loadProject(start = process.cwd()): Project {
  let root = resolve(start);
  while (!existsSync(join(root, "nativestep.json"))) {
    if (root === dirname(root)) throw new UsageError("nativestep.json not found in this directory or any parent");
    root = dirname(root);
  }
  const config: Config = JSON.parse(readFileSync(join(root, "nativestep.json"), "utf8"));
  return {
    root,
    config,
    testsDir: resolve(root, config.paths?.tests ?? "spec/tests"),
    fixturesDir: resolve(root, config.paths?.fixtures ?? "spec/fixtures"),
    stateDir: join(root, ".nativestep"),
  };
}

export function target(project: Project, name: string): Target {
  const t = project.config.targets[name];
  if (!t) throw new UsageError(`unknown target ${name}; nativestep.json has: ${Object.keys(project.config.targets).join(", ")}`);
  return t;
}

export type Mode = "headless" | "device";

/** Headless unless `--device` was given or the target has no headless host (the Flutter reference). */
export function modeFor(t: Target, device: boolean): Mode {
  if (!device && t.headless) return "headless";
  if (t.device?.connect) return "device";
  throw new UsageError(device ? "this target has no device.connect in nativestep.json" : "this target has neither headless nor device.connect");
}

export function sh(command: string, cwd: string): { ok: boolean; output: string } {
  const r = Bun.spawnSync(["sh", "-c", command], { cwd, stdout: "pipe", stderr: "pipe" });
  return { ok: r.exitCode === 0, output: r.stdout.toString() + r.stderr.toString() };
}

/** Runs the build (and, for devices, setup) commands of a target. Returns false and prints output on failure. */
export function prepare(project: Project, name: string, mode: Mode, { setup = true } = {}): boolean {
  const t = target(project, name);
  const steps: [string, string | undefined][] =
    mode === "headless" ? [["build", t.build]] : [["device.build", t.device?.build], ...(setup ? [["device.setup", t.device?.setup] as [string, string | undefined]] : [])];
  for (const [label, command] of steps) {
    if (!command) continue;
    const r = sh(command, project.root);
    if (!r.ok) {
      console.error(`${name}: ${label} failed: ${command}\n${r.output}`);
      return false;
    }
  }
  return true;
}

/** Environment the test SDK reads to reach a target (COMPONENTS.md §2). */
export function targetEnv(project: Project, name: string, mode: Mode): Record<string, string> {
  const t = target(project, name);
  return {
    NATIVESTEP_TARGET: name,
    NATIVESTEP_ROOT: project.root,
    NATIVESTEP_FIXTURES: project.fixturesDir,
    ...(mode === "headless" ? { NATIVESTEP_HEADLESS: t.headless! } : { NATIVESTEP_CONNECT: t.device!.connect! }),
  };
}

export interface Args {
  positional: string[];
  flags: Record<string, string | true>;
}

/** `--name value`, `--flag`, and positional arguments. `booleans` lists flags that take no value. */
export function parseArgs(args: string[], booleans: string[]): Args {
  const out: Args = { positional: [], flags: {} };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith("--")) out.positional.push(a);
    else if (booleans.includes(a.slice(2))) out.flags[a.slice(2)] = true;
    else if (i + 1 < args.length) out.flags[a.slice(2)] = args[++i];
    else throw new UsageError(`${a} needs a value`);
  }
  return out;
}

export function flag(args: Args, name: string): string | undefined {
  const v = args.flags[name];
  return typeof v === "string" ? v : undefined;
}
