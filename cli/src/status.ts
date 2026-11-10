// `nativestep status` (COMPONENTS.md §1): progress from spec/inventory.json and the latest test results.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { type Args, loadProject } from "./config.ts";

interface Screen {
  name: string;
  feature?: string;
  reference?: string;
  status?: string;
}
interface Feature {
  name: string;
  checkpoints?: { id: string; title?: string; status?: string }[];
}
export interface Status {
  app: string;
  screens: { total: number; migrated: number; inProgress: number; pending: number; list: Screen[] };
  features: { total: number; done: number; checkpoints: { total: number; done: number }; list: Feature[] };
  tests: Record<string, { tests: number; failures: number; skipped: number; at: string }>;
}

export function status(args: Args): number {
  const project = loadProject();
  const s = statusOf(project.root, project.config.app.name);
  if (args.flags.json) {
    console.log(JSON.stringify(s, null, 2));
    return 0;
  }
  const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : "—");
  if (args.flags.screens) {
    for (const x of s.screens.list) console.log(`${x.name.padEnd(24)} ${(x.feature ?? "").padEnd(16)} ${(x.reference ?? "").padEnd(10)} ${x.status ?? "pending"}`);
    return 0;
  }
  if (args.flags.features) {
    for (const f of s.features.list) {
      const cps = f.checkpoints ?? [];
      console.log(`${f.name}  ${cps.filter((c) => c.status === "done").length}/${cps.length} checkpoints`);
      for (const c of cps) console.log(`  ${c.id.padEnd(6)} ${(c.status ?? "planned").padEnd(12)} ${c.title ?? ""}`);
    }
    return 0;
  }
  const { screens: sc, features: fe } = s;
  console.log(`${s.app}`);
  console.log(`  screens   ${sc.migrated}/${sc.total} migrated (${pct(sc.migrated, sc.total)}), ${sc.inProgress} in progress, ${sc.pending} pending`);
  console.log(`  features  ${fe.done}/${fe.total} done, checkpoints ${fe.checkpoints.done}/${fe.checkpoints.total}`);
  const runs = Object.entries(s.tests);
  if (!runs.length) console.log("  tests     no results yet; run nativestep test");
  for (const [t, r] of runs) {
    const pass = r.tests - r.failures - r.skipped;
    console.log(`  ${`tests ${t}`.padEnd(18)}${pass}/${r.tests} pass${r.failures ? `, ${r.failures} fail` : ""}  (${r.at})`);
  }
  return 0;
}

export function statusOf(root: string, app: string): Status {
  const file = join(root, "spec/inventory.json");
  const inventory = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  const screens: Screen[] = inventory.screens ?? [];
  const features: Feature[] = inventory.features ?? [];
  const checkpoints = features.flatMap((f) => f.checkpoints ?? []);
  const count = (status: string) => screens.filter((x) => (x.status ?? "pending") === status).length;

  const tests: Status["tests"] = {};
  const results = join(root, ".nativestep/results");
  for (const name of existsSync(results) ? readdirSync(results).filter((f) => f.endsWith(".xml")).sort() : []) {
    const xml = readFileSync(join(results, name), "utf8");
    const suites = xml.match(/<testsuites\b[^>]*>/)?.[0] ?? "";
    const attr = (key: string) => Number(suites.match(new RegExp(`\\b${key}="(\\d+)"`))?.[1] ?? 0);
    const at = statSync(join(results, name)).mtime;
    tests[name.slice(0, -4)] = {
      tests: attr("tests"),
      failures: attr("failures") + attr("errors"),
      skipped: attr("skipped"),
      at: `${at.toISOString().slice(0, 16).replace("T", " ")} UTC`,
    };
  }

  return {
    app,
    screens: { total: screens.length, migrated: count("migrated"), inProgress: count("in_progress"), pending: count("pending"), list: screens },
    features: {
      total: features.length,
      // A feature is done when it has checkpoints and all of them are done.
      done: features.filter((f) => f.checkpoints?.length && f.checkpoints.every((c) => c.status === "done")).length,
      checkpoints: { total: checkpoints.length, done: checkpoints.filter((c) => c.status === "done").length },
      list: features,
    },
    tests,
  };
}
