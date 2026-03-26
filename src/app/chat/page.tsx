import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAppClock } from "@/lib/clock/provider";
import { smartTranslate } from "@/lib/smartTranslate";
import {
  subscribeToMessages,
  removeRealtimeChannel,
} from "@/lib/realtime";
import { useChatBootstrap } from "./hooks/useChatBootstrap";
import { useChatMessages } from "./hooks/useChatMessages";
import type {
  ChatGroupRow,
  ChatMessageRow,
  ChatGroupMemberRow,
  ProfileRow,
} from "./types";
import { getConversationName, getMembersForGroup } from "./utils";

import ChatSidebar from "./components/ChatSidebar";
import TeamMembersSidebar from "./components/TeamMembersSidebar";
import ChatHeader from "./components/ChatHeader";
import MessageList from "./components/MessageList";
import MessageComposer from "./components/MessageComposer";
import CreateGroupDialog from "./components/CreateGroupDialog";
import { Button } from "@/components/ui/button";

function canUseBrowserNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

function playIncomingMessageSound() {
  if (typeof window === "undefined") return;

  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;

  if (!AudioContextClass) return;

  try {
    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gainNode.gain.value = 0.03;

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();

    setTimeout(() => {
      oscillator.stop();
      void audioContext.close();
    }, 120);
  } catch {
    // ignore sound failures
  }
}

