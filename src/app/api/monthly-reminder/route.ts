/**
 * Monthly log-status reminder — fires every Friday via Vercel Cron,
 * but only sends on the first Friday of the month (day ≤ 7).
 *
 * Shows every month since tracking started and flags which ones are
 * missing so the user knows exactly what to submit.
 *
 * Required env vars:
 *   RESEND_API_KEY              — from resend.com
 *   DIGEST_RECIPIENT_EMAIL      — who receives the email
 *   DIGEST_FROM_EMAIL           — verified sender address in Resend
 *   CRON_SECRET                 — set in Vercel, secures this endpoint
 *   NEXT_PUBLIC_SUPABASE_URL    — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY   — service role key (bypasses RLS for server reads)
 *
 * Optional:
 *   NEXT_PUBLIC_APP_URL         — full URL of the deployed app for the CTA link
 */

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

function isAuthorized(req: NextRequest): boolean {
  if (
    process.env.NODE_ENV !== "production" &&
    req.nextUrl.searchParams.get("force") === "true"
  ) {
    return true;
  }
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

// Standard cron can't express "first Friday". We schedule every Friday and
// skip early if today is not in the first week of the month.
// Pass ?force=true in development to bypass this check for testing.
function isFirstFridayOfMonth(req: NextRequest): boolean {
  if (
    process.env.NODE_ENV !== "production" &&
    req.nextUrl.searchParams.get("force") === "true"
  ) {
    return true;
  }
  const today = new Date();
  return today.getDay() === 5 && today.getDate() <= 7;
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function prevMonthYYYYMM(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthRange(startYYYYMM: string, endYYYYMM: string): string[] {
  const months: string[] = [];
  let [y, m] = startYYYYMM.split("-").map(Number);
  const [ey, em] = endYYYYMM.split("-").map(Number);
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return months;
}

function fmtMonth(yyyyMM: string): string {
  const [y, m] = yyyyMM.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MonthStatus = {
  yyyyMM: string;
  submitted: boolean;
  totalHours: number | null;
};

type ProfileReport = {
  name: string;
  months: MonthStatus[];
  submittedCount: number;
  missingCount: number;
};

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isFirstFridayOfMonth(req)) {
    return NextResponse.json({ message: "Not first Friday of month — skipping" }, { status: 200 });
  }

  const recipientEmail = process.env.DIGEST_RECIPIENT_EMAIL;
  const fromEmail = process.env.DIGEST_FROM_EMAIL ?? "onboarding@resend.dev";
  const resendKey = process.env.RESEND_API_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://bcbadash.vercel.app";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!recipientEmail || !resendKey) {
    return NextResponse.json(
      { error: "DIGEST_RECIPIENT_EMAIL and RESEND_API_KEY must be set" },
      { status: 500 },
    );
  }

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set" },
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, name")
    .order("sort_order");

  if (profilesError || !profiles?.length) {
    return NextResponse.json({ message: "No profiles found — skipping" }, { status: 200 });
  }

  const endMonth = prevMonthYYYYMM();
  const reports: ProfileReport[] = [];

  for (const profile of profiles) {
    const { data: balance } = await supabase
      .from("opening_balances")
      .select("as_of_date")
      .eq("profile_id", profile.id)
      .maybeSingle();

    if (!balance?.as_of_date) continue;

    const startMonth = (balance.as_of_date as string).substring(0, 7);
    if (startMonth > endMonth) continue;

    const expected = monthRange(startMonth, endMonth);

    const { data: logs } = await supabase
      .from("monthly_logs")
      .select("month_start, restricted_hours, unrestricted_hours")
      .eq("profile_id", profile.id);

    const logsByMonth = new Map<string, { restricted: number; unrestricted: number }>();
    for (const log of logs ?? []) {
      const key = (log.month_start as string).substring(0, 7);
      logsByMonth.set(key, {
        restricted: log.restricted_hours as number,
        unrestricted: log.unrestricted_hours as number,
      });
    }

    const months: MonthStatus[] = expected.map((m) => {
      const entry = logsByMonth.get(m);
      return {
        yyyyMM: m,
        submitted: entry !== undefined,
        totalHours: entry ? entry.restricted + entry.unrestricted : null,
      };
    });

    reports.push({
      name: profile.name,
      months,
      submittedCount: months.filter((m) => m.submitted).length,
      missingCount: months.filter((m) => !m.submitted).length,
    });
  }

  if (!reports.length) {
    return NextResponse.json({ message: "No profiles with data — skipping" }, { status: 200 });
  }

  const totalMissing = reports.reduce((sum, r) => sum + r.missingCount, 0);
  const subject =
    totalMissing > 0
      ? `⚠️ BCBA Hours — ${totalMissing} month${totalMissing > 1 ? "s" : ""} missing`
      : `✅ BCBA Hours — all months submitted`;

  const html = buildEmailHtml({ reports, appUrl });

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

  return NextResponse.json({ message: `Monthly reminder sent to ${recipientEmail}` });
}

// ---------------------------------------------------------------------------
// Email HTML
// ---------------------------------------------------------------------------

function buildEmailHtml({ reports, appUrl }: { reports: ProfileReport[]; appUrl: string }): string {
  const totalMissing = reports.reduce((sum, r) => sum + r.missingCount, 0);
  const allGood = totalMissing === 0;

  const summaryColor = allGood ? "#2d7a5a" : "#d97706";
  const summaryBg = allGood ? "#f0fdf4" : "#fffbeb";
  const summaryEmoji = allGood ? "✅" : "⚠️";
  const summaryText = allGood
    ? "All months are submitted. Nothing to do!"
    : `${totalMissing} month${totalMissing > 1 ? "s are" : " is"} missing — open the dashboard to submit.`;

  const profileSections = reports.map((r) => buildProfileSection(r)).join("");

  const sentMonth = fmtMonth(prevMonthYYYYMM());

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5efe4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:#fffaf2;border-radius:16px;border:1px solid #dccfbe;overflow:hidden;">

    <!-- Header -->
    <div style="background:#122922;padding:24px 28px;">
      <p style="margin:0 0 4px;font-size:11px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.2em;">BCBA Hours Tracker</p>
      <p style="margin:0;font-size:20px;font-weight:600;color:#fff;">Monthly log status</p>
      <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.55);">${sentMonth} check-in</p>
    </div>

    <!-- Summary badge -->
    <div style="padding:20px 28px 0;">
      <div style="background:${summaryBg};border-radius:12px;padding:16px 20px;">
        <p style="margin:0 0 4px;font-size:20px;font-weight:700;color:${summaryColor};">${summaryEmoji} ${allGood ? "All submitted" : `${totalMissing} missing`}</p>
        <p style="margin:0;font-size:13px;color:${summaryColor};line-height:1.5;">${summaryText}</p>
      </div>
    </div>

    <!-- Per-profile month tables -->
    ${profileSections}

    <!-- CTA -->
    <div style="padding:24px 28px 28px;">
      <a href="${appUrl}" style="display:block;background:#122922;color:#fff;text-decoration:none;padding:14px 24px;border-radius:12px;text-align:center;font-size:14px;font-weight:600;">
        Open dashboard →
      </a>
    </div>

    <!-- Footer -->
    <div style="padding:0 28px 20px;">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
        Sent on the first Friday of each month.
      </p>
    </div>

  </div>
</body>
</html>`;
}

function buildProfileSection(report: ProfileReport): string {
  const rows = report.months
    .slice()
    .reverse()
    .map((m) => {
      const isRecent = m.yyyyMM === prevMonthYYYYMM();
      const rowBg = m.submitted
        ? isRecent
          ? "#f0fdf4"
          : "transparent"
        : isRecent
          ? "#fef2f2"
          : "#fffbeb";
      const statusColor = m.submitted ? "#2d7a5a" : "#d97706";
      const statusText = m.submitted ? "✓ Submitted" : "✗ Missing";
      const hoursText = m.totalHours !== null ? `${m.totalHours.toFixed(1)} hrs` : "—";

      return `<tr style="background:${rowBg};">
        <td style="padding:10px 12px;font-size:13px;color:#122922;border-bottom:1px solid #ede3d7;">${fmtMonth(m.yyyyMM)}</td>
        <td style="padding:10px 12px;font-size:13px;font-weight:600;color:${statusColor};border-bottom:1px solid #ede3d7;">${statusText}</td>
        <td style="padding:10px 12px;font-size:13px;color:#6d8278;text-align:right;border-bottom:1px solid #ede3d7;">${hoursText}</td>
      </tr>`;
    })
    .join("");

  const headerLabel =
    report.submittedCount === report.months.length
      ? `${report.submittedCount} / ${report.months.length} — all good`
      : `${report.submittedCount} / ${report.months.length} submitted · ${report.missingCount} missing`;

  return `
    <div style="padding:20px 28px 0;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;">
        <p style="margin:0;font-size:14px;font-weight:600;color:#122922;">${report.name}</p>
        <p style="margin:0;font-size:12px;color:#6d8278;">${headerLabel}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid #dccfbe;">
        <thead>
          <tr style="background:#f5efe4;">
            <th style="padding:8px 12px;font-size:11px;color:#6d8278;text-align:left;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;">Month</th>
            <th style="padding:8px 12px;font-size:11px;color:#6d8278;text-align:left;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;">Status</th>
            <th style="padding:8px 12px;font-size:11px;color:#6d8278;text-align:right;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;">Hours</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}
