import { expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unbindMain, unbindPubspec } from "../src/migrate.ts";

const MAIN = join(import.meta.dir, "../src/main.ts");

test("unbind removes exactly the lines step-reference added", () => {
  const pubspec = "dependencies:\n  http: ^1.0.0\n  # nativestep: reference-app binding (remove after the migration)\n  nativestep_binding:\n    path: ../x/spec/adapters/flutter/nativestep_binding\n  intl: any\n";
  expect(unbindPubspec(pubspec)).toBe("dependencies:\n  http: ^1.0.0\n  intl: any\n");
  expect(unbindPubspec("dependencies:\n  http: any\n")).toBeUndefined();
  const main = "import 'package:nativestep_binding/nativestep_binding.dart';\nvoid main() {\n  if (kDebugMode && const bool.fromEnvironment('NATIVESTEP')) return startNativeStep();\n  runApp(App());\n}\n";
  expect(unbindMain(main)).toBe("void main() {\n  runApp(App());\n}\n");
});

function project(done: boolean) {
  const dir = mkdtempSync(join(tmpdir(), "migrate-"));
  const files: Record<string, string> = {
    "native/nativestep.json": JSON.stringify({ protocol: 1, kits: "0", app: { name: "A" }, targets: { flutter: { role: "reference", path: "../flutter" }, ios: {} } }),
    "native/spec/inventory.json": JSON.stringify({ features: [{ name: "f", checkpoints: [{ id: "cp1", status: done ? "done" : "planned" }] }] }),
    "native/spec/profile.md": "# profile\n",
    "native/spec/memory.md": "# memory\n",
    "native/spec/adapters/flutter/nativestep_binding/pubspec.yaml": "name: nativestep_binding\n",
    "flutter/pubspec.yaml": "dependencies:\n  # nativestep: binding\n  nativestep_binding:\n    path: ../native/spec/adapters/flutter/nativestep_binding\n",
    "flutter/lib/main.dart": "void main() {\n  if (kDebugMode) return startNativeStep();\n}\n",
  };
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(dir, path, ".."), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}

const run = (cwd: string, ...args: string[]) => Bun.spawnSync(["bun", MAIN, "migrate", "finish", ...args], { cwd, stdout: "pipe", stderr: "pipe" });

test("migrate finish refuses open checkpoints, then retires the reference", () => {
  const open = project(false);
  const refused = run(join(open, "native"));
  expect(refused.exitCode).toBe(2);
  expect(refused.stderr.toString()).toContain("f/cp1");

  const dir = project(true);
  const native = join(dir, "native");
  expect(run(native, "--dry-run").exitCode).toBe(0);
  expect(existsSync(join(native, "spec/profile.md"))).toBe(true);

  const r = run(native);
  expect(r.exitCode).toBe(0);
  expect(Object.keys(JSON.parse(readFileSync(join(native, "nativestep.json"), "utf8")).targets)).toEqual(["ios"]);
  expect(existsSync(join(native, "spec/adapters/flutter"))).toBe(false);
  expect(existsSync(join(native, "spec/archive/profile.md"))).toBe(true);
  expect(readFileSync(join(native, "spec/memory.md"), "utf8")).toContain("Migration finished");
  expect(readFileSync(join(dir, "flutter/pubspec.yaml"), "utf8")).toBe("dependencies:\n");
  expect(readFileSync(join(dir, "flutter/lib/main.dart"), "utf8")).not.toContain("startNativeStep");
  expect(run(native).exitCode).toBe(2); // nothing left to finish
});
