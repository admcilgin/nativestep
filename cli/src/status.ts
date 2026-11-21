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
type Gate = "pass" | "skipped" | "pending" | "fail" | "unknown";
interface Checkpoint {
  id: string;
  title?: string;
  status?: string;
  /** G0–G5 from the checkpoint's evidence README, when it has one. */
  gates?: Record<string, Gate>;
}
interface Feature {
  name: string;
  dependsOn?: string[];
  checkpoints?: Checkpoint[];
}
export interface Status {
  app: string;
  screens: { total: number; migrated: number; inProgress: number; pending: number; list: Screen[] };
  features: { total: number; done: number; checkpoints: { total: number; done: number }; list: Feature[] };
  /** The checkpoint to work on: in progress, or the first planned one whose feature's dependencies are done. */
  next?: { feature: string; checkpoint: string; title?: string; status: string };
  /** Done checkpoints with a gate that did not pass (pending, failed, or no result line). */
  attention: string[];
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
      for (const c of cps) console.log(`  ${c.id.padEnd(6)} ${(c.status ?? "planned").padEnd(12)} ${gateLine(c.gates).padEnd(20)} ${c.title ?? ""}`);
    }
    return 0;
  }
  const { screens: sc, features: fe } = s;
  console.log(`${s.app}`);
  console.log(`  screens   ${sc.migrated}/${sc.total} done (${pct(sc.migrated, sc.total)}), ${sc.inProgress} in progress, ${sc.pending} pending`);
  console.log(`  features  ${fe.done}/${fe.total} done, checkpoints ${fe.checkpoints.done}/${fe.checkpoints.total}`);
  if (s.next) console.log(`  next      ${s.next.feature} ${s.next.checkpoint} (${s.next.status})${s.next.title ? `: ${s.next.title}` : ""}`);
  if (s.attention.length) console.log(`  attention ${s.attention.length} done checkpoints have a gate without a pass: ${s.attention.slice(0, 5).join(", ")}`);
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
  for (const f of features) for (const c of f.checkpoints ?? []) c.gates = gatesOf(root, f.name, c.id);
  const checkpoints = features.flatMap((f) => f.checkpoints ?? []);
  const featureDone = (f: Feature) => Boolean(f.checkpoints?.length && f.checkpoints.every((c) => c.status === "done"));
  const byName = new Map(features.map((f) => [f.name, f]));
  const ready = (f: Feature) => (f.dependsOn ?? []).every((d) => byName.get(d) && featureDone(byName.get(d)!));
  const pick = (f: Feature | undefined, status: string) => {
    const c = f?.checkpoints?.find((c) => (c.status ?? "planned") === status);
    return f && c ? { feature: f.name, checkpoint: c.id, title: c.title, status } : undefined;
  };
  const next =
    pick(features.find((f) => f.checkpoints?.some((c) => c.status === "in_progress")), "in_progress") ??
    pick(features.find((f) => ready(f) && f.checkpoints?.some((c) => (c.status ?? "planned") === "planned")), "planned");
  const attention = features.flatMap((f) =>
    (f.checkpoints ?? []).flatMap((c) => {
      const open = Object.entries(c.gates ?? {}).filter(([, g]) => g !== "pass" && g !== "skipped").map(([name]) => name);
      return c.status === "done" && open.length ? [`${f.name}/${c.id} (${open.join(" ")})`] : [];
    }),
  );
  const count = (status: string) => screens.filter((x) => (x.status ?? "pending") === status).length;
  // An app started without a migration marks built screens `done`.
  const built = count("migrated") + count("done");

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
    screens: { total: screens.length, migrated: built, inProgress: count("in_progress"), pending: count("pending"), list: screens },
    features: {
      total: features.length,
      // A feature is done when it has checkpoints and all of them are done.
      done: features.filter(featureDone).length,
      checkpoints: { total: checkpoints.length, done: checkpoints.filter((c) => c.status === "done").length },
      list: features,
    },
    next,
    attention,
    tests,
  };
}

/** The evidence folder of a checkpoint: `<feature>-<cp>`, or one shared with neighbours (`auth-cp1-cp2`). */
function evidenceDir(root: string, feature: string, cp: string): string | undefined {
  const dir = join(root, "spec/evidence");
  if (!existsSync(dir)) return undefined;
  const name = readdirSync(dir).find((d) => d.startsWith(`${feature}-`) && d.slice(feature.length + 1).split("-").includes(cp));
  return name && join(dir, name);
}

/** Each `## G<n> · …` section's `Result:` line (step-feature §6). A section without one is `unknown`. */
export function gatesOf(root: string, feature: string, cp: string): Record<string, Gate> | undefined {
  const dir = evidenceDir(root, feature, cp);
  const readme = dir && join(dir, "README.md");
  if (!readme || !existsSync(readme)) return undefined;
  const gates: Record<string, Gate> = {};
  for (const section of readFileSync(readme, "utf8").split(/^## /m).slice(1)) {
    const gate = section.match(/^(G[0-5])\b/)?.[1];
    if (!gate) continue;
    const result = section.match(/^Result:\s*(\w+)/m)?.[1]?.toLowerCase();
    gates[gate] = result === "pass" || result === "skipped" || result === "pending" || result === "fail" ? result : "unknown";
  }
  return gates;
}

function gateLine(gates: Record<string, Gate> | undefined): string {
  if (!gates) return "";
  const mark = { pass: "✓", skipped: "-", pending: "…", fail: "✗", unknown: "?" };
  return ["G0", "G1", "G2", "G3", "G4", "G5"].map((g) => `${g.slice(1)}${gates[g] ? mark[gates[g]!] : " "}`).join(" ");
}
