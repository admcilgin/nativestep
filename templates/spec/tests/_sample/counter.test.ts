// Conformance: state, actions, input schema, unavailable actions (COMPONENTS.md §6).
import { expect, test } from "bun:test";
import { session } from "@nativestep/test";

test("starts on Sample with a zero count", async () => {
  const app = await session();
  await app.precondition("Sample", (s) => s.count === 0 && s.loading === false);
  expect(app.path).toEqual(["App", "Modal", "Tabs", "Stack", "Sample"]);
  expect(app.state.items).toEqual([]);
  expect(app.state.error).toBeUndefined();
  await app.unavailable("goBack");
});

test("increment and decrement change the count; decrement does nothing at zero", async () => {
  const app = await session();
  await app.precondition("Sample");
  await app.do("increment", {}, (s) => s.count === 1);
  await app.do("increment", {}, (s) => s.count === 2);
  await app.do("decrement", {}, (s) => s.count === 1);
  await app.do("decrement", {}, (s) => s.count === 0);
  await app.do("decrement");
  expect(app.state.count).toBe(0);
});

test("set takes a non-negative integer", async () => {
  const app = await session();
  await app.precondition("Sample");
  await app.do("set", { value: 7 }, (s) => s.count === 7);
});

test("set rejects input that does not match its schema", async () => {
  const app = await session();
  await app.precondition("Sample");
  for (const input of [{ value: -1 }, { value: "3" }, { value: 1.5 }, {}]) {
    const error = await app.do("set", input).catch((e) => e);
    expect(error.code).toBe("invalid_input");
    expect(error.errors.map((e: { path: string }) => e.path)).toContain("/value");
  }
  await app.ls();
  expect(app.state.count).toBe(0);
});

test("an action that does not exist is reported with the available ones", async () => {
  const app = await session();
  await app.precondition("Sample");
  const error = await app.do("nope").catch((e) => e);
  expect(error.code).toBe("action_unavailable");
  expect(error.available).toEqual(
    expect.arrayContaining(["increment", "decrement", "set", "load", "openDetail"]),
  );
});
