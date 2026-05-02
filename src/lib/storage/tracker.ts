/**
 * Persistence layer for the weekly BCBA tracker.
 *
 * Strategy:
 *   - When Supabase is configured (i.e. deployed): read/write a single row
 *     in the `weekly_tracker` table. No auth required — the deployment URL
 *     is the only access control needed for a private family tool.
 *   - When Supabase is NOT configured (local dev without env vars): fall
 *     back to localStorage so development works offline.
 *   - localStorage is always kept as a write-through cache so the UI feels
 *     instant; the Supabase write happens in the background.
 */

import type { CandidateConfig, MonthlyLog } from "@/lib/domain/calculator";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/db/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TrackerData = {
  config: CandidateConfig;
  monthlyLogs: MonthlyLog[];
};

// Single row ID — this is intentionally a constant because the whole app is
// one household. If we ever go multi-user, this becomes a user ID.
const TRACKER_ROW_ID = "tracker_v1";
const LOCAL_STORAGE_KEY = "bcba_tracker_v1";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load tracker data. Tries Supabase first when configured; falls back to
 * localStorage. Returns null when no data exists anywhere (first visit).
 */
export async function loadTrackerData(): Promise<TrackerData | null> {
  if (isSupabaseConfigured()) {
    const remote = await loadRemote();
    if (remote) {
      writeLocal(remote); // keep local cache in sync
      return remote;
    }
    // Remote returned nothing — check if we have a local copy to migrate up
    const local = readLocal();
    if (local) {
      await saveTrackerData(local); // push local cache up to Supabase
      return local;
    }
    return null;
  }

  return readLocal();
}

/**
 * Save tracker data. Writes to localStorage immediately (synchronous) and
 * to Supabase in the background when configured. The returned Promise
 * resolves once both writes are attempted.
 */
export async function saveTrackerData(data: TrackerData): Promise<void> {
  writeLocal(data);
  if (isSupabaseConfigured()) {
    await saveRemote(data);
  }
}

/**
 * Trigger a JSON file download of the current data.
 */
export function exportTrackerJson(data: TrackerData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bcba-tracker-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// localStorage (sync, local cache)
// ---------------------------------------------------------------------------

function readLocal(): TrackerData | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isTrackerData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeLocal(data: TrackerData): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage quota exceeded or private browsing — ignore
  }
}

// ---------------------------------------------------------------------------
// Supabase (async, remote source of truth)
// ---------------------------------------------------------------------------

async function loadRemote(): Promise<TrackerData | null> {
  const client = getSupabaseBrowserClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from("weekly_tracker")
      .select("config, weekly_logs")
      .eq("id", TRACKER_ROW_ID)
      .maybeSingle();

    if (error || !data) return null;

    const parsed: unknown = {
      config: data.config,
      monthlyLogs: data.weekly_logs,
    };

    return isTrackerData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function saveRemote(data: TrackerData): Promise<void> {
  const client = getSupabaseBrowserClient();
  if (!client) return;

  try {
    await client.from("weekly_tracker").upsert({
      id: TRACKER_ROW_ID,
      config: data.config,
      weekly_logs: data.monthlyLogs,
    });
  } catch {
    // Remote save failed — local copy is still intact
  }
}

// ---------------------------------------------------------------------------
// Runtime type guard
// ---------------------------------------------------------------------------

function isTrackerData(value: unknown): value is TrackerData {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.config !== "object" || obj.config === null) return false;
  const cfg = obj.config as Record<string, unknown>;
  if (
    typeof cfg.goalDate !== "string" ||
    typeof cfg.totalHoursTarget !== "number" ||
    typeof cfg.restrictedBanked !== "number" ||
    typeof cfg.unrestrictedBanked !== "number"
  )
    return false;
  if (!Array.isArray(obj.monthlyLogs)) return false;
  return true;
}
