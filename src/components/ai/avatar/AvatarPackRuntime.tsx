import type { AvatarPackLayerKey } from "@/lib/ai/avatarPack";

type AvatarPackRuntimeState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "paused"
  | "error";

type AvatarPackSignedUrls = Partial<Record<AvatarPackLayerKey, string>>;

type AvatarPackRuntimeAsset = {
  name: string;
  avatarPackLayerSignedUrls: AvatarPackSignedUrls;
};

function getRuntimeMouthLayer(
  state: AvatarPackRuntimeState,
  lipSyncEnabled: boolean
): AvatarPackLayerKey {
  if (!lipSyncEnabled) return "mouth_rest";
  if (state === "speaking") return "mouth_open";
  if (state === "listening") return "mouth_medium";
  if (state === "thinking") return "mouth_small";
  return "mouth_rest";
}

function AvatarPackRuntimeStyles() {
  return (
    <style>
      {`
        @keyframes aixia-avatar-no-cut-breath {
          0%, 100% { filter: saturate(1); }
          50% { filter: saturate(1.025); }
        }

        @keyframes aixia-avatar-clean-blink {
          0%, 88%, 100% { opacity: 0; }
          91%, 94% { opacity: 1; }
        }

        @keyframes aixia-avatar-mouth-state {
          0%, 100% { opacity: 0.9; transform: scaleY(0.99); }
          50% { opacity: 1; transform: scaleY(1.01); }
        }

        .aixia-avatar-runtime-stage {
          transform: none;
          animation: none;
        }

        .aixia-avatar-runtime-image {
          animation: aixia-avatar-no-cut-breath 6s ease-in-out infinite;
          will-change: filter;
        }

        .aixia-avatar-runtime-blink {
          opacity: 0;
          animation: aixia-avatar-clean-blink 4.6s ease-in-out infinite;
        }

        .aixia-avatar-runtime-stage[data-state="speaking"] .aixia-avatar-runtime-blink {
          animation-duration: 3.6s;
        }

        .aixia-avatar-runtime-mouth {
          transform-origin: center center;
        }

        .aixia-avatar-runtime-stage[data-state="speaking"] .aixia-avatar-runtime-mouth,
        .aixia-avatar-runtime-stage[data-state="listening"] .aixia-avatar-runtime-mouth {
          animation: aixia-avatar-mouth-state 0.34s ease-in-out infinite;
        }
      `}
    </style>
  );
}

export function AvatarPackRuntime({
  asset,
  state,
  lipSyncEnabled,
}: {
  asset: AvatarPackRuntimeAsset;
  state: AvatarPackRuntimeState;
  lipSyncEnabled: boolean;
}) {
  const layers = asset.avatarPackLayerSignedUrls;
  const mouthLayer = getRuntimeMouthLayer(state, lipSyncEnabled);
  const shouldShowClosedEyes = state === "paused" || state === "thinking";

  return (
    <div className="relative z-10 flex h-full w-full items-center justify-center">
      <AvatarPackRuntimeStyles />

      <div
        className="aixia-avatar-runtime-stage relative h-[260px] w-[260px] overflow-visible bg-transparent"
        data-state={state}
      >
        {layers.base_avatar ? (
          <img
            src={layers.base_avatar}
            alt={`${asset.name} base avatar`}
            className="aixia-avatar-runtime-image absolute inset-0 h-full w-full object-contain"
          />
        ) : null}

        {layers.eyes_open ? (
          <img
            src={layers.eyes_open}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-contain"
          />
        ) : null}

        {shouldShowClosedEyes && layers.eyes_closed ? (
          <img
            src={layers.eyes_closed}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-contain"
          />
        ) : null}

        {state !== "paused" && layers.eyes_closed ? (
          <img
            src={layers.eyes_closed}
            alt=""
            aria-hidden="true"
            className="aixia-avatar-runtime-blink absolute inset-0 h-full w-full object-contain"
          />
        ) : null}

        {layers[mouthLayer] ? (
          <img
            src={layers[mouthLayer]}
            alt=""
            aria-hidden="true"
            className="aixia-avatar-runtime-mouth absolute inset-0 h-full w-full object-contain"
          />
        ) : null}
      </div>
    </div>
  );
}
