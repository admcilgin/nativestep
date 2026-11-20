// `nativestep kits update` (COMPONENTS.md §1): brings a project's copied kits in line with this repo's.
import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type Args, loadProject, UsageError } from "./config.ts";
import { KITS, REPO, refuseSymlink, SKIP } from "./init.ts";

export const KITS_VERSION = readFileSync(join(REPO, "kits/VERSION"), "utf8").trim();

export interface Change {
  kind: "add" | "update" | "remove";
  path: string;
}

/** Files under `dir`, relative to it, without build output. */
function files(dir: string, prefix = ""): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path, join(prefix, name)) : [join(prefix, name)];
  });
}

/** What makes `dest` equal to `src`. With `write`, does it. Build output in `dest` is left alone. */
export function sync(src: string, dest: string, write: boolean): Change[] {
  refuseSymlink(dest);
  const want = files(src).sort();
  const have = new Set(files(dest).sort());
  const changes: Change[] = [];
  for (const path of want) {
    const from = readFileSync(join(src, path));
    if (!have.has(path)) changes.push({ kind: "add", path });
    else if (!from.equals(readFileSync(join(dest, path)))) changes.push({ kind: "update", path });
    else continue;
    if (write) {
      mkdirSync(join(dest, path, ".."), { recursive: true });
      copyFileSync(join(src, path), join(dest, path));
    }
  }
  const wanted = new Set(want);
  for (const path of have) {
    if (wanted.has(path)) continue;
    changes.push({ kind: "remove", path });
    if (write) rmSync(join(dest, path));
  }
  return changes;
}

export function kits(args: Args): number {
  const [sub] = args.positional;
  if (sub !== "update") throw new UsageError("usage: nativestep kits update [--dry-run]");
  const project = loadProject();
  const write = args.flags["dry-run"] !== true;
  const linked = join(project.root, "kits");
  // Copying through a link would write into the kits it points at (Basket's links to this repo's own).
  if (existsSync(linked) && lstatSync(linked).isSymbolicLink()) {
    throw new UsageError(`${linked} links to ${realpathSync(linked)}; it has no copy to update`);
  }
  // Local edits in kits/ are overwritten: the kits are the repo's, and a fix belongs there.
  const changes = KITS.flatMap((kit) =>
    sync(join(REPO, "kits", kit), join(project.root, "kits", kit), write).map((c) => ({ ...c, path: join("kits", kit, c.path) })),
  );
  for (const c of changes) console.log(`${c.kind.padEnd(6)} ${c.path}`);
  const from = project.config.kits;
  if (write && from !== KITS_VERSION) {
    const file = join(project.root, "nativestep.json");
    const config = JSON.parse(readFileSync(file, "utf8"));
    config.kits = KITS_VERSION;
    writeFileSync(file, JSON.stringify(config, null, 2) + "\n");
  }
  const verb = write ? "updated" : "would update";
  console.log(
    changes.length || from !== KITS_VERSION ? `${verb} ${changes.length} files; kits ${from} → ${KITS_VERSION}` : `kits ${from}: already current`,
  );
  return 0;
}
