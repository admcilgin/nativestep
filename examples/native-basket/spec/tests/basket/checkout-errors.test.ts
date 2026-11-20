// basket cp4: order errors (out of stock, network) and the placing state (profile: Basket).
import { expect, test } from "bun:test";
import { session, type App } from "@nativestep/test";

const shop = ["auth/user", "catalog/products", "catalog/details"];

/** Signs in, adds tea twice and mug once from their details, and opens the basket. */
async function filledBasket(app: App) {
  await app.precondition("Login");
  await app.do("signIn", { email: "ada@example.com", password: "secret" });
  await app.precondition("ProductList", (s) => s.loading === false);
  for (const [id, times] of [["tea", 2], ["mug", 1]] as const) {
    await app.do("openProduct", { id });
    await app.precondition("ProductDetail", (s) => s.id === id && s.loading === false);
    for (let i = 0; i < times; i++) await app.do("addToBasket");
    await app.do("goBack");
  }
  await app.do("selectTab", { tab: "basket" });
  return app.precondition("Basket", (s) => s.count === 3);
}

test("while the order is being placed, it cannot be placed again", async () => {
  const app = await session({ fixtures: [...shop, "basket/slow-order"] });
  await filledBasket(app);
  const s = await app.do("placeOrder", undefined, (s) => s.placing === true);
  expect(s).toEqual(expect.objectContaining({ placing: true, count: 3 }));
  await app.unavailable("placeOrder");
});

test("an out-of-stock order keeps the basket and shows the error", async () => {
  const app = await session({ fixtures: [...shop, "basket/out-of-stock"] });
  await filledBasket(app);
  const s = await app.do("placeOrder");
  expect(app.path).toEqual(["App", "Modal", "Tabs", "Basket"]);
  expect(s).toEqual(expect.objectContaining({ count: 3, placing: false, error: { code: "out_of_stock" } }));
});

test("after a network error the order can be placed again", async () => {
  const app = await session({ fixtures: [...shop, "basket/offline-once"] });
  await filledBasket(app);
  const s = await app.do("placeOrder");
  expect(s.error).toEqual({ code: "network" });
  expect(await app.do("placeOrder")).toEqual({ orderId: "o2" });
});

test("while the order is placed again, the old error stays until the answer", async () => {
  const app = await session({ fixtures: [...shop, "basket/out-of-stock-then-slow"] });
  await filledBasket(app);
  await app.do("placeOrder");
  const s = await app.do("placeOrder", undefined, (s) => s.placing === true);
  expect(s.error).toEqual({ code: "out_of_stock" });
});

// Provisional (memory.md, "Order error after the lines change"): the error outlives the lines, as on the reference.
test("the error is not shown on an empty basket, and shows again when a product is added", async () => {
  const app = await session({ fixtures: [...shop, "basket/out-of-stock"] });
  await filledBasket(app);
  await app.do("placeOrder");
  for (const id of ["tea", "tea", "mug"]) await app.do("removeOne", { productId: id });
  expect(app.state.error).toBeUndefined();
  await app.do("selectTab", { tab: "products" });
  await app.do("openProduct", { id: "tea" });
  await app.do("addToBasket");
  await app.do("selectTab", { tab: "basket" });
  expect(app.state).toEqual(expect.objectContaining({ count: 1, error: { code: "out_of_stock" } }));
});
