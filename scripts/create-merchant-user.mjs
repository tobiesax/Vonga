import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const env = readFileSync(".env.local", "utf8");
const get = (key) => {
  const m = env.match(new RegExp(`^${key}=(.*)$`, "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : undefined;
};
const supabase = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"));

const email = "tobisax@gmail.com";
const password = randomBytes(9).toString("base64").replace(/[+/=]/g, "x");

const { data: userData, error: userError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (userError) throw userError;
console.log("created auth user:", userData.user.id);

const { data: merchant, error: merchantError } = await supabase
  .from("merchants")
  .select("id")
  .eq("slug", "vonga")
  .single();
if (merchantError) throw merchantError;

const { error: memberError } = await supabase
  .from("merchant_members")
  .upsert({ merchant_id: merchant.id, user_id: userData.user.id, role: "owner" }, { onConflict: "merchant_id,user_id" });
if (memberError) throw memberError;

console.log("---");
console.log("email:", email);
console.log("password:", password);
console.log("---");
console.log("merchant_members row created with role owner");
