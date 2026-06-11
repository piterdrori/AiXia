/**
 * STAGING-TOOLS-1 — cloud/staging execution metadata for Tools Hub registry entries.
 */

export type ToolRecommendedExecutionMode =
  | "browser-metadata"
  | "vercel-api"
  | "staging-worker"
  | "local-cursor"
  | "owner-gated-staging"
  | "blocked-production";

export type ToolCloudReadinessProfile = {
  cloudExecutionSupported: boolean;
  requiresLocalFilesystem: boolean;
  stagingMetadataOnly: boolean;
  worksWhenLocalOff: boolean;
  productionBlocked: boolean;
  recommendedExecutionMode: ToolRecommendedExecutionMode;
};

const DEFAULT_PROFILE: ToolCloudReadinessProfile = {
  cloudExecutionSupported: false,
  requiresLocalFilesystem: true,
  stagingMetadataOnly: false,
  worksWhenLocalOff: false,
  productionBlocked: true,
  recommendedExecutionMode: "staging-worker",
};

const PROFILES: Record<string, ToolCloudReadinessProfile> = {
  "design-crew-references": {
    cloudExecutionSupported: true,
    requiresLocalFilesystem: false,
    stagingMetadataOnly: false,
    worksWhenLocalOff: true,
    productionBlocked: true,
    recommendedExecutionMode: "browser-metadata",
  },
  "design-shadcn-admin": {
    cloudExecutionSupported: false,
    requiresLocalFilesystem: true,
    stagingMetadataOnly: true,
    worksWhenLocalOff: true,
    productionBlocked: true,
    recommendedExecutionMode: "browser-metadata",
  },
  "design-tailadmin-react": {
    cloudExecutionSupported: false,
    requiresLocalFilesystem: true,
    stagingMetadataOnly: true,
    worksWhenLocalOff: true,
    productionBlocked: true,
    recommendedExecutionMode: "browser-metadata",
  },
  "design-tailadmin-multi": {
    cloudExecutionSupported: false,
    requiresLocalFilesystem: true,
    stagingMetadataOnly: true,
    worksWhenLocalOff: true,
    productionBlocked: true,
    recommendedExecutionMode: "browser-metadata",
  },
  "design-aixia-global-sot": {
    cloudExecutionSupported: true,
    requiresLocalFilesystem: false,
    stagingMetadataOnly: false,
    worksWhenLocalOff: true,
    productionBlocked: true,
    recommendedExecutionMode: "browser-metadata",
  },
  "design-visual-qa-rules": {
    cloudExecutionSupported: true,
    requiresLocalFilesystem: false,
    stagingMetadataOnly: false,
    worksWhenLocalOff: true,
    productionBlocked: true,
    recommendedExecutionMode: "browser-metadata",
  },
  "evidence-tools": {
    cloudExecutionSupported: false,
    requiresLocalFilesystem: true,
    stagingMetadataOnly: false,
    worksWhenLocalOff: false,
    productionBlocked: true,
    recommendedExecutionMode: "staging-worker",
  },
  "et-browser-qa": {
    cloudExecutionSupported: false,
    requiresLocalFilesystem: true,
    stagingMetadataOnly: false,
    worksWhenLocalOff: false,
    productionBlocked: true,
    recommendedExecutionMode: "staging-worker",
  },
  "et-playwright": {
    cloudExecutionSupported: false,
    requiresLocalFilesystem: true,
    stagingMetadataOnly: false,
    worksWhenLocalOff: false,
    productionBlocked: true,
    recommendedExecutionMode: "staging-worker",
  },
  "et-guardrails": {
    cloudExecutionSupported: false,
    requiresLocalFilesystem: true,
    stagingMetadataOnly: false,
    worksWhenLocalOff: false,
    productionBlocked: true,
    recommendedExecutionMode: "staging-worker",
  },
  "code-context-understanding": {
    cloudExecutionSupported: false,
    requiresLocalFilesystem: true,
    stagingMetadataOnly: false,
    worksWhenLocalOff: false,
    productionBlocked: true,
    recommendedExecutionMode: "staging-worker",
  },
  "ccu-codegraph": {
    cloudExecutionSupported: false,
    requiresLocalFilesystem: true,
    stagingMetadataOnly: false,
    worksWhenLocalOff: false,
    productionBlocked: true,
    recommendedExecutionMode: "staging-worker",
  },
  "chat-voice": {
    cloudExecutionSupported: true,
    requiresLocalFilesystem: false,
    stagingMetadataOnly: false,
    worksWhenLocalOff: true,
    productionBlocked: true,
    recommendedExecutionMode: "vercel-api",
  },
  "doubao-llm-api": {
    cloudExecutionSupported: true,
    requiresLocalFilesystem: false,
    stagingMetadataOnly: false,
    worksWhenLocalOff: true,
    productionBlocked: true,
    recommendedExecutionMode: "vercel-api",
  },
  "voice-input-stt": {
    cloudExecutionSupported: true,
    requiresLocalFilesystem: false,
    stagingMetadataOnly: false,
    worksWhenLocalOff: true,
    productionBlocked: true,
    recommendedExecutionMode: "vercel-api",
  },
  "voice-output-tts": {
    cloudExecutionSupported: true,
    requiresLocalFilesystem: false,
    stagingMetadataOnly: false,
    worksWhenLocalOff: true,
    productionBlocked: true,
    recommendedExecutionMode: "vercel-api",
  },
  "memory-coordination-tools": {
    cloudExecutionSupported: true,
    requiresLocalFilesystem: false,
    stagingMetadataOnly: false,
    worksWhenLocalOff: true,
    productionBlocked: true,
    recommendedExecutionMode: "owner-gated-staging",
  },
  "mct-hermes": {
    cloudExecutionSupported: true,
    requiresLocalFilesystem: false,
    stagingMetadataOnly: false,
    worksWhenLocalOff: true,
    productionBlocked: true,
    recommendedExecutionMode: "owner-gated-staging",
  },
  "global-memory": {
    cloudExecutionSupported: true,
    requiresLocalFilesystem: false,
    stagingMetadataOnly: false,
    worksWhenLocalOff: true,
    productionBlocked: true,
    recommendedExecutionMode: "owner-gated-staging",
  },
  "reasoning-layer": {
    cloudExecutionSupported: false,
    requiresLocalFilesystem: true,
    stagingMetadataOnly: false,
    worksWhenLocalOff: false,
    productionBlocked: true,
    recommendedExecutionMode: "local-cursor",
  },
  "build-cursor": {
    cloudExecutionSupported: false,
    requiresLocalFilesystem: true,
    stagingMetadataOnly: false,
    worksWhenLocalOff: false,
    productionBlocked: true,
    recommendedExecutionMode: "local-cursor",
  },
  "website-qa-evidence": {
    cloudExecutionSupported: false,
    requiresLocalFilesystem: true,
    stagingMetadataOnly: false,
    worksWhenLocalOff: false,
    productionBlocked: true,
    recommendedExecutionMode: "staging-worker",
  },
  "build-development": {
    cloudExecutionSupported: false,
    requiresLocalFilesystem: true,
    stagingMetadataOnly: true,
    worksWhenLocalOff: false,
    productionBlocked: true,
    recommendedExecutionMode: "local-cursor",
  },
};

export function getToolCloudReadiness(toolId: string): ToolCloudReadinessProfile {
  return PROFILES[toolId] ?? DEFAULT_PROFILE;
}

export const TOOL_CLOUD_READINESS_FIELD_NAMES = [
  "cloudExecutionSupported",
  "requiresLocalFilesystem",
  "stagingMetadataOnly",
  "worksWhenLocalOff",
  "productionBlocked",
  "recommendedExecutionMode",
] as const;
