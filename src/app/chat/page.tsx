import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Check, Square, Trash2 } from "lucide-react";

import { supabase } from "@/lib/supabase";
import {
  createNotification,
  extractMentionedUserIds,
} from "@/lib/notifications";
import { useLanguage } from "@/lib/i18n";

import { useChatBootstrap } from "./hooks/useChatBootstrap";
import { useChatMessages } from "./hooks/useChatMessages";
import type {
  ChatGroupMemberRow,
  ChatGroupRow,
  ChatMessageRow,
  ProfileRow,
} from "./types";
import {
  buildDirectKey,
  getConversationInitials,
  getConversationName,
  getMembersForGroup,
} from "./utils";

import ChatSidebar from "./components/ChatSidebar";
import ChatHeader from "./components/ChatHeader";
import MessageList from "./components/MessageList";
import MessageComposer from "./components/MessageComposer";
import CreateGroupDialog from "./components/CreateGroupDialog";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function normalizeTranslationSeed(text: string) {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

export default function ChatPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();

  const {
    currentUserId,
    currentUserRole,
    profiles,
    groups,
    groupMembers,
    selectedConversationId,
    isBootstrapping,
    error,
    setError,
    setSelectedConversationId,
    moveGroupToTop,
    upsertGroupLocally,
    removeGroupLocally,
    reloadChatShell,
  } = useChatBootstrap(id || null);

  const {
    messages,
    hasMoreMessages,
    isLoadingMessages,
    isLoadingOlder,
    selectedMessages,
    scrollAreaRef,
    messagesEndRef,
    loadMessagesForGroup,
    handleLoadOlderMessages,
    appendMessageLocally,
    updateMessageLocally,
    deleteMessageLocally,
    replaceTempMessageWithRealOne,
  } = useChatMessages(selectedConversationId);

  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");

  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");

  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState("");
  const [messageActionLoading, setMessageActionLoading] = useState<string | null>(null);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [groupActionLoading, setGroupActionLoading] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!id) return;
    if (!groups.some((group) => group.id === id)) return;
    if (selectedConversationId === id) return;

    setSelectedConversationId(id);
  }, [groups, id, selectedConversationId, setSelectedConversationId]);

  useEffect(() => {
    setIsSelectionMode(false);
    setSelectedMessageIds([]);
    setEditingMessageId(null);
    setEditingMessageText("");
  }, [selectedConversationId]);

  const selectedConversation = useMemo(() => {
    if (!selectedConversationId) return null;
    return groups.find((group) => group.id === selectedConversationId) || null;
  }, [groups, selectedConversationId]);

  const getMembers = useCallback(
    (groupId: string) => getMembersForGroup(groupMembers, groupId),
    [groupMembers]
  );

  const conversationTitle = useMemo(() => {
    if (!selectedConversation) return "";
    return getConversationName(
      selectedConversation,
      currentUserId,
      profiles,
      groupMembers
    );
  }, [currentUserId, groupMembers, profiles, selectedConversation]);

  const conversationInitials = useMemo(() => {
    if (!selectedConversation) return "";
    return getConversationInitials(
      selectedConversation,
      currentUserId,
      profiles,
      groupMembers
    );
  }, [currentUserId, groupMembers, profiles, selectedConversation]);

  const mentionCandidates = useMemo(() => {
    if (!selectedConversationId) return [];

    const candidateIds = Array.from(
      new Set(getMembers(selectedConversationId).map((member) => member.user_id))
    );

    return candidateIds
      .map((userId) => profiles.find((profile) => profile.user_id === userId))
      .filter((profile): profile is ProfileRow => Boolean(profile))
      .filter((profile) => profile.user_id !== currentUserId);
  }, [currentUserId, getMembers, profiles, selectedConversationId]);

  const filteredMentionCandidates = useMemo(() => {
    if (!showMentionDropdown) return [];

    const q = mentionQuery.trim().toLowerCase();

    return mentionCandidates.filter((profile) => {
      const name = (profile.full_name || "").toLowerCase();
      return !q || name.includes(q);
    });
  }, [mentionCandidates, mentionQuery, showMentionDropdown]);

  const canManageMessage = useCallback(
    (message: ChatMessageRow) => {
      if (!currentUserId) return false;
      return currentUserRole === "admin" || message.user_id === currentUserId;
    },
    [currentUserId, currentUserRole]
  );

  const selectableMessages = useMemo(() => {
    return selectedMessages.filter((message) => canManageMessage(message));
  }, [canManageMessage, selectedMessages]);

  const allSelectableIds = selectableMessages.map((message) => message.id);
  const allSelected =
    allSelectableIds.length > 0 &&
    allSelectableIds.every((messageId) => selectedMessageIds.includes(messageId));

  const openConversation = useCallback(
    (groupId: string) => {
      setSelectedConversationId(groupId);
      navigate(`/chat/${groupId}`);

      if (!messages[groupId]) {
        void loadMessagesForGroup(groupId);
      }
    },
    [loadMessagesForGroup, messages, navigate, setSelectedConversationId]
  );

  const handleMessageInputChange = (value: string) => {
    setMessageInput(value);

    const match = value.match(/@([a-zA-Z0-9_]*)$/);

    if (match) {
      setMentionQuery(match[1] || "");
      setShowMentionDropdown(true);
      return;
    }

    setMentionQuery("");
    setShowMentionDropdown(false);
  };

  const insertMention = (fullName: string) => {
    const safeName = fullName.trim();
    if (!safeName) return;

    setMessageInput((prev) => prev.replace(/@([a-zA-Z0-9_]*)$/, `@${safeName} `));
    setMentionQuery("");
    setShowMentionDropdown(false);
  };

  const toggleGroupMember = (userId: string) => {
    setSelectedGroupMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const startDirectMessage = async (targetUserId: string) => {
    if (!currentUserId) return;

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
      .select("id, name, type, project_id, task_id, created_by, created_at, direct_key")
      .eq("type", "DIRECT")
      .eq("direct_key", directKey)
      .maybeSingle();

    if (existingError) {
      setError(existingError.message || t("chat.errors.checkDirectChat"));
      return;
    }

    if (existingDb) {
      const optimisticMembers: ChatGroupMemberRow[] = [
        {
          id: `local-${existingDb.id}-${currentUserId}`,
          group_id: existingDb.id,
          user_id: currentUserId,
          role: "member",
          created_at: new Date().toISOString(),
        },
        {
          id: `local-${existingDb.id}-${targetUserId}`,
          group_id: existingDb.id,
          user_id: targetUserId,
          role: "member",
          created_at: new Date().toISOString(),
        },
      ];

      upsertGroupLocally(existingDb as ChatGroupRow, optimisticMembers);
      openConversation(existingDb.id);
      void reloadChatShell(existingDb.id);
      return;
    }

    const { data: newGroup, error: groupError } = await supabase
      .from("chat_groups")
      .insert({
        name: null,
        type: "DIRECT",
        project_id: null,
        task_id: null,
        created_by: currentUserId,
        direct_key: directKey,
      })
      .select("id, name, type, project_id, task_id, created_by, created_at, direct_key")
      .single();

    if (groupError || !newGroup) {
      setError(groupError?.message || t("chat.errors.createDirectChat"));
      return;
    }

    const optimisticMembers: ChatGroupMemberRow[] = [
      {
        id: `local-${newGroup.id}-${currentUserId}`,
        group_id: newGroup.id,
        user_id: currentUserId,
        role: "member",
        created_at: new Date().toISOString(),
      },
      {
        id: `local-${newGroup.id}-${targetUserId}`,
        group_id: newGroup.id,
        user_id: targetUserId,
        role: "member",
        created_at: new Date().toISOString(),
      },
    ];

    upsertGroupLocally(newGroup as ChatGroupRow, optimisticMembers);
    openConversation(newGroup.id);

    const { error: memberInsertError } = await supabase
      .from("chat_group_members")
      .insert([
        { group_id: newGroup.id, user_id: currentUserId, role: "member" },
        { group_id: newGroup.id, user_id: targetUserId, role: "member" },
      ]);

    if (memberInsertError) {
      setError(memberInsertError.message || t("chat.errors.addDirectChatMembers"));
    }

    void reloadChatShell(newGroup.id);
  };

  const handleCreateGroup = async () => {
    if (!currentUserId) return;

    if (!groupName.trim()) {
      setError(t("chat.errors.groupNameRequired"));
      return;
    }

    if (selectedGroupMembers.length === 0) {
      setError(t("chat.errors.selectAtLeastOneMember"));
      return;
    }

    setIsCreatingGroup(true);
    setError("");

    const { data: newGroup, error: groupError } = await supabase
      .from("chat_groups")
      .insert({
        name: groupName.trim(),
        type: "GROUP",
        project_id: null,
        task_id: null,
        created_by: currentUserId,
        direct_key: null,
      })
      .select("id, name, type, project_id, task_id, created_by, created_at, direct_key")
      .single();

    if (groupError || !newGroup) {
      setError(groupError?.message || t("chat.errors.createGroupChat"));
      setIsCreatingGroup(false);
      return;
    }

    const optimisticMembers: ChatGroupMemberRow[] = [
      {
        id: `local-${newGroup.id}-${currentUserId}`,
        group_id: newGroup.id,
        user_id: currentUserId,
        role: "owner",
        created_at: new Date().toISOString(),
      },
      ...selectedGroupMembers.map((userId) => ({
        id: `local-${newGroup.id}-${userId}`,
        group_id: newGroup.id,
        user_id: userId,
        role: "member",
        created_at: new Date().toISOString(),
      })),
    ];

    upsertGroupLocally(newGroup as ChatGroupRow, optimisticMembers);
    openConversation(newGroup.id);

    setGroupName("");
    setSelectedGroupMembers([]);
    setIsCreateGroupOpen(false);
    setIsCreatingGroup(false);

    const { error: membersError } = await supabase
      .from("chat_group_members")
      .insert([
        { group_id: newGroup.id, user_id: currentUserId, role: "owner" },
        ...selectedGroupMembers.map((userId) => ({
          group_id: newGroup.id,
          user_id: userId,
          role: "member",
        })),
      ]);

    if (membersError) {
      setError(membersError.message || t("chat.errors.addGroupMembers"));
    }

    void reloadChatShell(newGroup.id);
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversationId || !currentUserId || !selectedConversation) {
      return;
    }

    const contentToSend = messageInput.trim();
    const tempId = `temp-${Date.now()}`;

    const optimisticMessage: ChatMessageRow = {
      id: tempId,
      group_id: selectedConversationId,
      user_id: currentUserId,
      content: contentToSend,
      created_at: new Date().toISOString(),
    };

    appendMessageLocally(selectedConversationId, optimisticMessage);
    moveGroupToTop(selectedConversationId);

    setMessageInput("");
    setMentionQuery("");
    setShowMentionDropdown(false);
    setIsSending(true);
    setError("");

    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });

    const { data: insertedMessage, error: sendError } = await supabase
      .from("chat_messages")
      .insert({
        group_id: selectedConversationId,
        user_id: currentUserId,
        content: contentToSend,
      })
      .select("id, group_id, user_id, content, created_at")
      .single();

    if (sendError || !insertedMessage) {
      deleteMessageLocally(selectedConversationId, tempId);
      setMessageInput(contentToSend);
      setError(sendError?.message || t("chat.errors.sendMessage"));
      setIsSending(false);
      return;
    }

    replaceTempMessageWithRealOne(selectedConversationId, insertedMessage as ChatMessageRow);
    const normalizedSeed = normalizeTranslationSeed(contentToSend);

    const { data: existingSeed } = await supabase
      .from("translation_memory")
      .select("id, usage_count")
      .eq("source_text_normalized", normalizedSeed)
      .eq("language", "seed")
      .maybeSingle();

    if (existingSeed) {
      await supabase
        .from("translation_memory")
        .update({
          usage_count: (existingSeed.usage_count || 0) + 1,
        })
        .eq("id", existingSeed.id);
    } else {
      await supabase.from("translation_memory").insert({
        source_text_normalized: normalizedSeed,
        language: "seed",
        translated_text: contentToSend,
        usage_count: 1,
      });
    }

    const mentionedUserIds = extractMentionedUserIds(
      contentToSend,
      mentionCandidates.map((profile) => ({
        user_id: profile.user_id,
        full_name: profile.full_name,
      }))
    ).filter((userId) => userId !== currentUserId);

    const mentionedSet = new Set(mentionedUserIds);

    const recipientMembers = getMembers(selectedConversationId).filter(
      (member) => member.user_id !== currentUserId && !mentionedSet.has(member.user_id)
    );

    for (const member of recipientMembers) {
      await createNotification({
        userId: member.user_id,
        actorUserId: currentUserId,
        type: "MESSAGE",
        title: t("chat.notifications.newMessageTitle", undefined, {
          conversationTitle,
        }),
        message: contentToSend,
        link: `/chat/${selectedConversationId}`,
        entityType: "chat_message",
        entityId: insertedMessage.id,
      });
    }

    for (const userId of mentionedUserIds) {
      await createNotification({
        userId,
        actorUserId: currentUserId,
        type: "MENTION",
        title: t("chat.notifications.mentionedTitle"),
        message: t("chat.notifications.mentionedMessage", undefined, {
          conversationTitle,
        }),
        link: `/chat/${selectedConversationId}`,
        entityType: "chat_message",
        entityId: insertedMessage.id,
      });
    }

    setIsSending(false);
  };

  const startEditingMessage = (message: ChatMessageRow) => {
    setIsSelectionMode(false);
    setSelectedMessageIds([]);
    setEditingMessageId(message.id);
    setEditingMessageText(message.content);
  };

  const cancelEditingMessage = () => {
    setEditingMessageId(null);
    setEditingMessageText("");
  };

  const handleSaveEditedMessage = async (message: ChatMessageRow) => {
    if (!editingMessageText.trim()) {
      setError(t("chat.errors.messageCannotBeEmpty"));
      return;
    }

    setMessageActionLoading(message.id);
    setError("");

    const { error: updateError } = await supabase
      .from("chat_messages")
      .update({ content: editingMessageText.trim() })
      .eq("id", message.id);

    if (updateError) {
      setError(updateError.message || t("chat.errors.updateMessage"));
      setMessageActionLoading(null);
      return;
    }

    updateMessageLocally(message.group_id, {
      ...message,
      content: editingMessageText.trim(),
    });

    setEditingMessageId(null);
    setEditingMessageText("");
    setMessageActionLoading(null);
  };

  const handleDeleteMessage = async (message: ChatMessageRow) => {
    const confirmed = window.confirm(t("chat.confirms.deleteMessage"));
    if (!confirmed) return;

    setMessageActionLoading(message.id);
    setError("");

    const { error: deleteError } = await supabase
      .from("chat_messages")
      .delete()
      .eq("id", message.id);

    if (deleteError) {
      setError(deleteError.message || t("chat.errors.deleteMessage"));
      setMessageActionLoading(null);
      return;
    }

    deleteMessageLocally(message.group_id, message.id);

    if (editingMessageId === message.id) {
      setEditingMessageId(null);
      setEditingMessageText("");
    }

    setMessageActionLoading(null);
  };

  const handleBulkDeleteMessages = async () => {
    if (!selectedConversationId || selectedMessageIds.length === 0) return;

    const allowedIds = new Set(
      selectedMessages
        .filter((message) => selectedMessageIds.includes(message.id))
        .filter((message) => canManageMessage(message))
        .map((message) => message.id)
    );

    const idsToDelete = selectedMessageIds.filter((id) => allowedIds.has(id));

    if (idsToDelete.length === 0) {
      setError(t("chat.errors.noDeletableMessagesSelected"));
      return;
    }

    const confirmed = window.confirm(
      t("chat.confirms.deleteSelectedMessages", undefined, {
        total: idsToDelete.length,
      })
    );
    if (!confirmed) return;

    setBulkDeleteLoading(true);
    setError("");

    const { error: deleteError } = await supabase
      .from("chat_messages")
      .delete()
      .in("id", idsToDelete);

    if (deleteError) {
      setError(deleteError.message || t("chat.errors.deleteSelectedMessages"));
      setBulkDeleteLoading(false);
      return;
    }

    for (const messageId of idsToDelete) {
      deleteMessageLocally(selectedConversationId, messageId);
    }

    if (editingMessageId && idsToDelete.includes(editingMessageId)) {
      setEditingMessageId(null);
      setEditingMessageText("");
    }

    setSelectedMessageIds([]);
    setIsSelectionMode(false);
    setBulkDeleteLoading(false);
  };

  const handleDeleteChat = async (group: ChatGroupRow) => {
    const confirmed = window.confirm(t("chat.confirms.deleteChat"));
    if (!confirmed) return;

    setGroupActionLoading(group.id);
    setError("");

    const { error: deleteError } = await supabase
      .from("chat_groups")
      .delete()
      .eq("id", group.id);

    if (deleteError) {
      setError(deleteError.message || t("chat.errors.deleteChat"));
      setGroupActionLoading(null);
      return;
    }

    removeGroupLocally(group.id);

    if (selectedConversationId === group.id) {
      navigate("/chat");
    }

    setGroupActionLoading(null);
    void reloadChatShell(null);
  };

  return (
    <>
      <div className="h-[calc(100vh-140px)] flex gap-4 overflow-hidden min-h-0">
        <ChatSidebar
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          groups={groups}
          groupMembers={groupMembers}
          profiles={profiles}
          searchQuery={searchQuery}
          selectedConversationId={selectedConversationId}
          groupActionLoading={groupActionLoading}
          onSearchChange={setSearchQuery}
          onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
          onOpenConversation={openConversation}
          onStartDirectMessage={(userId) => void startDirectMessage(userId)}
          onDeleteChat={(group) => void handleDeleteChat(group)}
        />

       {selectedConversation ? (
          <Card className="flex-1 bg-slate-900/50 border-slate-800 flex flex-col h-full overflow-hidden min-h-0">
            <ChatHeader
              title={conversationTitle}
              participantCount={getMembers(selectedConversation.id).length}
              initials={conversationInitials}
              isSelectionMode={isSelectionMode}
              onToggleSelectionMode={() => {
                setIsSelectionMode((prev) => !prev);
                setSelectedMessageIds([]);
              }}
            />

            {(isSelectionMode || selectedMessageIds.length > 0) && (
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-800 bg-slate-950/60 shrink-0">
                <div className="text-sm text-slate-300">
                  {t("chat.selection.selectedCount", undefined, {
                    total: selectedMessageIds.length,
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-700 text-slate-200 hover:bg-slate-800"
                    onClick={() =>
                      setSelectedMessageIds(allSelected ? [] : allSelectableIds)
                    }
                  >
                    {allSelected ? (
                      <>
                        <Square className="w-4 h-4 mr-2" />
                        {t("chat.selection.clearAll")}
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        {t("chat.selection.selectAll")}
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    className="bg-red-600 hover:bg-red-700 text-white"
                    disabled={bulkDeleteLoading || selectedMessageIds.length === 0}
                    onClick={() => void handleBulkDeleteMessages()}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {bulkDeleteLoading
                      ? t("chat.selection.deleting")
                      : t("chat.selection.deleteSelected")}
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <div className="mx-4 mt-4 rounded-md border border-red-800 bg-red-900/20 px-3 py-2 text-sm text-red-300">
                {error}
              </div>
            )}

            <MessageList
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              messages={selectedMessages}
              profiles={profiles}
              isSelectionMode={isSelectionMode}
              selectedMessageIds={selectedMessageIds}
              editingMessageId={editingMessageId}
              editingMessageText={editingMessageText}
              messageActionLoading={messageActionLoading}
              hasMore={Boolean(
                selectedConversationId && hasMoreMessages[selectedConversationId]
              )}
              isLoadingOlder={isLoadingOlder}
              scrollAreaRef={scrollAreaRef}
              messagesEndRef={messagesEndRef}
              onLoadOlder={() => void handleLoadOlderMessages()}
              onToggleSelection={(message) =>
                setSelectedMessageIds((prev) =>
                  prev.includes(message.id)
                    ? prev.filter((id) => id !== message.id)
                    : [...prev, message.id]
                )
              }
              onStartEdit={startEditingMessage}
              onEditTextChange={setEditingMessageText}
              onSaveEdit={(message) => void handleSaveEditedMessage(message)}
              onCancelEdit={cancelEditingMessage}
              onDeleteMessage={(message) => void handleDeleteMessage(message)}
            />

            <div className="px-4 py-2 text-xs text-slate-500">
              {isLoadingMessages && !messages[selectedConversation.id]
                ? t("chat.status.openingConversation")
                : t("chat.status.loadedMessages", undefined, {
                    total: selectedMessages.length,
                  })}
            </div>

            <MessageComposer
              messageInput={messageInput}
              isSending={isSending}
              showMentionDropdown={showMentionDropdown}
              filteredMentionCandidates={filteredMentionCandidates}
              onChange={handleMessageInputChange}
              onSend={() => void handleSendMessage()}
              onInsertMention={insertMention}
            />
          </Card>
        ) : (
          <Card className="flex-1 bg-slate-900/50 border-slate-800 flex items-center justify-center min-h-0">
            <div className="text-center">
              <div className="text-white text-lg font-medium mb-2">
                {isBootstrapping
                  ? t("chat.empty.loadingTitle")
                  : t("chat.empty.selectTitle")}
              </div>
              <p className="text-slate-500">
                {isBootstrapping
                  ? t("chat.empty.loadingDescription")
                  : t("chat.empty.selectDescription")}
              </p>
            </div>
          </Card>
        )}
      </div>

      <CreateGroupDialog
        open={isCreateGroupOpen}
        currentUserId={currentUserId}
        groupName={groupName}
        selectedGroupMembers={selectedGroupMembers}
        profiles={profiles}
        isCreatingGroup={isCreatingGroup}
        onOpenChange={setIsCreateGroupOpen}
        onGroupNameChange={setGroupName}
        onToggleMember={toggleGroupMember}
        onCreate={() => void handleCreateGroup()}
        onCancel={() => {
          setIsCreateGroupOpen(false);
          setGroupName("");
          setSelectedGroupMembers([]);
        }}
      />
    </>
  );
}
