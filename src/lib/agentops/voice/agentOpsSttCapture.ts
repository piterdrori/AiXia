/**
 * Push-to-talk MediaRecorder capture for AgentOps Doubao STT (Phase C).
 */

export const AGENTOPS_STT_MAX_DURATION_MS = 45_000;

const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/ogg",
];

export type AgentOpsSttCaptureResult = {
  blob: Blob;
  mimeType: string;
  durationMs: number;
};

export function pickAgentOpsSttMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const mime of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return "";
}

export function agentOpsSttCaptureSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== "undefined" &&
    pickAgentOpsSttMimeType() != null
  );
}

export class AgentOpsSttCaptureSession {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private startedAt = 0;
  private maxTimer: ReturnType<typeof setTimeout> | null = null;
  private mimeType = "";

  async start(onMaxDuration?: () => void): Promise<{ mimeType: string }> {
    this.stopTracksOnly();
    this.chunks = [];
    const mimeType = pickAgentOpsSttMimeType();
    if (mimeType == null) {
      throw new Error("This browser cannot record microphone audio.");
    }
    this.mimeType = mimeType || "audio/webm";

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1,
      },
    });

    const recorder = new MediaRecorder(
      this.stream,
      mimeType ? { mimeType } : undefined,
    );
    this.recorder = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) this.chunks.push(event.data);
    };
    this.startedAt = Date.now();
    recorder.start(250);
    this.maxTimer = setTimeout(() => {
      onMaxDuration?.();
    }, AGENTOPS_STT_MAX_DURATION_MS);
    return { mimeType: this.mimeType };
  }

  async stop(): Promise<AgentOpsSttCaptureResult | null> {
    const recorder = this.recorder;
    if (!recorder) {
      this.release();
      return null;
    }

    const durationMs = Math.max(0, Date.now() - this.startedAt);
    const blob = await new Promise<Blob | null>((resolve) => {
      const finish = () => {
        const type = this.mimeType || recorder.mimeType || "audio/webm";
        if (!this.chunks.length) {
          resolve(null);
          return;
        }
        resolve(new Blob(this.chunks, { type }));
      };
      recorder.onstop = finish;
      try {
        if (recorder.state !== "inactive") recorder.stop();
        else finish();
      } catch {
        finish();
      }
    });

    this.release();
    if (!blob || blob.size === 0) return null;
    return { blob, mimeType: blob.type || this.mimeType || "audio/webm", durationMs };
  }

  cancel(): void {
    try {
      if (this.recorder && this.recorder.state !== "inactive") this.recorder.stop();
    } catch {
      // ignore
    }
    this.release();
  }

  private stopTracksOnly(): void {
    if (this.maxTimer) {
      clearTimeout(this.maxTimer);
      this.maxTimer = null;
    }
    this.stream?.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {
        // ignore
      }
    });
    this.stream = null;
    this.recorder = null;
    this.chunks = [];
  }

  release(): void {
    this.stopTracksOnly();
  }
}
