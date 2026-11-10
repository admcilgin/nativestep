// `nativestep test` and `nativestep shot` (COMPONENTS.md §1).
import { existsSync, mkdirSync, realpathSync, rmSync, symlinkSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { type Args, flag, loadProject, type Mode, modeFor, prepare, type Project, target, targetEnv, UsageError } from "./config.ts";

/** Lets spec files import `@nativestep/test` from the project's vendored kit, without an install step. */
function linkTestSdk(project: Project) {
  if (!existsSync(project.testsDir)) throw new UsageError(`missing tests directory ${project.testsDir}`);
  const sdk = join(project.root, "kits/test-sdk");
  if (!existsSync(sdk)) throw new UsageError(`missing ${sdk}`);
  // Bun resolves imports from a file's real path, so the link goes next to the real tests directory.
  const link = join(dirname(realpathSync(project.testsDir)), "node_modules/@nativestep/test");
  const want = realpathSync(sdk);
  if (existsSync(link) && realpathSync(link) === want) return;
  mkdirSync(dirname(link), { recursive: true });
  rmSync(link, { force: true, recursive: true });
  symlinkSync(want, link, "dir");
}

function targets(project: Project, args: Args): string[] {
  const names = (flag(args, "target") ?? "").split(",").filter(Boolean);
  if (!names.length) return Object.keys(project.config.targets);
  for (const n of names) target(project, n);
  return names;
}

interface Run {
  name: string;
  mode: Mode;
  bunArgs: string[];
  env?: Record<string, string>;
  report: string;
}

function runAll(project: Project, runs: Run[]): number {
  linkTestSdk(project);
  const summary: string[] = [];
  let failed = false;
  for (const run of runs) {
    console.log(`\n── ${run.name} (${run.mode}) ──`);
    let ok = prepare(project, run.name, run.mode);
    if (ok) {
      const started = performance.now();
      const r = Bun.spawnSync(["bun", "test", ...run.bunArgs], {
        cwd: project.testsDir,
        env: { ...process.env, ...targetEnv(project, run.name, run.mode), ...run.env },
        stdout: "inherit",
        stderr: "inherit",
      });
      ok = r.exitCode === 0;
      summary.push(`${run.name}: ${ok ? "pass" : "FAIL"} (${Math.round(performance.now() - started)} ms)${run.report}`);
    } else {
      summary.push(`${run.name}: FAIL (not started)`);
    }
    failed ||= !ok;
  }
  console.log(`\n${summary.join("\n")}`);
  return failed ? 1 : 0;
}

export function test(args: Args): number {
  const project = loadProject();
  const results = join(project.stateDir, "results");
  mkdirSync(results, { recursive: true });
  const filter = args.positional[0];
  return runAll(
    project,
    targets(project, args).map((name) => ({
      name,
      mode: modeFor(target(project, name), args.flags.device === true),
      bunArgs: [...(filter ? [filter] : []), "--reporter=junit", `--reporter-outfile=${join(results, `${name}.xml`)}`],
      report: "",
    })),
  );
}

/** Replays a test on device targets and saves a screenshot of each target at the test's final state. */
export function shot(args: Args): number {
  const [file] = args.positional;
  if (!file) throw new UsageError("usage: nativestep shot <test-file> [--name <test>] --target a,b [--out <dir>]");
  const project = loadProject();
  const testFile = resolve(file);
  if (!existsSync(testFile)) throw new UsageError(`no such test file ${file}`);
  const out = resolve(flag(args, "out") ?? join(project.stateDir, "shots"));
  mkdirSync(out, { recursive: true });
  const testName = flag(args, "name");
  const stem = basename(testFile).replace(/\.test\.ts$/, "") + (testName ? `-${testName.replace(/\W+/g, "-").toLowerCase()}` : "");
  return runAll(
    project,
    targets(project, args).map((name) => {
      const t = target(project, name);
      if (!t.device?.screenshot) throw new UsageError(`target ${name} has no device.screenshot in nativestep.json`);
      const png = join(out, `${stem}-${name}.png`);
      return {
        name,
        mode: "device" as const,
        bunArgs: [testFile, ...(testName ? ["-t", testName] : [])],
        env: { NATIVESTEP_SHOT_CMD: t.device.screenshot, NATIVESTEP_SHOT_OUT: png },
        report: ` → ${png}`,
      };
    }),
  );
}
