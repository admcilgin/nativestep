import { afterEach } from "bun:test";
import { Connection, PROTOCOL_VERSION } from "./connection.ts";
import { loadFixtures } from "./fixtures.ts";

export { mergeFixtures, type FixtureDocument, type FixtureEntry } from "./fixtures.ts";

export type State = Record<string, any>;
export type Predicate = (state: State) => boolean;

export interface ActionInfo {
  name: string;
  title: string;
  input?: Record<string, unknown>;
  lentBy?: string;
}

export interface Node {
  name: string;
  state: State;
  actions: ActionInfo[];
}

/** A protocol error (PROTOCOL.md §8). Extra fields such as `available` or `errors` are copied onto it. */
export class NativeStepError extends Error {
  code: string;
  [field: string]: unknown;

  constructor(error: { code: string; message?: string; [field: string]: unknown }) {
    super(`${error.code}: ${error.message ?? ""}${describeExtra(error)}`);
    this.name = "NativeStepError";
    this.code = error.code;
    for (const [k, v] of Object.entries(error)) if (k !== "message") this[k] = v;
  }
}

function describeExtra(error: Record<string, unknown>): string {
  const { code, message, ...rest } = error;
  return Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : "";
}

const env = process.env;
const TIMEOUT_MS = Number(env.NATIVESTEP_TIMEOUT_MS ?? 3000);
const INTERVAL_MS = 25;

let shared: Promise<Connection> | null = null;

/** One connection per test process (COMPONENTS.md §2); every session() sends a new `start`. */
function connection(): Promise<Connection> {
  shared ??= (async () => {
    let conn: Connection;
    if (env.NATIVESTEP_CONNECT) conn = await Connection.tcp(env.NATIVESTEP_CONNECT);
    else if (env.NATIVESTEP_HEADLESS) conn = Connection.spawn(env.NATIVESTEP_HEADLESS, env.NATIVESTEP_ROOT ?? process.cwd());
    else throw new Error("no target configured: run tests with `nativestep test`");
    process.on("exit", () => conn.close());
    const hello = await conn.request("hello", { protocol: PROTOCOL_VERSION });
    if (!hello.ok) throw new NativeStepError(hello.error);
    if (!hello.capabilities?.includes("start")) throw new Error(`target ${hello.target} cannot start fixture sessions`);
    return conn;
  })();
  return shared;
}

export interface SessionOptions {
  /** Fixture names under spec/fixtures, without `.json`, merged in order. */
  fixtures?: string[];
  /** Optional deep link to start from. */
  route?: string;
}

let current: App | null = null;

export async function session(options: SessionOptions = {}): Promise<App> {
  const fixtures = loadFixtures(env.NATIVESTEP_FIXTURES ?? "spec/fixtures", options.fixtures ?? []);
  const app = new App(await connection());
  await app.call("start", { fixtures, ...(options.route ? { route: options.route } : {}) });
  current = app;
  return app;
}

// `nativestep shot` sets these: after each test, wait for effects and animations, then take a screenshot.
if (env.NATIVESTEP_SHOT_CMD && env.NATIVESTEP_SHOT_OUT) {
  const settleMs = Number(env.NATIVESTEP_SHOT_SETTLE_MS ?? 800);
  afterEach(async () => {
    const app = current;
    current = null;
    if (!app) return;
    await app.ls().catch(() => {});
    for (const deadline = Date.now() + TIMEOUT_MS; app.busy && Date.now() < deadline; ) {
      await Bun.sleep(INTERVAL_MS);
      await app.ls().catch(() => {});
    }
    await Bun.sleep(settleMs);
    const command = env.NATIVESTEP_SHOT_CMD!.replaceAll("{out}", `'${env.NATIVESTEP_SHOT_OUT!.replaceAll("'", "'\\''")}'`);
    const r = Bun.spawnSync(["sh", "-c", command], { cwd: env.NATIVESTEP_ROOT, stdout: "pipe", stderr: "pipe" });
    if (r.exitCode !== 0) throw new Error(`screenshot failed: ${command}\n${r.stderr}`);
  });
}

export class App {
  node!: Node;
  path: string[] = [];
  busy = false;

  constructor(private readonly conn: Connection) {}

  get state(): State {
    return this.node.state;
  }

  /** @internal */
  async call(cmd: string, fields: Record<string, unknown> = {}): Promise<Node> {
    const res = await this.conn.request(cmd, fields);
    if (!res.ok) throw new NativeStepError(res.error);
    this.node = res.node;
    this.path = res.path;
    this.busy = res.busy;
    return this.node;
  }

  ls(): Promise<Node> {
    return this.call("ls");
  }

  /** Waits until the focused node is `name` and `pred(state)` holds. */
  async precondition(name: string, pred: Predicate = () => true): Promise<State> {
    await this.until(() => this.node.name === name && holds(pred, this.node.state), `node ${name}`);
    return this.state;
  }

  /** Sends an action, then waits for `pred(state)` — or, without a predicate, until no effect is in flight. */
  async do(action: string, input?: Record<string, unknown>, pred?: Predicate): Promise<State> {
    await this.call("do", { action, ...(input ? { input } : {}) });
    if (pred) await this.until(() => holds(pred, this.node.state), `predicate after ${action}`);
    else await this.until(() => !this.busy, `effects of ${action} to finish`);
    return this.state;
  }

  /** Asserts that `action` is not offered on the focused node. */
  async unavailable(action: string): Promise<void> {
    const node = await this.ls();
    if (node.actions.some((a) => a.name === action)) {
      throw new Error(`expected ${action} to be unavailable on ${node.name}; available: ${names(node)}`);
    }
  }

  private async until(check: () => boolean, what: string): Promise<void> {
    const deadline = Date.now() + TIMEOUT_MS;
    while (!check()) {
      if (Date.now() > deadline) {
        throw new Error(
          `timed out after ${TIMEOUT_MS} ms waiting for ${what}\n` +
            `path: ${this.path.join(" > ")}\nnode: ${JSON.stringify(this.node, null, 2)}`,
        );
      }
      await Bun.sleep(INTERVAL_MS);
      await this.ls();
    }
  }
}

function holds(pred: Predicate, state: State): boolean {
  try {
    return pred(state);
  } catch {
    return false;
  }
}

function names(node: Node): string {
  return node.actions.map((a) => a.name).join(", ");
}
