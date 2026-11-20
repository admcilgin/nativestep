import { expect, test } from "bun:test";
import { createServer, type Socket } from "node:net";
import { Connection } from "../src/connection.ts";

test("a port that accepts but never answers hello fails with the cause, before the deadline", async () => {
  const held: Socket[] = [];
  const server = createServer((s) => held.push(s)); // a suspended app: the kernel accepts, nobody reads
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port;
  const started = Date.now();
  await expect(Connection.tcp(`tcp://127.0.0.1:${port}`, 1000)).rejects.toThrow("nothing answers hello");
  expect(Date.now() - started).toBeLessThan(8000);
  for (const s of held) s.destroy();
  server.close();
}, 10000);

test("a port that answers hello connects", async () => {
  const server = createServer((s) =>
    s.on("data", (d) => s.write(JSON.stringify({ id: JSON.parse(d.toString()).id, ok: true, protocol: 1 }) + "\n")),
  );
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port;
  const conn = await Connection.tcp(`tcp://127.0.0.1:${port}`, 1000);
  expect((await conn.request("hello", { protocol: 1 })).ok).toBe(true);
  conn.close();
  server.close();
});
