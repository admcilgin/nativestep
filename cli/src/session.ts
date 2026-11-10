// `nativestep session start|stop`, `ls`, `do` (COMPONENTS.md §1).
// A background daemon keeps one connection to the target and serves it on a unix socket in .nativestep/sessions/.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, openSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { createConnection, createServer } from "node:net";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { Connection, PROTOCOL_VERSION } from "../../kits/test-sdk/src/connection.ts";
import { loadFixtures } from "../../kits/test-sdk/src/fixtures.ts";
import { type Args, flag, loadProject, modeFor, prepare, type Project, target, UsageError } from "./config.ts";
import { printResponse } from "./output.ts";

const TIMEOUT_MS = Number(process.env.NATIVESTEP_TIMEOUT_MS ?? 3000);

function sessionsDir(project: Project): string {
  return join(project.stateDir, "sessions");
}

// shortcut: unix socket paths are limited to ~104 bytes on macOS; move them to a hashed /tmp path if a project lives that deep.
function socketPath(project: Project, name: string): string {
  return join(sessionsDir(project), `${name}.sock`);
}

/** One request over a session socket. */
function ask(path: string, request: Record<string, unknown>): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    const socket = createConnection(path);
    socket.once("error", (e) => reject(e));
    createInterface({ input: socket }).once("line", (line) => {
      socket.end();
      resolve(JSON.parse(line));
    });
    socket.write(JSON.stringify({ id: 1, ...request }) + "\n");
  });
}

async function running(project: Project, name: string): Promise<boolean> {
  const path = socketPath(project, name);
  if (!existsSync(path)) return false;
  try {
    await ask(path, { cmd: "__ping" });
    return true;
  } catch {
    rmSync(path, { force: true }); // left behind by a daemon that died
    return false;
  }
}

/** The target named by `--target`, or the only running session. */
async function sessionTarget(project: Project, args: Args): Promise<string> {
  const named = flag(args, "target");
  if (named) {
    target(project, named);
    if (!(await running(project, named))) throw new UsageError(`no session for ${named}; run: nativestep session start --target ${named}`);
    return named;
  }
  const dir = sessionsDir(project);
  const names = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".sock")).map((f) => f.slice(0, -5)) : [];
  const live: string[] = [];
  for (const n of names) if (await running(project, n)) live.push(n);
  if (live.length === 1) return live[0];
  if (!live.length) throw new UsageError("no session running; run: nativestep session start --target <target>");
  throw new UsageError(`several sessions are running (${live.join(", ")}); pass --target`);
}

export async function sessionStart(args: Args): Promise<number> {
  const project = loadProject();
  const name = flag(args, "target") ?? (() => { throw new UsageError("usage: nativestep session start --target <t> [--fixtures a,b] [--route <url>] [--device]"); })();
  const mode = modeFor(target(project, name), args.flags.device === true);
  const fixtures = loadFixtures(project.fixturesDir, (flag(args, "fixtures") ?? "").split(",").filter(Boolean));
  const route = flag(args, "route");
  const path = socketPath(project, name);

  if (!(await running(project, name))) {
    if (!prepare(project, name, mode)) return 1;
    mkdirSync(sessionsDir(project), { recursive: true });
    const log = join(sessionsDir(project), `${name}.log`);
    const daemon = spawn(process.execPath, [Bun.main, "__session-daemon", name, mode], {
      cwd: project.root,
      detached: true,
      stdio: ["ignore", openSync(log, "w"), openSync(log, "a")],
    });
    daemon.unref();
    const deadline = Date.now() + 30_000;
    while (!(await running(project, name))) {
      if (daemon.exitCode !== null || Date.now() > deadline) {
        console.error(`${name}: session did not start\n${readFileSync(log, "utf8").slice(-2000)}`);
        return 1;
      }
      await Bun.sleep(100);
    }
  }
  const res = await ask(path, { cmd: "start", fixtures, ...(route ? { route } : {}) });
  printResponse(res, args.flags.json === true);
  return res.ok ? 0 : 1;
}

export async function sessionStop(args: Args): Promise<number> {
  const project = loadProject();
  const name = await sessionTarget(project, args);
  await ask(socketPath(project, name), { cmd: "__shutdown" });
  console.log(`${name}: session stopped`);
  return 0;
}

export async function ls(args: Args): Promise<number> {
  const project = loadProject();
  const res = await ask(socketPath(project, await sessionTarget(project, args)), { cmd: "ls" });
  printResponse(res, args.flags.json === true);
  return res.ok ? 0 : 1;
}

/** Sends an action and, unless `--no-wait`, waits until no effect is in flight before printing. */
export async function doAction(args: Args): Promise<number> {
  const [action, input] = args.positional;
  if (!action) throw new UsageError("usage: nativestep do <action> [json] [--target <t>] [--no-wait] [--json]");
  let parsed: unknown;
  try {
    parsed = input ? JSON.parse(input) : undefined;
  } catch {
    throw new UsageError(`input is not JSON: ${input}`);
  }
  const project = loadProject();
  const path = socketPath(project, await sessionTarget(project, args));
  let res = await ask(path, { cmd: "do", action, ...(parsed !== undefined ? { input: parsed } : {}) });
  const deadline = Date.now() + TIMEOUT_MS;
  while (res.ok && res.busy && args.flags["no-wait"] !== true && Date.now() < deadline) {
    await Bun.sleep(25);
    res = await ask(path, { cmd: "ls" });
  }
  printResponse(res, args.flags.json === true);
  return res.ok ? 0 : 1;
}

/** The background process: one target connection, served to CLI calls one request at a time. */
export async function daemon(name: string, mode: string): Promise<void> {
  const project = loadProject();
  const t = target(project, name);
  const conn = mode === "headless" ? Connection.spawn(t.headless!, project.root) : await Connection.tcp(t.device!.connect!);
  const hello = await conn.request("hello", { protocol: PROTOCOL_VERSION });
  if (!hello.ok) throw new Error(`hello failed: ${JSON.stringify(hello.error)}`);
  console.log(`connected to ${name} (${mode}): ${JSON.stringify(hello)}`);

  const path = socketPath(project, name);
  rmSync(path, { force: true });
  const shutdown = () => {
    rmSync(path, { force: true });
    conn.close();
    process.exit(0);
  };
  const server = createServer((client) => {
    createInterface({ input: client }).on("line", async (line) => {
      const { id, cmd, ...fields } = JSON.parse(line);
      let res: Record<string, unknown>;
      if (cmd === "__ping") res = { ok: true };
      else if (cmd === "__shutdown") {
        await conn.request("stop").catch(() => {});
        client.end(JSON.stringify({ id, ok: true }) + "\n", shutdown);
        return;
      } else {
        res = await conn.request(cmd, fields).catch((e) => ({ ok: false, error: { code: "internal", message: `${name}: ${e.message}` } }));
      }
      client.write(JSON.stringify({ ...res, id }) + "\n");
    });
  });
  server.listen(path);
  process.on("SIGTERM", shutdown);
  conn.closed.then((reason) => {
    console.log(`${name}: ${reason}`);
    shutdown();
  });
}
