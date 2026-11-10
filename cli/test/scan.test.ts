// `nativestep scan` on a small Flutter project with a channel on each platform and generated code to skip.
import { expect, test } from "bun:test";
import { join } from "node:path";
import { scanFlutter } from "../src/scan.ts";

test("scan reads packages, Dart files, assets, native code and imports", () => {
  const { raw, imports } = scanFlutter(join(import.meta.dir, "fixtures/flutter-app"));
  expect(raw.packages).toEqual([
    { name: "dio", version: "5.7.0", direct: true },
    { name: "flutter", version: "0.0.0", direct: true },
    { name: "http_parser", version: "4.1.2", direct: false },
  ]);
  expect(raw.dartFiles).toBe(3);
  expect(raw.assets).toBe(3); // the font file is missing, so it does not count
  expect(raw.nativeCode).toEqual([
    { path: "android/app/src/main/java/com/example/app/Plain.java", channels: [] },
    { path: "android/app/src/main/kotlin/com/example/app/MainActivity.kt", channels: ["demo/battery", "demo/location"] },
    { path: "ios/Runner/AppDelegate.swift", channels: ["demo/biometrics"] },
  ]);
  expect(imports["lib/main.dart"]).toEqual(["package:flutter/material.dart", "lib/src/api.dart", "lib/src/theme.dart"]);
  expect(imports["lib/src/api.dart"]).toEqual(["package:dio/dio.dart", "lib/src/theme.dart"]);
});
