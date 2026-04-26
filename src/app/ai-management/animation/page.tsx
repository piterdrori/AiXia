import { useEffect, useMemo, useState } from "react";
import type { ElementType, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Archive,
  Bot,
  Box,
  Brain,
  CheckCircle2,
  CircleDot,
  Cuboid,
  FileJson,
  Gauge,
  Image,
  Lock,
  MessageCircle,
  Mic2,
  MonitorPlay,
  PauseCircle,
  Power,
  RefreshCcw,
  Save,
  Smile,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
  Video,
  Waves,
  Zap,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type AnimationEngine = "internal" | "zego";
type AnimationMode =
  | "orb"
  | "waveform"
  | "robot"
  | "hologram"
  | "mascot"
  | "uploaded_asset";
type AnimationState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "paused"
  | "error";

type AvatarAssetType = "image" | "gif" | "video" | "lottie" | "glb" | "gltf";

type AnimationSettings = {
  engine: AnimationEngine;
  zegoEnabled: boolean;
  mode: AnimationMode;
  previewState: AnimationState;
  intensity: number;
  motionSpeed: number;
  glowStrength: number;
  pulseStrength: number;
  showParticles: boolean;
  showWaveform: boolean;
  showStatusText: boolean;
  lipSyncEnabled: boolean;
  voiceReactiveEnabled: boolean;
  selectedAssetId: string;
};

type AiSettingRow = {
  setting_key: string;
  setting_value: {
    value?: unknown;
  } | null;
};

type AvatarAsset = {
  id: string;
  name: string;
  asset_type: AvatarAssetType;
  bucket_id: string;
  storage_path: string;
  mime_type: string;
  file_size_bytes: number;
  status: "active" | "archived" | "deleted";
  is_selected: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
};

type AvatarAssetWithUrl = AvatarAsset & {
  signedUrl: string | null;
};

const AVATAR_BUCKET = "ai-avatar-assets";

const defaultSettings: AnimationSettings = {
  engine: "internal",
  zegoEnabled: false,
  mode: "orb",
  previewState: "idle",
  intensity: 72,
  motionSpeed: 58,
  glowStrength: 76,
  pulseStrength: 64,
  showParticles: true,
  showWaveform: true,
  showStatusText: true,
  lipSyncEnabled: true,
  voiceReactiveEnabled: true,
  selectedAssetId: "",
};

const animationSettingKeys = [
  "animation_engine",
  "animation_zego_enabled",
  "animation_avatar_mode",
  "animation_default_state",
  "animation_intensity",
  "animation_motion_speed",
  "animation_glow_strength",
  "animation_pulse_strength",
  "animation_show_particles",
  "animation_show_waveform",
  "animation_show_status_text",
  "animation_lip_sync_enabled",
  "animation_voice_reactive_enabled",
  "animation_selected_asset_id",
] as const;

const modes: Array<{
  id: AnimationMode;
  label: string;
  description: string;
  icon: ElementType;
}> = [
  {
    id: "orb",
    label: "Orb",
    description: "Premium glowing AiXia orb.",
    icon: CircleDot,
  },
  {
    id: "waveform",
    label: "Waveform",
    description: "Audio-reactive signal.",
    icon: Waves,
  },
  {
    id: "robot",
    label: "Robot",
    description: "Friendly AiXia robot.",
    icon: Bot,
  },
  {
    id: "hologram",
    label: "Hologram",
    description: "Projection avatar.",
    icon: MonitorPlay,
  },
  {
    id: "mascot",
    label: "Mascot",
    description: "Brand character.",
    icon: Smile,
  },
  {
    id: "uploaded_asset",
    label: "Uploaded",
    description: "Use selected uploaded asset.",
    icon: Upload,
  },
];

const states: Array<{
  id: AnimationState;
  label: string;
  description: string;
  icon: ElementType;
}> = [
  {
    id: "idle",
    label: "Idle",
    description: "Ready and waiting.",
    icon: CircleDot,
  },
  {
    id: "listening",
    label: "Listening",
    description: "User is speaking.",
    icon: Mic2,
  },
  {
    id: "thinking",
    label: "Thinking",
    description: "Router is preparing.",
    icon: Brain,
  },
  {
    id: "speaking",
    label: "Speaking",
    description: "AiXia is replying.",
    icon: MessageCircle,
  },
  {
    id: "paused",
    label: "Paused",
    description: "Conversation paused.",
    icon: PauseCircle,
  },
  {
    id: "error",
    label: "Error",
    description: "Connection issue.",
    icon: Lock,
  },
];

function getStateLabel(state: AnimationState) {
  return states.find((item) => item.id === state)?.label ?? "Idle";
}

function getStateTone(state: AnimationState) {
  if (state === "listening") return "violet";
  if (state === "thinking") return "amber";
  if (state === "speaking") return "cyan";
  if (state === "paused") return "slate";
  if (state === "error") return "rose";
  return "emerald";
}

function isAnimationEngine(value: unknown): value is AnimationEngine {
  return value === "internal" || value === "zego";
}

function isAnimationMode(value: unknown): value is AnimationMode {
  return (
    value === "orb" ||
    value === "waveform" ||
    value === "robot" ||
    value === "hologram" ||
    value === "mascot" ||
    value === "uploaded_asset"
  );
}

function isAnimationState(value: unknown): value is AnimationState {
  return (
    value === "idle" ||
    value === "listening" ||
    value === "thinking" ||
    value === "speaking" ||
    value === "paused" ||
    value === "error"
  );
}

function clampNumber(value: unknown, fallback: number) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) return fallback;

  return Math.min(100, Math.max(0, numericValue));
}

function readBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }

  return fallback;
}

function getAssetType(file: File): AvatarAssetType | null {
  const cleanName = file.name.toLowerCase();

  if (file.type === "image/gif" || cleanName.endsWith(".gif")) return "gif";
  if (
    file.type === "image/png" ||
    file.type === "image/jpeg" ||
    file.type === "image/webp" ||
    cleanName.endsWith(".png") ||
    cleanName.endsWith(".jpg") ||
    cleanName.endsWith(".jpeg") ||
    cleanName.endsWith(".webp")
  ) {
    return "image";
  }

  if (
    file.type === "video/webm" ||
    file.type === "video/mp4" ||
    cleanName.endsWith(".webm") ||
    cleanName.endsWith(".mp4")
  ) {
    return "video";
  }

  if (
    file.type === "application/json" ||
    cleanName.endsWith(".json") ||
    cleanName.endsWith(".lottie")
  ) {
    return "lottie";
  }

  if (
    file.type === "model/gltf-binary" ||
    cleanName.endsWith(".glb")
  ) {
    return "glb";
  }

  if (
    file.type === "model/gltf+json" ||
    cleanName.endsWith(".gltf")
  ) {
    return "gltf";
  }

  return null;
}

function getSafeFileName(fileName: string) {
  return fileName
    .trim()
    .replace(/[^a-zA-Z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export default function AIAnimationPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AnimationSettings>(defaultSettings);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [assets, setAssets] = useState<AvatarAssetWithUrl[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [uploadingAsset, setUploadingAsset] = useState(false);

  const currentMode = useMemo(
    () => modes.find((mode) => mode.id === settings.mode) ?? modes[0],
    [settings.mode]
  );

  const selectedAsset = useMemo(
    () =>
      assets.find((asset) => asset.id === settings.selectedAssetId) ??
      assets.find((asset) => asset.is_selected) ??
      null,
    [assets, settings.selectedAssetId]
  );

  const engineLabel = settings.zegoEnabled ? "ZEGO Digital Human" : "Internal AiXia";

  useEffect(() => {
    void loadSettings();
    void loadAssets();
  }, []);

  function updateSetting<K extends keyof AnimationSettings>(
    key: K,
    value: AnimationSettings[K]
  ) {
    setSavedMessage(null);
    setErrorMessage(null);
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function setZegoEnabled(enabled: boolean) {
    setSavedMessage(null);
    setErrorMessage(null);
    setSettings((current) => ({
      ...current,
      zegoEnabled: enabled,
      engine: enabled ? "zego" : "internal",
    }));
  }

  async function loadSettings() {
    setLoadingSettings(true);
    setErrorMessage(null);
    setSavedMessage(null);

    const { data, error } = await supabase
      .from("ai_settings")
      .select("setting_key, setting_value")
      .in("setting_key", animationSettingKeys as unknown as string[]);

    if (error) {
      setErrorMessage(error.message);
      setLoadingSettings(false);
      return;
    }

    const rows = (data ?? []) as AiSettingRow[];
    const nextSettings = { ...defaultSettings };

    for (const row of rows) {
      const savedValue = row.setting_value?.value;

      if (row.setting_key === "animation_engine" && isAnimationEngine(savedValue)) {
        nextSettings.engine = savedValue;
        nextSettings.zegoEnabled = savedValue === "zego";
      }

      if (row.setting_key === "animation_zego_enabled") {
        nextSettings.zegoEnabled = readBoolean(savedValue, nextSettings.zegoEnabled);
        nextSettings.engine = nextSettings.zegoEnabled ? "zego" : "internal";
      }

      if (row.setting_key === "animation_avatar_mode" && isAnimationMode(savedValue)) {
        nextSettings.mode = savedValue;
      }

      if (row.setting_key === "animation_default_state" && isAnimationState(savedValue)) {
        nextSettings.previewState = savedValue;
      }

      if (row.setting_key === "animation_intensity") {
        nextSettings.intensity = clampNumber(savedValue, nextSettings.intensity);
      }

      if (row.setting_key === "animation_motion_speed") {
        nextSettings.motionSpeed = clampNumber(savedValue, nextSettings.motionSpeed);
      }

      if (row.setting_key === "animation_glow_strength") {
        nextSettings.glowStrength = clampNumber(savedValue, nextSettings.glowStrength);
      }

      if (row.setting_key === "animation_pulse_strength") {
        nextSettings.pulseStrength = clampNumber(savedValue, nextSettings.pulseStrength);
      }

      if (row.setting_key === "animation_show_particles") {
        nextSettings.showParticles = readBoolean(savedValue, nextSettings.showParticles);
      }

      if (row.setting_key === "animation_show_waveform") {
        nextSettings.showWaveform = readBoolean(savedValue, nextSettings.showWaveform);
      }

      if (row.setting_key === "animation_show_status_text") {
        nextSettings.showStatusText = readBoolean(savedValue, nextSettings.showStatusText);
      }

      if (row.setting_key === "animation_lip_sync_enabled") {
        nextSettings.lipSyncEnabled = readBoolean(savedValue, nextSettings.lipSyncEnabled);
      }

      if (row.setting_key === "animation_voice_reactive_enabled") {
        nextSettings.voiceReactiveEnabled = readBoolean(
          savedValue,
          nextSettings.voiceReactiveEnabled
        );
      }

      if (row.setting_key === "animation_selected_asset_id") {
        nextSettings.selectedAssetId =
          typeof savedValue === "string" ? savedValue : nextSettings.selectedAssetId;
      }
    }

    setSettings(nextSettings);
    setLoadingSettings(false);
  }

  async function loadAssets() {
    setLoadingAssets(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("ai_avatar_assets")
      .select(
        "id, name, asset_type, bucket_id, storage_path, mime_type, file_size_bytes, status, is_selected, metadata, created_at"
      )
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setLoadingAssets(false);
      return;
    }

    const rows = (data ?? []) as AvatarAsset[];
    const rowsWithUrls = await Promise.all(
      rows.map(async (asset) => {
        const { data: signedData } = await supabase.storage
          .from(AVATAR_BUCKET)
          .createSignedUrl(asset.storage_path, 60 * 60);

        return {
          ...asset,
          signedUrl: signedData?.signedUrl ?? null,
        };
      })
    );

    setAssets(rowsWithUrls);

    setSettings((current) => {
      if (current.selectedAssetId) return current;

      const selectedRow = rowsWithUrls.find((asset) => asset.is_selected);

      if (!selectedRow) return current;

      return {
        ...current,
        selectedAssetId: selectedRow.id,
      };
    });

    setLoadingAssets(false);
  }

  async function saveSettings() {
    setSavingSettings(true);
    setSavedMessage(null);
    setErrorMessage(null);

    const values: Record<(typeof animationSettingKeys)[number], string | number | boolean> = {
      animation_engine: settings.engine,
      animation_zego_enabled: settings.zegoEnabled,
      animation_avatar_mode: settings.mode,
      animation_default_state: settings.previewState,
      animation_intensity: settings.intensity,
      animation_motion_speed: settings.motionSpeed,
      animation_glow_strength: settings.glowStrength,
      animation_pulse_strength: settings.pulseStrength,
      animation_show_particles: settings.showParticles,
      animation_show_waveform: settings.showWaveform,
      animation_show_status_text: settings.showStatusText,
      animation_lip_sync_enabled: settings.lipSyncEnabled,
      animation_voice_reactive_enabled: settings.voiceReactiveEnabled,
      animation_selected_asset_id: settings.selectedAssetId,
    };

    for (const key of animationSettingKeys) {
      const { error } = await supabase.rpc("ai_update_setting", {
        p_setting_key: key,
        p_setting_value: {
          value: values[key],
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setSavingSettings(false);
        return;
      }
    }

    await supabase.from("ai_admin_activity_logs").insert({
      action_type: "animation_settings_updated",
      entity_type: "ai_animation",
      entity_id: null,
      details: {
        animation_engine: settings.engine,
        animation_zego_enabled: settings.zegoEnabled,
        animation_avatar_mode: settings.mode,
        animation_default_state: settings.previewState,
        animation_intensity: settings.intensity,
        animation_motion_speed: settings.motionSpeed,
        animation_glow_strength: settings.glowStrength,
        animation_pulse_strength: settings.pulseStrength,
        animation_show_particles: settings.showParticles,
        animation_show_waveform: settings.showWaveform,
        animation_show_status_text: settings.showStatusText,
        animation_lip_sync_enabled: settings.lipSyncEnabled,
        animation_voice_reactive_enabled: settings.voiceReactiveEnabled,
        animation_selected_asset_id: settings.selectedAssetId,
      },
    });

    setSavedMessage("Animation settings saved to ai_settings.");
    setSavingSettings(false);
  }

  async function resetSettings() {
    setSettings(defaultSettings);
    setSavedMessage(null);
    setErrorMessage(null);
  }

  async function handleAssetUpload(file: File | null) {
    if (!file || uploadingAsset) return;

    setUploadingAsset(true);
    setSavedMessage(null);
    setErrorMessage(null);

    const assetType = getAssetType(file);

    if (!assetType) {
      setErrorMessage("Unsupported file type. Use image, GIF, WebM, MP4, Lottie JSON, GLB, or GLTF.");
      setUploadingAsset(false);
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage(userError?.message || "User session not found.");
      setUploadingAsset(false);
      return;
    }

    const safeName = getSafeFileName(file.name);
    const storagePath = `${user.id}/${crypto.randomUUID()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "application/octet-stream",
      });

    if (uploadError) {
      setErrorMessage(uploadError.message);
      setUploadingAsset(false);
      return;
    }

    const { data: insertedAsset, error: insertError } = await supabase
      .from("ai_avatar_assets")
      .insert({
        name: file.name,
        asset_type: assetType,
        bucket_id: AVATAR_BUCKET,
        storage_path: storagePath,
        mime_type: file.type || "application/octet-stream",
        file_size_bytes: file.size,
        status: "active",
        is_selected: assets.length === 0,
        metadata: {
          original_name: file.name,
          uploaded_from: "animation_page",
        },
        created_by: user.id,
        updated_by: user.id,
      })
      .select("id")
      .single();

    if (insertError) {
      await supabase.storage.from(AVATAR_BUCKET).remove([storagePath]);
      setErrorMessage(insertError.message);
      setUploadingAsset(false);
      return;
    }

    const nextAssetId = String(insertedAsset.id);

    if (assets.length === 0) {
      updateSetting("selectedAssetId", nextAssetId);
      updateSetting("mode", "uploaded_asset");
    }

    await supabase.from("ai_admin_activity_logs").insert({
      action_type: "animation_asset_uploaded",
      entity_type: "ai_avatar_asset",
      entity_id: nextAssetId,
      details: {
        name: file.name,
        asset_type: assetType,
        storage_path: storagePath,
        file_size_bytes: file.size,
      },
    });

    setSavedMessage("Avatar asset uploaded.");
    await loadAssets();
    setUploadingAsset(false);
  }

  async function selectAsset(asset: AvatarAssetWithUrl) {
    setSavedMessage(null);
    setErrorMessage(null);

    const { error } = await supabase
      .from("ai_avatar_assets")
      .update({
        is_selected: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", asset.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSettings((current) => ({
      ...current,
      mode: "uploaded_asset",
      selectedAssetId: asset.id,
    }));

    await supabase.rpc("ai_update_setting", {
      p_setting_key: "animation_avatar_mode",
      p_setting_value: {
        value: "uploaded_asset",
      },
    });

    await supabase.rpc("ai_update_setting", {
      p_setting_key: "animation_selected_asset_id",
      p_setting_value: {
        value: asset.id,
      },
    });

    await loadAssets();
    setSavedMessage("Selected uploaded avatar asset.");
  }

  async function archiveAsset(asset: AvatarAssetWithUrl) {
    setSavedMessage(null);
    setErrorMessage(null);

    const { error } = await supabase
      .from("ai_avatar_assets")
      .update({
        status: "archived",
        is_selected: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", asset.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (settings.selectedAssetId === asset.id) {
      setSettings((current) => ({
        ...current,
        selectedAssetId: "",
        mode: "orb",
      }));
    }

    await loadAssets();
    setSavedMessage("Avatar asset archived.");
  }

  async function deleteAsset(asset: AvatarAssetWithUrl) {
    setSavedMessage(null);
    setErrorMessage(null);

    const { error: removeError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .remove([asset.storage_path]);

    if (removeError) {
      setErrorMessage(removeError.message);
      return;
    }

    const { error } = await supabase
      .from("ai_avatar_assets")
      .update({
        status: "deleted",
        is_selected: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", asset.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (settings.selectedAssetId === asset.id) {
      setSettings((current) => ({
        ...current,
        selectedAssetId: "",
        mode: "orb",
      }));
    }

    await loadAssets();
    setSavedMessage("Avatar asset deleted.");
  }

    return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-5">
      <div className="mx-auto grid w-full max-w-[1540px] gap-4">
        <header className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_560px]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/ai-management")}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-100"
                >
                  <ArrowLeft className="h-4 w-4" />
                  AI Studio
                </button>

                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                  <Waves className="h-4 w-4" />
                  Animation / Avatar
                </div>
              </div>

              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white">
                Animation Studio
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                Internal AiXia animation is the default. Uploaded avatar assets are stored in the private Supabase bucket and loaded with signed URLs.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard
                icon={MonitorPlay}
                label="Engine"
                value={engineLabel}
                tone={settings.zegoEnabled ? "amber" : "cyan"}
              />
              <MetricCard
                icon={CircleDot}
                label="State"
                value={getStateLabel(settings.previewState)}
                tone={getStateTone(settings.previewState)}
              />
              <MetricCard
                icon={Box}
                label="Assets"
                value={`${assets.length}`}
                tone="violet"
              />
            </div>
          </div>
        </header>

        {(errorMessage || savedMessage) && (
          <div className="grid gap-2">
            {errorMessage ? (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {errorMessage}
              </div>
            ) : null}

            {savedMessage ? (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {savedMessage}
              </div>
            ) : null}
          </div>
        )}

        <section className="grid gap-4 xl:grid-cols-[390px_minmax(0,1fr)_390px] 2xl:grid-cols-[420px_minmax(0,1fr)_420px]">
          <div className="grid content-start gap-4">
            <Panel
              eyebrow="Preview"
              title={settings.zegoEnabled ? "ZEGO Preview" : `${currentMode.label} Preview`}
              description={loadingSettings ? "Loading saved animation settings..." : "Live visual preview for Phase 3."}
            >
              <AnimationPreview settings={settings} selectedAsset={selectedAsset} />

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void resetSettings()}
                  disabled={savingSettings || loadingSettings}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Reset
                </button>

                <button
                  type="button"
                  onClick={() => void saveSettings()}
                  disabled={savingSettings || loadingSettings}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-400/30 bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {savingSettings ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </Panel>

            <Panel
              eyebrow="Avatar Engine"
              title="Choose your animation engine."
              description=""
            >
              <div className="grid gap-3">
                <EngineCard
                  selected={!settings.zegoEnabled}
                  icon={Sparkles}
                  label="Internal AiXia Animation Engine"
                  status="Default Active"
                  description="Native visuals, motion controls, uploaded assets, and basic native lip-sync later."
                  onClick={() => setZegoEnabled(false)}
                />

                <EngineCard
                  selected={settings.zegoEnabled}
                  icon={Zap}
                  label="ZEGO Digital Human"
                  status={settings.zegoEnabled ? "Enabled / Not Connected" : "Off"}
                  description="External 1080P digital human engine. Supabase Edge Function integration later."
                  onClick={() => setZegoEnabled(!settings.zegoEnabled)}
                />
              </div>
            </Panel>
          </div>

          <div className="grid content-start gap-4">
            <Panel
              eyebrow="Controls"
              title={settings.zegoEnabled ? "ZEGO Configuration Preview" : "Internal Motion Controls"}
              description={settings.zegoEnabled ? "ZEGO is visible only. No API calls in Phase 3." : "These settings save to ai_settings."}
            >
              {settings.zegoEnabled ? (
                <ZegoPlannedPanel />
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  <ControlSlider
                    label="Intensity"
                    value={settings.intensity}
                    onChange={(value) => updateSetting("intensity", value)}
                  />
                  <ControlSlider
                    label="Motion Speed"
                    value={settings.motionSpeed}
                    onChange={(value) => updateSetting("motionSpeed", value)}
                  />
                  <ControlSlider
                    label="Glow Strength"
                    value={settings.glowStrength}
                    onChange={(value) => updateSetting("glowStrength", value)}
                  />
                  <ToggleControl
                    label="Particles"
                    checked={settings.showParticles}
                    onChange={(value) => updateSetting("showParticles", value)}
                  />
                  <ControlSlider
                    label="Pulse Strength"
                    value={settings.pulseStrength}
                    onChange={(value) => updateSetting("pulseStrength", value)}
                  />
                  <ToggleControl
                    label="Waveform"
                    checked={settings.showWaveform}
                    onChange={(value) => updateSetting("showWaveform", value)}
                  />
                  <ToggleControl
                    label="Status Text"
                    checked={settings.showStatusText}
                    onChange={(value) => updateSetting("showStatusText", value)}
                  />
                  <ToggleControl
                    label="Native Basic Lip-Sync"
                    checked={settings.lipSyncEnabled}
                    onChange={(value) => updateSetting("lipSyncEnabled", value)}
                  />
                  <ToggleControl
                    label="Voice-Reactive Motion"
                    checked={settings.voiceReactiveEnabled}
                    onChange={(value) => updateSetting("voiceReactiveEnabled", value)}
                  />
                </div>
              )}
            </Panel>

            <Panel
              eyebrow="Avatar Source"
              title="Internal Visual Mode"
              description="Choose built-in mode or use a selected uploaded asset."
            >
              <div className="grid grid-cols-6 gap-3">
                {modes.map((mode) => (
                  <ModeCard
                    key={mode.id}
                    selected={settings.mode === mode.id && !settings.zegoEnabled}
                    disabled={settings.zegoEnabled}
                    icon={mode.icon}
                    label={mode.label}
                    onClick={() => updateSetting("mode", mode.id)}
                  />
                ))}
              </div>
            </Panel>

            <Panel
              eyebrow="Given States"
              title="Runtime State Preview"
              description="States are fixed. Clicking only previews behavior."
            >
              <div className="grid grid-cols-6 gap-3">
                {states.map((state) => (
                  <StateCard
                    key={state.id}
                    selected={settings.previewState === state.id}
                    icon={state.icon}
                    label={state.label}
                    description={state.description}
                    tone={getStateTone(state.id)}
                    onClick={() => updateSetting("previewState", state.id)}
                  />
                ))}
              </div>
            </Panel>

            <Panel
              eyebrow="Asset Library"
              title="Uploaded Avatar Assets"
              description="Images, GIFs, videos, Lottie JSON, GLB, and GLTF are saved in the private ai-avatar-assets bucket."
            >
              <div className="grid gap-4">
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-cyan-400/30 bg-cyan-500/10 px-5 py-6 text-center transition hover:border-cyan-300/60 hover:bg-cyan-500/15">
                  <Upload className="h-8 w-8 text-cyan-200" />
                  <div className="mt-3 text-sm font-semibold text-white">
                    {uploadingAsset ? "Uploading..." : "Upload Avatar Asset"}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-cyan-100/70">
                    PNG, JPG, WEBP, GIF, WEBM, MP4, Lottie JSON, GLB, GLTF
                  </p>
                  <input
                    type="file"
                    disabled={uploadingAsset}
                    accept="image/png,image/jpeg,image/webp,image/gif,video/webm,video/mp4,application/json,.lottie,.glb,.gltf"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      event.target.value = "";
                      void handleAssetUpload(file);
                    }}
                  />
                </label>

                {loadingAssets ? (
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-400">
                    Loading avatar assets...
                  </div>
                ) : assets.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-400">
                    No uploaded assets yet.
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {assets.map((asset) => (
                      <AssetCard
                        key={asset.id}
                        asset={asset}
                        selected={selectedAsset?.id === asset.id}
                        onSelect={() => void selectAsset(asset)}
                        onArchive={() => void archiveAsset(asset)}
                        onDelete={() => void deleteAsset(asset)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </Panel>
          </div>

          <div className="grid content-start gap-4">
            <Panel
              eyebrow="Phase 3 Status"
              title="What This Includes"
              description="Upload system + signed URL asset library."
            >
              <div className="grid gap-2">
                <StatusLine label="Internal engine" value="Default active" tone="emerald" />
                <StatusLine label="ZEGO engine" value="OFF by default" tone="amber" />
                <StatusLine label="Backend persistence" value="Active" tone="emerald" />
                <StatusLine label="Asset uploads" value="Active" tone="emerald" />
                <StatusLine label="Native lip-sync" value="Phase 4" tone="slate" />
                <StatusLine label="Voice page connection" value="Phase 5" tone="slate" />
              </div>
            </Panel>

            <Panel
              eyebrow="Selected Asset"
              title={selectedAsset ? selectedAsset.name : "No uploaded asset selected"}
              description={selectedAsset ? `${selectedAsset.asset_type.toUpperCase()} · ${formatFileSize(selectedAsset.file_size_bytes)}` : "Select or upload an asset to preview it."}
            >
              <AssetPreview asset={selectedAsset} />
            </Panel>

            <Panel
              eyebrow="ZEGO Configuration (Planned)"
              title="ZEGO is OFF. Configuration preview only."
              description=""
            >
              <div className="grid gap-2">
                <ConfigRow label="App ID" value="Not configured" />
                <ConfigRow label="Secret" value="Not configured" />
                <ConfigRow label="Region" value="Not configured" />
                <ConfigRow label="Status" value="Not connected" />
                <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-200">
                  No API calls, no streams, no billing in Phase 3.
                </div>
              </div>
            </Panel>
          </div>
        </section>
      </div>
    </div>
  );
}

function AnimationPreview({
  settings,
  selectedAsset,
}: {
  settings: AnimationSettings;
  selectedAsset: AvatarAssetWithUrl | null;
}) {
  if (settings.zegoEnabled) {
    return (
      <div className="relative flex h-[300px] items-center justify-center overflow-hidden rounded-[22px] border border-amber-400/20 bg-black/25">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.18),transparent_48%)]" />
        <div className="relative w-[min(330px,calc(100%-28px))] rounded-[24px] border border-amber-400/20 bg-black/45 p-5 text-center backdrop-blur-xl">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-amber-400/30 bg-amber-500/10 text-amber-200">
            <Lock className="h-9 w-9" />
          </div>
          <h3 className="mt-4 text-xl font-semibold text-white">ZEGO Enabled</h3>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Visible only for Phase 3. No API calls, streams, secrets, or billing.
          </p>
        </div>
      </div>
    );
  }

  if (settings.mode === "uploaded_asset") {
    return (
      <div className="relative flex h-[300px] items-center justify-center overflow-hidden rounded-[22px] border border-white/10 bg-black/25">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.16),transparent_48%)]" />
        <AssetPreview asset={selectedAsset} large />
        {settings.showStatusText ? (
          <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-3 text-center backdrop-blur-xl">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-200/70">
              Uploaded Asset Preview
            </div>
            <div className="mt-1 text-xl font-semibold text-emerald-100">
              {selectedAsset?.name ?? "No asset selected"}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  const tone = getStateTone(settings.previewState);
  const glow =
    tone === "rose"
      ? "rgba(251,113,133,0.65)"
      : tone === "amber"
        ? "rgba(251,191,36,0.65)"
        : tone === "violet"
          ? "rgba(167,139,250,0.7)"
          : "rgba(34,211,238,0.75)";

  return (
    <div className="relative flex h-[300px] items-center justify-center overflow-hidden rounded-[22px] border border-white/10 bg-black/25">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_32%,rgba(34,211,238,0.20),transparent_44%),radial-gradient(circle_at_50%_74%,rgba(139,92,246,0.14),transparent_48%)]" />

      {settings.showParticles ? (
        <div className="absolute inset-0 opacity-60">
          {Array.from({ length: 14 }).map((_, index) => (
            <span
              key={index}
              className="absolute h-1.5 w-1.5 rounded-full bg-cyan-200/40"
              style={{
                left: `${8 + ((index * 19) % 84)}%`,
                top: `${10 + ((index * 31) % 78)}%`,
              }}
            />
          ))}
        </div>
      ) : null}

      <div
        className="absolute h-56 w-56 rounded-full blur-3xl"
        style={{
          opacity: Math.max(0.18, settings.glowStrength / 100),
          background: glow,
        }}
      />

      <div className="relative flex h-44 w-44 items-center justify-center rounded-full border border-cyan-300/60 bg-black/55 text-cyan-100 shadow-2xl shadow-cyan-400/30">
        <div className="absolute inset-4 animate-pulse rounded-full border border-white/10" />
        <div className="absolute inset-8 rounded-full border border-white/10" />

        {settings.mode === "waveform" ? <WaveformPreview active={settings.showWaveform} /> : null}
        {settings.mode === "robot" ? <RobotPreview lipSyncEnabled={settings.lipSyncEnabled} /> : null}
        {settings.mode === "hologram" ? (
          <MonitorPlay className="h-16 w-16 text-cyan-200" />
        ) : null}
        {settings.mode === "mascot" ? <Smile className="h-16 w-16 text-cyan-200" /> : null}
        {settings.mode === "orb" ? (
          <div className="h-20 w-20 rounded-full border border-cyan-300/30 bg-cyan-400/20 shadow-2xl shadow-cyan-400/20" />
        ) : null}
      </div>

      {settings.showStatusText ? (
        <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-3 text-center backdrop-blur-xl">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-200/70">
            Preview State
          </div>
          <div className="mt-1 text-xl font-semibold text-emerald-100">
            {getStateLabel(settings.previewState)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AssetPreview({
  asset,
  large = false,
}: {
  asset: AvatarAssetWithUrl | null;
  large?: boolean;
}) {
  if (!asset || !asset.signedUrl) {
    return (
      <div
        className={`flex ${
          large ? "h-full w-full" : "h-[220px]"
        } items-center justify-center rounded-[22px] border border-white/10 bg-black/25 text-center`}
      >
        <div>
          <Box className="mx-auto h-10 w-10 text-slate-500" />
          <div className="mt-3 text-sm font-semibold text-white">
            No asset selected
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Upload or select an avatar asset.
          </p>
        </div>
      </div>
    );
  }

  if (asset.asset_type === "image" || asset.asset_type === "gif") {
    return (
      <div
        className={`flex ${
          large ? "h-full w-full" : "h-[220px]"
        } items-center justify-center overflow-hidden rounded-[22px] border border-white/10 bg-black/25`}
      >
        <img
          src={asset.signedUrl}
          alt={asset.name}
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  if (asset.asset_type === "video") {
    return (
      <div
        className={`flex ${
          large ? "h-full w-full" : "h-[220px]"
        } items-center justify-center overflow-hidden rounded-[22px] border border-white/10 bg-black/25`}
      >
        <video
          src={asset.signedUrl}
          className="h-full w-full object-contain"
          controls={!large}
          autoPlay={large}
          muted
          loop
          playsInline
        />
      </div>
    );
  }

  const Icon =
    asset.asset_type === "lottie"
      ? FileJson
      : asset.asset_type === "glb" || asset.asset_type === "gltf"
        ? Cuboid
        : Box;

  return (
    <div
      className={`flex ${
        large ? "h-full w-full" : "h-[220px]"
      } items-center justify-center rounded-[22px] border border-white/10 bg-black/25 text-center`}
    >
      <div>
        <Icon className="mx-auto h-12 w-12 text-cyan-200" />
        <div className="mt-3 text-sm font-semibold text-white">
          {asset.asset_type.toUpperCase()} uploaded
        </div>
        <p className="mt-1 max-w-[260px] text-xs leading-5 text-slate-500">
          Rendering support for this asset type is prepared in the library.
          Full live renderer comes in the next implementation pass.
        </p>
      </div>
    </div>
  );
}

function AssetCard({
  asset,
  selected,
  onSelect,
  onArchive,
  onDelete,
}: {
  asset: AvatarAssetWithUrl;
  selected: boolean;
  onSelect: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const Icon =
    asset.asset_type === "image" || asset.asset_type === "gif"
      ? Image
      : asset.asset_type === "video"
        ? Video
        : asset.asset_type === "lottie"
          ? FileJson
          : Cuboid;

  return (
    <div
      className={`overflow-hidden rounded-2xl border ${
        selected
          ? "border-emerald-400/40 bg-emerald-500/10"
          : "border-white/10 bg-black/20"
      }`}
    >
      <div className="flex h-[120px] items-center justify-center overflow-hidden border-b border-white/10 bg-black/25">
        {asset.signedUrl && (asset.asset_type === "image" || asset.asset_type === "gif") ? (
          <img
            src={asset.signedUrl}
            alt={asset.name}
            className="h-full w-full object-cover"
          />
        ) : asset.signedUrl && asset.asset_type === "video" ? (
          <video
            src={asset.signedUrl}
            className="h-full w-full object-cover"
            muted
            loop
            playsInline
          />
        ) : (
          <Icon className="h-10 w-10 text-cyan-200" />
        )}
      </div>

      <div className="p-3">
        <div className="line-clamp-1 text-sm font-semibold text-white">
          {asset.name}
        </div>
        <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
          {asset.asset_type} · {formatFileSize(asset.file_size_bytes)}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={onSelect}
            className="inline-flex items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-2 py-2 text-xs font-semibold text-cyan-200 transition hover:border-cyan-300/50"
          >
            {selected ? "Active" : "Use"}
          </button>

          <button
            type="button"
            onClick={onArchive}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2 text-xs font-semibold text-slate-300 transition hover:border-white/20"
          >
            <Archive className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center justify-center rounded-xl border border-rose-400/20 bg-rose-500/10 px-2 py-2 text-xs font-semibold text-rose-200 transition hover:border-rose-300/50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function WaveformPreview({ active }: { active: boolean }) {
  return (
    <div className="flex h-20 items-center gap-2">
      {Array.from({ length: 7 }).map((_, index) => (
        <span
          key={index}
          className="w-2 rounded-full bg-cyan-200/80"
          style={{ height: active ? `${22 + ((index * 17) % 46)}px` : "22px" }}
        />
      ))}
    </div>
  );
}

function RobotPreview({ lipSyncEnabled }: { lipSyncEnabled: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <Bot className="h-16 w-16" />
      <div className={`mt-2 rounded-full bg-cyan-100 ${lipSyncEnabled ? "h-2 w-10" : "h-1 w-6"}`} />
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ElementType;
  label: string;
  value: string;
  tone: "cyan" | "emerald" | "amber" | "violet" | "rose" | "slate";
}) {
  return (
    <div className="min-h-[120px] rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{label}</p>
        <Icon className={`h-4 w-4 ${toneColor(tone)}`} />
      </div>
      <p className={`mt-3 truncate text-2xl font-semibold ${toneColor(tone)}`}>{value}</p>
    </div>
  );
}

function ControlSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-white">{label}</div>
        <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200">
          {value}%
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-4 w-full accent-blue-500"
      />
    </div>
  );
}

function ToggleControl({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex min-h-[58px] items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left transition hover:border-white/20"
    >
      <div className="text-sm font-semibold text-white">{label}</div>
      {checked ? (
        <ToggleRight className="h-5 w-5 shrink-0 text-blue-300" />
      ) : (
        <ToggleLeft className="h-5 w-5 shrink-0 text-slate-500" />
      )}
    </button>
  );
}
