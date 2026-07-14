/**
 * Normalize agent reply text before TTS (Doubao or browser).
 */

export const AGENTOPS_TTS_CHUNK_MAX_CHARS = 300;
export const AGENTOPS_TTS_MAX_AUTO_SPEAK_CHARS = 900;

export function normalizeAgentOpsTtsSpeakText(raw: string): string {
  let text = raw.trim();
  if (!text) return "";

  // Strip fenced code blocks.
  text = text.replace(/```[\s\S]*?```/g, " ");
  // Strip raw JSON objects/arrays that look complete.
  text = text.replace(/\{[\s\S]{20,}\}/g, (match) => {
    try {
      JSON.parse(match);
      return " ";
    } catch {
      return match;
    }
  });
  // Soften bare URLs.
  text = text.replace(/https?:\/\/\S+/gi, " link ");
  text = text.replace(/\s+/g, " ").trim();

  if (text.length > AGENTOPS_TTS_MAX_AUTO_SPEAK_CHARS) {
    text = `${text.slice(0, AGENTOPS_TTS_MAX_AUTO_SPEAK_CHARS).trim()}…`;
  }
  return text;
}

/** Split at sentence boundaries for Doubao 300-char OpenSpeech limit. */
export function chunkAgentOpsTtsText(
  text: string,
  maxLen = AGENTOPS_TTS_CHUNK_MAX_CHARS,
): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxLen) return [trimmed];

  const chunks: string[] = [];
  let remaining = trimmed;
  while (remaining.length > maxLen) {
    let cut = remaining.lastIndexOf(". ", maxLen);
    if (cut < Math.floor(maxLen * 0.4)) {
      cut = remaining.lastIndexOf(" ", maxLen);
    }
    if (cut <= 0) cut = maxLen;
    const piece = remaining.slice(0, cut).trim();
    if (piece) chunks.push(piece);
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}
