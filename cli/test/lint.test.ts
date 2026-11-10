// Every lint rule is caught in a project with deliberate violations, and a fresh project is clean (PLAN.md M4).
import { expect, test } from "bun:test";
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { init } from "../src/init.ts";
import { lintProject } from "../src/lint.ts";

const PKG = "com/demo/app";
const IOS = "ios/Core/Sources";
const ANDROID = `android/core/src/main/kotlin/${PKG}`;

function project(): string {
  const dir = join(mkdtempSync(join(tmpdir(), "nativestep-lint-")), "demo");
  init({ positional: [dir], flags: { app: "Demo", "ios-bundle-id": "com.demo.app", "android-package": "com.demo.app" } });
  return dir;
}

function edit(dir: string, file: string, from: string, to: string) {
  const path = join(dir, file);
  const text = readFileSync(path, "utf8");
  if (!text.includes(from)) throw new Error(`${file} has no ${from}`);
  writeFileSync(path, text.replace(from, to));
}

test("a fresh project is clean; comments and strings do not count", () => {
  const dir = project();
  appendFileSync(join(dir, IOS, "Sample/SampleViewModel.swift"), '\n// Date() and UUID() in a comment\nlet note = "Date() in a string"\n');
  appendFileSync(join(dir, ANDROID, "sample/SampleViewModel.kt"), '\n/* System.currentTimeMillis() */\nval note = "Instant.now()"\n');
  expect(lintProject(dir, "com.demo.app")).toEqual([]);
});

test("each rule catches its violation", () => {
  const dir = project();
  // R1: Core imports the platform.
  edit(dir, `${IOS}/Sample/SampleViewModel.swift`, "import NativeStepKit", "import NativeStepKit\nimport SwiftUI");
  edit(dir, `${ANDROID}/sample/SampleViewModel.kt`, "\nimport ", "\nimport android.util.Log\nimport ");
  // R6: Core reads the clock directly.
  appendFileSync(join(dir, IOS, "Sample/SampleViewModel.swift"), "\nfunc stamp() -> Date { Date() }\n");
  appendFileSync(join(dir, ANDROID, "sample/SampleViewModel.kt"), "\nfun stamp() = System.currentTimeMillis()\n");
  // R10: a node in the wrong file on iOS, a ViewModel without a node on Android.
  renameSync(join(dir, IOS, "Sample/SampleDetailViewModel+Introspection.swift"), join(dir, IOS, "Sample/SampleDetailNode.swift"));
  appendFileSync(join(dir, ANDROID, "sample/SampleViewModel.kt"), "\nclass ExtraViewModel\n");
  // R12: an action only on iOS, a node name that is not PascalCase on Android.
  edit(dir, `${IOS}/Sample/SampleViewModel+Introspection.swift`, 'NodeAction("increment"', 'NodeAction("refresh", title: "Refresh") {}, NodeAction("increment"');
  edit(dir, `${ANDROID}/about/About.kt`, 'override val name = "About"', 'override val name = "about_screen"');
  // R5: a parameter renamed on one platform.
  edit(dir, `${IOS}/Sample/SampleService.swift`, "func list(page: Int)", "func list(pageNumber: Int)");
  // R17: a Core file outside a feature folder, a feature only on Android, an App folder that is not a feature.
  renameSync(join(dir, IOS, "Sample/SampleService.swift"), join(dir, IOS, "SampleService.swift"));
  mkdirSync(join(dir, ANDROID, "extra"));
  writeFileSync(join(dir, ANDROID, "extra/Extra.kt"), "package com.demo.app.extra\n");
  mkdirSync(join(dir, "ios/App/Widgets"));
  writeFileSync(join(dir, "ios/App/Widgets/Badge.swift"), "import SwiftUI\n");
  // R20: the server outside #if DEBUG, the host in release builds and in src/main.
  edit(dir, "ios/App/DemoApp.swift", "import Core\n", "import Core\nimport CoreHost\n");
  edit(dir, "android/app/build.gradle.kts", 'debugImplementation(project(":host"))', 'implementation(project(":host"))');
  edit(dir, `android/app/src/main/kotlin/${PKG}/MainActivity.kt`, "\nimport ", "\nimport com.demo.app.host.fixtureCore\nimport ");

  const found = lintProject(dir, "com.demo.app").map((v) => `${v.rule} ${v.file} ${v.message}`);
  const expected = [
    ["R1", `${IOS}/Sample/SampleViewModel.swift`, "imports SwiftUI"],
    ["R1", `${ANDROID}/sample/SampleViewModel.kt`, "imports android.util.Log"],
    ["R6", `${IOS}/Sample/SampleViewModel.swift`, "Date()"],
    ["R6", `${ANDROID}/sample/SampleViewModel.kt`, "System.currentTimeMillis("],
    ["R10", `${IOS}/Sample/SampleDetailViewModel.swift`, "SampleDetailViewModel has no node"],
    ["R10", `${ANDROID}/sample/SampleViewModel.kt`, "ExtraViewModel has no ExtraNode"],
    ["R12", `${IOS}/Sample/SampleViewModel+Introspection.swift`, "Sample.refresh exists only on iOS"],
    ["R12", `${ANDROID}/about/About.kt`, "about_screen is not PascalCase"],
    ["R12", `${IOS}/About/AboutViewModel+Introspection.swift`, "node About exists only on iOS"],
    ["R5", `${IOS}/SampleService.swift`, "takes (pageNumber) on iOS but (page) on Android"],
    ["R17", `${IOS}/SampleService.swift`, "outside a feature folder"],
    ["R17", `${ANDROID}/extra`, "feature extra has no folder"],
    ["R17", "ios/App/Widgets", "Widgets is not a Core feature"],
    ["R20", "ios/App/DemoApp.swift", "outside #if DEBUG"],
    ["R20", "android/app/build.gradle.kts", "use debugImplementation"],
    ["R20", `android/app/src/main/kotlin/${PKG}/MainActivity.kt`, "only src/debug may"],
  ];
  for (const [rule, file, message] of expected) {
    expect(found.some((f) => f.startsWith(`${rule} ${file} `) && f.includes(message)), `${rule} ${file} ${message}\nfound:\n${found.join("\n")}`).toBe(true);
  }
  // Each rule fires only where it was broken.
  for (const f of found) {
    expect(expected.some(([rule, file]) => f.startsWith(`${rule} ${file}`)) || f.startsWith("R12 android/core"), f).toBe(true);
  }
});
