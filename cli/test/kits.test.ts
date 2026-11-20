import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sync } from "../src/kits.ts";

function tree(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), "kits-"));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(dir, path, ".."), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}

test("sync adds, updates and removes kit files, and leaves build output alone", () => {
  const src = tree({ "a.swift": "new", "Sources/b.swift": "b", "c.swift": "c" });
  const dest = tree({ "a.swift": "old", "Sources/b.swift": "b", "gone.swift": "x", ".build/cache": "keep" });
  const dry = sync(src, dest, false);
  expect(dry).toEqual([
    { kind: "update", path: "a.swift" },
    { kind: "add", path: "c.swift" },
    { kind: "remove", path: "gone.swift" },
  ]);
  expect(readFileSync(join(dest, "a.swift"), "utf8")).toBe("old");
  expect(sync(src, dest, true)).toEqual(dry);
  expect(readFileSync(join(dest, "a.swift"), "utf8")).toBe("new");
  expect(existsSync(join(dest, "gone.swift"))).toBe(false);
  expect(existsSync(join(dest, ".build/cache"))).toBe(true);
  expect(sync(src, dest, false)).toEqual([]);
});
