/**
 * Weekly digest email — fires every Sunday at 8 PM UTC via Vercel Cron.
 * Reads the tracker data from Supabase, builds a snapshot, and sends one
 * plain-readable email to DIGEST_RECIPIENT_EMAIL.
 *
 * Required env vars:
 *   RESEND_API_KEY           — from resend.com
 *   DIGEST_RECIPIENT_EMAIL   — who receives the email (e.g. your wife)
 *   DIGEST_FROM_EMAIL        — sender address (must be verified in Resend)
 *   CRON_SECRET              — set in Vercel, used to secure this endpoint
 *
 * Optional:
 *   NEXT_PUBLIC_APP_URL      — full URL of the deployed app for the CTA link
 */

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

import { buildSnapshot } from "@/lib/domain/calculator";
import type { CandidateConfig, WeeklyLog } from "@/lib/domain/calculator";

// ---------------------------------------------------------------------------
// Auth guard — Vercel attaches Authorization: Bearer <CRON_SECRET> on cron
// calls. Reject anything else so the endpoint can't be triggered externally.
// ---------------------------------------------------------------------------

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // no secret = always locked
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recipientEmail = process.env.DIGEST_RECIPIENT_EMAIL;
  const fromEmail = process.env.DIGEST_FROM_EMAIL ?? "onboarding@resend.dev";
  const resendKey = process.env.RESEND_API_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://bcbadash.vercel.app";

  if (!recipientEmail || !resendKey) {
    return NextResponse.json(
      { error: "DIGEST_RECIPIENT_EMAIL and RESEND_API_KEY must be set" },
      { status: 500 },
    );
  }

  // Load tracker data from Supabase
  const trackerData = await loadTrackerDataServer();
  if (!trackerData) {
    return NextResponse.json(
      { message: "No tracker data found — skipping digest" },
      { status: 200 },
    );
  }

  const snapshot = buildSnapshot(trackerData.config, trackerData.weeklyLogs);
  const name = trackerData.config.name ?? "Sol";
  const subject = buildSubject(name, snapshot.status);
  const html = buildEmailHtml({ name, snapshot, appUrl });

  const resend = new Resend(resendKey);
  const { error } = await resend.emails.send({
    from: fromEmail,
    to: recipientEmail,
    subject,
    html,
  });

  if (error) {
    console.error("Resend error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: `Digest sent to ${recipientEmail}` });
}

// ---------------------------------------------------------------------------
// Supabase server read (uses anon key — RLS is disabled on weekly_tracker)
// ---------------------------------------------------------------------------

async function loadTrackerDataServer(): Promise<{
  config: CandidateConfig;
  weeklyLogs: WeeklyLog[];
} | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  const client = createClient(url, key);
  const { data, error } = await client
    .from("weekly_tracker")
    .select("config, weekly_logs")
    .eq("id", "tracker_v1")
    .maybeSingle();

  if (error || !data) return null;

  return {
    config: data.config as CandidateConfig,
    weeklyLogs: data.weekly_logs as WeeklyLog[],
  };
}

// ---------------------------------------------------------------------------
// Email content
// ---------------------------------------------------------------------------

function buildSubject(name: string, status: string): string {
  const emoji = status === "AHEAD" ? "✅" : status === "ON TRACK" ? "✅" : "⚠️";
  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${emoji} ${name}'s flight path — ${today}`;
}

