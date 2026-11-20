// basket cp5: the basket count badge on the tab bar (profile: Basket).
// The badge is not on the Tabs node (profile decision: navigators have fixed state), so no test can read it.
// This test checks the count it shows and ends on the products tab with items in the basket, where the shot sees the badge.
import { expect, test } from "bun:test";
import { session } from "@nativestep/test";

test("after adding from a product, the basket counts the items while the product stays on screen", async () => {
  const app = await session({ fixtures: ["auth/user", "catalog/products", "catalog/details"] });
  await app.precondition("Login");
  await app.do("signIn", { email: "ada@example.com", password: "secret" });
  await app.precondition("ProductList", (s) => s.loading === false);
  await app.do("openProduct", { id: "tea" });
  await app.precondition("ProductDetail", (s) => s.loading === false);
  await app.do("addToBasket");
  await app.do("addToBasket");
  expect((await app.do("selectTab", { tab: "basket" })).count).toBe(2);
  await app.do("selectTab", { tab: "products" });
  expect(app.path).toEqual(["App", "Modal", "Tabs", "Stack", "ProductDetail"]);
});
