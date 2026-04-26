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
        @keyframes aixia-head-idle {
          0% { transform: translateX(-4px) translateY(0) rotate(-1deg); }
          25% { transform: translateX(3px) translateY(-3px) rotate(0.9deg); }
          50% { transform: translateX(5px) translateY(1px) rotate(1.2deg); }
          75% { transform: translateX(-2px) translateY(-2px) rotate(-0.7deg); }
          100% { transform: translateX(-4px) translateY(0) rotate(-1deg); }
        }

        @keyframes aixia-head-speaking {
          0% { transform: translateX(-5px) translateY(0) rotate(-1.5deg); }
          20% { transform: translateX(4px) translateY(-4px) rotate(1.4deg); }
          40% { transform: translateX(6px) translateY(2px) rotate(1.8deg); }
          60% { transform: translateX(-3px) translateY(-3px) rotate(-1.1deg); }
          80% { transform: translateX(2px) translateY(3px) rotate(0.9deg); }
          100% { transform: translateX(-5px) translateY(0) rotate(-1.5deg); }
        }

        @keyframes aixia-head-thinking {
          0% { transform: translateX(-3px) translateY(0) rotate(-0.8deg); }
          50% { transform: translateX(3px) translateY(-4px) rotate(0.8deg); }
          100% { transform: translateX(-3px) translateY(0) rotate(-0.8deg); }
        }

        @keyframes aixia-avatar-clean-blink {
          0%, 88%, 100% { opacity: 0; }
          91%, 94% { opacity: 1; }
        }

        @keyframes aixia-avatar-mouth-state {
          0%, 100% { opacity: 0.9; transform: scaleY(0.99); }
          50% { opacity: 1; transform: scaleY(1.01); }
        }

        .aixia-avatar-runtime-head-layer {
          animation: aixia-head-idle 5.6s ease-in-out infinite;
          transform-origin: 50% 58%;
          will-change: transform;
        }

        .aixia-avatar-runtime-stage[data-state="listening"] .aixia-avatar-runtime-head-layer {
          animation: aixia-head-idle 4.4s ease-in-out infinite;
        }

        .aixia-avatar-runtime-stage[data-state="speaking"] .aixia-avatar-runtime-head-layer {
          animation: aixia-head-speaking 2.7s ease-in-out infinite;
        }

        .aixia-avatar-runtime-stage[data-state="thinking"] .aixia-avatar-runtime-head-layer {
          animation: aixia-head-thinking 3.2s ease-in-out infinite;
        }

        .aixia-avatar-runtime-stage[data-state="paused"] .aixia-avatar-runtime-head-layer,
        .aixia-avatar-runtime-stage[data-state="error"] .aixia-avatar-runtime-head-layer {
          animation-play-state: paused;
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
  const hasSplitAvatar = Boolean(layers.body_avatar && layers.head_avatar);

  return (
    <div className="relative z-10 flex h-full w-full items-center justify-center">
      <AvatarPackRuntimeStyles />

      <div
        className="aixia-avatar-runtime-stage relative h-[260px] w-[260px] overflow-visible bg-transparent"
        data-state={state}
      >
        {hasSplitAvatar ? (
          <>
            {layers.neck_shadow ? (
              <img
                src={layers.neck_shadow}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-contain"
              />
            ) : null}

            {layers.body_avatar ? (
              <img
                src={layers.body_avatar}
                alt={`${asset.name} body avatar`}
                className="absolute inset-0 h-full w-full object-contain"
              />
            ) : null}

            <div className="aixia-avatar-runtime-head-layer absolute inset-0 h-full w-full">
              {layers.head_avatar ? (
                <img
                  src={layers.head_avatar}
                  alt={`${asset.name} head avatar`}
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
          </>
        ) : (
          <div className="aixia-avatar-runtime-head-layer absolute inset-0 h-full w-full">
            {layers.base_avatar ? (
              <img
                src={layers.base_avatar}
                alt={`${asset.name} base avatar`}
                className="absolute inset-0 h-full w-full object-contain"
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
