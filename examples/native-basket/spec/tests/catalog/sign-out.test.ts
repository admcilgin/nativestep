// catalog cp4: sign out from the product list (profile: Navigation "Guard", State "Caching"; memory.md "Login after sign-in").
import { expect, test } from "bun:test";
import { session, type App } from "@nativestep/test";

async function signIn(app: App) {
  await app.precondition("Login");
  await app.do("signIn", { email: "ada@example.com", password: "secret" });
  await app.precondition("ProductList", (s) => s.loading === false);
}

test("signing out returns to sign-in, without the tabs", async () => {
  const app = await session({ fixtures: ["auth/user", "catalog/products"] });
  await signIn(app);
  await app.do("signOut");
  await app.precondition("Login");
  expect(app.path).toEqual(["App", "Login"]);
  await app.unavailable("selectTab");
});

test("after a failed sign-in, signing out shows a clean sign-in", async () => {
  const app = await session({ fixtures: ["auth/user", "auth/wrong-password", "catalog/products"] });
  await app.precondition("Login");
  await app.do("signIn", { email: "ada@example.com", password: "wrong" }, (s) => s.error?.code === "unauthorized");
  await app.do("signIn", { email: "ada@example.com", password: "secret" });
  await app.precondition("ProductList", (s) => s.loading === false);
  await app.do("signOut");
  await app.precondition("Login");
  expect(app.state.loading).toBe(false);
  expect(app.state.error).toBeUndefined();
});

test("sign out is offered while the list shows its error", async () => {
  const app = await session({ fixtures: ["auth/user", "catalog/products", "catalog/offline-once"] });
  await app.precondition("Login");
  await app.do("signIn", { email: "ada@example.com", password: "secret" });
  await app.precondition("ProductList", (s) => s.error?.code === "network");
  await app.do("signOut");
  await app.precondition("Login");
});

test("signing in again shows the list from before, without fetching it", async () => {
  // products-once serves the list once: a second fetch would stop the session with fixture_missing.
  const app = await session({ fixtures: ["auth/user", "catalog/products-once"] });
  await signIn(app);
  await app.do("signOut");
  await app.precondition("Login");
  await app.do("signIn", { email: "ada@example.com", password: "secret" });
  await app.precondition("ProductList");
  expect(app.path).toEqual(["App", "Modal", "Tabs", "Stack", "ProductList"]);
  expect(app.state.products.map((p: { id: string }) => p.id)).toEqual(["tea", "mug"]);
  expect(app.state.loading).toBe(false);
});
