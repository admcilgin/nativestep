// Plain text for people, `--json` for machines (COMPONENTS.md §1). No colors or spinners.

interface Schema {
  type: string;
  properties?: Record<string, Schema>;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  enum?: string[];
  items?: Schema;
}

function describe(s: Schema): string {
  const limits = [
    s.minimum !== undefined && `≥${s.minimum}`,
    s.maximum !== undefined && `≤${s.maximum}`,
    s.minLength !== undefined && `length≥${s.minLength}`,
    s.maxLength !== undefined && `length≤${s.maxLength}`,
    s.enum && s.enum.join("|"),
  ].filter(Boolean);
  if (s.type === "object") return `{ ${Object.entries(s.properties ?? {}).map(([k, v]) => `${k}: ${describe(v)}`).join(", ")} }`;
  if (s.type === "array") return `${describe(s.items!)}[]`;
  return limits.length ? `${s.type} ${limits.join(" ")}` : s.type;
}

export function printResponse(res: Record<string, any>, json: boolean): void {
  if (json) return console.log(JSON.stringify(res));
  if (!res.ok) return printError(res.error);
  if (!res.node) return console.log("ok");
  const { node, path, busy } = res;
  const lines = [path.join(" › ") + (busy ? "   (busy: effects in flight)" : ""), "", "state", indent(JSON.stringify(node.state, null, 2)), "", "actions"];
  const width = Math.max(...node.actions.map((a: any) => a.name.length), 4);
  for (const a of node.actions) {
    const extra = [a.input && `input ${describe(a.input)}`, a.lentBy && `lent by ${a.lentBy}`].filter(Boolean).join(", ");
    lines.push(`  ${a.name.padEnd(width)}  ${a.title}${extra ? `   (${extra})` : ""}`);
  }
  if (!node.actions.length) lines.push("  (none)");
  console.log(lines.join("\n"));
}

export function printError(error: Record<string, any>): void {
  const { code, message, ...extra } = error;
  console.log(`error: ${code}: ${message ?? ""}`);
  for (const [k, v] of Object.entries(extra)) console.log(`  ${k}: ${Array.isArray(v) && v.every((x) => typeof x === "string") ? v.join(", ") : JSON.stringify(v)}`);
}

function indent(text: string): string {
  return text.replace(/^/gm, "  ");
}
