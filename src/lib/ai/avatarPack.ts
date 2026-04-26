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

function waitForImageLoad(image: HTMLImageElement): Promise<void> {
  return new Promise((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () =>
      reject(new Error("Avatar source image failed to decode in the browser."));
  });
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to create avatar pack PNG layer from canvas."));
            return;
          }

          resolve(blob);
        },
        "image/png",
        0.96
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Canvas export failed during avatar pack generation.";

      reject(new Error(message));
    }
  });
}

async function loadImage(imageUrl: string) {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`Avatar source image failed to load: ${response.status}`);
  }

  const blob = await response.blob();

  if (!blob.type.startsWith("image/")) {
    throw new Error(
      `Avatar pack expected an image file, but received ${
        blob.type || "unknown file type"
      }.`
    );
  }

  const objectUrl = URL.createObjectURL(blob);
  const image = document.createElement("img");

  try {
    image.decoding = "async";
    image.src = objectUrl;

    await waitForImageLoad(image);

    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function getCropFromLandmarks(landmarks: AiAvatarFaceLandmarks) {
  const faceBox = landmarks.faceBox;
  const centerX = faceBox.x + faceBox.width / 2;
  const centerY = faceBox.y + faceBox.height / 2;

  const rawSize = Math.max(faceBox.width, faceBox.height) * 1.72;
  const size = clamp(rawSize, 0.36, 1);

  const x = clamp(centerX - size / 2, 0, 1 - size);
  const y = clamp(centerY - size * 0.43, 0, 1 - size);

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

function drawCleanAvatarMask(context: CanvasRenderingContext2D) {
  const centerX = AVATAR_CANVAS_SIZE / 2;
  const centerY = AVATAR_CANVAS_SIZE / 2;
  const radiusX = AVATAR_CANVAS_SIZE * 0.43;
  const radiusY = AVATAR_CANVAS_SIZE * 0.49;

  context.beginPath();
  context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
  context.clip();
}

function drawSoftAvatarFrame(context: CanvasRenderingContext2D) {
  const centerX = AVATAR_CANVAS_SIZE / 2;
  const centerY = AVATAR_CANVAS_SIZE / 2;

  const vignette = context.createRadialGradient(
    centerX,
    centerY,
    AVATAR_CANVAS_SIZE * 0.18,
    centerX,
    centerY,
    AVATAR_CANVAS_SIZE * 0.52
  );

  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(0.72, "rgba(0,0,0,0.04)");
  vignette.addColorStop(1, "rgba(0,0,0,0.42)");

  context.fillStyle = vignette;
  context.fillRect(0, 0, AVATAR_CANVAS_SIZE, AVATAR_CANVAS_SIZE);
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

  context.save();
  drawCleanAvatarMask(context);

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

  drawSoftAvatarFrame(context);
  context.restore();

  return canvas;
}

function createTransparentLayer() {
  const canvas = createCanvas();
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not available.");
  }

  context.clearRect(0, 0, AVATAR_CANVAS_SIZE, AVATAR_CANVAS_SIZE);

  return canvas;
}

function drawEyeClosedLayer(leftEye: FacePoint, rightEye: FacePoint) {
  void leftEye;
  void rightEye;

  return createTransparentLayer();
}

function drawMouthLayer(
  mouth: FacePoint,
  mouthWidth: number,
  shape: "rest" | "small" | "medium" | "open" | "round"
) {
  void mouth;
  void mouthWidth;
  void shape;

  return createTransparentLayer();
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
