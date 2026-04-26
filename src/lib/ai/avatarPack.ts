import type { AiAvatarFaceLandmarks, FacePoint } from "@/lib/ai/faceLandmarks";

export type AvatarPackLayerKey =
  | "base_avatar"
  | "body_avatar"
  | "head_avatar"
  | "neck_shadow"
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

  const rawSize = Math.max(faceBox.width, faceBox.height) * 1.75;
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

function removeLightBackground(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not available.");
  }

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];

    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const colorSpread = max - min;

    const isWhiteBackground =
      red > 220 && green > 220 && blue > 220 && colorSpread < 42;

    const isNearWhiteBackground = red > 238 && green > 238 && blue > 238;

    if (isWhiteBackground || isNearWhiteBackground) {
      const fade = clamp((255 - max) / 35, 0, 1);
      data[index + 3] = Math.round(data[index + 3] * fade);
    }
  }

  context.putImageData(imageData, 0, 0);
}

function drawPreparedImageToCanvas(
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

  removeLightBackground(canvas);

  return canvas;
}

function getHeadMaskGeometry(landmarks: {
  leftEye: FacePoint;
  rightEye: FacePoint;
  mouth: FacePoint;
}) {
  const eyeCenterX = (landmarks.leftEye.x + landmarks.rightEye.x) / 2;
  const eyeCenterY = (landmarks.leftEye.y + landmarks.rightEye.y) / 2;
  const eyeDistance = Math.abs(landmarks.rightEye.x - landmarks.leftEye.x);

  const headCenterX = eyeCenterX;
  const headCenterY = eyeCenterY + eyeDistance * 1.05;

  return {
    centerX: headCenterX,
    centerY: headCenterY,
    radiusX: clamp(eyeDistance * 2.05, 145, 250),
    radiusY: clamp(eyeDistance * 2.75, 195, 315),
  };
}

function clipHeadShape(
  context: CanvasRenderingContext2D,
  geometry: ReturnType<typeof getHeadMaskGeometry>
) {
  context.beginPath();
  context.ellipse(
    geometry.centerX,
    geometry.centerY,
    geometry.radiusX,
    geometry.radiusY,
    0,
    0,
    Math.PI * 2
  );
  context.clip();
}

function eraseHeadShape(
  context: CanvasRenderingContext2D,
  geometry: ReturnType<typeof getHeadMaskGeometry>
) {
  context.save();
  context.globalCompositeOperation = "destination-out";
  context.beginPath();
  context.ellipse(
    geometry.centerX,
    geometry.centerY,
    geometry.radiusX * 1.02,
    geometry.radiusY * 1.03,
    0,
    0,
    Math.PI * 2
  );
  context.fill();
  context.restore();
}

function drawBaseAvatar(preparedCanvas: HTMLCanvasElement) {
  const canvas = createCanvas();
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not available.");
  }

  context.clearRect(0, 0, AVATAR_CANVAS_SIZE, AVATAR_CANVAS_SIZE);
  context.drawImage(preparedCanvas, 0, 0);

  return canvas;
}

function drawBodyAvatar(
  preparedCanvas: HTMLCanvasElement,
  mappedLandmarks: {
    leftEye: FacePoint;
    rightEye: FacePoint;
    mouth: FacePoint;
  }
) {
  const canvas = createCanvas();
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not available.");
  }

  const headGeometry = getHeadMaskGeometry(mappedLandmarks);

  context.clearRect(0, 0, AVATAR_CANVAS_SIZE, AVATAR_CANVAS_SIZE);
  context.drawImage(preparedCanvas, 0, 0);

  eraseHeadShape(context, headGeometry);

  return canvas;
}

function drawHeadAvatar(
  preparedCanvas: HTMLCanvasElement,
  mappedLandmarks: {
    leftEye: FacePoint;
    rightEye: FacePoint;
    mouth: FacePoint;
  }
) {
  const canvas = createCanvas();
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not available.");
  }

  const headGeometry = getHeadMaskGeometry(mappedLandmarks);

  context.clearRect(0, 0, AVATAR_CANVAS_SIZE, AVATAR_CANVAS_SIZE);

  context.save();
  clipHeadShape(context, headGeometry);
  context.drawImage(preparedCanvas, 0, 0);
  context.restore();

  return canvas;
}

function drawNeckShadow(
  mappedLandmarks: {
    leftEye: FacePoint;
    rightEye: FacePoint;
    mouth: FacePoint;
  }
) {
  const canvas = createTransparentLayer();
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not available.");
  }

  const headGeometry = getHeadMaskGeometry(mappedLandmarks);

  const shadowGradient = context.createRadialGradient(
    headGeometry.centerX,
    headGeometry.centerY + headGeometry.radiusY * 0.78,
    12,
    headGeometry.centerX,
    headGeometry.centerY + headGeometry.radiusY * 0.78,
    headGeometry.radiusX * 0.72
  );

  shadowGradient.addColorStop(0, "rgba(0,0,0,0.20)");
  shadowGradient.addColorStop(1, "rgba(0,0,0,0)");

  context.fillStyle = shadowGradient;
  context.beginPath();
  context.ellipse(
    headGeometry.centerX,
    headGeometry.centerY + headGeometry.radiusY * 0.76,
    headGeometry.radiusX * 0.65,
    headGeometry.radiusY * 0.18,
    0,
    0,
    Math.PI * 2
  );
  context.fill();

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

  const mappedLandmarks = {
    leftEye,
    rightEye,
    mouth,
  };

  const preparedCanvas = drawPreparedImageToCanvas(image, landmarks, crop);

  const baseCanvas = drawBaseAvatar(preparedCanvas);
  const bodyCanvas = drawBodyAvatar(preparedCanvas, mappedLandmarks);
  const headCanvas = drawHeadAvatar(preparedCanvas, mappedLandmarks);
  const neckShadowCanvas = drawNeckShadow(mappedLandmarks);

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
      await makeLayer("body_avatar", bodyCanvas),
      await makeLayer("head_avatar", headCanvas),
      await makeLayer("neck_shadow", neckShadowCanvas),
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
