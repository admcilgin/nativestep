// Conformance: navigators, lent actions, deep links (ARCHITECTURE.md R14–R16, PROTOCOL.md §4).
import { expect, test } from "bun:test";
import { session } from "@nativestep/test";

test("openDetail pushes SampleDetail, and the stack lends goBack", async () => {
  const app = await session();
  await app.precondition("Sample");
  await app.do("set", { value: 3 });
  await app.do("openDetail", { id: "a" });
  await app.precondition("SampleDetail", (s) => s.id === "a");
  expect(app.path).toEqual(["App", "Modal", "Tabs", "Stack", "SampleDetail"]);
  expect(app.node.actions).toContainEqual(expect.objectContaining({ name: "goBack", lentBy: "Stack" }));
  await app.unavailable("increment");

  await app.do("goBack");
  await app.precondition("Sample", (s) => s.count === 3);
  await app.unavailable("goBack");
});

test("openDetail requires a non-empty id", async () => {
  const app = await session();
  await app.precondition("Sample");
  const error = await app.do("openDetail", { id: "" }).catch((e) => e);
  expect(error.code).toBe("invalid_input");
  expect(error.errors[0].path).toBe("/id");
});

test("a session can start from a deep link", async () => {
  const app = await session({ route: "sample://detail/b" });
  await app.precondition("SampleDetail", (s) => s.id === "b");
  await app.do("goBack");
  await app.precondition("Sample", (s) => s.count === 0);
});

test("a deep link can open a modal over the tab it belongs to", async () => {
  const app = await session({ route: "sample://license" });
  await app.precondition("License");
  await app.do("dismiss");
  await app.precondition("About");
});

test("selectTab switches tabs, and each tab keeps its own stack", async () => {
  const app = await session();
  await app.precondition("Sample");
  expect(app.node.actions).toContainEqual(expect.objectContaining({ name: "selectTab", lentBy: "Tabs" }));
  await app.do("openDetail", { id: "a" });

  await app.do("selectTab", { tab: "about" });
  await app.precondition("About");
  expect(app.path).toEqual(["App", "Modal", "Tabs", "About"]);
  await app.unavailable("goBack");

  await app.do("selectTab", { tab: "sample" });
  await app.precondition("SampleDetail", (s) => s.id === "a");
  const error = await app.do("selectTab", { tab: "nope" }).catch((e) => e);
  expect(error.code).toBe("invalid_input");
  expect(error.errors[0].path).toBe("/tab");
});

test("a modal covers the tabs and lends dismiss", async () => {
  const app = await session();
  await app.do("selectTab", { tab: "about" });
  await app.do("openLicense");
  await app.precondition("License");
  expect(app.path).toEqual(["App", "Modal", "License"]);
  expect(app.node.actions).toContainEqual(expect.objectContaining({ name: "dismiss", lentBy: "Modal" }));
  await app.unavailable("selectTab");

  await app.do("dismiss");
  await app.precondition("About");
  await app.unavailable("dismiss");
});
