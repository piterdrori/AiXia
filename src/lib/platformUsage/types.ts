export type PlatformUsageEmployee = {
  user_id: string;
  full_name: string | null;
  role: string | null;
};

export type PlatformUsageDailyRow = {
  usage_date: string;
  active_seconds: number;
};

export type PlatformUsageRawRow = PlatformUsageDailyRow & {
  user_id: string;
};

export type PlatformUsageUserSummary = {
  user_id: string;
  active_seconds: number;
  name: string;
  role: string;
};

export const PLATFORM_USAGE_ALL_EMPLOYEES = "__all__";

export const PLATFORM_USAGE_MIGRATION_HINT =
  "Apply migration supabase/migrations/20260517120000_user_daily_platform_usage.sql on your Supabase project, then reload the API schema.";
