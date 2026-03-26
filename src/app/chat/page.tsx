import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Trash2, Check, Square } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAppClock } from "@/lib/clock/provider";
import { useChatBootstrap } from "./hooks/useChatBootstrap";
import { useChatMessages } from "./hooks/useChatMessages";
import type { ChatGroupRow, ChatMessageRow } from "./types";
import { getConversationName, getMembersForGroup, extractMentionedUserIds } from "./utils";

import ChatSidebar from "./components/ChatSidebar";
import TeamMembersSidebar from "./components/TeamMembersSidebar";
import ChatHeader from "./components/ChatHeader";
import MessageList from "./components/MessageList";
import MessageComposer from "./components/MessageComposer";
import CreateGroupDialog from "./components/CreateGroupDialog";
import { Button } from "@/components/ui/button";

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
    isBootstrapping,
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
    startDirectMessage,
    loadChatShell,
  } = useChatBootstrap(id || null);

  const getConvoName = useCallback((groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    return group ? getConversationName(group, currentUserId, profiles, groupMembers) : "Chat";
  }, [groups, currentUserId, profiles, groupMembers]);

  const {
    messages,
    hasMoreMessages,
    isLoadingMessages,
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

  // UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState("");
  const [messageActionLoading, setMessageActionLoading] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const selectedGroup = useMemo(() => 
    groups.find(g => g.id === selectedConversationId) || null,
  [groups, selectedConversationId]);

  const mentionCandidates = useMemo(() => {
    if (!selectedConversationId) return [];
    return getMembersForGroup(groupMembers, selectedConversationId)
      .map(m => profiles.find(p => p.user_id === m.user_id))
      .filter((p): p is NonNullable<typeof p> => !!p && p.user_id !== currentUserId);
  }, [selectedConversationId, groupMembers, profiles, currentUserId]);

  const filteredMentionCandidates = useMemo(() => {
    if (!showMentionDropdown) return [];
    const q = mentionQuery.toLowerCase();
    return mentionCandidates.filter(p => 
      (p.full_name || "").toLowerCase().includes(q)
    );
  }, [mentionCandidates, mentionQuery, showMentionDropdown]);

  // Cleanup on conversation change
  useEffect(() => {
    setIsSelectionMode(false);
    setSelectedMessageIds([]);
    setEditingMessageId(null);
    setEditingMessageText("");
  }, [selectedConversationId]);

  const openConversation = useCallback((groupId: string) => {
    setSelectedConversationId(groupId);
    navigate(`/chat/${groupId}`);
    markConversationAsRead(groupId);
    if (!messages[groupId]) {
      loadMessagesForGroup(groupId);
    }
  }, [navigate, markConversationAsRead, messages, loadMessagesForGroup, setSelectedConversationId]);

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
    setMessageInput(prev => prev.replace(/@[^\s]*$/, `@${name} `));
    setShowMentionDropdown(false);
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversationId || !currentUserId || !selectedGroup) return;

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
      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          group_id: selectedConversationId,
          user_id: currentUserId,
          content,
        })
        .select()
        .single();

      if (error) throw error;
      
      replaceTempMessageWithRealOne(selectedConversationId, data);
      
      // Update group last_message
      await supabase.from("chat_groups").update({ 
        last_message: content,
        last_message_at: clock.nowIso 
      }).eq("id", selectedConversationId);
      
    } catch (err) {
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
        .insert({ name, type: "GROUP", created_by: currentUserId })
        .select()
        .single();
        
      if (error || !group) throw new Error("Failed to create group");
      
      const members = [
        { group_id: group.id, user_id: currentUserId, role: "owner" },
        ...memberIds.map(id => ({ group_id: group.id, user_id: id, role: "member" }))
      ];
      
      const { error: memberError } = await supabase.from("chat_group_members").insert(members);
      if (memberError) throw memberError;
      
      upsertGroupLocally(group, members.map((m, i) => ({
        id: `${group.id}-${m.user_id}`,
        group_id: m.group_id,
        user_id: m.user_id,
        role: m.role,
        invited_by: currentUserId,
        created_at: clock.nowIso,
      })));
      
      setIsCreateGroupOpen(false);
      openConversation(group.id);
    } catch (err) {
      setError("Failed to create group");
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleDeleteChat = async (group: ChatGroupRow) => {
    if (!confirm("Delete this conversation?")) return;
    
    const { error } = await supabase.from("chat_groups").delete().eq("id", group.id);
    if (error) {
      setError("Failed to delete");
      return;
    }
    
    removeGroupLocally(group.id);
  };

  const canManageMessage = (msg: ChatMessageRow) => 
    currentUserRole === "admin" || msg.user_id === currentUserId;

  const handleBulkDelete = async () => {
    if (!selectedConversationId || selectedMessageIds.length === 0) return;
    if (!confirm(`Delete ${selectedMessageIds.length} messages?`)) return;
    
    const { error } = await supabase
      .from("chat_messages")
      .delete()
      .in("id", selectedMessageIds);
      
    if (error) {
      setError("Failed to delete messages");
      return;
    }
    
    selectedMessageIds.forEach(id => 
      deleteMessageLocally(selectedConversationId, id)
    );
    setSelectedMessageIds([]);
    setIsSelectionMode(false);
  };

  return (
    <div className="h-[calc(100vh-64px)] flex bg-slate-950">
      {/* Left Sidebar - Conversations */}
      <ChatSidebar
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        groups={groups}
        groupMembers={groupMembers}
        profiles={profiles}
        searchQuery={searchQuery}
        selectedConversationId={selectedConversationId}
        groupActionLoading={null}
        unreadCounts={unreadCounts}
        onSearchChange={setSearchQuery}
        onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
        onOpenConversation={openConversation}
        onDeleteChat={handleDeleteChat}
      />

      {/* Middle - Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
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

            {error && (
              <div className="mx-6 mt-4 p-3 bg-red-900/20 border border-red-800 text-red-400 rounded text-sm">
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
              hasMore={hasMoreMessages[selectedConversationId] || false}
              isLoadingOlder={isLoadingOlder}
              scrollAreaRef={scrollAreaRef}
              messagesEndRef={messagesEndRef}
              highlightedMessageIds={highlightedMessageIds}
              onLoadOlder={handleLoadOlderMessages}
              onToggleSelection={(msg) => {
                setSelectedMessageIds(prev => 
                  prev.includes(msg.id) 
                    ? prev.filter(id => id !== msg.id)
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
                setMessageActionLoading(msg.id);
                await supabase.from("chat_messages").update({ content: editingMessageText }).eq("id", msg.id);
                updateMessageLocally(msg.group_id, { ...msg, content: editingMessageText });
                setEditingMessageId(null);
                setMessageActionLoading(null);
              }}
              onCancelEdit={() => {
                setEditingMessageId(null);
                setEditingMessageText("");
              }}
              onDeleteMessage={async (msg) => {
                if (!confirm("Delete this message?")) return;
                setMessageActionLoading(msg.id);
                await supabase.from("chat_messages").delete().eq("id", msg.id);
                deleteMessageLocally(msg.group_id, msg.id);
                setMessageActionLoading(null);
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
              onUploadFile={async (file) => {
                // Handle file upload
              }}
              isUploadingFile={isUploadingFile}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-4">
              <span className="text-4xl">💬</span>
            </div>
            <h3 className="text-lg font-medium text-slate-300 mb-1">Select a conversation</h3>
            <p>Choose a chat from the sidebar to start messaging</p>
          </div>
        )}
      </div>

      {/* Right Sidebar - Team Members */}
      <TeamMembersSidebar
        profiles={profiles}
        currentUserId={currentUserId}
        onlineStatus={onlineStatus}
        onStartDM={startDirectMessage}
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
  );
}
