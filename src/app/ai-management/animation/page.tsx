import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ElementType, ReactNode } from "react";
import {
  Bot,
  Brain,
  CheckCircle2,
  CircleDot,
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
  Upload,
  Waves,
  Zap,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AixiaHero, AixiaPage } from "@/components/aixia";
import "@/styles/dashboard/tokens.css";
import "@/styles/dashboard/layout.css";
import "@/styles/dashboard/visual.css";

import {
  detectFaceLandmarksFromImageUrl,
  isAiAvatarFaceLandmarks,
} from "@/lib/ai/faceLandmarks";
import {
  generateAvatarPackFromImageUrl,
  isAvatarPackManifest,
  type AvatarPackLayerKey,
  type AvatarPackLayerManifest,
  type AvatarPackManifest,
} from "@/lib/ai/avatarPack";
import { AvatarPackRuntime } from "@/components/ai/avatar/AvatarPackRuntime";
import { AvatarAssetPreview } from "@/components/ai/avatar/AvatarAssetPreview";
import { AvatarAssetCard } from "@/components/ai/avatar/AvatarAssetCard";

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

type AvatarPackSignedUrls = Partial<Record<AvatarPackLayerKey, string>>;

type AvatarAssetWithUrl = AvatarAsset & {
  signedUrl: string | null;
  avatarPackBaseSignedUrl: string | null;
  avatarPackLayerSignedUrls: AvatarPackSignedUrls;
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

function getAssetFaceLandmarks(asset: AvatarAssetWithUrl | null) {
  const landmarks = asset?.metadata?.face_landmarks;

  if (isAiAvatarFaceLandmarks(landmarks)) {
    return landmarks;
  }

  return null;
}

function getAvatarPackStatus(asset: AvatarAssetWithUrl | null) {
  const status = asset?.metadata?.avatar_pack_status;

  if (
    status === "raw_uploaded" ||
    status === "face_detected" ||
    status === "avatar_pack_ready"
  ) {
    return status;
  }

  if (getAssetFaceLandmarks(asset)) {
    return "face_detected";
  }

  return "raw_uploaded";
}

function getAvatarPackStatusLabel(asset: AvatarAssetWithUrl | null) {
  const status = getAvatarPackStatus(asset);

  if (status === "avatar_pack_ready") return "Avatar pack ready";
  if (status === "face_detected") return "Face prepared";
  return "Raw upload";
}

function getAssetAvatarPackManifest(asset: AvatarAssetWithUrl | null) {
  const manifest = asset?.metadata?.avatar_pack_manifest;

  if (isAvatarPackManifest(manifest)) {
    return manifest;
  }

  return null;
}

function makeAvatarPackStoragePath(
  userId: string,
  assetId: string,
  layerKey: AvatarPackLayerKey
) {
  return `${userId}/avatar-packs/${assetId}/${layerKey}.png`;
}

export default function AIAnimationPage() {
  const [settings, setSettings] = useState<AnimationSettings>(defaultSettings);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [assets, setAssets] = useState<AvatarAssetWithUrl[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const [detectingAssetId, setDetectingAssetId] = useState<string | null>(null);

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

                const assetWithSourceUrl: AvatarAssetWithUrl = {
          ...asset,
          signedUrl: signedData?.signedUrl ?? null,
          avatarPackBaseSignedUrl: null,
          avatarPackLayerSignedUrls: {},
        };

        const manifest = getAssetAvatarPackManifest(assetWithSourceUrl);

        if (!manifest) {
          return assetWithSourceUrl;
        }

        const signedLayers: AvatarPackSignedUrls = {};

        await Promise.all(
          Object.entries(manifest.layers).map(async ([layerKey, layer]) => {
            const { data: layerSignedData } = await supabase.storage
              .from(AVATAR_BUCKET)
              .createSignedUrl(layer.storage_path, 60 * 60);

            if (layerSignedData?.signedUrl) {
              signedLayers[layerKey as AvatarPackLayerKey] = layerSignedData.signedUrl;
            }
          })
        );

        return {
          ...assetWithSourceUrl,
          avatarPackBaseSignedUrl: signedLayers.base_avatar ?? null,
          avatarPackLayerSignedUrls: signedLayers,
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

  async function prepareAvatarPackForAsset(asset: AvatarAssetWithUrl) {
    setSavedMessage(null);
    setErrorMessage(null);

    if (!asset.signedUrl) {
      setErrorMessage("Signed asset URL is not available yet. Refresh and try again.");
      return;
    }

    if (asset.asset_type !== "image" && asset.asset_type !== "gif") {
      setErrorMessage("Avatar pack preparation is available only for image and GIF assets.");
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage(userError?.message || "User session not found.");
      return;
    }

    setDetectingAssetId(asset.id);

    try {
      setSavedMessage("Step 1/5: Detecting face...");

      const landmarks = await detectFaceLandmarksFromImageUrl(asset.signedUrl);

      if (!landmarks) {
        setSavedMessage(null);
        setErrorMessage("No face detected. Use a clear front-facing image.");
        return;
      }

      setSavedMessage("Step 2/5: Generating avatar layers...");

      const generatedPack = await generateAvatarPackFromImageUrl({
        imageUrl: asset.signedUrl,
        landmarks,
      });

      if (!generatedPack.layers.length) {
        setSavedMessage(null);
        setErrorMessage("Avatar pack generation failed: no layers were generated.");
        return;
      }

      setSavedMessage("Step 3/5: Uploading avatar layers...");

      const uploadedLayers: Partial<Record<AvatarPackLayerKey, AvatarPackLayerManifest>> = {};

      for (const layer of generatedPack.layers) {
        const storagePath = makeAvatarPackStoragePath(user.id, asset.id, layer.key);

        const { error: uploadError } = await supabase.storage
          .from(AVATAR_BUCKET)
          .upload(storagePath, layer.blob, {
            contentType: layer.contentType,
            upsert: true,
            cacheControl: "3600",
          });

        if (uploadError) {
          setSavedMessage(null);
          setErrorMessage(`Layer upload failed (${layer.key}): ${uploadError.message}`);
          return;
        }

        uploadedLayers[layer.key] = {
          storage_path: storagePath,
          content_type: layer.contentType,
          width: generatedPack.manifestDraft.canvas_size.width,
          height: generatedPack.manifestDraft.canvas_size.height,
        };
      }

      const requiredLayers: AvatarPackLayerKey[] = [
        "base_avatar",
        "eyes_open",
        "eyes_closed",
        "mouth_rest",
        "mouth_small",
        "mouth_medium",
        "mouth_open",
        "mouth_round",
      ];

      const missingLayer = requiredLayers.find((layerKey) => !uploadedLayers[layerKey]);

      if (missingLayer) {
        setSavedMessage(null);
        setErrorMessage(`Avatar pack generation failed: missing layer ${missingLayer}.`);
        return;
      }

      setSavedMessage("Step 4/5: Saving avatar manifest...");

      const manifest: AvatarPackManifest = {
        ...generatedPack.manifestDraft,
        layers: uploadedLayers as Record<AvatarPackLayerKey, AvatarPackLayerManifest>,
      };

      const nextMetadata = {
        ...(asset.metadata ?? {}),
        avatar_pack_status: "avatar_pack_ready",
        avatar_pack_version: 1,
        avatar_pack_manifest: manifest,
        avatar_pack_preparation: {
          source: "mediapipe_face_landmarker_plus_canvas_pack",
          prepared_at: new Date().toISOString(),
          runtime_strategy: "preloaded_sprite_layers",
          runtime_mediapipe: false,
          visible_overlay: false,
          generated_layers: Object.keys(manifest.layers),
        },
        face_landmarks: landmarks,
      };

      const { error } = await supabase
        .from("ai_avatar_assets")
        .update({
          metadata: nextMetadata,
          updated_at: new Date().toISOString(),
        })
        .eq("id", asset.id);

      if (error) {
        setSavedMessage(null);
        setErrorMessage(`Avatar manifest save failed: ${error.message}`);
        return;
      }

      setSavedMessage("Step 5/5: Finalizing avatar pack...");

      const { error: logError } = await supabase.from("ai_admin_activity_logs").insert({
        action_type: "animation_avatar_pack_generated",
        entity_type: "ai_avatar_asset",
        entity_id: asset.id,
        details: {
          asset_name: asset.name,
          asset_type: asset.asset_type,
          avatar_pack_status: "avatar_pack_ready",
          avatar_pack_generator: manifest.generator,
          generated_layers: Object.keys(manifest.layers),
          runtime_mediapipe: false,
          visible_overlay: false,
        },
      });

      if (logError) {
        console.warn("Avatar pack generated, but activity log failed:", logError);
      }

      await loadAssets();
      setSavedMessage("Avatar pack generated. This asset is now ready for the internal talking-avatar runtime.");
    } catch (error) {
      console.error("Avatar pack preparation failed:", error);

      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : JSON.stringify(error);

      setSavedMessage(null);
      setErrorMessage(message || "Avatar pack preparation failed with an unknown error.");
    } finally {
      setDetectingAssetId(null);
    }
  }
  return (
    <AixiaPage surface="command" className="aixia-command-page aixia-ai-management-page"><AixiaHero
        surface="command"
        className="shrink-0 space-y-4"
        parentLabel="AI Studio"
        parentPath="/ai-management"
        gradientTitle="Animation Studio"
        title="Animation Studio"
        subtitle="Internal AiXia animation is the default. Uploaded avatar assets are stored in the private Supabase bucket and loaded with signed URLs."
      >
      </AixiaHero>

      <div className="aixia-command-scroll flex flex-col gap-6">

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
              description={loadingSettings ? "Loading saved animation settings..." : "Live native animation preview for Phase 4."}
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
                      <AvatarAssetCard
                        key={asset.id}
                        asset={asset}
                        selected={selectedAsset?.id === asset.id}
                        detecting={detectingAssetId === asset.id}
                        avatarPackStatus={getAvatarPackStatus(asset)}
                        fileSizeLabel={formatFileSize(asset.file_size_bytes)}
                        onSelect={() => void selectAsset(asset)}
                        onPrepareAvatarPack={() => void prepareAvatarPackForAsset(asset)}
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
                <StatusLine label="Native lip-sync" value="Active" tone="emerald" />
                <StatusLine label="Voice page connection" value="Phase 5" tone="slate" />
              </div>
            </Panel>

             <Panel
              eyebrow="Selected Asset"
              title={selectedAsset ? selectedAsset.name : "No uploaded asset selected"}
              description={selectedAsset ? `${selectedAsset.asset_type.toUpperCase()} · ${formatFileSize(selectedAsset.file_size_bytes)}` : "Select or upload an asset to preview it."}
            >
              <AvatarAssetPreview asset={selectedAsset} />
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
    </AixiaPage>
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
        <NativeAnimationStyles />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.18),transparent_48%)]" />
        <div className="relative w-[min(330px,calc(100%-28px))] rounded-[24px] border border-amber-400/20 bg-black/45 p-5 text-center backdrop-blur-xl">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-amber-400/30 bg-amber-500/10 text-amber-200">
            <Lock className="h-9 w-9" />
          </div>
          <h3 className="mt-4 text-xl font-semibold text-white">ZEGO Enabled</h3>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Visible only for Phase 4. No API calls, streams, secrets, or billing.
          </p>
        </div>
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

  const isSilent =
    settings.previewState === "idle" ||
    settings.previewState === "paused" ||
    settings.previewState === "error";

  const motionDuration = `${Math.max(
    0.85,
    4.2 - (settings.motionSpeed / 100) * 3
  ).toFixed(2)}s`;

  const mouthHeight =
    settings.previewState === "speaking"
      ? Math.max(10, Math.round(6 + settings.intensity / 6))
      : settings.previewState === "listening"
        ? 7
        : settings.previewState === "thinking"
          ? 4
          : 2;

  const previewStyle = {
    "--aixia-motion-duration": motionDuration,
    "--aixia-glow-opacity": String(Math.max(0.18, settings.glowStrength / 100)),
    "--aixia-pulse-scale": String(1 + settings.pulseStrength / 900),
    "--aixia-mouth-height": `${mouthHeight}px`,
    "--aixia-motion-opacity": isSilent ? "0.45" : "1",
  } as CSSProperties;

  if (settings.mode === "uploaded_asset") {
    const avatarPackStatus = getAvatarPackStatus(selectedAsset);
    const isRuntimeReady =
      avatarPackStatus === "avatar_pack_ready" &&
      Boolean(selectedAsset?.avatarPackLayerSignedUrls.base_avatar) &&
      Boolean(selectedAsset?.avatarPackLayerSignedUrls.eyes_open) &&
      Boolean(selectedAsset?.avatarPackLayerSignedUrls.eyes_closed) &&
      Boolean(selectedAsset?.avatarPackLayerSignedUrls.mouth_rest) &&
      Boolean(selectedAsset?.avatarPackLayerSignedUrls.mouth_small) &&
      Boolean(selectedAsset?.avatarPackLayerSignedUrls.mouth_medium) &&
      Boolean(selectedAsset?.avatarPackLayerSignedUrls.mouth_open) &&
      Boolean(selectedAsset?.avatarPackLayerSignedUrls.mouth_round);

    return (
      <div
        className="aixia-native-preview relative flex h-[300px] items-center justify-center overflow-hidden rounded-[22px] border border-white/10 bg-black/25"
        data-state={settings.previewState}
        data-mode={settings.mode}
        style={previewStyle}
      >
        <NativeAnimationStyles />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.16),transparent_48%)]" />

        {isRuntimeReady && selectedAsset ? (
          <AvatarPackRuntime
            asset={selectedAsset}
            state={settings.previewState}
            lipSyncEnabled={settings.lipSyncEnabled}
          />
        ) : (
           <div className="relative z-10 h-full w-full">
            <AvatarAssetPreview asset={selectedAsset} large />
          </div>
        )}

        <div className="pointer-events-none absolute left-4 top-4 z-20 rounded-full border border-white/10 bg-black/55 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-200 backdrop-blur-xl">
          {isRuntimeReady ? "Runtime avatar active" : getAvatarPackStatusLabel(selectedAsset)}
        </div>

        {!isRuntimeReady ? (
          <div className="absolute inset-x-4 bottom-4 z-30 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-5 py-3 text-center backdrop-blur-xl">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-100/70">
              Runtime Not Ready
            </div>
            <div className="mt-1 text-sm font-semibold text-amber-100">
              Click Prepare Avatar Pack to generate usable eye and mouth layers.
            </div>
          </div>
        ) : (
          <div className="absolute inset-x-4 bottom-4 z-30 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-3 text-center backdrop-blur-xl">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-200/70">
              Avatar Runtime Active
            </div>
            <div className="mt-1 text-sm font-semibold text-emerald-100">
              Preloaded sprite layers are driving eyes, mouth, and motion.
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="aixia-native-preview relative flex h-[300px] items-center justify-center overflow-hidden rounded-[22px] border border-white/10 bg-black/25"
      data-state={settings.previewState}
      data-mode={settings.mode}
      style={previewStyle}
    >
      <NativeAnimationStyles />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_32%,rgba(34,211,238,0.20),transparent_44%),radial-gradient(circle_at_50%_74%,rgba(139,92,246,0.14),transparent_48%)]" />

      {settings.showParticles ? (
        <div className="aixia-particle-layer absolute inset-0 opacity-60">
          {Array.from({ length: 18 }).map((_, index) => (
            <span
              key={index}
              className="aixia-particle absolute h-1.5 w-1.5 rounded-full bg-cyan-200/40"
              style={{
                left: `${8 + ((index * 19) % 84)}%`,
                top: `${10 + ((index * 31) % 78)}%`,
                animationDelay: `${index * 0.12}s`,
              }}
            />
          ))}
        </div>
      ) : null}

      <div
        className="aixia-glow absolute h-56 w-56 rounded-full blur-3xl"
        style={{
          background: glow,
        }}
      />

      <div className="aixia-avatar-shell relative flex h-44 w-44 items-center justify-center rounded-full border border-cyan-300/60 bg-black/55 text-cyan-100 shadow-2xl shadow-cyan-400/30">
        <div className="aixia-ring aixia-ring-outer absolute inset-4 rounded-full border border-white/10" />
        <div className="aixia-ring aixia-ring-inner absolute inset-8 rounded-full border border-white/10" />
        <div className="aixia-scanner absolute inset-2 rounded-full border border-cyan-300/0" />

        {settings.mode === "waveform" ? (
          <WaveformPreview
            active={settings.showWaveform}
            state={settings.previewState}
            motionSpeed={settings.motionSpeed}
          />
        ) : null}

        {settings.mode === "robot" ? (
          <RobotPreview
            lipSyncEnabled={settings.lipSyncEnabled}
            state={settings.previewState}
          />
        ) : null}

        {settings.mode === "hologram" ? (
          <div className="aixia-hologram flex flex-col items-center gap-2">
            <MonitorPlay className="h-14 w-14 text-cyan-200" />
            <span className="h-1 w-20 rounded-full bg-cyan-200/50" />
          </div>
        ) : null}

        {settings.mode === "mascot" ? (
          <div className="aixia-mascot-face flex h-24 w-24 flex-col items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-400/10 shadow-2xl shadow-cyan-400/10">
            <div className="flex gap-7">
              <span className="aixia-blink-eye h-3 w-3 rounded-full bg-cyan-100" />
              <span className="aixia-blink-eye h-3 w-3 rounded-full bg-cyan-100" />
            </div>
            <div className="aixia-mouth mt-5 rounded-full bg-cyan-100" />
          </div>
        ) : null}

        {settings.mode === "orb" ? (
          <div className="aixia-orb-core relative flex h-24 w-24 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-400/20 shadow-2xl shadow-cyan-400/20">
            <div className="aixia-orb-mouth absolute bottom-7 h-1.5 w-10 rounded-full bg-cyan-100/80" />
          </div>
        ) : null}
      </div>

      {settings.showStatusText ? (
        <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-3 text-center backdrop-blur-xl">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-200/70">
            Native Animation State
          </div>
          <div className="mt-1 text-xl font-semibold text-emerald-100">
            {getStateLabel(settings.previewState)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NativeAnimationStyles() {
  return (
    <style>
      {`
        @keyframes aixia-breathe {
          0%, 100% { transform: scale(1); opacity: 0.82; }
          50% { transform: scale(var(--aixia-pulse-scale)); opacity: 1; }
        }

        @keyframes aixia-speaking {
          0%, 100% { transform: scale(1) translateY(0); }
          25% { transform: scale(1.045) translateY(-2px); }
          50% { transform: scale(1.015) translateY(1px); }
          75% { transform: scale(1.06) translateY(-1px); }
        }

        @keyframes aixia-listening {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.035); }
        }

        @keyframes aixia-thinking {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes aixia-floating {
          0%, 100% { transform: translateY(0); opacity: 0.35; }
          50% { transform: translateY(-8px); opacity: 0.9; }
        }

        @keyframes aixia-wave {
          0%, 100% { transform: scaleY(0.42); opacity: 0.55; }
          50% { transform: scaleY(1); opacity: 1; }
        }

        @keyframes aixia-mouth {
          0%, 100% { height: 3px; width: 28px; opacity: 0.75; }
          35% { height: var(--aixia-mouth-height); width: 34px; opacity: 1; }
          70% { height: 5px; width: 24px; opacity: 0.9; }
        }

        @keyframes aixia-blink {
          0%, 88%, 100% { transform: scaleY(1); }
          92%, 96% { transform: scaleY(0.12); }
        }

        @keyframes aixia-uploaded-breathe {
          0%, 100% { transform: scale(1) translateY(0); filter: saturate(1); }
          50% { transform: scale(1.025) translateY(-2px); filter: saturate(1.08); }
        }

        @keyframes aixia-uploaded-speaking {
          0%, 100% { transform: scale(1.01) translateY(0); filter: saturate(1.05); }
          25% { transform: scale(1.035) translateY(-2px); filter: saturate(1.16); }
          50% { transform: scale(1.02) translateY(1px); filter: saturate(1.1); }
          75% { transform: scale(1.045) translateY(-1px); filter: saturate(1.2); }
        }

        @keyframes aixia-avatar-pack-idle {
          0%, 100% { transform: translateY(0) scale(1); filter: saturate(1); }
          50% { transform: translateY(-3px) scale(1.012); filter: saturate(1.06); }
        }

        @keyframes aixia-avatar-pack-speaking {
          0%, 100% { transform: translateY(0) scale(1.01); filter: saturate(1.08); }
          25% { transform: translateY(-3px) scale(1.025); filter: saturate(1.16); }
          50% { transform: translateY(1px) scale(1.012); filter: saturate(1.1); }
          75% { transform: translateY(-2px) scale(1.03); filter: saturate(1.18); }
        }

        @keyframes aixia-avatar-pack-thinking {
          0%, 100% { transform: rotate(-0.8deg) scale(1.005); }
          50% { transform: rotate(0.8deg) scale(1.015); }
        }

        @keyframes aixia-avatar-pack-blink-layer {
          0%, 86%, 100% { opacity: 0; }
          90%, 94% { opacity: 1; }
        }

        @keyframes aixia-avatar-pack-mouth-pulse {
          0%, 100% { opacity: 0.72; transform: scaleY(0.88); }
          45% { opacity: 1; transform: scaleY(1.04); }
        }

        @keyframes aixia-error {
          0%, 100% { opacity: 1; filter: saturate(1); }
          50% { opacity: 0.55; filter: saturate(1.8); }
        }

        .aixia-native-preview .aixia-glow {
          opacity: var(--aixia-glow-opacity);
        }

        .aixia-native-preview .aixia-avatar-shell,
        .aixia-native-preview .aixia-uploaded-motion {
          animation: aixia-breathe var(--aixia-motion-duration) ease-in-out infinite;
        }

        .aixia-native-preview .aixia-uploaded-motion {
          animation-name: aixia-uploaded-breathe;
          transform-origin: center center;
        }

        .aixia-native-preview[data-state="listening"] .aixia-avatar-shell {
          animation: aixia-listening calc(var(--aixia-motion-duration) * 0.55) ease-in-out infinite;
        }

        .aixia-native-preview[data-state="listening"] .aixia-uploaded-motion {
          animation: aixia-uploaded-breathe calc(var(--aixia-motion-duration) * 0.65) ease-in-out infinite;
        }

        .aixia-native-preview[data-state="speaking"] .aixia-avatar-shell {
          animation: aixia-speaking calc(var(--aixia-motion-duration) * 0.42) ease-in-out infinite;
        }

        .aixia-native-preview[data-state="speaking"] .aixia-uploaded-motion {
          animation: aixia-uploaded-speaking calc(var(--aixia-motion-duration) * 0.38) ease-in-out infinite;
        }

        .aixia-native-preview[data-state="thinking"] .aixia-scanner {
          border-color: rgba(251, 191, 36, 0.45);
          border-top-color: rgba(34, 211, 238, 0.95);
          animation: aixia-thinking calc(var(--aixia-motion-duration) * 0.75) linear infinite;
        }

        .aixia-native-preview .aixia-avatar-pack-stage {
          animation: aixia-avatar-pack-idle var(--aixia-motion-duration) ease-in-out infinite;
          transform-origin: center center;
        }

        .aixia-native-preview[data-state="listening"] .aixia-avatar-pack-stage {
          animation: aixia-avatar-pack-idle calc(var(--aixia-motion-duration) * 0.7) ease-in-out infinite;
        }

        .aixia-native-preview[data-state="speaking"] .aixia-avatar-pack-stage {
          animation: aixia-avatar-pack-speaking calc(var(--aixia-motion-duration) * 0.42) ease-in-out infinite;
        }

        .aixia-native-preview[data-state="thinking"] .aixia-avatar-pack-stage {
          animation: aixia-avatar-pack-thinking calc(var(--aixia-motion-duration) * 0.7) ease-in-out infinite;
        }

        .aixia-native-preview[data-state="paused"] .aixia-avatar-pack-stage {
          animation-play-state: paused;
          opacity: 0.72;
        }

        .aixia-native-preview[data-state="error"] .aixia-avatar-pack-stage {
          animation: aixia-error 1.1s ease-in-out infinite;
        }

        .aixia-avatar-pack-blink {
          opacity: 0;
          animation: aixia-avatar-pack-blink-layer 4.2s ease-in-out infinite;
        }

        .aixia-native-preview[data-state="speaking"] .aixia-avatar-pack-blink {
          animation-duration: 3.2s;
        }

        .aixia-avatar-pack-mouth {
          transform-origin: center center;
        }

        .aixia-native-preview[data-state="speaking"] .aixia-avatar-pack-mouth,
        .aixia-native-preview[data-state="listening"] .aixia-avatar-pack-mouth {
          animation: aixia-avatar-pack-mouth-pulse 0.34s ease-in-out infinite;
        }

        .aixia-native-preview[data-state="paused"] .aixia-avatar-shell,
        .aixia-native-preview[data-state="paused"] .aixia-uploaded-motion {
          animation-play-state: paused;
          opacity: 0.65;
        }

        .aixia-native-preview[data-state="error"] .aixia-avatar-shell,
        .aixia-native-preview[data-state="error"] .aixia-uploaded-motion {
          border-color: rgba(251, 113, 133, 0.75);
          color: rgb(255, 205, 214);
          animation: aixia-error 1.1s ease-in-out infinite;
        }

        .aixia-native-preview[data-state="error"] .aixia-glow {
          background: rgba(251, 113, 133, 0.7) !important;
        }

        .aixia-native-preview[data-state="speaking"] .aixia-mouth,
        .aixia-native-preview[data-state="speaking"] .aixia-orb-mouth,
        .aixia-native-preview[data-state="speaking"] .aixia-uploaded-mouth {
          animation: aixia-mouth 0.38s ease-in-out infinite;
        }

        .aixia-native-preview[data-state="listening"] .aixia-mouth,
        .aixia-native-preview[data-state="listening"] .aixia-orb-mouth,
        .aixia-native-preview[data-state="listening"] .aixia-uploaded-mouth {
          animation: aixia-mouth 0.75s ease-in-out infinite;
        }

        .aixia-native-preview[data-state="idle"] .aixia-mouth,
        .aixia-native-preview[data-state="paused"] .aixia-mouth,
        .aixia-native-preview[data-state="error"] .aixia-mouth,
        .aixia-native-preview[data-state="idle"] .aixia-orb-mouth,
        .aixia-native-preview[data-state="paused"] .aixia-orb-mouth,
        .aixia-native-preview[data-state="error"] .aixia-orb-mouth,
        .aixia-native-preview[data-state="idle"] .aixia-uploaded-mouth,
        .aixia-native-preview[data-state="paused"] .aixia-uploaded-mouth,
        .aixia-native-preview[data-state="error"] .aixia-uploaded-mouth {
          height: 2px;
          width: 24px;
          opacity: 0.55;
        }

        .aixia-blink-eye {
          transform-origin: center;
          animation: aixia-blink 4.2s ease-in-out infinite;
        }

        .aixia-native-preview[data-state="speaking"] .aixia-blink-eye {
          animation-duration: 3.2s;
        }

        .aixia-particle {
          animation: aixia-floating calc(var(--aixia-motion-duration) * 1.2) ease-in-out infinite;
          opacity: var(--aixia-motion-opacity);
        }

        .aixia-wave-bar {
          transform-origin: center;
          animation: aixia-wave var(--aixia-wave-duration) ease-in-out infinite;
        }

        .aixia-native-preview[data-state="idle"] .aixia-wave-bar,
        .aixia-native-preview[data-state="paused"] .aixia-wave-bar {
          animation-play-state: paused;
          transform: scaleY(0.35);
          opacity: 0.45;
        }

        .aixia-native-preview[data-state="error"] .aixia-wave-bar {
          background: rgba(251, 113, 133, 0.8);
        }

        .aixia-hologram {
          animation: aixia-breathe var(--aixia-motion-duration) ease-in-out infinite;
        }

        .aixia-orb-core {
          animation: aixia-breathe calc(var(--aixia-motion-duration) * 0.8) ease-in-out infinite;
        }
      `}
    </style>
  );
}

function WaveformPreview({
  active,
  state,
  motionSpeed,
}: {
  active: boolean;
  state: AnimationState;
  motionSpeed: number;
}) {
  const stateMultiplier =
    state === "speaking"
      ? 0.42
      : state === "listening"
        ? 0.58
        : state === "thinking"
          ? 0.82
          : 1.2;

  const duration = Math.max(
    0.32,
    (1.3 - (motionSpeed / 100) * 0.75) * stateMultiplier
  );

  return (
    <div className="flex h-20 items-center gap-2">
      {Array.from({ length: 9 }).map((_, index) => (
        <span
          key={index}
          className="aixia-wave-bar w-2 rounded-full bg-cyan-200/80"
          style={{
            height: active ? `${20 + ((index * 17) % 52)}px` : "22px",
            animationDelay: `${index * 0.07}s`,
            "--aixia-wave-duration": `${duration}s`,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}

function RobotPreview({
  lipSyncEnabled,
  state,
}: {
  lipSyncEnabled: boolean;
  state: AnimationState;
}) {
  const mouthClass =
    lipSyncEnabled && (state === "speaking" || state === "listening")
      ? "aixia-mouth"
      : "h-1.5 w-8";

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex h-24 w-24 items-center justify-center rounded-[24px] border border-cyan-300/25 bg-cyan-400/10 shadow-2xl shadow-cyan-400/10">
        <Bot className="absolute inset-0 m-auto h-16 w-16 opacity-90" />

        <div className="absolute left-1/2 top-[38px] flex -translate-x-1/2 gap-5">
          <span className="aixia-blink-eye h-2.5 w-2.5 rounded-full bg-cyan-100" />
          <span className="aixia-blink-eye h-2.5 w-2.5 rounded-full bg-cyan-100" />
        </div>

        <div
          className={`absolute left-1/2 top-[59px] -translate-x-1/2 rounded-full bg-cyan-100 transition-all ${mouthClass}`}
        />
      </div>
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

function EngineCard({
  selected,
  icon: Icon,
  label,
  status,
  description,
  onClick,
}: {
  selected: boolean;
  icon: ElementType;
  label: string;
  status: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        selected
          ? "border-cyan-400/30 bg-cyan-500/10"
          : "border-white/10 bg-black/20 hover:border-white/20"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`rounded-2xl border p-3 ${
              selected
                ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-200"
                : "border-white/10 bg-white/[0.04] text-slate-500"
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{label}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-cyan-200/70">
              {status}
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
          </div>
        </div>
        {selected ? <CheckCircle2 className="h-5 w-5 shrink-0 text-cyan-200" /> : null}
      </div>
    </button>
  );
}

function ModeCard({
  selected,
  disabled = false,
  icon: Icon,
  label,
  onClick,
}: {
  selected: boolean;
  disabled?: boolean;
  icon: ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-[96px] flex-col items-center justify-center gap-2 rounded-2xl border text-center transition ${
        selected
          ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
          : "border-white/10 bg-black/20 text-slate-300 hover:border-white/20"
      } disabled:cursor-not-allowed disabled:opacity-45`}
    >
      <Icon className="h-8 w-8" />
      <div className="text-sm font-semibold">{label}</div>
    </button>
  );
}

function StateCard({
  selected,
  icon: Icon,
  label,
  description,
  tone,
  onClick,
}: {
  selected: boolean;
  icon: ElementType;
  label: string;
  description: string;
  tone: "cyan" | "emerald" | "amber" | "violet" | "rose" | "slate";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[122px] flex-col items-center justify-center gap-2 rounded-2xl border px-3 text-center transition ${
        selected
          ? "border-emerald-400/40 bg-emerald-500/10"
          : "border-white/10 bg-black/20 hover:border-white/20"
      }`}
    >
      <Icon className={`h-7 w-7 ${toneColor(tone)}`} />
      <div className="text-sm font-semibold text-white">{label}</div>
      <div className="text-xs leading-4 text-slate-500">{description}</div>
    </button>
  );
}

function Panel({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
      <div className="border-b border-white/10 px-5 py-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/80">
          {eyebrow}
        </div>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-white">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function ZegoPlannedPanel() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-[20px] border border-amber-400/20 bg-amber-500/10 p-4 md:col-span-2">
        <div className="flex items-start gap-3">
          <Power className="mt-0.5 h-5 w-5 text-amber-200" />
          <div>
            <div className="text-sm font-semibold text-amber-100">
              ZEGO is ON in the UI, but not connected yet
            </div>
            <p className="mt-2 text-xs leading-5 text-amber-100/70">
              No API calls, no streams, no secrets, no billing in Phase 3.
            </p>
          </div>
        </div>
      </div>
      <StatusLine label="Provider" value="ZEGO 即构" tone="amber" />
      <StatusLine label="Connection" value="Not connected" tone="slate" />
      <StatusLine label="API calls" value="Disabled" tone="slate" />
      <StatusLine label="Secrets" value="Backend only later" tone="emerald" />
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-[48px] items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
      <span className="font-medium text-slate-300">{label}</span>
      <span className="text-slate-500">{value}</span>
      <Lock className="h-4 w-4 shrink-0 text-slate-400" />
    </div>
  );
}

function StatusLine({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "amber" | "slate";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
      : tone === "amber"
        ? "border-amber-400/20 bg-amber-500/10 text-amber-200"
        : "border-white/10 bg-black/20 text-slate-300";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function toneColor(
  tone: "cyan" | "emerald" | "amber" | "violet" | "rose" | "slate"
) {
  if (tone === "emerald") return "text-emerald-200";
  if (tone === "amber") return "text-amber-200";
  if (tone === "violet") return "text-violet-200";
  if (tone === "rose") return "text-rose-200";
  if (tone === "slate") return "text-slate-300";
  return "text-cyan-200";
}
