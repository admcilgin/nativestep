import { spawn, type ChildProcess } from "node:child_process";
import { connect as tcpConnect, type Socket } from "node:net";
import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";

export const PROTOCOL_VERSION = 1;
const HELLO_TIMEOUT_MS = 3000;
const NO_ANSWER =
  "the port accepts connections but nothing answers hello; another nativestep app suspended on the simulator may hold it: quit that app and run again";

/** One NDJSON connection to a target (PROTOCOL.md §1). Requests are strictly sequential. */
export class Connection {
  private nextId = 1;
  private waiting: ((line: string) => void) | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private closedReason: string | null = null;
  private onClosed!: (reason: string) => void;
  /** Resolves with the reason once the target closes the connection or the host exits. */
  readonly closed = new Promise<string>((resolve) => (this.onClosed = resolve));

  private constructor(
    private readonly output: Writable,
    input: Readable,
    private readonly dispose: () => void,
  ) {
    createInterface({ input })
      .on("line", (line) => {
        const resolve = this.waiting;
        this.waiting = null;
        resolve?.(line);
      })
      // readline re-emits the stream's errors (a reset socket); unhandled, they would fail whichever test runs.
      .on("error", (e) => this.fail(`connection error: ${e.message}`));
    input.on("close", () => this.fail("connection closed by target"));
  }

  /** Headless target: spawn the host and talk over its stdin/stdout. */
  static spawn(command: string, cwd: string): Connection {
    const child: ChildProcess = spawn(command, { cwd, shell: true, stdio: ["pipe", "pipe", "inherit"] });
    const conn = new Connection(child.stdin!, child.stdout!, () => child.kill());
    child.on("exit", (code) => conn.fail(`host exited with code ${code}`));
    return conn;
  }

  /**
   * Device target: connect to tcp://host:port, retrying while the app starts up. With `app`, another app answering
   * is retried too: the app this one replaced holds the port until it is in the background.
   */
  static async tcp(url: string, timeoutMs = Number(process.env.NATIVESTEP_CONNECT_TIMEOUT_MS ?? 20000), app?: string): Promise<Connection> {
    const { hostname, port } = new URL(url);
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      try {
        const socket: Socket = await new Promise((resolve, reject) => {
          const s = tcpConnect(Number(port), hostname, () => resolve(s));
          s.once("error", reject);
        });
        const conn = new Connection(socket, socket, () => socket.destroy());
        // A forwarder (adb forward, iproxy) accepts before the app listens; only a response proves the app is up.
        // hello is stateless (PROTOCOL.md §3), so the caller's own hello after this one is harmless.
        // An app suspended in the background still accepts on its port but never answers, so each try is bounded.
        let timer: ReturnType<typeof setTimeout> | undefined;
        const silent = new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(NO_ANSWER)), HELLO_TIMEOUT_MS);
        });
        try {
          const hello = await Promise.race([conn.request("hello", { protocol: PROTOCOL_VERSION }), silent]);
          if (app && hello.ok && hello.app !== app) {
            throw new Error(`connected to app "${hello.app}", expected "${app}": another nativestep app holds the port; quit it and run again`);
          }
        } catch (e) {
          conn.close();
          throw e;
        } finally {
          clearTimeout(timer);
        }
        return conn;
      } catch (e) {
        if (Date.now() > deadline) throw new Error(`cannot connect to ${url}: ${(e as Error).message}`);
        await new Promise((r) => setTimeout(r, 250));
      }
    }
  }

  request(cmd: string, fields: Record<string, unknown> = {}): Promise<Record<string, any>> {
    const run = this.queue.then(() => this.send(cmd, fields));
    this.queue = run.catch(() => {});
    return run;
  }

  close() {
    this.closedReason ??= "closed";
    this.dispose();
  }

  private send(cmd: string, fields: Record<string, unknown>): Promise<Record<string, any>> {
    if (this.closedReason) return Promise.reject(new Error(this.closedReason));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.waiting = (line) => {
        if (line === "") return reject(new Error(this.closedReason ?? "empty line"));
        let msg: Record<string, any>;
        try {
          msg = JSON.parse(line);
        } catch {
          return reject(new Error(`target wrote a non-JSON line to the protocol stream: ${line.slice(0, 200)}`));
        }
        if (msg.id !== id) return reject(new Error(`expected response ${id}, got ${msg.id}`));
        resolve(msg);
      };
      this.output.write(JSON.stringify({ id, cmd, ...fields }) + "\n");
    });
  }

  private fail(reason: string) {
    this.closedReason ??= reason;
    this.onClosed(this.closedReason);
    const resolve = this.waiting;
    this.waiting = null;
    resolve?.("");
  }
}
