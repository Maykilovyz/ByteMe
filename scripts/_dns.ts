import { lookup } from "node:dns/promises";
export async function dns(host: string) {
  const todos = await lookup(host, { all: true });
  return todos.map((a) => `IPv${a.family}`);
}
