// Found in an audit of older code (step-fix): a product whose load failed kept its error for the session, because
// its page is cached per id. The screen says "Try again", but nothing could try again. The reference has the same
// bug; the expected behavior is a provisional decision (memory.md, "Reopening a product that failed to load").
import { expect, test } from "bun:test";
import { session } from "@nativestep/test";

test("reopening a product that failed to load loads it again", async () => {
  const app = await session({ fixtures: ["auth/user", "catalog/products", "catalog/detail-offline-once"] });
  await app.precondition("Login");
  await app.do("signIn", { email: "ada@example.com", password: "secret" });
  await app.precondition("ProductList", (s) => s.loading === false);
  expect((await app.do("openProduct", { id: "tea" })).error).toEqual({ code: "network" });
  await app.do("goBack");
  const s = await app.do("openProduct", { id: "tea" });
  expect(s.error).toBeUndefined();
  expect(s.product?.name).toBe("Tea");
});
