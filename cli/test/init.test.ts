import { expect, test } from "bun:test";
import { runnerBundleId } from "../src/init.ts";

const settings = (plist: string, id: string) =>
  `buildSettings = {\n\t\t\t\tINFOPLIST_FILE = ${plist};\n\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = ${id};\n\t\t\t};`;

test("runnerBundleId skips app extensions and tests that come before the Runner target", () => {
  const pbxproj = [
    settings("WatchlistWidget/Info.plist", "com.example.app.Widget"),
    `buildSettings = {\n\t\t\t\tGENERATE_INFOPLIST_FILE = YES;\n\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = com.example.app.RunnerTests;\n\t\t\t};`,
    settings("Runner/Info.plist", "com.example.app"),
  ].join("\n");
  expect(runnerBundleId(pbxproj)).toBe("com.example.app");
  expect(runnerBundleId(settings("Widget/Info.plist", "x"))).toBeUndefined();
});
