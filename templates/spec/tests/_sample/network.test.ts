// Conformance: the network guard (ARCHITECTURE.md R19, PROTOCOL.md §6).
// `_probeNetwork` exists only in the Sample screen: it makes a real request on purpose.
import { expect, test } from "bun:test";
import { conformance } from "./conformance.ts";

test("a network request poisons the session with network_blocked", async () => {
  const app = await conformance();
  await app.precondition("Sample");
  const error = await app.do("_probeNetwork").catch((e) => e);
  expect(error.code).toBe("network_blocked");
  expect(error.request.url).toContain("example.com");

  const fresh = await conformance();
  await fresh.precondition("Sample", (s) => s.count === 0);
});
