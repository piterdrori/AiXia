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

const WASM_BASE_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm";

const FACE_LANDMARKER_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

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
      const vision = await FilesetResolver.forVisionTasks(WASM_BASE_URL);

      return FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: FACE_LANDMARKER_MODEL_URL,
          delegate: "GPU",
        },
        runningMode: "IMAGE",
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
      });
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
  const faceLandmarker = await getFaceLandmarker();
  const result = faceLandmarker.detect(imageElement);

  return extractLandmarksFromResult(
    result,
    imageElement.naturalWidth,
    imageElement.naturalHeight
  );
}

export async function detectFaceLandmarksFromImageUrl(
  imageUrl: string
): Promise<AiAvatarFaceLandmarks | null> {
  const imageElement = document.createElement("img");

  imageElement.crossOrigin = "anonymous";
  imageElement.decoding = "async";
  imageElement.src = imageUrl;

  await imageElement.decode();

  return detectFaceLandmarksFromImageElement(imageElement);
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
