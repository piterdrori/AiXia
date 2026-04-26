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
        @keyframes aixia-avatar-visible-idle {
          0% { transform: translateX(-4px) translateY(0) rotate(-1.2deg); }
          25% { transform: translateX(3px) translateY(-3px) rotate(1deg); }
          50% { transform: translateX(4px) translateY(2px) rotate(1.4deg); }
          75% { transform: translateX(-2px) translateY(-2px) rotate(-0.8deg); }
          100% { transform: translateX(-4px) translateY(0) rotate(-1.2deg); }
        }

        @keyframes aixia-avatar-visible-speaking {
          0% { transform: translateX(-5px) translateY(0) rotate(-1.6deg); }
          20% { transform: translateX(4px) translateY(-4px) rotate(1.5deg); }
          40% { transform: translateX(6px) translateY(2px) rotate(1.8deg); }
          60% { transform: translateX(-3px) translateY(-3px) rotate(-1.1deg); }
          80% { transform: translateX(2px) translateY(3px) rotate(0.9deg); }
          100% { transform: translateX(-5px) translateY(0) rotate(-1.6deg); }
        }

        @keyframes aixia-avatar-visible-thinking {
          0% { transform: translateX(-3px) translateY(0) rotate(-1deg); }
          50% { transform: translateX(3px) translateY(-4px) rotate(1deg); }
          100% { transform: translateX(-3px) translateY(0) rotate(-1deg); }
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
          animation: aixia-avatar-visible-idle 5.8s ease-in-out infinite;
          transform-origin: 50% 38%;
          will-change: transform;
        }

        .aixia-avatar-runtime-stage[data-state="listening"] .aixia-avatar-runtime-head {
          animation: aixia-avatar-visible-idle 4.6s ease-in-out infinite;
        }

        .aixia-avatar-runtime-stage[data-state="speaking"] .aixia-avatar-runtime-head {
          animation: aixia-avatar-visible-speaking 2.8s ease-in-out infinite;
        }

        .aixia-avatar-runtime-stage[data-state="thinking"] .aixia-avatar-runtime-head {
          animation: aixia-avatar-visible-thinking 3.2s ease-in-out infinite;
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
        className="aixia-avatar-runtime-stage relative flex h-[260px] w-[260px] items-center justify-center overflow-visible bg-transparent"
        data-state={state}
      >
        <div className="absolute inset-0 rounded-[34px] bg-[radial-gradient(circle_at_50%_42%,rgba(34,211,238,0.08),transparent_58%)]" />

        <div className="aixia-avatar-runtime-head relative h-[246px] w-[246px] overflow-visible bg-transparent">
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
