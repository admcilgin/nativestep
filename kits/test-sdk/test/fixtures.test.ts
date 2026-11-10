import { expect, test } from "bun:test";
import { mergeFixtures } from "../src/fixtures.ts";

test("later documents are tried first and flags merge shallowly", () => {
  const merged = mergeFixtures([
    { services: { S: { m: [{ result: 1 }] } }, flags: { a: 1, b: 1 } },
    { services: { S: { m: [{ result: 2 }], n: [{ result: 3 }] }, T: { x: [] } }, flags: { b: 2 } },
  ]);
  expect(merged).toEqual({
    services: { S: { m: [{ result: 2 }, { result: 1 }], n: [{ result: 3 }] }, T: { x: [] } },
    flags: { a: 1, b: 2 },
  });
});

test("no documents give an empty fixture set", () => {
  expect(mergeFixtures([])).toEqual({ services: {}, flags: {} });
});
