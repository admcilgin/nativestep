// basket cp2: add one and remove one in the basket, down to an empty basket (profile: Basket).
// placeOrder is cp3: these tests do not look at it.
import { expect, test } from "bun:test";
import { session, type App } from "@nativestep/test";

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

const quantities = (s: { lines: { productId: string; quantity: number }[] }) => s.lines.map((l) => [l.productId, l.quantity]);

test("add one and remove one are offered for the basket's lines only", async () => {
  const app = await session({ fixtures: ["auth/user", "catalog/products", "catalog/details"] });
  await filledBasket(app);
  for (const name of ["addOne", "removeOne"]) {
    const action = app.node.actions.find((a) => a.name === name);
    expect(action?.input).toEqual(expect.objectContaining({ properties: { productId: expect.objectContaining({ enum: ["tea", "mug"] }) } }));
  }
});

test("add one raises the line's quantity, the count and the total", async () => {
  const app = await session({ fixtures: ["auth/user", "catalog/products", "catalog/details"] });
  await filledBasket(app);
  const s = await app.do("addOne", { productId: "mug" });
  expect(quantities(s)).toEqual([["tea", 2], ["mug", 2]]);
  expect(s.count).toBe(4);
  expect(s.totalCents).toBe(3300);
});

test("remove one lowers the quantity, and a line at one goes away", async () => {
  const app = await session({ fixtures: ["auth/user", "catalog/products", "catalog/details"] });
  await filledBasket(app);
  let s = await app.do("removeOne", { productId: "tea" });
  expect(quantities(s)).toEqual([["tea", 1], ["mug", 1]]);
  s = await app.do("removeOne", { productId: "tea" });
  expect(quantities(s)).toEqual([["mug", 1]]);
  expect(s.count).toBe(1);
  expect(s.totalCents).toBe(1200);
});

test("removing the last item empties the basket, with nothing left to do", async () => {
  const app = await session({ fixtures: ["auth/user", "catalog/products", "catalog/details"] });
  await filledBasket(app);
  for (const id of ["tea", "tea", "mug"]) await app.do("removeOne", { productId: id });
  expect(app.state).toEqual(expect.objectContaining({ lines: [], count: 0, totalCents: 0 }));
  await app.unavailable("addOne");
  await app.unavailable("removeOne");
});
