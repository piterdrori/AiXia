import type { AiAvatarFaceLandmarks, FacePoint } from "@/lib/ai/faceLandmarks";

export type AvatarPackLayerKey =
  | "base_avatar"
  | "eyes_open"
  | "eyes_closed"
  | "mouth_rest"
  | "mouth_small"
  | "mouth_medium"
  | "mouth_open"
  | "mouth_round";

export type AvatarPackLayerBlob = {
  key: AvatarPackLayerKey;
  filename: string;
  contentType: "image/png";
  blob: Blob;
};

export type AvatarPackLayerManifest = {
  storage_path: string;
  content_type: "image/png";
  width: number;
  height: number;
};

export type AvatarPackManifest = {
  version: 1;
  status: "avatar_pack_ready";
  generated_at: string;
  generator: "aixia_canvas_avatar_pack_v1";
  runtime_strategy: "preloaded_sprite_layers";
  runtime_mediapipe: false;
  visible_overlay: false;
  canvas_size: {
    width: number;
    height: number;
  };
  crop: {
    x: number;
    y: number;
    size: number;
  };
  landmarks: {
    leftEye: FacePoint;
    rightEye: FacePoint;
    mouth: FacePoint;
    mouthWidth: number;
  };
  layers: Record<AvatarPackLayerKey, AvatarPackLayerManifest>;
};

export type GeneratedAvatarPack = {
  layers: AvatarPackLayerBlob[];
  manifestDraft: Omit<AvatarPackManifest, "layers">;
};

const AVATAR_CANVAS_SIZE = 768;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function createCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_CANVAS_SIZE;
  canvas.height = AVATAR_CANVAS_SIZE;
  return canvas;
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to create avatar pack image."));
          return;
        }

        resolve(blob);
      },
      "image/png",
      0.96
    );
  });
}

async function loadImage(imageUrl: string) {
  const image = document.createElement("img");
  image.crossOrigin = "anonymous";
  image.decoding = "async";
  image.src = imageUrl;
  await image.decode();
  return image;
}

function getCropFromLandmarks(landmarks: AiAvatarFaceLandmarks) {
  const faceBox = landmarks.faceBox;
  const centerX = faceBox.x + faceBox.width / 2;
  const centerY = faceBox.y + faceBox.height / 2;

  const rawSize = Math.max(faceBox.width, faceBox.height) * 1.9;
  const size = clamp(rawSize, 0.42, 1);

  const x = clamp(centerX - size / 2, 0, 1 - size);
  const y = clamp(centerY - size * 0.46, 0, 1 - size);

  return { x, y, size };
}

function mapPointToAvatarCanvas(
  point: FacePoint,
  crop: { x: number; y: number; size: number }
): FacePoint {
  return {
    x: ((point.x - crop.x) / crop.size) * AVATAR_CANVAS_SIZE,
    y: ((point.y - crop.y) / crop.size) * AVATAR_CANVAS_SIZE,
  };
}

function drawBaseAvatar(
  image: HTMLImageElement,
  landmarks: AiAvatarFaceLandmarks,
  crop: { x: number; y: number; size: number }
) {
  const canvas = createCanvas();
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not available.");
  }

  context.clearRect(0, 0, AVATAR_CANVAS_SIZE, AVATAR_CANVAS_SIZE);
  context.fillStyle = "#05070d";
  context.fillRect(0, 0, AVATAR_CANVAS_SIZE, AVATAR_CANVAS_SIZE);

  context.save();
  context.beginPath();
  context.roundRect(0, 0, AVATAR_CANVAS_SIZE, AVATAR_CANVAS_SIZE, 96);
  context.clip();

  context.drawImage(
    image,
    crop.x * landmarks.imageWidth,
    crop.y * landmarks.imageHeight,
    crop.size * landmarks.imageWidth,
    crop.size * landmarks.imageHeight,
    0,
    0,
    AVATAR_CANVAS_SIZE,
    AVATAR_CANVAS_SIZE
  );

  context.restore();

  return canvas;
}

function createTransparentLayer() {
  return createCanvas();
}

function drawEyeClosedLayer(
  leftEye: FacePoint,
  rightEye: FacePoint
) {
  const canvas = createTransparentLayer();
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not available.");
  }

  context.strokeStyle = "rgba(255,255,255,0.82)";
  context.lineWidth = 10;
  context.lineCap = "round";

  for (const eye of [leftEye, rightEye]) {
    context.beginPath();
    context.moveTo(eye.x - 28, eye.y);
    context.quadraticCurveTo(eye.x, eye.y + 10, eye.x + 28, eye.y);
    context.stroke();
  }

  return canvas;
}

