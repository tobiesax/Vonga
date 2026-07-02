import { promises as fs } from "node:fs";
import path from "node:path";
import { products } from "./catalog";
import type { StoreData } from "./types";

const file = path.join(process.cwd(), "data", "store.json");
const empty = (): StoreData => ({ products, customers: [], orders: [], events: [] });

export async function readStore(): Promise<StoreData> {
  try { return JSON.parse(await fs.readFile(file, "utf8")) as StoreData; }
  catch { return empty(); }
}

export async function writeStore(data: StoreData) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

export async function updateStore<T>(change: (data: StoreData) => T | Promise<T>): Promise<T> {
  const data = await readStore();
  const result = await change(data);
  await writeStore(data);
  return result;
}
