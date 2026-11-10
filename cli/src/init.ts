// `nativestep init` (COMPONENTS.md §1, §6): fills the templates and copies the kits into a project.
import { chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { type Args, flag, UsageError } from "./config.ts";

const REPO = resolve(import.meta.dir, "../..");
const KITS = ["ios", "android", "flutter", "test-sdk"];
// Build output and machine state never leave the nativestep repo.
const SKIP = new Set([".build", "build", ".gradle", ".kotlin", ".swiftpm", ".dart_tool", "node_modules", ".DS_Store", "local.properties"]);
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
function refuseSymlink(path: string) {
  if (existsSync(path) && lstatSync(path).isSymbolicLink()) throw new UsageError(`${path} is a symlink; remove it first`);
}

/** Adds the Flutter app as the reference target; it runs as a debug app on the iOS simulator (COMPONENTS.md §5). */
function addReference(dir: string, reference: string) {
  const pbxproj = join(reference, "ios/Runner.xcodeproj/project.pbxproj");
  if (!existsSync(pbxproj)) throw new UsageError(`${reference} has no ios/Runner.xcodeproj; the reference runs on the iOS simulator`);
  const bundleId = [...readFileSync(pbxproj, "utf8").matchAll(/PRODUCT_BUNDLE_IDENTIFIER = "?([^";]+)"?;/g)]
    .map((m) => m[1])
    .find((id) => !id.endsWith(".RunnerTests"));
  if (!bundleId) throw new UsageError(`no PRODUCT_BUNDLE_IDENTIFIER in ${pbxproj}`);
  const path = `'${relative(dir, reference).replaceAll("'", `'\\''`)}'`;
  const file = join(dir, "nativestep.json");
  const config = JSON.parse(readFileSync(file, "utf8"));
  config.targets = {
    flutter: {
      role: "reference",
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
