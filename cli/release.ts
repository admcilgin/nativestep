// `bun cli/release.ts [target...]` (COMPONENTS.md §1): one archive per platform in dist/,
// nativestep-<target>.tar.gz holding bin/nativestep (bun build --compile) and the committed kits/ and templates/.
import { $ } from "bun";
import { join } from "node:path";

const ALL = ["darwin-arm64", "darwin-x64", "linux-x64", "linux-arm64"];
const targets = Bun.argv.slice(2).length ? Bun.argv.slice(2) : ALL;
const repo = join(import.meta.dir, "..");
const dist = join(repo, "dist");

for (const target of targets) {
  if (!ALL.includes(target)) throw new Error(`unknown target ${target}; one of ${ALL.join(", ")}`);
  const name = `nativestep-${target}`;
  const out = join(dist, name);
  await $`rm -rf ${out} && mkdir -p ${out}`;
  await $`bun build --compile --target=bun-${target} ${join(import.meta.dir, "src/main.ts")} --outfile ${join(out, "bin/nativestep")}`.quiet();
  // HEAD, not the working tree: a release holds only committed files, with their modes (gradlew).
  await $`git -C ${repo} archive HEAD kits templates | tar -x -C ${out}`;
  await $`tar -czf ${join(dist, `${name}.tar.gz`)} -C ${dist} ${name}`;
  console.log(`dist/${name}.tar.gz`);
}
