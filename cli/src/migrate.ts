// `nativestep migrate finish` (COMPONENTS.md §1, §5): retires the Flutter reference once the migration is done.
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { type Args, loadProject, UsageError } from "./config.ts";

interface Inventory {
  features?: { name: string; checkpoints?: { id: string; status?: string }[] }[];
}

/** The two marked changes step-reference made to the Flutter repo, removed from the file's text. */
export function unbindPubspec(text: string): string | undefined {
  const lines = text.split("\n");
  const marker = lines.findIndex((l) => /^\s*#\s*nativestep:/.test(l));
  if (marker < 0) return undefined;
  let end = marker + 1;
  const indent = (l: string) => l.length - l.trimStart().length;
  if (/^\s*nativestep_binding:/.test(lines[end] ?? "")) {
    const own = indent(lines[end]!);
    end++;
    while (end < lines.length && lines[end]!.trim() && indent(lines[end]!) > own) end++;
  }
  lines.splice(marker, end - marker);
  return lines.join("\n");
}

export function unbindMain(text: string): string | undefined {
  const lines = text.split("\n");
  const kept = lines.filter((l) => !l.includes("startNativeStep()") && !l.includes("package:nativestep_binding/"));
  return kept.length === lines.length ? undefined : kept.join("\n");
}

export function migrate(args: Args): number {
  const [sub] = args.positional;
  if (sub !== "finish") throw new UsageError("usage: nativestep migrate finish [--dry-run] [--force]");
  const project = loadProject();
  const write = args.flags["dry-run"] !== true;
  const say = (line: string) => console.log(`${write ? "" : "would "}${line}`);

  const entry = Object.entries(project.config.targets).find(([, t]) => t.role === "reference");
  if (!entry) throw new UsageError("nativestep.json has no reference target: the migration is finished, or the project started without one");
  const [name, reference] = entry;

  const inventoryFile = join(project.root, "spec/inventory.json");
  const inventory: Inventory = existsSync(inventoryFile) ? JSON.parse(readFileSync(inventoryFile, "utf8")) : {};
  const open = (inventory.features ?? []).flatMap((f) => (f.checkpoints ?? []).filter((c) => c.status !== "done").map((c) => `${f.name}/${c.id}`));
  if (open.length && args.flags.force !== true) {
    throw new UsageError(`${open.length} checkpoints are not done (${open.slice(0, 5).join(", ")}${open.length > 5 ? ", …" : ""}); finish them or pass --force`);
  }

  // 1. The Flutter repo loses its two marked lines, so it builds without the binding the next step removes.
  const flutter = reference.path ? resolve(project.root, reference.path) : undefined;
  const manual: string[] = [];
  for (const [file, unbind] of [["pubspec.yaml", unbindPubspec], ["lib/main.dart", unbindMain]] as const) {
    const path = flutter && join(flutter, file);
    const text = path && existsSync(path) ? readFileSync(path, "utf8") : undefined;
    const changed = text === undefined ? undefined : unbind(text);
    if (changed === undefined) {
      manual.push(path ?? file);
      continue;
    }
    say(`edit   ${relative(project.root, path!)} (nativestep binding removed)`);
    if (write) writeFileSync(path!, changed);
  }

  // 2. The native project forgets the reference; git keeps the binding and the profile's history.
  say(`remove target ${name} from nativestep.json`);
  if (write) {
    const file = join(project.root, "nativestep.json");
    const config = JSON.parse(readFileSync(file, "utf8"));
    delete config.targets[name];
    writeFileSync(file, JSON.stringify(config, null, 2) + "\n");
  }
  const adapter = join(project.root, "spec/adapters", name);
  if (existsSync(adapter)) {
    say(`remove spec/adapters/${name}/`);
    if (write) rmSync(adapter, { recursive: true });
  }
  const profile = join(project.root, "spec/profile.md");
  if (existsSync(profile)) {
    say("move   spec/profile.md → spec/archive/profile.md");
    if (write) {
      mkdirSync(join(project.root, "spec/archive"), { recursive: true });
      renameSync(profile, join(project.root, "spec/archive/profile.md"));
    }
  }
  const memory = join(project.root, "spec/memory.md");
  if (write && existsSync(memory)) {
    const day = new Date().toISOString().slice(0, 10);
    const note = `\n## ${day} · Migration finished (nativestep migrate finish)\n\n- The \`${name}\` reference target is gone. New behavior comes from \`docs/features/\`; G0 is the engineer approving the tests against them, and G3 compares with \`docs/design/\` (COMPONENTS.md §9).\n`;
    writeFileSync(memory, readFileSync(memory, "utf8").trimEnd() + "\n" + note);
  }

  for (const path of manual) console.log(`check  ${path}: no nativestep binding lines found; remove them by hand if they are there`);
  // The startup line used kDebugMode; dart fix drops the import only if nothing else in main.dart needs it.
  if (flutter) console.log(`next:\n  (cd '${flutter}' && flutter pub get && dart fix --apply --code=unused_import lib/main.dart && flutter analyze)\n  commit both repos`);
  return 0;
}
