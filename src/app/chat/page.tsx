import { useMemo } from "react";
import { useParams } from "react-router-dom";

import { useChatBootstrap } from "./hooks/useChatBootstrap";
import { useChatMessages } from "./hooks/useChatMessages";

import { ChatSidebar } from "./components/ChatSidebar";
import { ChatHeader } from "./components/ChatHeader";
import { MessageList } from "./components/MessageList";
import { MessageComposer } from "./components/MessageComposer";
import { CreateGroupDialog } from "./components/CreateGroupDialog";

import { Card } from "@/components/ui/card";
import { Send } from "lucide-react";

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();

  const chatBootstrap = useChatBootstrap(id || null);

  const chatMessages = useChatMessages({
    initialConversationId: id || null,
    currentUserId: chatBootstrap.currentUserId,
    currentUserRole: chatBootstrap.currentUserRole,
    profiles: chatBootstrap.profiles,
    groups: chatBootstrap.groups,
    groupMembers: chatBootstrap.groupMembers,
    selectedConversationId: chatBootstrap.selectedConversationId,
    setSelectedConversationId: chatBootstrap.setSelectedConversationId,
    isBootstrapping: chatBootstrap.isBootstrapping,
    error: chatBootstrap.error,
    setError: chatBootstrap.setError,
    getMembersForGroup: chatBootstrap.getMembersForGroup,
    getProfileByUserId: chatBootstrap.getProfileByUserId,
    moveGroupToTop: chatBootstrap.moveGroupToTop,
    upsertGroupLocally: chatBootstrap.upsertGroupLocally,
    removeGroupLocally: chatBootstrap.removeGroupLocally,
    reloadChatShell: chatBootstrap.reloadChatShell,
  });

  const selectedConversation = useMemo(() => {
    if (!chatBootstrap.selectedConversationId) return null;

    return (
      chatBootstrap.groups.find(
        (group) => group.id === chatBootstrap.selectedConversationId
      ) || null
    );
  }, [chatBootstrap.groups, chatBootstrap.selectedConversationId]);

  return (
    <>
      <div className="h-[calc(100vh-140px)] flex gap-4 overflow-hidden min-h-0">
        <ChatSidebar
          isBootstrapping={chatBootstrap.isBootstrapping}
          error={chatBootstrap.error}
          searchQuery={chatMessages.searchQuery}
          setSearchQuery={chatMessages.setSearchQuery}
          filteredConversations={chatMessages.filteredConversations}
          profiles={chatBootstrap.profiles}
          currentUserId={chatBootstrap.currentUserId}
          currentUserRole={chatBootstrap.currentUserRole}
          selectedConversationId={chatBootstrap.selectedConversationId}
          getConversationName={chatMessages.getConversationName}
          getConversationInitials={chatMessages.getConversationInitials}
          getMembersForGroup={chatBootstrap.getMembersForGroup}
          openConversation={chatMessages.openConversation}
          startDirectMessage={chatMessages.startDirectMessage}
          handleDeleteChat={chatMessages.handleDeleteChat}
          isCreateGroupOpen={chatMessages.isCreateGroupOpen}
          setIsCreateGroupOpen={chatMessages.setIsCreateGroupOpen}
        />

        {selectedConversation ? (
          <Card className="flex-1 bg-slate-900/50 border-slate-800 flex flex-col h-full overflow-hidden min-h-0">
            <ChatHeader
              selectedConversation={selectedConversation}
              currentUserId={chatBootstrap.currentUserId}
              getConversationName={chatMessages.getConversationName}
              getConversationInitials={chatMessages.getConversationInitials}
              getMembersForGroup={chatBootstrap.getMembersForGroup}
              isSelectionMode={chatMessages.isSelectionMode}
              setIsSelectionMode={chatMessages.setIsSelectionMode}
              setSelectedMessageIds={chatMessages.setSelectedMessageIds}
              selectedMessageIds={chatMessages.selectedMessageIds}
              allSelectableIds={chatMessages.allSelectableIds}
              allSelected={chatMessages.allSelected}
              bulkDeleteLoading={chatMessages.bulkDeleteLoading}
              handleBulkDeleteMessages={chatMessages.handleBulkDeleteMessages}
            />

            <MessageList
              selectedConversation={selectedConversation}
              selectedConversationId={chatBootstrap.selectedConversationId}
              selectedMessages={chatMessages.selectedMessages}
              currentUserId={chatBootstrap.currentUserId}
              getProfileByUserId={chatBootstrap.getProfileByUserId}
              formatMessageTime={chatMessages.formatMessageTime}
              canManageMessage={chatMessages.canManageMessage}
              isSelectionMode={chatMessages.isSelectionMode}
              selectedMessageIds={chatMessages.selectedMessageIds}
              setSelectedMessageIds={chatMessages.setSelectedMessageIds}
              editingMessageId={chatMessages.editingMessageId}
              editingMessageText={chatMessages.editingMessageText}
              setEditingMessageText={chatMessages.setEditingMessageText}
              startEditingMessage={chatMessages.startEditingMessage}
              cancelEditingMessage={chatMessages.cancelEditingMessage}
              handleSaveEditedMessage={chatMessages.handleSaveEditedMessage}
              handleDeleteMessage={chatMessages.handleDeleteMessage}
              messageActionLoading={chatMessages.messageActionLoading}
              scrollAreaRef={chatMessages.scrollAreaRef}
              messagesEndRef={chatMessages.messagesEndRef}
              hasMoreMessages={chatMessages.hasMoreMessages}
              isLoadingOlder={chatMessages.isLoadingOlder}
              handleLoadOlderMessages={chatMessages.handleLoadOlderMessages}
              loadingGroupId={chatMessages.loadingGroupId}
            />

            <MessageComposer
              messageInput={chatMessages.messageInput}
              handleMessageInputChange={chatMessages.handleMessageInputChange}
              handleSendMessage={chatMessages.handleSendMessage}
              isSending={chatMessages.isSending}
              showMentionDropdown={chatMessages.showMentionDropdown}
              filteredMentionCandidates={chatMessages.filteredMentionCandidates}
              insertMention={chatMessages.insertMention}
            />
          </Card>
        ) : (
          <Card className="flex-1 bg-slate-900/50 border-slate-800 flex items-center justify-center min-h-0">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-slate-500" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">
                Select a conversation
              </h3>
              <p className="text-slate-500">
                Choose a conversation from the sidebar to start chatting
              </p>
            </div>
          </Card>
        )}
      </div>

      <CreateGroupDialog
        open={chatMessages.isCreateGroupOpen}
        onOpenChange={chatMessages.setIsCreateGroupOpen}
        groupName={chatMessages.groupName}
        setGroupName={chatMessages.setGroupName}
        profiles={chatBootstrap.profiles}
        currentUserId={chatBootstrap.currentUserId}
        selectedGroupMembers={chatMessages.selectedGroupMembers}
        toggleGroupMember={chatMessages.toggleGroupMember}
        isCreatingGroup={chatMessages.isCreatingGroup}
        handleCreateGroup={chatMessages.handleCreateGroup}
        resetForm={() => {
          chatMessages.setIsCreateGroupOpen(false);
          chatMessages.setGroupName("");
          chatMessages.setSelectedGroupMembers([]);
        }}
      />
    </>
  );
}
