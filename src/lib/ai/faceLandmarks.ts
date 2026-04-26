import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";

export type FacePoint = {
  x: number;
  y: number;
};

export type AiAvatarFaceLandmarks = {
  version: 1;
  source: "mediapipe_face_landmarker";
  imageWidth: number;
  imageHeight: number;
  faceBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  leftEye: FacePoint;
  rightEye: FacePoint;
  mouth: FacePoint;
  mouthWidth: number;
  confidence: number;
  detectedAt: string;
};

let faceLandmarkerPromise: Promise<FaceLandmarker> | null = null;

const WASM_BASE_URLS = [
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm",
  "https://unpkg.com/@mediapipe/tasks-vision@0.10.22/wasm",
];

const FACE_LANDMARKER_MODEL_URLS = [
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
];

function getUnknownErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  try {
    const json = JSON.stringify(error);

    if (json && json !== "{}") return json;
  } catch {
    // Ignore stringify failure.
  }

  return "The browser blocked or failed to load the MediaPipe WASM/model asset.";
}

function averagePoint(points: NormalizedLandmark[]): FacePoint {
  const total = points.reduce(
    (sum, point) => ({
      x: sum.x + point.x,
      y: sum.y + point.y,
    }),
    { x: 0, y: 0 }
  );

  return {
    x: total.x / points.length,
    y: total.y / points.length,
  };
}

function distance(a: FacePoint, b: FacePoint) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function waitForImageLoad(image: HTMLImageElement): Promise<void> {
  return new Promise((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Face detection image failed to decode in the browser."));
  });
}

function getFaceBox(points: NormalizedLandmark[]) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

async function getFaceLandmarker() {
  if (!faceLandmarkerPromise) {
    faceLandmarkerPromise = (async () => {
      const errors: string[] = [];

      for (const wasmBaseUrl of WASM_BASE_URLS) {
        for (const modelUrl of FACE_LANDMARKER_MODEL_URLS) {
          try {
            const vision = await FilesetResolver.forVisionTasks(wasmBaseUrl);

            return await FaceLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: modelUrl,
                delegate: "CPU",
              },
              runningMode: "IMAGE",
              numFaces: 1,
              minFaceDetectionConfidence: 0.5,
              minFacePresenceConfidence: 0.5,
              minTrackingConfidence: 0.5,
              outputFaceBlendshapes: false,
              outputFacialTransformationMatrixes: false,
            });
          } catch (error) {
            errors.push(
              `WASM: ${wasmBaseUrl} | MODEL: ${modelUrl} | ERROR: ${getUnknownErrorMessage(error)}`
            );
          }
        }
      }

      faceLandmarkerPromise = null;

      throw new Error(
        `MediaPipe Face Landmarker failed to initialize after all fallbacks. ${errors.join(" || ")}`
      );
    })();
  }

  return faceLandmarkerPromise;
}

function extractLandmarksFromResult(
  result: FaceLandmarkerResult,
  imageWidth: number,
  imageHeight: number
): AiAvatarFaceLandmarks | null {
  const face = result.faceLandmarks[0];

  if (!face) return null;

  const faceBox = getFaceBox(face);

  const leftEye = averagePoint([face[33], face[133], face[159], face[145]]);
  const rightEye = averagePoint([face[362], face[263], face[386], face[374]]);

  const mouthLeft = face[61];
  const mouthRight = face[291];

  const mouth = averagePoint([face[13], face[14], face[61], face[291]]);

  const confidence =
    result.faceBlendshapes[0]?.categories?.find(
      (category) => category.categoryName === "neutral"
    )?.score ?? 1;

  return {
    version: 1,
    source: "mediapipe_face_landmarker",
    imageWidth,
    imageHeight,
    faceBox,
    leftEye,
    rightEye,
    mouth,
    mouthWidth: distance(mouthLeft, mouthRight),
    confidence,
    detectedAt: new Date().toISOString(),
  };
}

export async function detectFaceLandmarksFromImageElement(
  imageElement: HTMLImageElement
): Promise<AiAvatarFaceLandmarks | null> {
  try {
    const faceLandmarker = await getFaceLandmarker();
    const result = faceLandmarker.detect(imageElement);

    return extractLandmarksFromResult(
      result,
      imageElement.naturalWidth,
      imageElement.naturalHeight
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : JSON.stringify(error);

    throw new Error(
      `MediaPipe face detection failed. ${message || "Unknown detection error."}`
    );
  }
}

export async function detectFaceLandmarksFromImageUrl(
  imageUrl: string
): Promise<AiAvatarFaceLandmarks | null> {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`Face detection image failed to load: ${response.status}`);
  }

  const blob = await response.blob();

  if (!blob.type.startsWith("image/")) {
    throw new Error(`Face detection expected an image file, but received ${blob.type || "unknown file type"}.`);
  }

  const objectUrl = URL.createObjectURL(blob);
  const imageElement = document.createElement("img");

  try {
    imageElement.decoding = "async";
    imageElement.src = objectUrl;

    await waitForImageLoad(imageElement);

    return detectFaceLandmarksFromImageElement(imageElement);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function isAiAvatarFaceLandmarks(
  value: unknown
): value is AiAvatarFaceLandmarks {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<AiAvatarFaceLandmarks>;

  return (
    candidate.version === 1 &&
    candidate.source === "mediapipe_face_landmarker" &&
    typeof candidate.leftEye?.x === "number" &&
    typeof candidate.leftEye?.y === "number" &&
    typeof candidate.rightEye?.x === "number" &&
    typeof candidate.rightEye?.y === "number" &&
    typeof candidate.mouth?.x === "number" &&
    typeof candidate.mouth?.y === "number" &&
    typeof candidate.mouthWidth === "number"
  );
}
