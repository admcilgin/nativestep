// `nativestep status` counts screens, features and checkpoints, and reads the JUnit results.
import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { statusOf } from "../src/status.ts";

test("status sums up the inventory and the latest results", () => {
  const root = mkdtempSync(join(tmpdir(), "nativestep-status-"));
  mkdirSync(join(root, "spec"));
  mkdirSync(join(root, ".nativestep/results"), { recursive: true });
  writeFileSync(join(root, "spec/inventory.json"), JSON.stringify({
    screens: [{ name: "Catalog", status: "migrated" }, { name: "Basket", status: "in_progress" }, { name: "Login" }],
    features: [
      { name: "catalog", checkpoints: [{ id: "cp1", status: "done" }, { id: "cp2", status: "done" }] },
      { name: "basket", checkpoints: [{ id: "cp1", status: "done" }, { id: "cp2", status: "planned" }] },
      { name: "login", checkpoints: [] },
    ],
  }));
  writeFileSync(join(root, ".nativestep/results/ios.xml"), '<?xml version="1.0"?>\n<testsuites name="bun test" tests="15" failures="1" skipped="2">\n</testsuites>\n');

  const s = statusOf(root, "Basket");
  expect(s.screens).toMatchObject({ total: 3, migrated: 1, inProgress: 1, pending: 1 });
  expect(s.features).toMatchObject({ total: 3, done: 1, checkpoints: { total: 4, done: 3 } });
  expect(s.tests.ios).toMatchObject({ tests: 15, failures: 1, skipped: 2 });
});
