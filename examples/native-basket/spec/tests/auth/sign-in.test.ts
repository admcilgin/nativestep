// auth cp1 and cp2: signing in (lib/auth/login_screen.dart, auth_controller.dart).
import { expect, test } from "bun:test";
import { session } from "@nativestep/test";

test("signing in lands on the product list", async () => {
  const app = await session({ fixtures: ["auth/user", "catalog/products"] });
  await app.precondition("Login", (s) => s.loading === false && s.error === undefined);
  await app.do("signIn", { email: "ada@example.com", password: "secret" });
  await app.precondition("ProductList", (s) => s.products.length === 2);
});

test("the email is sent without surrounding spaces", async () => {
  // The fixture only matches the trimmed email; an untrimmed one would stop the session with fixture_missing.
  const app = await session({ fixtures: ["auth/user", "catalog/products"] });
  await app.precondition("Login");
  await app.do("signIn", { email: "  ada@example.com ", password: "secret" });
  await app.precondition("ProductList");
});

test("while signing in, the form shows loading and cannot be sent again", async () => {
  const app = await session({ fixtures: ["auth/slow", "catalog/products"] });
  await app.precondition("Login");
  await app.do("signIn", { email: "ada@example.com", password: "secret" }, (s) => s.loading === true);
  await app.unavailable("signIn");
  await app.precondition("ProductList");
});

// Ends while the call is in flight, so `nativestep shot --no-wait` shows the loading form (G3).
test("while signing in, the app stays on the sign-in screen", async () => {
  const app = await session({ fixtures: ["auth/slow", "catalog/products"] });
  await app.precondition("Login");
  await app.do("signIn", { email: "ada@example.com", password: "secret" }, (s) => s.loading === true);
  expect(app.path).toEqual(["App", "Login"]);
});

test("a wrong password shows unauthorized and keeps the form", async () => {
  const app = await session({ fixtures: ["auth/user", "auth/wrong-password"] });
  await app.precondition("Login");
  await app.do("signIn", { email: "ada@example.com", password: "wrong" }, (s) => s.error?.code === "unauthorized");
  expect(app.path).toEqual(["App", "Login"]);
  expect(app.node.state.loading).toBe(false);
  expect(app.node.actions.map((a) => a.name)).toContain("signIn");
});

test("a network error shows network, and signing in again works", async () => {
  const app = await session({ fixtures: ["auth/user", "auth/offline", "catalog/products"] });
  await app.precondition("Login");
  await app.do("signIn", { email: "ada@example.com", password: "secret" }, (s) => s.error?.code === "network");
  await app.do("signIn", { email: "ada@example.com", password: "secret" });
  await app.precondition("ProductList");
});
