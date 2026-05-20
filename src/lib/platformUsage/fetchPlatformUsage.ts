import { supabase } from "@/lib/supabase";
import {
  PLATFORM_USAGE_MIGRATION_HINT,
  type PlatformUsageRawRow,
} from "./types";

export type FetchPlatformUsageResult = {
  rows: PlatformUsageRawRow[];
  error: string | null;
  migrationRequired: boolean;
};

function isMissingUsageTable(message: string, code?: string): boolean {
  const m = message.toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    m.includes("does not exist") ||
    m.includes("schema cache") ||
    m.includes("could not find the table") ||
    m.includes("user_daily_platform_usage")
  );
}

/** Admin-only query: daily usage rows in an inclusive date range. */
export async function fetchPlatformUsageRows(options: {
  from: string;
  to: string;
  userId?: string | null;
}): Promise<FetchPlatformUsageResult> {
  let query = supabase
    .from("user_daily_platform_usage")
    .select("user_id, usage_date, active_seconds")
    .gte("usage_date", options.from)
    .lte("usage_date", options.to)
    .order("usage_date", { ascending: false });

  if (options.userId) {
    query = query.eq("user_id", options.userId);
  }

  const { data, error } = await query;

  if (error) {
    const migrationRequired = isMissingUsageTable(error.message, error.code);
    return {
      rows: [],
      migrationRequired,
      error: migrationRequired
        ? PLATFORM_USAGE_MIGRATION_HINT
        : error.message || "Could not load platform usage.",
    };
  }

  return {
    rows: (data || []) as PlatformUsageRawRow[],
    error: null,
    migrationRequired: false,
  };
}
