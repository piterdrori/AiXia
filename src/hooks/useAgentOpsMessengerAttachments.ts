import { useCallback, useState } from "react";

import type { AixiaMessengerAttachment } from "@/components/aixia";
import type { AgentOpsChatScope } from "@/lib/agentops";
import { uploadAgentOpsChatAttachment } from "@/lib/agentops";

function createAttachmentId(): string {
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useAgentOpsMessengerAttachments(chatScope: AgentOpsChatScope, roomId?: string | null) {
  const [pendingAttachments, setPendingAttachments] = useState<AixiaMessengerAttachment[]>([]);

  const addAttachments = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      for (const file of list) {
        const id = createAttachmentId();
        setPendingAttachments((current) => [
          ...current,
          {
            id,
            fileName: file.name,
            fileType: file.type || "application/octet-stream",
            uploading: true,
          },
        ]);

        const uploadResult = await uploadAgentOpsChatAttachment({
          file,
          chatScope,
          roomId,
        });

        setPendingAttachments((current) =>
          current.map((item) => {
            if (item.id !== id) return item;
            if (uploadResult.error || !uploadResult.data) {
              return {
                ...item,
                uploading: false,
                error: uploadResult.error ?? "Upload failed.",
              };
            }
            return {
              ...item,
              uploading: false,
              storagePath: uploadResult.data.storagePath,
              previewUrl: uploadResult.data.publicUrl,
              error: null,
            };
          }),
        );
      }
    },
    [chatScope, roomId],
  );

  const removeAttachment = useCallback((attachmentId: string) => {
    setPendingAttachments((current) => current.filter((item) => item.id !== attachmentId));
  }, []);

  const clearAttachments = useCallback(() => {
    setPendingAttachments([]);
  }, []);

  const attachmentDescriptions = pendingAttachments
    .filter((item) => !item.uploading && !item.error)
    .map((item) => `${item.fileName} (${item.fileType})`);

  const readyAttachments = pendingAttachments.filter((item) => !item.uploading && !item.error);

  return {
    pendingAttachments,
    readyAttachments,
    attachmentDescriptions,
    addAttachments,
    removeAttachment,
    clearAttachments,
  };
}
