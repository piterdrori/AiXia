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
        @keyframes aixia-avatar-head-idle {
          0%, 100% { transform: rotate(0deg) translateY(0); filter: saturate(1); }
          50% { transform: rotate(0.22deg) translateY(-0.5px); filter: saturate(1.015); }
        }

        @keyframes aixia-avatar-head-speaking {
          0%, 100% { transform: rotate(0deg) translateY(0); filter: saturate(1.015); }
          35% { transform: rotate(-0.32deg) translateY(-0.75px); filter: saturate(1.035); }
          70% { transform: rotate(0.24deg) translateY(0.35px); filter: saturate(1.025); }
        }

        @keyframes aixia-avatar-head-thinking {
          0%, 100% { transform: rotate(-0.22deg); }
          50% { transform: rotate(0.22deg); }
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

        .aixia-avatar-runtime-head {
          animation: aixia-avatar-head-idle 6.8s ease-in-out infinite;
          transform-origin: 50% 42%;
          will-change: transform;
        }

        .aixia-avatar-runtime-stage[data-state="listening"] .aixia-avatar-runtime-head {
          animation: aixia-avatar-head-idle 5.8s ease-in-out infinite;
        }

        .aixia-avatar-runtime-stage[data-state="speaking"] .aixia-avatar-runtime-head {
          animation: aixia-avatar-head-speaking 3.2s ease-in-out infinite;
        }

        .aixia-avatar-runtime-stage[data-state="thinking"] .aixia-avatar-runtime-head {
          animation: aixia-avatar-head-thinking 4.4s ease-in-out infinite;
        }

        .aixia-avatar-runtime-stage[data-state="paused"] .aixia-avatar-runtime-head {
          animation-play-state: paused;
          opacity: 0.86;
        }

        .aixia-avatar-runtime-stage[data-state="error"] .aixia-avatar-runtime-head {
          animation-play-state: paused;
          filter: saturate(0.75);
          opacity: 0.78;
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
        className="aixia-avatar-runtime-stage relative flex h-[260px] w-[260px] items-center justify-center overflow-visible rounded-[34px] border border-cyan-300/16 bg-transparent"
        data-state={state}
      >
        <div className="absolute inset-0 rounded-[34px] bg-[radial-gradient(circle_at_50%_42%,rgba(34,211,238,0.12),transparent_58%)]" />

        <div className="aixia-avatar-runtime-head relative h-[246px] w-[246px] overflow-hidden rounded-[34px]">
          {layers.base_avatar ? (
            <img
              src={layers.base_avatar}
              alt={`${asset.name} base avatar`}
              className="absolute inset-0 h-full w-full object-contain"
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
    </div>
  );
}
