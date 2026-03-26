// MessageList.tsx
import { useState } from "react";
import { Download, ExternalLink, MessageSquare, Sparkles, Trash2, Edit2, Check, X } from "lucide-react";
import { formatMessageTime, getProfileByUserId, getUserInitials } from "../utils";
import type { ChatMessageRow, MessageListProps } from "../types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export default function MessageList({
  currentUserId,
  currentUserRole,
  messages,
  profiles,
  isSelectionMode,
  selectedMessageIds,
  editingMessageId,
  editingMessageText,
  hasMore,
  isLoadingOlder,
  scrollAreaRef,
  messagesEndRef,
  highlightedMessageIds,
  onLoadOlder,
  onToggleSelection,
  onStartEdit,
  onEditTextChange,
  onSaveEdit,
  onCancelEdit,
  onDeleteMessage,
}: MessageListProps) {
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, { text: string; source: string }>>({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);

  const canManage = (msg: ChatMessageRow) => {
    if (!currentUserId) return false;
    return currentUserRole === "admin" || msg.user_id === currentUserId;
  };

  const handleTranslate = async (msg: ChatMessageRow) => {
    if (translatedMessages[msg.id]) {
      setTranslatedMessages(prev => { const n = { ...prev }; delete n[msg.id]; return n; });
      return;
    }
    setTranslatingId(msg.id);
    setTimeout(() => {
      setTranslatedMessages(prev => ({ ...prev, [msg.id]: { text: `[Translated] ${msg.content}`, source: "Auto" } }));
      setTranslatingId(null);
    }, 500);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-slate-950/30">
      {(isSelectionMode || selectedMessageIds.length > 0) && (
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/80 shrink-0">
          <span className="text-sm text-slate-300">
            {selectedMessageIds.length} selected
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onToggleSelection({ id: "all" } as any)}>
              {selectedMessageIds.length === messages.filter(m => canManage(m)).length ? "Deselect All" : "Select All"}
            </Button>
          </div>
        </div>
      )}

      <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0">
        <div className="px-6 py-4 space-y-6">
          {hasMore && (
            <div className="flex justify-center">
              <Button variant="ghost" size="sm" onClick={onLoadOlder} disabled={isLoadingOlder} className="text-slate-400">
                {isLoadingOlder ? "Loading..." : "Load older messages"}
              </Button>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
              <p>No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isOwn = msg.user_id === currentUserId;
              const profile = getProfileByUserId(profiles, msg.user_id);
              const showAvatar = idx === 0 || messages[idx - 1].user_id !== msg.user_id;
              const isEditing = editingMessageId === msg.id;
              const isSelected = selectedMessageIds.includes(msg.id);
              const isHighlighted = highlightedMessageIds.includes(msg.id);
              const hasAttachment = msg.attachments && msg.attachments.length > 0;

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-4 transition-all duration-500",
                    isOwn ? "flex-row-reverse" : "",
                    isHighlighted ? "bg-indigo-500/10 rounded-lg p-2 -m-2" : ""
                  )}
                >
                  {isSelectionMode && canManage(msg) && (
                    <div className="pt-2">
                      <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelection(msg)} />
                    </div>
                  )}

                  <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-[70%]`}>
                    {showAvatar && (
                      <div className={`flex items-center gap-2 mb-1 ${isOwn ? "flex-row-reverse" : ""}`}>
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-indigo-600 text-white text-xs">
                            {getUserInitials(profile?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-slate-500">
                          {profile?.full_name || "Unknown"} • {formatMessageTime(msg.created_at)}
                        </span>
                      </div>
                    )}

                    <div className={cn(
                      "relative group px-4 py-2 rounded-2xl max-w-full",
                      isOwn 
                        ? "bg-indigo-600 text-white rounded-br-none" 
                        : "bg-slate-800 text-slate-200 rounded-bl-none",
                      isSelected && "ring-2 ring-indigo-400"
                    )}>
                      {isEditing ? (
                        <div className="min-w-[300px] space-y-2">
                          <Textarea
                            value={editingMessageText}
                            onChange={(e) => onEditTextChange(e.target.value)}
                            className="bg-slate-900 border-slate-700 text-white resize-none"
                            rows={3}
                          />
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={onCancelEdit}>
                              <X className="w-4 h-4" />
                            </Button>
                            <Button size="sm" onClick={() => onSaveEdit(msg)} disabled={!editingMessageText.trim()}>
                              <Check className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {msg.content && (
                            <p className="whitespace-pre-wrap break-words">
                              {translatedMessages[msg.id]?.text || msg.content}
                            </p>
                          )}
                          
                          {translatedMessages[msg.id] && (
                            <p className="text-[10px] opacity-70 mt-1">Translated</p>
                          )}

                          {hasAttachment && (
                            <div className="mt-2 space-y-2">
                              {msg.attachments!.map(file => (
                                <div key={file.id} className="flex items-center gap-2 bg-black/20 rounded px-3 py-2 text-sm">
                                  <span className="truncate">{file.file_name}</span>
                                  <div className="flex gap-1 ml-2">
                                    <button className="p-1 hover:bg-white/20 rounded">
                                      <ExternalLink className="w-4 h-4" />
                                    </button>
                                    <button className="p-1 hover:bg-white/20 rounded">
                                      <Download className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {!isEditing && !isSelectionMode && (
                      <div className={cn(
                        "flex items-center gap-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity",
                        isOwn ? "flex-row-reverse" : ""
                      )}>
                        <button 
                          onClick={() => handleTranslate(msg)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                          disabled={translatingId === msg.id}
                        >
                          <Sparkles className="w-3 h-3" />
                          {translatedMessages[msg.id] ? "Original" : translatingId === msg.id ? "..." : "Translate"}
                        </button>
                        
                        {canManage(msg) && (
                          <>
                            <button onClick={() => onStartEdit(msg)} className="text-xs text-slate-400 hover:text-white">
                              <Edit2 className="w-3 h-3 inline mr-1" />
                              Edit
                            </button>
                            <button onClick={() => onDeleteMessage(msg)} className="text-xs text-red-400 hover:text-red-300">
                              <Trash2 className="w-3 h-3 inline mr-1" />
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
