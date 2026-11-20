// catalog cp1: the product list loads and shows names and prices (profile: ProductList).
// Errors, retry and refresh are cp2; the detail is cp3; sign-out is cp4.
import { expect, test } from "bun:test";
import { session, type App } from "@nativestep/test";

async function signIn(app: App) {
  await app.precondition("Login");
  await app.do("signIn", { email: "ada@example.com", password: "secret" });
  await app.precondition("ProductList");
}

test("the list shows each product's name and price, without the description", async () => {
  const app = await session({ fixtures: ["auth/user", "catalog/products"] });
  await signIn(app);
  await app.precondition("ProductList", (s) => s.loading === false);
  expect(app.state.products).toEqual([
    { id: "tea", name: "Tea", priceCents: 450 },
    { id: "mug", name: "Mug", priceCents: 1200 },
  ]);
  expect(app.state.error).toBeUndefined();
});

// Ends while the list is in flight, so `nativestep shot --no-wait` shows the loading list (G3).
test("while the list loads, it is loading and empty", async () => {
  const app = await session({ fixtures: ["auth/user", "catalog/slow-products"] });
  await app.precondition("Login");
  // Without a predicate, `do` would wait for the list call too. `products` is only on ProductList.
  await app.do("signIn", { email: "ada@example.com", password: "secret" }, (s) => s.products !== undefined && s.loading === true);
  await app.precondition("ProductList");
  expect(app.state.products).toEqual([]);
});

test("an empty catalog shows an empty list, not loading", async () => {
  const app = await session({ fixtures: ["auth/user", "catalog/empty"] });
  await signIn(app);
  await app.precondition("ProductList", (s) => s.loading === false);
  expect(app.state.products).toEqual([]);
  expect(app.state.error).toBeUndefined();
});
