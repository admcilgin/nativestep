// foundation cp1: the app shell (profile: Navigation). Tab memory inside a stack is tested with the detail (catalog cp3).
import { expect, test } from "bun:test";
import { session } from "@nativestep/test";

const signedIn = ["auth/user", "catalog/products"];

test("the app starts signed out, on sign-in, without the tabs", async () => {
  const app = await session({ fixtures: signedIn });
  await app.precondition("Login");
  expect(app.path).toEqual(["App", "Login"]);
  await app.unavailable("selectTab");
});

test("signed in, the products tab shows the product list inside its stack", async () => {
  const app = await session({ fixtures: signedIn });
  await app.precondition("Login");
  await app.do("signIn", { email: "ada@example.com", password: "secret" });
  await app.precondition("ProductList");
  expect(app.path).toEqual(["App", "Modal", "Tabs", "Stack", "ProductList"]);
  expect(app.node.actions).toContainEqual(
    expect.objectContaining({ name: "selectTab", lentBy: "Tabs", input: expect.objectContaining({ properties: { tab: { type: "string", enum: ["products", "basket"] } } }) }),
  );
  await app.unavailable("goBack");
});

test("selectTab switches between products and the basket", async () => {
  const app = await session({ fixtures: signedIn });
  await app.precondition("Login");
  await app.do("signIn", { email: "ada@example.com", password: "secret" });
  await app.precondition("ProductList");

  await app.do("selectTab", { tab: "basket" });
  await app.precondition("Basket");
  expect(app.path).toEqual(["App", "Modal", "Tabs", "Basket"]);

  await app.do("selectTab", { tab: "products" });
  await app.precondition("ProductList");
});