export default function ChatPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const clock = useAppClock();

  const {
    currentUserId,
    currentUserRole,
    profiles,
    groups,
    groupMembers,
    selectedConversationId,
    error,
    unreadCounts,
    onlineStatus,
    setError,
    setSelectedConversationId,
    moveGroupToTop,
    upsertGroupLocally,
    removeGroupLocally,
    markConversationAsRead,
    incrementUnread,
  } = useChatBootstrap(id || null);

  const getConvoName = useCallback(
    (groupId: string) => {
      const group = groups.find((g) => g.id === groupId);
      return group
        ? getConversationName(group, currentUserId, profiles, groupMembers)
        : "Chat";
    },
    [groups, currentUserId, profiles, groupMembers]
  );

  const {
    messages,
    hasMoreMessages,
    isLoadingOlder,
    selectedMessages,
    highlightedMessageIds,
    scrollAreaRef,
    messagesEndRef,
    loadMessagesForGroup,
    handleLoadOlderMessages,
    appendMessageLocally,
    updateMessageLocally,
    deleteMessageLocally,
    replaceTempMessageWithRealOne,
  } = useChatMessages(
    selectedConversationId,
    currentUserId,
    incrementUnread,
    moveGroupToTop,
    getConvoName
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState("");
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  const [translatedMessages, setTranslatedMessages] = useState<
    Record<string, string>
  >({});
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >(canUseBrowserNotifications() ? Notification.permission : "unsupported");

  const notifiedMessageIdsRef = useRef<Set<string>>(new Set());
  const translatingMessageIdsRef = useRef<Set<string>>(new Set());

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedConversationId) || null,
    [groups, selectedConversationId]
  );

    const buildDirectKey = useCallback((a: string, b: string) => {
    return [a, b].sort().join("__");
  }, []);

  const handleStartDirectMessage = useCallback(
    async (targetUserId: string, _targetName?: string) => {
      if (!currentUserId || targetUserId === currentUserId) return;

      setError("");

      const directKey = buildDirectKey(currentUserId, targetUserId);

      const existingLocal = groups.find(
        (group) => group.type === "DIRECT" && group.direct_key === directKey
      );

      if (existingLocal) {
        openConversation(existingLocal.id);
        return;
      }

      const { data: existingDb, error: existingError } = await supabase
        .from("chat_groups")
        .select(
          "id, name, type, project_id, task_id, created_by, created_at, direct_key"
        )
        .eq("type", "DIRECT")
        .eq("direct_key", directKey)
        .maybeSingle();

      if (existingError) {
        setError(existingError.message || "Failed to create conversation");
        return;
      }

      if (existingDb) {
        openConversation(existingDb.id);
        return;
      }

      const { data: newGroup, error: createError } = await supabase
        .from("chat_groups")
        .insert({
          name: null,
          type: "DIRECT",
          project_id: null,
          task_id: null,
          created_by: currentUserId,
          direct_key: directKey,
        })
        .select(
          "id, name, type, project_id, task_id, created_by, created_at, direct_key"
        )
        .single();

      if (createError || !newGroup) {
        setError(createError?.message || "Failed to create conversation");
        return;
      }

      const optimisticMembers: ChatGroupMemberRow[] = [
        {
          id: `local-${newGroup.id}-${currentUserId}`,
          group_id: newGroup.id,
          user_id: currentUserId,
          role: "member",
          invited_by: currentUserId,
          created_at: clock.nowIso,
        },
        {
          id: `local-${newGroup.id}-${targetUserId}`,
          group_id: newGroup.id,
          user_id: targetUserId,
          role: "member",
          invited_by: currentUserId,
          created_at: clock.nowIso,
        },
      ];

      upsertGroupLocally(newGroup as ChatGroupRow, optimisticMembers);

      const { error: memberInsertError } = await supabase
        .from("chat_group_members")
        .upsert(
          [
            {
              group_id: newGroup.id,
              user_id: currentUserId,
              role: "member",
              invited_by: currentUserId,
            },
            {
              group_id: newGroup.id,
              user_id: targetUserId,
              role: "member",
              invited_by: currentUserId,
            },
          ],
          {
            onConflict: "group_id,user_id",
          }
        );

      if (memberInsertError) {
        setError(memberInsertError.message || "Failed to create conversation");
        return;
      }

      openConversation(newGroup.id);
    },
    [
      buildDirectKey,
      clock.nowIso,
      currentUserId,
      groups,
      openConversation,
      setError,
      upsertGroupLocally,
    ]
  );

  const mentionCandidates = useMemo(() => {
    if (!selectedConversationId) return [] as ProfileRow[];

    return getMembersForGroup(groupMembers, selectedConversationId)
      .map((m: ChatGroupMemberRow) =>
        profiles.find((p: ProfileRow) => p.user_id === m.user_id)
      )
      .filter((p): p is ProfileRow => !!p && p.user_id !== currentUserId);
  }, [selectedConversationId, groupMembers, profiles, currentUserId]);

  const filteredMentionCandidates = useMemo(() => {
    if (!showMentionDropdown) return [] as ProfileRow[];

    const q = mentionQuery.toLowerCase();

    return mentionCandidates.filter((p: ProfileRow) =>
      (p.full_name || "").toLowerCase().includes(q)
    );
  }, [mentionCandidates, mentionQuery, showMentionDropdown]);

  const renderMessages = useMemo(() => {
    return selectedMessages.map((message) => {
      const translated = translatedMessages[message.id];

      if (!translated || translated === message.content) {
        return message;
      }

      return {
        ...message,
        content: translated,
      };
    });
  }, [selectedMessages, translatedMessages]);

  const translateMessage = useCallback(
    async (message: ChatMessageRow) => {
      if (!message?.id) return;
      if (!message.content?.trim()) return;
      if (translatedMessages[message.id]) return;
      if (translatingMessageIdsRef.current.has(message.id)) return;

      translatingMessageIdsRef.current.add(message.id);

      try {
        const result = await smartTranslate({
          messageId: message.id,
          text: message.content,
        });

        if (!result?.translatedText?.trim()) return;

        setTranslatedMessages((prev) => {
          if (prev[message.id]) return prev;

          return {
            ...prev,
            [message.id]: result.translatedText,
          };
        });
      } catch {
        // ignore translation failures in UI layer
      } finally {
        translatingMessageIdsRef.current.delete(message.id);
      }
    },
    [translatedMessages]
  );

  const notifyIncomingMessage = useCallback(
    (message: ChatMessageRow) => {
      if (!currentUserId) return;
      if (message.user_id === currentUserId) return;
      if (notifiedMessageIdsRef.current.has(message.id)) return;

      notifiedMessageIdsRef.current.add(message.id);

      playIncomingMessageSound();

      if (
        notificationPermission === "granted" &&
        canUseBrowserNotifications()
      ) {
        const conversationTitle = getConvoName(message.group_id);

        try {
          new Notification(`New message in ${conversationTitle}`, {
            body: message.content,
            tag: `chat-message-${message.id}`,
          });
        } catch {
          // ignore browser notification failures
        }
      }
    },
    [currentUserId, getConvoName, notificationPermission]
  );

  useEffect(() => {
    if (!canUseBrowserNotifications()) return;

    setNotificationPermission(Notification.permission);

    if (Notification.permission === "default") {
      void Notification.requestPermission().then((permission) => {
        setNotificationPermission(permission);
      });
    }
  }, []);

  useEffect(() => {
    setIsSelectionMode(false);
    setSelectedMessageIds([]);
    setEditingMessageId(null);
    setEditingMessageText("");
  }, [selectedConversationId]);

  useEffect(() => {
    renderMessages.forEach((message) => {
      void translateMessage(message);
    });
  }, [renderMessages, translateMessage]);

  useEffect(() => {
    if (!groups.length || !currentUserId) return;

    const subscribedKeys: string[] = [];

    groups.forEach((group) => {
      const channel = subscribeToMessages({
        groupId: group.id,
        onInsert: (incomingRaw) => {
          const incoming = incomingRaw as ChatMessageRow;

          if (!incoming?.id) return;
          if (incoming.user_id === currentUserId) return;

          moveGroupToTop(group.id, incoming.content);
          void translateMessage(incoming);

          if (selectedConversationId === group.id) {
            appendMessageLocally(group.id, incoming);
            markConversationAsRead(group.id);
          } else {
            incrementUnread(group.id);
          }

          notifyIncomingMessage(incoming);
        },
      });

      subscribedKeys.push(channel.topic);
    });

    return () => {
      void Promise.all(subscribedKeys.map((key) => removeRealtimeChannel(key)));
    };
  }, [
    groups,
    currentUserId,
    selectedConversationId,
    appendMessageLocally,
    incrementUnread,
    markConversationAsRead,
    moveGroupToTop,
    notifyIncomingMessage,
    translateMessage,
  ]);

  const openConversation = useCallback(
    (groupId: string) => {
      setSelectedConversationId(groupId);
      navigate(`/chat/${groupId}`);
      markConversationAsRead(groupId);

      if (!messages[groupId]) {
        loadMessagesForGroup(groupId);
      }
    },
    [
      navigate,
      markConversationAsRead,
      messages,
      loadMessagesForGroup,
      setSelectedConversationId,
    ]
  );

  const handleMessageChange = (value: string) => {
    setMessageInput(value);

    const match = value.match(/@([^\s]*)$/);

    if (match) {
      setMentionQuery(match[1]);
      setShowMentionDropdown(true);
    } else {
      setShowMentionDropdown(false);
    }
  };

  const insertMention = (name: string) => {
    setMessageInput((prev) => prev.replace(/@[^\s]*$/, `@${name} `));
    setShowMentionDropdown(false);
  };

  const handleSendMessage = async () => {
    if (
      !messageInput.trim() ||
      !selectedConversationId ||
      !currentUserId ||
      !selectedGroup
    ) {
      return;
    }

    const content = messageInput.trim();
    const tempId = `temp-${Date.now()}`;

    const optimisticMsg: ChatMessageRow = {
      id: tempId,
      group_id: selectedConversationId,
      user_id: currentUserId,
      content,
      created_at: clock.nowIso,
    };

    appendMessageLocally(selectedConversationId, optimisticMsg);
    moveGroupToTop(selectedConversationId, content);
    setMessageInput("");
    setIsSending(true);

    try {
      const { data, error: insertError } = await supabase
        .from("chat_messages")
        .insert({
          group_id: selectedConversationId,
          user_id: currentUserId,
          content,
        })
        .select()
        .single();

      if (insertError || !data) {
        throw insertError || new Error("Failed to send message");
      }

      replaceTempMessageWithRealOne(selectedConversationId, data);
      void translateMessage(data);

      await supabase
        .from("chat_groups")
        .update({
          last_message: content,
          last_message_at: clock.nowIso,
        })
        .eq("id", selectedConversationId);
    } catch {
      deleteMessageLocally(selectedConversationId, tempId);
      setMessageInput(content);
      setError("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateGroup = async (name: string, memberIds: string[]) => {
    if (!currentUserId) return;

    setIsCreatingGroup(true);

    try {
      const { data: group, error } = await supabase
        .from("chat_groups")
        .insert({
          name,
          type: "GROUP",
          created_by: currentUserId,
        })
        .select()
        .single();

      if (error || !group) {
        throw new Error("Failed to create group");
      }

      const members = [
        { group_id: group.id, user_id: currentUserId, role: "owner" },
        ...memberIds.map((memberId) => ({
          group_id: group.id,
          user_id: memberId,
          role: "member",
        })),
      ];

      const { error: memberError } = await supabase
        .from("chat_group_members")
        .insert(members);

      if (memberError) {
        throw memberError;
      }

      upsertGroupLocally(
        group,
        members.map((member) => ({
          id: `${group.id}-${member.user_id}`,
          group_id: member.group_id,
          user_id: member.user_id,
          role: member.role,
          invited_by: currentUserId,
          created_at: clock.nowIso,
        }))
      );

      setIsCreateGroupOpen(false);
      openConversation(group.id);
    } catch {
      setError("Failed to create group");
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleDeleteChat = async (group: ChatGroupRow) => {
    if (!confirm("Delete this conversation?")) return;

    const { error: deleteError } = await supabase
      .from("chat_groups")
      .delete()
      .eq("id", group.id);

    if (deleteError) {
      setError("Failed to delete");
      return;
    }

    removeGroupLocally(group.id);
  };

  const handleBulkDelete = async () => {
    if (!selectedConversationId || selectedMessageIds.length === 0) return;
    if (!confirm(`Delete ${selectedMessageIds.length} messages?`)) return;

    const { error: deleteError } = await supabase
      .from("chat_messages")
      .delete()
      .in("id", selectedMessageIds);

    if (deleteError) {
      setError("Failed to delete messages");
      return;
    }

    selectedMessageIds.forEach((messageId) => {
      deleteMessageLocally(selectedConversationId, messageId);
    });

    setSelectedMessageIds([]);
    setIsSelectionMode(false);
  };

  return (
        <div className="h-[calc(100vh-64px)] bg-slate-950 px-4 py-4 overflow-hidden">
      <div className="h-full max-w-[1460px] mx-auto grid grid-cols-[320px_minmax(0,1fr)_280px] rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
      <ChatSidebar
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        groups={groups}
        groupMembers={groupMembers}
        profiles={profiles}
        searchQuery={searchQuery}
        selectedConversationId={selectedConversationId}
        unreadCounts={unreadCounts}
        onSearchChange={setSearchQuery}
        onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
        onOpenConversation={openConversation}
        onDeleteChat={handleDeleteChat}
      />

            <div className="min-w-0 flex flex-col bg-slate-950 h-full">
        {selectedGroup ? (
          <>
            <ChatHeader
              group={selectedGroup}
              currentUserId={currentUserId}
              profiles={profiles}
              groupMembers={groupMembers}
              isSelectionMode={isSelectionMode}
              onToggleSelectionMode={() => {
                setIsSelectionMode(!isSelectionMode);
                setSelectedMessageIds([]);
              }}
            />

            {isSelectionMode && selectedMessageIds.length > 0 && (
              <div className="flex items-center justify-between px-6 py-2 bg-indigo-600/10 border-b border-indigo-600/20">
                <span className="text-sm text-indigo-300">
                  {selectedMessageIds.length} selected
                </span>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedMessageIds([])}
                    className="text-indigo-300 hover:text-white hover:bg-indigo-600/20"
                  >
                    Clear
                  </Button>

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleBulkDelete}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            )}

                        <div className="mx-6 mt-4 min-h-[56px]">
              {error ? (
                <div className="h-[56px] px-3 flex items-center bg-red-900/20 border border-red-800 text-red-400 rounded text-sm">
                  {error}
                </div>
              ) : null}
            </div>

            <MessageList
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              messages={renderMessages}
              profiles={profiles}
              isSelectionMode={isSelectionMode}
              selectedMessageIds={selectedMessageIds}
              editingMessageId={editingMessageId}
              editingMessageText={editingMessageText}
              messageActionLoading={null}
              hasMore={hasMoreMessages[selectedConversationId || ""] || false}
              isLoadingOlder={isLoadingOlder}
              scrollAreaRef={scrollAreaRef}
              messagesEndRef={messagesEndRef}
              highlightedMessageIds={highlightedMessageIds}
              onLoadOlder={handleLoadOlderMessages}
              onToggleSelection={(msg) => {
                setSelectedMessageIds((prev) =>
                  prev.includes(msg.id)
                    ? prev.filter((existingId) => existingId !== msg.id)
                    : [...prev, msg.id]
                );
              }}
              onStartEdit={(msg) => {
                setEditingMessageId(msg.id);
                setEditingMessageText(msg.content);
              }}
              onEditTextChange={setEditingMessageText}
              onSaveEdit={async (msg) => {
                if (!editingMessageText.trim()) return;

                await supabase
                  .from("chat_messages")
                  .update({ content: editingMessageText })
                  .eq("id", msg.id);

                updateMessageLocally(msg.group_id, {
                  ...msg,
                  content: editingMessageText,
                });

                setTranslatedMessages((prev) => {
                  if (!prev[msg.id]) return prev;

                  const next = { ...prev };
                  delete next[msg.id];
                  return next;
                });

                setEditingMessageId(null);
                setEditingMessageText("");
              }}
              onCancelEdit={() => {
                setEditingMessageId(null);
                setEditingMessageText("");
              }}
              onDeleteMessage={async (msg) => {
                if (!confirm("Delete this message?")) return;

                await supabase.from("chat_messages").delete().eq("id", msg.id);
                deleteMessageLocally(msg.group_id, msg.id);

                setTranslatedMessages((prev) => {
                  if (!prev[msg.id]) return prev;

                  const next = { ...prev };
                  delete next[msg.id];
                  return next;
                });
              }}
            />

            <MessageComposer
              messageInput={messageInput}
              isSending={isSending}
              showMentionDropdown={showMentionDropdown}
              filteredMentionCandidates={filteredMentionCandidates}
              onChange={handleMessageChange}
              onSend={handleSendMessage}
              onInsertMention={insertMention}
              onUploadFile={() => {}}
              isUploadingFile={false}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-4">
              <span className="text-4xl">💬</span>
            </div>

            <h3 className="text-lg font-medium text-slate-300 mb-1">
              Select a conversation
            </h3>

            <p>Choose a chat from the sidebar to start messaging</p>
          </div>
        )}
      </div>

            <TeamMembersSidebar
        profiles={profiles}
        currentUserId={currentUserId}
        onlineStatus={onlineStatus}
        onStartDM={(userId, name) => {
          void handleStartDirectMessage(userId, name);
        }}
      />

              <CreateGroupDialog
          open={isCreateGroupOpen}
          currentUserId={currentUserId}
          profiles={profiles}
          isCreating={isCreatingGroup}
          error={error}
          onOpenChange={setIsCreateGroupOpen}
          onCreate={handleCreateGroup}
        />
      </div>
    </div>
  );
}
