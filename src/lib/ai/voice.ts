import { supabase } from "@/lib/supabase";

export type VoiceSpeakRequest = {
  text: string;
  model?: string;
  voice?: string;
  instructions?: string;
  response_format?: "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";
  speed?: number;
};

export type VoiceSpeakResult = {
  success: true;
  audio_base64: string;
  mime_type: string;
  model: string;
  voice: string;
  response_format: string;
  speed: number;
};

export type VoiceTranscribeRequest = {
  audio_base64: string;
  mime_type: string;
  filename: string;
  model?: string;
  language?: string;
  prompt?: string;
};

export type VoiceTranscribeResult = {
  success: true;
  text: string;
  model: string;
  mime_type: string;
  filename: string;
  raw?: Record<string, unknown>;
};

type VoiceFunctionError = {
  success?: false;
  error?: string;
  details?: string;
};

export function base64ToAudioUrl(base64: string, mimeType: string) {
  return `data:${mimeType};base64,${base64}`;
}

export async function speakText(
  request: VoiceSpeakRequest
): Promise<VoiceSpeakResult> {
  const cleanText = request.text.trim();

  if (!cleanText) {
    throw new Error("Text is required.");
  }

  const { data, error } = await supabase.functions.invoke("ai-voice-speak", {
    body: {
      text: cleanText,
      model: request.model ?? "gpt-4o-mini-tts",
      voice: request.voice ?? "alloy",
      instructions:
        request.instructions ??
        "Speak in a clear, professional enterprise assistant voice.",
      response_format: request.response_format ?? "mp3",
      speed: request.speed ?? 1,
    },
  });

  if (error) {
    throw new Error(error.message || "Voice generation failed.");
  }

  const response = data as VoiceSpeakResult | VoiceFunctionError | null;

  if (!response?.success) {
    throw new Error(response?.error || "Voice generation failed.");
  }

  return response;
}

export async function transcribeAudio(
  request: VoiceTranscribeRequest
): Promise<VoiceTranscribeResult> {
  const cleanAudio = request.audio_base64.trim();

  if (!cleanAudio) {
    throw new Error("Audio is required.");
  }

  const { data, error } = await supabase.functions.invoke(
    "ai-voice-transcribe",
    {
      body: {
        audio_base64: cleanAudio,
        mime_type: request.mime_type,
        filename: request.filename,
        model: request.model ?? "gpt-4o-mini-transcribe",
        language: request.language,
        prompt: request.prompt,
      },
    }
  );

  if (error) {
    throw new Error(error.message || "Voice transcription failed.");
  }

  const response = data as VoiceTranscribeResult | VoiceFunctionError | null;

  if (!response?.success) {
    throw new Error(response?.error || "Voice transcription failed.");
  }

  return response;
}

export async function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      const result = String(reader.result ?? "");
      const base64 = result.includes(",") ? result.split(",").pop() ?? "" : result;
      resolve(base64);
    };

    reader.onerror = () => {
      reject(new Error("Failed to read audio file."));
    };

    reader.readAsDataURL(blob);
  });
}
