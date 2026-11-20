// catalog cp3: product detail from the list, back, tab memory, and the not-found error (profile: ProductDetail, Navigation).
// addToBasket is basket cp1; these tests do not look at it.
import { expect, test } from "bun:test";
import { session, type App } from "@nativestep/test";

const shop = ["auth/user", "catalog/products", "catalog/details"];

async function signIn(app: App) {
  await app.precondition("Login");
  await app.do("signIn", { email: "ada@example.com", password: "secret" });
  await app.precondition("ProductList", (s) => s.loading === false);
}

test("opening a product pushes its detail with the description", async () => {
  const app = await session({ fixtures: shop });
  await signIn(app);
  const open = app.node.actions.find((a) => a.name === "openProduct");
  expect(open?.input).toEqual(expect.objectContaining({ properties: { id: expect.objectContaining({ enum: ["tea", "mug"] }) } }));
  await app.do("openProduct", { id: "tea" });
  await app.precondition("ProductDetail", (s) => s.loading === false);
  expect(app.path).toEqual(["App", "Modal", "Tabs", "Stack", "ProductDetail"]);
  expect(app.state.id).toBe("tea");
  expect(app.state.product).toEqual({ id: "tea", name: "Tea", priceCents: 450, description: "Loose leaf, 100 g." });
});

test("a product without a description shows an empty one", async () => {
  const app = await session({ fixtures: shop });
  await signIn(app);
  await app.do("openProduct", { id: "mug" });
  await app.precondition("ProductDetail", (s) => s.loading === false);
  expect(app.state.product.description).toBe("");
});

// Ends while the call is in flight, so `nativestep shot --no-wait` shows the loading detail (G3).
test("while the product loads, it is loading without a product", async () => {
  const app = await session({ fixtures: ["auth/user", "catalog/products", "catalog/slow-detail"] });
  await signIn(app);
  await app.do("openProduct", { id: "tea" }, (s) => s.id === "tea" && s.loading === true);
  expect(app.state.product).toBeUndefined();
});

test("back returns to the list, and a product opened again is not fetched again", async () => {
  const app = await session({ fixtures: shop });
  await signIn(app);
  await app.do("openProduct", { id: "tea" });
  await app.precondition("ProductDetail", (s) => s.loading === false);
  await app.do("goBack");
  await app.precondition("ProductList");
  expect(app.state.products).toHaveLength(2);
  await app.unavailable("goBack");
  // details.json serves tea once: a second fetch would stop the session with fixture_missing.
  await app.do("openProduct", { id: "tea" });
  await app.precondition("ProductDetail", (s) => s.product?.name === "Tea");
});

test("a product that is gone shows not_found", async () => {
  const app = await session({ fixtures: [...shop, "catalog/mug-gone"] });
  await signIn(app);
  await app.do("openProduct", { id: "mug" });
  await app.precondition("ProductDetail", (s) => s.error?.code === "not_found");
  expect(app.state.loading).toBe(false);
  expect(app.state.product).toBeUndefined();
});

test("back works from a product that is gone", async () => {
  const app = await session({ fixtures: [...shop, "catalog/mug-gone"] });
  await signIn(app);
  await app.do("openProduct", { id: "mug" });
  await app.precondition("ProductDetail", (s) => s.error?.code === "not_found");
  await app.do("goBack");
  await app.precondition("ProductList");
});

test("the products tab keeps its detail across tabs, and selecting it again returns to the list", async () => {
  const app = await session({ fixtures: shop });
  await signIn(app);
  await app.do("openProduct", { id: "tea" });
  await app.precondition("ProductDetail", (s) => s.loading === false);
  await app.do("selectTab", { tab: "basket" });
  await app.precondition("Basket");
  await app.do("selectTab", { tab: "products" });
  await app.precondition("ProductDetail");
  expect(app.state.id).toBe("tea");
  await app.do("selectTab", { tab: "products" });
  await app.precondition("ProductList");
  expect(app.path).toEqual(["App", "Modal", "Tabs", "Stack", "ProductList"]);
});
