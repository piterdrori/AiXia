import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  createNotification,
  extractMentionedUserIds,
} from "@/lib/notifications";

import { Card } from "@/components/ui/card";
import ChatHeader from "./components/ChatHeader";
import ChatSidebar from "./components/ChatSidebar";
import CreateGroupDialog from "./components/CreateGroupDialog";
import MessageComposer from "./components/MessageComposer";
import MessageList from "./components/MessageList";
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

export default function ChatPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const {
    currentUserId,
    currentUserRole,
    profiles,
    groups,
    groupMembers,
    selectedConversationId,
    setSelectedConversationId,
    isBootstrapping,
    error,
    setError,
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
    handleLoadOlderMessages,
    appendMessageLocally,
    updateMessageLocally,
    deleteMessageLocally,
    replaceTempMessageWithRealOne,
  } = useChatMessages(selectedConversationId);

  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");

  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState("");
  const [messageActionLoading, setMessageActionLoading] = useState<string | null>(null);
  const [groupActionLoading, setGroupActionLoading] = useState<string | null>(null);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);

  const selectedConversation = selectedConversationId
    ? groups.find((group) => group.id === selectedConversationId) || null
    : null;

  const getMembers = (groupId: string) => getMembersForGroup(groupMembers, groupId);
  const getProfile = (userId: string) =>
    profiles.find((profile) => profile.user_id === userId) || null;

  const mentionCandidates = useMemo(() => {
    if (!selectedConversationId) return [];

    const candidateIds = Array.from(
      new Set(getMembers(selectedConversationId).map((member) => member.user_id))
    );

    return candidateIds
      .map((userId) => profiles.find((profile) => profile.user_id === userId))
      .filter((profile): profile is ProfileRow => Boolean(profile))
      .filter((profile) => profile.user_id !== currentUserId);
  }, [currentUserId, groupMembers, profiles, selectedConversationId]);

  const filteredMentionCandidates = useMemo(() => {
    if (!showMentionDropdown) return [];

    const query = mentionQuery.trim().toLowerCase();

    return mentionCandidates.filter((profile) => {
      const fullName = (profile.full_name || "").toLowerCase();
      return !query || fullName.includes(query);
    });
  }, [mentionCandidates, mentionQuery, showMentionDropdown]);

  const openConversation = (groupId: string) => {
    setSelectedConversationId(groupId);
    navigate(`/chat/${groupId}`);
  };

  const startDirectMessage = async (targetUserId: string) => {
    if (!currentUserId) return;

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
      setError(existingError.message || "Failed to check direct chat.");
      return;
    }

    if (existingDb) {
      openConversation(existingDb.id);
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
      setError(groupError?.message || "Failed to create direct chat.");
      return;
    }

    const { error: memberInsertError } = await supabase.from("chat_group_members").insert([
      { group_id: newGroup.id, user_id: currentUserId, role: "member" },
      { group_id: newGroup.id, user_id: targetUserId, role: "member" },
    ]);

    if (memberInsertError) {
      setError(memberInsertError.message || "Failed to add direct chat members.");
      return;
    }

    await reloadChatShell(newGroup.id);
    openConversation(newGroup.id);
  };

  const handleCreateGroup = async () => {
    if (!currentUserId) return;

    if (!groupName.trim()) {
      setError("Group name is required.");
      return;
    }

    if (selectedGroupMembers.length === 0) {
      setError("Select at least one member.");
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
      setError(groupError?.message || "Failed to create group chat.");
      setIsCreatingGroup(false);
      return;
    }

    const memberRows = [
      { group_id: newGroup.id, user_id: currentUserId, role: "owner" },
      ...selectedGroupMembers.map((userId) => ({
        group_id: newGroup.id,
        user_id: userId,
        role: "member",
      })),
    ];

    const { error: membersError } = await supabase
      .from("chat_group_members")
      .insert(memberRows);

    if (membersError) {
      setError(membersError.message || "Failed to add group members.");
      setIsCreatingGroup(false);
      return;
    }

    setGroupName("");
    setSelectedGroupMembers([]);
    setIsCreateGroupOpen(false);
    setIsCreatingGroup(false);

    await reloadChatShell(newGroup.id);
    openConversation(newGroup.id);
  };

  const toggleGroupMember = (userId: string) => {
    setSelectedGroupMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

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

    const updatedValue = messageInput.replace(/@([a-zA-Z0-9_]*)$/, `@${safeName} `);
    setMessageInput(updatedValue);
    setMentionQuery("");
    setShowMentionDropdown(false);
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
    setMessageInput("");
    setMentionQuery("");
    setShowMentionDropdown(false);
    setIsSending(true);
    setError("");

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
      setError(sendError?.message || "Failed to send message.");
      setIsSending(false);
      return;
    }

    replaceTempMessageWithRealOne(selectedConversationId, insertedMessage as ChatMessageRow);

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
        title: `New message in ${getConversationName(
          selectedConversation,
          currentUserId,
          profiles,
          groupMembers
        )}`,
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
        title: "You were mentioned in chat",
        message: `You were mentioned in ${getConversationName(
          selectedConversation,
          currentUserId,
          profiles,
          groupMembers
        )}`,
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
      setError("Message cannot be empty.");
      return;
    }

    setMessageActionLoading(message.id);
    setError("");

    const { error: updateError } = await supabase
      .from("chat_messages")
      .update({ content: editingMessageText.trim() })
      .eq("id", message.id);

    if (updateError) {
      setError(updateError.message || "Failed to update message.");
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
    const confirmed = window.confirm("Are you sure you want to delete this message?");
    if (!confirmed) return;

    setMessageActionLoading(message.id);
    setError("");

    const { error: deleteError } = await supabase
      .from("chat_messages")
      .delete()
      .eq("id", message.id);

    if (deleteError) {
      setError(deleteError.message || "Failed to delete message.");
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

  const handleDeleteChat = async (group: ChatGroupRow) => {
    const confirmed = window.confirm("Are you sure you want to delete this chat?");
    if (!confirmed) return;

    setGroupActionLoading(group.id);
    setError("");

    const { error: deleteError } = await supabase
      .from("chat_groups")
      .delete()
      .eq("id", group.id);

    if (deleteError) {
      setError(deleteError.message || "Failed to delete chat.");
      setGroupActionLoading(null);
      return;
    }

    if (selectedConversationId === group.id) {
      setSelectedConversationId(null);
      navigate("/chat");
    }

    await reloadChatShell(null);
    setGroupActionLoading(null);
  };

  if (isBootstrapping) {
    return (
      <div className="h-[calc(100vh-140px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

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
          onStartDirectMessage={startDirectMessage}
          onDeleteChat={handleDeleteChat}
        />

        {selectedConversation ? (
          <Card className="flex-1 bg-slate-900/50 border-slate-800 flex flex-col h-full overflow-hidden min-h-0">
            <ChatHeader
              title={getConversationName(
                selectedConversation,
                currentUserId,
                profiles,
                groupMembers
              )}
              participantCount={getMembers(selectedConversation.id).length}
              initials={getConversationInitials(
                selectedConversation,
                currentUserId,
                profiles,
                groupMembers
              )}
              isSelectionMode={isSelectionMode}
              onToggleSelectionMode={() => {
                const nextMode = !isSelectionMode;
                setIsSelectionMode(nextMode);
                if (!nextMode) setSelectedMessageIds([]);
              }}
            />

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
              hasMore={hasMoreMessages[selectedConversation.id] ?? false}
              isLoadingOlder={isLoadingOlder || isLoadingMessages}
              scrollAreaRef={scrollAreaRef}
              messagesEndRef={messagesEndRef}
              onLoadOlder={handleLoadOlderMessages}
              onToggleSelection={(message) => {
                setSelectedMessageIds((prev) =>
                  prev.includes(message.id)
                    ? prev.filter((id) => id !== message.id)
                    : [...prev, message.id]
                );
              }}
              onStartEdit={startEditingMessage}
              onEditTextChange={setEditingMessageText}
              onSaveEdit={handleSaveEditedMessage}
              onCancelEdit={cancelEditingMessage}
              onDeleteMessage={handleDeleteMessage}
            />

            <MessageComposer
              messageInput={messageInput}
              isSending={isSending}
              showMentionDropdown={showMentionDropdown}
              filteredMentionCandidates={filteredMentionCandidates}
              onChange={handleMessageInputChange}
              onSend={handleSendMessage}
              onInsertMention={insertMention}
            />
          </Card>
        ) : (
          <Card className="flex-1 bg-slate-900/50 border-slate-800 flex items-center justify-center min-h-0">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-slate-500" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">
                Select a conversation
              </h3>
              <p className="text-slate-500">
                Choose a conversation from the sidebar to start chatting
              </p>
              {error ? <p className="text-red-400 mt-3 text-sm">{error}</p> : null}
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
        onCreate={handleCreateGroup}
        onCancel={() => {
          setIsCreateGroupOpen(false);
          setGroupName("");
          setSelectedGroupMembers([]);
        }}
      />
    </>
  );
}
