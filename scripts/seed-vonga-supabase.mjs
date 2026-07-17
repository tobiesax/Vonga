import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { vongaProducts } from "../lib/vonga.ts";

const env = readFileSync(".env.local", "utf8");
const get = (key) => {
  const m = env.match(new RegExp(`^${key}=(.*)$`, "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : undefined;
};
const supabase = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"));

const { data: merchant, error: merchantError } = await supabase
  .from("merchants")
  .upsert({ slug: "vonga", name: "Vonga" }, { onConflict: "slug" })
  .select("id")
  .single();
if (merchantError) throw merchantError;
console.log("merchant id:", merchant.id);

const rows = vongaProducts.map((p) => ({
  merchant_id: merchant.id,
  external_id: p.id,
  name: p.name,
  description: p.description,
  price: p.price,
  image: p.image,
  active: true,
}));

const { data, error } = await supabase
  .from("products")
  .upsert(rows, { onConflict: "merchant_id,external_id" })
  .select("external_id");
if (error) throw error;
console.log(`upserted ${data.length} products`);
