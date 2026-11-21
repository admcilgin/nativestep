// The machine checks depend on the machine; these cover the logic around them.
import { expect, test } from "bun:test";
import { flutterNeed, older, projectChecks } from "../src/doctor.ts";
import { KITS_VERSION } from "../src/kits.ts";

test("older compares dotted versions", () => {
  expect(older("1.4.3", "1.4.4")).toBe(true);
  expect(older("1.10.0", "1.4.4")).toBe(false);
  expect(older("1.4.4", "1.4.4")).toBe(false);
  expect(older("1.4", "1.4.1")).toBe(true);
});

const project = (kits: string, targets: Record<string, { role?: string }>) => ({
  root: "/x",
  config: { protocol: 1, kits, app: { name: "A", iosBundleId: "a.b", androidPackage: "a.b" }, targets },
  testsDir: "",
  fixturesDir: "",
  stateDir: "",
});

test("flutter is needed with a reference, optional before a project, and not asked for otherwise", () => {
  expect(flutterNeed(undefined)).toBe("warn");
  expect(flutterNeed(project("1", { flutter: { role: "reference" }, ios: {} }))).toBe("fail");
  expect(flutterNeed(project("1", { ios: {} }))).toBeUndefined();
});

test("stale kits are a warning", () => {
  expect(projectChecks(project(KITS_VERSION, {}))[0]!.level).toBe("ok");
  expect(projectChecks(project("0.0.1", {}))[0]).toMatchObject({ level: "warn", what: "kits" });
});