function buildEmailHtml({
  name,
  snapshot,
  appUrl,
}: {
  name: string;
  snapshot: ReturnType<typeof buildSnapshot>;
  appUrl: string;
}): string {
  const statusColor =
    snapshot.status === "BEHIND"
      ? snapshot.weeklyDeficitSurplus / snapshot.requiredWeeklyPace < -0.2
        ? "#dc2626"
        : "#d97706"
      : "#2d7a5a";

  const statusBg =
    snapshot.status === "BEHIND"
      ? snapshot.weeklyDeficitSurplus / snapshot.requiredWeeklyPace < -0.2
        ? "#fef2f2"
        : "#fffbeb"
      : "#f0fdf4";

  const projectedDateStr = snapshot.projectedCompletionDate
    ? new Date(snapshot.projectedCompletionDate + "T12:00:00").toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const pct = Math.min(100, (snapshot.totalHoursBanked / snapshot.totalHoursTarget) * 100);

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5efe4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:480px;margin:32px auto;background:#fffaf2;border-radius:16px;border:1px solid #dccfbe;overflow:hidden;">

    <!-- Header -->
    <div style="background:#122922;padding:24px 28px;">
      <p style="margin:0 0 4px;font-size:11px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.2em;">BCBA Hours Tracker</p>
      <p style="margin:0;font-size:20px;font-weight:600;color:#fff;">${name}'s weekly flight path</p>
    </div>

    <!-- Status -->
    <div style="padding:20px 28px 0;">
      <div style="background:${statusBg};border-radius:12px;padding:16px 20px;display:inline-block;width:100%;box-sizing:border-box;">
        <p style="margin:0 0 4px;font-size:22px;font-weight:700;color:${statusColor};">${snapshot.status}</p>
        <p style="margin:0;font-size:14px;color:${statusColor};line-height:1.5;">${snapshot.flightPathSentence}</p>
      </div>
    </div>

    <!-- Three numbers -->
    <div style="padding:20px 28px 0;display:flex;gap:12px;">
      <div style="flex:1;background:#f5efe4;border-radius:10px;padding:14px 16px;">
        <p style="margin:0 0 4px;font-size:10px;color:#6d8278;text-transform:uppercase;letter-spacing:0.15em;">Required pace</p>
        <p style="margin:0;font-size:22px;font-weight:700;color:#122922;">${snapshot.requiredWeeklyPace.toFixed(1)}</p>
        <p style="margin:0;font-size:11px;color:#6d8278;">hrs / week</p>
      </div>
      <div style="flex:1;background:#f5efe4;border-radius:10px;padding:14px 16px;">
        <p style="margin:0 0 4px;font-size:10px;color:#6d8278;text-transform:uppercase;letter-spacing:0.15em;">Actual pace</p>
        <p style="margin:0;font-size:22px;font-weight:700;color:#122922;">${snapshot.fourWeekRollingAverage > 0 ? snapshot.fourWeekRollingAverage.toFixed(1) : "—"}</p>
        <p style="margin:0;font-size:11px;color:#6d8278;">${snapshot.fourWeekRollingAverage > 0 ? "4-wk avg" : "no logs yet"}</p>
      </div>
      <div style="flex:1;background:${statusBg};border-radius:10px;padding:14px 16px;">
        <p style="margin:0 0 4px;font-size:10px;color:#6d8278;text-transform:uppercase;letter-spacing:0.15em;">${snapshot.weeklyDeficitSurplus >= 0 ? "Surplus" : "Deficit"}</p>
        <p style="margin:0;font-size:22px;font-weight:700;color:${statusColor};">${snapshot.fourWeekRollingAverage > 0 ? (snapshot.weeklyDeficitSurplus >= 0 ? "+" : "") + snapshot.weeklyDeficitSurplus.toFixed(1) : "—"}</p>
        <p style="margin:0;font-size:11px;color:#6d8278;">hrs / week</p>
      </div>
    </div>

    <!-- Progress bar -->
    <div style="padding:20px 28px 0;">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <span style="font-size:12px;color:#6d8278;">Total progress</span>
        <span style="font-size:12px;font-weight:600;color:#122922;">${pct.toFixed(1)}%</span>
      </div>
      <div style="height:8px;background:#dccfbe;border-radius:99px;overflow:hidden;">
        <div style="height:100%;width:${pct.toFixed(1)}%;background:#2d7a5a;border-radius:99px;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:4px;">
        <span style="font-size:11px;color:#6d8278;">${snapshot.totalHoursBanked.toFixed(0)} hrs banked</span>
        <span style="font-size:11px;color:#6d8278;">${snapshot.totalHoursTarget} hrs goal</span>
      </div>
    </div>

    ${
      projectedDateStr
        ? `<!-- Projected finish -->
    <div style="padding:16px 28px 0;">
      <p style="margin:0;font-size:13px;color:#6d8278;">
        Projected finish: <strong style="color:${statusColor};">${projectedDateStr}</strong>
        ${snapshot.daysLateOrEarly !== null && snapshot.daysLateOrEarly !== 0
          ? ` — ${Math.abs(snapshot.daysLateOrEarly)} days ${snapshot.daysLateOrEarly > 0 ? "late" : "early"}`
          : ""}
      </p>
    </div>`
        : ""
    }

    <!-- CTA -->
    <div style="padding:24px 28px 28px;">
      <a href="${appUrl}" style="display:block;background:#122922;color:#fff;text-decoration:none;padding:14px 24px;border-radius:12px;text-align:center;font-size:14px;font-weight:600;">
        Open dashboard →
      </a>
    </div>

    <!-- Footer -->
    <div style="padding:0 28px 20px;">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
        Sent every Sunday. You're receiving this because someone who loves you set it up.
      </p>
    </div>

  </div>
</body>
</html>`;
}
