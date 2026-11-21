import { expect, test } from "bun:test";
import { checks, older } from "../src/doctor.ts";

test("older compares dotted versions", () => {
  expect(older("1.4.3", "1.4.4")).toBe(true);
  expect(older("1.10.0", "1.4.4")).toBe(false);
  expect(older("1.4.4", "1.4.4")).toBe(false);
  expect(older("1.4", "1.4.1")).toBe(true);
});

test("doctor reports bun and asks for flutter only without a project or with a reference", () => {
  const none = checks(undefined);
  expect(none.find((c) => c.what === "bun")?.level).toBe("ok");
  expect(none.some((c) => c.what === "flutter")).toBe(true);
  const project = { root: "/x", config: { protocol: 1, kits: "0.0.1", app: { name: "A", iosBundleId: "a.b", androidPackage: "a.b" }, targets: { ios: {} } }, testsDir: "", fixturesDir: "", stateDir: "" };
  const list = checks(project);
  expect(list.some((c) => c.what === "flutter")).toBe(false);
  expect(list.find((c) => c.what === "kits")).toMatchObject({ level: "warn" });
});
