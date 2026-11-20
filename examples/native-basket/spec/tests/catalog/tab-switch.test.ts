// Found on the iOS device in basket cp5's G1: after going back and switching tabs at once, opening a product on
// the products tab was undone 300 ms later. The device host answered before the pop's animation ended, so UIKit
// finished the pop when the tab showed again. Repeated, because the bug was a race.
import { expect, test } from "bun:test";
import { session } from "@nativestep/test";

test("going back, switching tabs and opening a product at once keeps the product on screen", async () => {
  const app = await session({ fixtures: ["auth/user", "catalog/products", "catalog/details"] });
  await app.precondition("Login");
  await app.do("signIn", { email: "ada@example.com", password: "secret" });
  await app.precondition("ProductList", (s) => s.loading === false);
  for (let i = 0; i < 6; i++) {
    await app.do("openProduct", { id: "tea" });
    await app.do("addToBasket");
    await app.do("goBack");
    await app.do("selectTab", { tab: "basket" });
    await app.do("removeOne", { productId: "tea" });
    await app.do("selectTab", { tab: "products" });
    await app.do("openProduct", { id: "tea" });
    await Bun.sleep(300);
    await app.ls();
    expect(app.path).toEqual(["App", "Modal", "Tabs", "Stack", "ProductDetail"]);
    await app.do("goBack");
  }
});
