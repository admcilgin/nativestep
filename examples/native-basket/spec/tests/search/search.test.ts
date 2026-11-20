// search cp1: search the product list by name (docs/features/search.md). No reference: the doc is the spec.
// Criterion 8 (no server call) holds because the fixtures have no search method: a call would fail as fixture_missing.
import { expect, test } from "bun:test";
import { session, type App } from "@nativestep/test";

async function list(app: App) {
  await app.precondition("Login");
  await app.do("signIn", { email: "ada@example.com", password: "secret" });
  return app.precondition("ProductList", (s) => s.loading === false);
}

const ids = (items: { id: string }[]) => items.map((p) => p.id);
const fixtures = ["auth/user", "search/catalog"];

test("searching shows the products whose name contains the text, ignoring case and spaces", async () => {
  const app = await session({ fixtures });
  await list(app);
  const s = await app.do("search", { query: "  TEA " });
  expect(s.query).toBe("  TEA ");
  expect(ids(s.results)).toEqual(["tea", "green", "pot"]);
  expect(ids(s.products)).toEqual(["tea", "green", "mug", "pot"]);
});

test("an empty search shows every product", async () => {
  const app = await session({ fixtures });
  expect(ids((await list(app)).results)).toEqual(["tea", "green", "mug", "pot"]);
  await app.do("search", { query: "mug" });
  expect(ids((await app.do("search", { query: "   " })).results)).toEqual(["tea", "green", "mug", "pot"]);
});

test("only the products shown can be opened", async () => {
  const app = await session({ fixtures });
  await list(app);
  await app.do("search", { query: "mug" });
  const open = app.node.actions.find((a) => a.name === "openProduct");
  expect(open?.input).toEqual(expect.objectContaining({ properties: { id: expect.objectContaining({ enum: ["mug"] }) } }));
});

test("with no match there is nothing to open, and refreshing is still possible", async () => {
  const app = await session({ fixtures });
  await list(app);
  const s = await app.do("search", { query: "coffee" });
  expect(s.results).toEqual([]);
  await app.unavailable("openProduct");
  expect(app.node.actions.map((a) => a.name)).toContain("refresh");
});

test("the search is kept after opening a product and coming back", async () => {
  const app = await session({ fixtures });
  await list(app);
  await app.do("search", { query: "mug" });
  await app.do("openProduct", { id: "mug" });
  const s = await app.do("goBack");
  expect(s.query).toBe("mug");
  expect(ids(s.results)).toEqual(["mug"]);
});

test("a refresh keeps the search and applies it to the new list", async () => {
  const app = await session({ fixtures: ["auth/user", "catalog/restocked"] });
  await list(app);
  expect(ids((await app.do("search", { query: "tea" })).results)).toEqual(["tea"]);
  const s = await app.do("refresh", undefined, (s) => s.loading === false && s.products.length === 3);
  expect(s.query).toBe("tea");
  expect(ids(s.results)).toEqual(["tea", "pot"]);
});

test("search is not offered during the first load", async () => {
  const app = await session({ fixtures: ["auth/user", "catalog/slow-products"] });
  await app.precondition("Login");
  await app.do("signIn", { email: "ada@example.com", password: "secret" }, (s) => s.loading === true);
  await app.unavailable("search");
});