function drawMouthLayer(
  mouth: FacePoint,
  mouthWidth: number,
  shape: "rest" | "small" | "medium" | "open" | "round"
) {
  const canvas = createTransparentLayer();
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not available.");
  }

  const width = clamp(mouthWidth * AVATAR_CANVAS_SIZE * 0.9, 34, 130);
  const heightByShape = {
    rest: 6,
    small: 14,
    medium: 26,
    open: 46,
    round: 38,
  };

  const height = heightByShape[shape];

  context.fillStyle = "rgba(5,7,13,0.72)";
  context.strokeStyle = "rgba(255,255,255,0.28)";
  context.lineWidth = 3;

  context.beginPath();
  context.ellipse(
    mouth.x,
    mouth.y + 12,
    shape === "round" ? height * 0.62 : width / 2,
    height / 2,
    0,
    0,
    Math.PI * 2
  );
  context.fill();
  context.stroke();

  return canvas;
}

async function makeLayer(
  key: AvatarPackLayerKey,
  canvas: HTMLCanvasElement
): Promise<AvatarPackLayerBlob> {
  return {
    key,
    filename: `${key}.png`,
    contentType: "image/png",
    blob: await canvasToPngBlob(canvas),
  };
}

export async function generateAvatarPackFromImageUrl({
  imageUrl,
  landmarks,
}: {
  imageUrl: string;
  landmarks: AiAvatarFaceLandmarks;
}): Promise<GeneratedAvatarPack> {
  const image = await loadImage(imageUrl);
  const crop = getCropFromLandmarks(landmarks);

  const leftEye = mapPointToAvatarCanvas(landmarks.leftEye, crop);
  const rightEye = mapPointToAvatarCanvas(landmarks.rightEye, crop);
  const mouth = mapPointToAvatarCanvas(landmarks.mouth, crop);

  const baseCanvas = drawBaseAvatar(image, landmarks, crop);
  const eyesOpenCanvas = createTransparentLayer();
  const eyesClosedCanvas = drawEyeClosedLayer(leftEye, rightEye);

  const mouthRestCanvas = drawMouthLayer(mouth, landmarks.mouthWidth, "rest");
  const mouthSmallCanvas = drawMouthLayer(mouth, landmarks.mouthWidth, "small");
  const mouthMediumCanvas = drawMouthLayer(mouth, landmarks.mouthWidth, "medium");
  const mouthOpenCanvas = drawMouthLayer(mouth, landmarks.mouthWidth, "open");
  const mouthRoundCanvas = drawMouthLayer(mouth, landmarks.mouthWidth, "round");

  return {
    layers: [
      await makeLayer("base_avatar", baseCanvas),
      await makeLayer("eyes_open", eyesOpenCanvas),
      await makeLayer("eyes_closed", eyesClosedCanvas),
      await makeLayer("mouth_rest", mouthRestCanvas),
      await makeLayer("mouth_small", mouthSmallCanvas),
      await makeLayer("mouth_medium", mouthMediumCanvas),
      await makeLayer("mouth_open", mouthOpenCanvas),
      await makeLayer("mouth_round", mouthRoundCanvas),
    ],
    manifestDraft: {
      version: 1,
      status: "avatar_pack_ready",
      generated_at: new Date().toISOString(),
      generator: "aixia_canvas_avatar_pack_v1",
      runtime_strategy: "preloaded_sprite_layers",
      runtime_mediapipe: false,
      visible_overlay: false,
      canvas_size: {
        width: AVATAR_CANVAS_SIZE,
        height: AVATAR_CANVAS_SIZE,
      },
      crop,
      landmarks: {
        leftEye,
        rightEye,
        mouth,
        mouthWidth: landmarks.mouthWidth,
      },
    },
  };
}

export function isAvatarPackManifest(value: unknown): value is AvatarPackManifest {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<AvatarPackManifest>;

  return (
    candidate.version === 1 &&
    candidate.status === "avatar_pack_ready" &&
    candidate.generator === "aixia_canvas_avatar_pack_v1" &&
    candidate.runtime_strategy === "preloaded_sprite_layers" &&
    candidate.runtime_mediapipe === false &&
    candidate.visible_overlay === false &&
    Boolean(candidate.layers?.base_avatar?.storage_path)
  );
}
