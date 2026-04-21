/**
 * Temporary debug endpoint — DELETE after diagnosing the Supabase issue.
 * Does NOT expose secret values, only presence/absence and connection status.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const envCheck = {
    NEXT_PUBLIC_SUPABASE_URL: url ? `set (${url.slice(0, 30)}...)` : "MISSING",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: key ? "set" : "MISSING",
  };

  if (!url || !key) {
    return NextResponse.json({ envCheck, error: "Env vars missing — redeploy after setting them in Vercel" });
  }

  const client = createClient(url, key);

  // 1. Check if the table exists and is readable
  const selectResult = await client
    .from("weekly_tracker")
    .select("id")
    .limit(1);

  // 2. Try inserting a test row
  const upsertResult = await client
    .from("weekly_tracker")
    .upsert({
      id: "debug_test",
      config: { test: true, goalDate: "2026-12-31", totalHoursTarget: 2000, restrictedBanked: 0, unrestrictedBanked: 0 },
      weekly_logs: [],
    });

  // 3. Clean up the test row
  await client.from("weekly_tracker").delete().eq("id", "debug_test");

  return NextResponse.json({
    envCheck,
    tableRead: selectResult.error
      ? { error: selectResult.error.message, code: selectResult.error.code }
      : { ok: true, rowCount: selectResult.data?.length ?? 0 },
    tableWrite: upsertResult.error
      ? { error: upsertResult.error.message, code: upsertResult.error.code }
      : { ok: true },
  });
}
