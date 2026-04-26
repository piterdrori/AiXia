import { Box, Cuboid, FileJson } from "lucide-react";

type AvatarAssetPreviewAsset = {
  name: string;
  asset_type: "image" | "gif" | "video" | "lottie" | "glb" | "gltf";
  signedUrl: string | null;
  avatarPackBaseSignedUrl: string | null;
};

export function AvatarAssetPreview({
  asset,
  large = false,
}: {
  asset: AvatarAssetPreviewAsset | null;
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
    const preparedAvatarUrl = asset.avatarPackBaseSignedUrl ?? asset.signedUrl;
    const isPreparedAvatar = Boolean(asset.avatarPackBaseSignedUrl);

    return (
      <div
        className={`relative flex ${
          large ? "h-full w-full" : "h-[220px]"
        } items-center justify-center overflow-hidden rounded-[22px] border border-white/10 bg-black/25`}
      >
        <img
          src={preparedAvatarUrl}
          alt={asset.name}
          className="h-full w-full object-contain"
        />

        {isPreparedAvatar ? (
          <div className="absolute left-3 top-3 rounded-full border border-emerald-400/20 bg-black/55 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100 backdrop-blur-xl">
            Prepared avatar
          </div>
        ) : null}
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
