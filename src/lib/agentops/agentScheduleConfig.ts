/**
 * Agent work schedule — encoded in agentops_agents.tools (no schema changes).
 * Tool tag: aixia:schedule:<json>
 */

export type AgentScheduleType = "interval" | "cron" | "manual";

export type AgentWorkType =
  | "browser_qa"
  | "system_analysis"
  | "improvement_suggestions"
  | "page_discovery";

export const AGENT_WORK_TYPES: AgentWorkType[] = [
  "browser_qa",
  "system_analysis",
  "improvement_suggestions",
  "page_discovery",
];

export const SCHEDULE_TOOL_PREFIX = "aixia:schedule:";

export type AgentScheduleConfig = {
  enableSchedule: boolean;
  scheduleType: AgentScheduleType;
  intervalMinutes: number;
  cronPreset: string | null;
  allowedWorkTypes: AgentWorkType[];
};

export const DEFAULT_AGENT_SCHEDULE: AgentScheduleConfig = {
  enableSchedule: false,
  scheduleType: "manual",
  intervalMinutes: 30,
  cronPreset: null,
  allowedWorkTypes: ["browser_qa", "system_analysis"],
};

export function isScheduleToolTag(tool: string): boolean {
  return tool.startsWith(SCHEDULE_TOOL_PREFIX);
}

export function stripScheduleFromTools(tools: string[]): string[] {
  return tools.filter((tool) => !isScheduleToolTag(tool));
}

export function encodeScheduleTool(config: AgentScheduleConfig): string {
  return `${SCHEDULE_TOOL_PREFIX}${JSON.stringify(config)}`;
}

export function parseScheduleFromTools(tools: string[]): AgentScheduleConfig {
  const scheduleTool = tools.find(isScheduleToolTag);
  if (!scheduleTool) return { ...DEFAULT_AGENT_SCHEDULE };

  try {
    const json = scheduleTool.slice(SCHEDULE_TOOL_PREFIX.length);
    const parsed = JSON.parse(json) as Partial<AgentScheduleConfig>;
    return {
      enableSchedule: Boolean(parsed.enableSchedule),
      scheduleType: parsed.scheduleType ?? DEFAULT_AGENT_SCHEDULE.scheduleType,
      intervalMinutes:
        typeof parsed.intervalMinutes === "number" && parsed.intervalMinutes > 0
          ? parsed.intervalMinutes
          : DEFAULT_AGENT_SCHEDULE.intervalMinutes,
      cronPreset: typeof parsed.cronPreset === "string" ? parsed.cronPreset : null,
      allowedWorkTypes: Array.isArray(parsed.allowedWorkTypes)
        ? parsed.allowedWorkTypes.filter((value): value is AgentWorkType =>
            AGENT_WORK_TYPES.includes(value as AgentWorkType),
          )
        : [...DEFAULT_AGENT_SCHEDULE.allowedWorkTypes],
    };
  } catch {
    return { ...DEFAULT_AGENT_SCHEDULE };
  }
}

export function mergeScheduleIntoTools(tools: string[], config: AgentScheduleConfig): string[] {
  return [...stripScheduleFromTools(tools), encodeScheduleTool(config)];
}
