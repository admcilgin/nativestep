// catalog cp2: the list's error with retry, and pull to refresh (profile: ProductList, "Refresh keeps data").
import { expect, test } from "bun:test";
import { session, type App } from "@nativestep/test";

async function signIn(app: App) {
  await app.precondition("Login");
  await app.do("signIn", { email: "ada@example.com", password: "secret" });
  await app.precondition("ProductList");
}

test("a failed load shows the error and offers retry, not refresh", async () => {
  const app = await session({ fixtures: ["auth/user", "catalog/products", "catalog/offline-once"] });
  await signIn(app);
  await app.precondition("ProductList", (s) => s.error?.code === "network");
  expect(app.state.loading).toBe(false);
  expect(app.state.products).toEqual([]);
  await app.unavailable("refresh");
});

test("retry loads the list again", async () => {
  const app = await session({ fixtures: ["auth/user", "catalog/products", "catalog/offline-once"] });
  await signIn(app);
  await app.precondition("ProductList", (s) => s.error?.code === "network");
  await app.do("retry", {}, (s) => s.loading === false && s.products.length === 2);
  expect(app.state.error).toBeUndefined();
  await app.unavailable("retry");
});

test("refresh keeps the list while it reloads, then shows the new list", async () => {
  const app = await session({ fixtures: ["auth/user", "catalog/restocked"] });
  await signIn(app);
  await app.unavailable("retry");
  await app.do("refresh", {}, (s) => s.loading === true);
  expect(app.state.products.map((p: { id: string }) => p.id)).toEqual(["tea", "mug"]);
  await app.precondition("ProductList", (s) => s.loading === false);
  expect(app.state.products.map((p: { id: string }) => p.id)).toEqual(["tea", "mug", "pot"]);
});
