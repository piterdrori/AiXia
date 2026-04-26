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
        @keyframes aixia-avatar-pack-subtle-idle {
          0%, 100% { transform: translateY(0) rotate(0deg) scale(1); filter: saturate(1); }
          50% { transform: translateY(-1px) rotate(0.35deg) scale(1.002); filter: saturate(1.025); }
        }

        @keyframes aixia-avatar-pack-subtle-speaking {
          0%, 100% { transform: translateY(0) rotate(0deg) scale(1); filter: saturate(1.02); }
          35% { transform: translateY(-1px) rotate(-0.45deg) scale(1.004); filter: saturate(1.05); }
          70% { transform: translateY(0.5px) rotate(0.35deg) scale(1.002); filter: saturate(1.035); }
        }

        @keyframes aixia-avatar-pack-subtle-thinking {
          0%, 100% { transform: rotate(-0.35deg) scale(1); }
          50% { transform: rotate(0.35deg) scale(1.002); }
        }

        @keyframes aixia-avatar-pack-clean-blink {
          0%, 88%, 100% { opacity: 0; }
          91%, 94% { opacity: 1; }
        }

        @keyframes aixia-avatar-pack-mouth-state {
          0%, 100% { opacity: 0.92; transform: scaleY(0.98); }
          50% { opacity: 1; transform: scaleY(1.02); }
        }

        .aixia-avatar-pack-stage-clean {
          animation: aixia-avatar-pack-subtle-idle 5.8s ease-in-out infinite;
          transform-origin: center center;
        }

        .aixia-avatar-pack-stage-clean[data-state="listening"] {
          animation: aixia-avatar-pack-subtle-idle 4.6s ease-in-out infinite;
        }

        .aixia-avatar-pack-stage-clean[data-state="speaking"] {
          animation: aixia-avatar-pack-subtle-speaking 2.6s ease-in-out infinite;
        }

        .aixia-avatar-pack-stage-clean[data-state="thinking"] {
          animation: aixia-avatar-pack-subtle-thinking 3.8s ease-in-out infinite;
        }

        .aixia-avatar-pack-stage-clean[data-state="paused"] {
          animation-play-state: paused;
          opacity: 0.82;
        }

        .aixia-avatar-pack-clean-blink-layer {
          opacity: 0;
          animation: aixia-avatar-pack-clean-blink 4.4s ease-in-out infinite;
        }

        .aixia-avatar-pack-stage-clean[data-state="speaking"] .aixia-avatar-pack-clean-blink-layer {
          animation-duration: 3.4s;
        }

        .aixia-avatar-pack-clean-mouth-layer {
          transform-origin: center center;
        }

        .aixia-avatar-pack-stage-clean[data-state="speaking"] .aixia-avatar-pack-clean-mouth-layer,
        .aixia-avatar-pack-stage-clean[data-state="listening"] .aixia-avatar-pack-clean-mouth-layer {
          animation: aixia-avatar-pack-mouth-state 0.34s ease-in-out infinite;
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
        className="aixia-avatar-pack-stage-clean relative h-[260px] w-[260px] overflow-hidden rounded-[32px] border border-cyan-300/20 bg-black/35 shadow-2xl shadow-cyan-400/20"
        data-state={state}
      >
        {layers.base_avatar ? (
          <img
            src={layers.base_avatar}
            alt={`${asset.name} base avatar`}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}

        {layers.eyes_open ? (
          <img
            src={layers.eyes_open}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}

        {shouldShowClosedEyes && layers.eyes_closed ? (
          <img
            src={layers.eyes_closed}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}

        {state !== "paused" && layers.eyes_closed ? (
          <img
            src={layers.eyes_closed}
            alt=""
            aria-hidden="true"
            className="aixia-avatar-pack-clean-blink-layer absolute inset-0 h-full w-full object-cover"
          />
        ) : null}

        {layers[mouthLayer] ? (
          <img
            src={layers[mouthLayer]}
            alt=""
            aria-hidden="true"
            className="aixia-avatar-pack-clean-mouth-layer absolute inset-0 h-full w-full object-cover"
          />
        ) : null}

        <div className="pointer-events-none absolute inset-0 rounded-[32px] ring-1 ring-white/10" />
      </div>
    </div>
  );
}
