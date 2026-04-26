const fs = require("fs");
const path = require("path");
const https = require("https");

const rootDir = process.cwd();

const sourceWasmDir = path.join(
  rootDir,
  "node_modules",
  "@mediapipe",
  "tasks-vision",
  "wasm"
);

const publicWasmDir = path.join(rootDir, "public", "mediapipe", "wasm");
const publicModelDir = path.join(rootDir, "public", "mediapipe", "models");

const modelUrl =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const modelPath = path.join(publicModelDir, "face_landmarker.task");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyWasmAssets() {
  ensureDir(publicWasmDir);

  if (!fs.existsSync(sourceWasmDir)) {
    throw new Error(`MediaPipe WASM source folder not found: ${sourceWasmDir}`);
  }

  const files = fs.readdirSync(sourceWasmDir);

  for (const file of files) {
    const sourcePath = path.join(sourceWasmDir, file);
    const targetPath = path.join(publicWasmDir, file);

    if (fs.statSync(sourcePath).isFile()) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }

  console.log(`Copied MediaPipe WASM assets to ${publicWasmDir}`);
}

function downloadFile(url, targetPath) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).size > 0) {
      console.log(`MediaPipe model already exists: ${targetPath}`);
      resolve();
      return;
    }

    ensureDir(path.dirname(targetPath));

    const file = fs.createWriteStream(targetPath);

    https
      .get(url, (response) => {
        if (
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          file.close();
          fs.unlinkSync(targetPath);
          downloadFile(response.headers.location, targetPath)
            .then(resolve)
            .catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(targetPath);
          reject(new Error(`Failed to download ${url}. Status: ${response.statusCode}`));
          return;
        }

        response.pipe(file);

        file.on("finish", () => {
          file.close();
          console.log(`Downloaded MediaPipe model to ${targetPath}`);
          resolve();
        });
      })
      .on("error", (error) => {
        file.close();

        if (fs.existsSync(targetPath)) {
          fs.unlinkSync(targetPath);
        }

        reject(error);
      });
  });
}

async function main() {
  copyWasmAssets();
  await downloadFile(modelUrl, modelPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
