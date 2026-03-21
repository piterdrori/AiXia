import { useState } from "react";
import { Check, MessageSquare, Save, Square, X } from "lucide-react";
import { formatMessageTime, getProfileByUserId, getUserInitials } from "../utils";
import type { ChatMessageRow, MessageListProps } from "../types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/lib/i18n";
import { smartTranslate } from "@/lib/smartTranslate";

export default function MessageList({
  currentUserId,
  currentUserRole,
  messages,
  profiles,
  isSelectionMode,
  selectedMessageIds,
  editingMessageId,
  editingMessageText,
  messageActionLoading,
  hasMore,
  isLoadingOlder,
  scrollAreaRef,
  messagesEndRef,
  onLoadOlder,
  onToggleSelection,
  onStartEdit,
  onEditTextChange,
  onSaveEdit,
  onCancelEdit,
  onDeleteMessage,
}: MessageListProps) {
  const { t } = useLanguage();

    const [translatedMessages, setTranslatedMessages] = useState<
  Record<string, { text: string; source: string }>
>({});
  const [translatingMessageId, setTranslatingMessageId] = useState<string | null>(null);

  const handleTranslateMessage = async (message: ChatMessageRow) => {
    if (translatedMessages[message.id]) {
      setTranslatedMessages((prev) => {
        const next = { ...prev };
        delete next[message.id];
        return next;
      });
      return;
    }

    try {
      setTranslatingMessageId(message.id);
      const result = await smartTranslate({
  messageId: message.id,
  text: message.content,
});

setTranslatedMessages((prev) => ({
  ...prev,
  [message.id]: {
    text: result.translatedText,
    source: result.source,
  },
}));
    } catch (error) {
      console.error("Translate message error:", error);
    } finally {
      setTranslatingMessageId(null);
    }
  };

  const canManageMessage = (message: ChatMessageRow) => {
    if (!currentUserId) return false;
    return currentUserRole === "admin" || message.user_id === currentUserId;
  };

  const selectableMessages = messages.filter((message) => canManageMessage(message));
  const allSelectableIds = selectableMessages.map((message) => message.id);
  const allSelected =
    allSelectableIds.length > 0 &&
    allSelectableIds.every((messageId) => selectedMessageIds.includes(messageId));

  return (
    <>
      {(isSelectionMode || selectedMessageIds.length > 0) && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="text-sm text-slate-300">
            {t("chat.messageList.selectedCount", undefined, {
              total: selectedMessageIds.length,
            })}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-slate-700 text-slate-200 hover:bg-slate-800"
              onClick={() => {
                if (allSelected) {
                  allSelectableIds.forEach(() => {});
                }
              }}
            >
              {allSelected ? (
                <>
                  <Square className="w-4 h-4 mr-2" />
                  {t("chat.messageList.clearAll")}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {t("chat.messageList.selectModeActive")}
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0">
        <div className="px-4 py-4">
          <div className="flex justify-center mb-4">
            {hasMore ? (
              <Button
                type="button"
                onClick={onLoadOlder}
                disabled={isLoadingOlder}
                className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
              >
                {isLoadingOlder
                  ? t("chat.messageList.loadingOlderMessages")
                  : t("chat.messageList.loadOlderMessages")}
              </Button>
            ) : (
              <div className="text-xs text-slate-500 px-3 py-1 rounded-md bg-slate-900/80 border border-slate-800">
                {t("chat.messageList.beginningOfConversation")}
              </div>
            )}
          </div>

          <div className="space-y-4 pt-2">
            {messages.map((message, index) => {
              const isOwn = message.user_id === currentUserId;
              const user = getProfileByUserId(profiles, message.user_id);
              const showAvatar = index === 0 || messages[index - 1].user_id !== message.user_id;
              const isEditing = editingMessageId === message.id;
              const canSelect = canManageMessage(message);
              const isSelected = selectedMessageIds.includes(message.id);

              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
                >
                  {isSelectionMode && (
                    <div className={`pt-2 ${canSelect ? "" : "opacity-40"}`}>
                      <Checkbox
                        checked={isSelected}
                        disabled={!canSelect}
                        onCheckedChange={() => onToggleSelection(message)}
                      />
                    </div>
                  )}

                  {showAvatar ? (
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className="bg-indigo-600 text-white text-xs">
                        {getUserInitials(user?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-8 flex-shrink-0" />
                  )}

                  <div className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
                    {showAvatar && (
                      <p className="text-xs text-slate-500 mb-1">
                        {user?.full_name || t("chat.common.unknown")} • {formatMessageTime(message.created_at, t)}
                      </p>
                    )}

                    <div
                      className={`px-4 py-2 rounded-2xl border ${
                        isSelected ? "border-indigo-400" : "border-transparent"
                      } ${
                        isOwn
                          ? "bg-indigo-600 text-white rounded-br-none"
                          : "bg-slate-800 text-slate-200 rounded-bl-none"
                      }`}
                    >
                      {isEditing ? (
                        <div className="space-y-2 min-w-[260px]">
                          <Textarea
                            value={editingMessageText}
                            onChange={(e) => onEditTextChange(e.target.value)}
                            rows={3}
                            className="bg-slate-900 border-slate-700 text-white resize-none"
                          />
                          <div className="flex items-center gap-2 justify-end">
                            <Button
                              size="sm"
                              className="bg-white text-black hover:bg-slate-200"
                              onClick={() => onSaveEdit(message)}
                              disabled={
                                messageActionLoading === message.id ||
                                !editingMessageText.trim()
                              }
                            >
                              <Save className="w-3 h-3 mr-1" />
                              {t("chat.messageList.save")}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-500 text-white hover:bg-slate-700"
                              onClick={onCancelEdit}
                              disabled={messageActionLoading === message.id}
                            >
                              <X className="w-3 h-3 mr-1" />
                              {t("chat.messageList.cancel")}
                            </Button>
                          </div>
                        </div>
                         ) : (
  <div className="space-y-1">
    <p className="whitespace-pre-wrap break-words">
      {translatedMessages[message.id]?.text || message.content}
    </p>

    {translatedMessages[message.id]?.source && (
      <p className="text-[10px] opacity-70">
        Source: {translatedMessages[message.id].source}
      </p>
    )}
  </div>
)}
                    </div>

                                        {!isEditing && !isSelectionMode && (
                      <div className={`mt-1 flex gap-2 ${isOwn ? "justify-end" : "justify-start"}`}>
                        <button
                          className="text-xs text-indigo-400 hover:text-indigo-300"
                          onClick={() => void handleTranslateMessage(message)}
                          disabled={translatingMessageId === message.id}
                        >
                          {translatingMessageId === message.id
                            ? "Translating..."
                            : translatedMessages[message.id]
                            ? "Original"
                            : "Translate"}
                        </button>

                        {canManageMessage(message) && (
                          <>
                            <button
                              className="text-xs text-slate-400 hover:text-white"
                              onClick={() => onStartEdit(message)}
                              disabled={messageActionLoading === message.id}
                            >
                              {t("chat.messageList.edit")}
                            </button>
                            <button
                              className="text-xs text-red-400 hover:text-red-300"
                              onClick={() => onDeleteMessage(message)}
                              disabled={messageActionLoading === message.id}
                            >
                              {t("chat.messageList.delete")}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-slate-500" />
                </div>
                <p className="text-slate-500">{t("chat.messageList.noMessagesYet")}</p>
                <p className="text-slate-600 text-sm">{t("chat.messageList.startConversation")}</p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </ScrollArea>
    </>
  );
}
