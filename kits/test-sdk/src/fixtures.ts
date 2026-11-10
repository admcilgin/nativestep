import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface FixtureEntry {
  args?: Record<string, unknown>;
  result?: unknown;
  error?: { code: string; message?: string };
  delayMs?: number;
  times?: number;
}

export interface FixtureDocument {
  services: Record<string, Record<string, FixtureEntry[]>>;
  flags: Record<string, unknown>;
}

/** PROTOCOL.md §7: a later document's entries go in front of earlier ones; flags merge shallowly. */
export function mergeFixtures(docs: Partial<FixtureDocument>[]): FixtureDocument {
  const out: FixtureDocument = { services: {}, flags: {} };
  for (const doc of docs) {
    for (const [service, methods] of Object.entries(doc.services ?? {})) {
      const target = (out.services[service] ??= {});
      for (const [method, entries] of Object.entries(methods)) {
        target[method] = [...entries, ...(target[method] ?? [])];
      }
    }
    Object.assign(out.flags, doc.flags ?? {});
  }
  return out;
}

export function loadFixtures(dir: string, names: string[]): FixtureDocument {
  return mergeFixtures(
    names.map((name) => {
      const file = join(dir, name.endsWith(".json") ? name : `${name}.json`);
      try {
        return JSON.parse(readFileSync(file, "utf8"));
      } catch (e) {
        throw new Error(`cannot read fixture ${file}: ${(e as Error).message}`);
      }
    }),
  );
}
