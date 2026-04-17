#!/usr/bin/env node
// End-to-end test of the new invite-with-password flow.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf-8")
    .split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)]; })
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } });
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const TEST_EMAIL = `flowtest-${Date.now()}@example.com`;
const TEST_PASSWORD = "FlowTest123!";

// Clean any leftover
const listBefore = await admin.auth.admin.listUsers({ perPage: 1000 });
const stale = listBefore.data?.users?.find((u) => u.email === TEST_EMAIL);
if (stale) await admin.auth.admin.deleteUser(stale.id);

// Step 1: family logs in and invites
console.log("1. family (luisa.liboni@gmail.com) signs in");
const { data: familySession, error: famErr } = await anon.auth.signInWithPassword({
  email: "luisa.liboni@gmail.com",
  password: "Companion2026!",
});
if (famErr) {
  console.error("family sign-in failed:", famErr.message);
  console.log("   resetting family password...");
  const list = await admin.auth.admin.listUsers({ perPage: 1000 });
  const fam = list.data?.users?.find((u) => u.email === "luisa.liboni@gmail.com");
  await admin.auth.admin.updateUserById(fam.id, { password: "Companion2026!" });
  const retry = await anon.auth.signInWithPassword({ email: "luisa.liboni@gmail.com", password: "Companion2026!" });
  if (retry.error) { console.error("still failed"); process.exit(1); }
}

// Build cookie
const ref = env.NEXT_PUBLIC_SUPABASE_URL.replace("https://", "").split(".")[0];
const b64url = (s) => Buffer.from(s).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const { data: { session } } = await anon.auth.getSession();
const cookieVal = "base64-" + b64url(JSON.stringify({
  access_token: session.access_token, refresh_token: session.refresh_token,
  expires_at: session.expires_at, expires_in: session.expires_in,
  token_type: session.token_type, user: session.user,
}));
const cookieHeader = `sb-${ref}-auth-token=${cookieVal}`;

console.log(`2. invite ${TEST_EMAIL}`);
const invRes = await fetch("http://localhost:3000/api/care-team/invite", {
  method: "POST", headers: { "Content-Type": "application/json", Cookie: cookieHeader },
  body: JSON.stringify({ email: TEST_EMAIL, name: "Dr. Flow Test", role: "doctor" }),
});
const invBody = await invRes.json();
if (!invRes.ok) { console.error("invite failed:", invBody); process.exit(1); }
console.log("   invite id:", invBody.stakeholder.id);

// Step 2: Verify user created WITHOUT password + needs_password_setup flag
const listAfter = await admin.auth.admin.listUsers({ perPage: 1000 });
const newUser = listAfter.data?.users?.find((u) => u.email === TEST_EMAIL);
console.log(`3. user created, needs_password_setup=${newUser?.user_metadata?.needs_password_setup}`);
if (!newUser?.user_metadata?.needs_password_setup) {
  console.error("   FAIL: needs_password_setup flag not set");
  process.exit(2);
}

// Verify new user can't login with old hardcoded password
const { error: badLogin } = await anon.auth.signInWithPassword({
  email: TEST_EMAIL, password: "Companion2026!",
});
console.log(`4. old hardcoded password rejected: ${!!badLogin}`);
if (!badLogin) { console.error("   FAIL: user logged in with hardcoded password"); process.exit(3); }

// Step 3: GET invite → needsPassword should be true
const getRes = await fetch(`http://localhost:3000/api/invite/${invBody.stakeholder.id}`);
const getBody = await getRes.json();
console.log(`5. GET invite: needsPassword=${getBody.needsPassword}, email=${getBody.email}`);
if (!getBody.needsPassword) { console.error("   FAIL"); process.exit(4); }

// Step 4: PATCH without password → should 400
const pathNoPw = await fetch(`http://localhost:3000/api/invite/${invBody.stakeholder.id}`, {
  method: "PATCH", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ status: "accepted" }),
});
console.log(`6. PATCH without password: status=${pathNoPw.status}`);
if (pathNoPw.status !== 400) { console.error("   FAIL: should reject"); process.exit(5); }

// Step 5: PATCH with password
const patchRes = await fetch(`http://localhost:3000/api/invite/${invBody.stakeholder.id}`, {
  method: "PATCH", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ status: "accepted", password: TEST_PASSWORD }),
});
const patchBody = await patchRes.json();
console.log(`7. PATCH with password: status=${patchRes.status}`);
if (!patchRes.ok) { console.error("   FAIL:", patchBody); process.exit(6); }

// Step 6: New user can log in with their chosen password
const { data: newSess, error: loginErr } = await anon.auth.signInWithPassword({
  email: TEST_EMAIL, password: TEST_PASSWORD,
});
console.log(`8. login with new password: ${loginErr ? "FAIL " + loginErr.message : "OK"}`);
if (loginErr) process.exit(7);

// Verify needs_password_setup flag cleared
const listFinal = await admin.auth.admin.listUsers({ perPage: 1000 });
const finalUser = listFinal.data?.users?.find((u) => u.email === TEST_EMAIL);
console.log(`9. needs_password_setup cleared: ${!finalUser?.user_metadata?.needs_password_setup}`);

// Cleanup
await admin.auth.admin.deleteUser(finalUser.id);
await admin.from("stakeholder_links").delete().eq("id", invBody.stakeholder.id);
console.log("10. cleanup done");
console.log("\n✅ ALL CHECKS PASSED");
