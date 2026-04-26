import {
  Archive,
  Cuboid,
  FileJson,
  Image,
  Trash2,
  Video,
} from "lucide-react";

type AvatarAssetCardType = "image" | "gif" | "video" | "lottie" | "glb" | "gltf";

type AvatarAssetCardStatus =
  | "raw_uploaded"
  | "face_detected"
  | "avatar_pack_ready";

type AvatarAssetCardAsset = {
  id: string;
  name: string;
  asset_type: AvatarAssetCardType;
  file_size_bytes: number;
  signedUrl: string | null;
};

function getAvatarPackStatusText(status: AvatarAssetCardStatus) {
  if (status === "avatar_pack_ready") return "Avatar pack ready";
  if (status === "face_detected") return "Avatar pack foundation ready";
  return "Raw upload — prepare needed";
}

export function AvatarAssetCard({
  asset,
  selected,
  detecting,
  avatarPackStatus,
  fileSizeLabel,
  onSelect,
  onPrepareAvatarPack,
  onArchive,
  onDelete,
}: {
  asset: AvatarAssetCardAsset;
  selected: boolean;
  detecting: boolean;
  avatarPackStatus: AvatarAssetCardStatus;
  fileSizeLabel: string;
  onSelect: () => void;
  onPrepareAvatarPack: () => void;
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

  const canPrepareAvatarPack =
    asset.asset_type === "image" || asset.asset_type === "gif";

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
          {asset.asset_type} · {fileSizeLabel}
        </div>

        <div className="mt-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          {getAvatarPackStatusText(avatarPackStatus)}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onSelect}
            className="inline-flex items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-2 py-2 text-xs font-semibold text-cyan-200 transition hover:border-cyan-300/50"
          >
            {selected ? "Active" : "Use"}
          </button>

          <button
            type="button"
            onClick={onPrepareAvatarPack}
            disabled={!canPrepareAvatarPack || detecting}
            className="inline-flex items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-2 py-2 text-xs font-semibold text-emerald-200 transition hover:border-emerald-300/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {detecting ? "Generating..." : "Prepare Avatar Pack"}
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
