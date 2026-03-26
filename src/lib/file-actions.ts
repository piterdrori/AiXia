import { supabase } from "@/lib/supabase";

type Cache = Record<string, string>;

const fileUrlCache: Cache = {};

export async function getSignedUrl(
  bucket: string,
  filePath: string,
  key: string
): Promise<string> {
  const cached = fileUrlCache[key];
  if (cached) return cached;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, 60);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "Failed to create signed URL");
  }

  fileUrlCache[key] = data.signedUrl;
  return data.signedUrl;
}

export async function openFile(
  bucket: string,
  filePath: string,
  key: string
) {
  const url = await getSignedUrl(bucket, filePath, key);
  window.open(url, "_blank", "noopener,noreferrer");
}

export async function downloadFile(
  bucket: string,
  filePath: string,
  fileName: string
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, 60, {
      download: fileName,
    });

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "Failed to download file");
  }

  const link = document.createElement("a");
  link.href = data.signedUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
