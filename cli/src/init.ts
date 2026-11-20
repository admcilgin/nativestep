// `nativestep init` (COMPONENTS.md §1, §6): fills the templates and copies the kits into a project.
import { chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { type Args, flag, UsageError } from "./config.ts";

/** A `bun build --compile` binary runs from Bun's virtual filesystem (macOS and Linux). */
export const COMPILED = Bun.main.startsWith("/$bunfs/");
// The release puts kits/ and templates/ beside bin/nativestep; from a checkout they are in the repo.
export const REPO = COMPILED ? resolve(dirname(process.execPath), "..") : resolve(import.meta.dir, "../..");
export const KITS = ["ios", "android", "flutter", "test-sdk"];
// Build output and machine state never leave the nativestep repo.
export const SKIP = new Set([".build", "build", ".gradle", ".kotlin", ".swiftpm", ".dart_tool", "node_modules", ".DS_Store", "local.properties"]);
const USAGE =
  "usage: nativestep init <dir> --app <Name> --ios-bundle-id <id> --android-package <package> [--reference <flutter-path>] [--force]";

export function init(args: Args): number {
  const [dirArg] = args.positional;
  const app = flag(args, "app");
  const iosBundleId = flag(args, "ios-bundle-id");
  const androidPackage = flag(args, "android-package");
  if (!dirArg || !app || !iosBundleId || !androidPackage) throw new UsageError(USAGE);
  // These end up in type names, bundle ids and Kotlin packages, so a bad value would only fail later in a build.
  if (!/^[A-Z][A-Za-z0-9]*$/.test(app)) throw new UsageError(`--app must be a type name such as Basket, got ${app}`);
  if (!/^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(iosBundleId)) throw new UsageError(`--ios-bundle-id is not a bundle id: ${iosBundleId}`);
  if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(androidPackage)) {
    throw new UsageError(`--android-package is not a Kotlin package: ${androidPackage}`);
  }
  const reference = flag(args, "reference");
  if (reference && !existsSync(reference)) throw new UsageError(`--reference not found: ${reference}`);

  const dir = resolve(dirArg);
  if (existsSync(dir) && readdirSync(dir).length > 0 && !args.flags.force) {
    throw new UsageError(`${dir} is not empty; --force writes the templates over it`);
  }
  const values: Record<string, string> = {
    __APP_NAME__: app,
    __IOS_BUNDLE_ID__: iosBundleId,
    __ANDROID_PACKAGE__: androidPackage,
  };
  // In paths the package becomes directories: __ANDROID_PACKAGE__ → com/basket/app.
  const fill = (text: string, path: boolean) =>
    text.replace(/__APP_NAME__|__IOS_BUNDLE_ID__|__ANDROID_PACKAGE__/g, (key) =>
      path && key === "__ANDROID_PACKAGE__" ? androidPackage.replaceAll(".", "/") : values[key],
    );

  copyTree(join(REPO, "templates"), dir, fill);
  refuseSymlink(join(dir, "kits"));
  for (const kit of KITS) copyTree(join(REPO, "kits", kit), join(dir, "kits", kit));
  setKitsVersion(dir);
  if (reference) addReference(dir, resolve(reference));

  console.log(`created ${app} in ${dir}`);
  const shown = relative(process.cwd(), dir);
  console.log(`next:\n  cd ${shown.startsWith("..") ? dir : shown || "."}\n  nativestep test _sample --target ios,android`);
  return 0;
}

/** Copies `src` into `dest`. With `fill`, placeholders are replaced in names and in text files. */
function copyTree(src: string, dest: string, fill?: (text: string, path: boolean) => string) {
  refuseSymlink(dest);
  mkdirSync(dest, { recursive: true });
  for (const name of readdirSync(src)) {
    if (SKIP.has(name)) continue;
    const from = join(src, name);
    const to = join(dest, fill ? fill(name, true) : name);
    if (statSync(from).isDirectory()) {
      copyTree(from, to, fill);
      continue;
    }
    refuseSymlink(to);
    mkdirSync(join(to, ".."), { recursive: true });
    const content = readFileSync(from);
    if (fill && !content.includes(0)) writeFileSync(to, fill(content.toString("utf8"), false));
    else copyFileSync(from, to);
    chmodSync(to, statSync(from).mode); // keeps gradlew executable
  }
}

/** Writing through a symlink would change files outside the project (an old `kits -> ../../kits` link, say). */
export function refuseSymlink(path: string) {
  if (existsSync(path) && lstatSync(path).isSymbolicLink()) throw new UsageError(`${path} is a symlink; remove it first`);
}

/** Records the copied kits' version (`kits/VERSION`), which `nativestep kits update` moves forward. */
function setKitsVersion(dir: string) {
  const file = join(dir, "nativestep.json");
  const config = JSON.parse(readFileSync(file, "utf8"));
  config.kits = readFileSync(join(REPO, "kits/VERSION"), "utf8").trim();
  writeFileSync(file, JSON.stringify(config, null, 2) + "\n");
}

/** The app's bundle id: the one in the build settings of the Runner target, not of tests or app extensions. */
export function runnerBundleId(pbxproj: string): string | undefined {
  return pbxproj
    .split("buildSettings = {")
    .filter((settings) => /INFOPLIST_FILE = "?Runner\/Info\.plist"?;/.test(settings.split("};")[0]!))
    .map((settings) => settings.split("};")[0]!.match(/PRODUCT_BUNDLE_IDENTIFIER = "?([^";]+)"?;/)?.[1])
    .find(Boolean);
}

/** Adds the Flutter app as the reference target; it runs as a debug app on the iOS simulator (COMPONENTS.md §5). */
function addReference(dir: string, reference: string) {
  const pbxproj = join(reference, "ios/Runner.xcodeproj/project.pbxproj");
  if (!existsSync(pbxproj)) throw new UsageError(`${reference} has no ios/Runner.xcodeproj; the reference runs on the iOS simulator`);
  const bundleId = runnerBundleId(readFileSync(pbxproj, "utf8"));
  if (!bundleId) throw new UsageError(`no PRODUCT_BUNDLE_IDENTIFIER for Runner/Info.plist in ${pbxproj}`);
  const path = `'${relative(dir, reference).replaceAll("'", `'\\''`)}'`;
  const file = join(dir, "nativestep.json");
  const config = JSON.parse(readFileSync(file, "utf8"));
  config.targets = {
    flutter: {
      role: "reference",
      path: relative(dir, reference),
      device: {
        build: `cd ${path} && flutter build ios --simulator --debug --dart-define=NATIVESTEP=true && xcrun simctl install booted build/ios/iphonesimulator/Runner.app`,
        setup: `xcrun simctl launch --terminate-running-process booted ${bundleId}`,
        connect: "tcp://127.0.0.1:7357",
        screenshot: "xcrun simctl io booted screenshot {out}",
      },
    },
    ...config.targets,
  };
  writeFileSync(file, JSON.stringify(config, null, 2) + "\n");
}
