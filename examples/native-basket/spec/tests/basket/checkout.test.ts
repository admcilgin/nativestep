// basket cp3: place an order, see the order-placed dialog, basket emptied (profile: Basket, OrderPlaced).
// Order errors and the placing state are cp4.
import { expect, test } from "bun:test";
import { session, type App } from "@nativestep/test";

const fixtures = ["auth/user", "catalog/products", "catalog/details", "basket/order"];

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

test("place order is offered only while the basket has lines", async () => {
  const app = await session({ fixtures });
  await app.precondition("Login");
  await app.do("signIn", { email: "ada@example.com", password: "secret" });
  await app.do("selectTab", { tab: "basket" });
  await app.precondition("Basket", (s) => s.count === 0);
  await app.unavailable("placeOrder");
});

test("placing an order sends the basket's lines and shows the order-placed dialog", async () => {
  const app = await session({ fixtures });
  await filledBasket(app);
  const s = await app.do("placeOrder");
  expect(app.path).toEqual(["App", "Modal", "OrderPlaced"]);
  expect(s).toEqual({ orderId: "o1" });
});

test("while the order-placed dialog is up, only closing it is possible", async () => {
  const app = await session({ fixtures });
  await filledBasket(app);
  await app.do("placeOrder");
  await app.unavailable("selectTab");
  await app.unavailable("placeOrder");
});

test("closing the dialog shows the basket, emptied", async () => {
  const app = await session({ fixtures });
  await filledBasket(app);
  await app.do("placeOrder");
  const s = await app.do("dismiss");
  expect(app.path).toEqual(["App", "Modal", "Tabs", "Basket"]);
  expect(s).toEqual(expect.objectContaining({ lines: [], count: 0, totalCents: 0, placing: false }));
  await app.unavailable("placeOrder");
});
