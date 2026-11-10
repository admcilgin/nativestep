#!/usr/bin/env bun
// shortcut: scan, lint and status arrive in M4.
import { parseArgs, UsageError } from "./config.ts";
import { init } from "./init.ts";
import { daemon, doAction, ls, sessionStart, sessionStop } from "./session.ts";
import { shot, test } from "./test.ts";

const USAGE = `usage:
  nativestep init <dir> --app <Name> --ios-bundle-id <id> --android-package <package> [--reference <flutter-path>] [--force]
  nativestep session start --target <t> [--fixtures a,b] [--route <url>] [--device] [--json]
  nativestep session stop [--target <t>]
  nativestep ls [--target <t>] [--json]
  nativestep do <action> [json] [--target <t>] [--no-wait] [--json]
  nativestep test [filter] [--target a,b] [--device]
  nativestep shot <test-file> [--name <test>] --target a,b [--out <dir>]`;

const BOOLEANS = ["device", "json", "no-wait", "force"];

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  if (command === "__session-daemon") {
    await daemon(rest[0], rest[1]);
    return -1; // keeps running
  }
  if (command === "session") {
    const [sub, ...more] = rest;
    if (sub === "start") return sessionStart(parseArgs(more, BOOLEANS));
    if (sub === "stop") return sessionStop(parseArgs(more, BOOLEANS));
  }
  const args = parseArgs(rest, BOOLEANS);
  switch (command) {
    case "init":
      return init(args);
    case "ls":
      return ls(args);
    case "do":
      return doAction(args);
    case "test":
      return test(args);
    case "shot":
      return shot(args);
  }
  console.error(USAGE);
  return 2;
}

try {
  const code = await main(Bun.argv.slice(2));
  if (code >= 0) process.exit(code);
} catch (e) {
  if (!(e instanceof UsageError)) throw e;
  console.error(`nativestep: ${e.message}`);
  process.exit(2);
}
