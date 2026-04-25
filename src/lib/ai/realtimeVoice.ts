import { supabase } from "@/lib/supabase";

export type RealtimeVoiceSessionRequest = {
  model?: string;
  voice?: string;
  instructions?: string;
  threshold?: number;
  prefix_padding_ms?: number;
  silence_duration_ms?: number;
  idle_timeout_ms?: number | null;
};

export type RealtimeVoiceSessionResult = {
  success: true;
  client_secret: string;
  expires_at: number | null;
  model: string;
  voice: string;
  session?: Record<string, unknown> | null;
};

type RealtimeVoiceError = {
  success?: false;
  error?: string;
  details?: string;
};

export type RealtimeConnection = {
  peerConnection: RTCPeerConnection;
  dataChannel: RTCDataChannel;
  localStream: MediaStream;
  remoteAudio: HTMLAudioElement;
  close: () => void;
};

export async function createRealtimeVoiceSession(
  request: RealtimeVoiceSessionRequest
): Promise<RealtimeVoiceSessionResult> {
  const { data, error } = await supabase.functions.invoke(
    "ai-realtime-session",
    {
    body: {
        model: request.model ?? "gpt-realtime-mini",
        voice: request.voice ?? "marin",
        instructions:
          request.instructions ??
          "You are AiXia Assistant. Reply fast, short, and clearly.",
        threshold: request.threshold,
        prefix_padding_ms: request.prefix_padding_ms,
        silence_duration_ms: request.silence_duration_ms,
        idle_timeout_ms: request.idle_timeout_ms,
      },
    }
  );

  if (error) {
    throw new Error(error.message || "Realtime session failed.");
  }

  const response = data as RealtimeVoiceSessionResult | RealtimeVoiceError | null;

  if (!response?.success) {
    throw new Error(response?.error || "Realtime session failed.");
  }

  return response;
}

export async function connectRealtimeVoice({
  clientSecret,
  model,
  onDataMessage,
}: {
  clientSecret: string;
  model: string;
  onDataMessage?: (event: MessageEvent) => void;
}): Promise<RealtimeConnection> {
  const peerConnection = new RTCPeerConnection();

  const remoteAudio = document.createElement("audio");
  remoteAudio.autoplay = true;

  peerConnection.ontrack = (event) => {
    const [remoteStream] = event.streams;
    remoteAudio.srcObject = remoteStream;
  };

  const localStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  const dataChannel = peerConnection.createDataChannel("oai-events");

  if (onDataMessage) {
    dataChannel.onmessage = onDataMessage;
  }

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  const realtimeResponse = await fetch(
    `https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(model)}`,
    {
      method: "POST",
      body: offer.sdp ?? "",
      headers: {
        Authorization: `Bearer ${clientSecret}`,
        "Content-Type": "application/sdp",
      },
    }
  );

  if (!realtimeResponse.ok) {
    const errorText = await realtimeResponse.text();
    peerConnection.close();
    localStream.getTracks().forEach((track) => track.stop());
    throw new Error(errorText || "Realtime WebRTC connection failed.");
  }

  const answerSdp = await realtimeResponse.text();

  await peerConnection.setRemoteDescription({
    type: "answer",
    sdp: answerSdp,
  });

  return {
    peerConnection,
    dataChannel,
    localStream,
    remoteAudio,
    close: () => {
      dataChannel.close();
      peerConnection.close();
      localStream.getTracks().forEach((track) => track.stop());
      remoteAudio.pause();
      remoteAudio.srcObject = null;
    },
  };
}
