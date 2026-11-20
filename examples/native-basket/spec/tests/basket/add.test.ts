// basket cp1: add a product to the basket from its detail; lines, count and total (profile: ProductDetail, Basket).
// addOne/removeOne are cp2, placing an order cp3: these tests do not look at the Basket's actions.
import { expect, test } from "bun:test";
import { session, type App } from "@nativestep/test";

const shop = ["auth/user", "catalog/products", "catalog/details"];

async function openProduct(app: App, id: string) {
  await app.do("openProduct", { id });
  await app.precondition("ProductDetail", (s) => s.id === id && s.loading === false);
}

async function basket(app: App) {
  await app.do("selectTab", { tab: "basket" });
  return app.precondition("Basket");
}

async function signIn(app: App) {
  await app.precondition("Login");
  await app.do("signIn", { email: "ada@example.com", password: "secret" });
  await app.precondition("ProductList", (s) => s.loading === false);
}

test("the basket starts empty", async () => {
  const app = await session({ fixtures: shop });
  await signIn(app);
  expect(await basket(app)).toEqual(expect.objectContaining({ lines: [], count: 0, totalCents: 0, placing: false }));
});

test("adding a product stays on its detail and puts one in the basket", async () => {
  const app = await session({ fixtures: shop });
  await signIn(app);
  await openProduct(app, "tea");
  await app.do("addToBasket");
  expect(app.path).toEqual(["App", "Modal", "Tabs", "Stack", "ProductDetail"]);
  const state = await basket(app);
  expect(state.lines).toEqual([{ productId: "tea", name: "Tea", priceCents: 450, quantity: 1 }]);
  expect(state.count).toBe(1);
  expect(state.totalCents).toBe(450);
});

test("adding the same product again raises its quantity; another product gets its own line", async () => {
  const app = await session({ fixtures: shop });
  await signIn(app);
  await openProduct(app, "tea");
  await app.do("addToBasket");
  await app.do("addToBasket");
  await app.do("goBack");
  await openProduct(app, "mug");
  await app.do("addToBasket");
  const state = await basket(app);
  expect(state.lines).toEqual([
    { productId: "tea", name: "Tea", priceCents: 450, quantity: 2 },
    { productId: "mug", name: "Mug", priceCents: 1200, quantity: 1 },
  ]);
  expect(state.count).toBe(3);
  expect(state.totalCents).toBe(2100);
});

test("addToBasket is not offered while the product loads or when it is gone", async () => {
  const app = await session({ fixtures: ["auth/user", "catalog/products", "catalog/slow-detail", "catalog/mug-gone"] });
  await signIn(app);
  await app.do("openProduct", { id: "tea" }, (s) => s.id === "tea" && s.loading === true);
  await app.unavailable("addToBasket");
  // slow-detail takes longer than a precondition waits; back works while it loads.
  await app.do("goBack", undefined, () => true);
  // tea is still loading, so `do` waits for mug's error rather than for no call in flight.
  await app.do("openProduct", { id: "mug" }, (s) => s.id === "mug" && s.error?.code === "not_found");
  await app.unavailable("addToBasket");
});
