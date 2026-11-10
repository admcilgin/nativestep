// Conformance: effects, busy, fixture matching, delayMs, times, merging, fixture_missing (PROTOCOL.md §6–7).
import { expect, test } from "bun:test";
import { session } from "@nativestep/test";

test("load runs an effect: loading and busy while in flight, items afterwards", async () => {
  const app = await session({ fixtures: ["_sample/list"] });
  await app.precondition("Sample");
  await app.do("load", {}, (s) => s.loading === true);
  expect(app.busy).toBe(true);
  await app.precondition("Sample", (s) => s.loading === false);
  expect(app.busy).toBe(false);
  expect(app.state.items).toEqual([
    { id: "a", title: "Alpha" },
    { id: "b", title: "Beta" },
  ]);
});

test("a later fixture file is tried first, and `times` limits how often an entry matches", async () => {
  const app = await session({ fixtures: ["_sample/list", "_sample/list-error-once"] });
  await app.precondition("Sample");
  await app.do("load");
  expect(app.state.error).toEqual({ code: "unavailable", message: "Try again later" });
  expect(app.state.items).toEqual([]);
  await app.do("load");
  expect(app.state.error).toBeUndefined();
  expect(app.state.items.length).toBe(2);
});

test("a service call without a fixture poisons the session until the next start", async () => {
  const app = await session();
  await app.precondition("Sample");
  const error = await app.do("load").catch((e) => e);
  expect(error.code).toBe("fixture_missing");
  expect(error.service).toBe("SampleService");
  expect(error.method).toBe("list");
  expect(error.args).toEqual({ page: 1 });
  expect((await app.ls().catch((e) => e)).code).toBe("fixture_missing");

  const fresh = await session();
  await fresh.precondition("Sample", (s) => s.count === 0);
});
