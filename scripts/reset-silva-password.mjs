import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const EMAIL = "luisa.liboni.ai+silva@gmail.com";
const NEW_PASSWORD = "Companion2026!";

const admin = createClient(url, key, { auth: { persistSession: false } });

const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 200 });
if (listErr) { console.error(listErr); process.exit(1); }
const user = list.users.find((u) => u.email === EMAIL);
if (!user) { console.error(`No user with email ${EMAIL}`); process.exit(1); }

const { error } = await admin.auth.admin.updateUserById(user.id, { password: NEW_PASSWORD });
if (error) { console.error(error); process.exit(1); }

console.log(`✓ Password for ${EMAIL} set to: ${NEW_PASSWORD}`);
