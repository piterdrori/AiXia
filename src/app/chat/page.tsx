import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Check, Square, Trash2 } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { extractMentionedUserIds } from "@/lib/notifications";
import { useLanguage } from "@/lib/i18n";
import { useAppClock } from "@/lib/clock/provider";
import {
  registerRealtimeChannel,
  removeRealtimeChannel,
} from "@/lib/realtime";

import { useChatBootstrap } from "./hooks/useChatBootstrap";
import { useChatMessages } from "./hooks/useChatMessages";
import type {
  ChatGroupMemberRow,
  ChatGroupRow,
  ChatMessageRow,
  ProfileRow,
} from "./types";
import {
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
import TeamMembersSidebar from "./components/TeamMembersSidebar";

import GroupParticipantsPanel from "./components/GroupParticipantsPanel";

export default function ChatPage() {
  const navigate = useNavigate();
   const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
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
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const [messageSearchQuery, setMessageSearchQuery] = useState("");

    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [latestMessageByGroup, setLatestMessageByGroup] = useState<
    Record<string, ChatMessageRow | null>
  >({});
  const sidebarRealtimeChannelRef = useRef<
    ReturnType<typeof supabase.channel> | null
  >(null);

    const notificationRealtimeChannelKeyRef = useRef<string | null>(null);

  const [isParticipantsPanelOpen, setIsParticipantsPanelOpen] = useState(false);
  const [memberActionLoading, setMemberActionLoading] = useState<string | null>(
    null
  );

    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>(() => {
  if (typeof window === "undefined") return {};
  return ((window as Window & {
    __AIXIA_ONLINE_USERS__?: Record<string, boolean>;
  }).__AIXIA_ONLINE_USERS__ || {});
});

  useEffect(() => {
  if (!id) return;

  // always sync URL immediately (do NOT wait for groups)
  if (selectedConversationId !== id) {
    setSelectedConversationId(id);
  }
}, [id, selectedConversationId, setSelectedConversationId]);

  useEffect(() => {
  if (typeof window === "undefined") return;

  notificationAudioRef.current = new Audio("/sounds/notification.mp3");
  notificationAudioRef.current.preload = "auto";

  return () => {
    notificationAudioRef.current = null;
  };
}, []);

    useEffect(() => {
    setIsSelectionMode(false);
    setSelectedMessageIds([]);
    setEditingMessageId(null);
    setEditingMessageText("");
    setTypingUsers([]);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [selectedConversationId]);

  useEffect(() => {
  setMessageSearchQuery("");
}, [selectedConversationId]);

 useEffect(() => {
  setIsParticipantsPanelOpen(false);
}, [selectedConversationId]);

const selectedConversation = useMemo(() => {
    if (!selectedConversationId) return null;
    return groups.find((group) => group.id === selectedConversationId) || null;
  }, [groups, selectedConversationId]);

    const loadUnreadConversationCounts = useCallback(async () => {
    if (!currentUserId) {
      setUnreadCounts({});
      return;
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("link")
      .eq("user_id", currentUserId)
      .eq("is_read", false)
      .in("type", ["MESSAGE", "MENTION"])
      .like("link", "/chat/%");

    if (error) {
      console.error("Load unread conversation counts error:", error);
      return;
    }

    const nextCounts: Record<string, number> = {};

    for (const item of (data || []) as Array<{ id: string; link: string | null }>) {
      const link = item.link || "";
      if (!link.startsWith("/chat/")) continue;

      const groupId = link.replace("/chat/", "");
      if (!groupId) continue;

      nextCounts[groupId] = (nextCounts[groupId] || 0) + 1;
    }

    if (selectedConversationId) {
      nextCounts[selectedConversationId] = 0;
    }

    setUnreadCounts(nextCounts);
  }, [currentUserId, selectedConversationId]);

  useEffect(() => {
  if (selectedConversationId) {
    setUnreadCounts((prev) => {
      if (!prev[selectedConversationId]) return prev;
      return {
        ...prev,
        [selectedConversationId]: 0,
      };
    });
  }
}, [selectedConversationId]);

    useEffect(() => {
    void loadUnreadConversationCounts();
  }, [loadUnreadConversationCounts]);

  useEffect(() => {
    if (!currentUserId) return;
    if (!selectedConversationId) return;

    const markConversationNotificationsRead = async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", currentUserId)
        .eq("is_read", false)
        .in("type", ["MESSAGE", "MENTION"])
        .eq("link", `/chat/${selectedConversationId}`);

      if (error) {
        console.error("Mark conversation notifications read error:", error);
        return;
      }

      setUnreadCounts((prev) => ({
        ...prev,
        [selectedConversationId]: 0,
      }));
    };

    void markConversationNotificationsRead();
  }, [currentUserId, selectedConversationId]);

  useEffect(() => {
  const loadLatestMessages = async () => {
    const groupIds = groups.map((group) => group.id);
    if (groupIds.length === 0) {
      setLatestMessageByGroup({});
      return;
    }

    const { data, error } = await supabase
      .from("chat_messages")
      .select(`
        id,
        group_id,
        user_id,
        content,
        created_at,
        attachments:chat_attachments(
          id,
          message_id,
          group_id,
          uploaded_by,
          file_name,
          file_path,
          mime_type,
          file_size,
          created_at
        )
      `)
      .in("group_id", groupIds)
      .order("created_at", { ascending: false })
.limit(100);

    if (error) {
      console.error("Load latest sidebar messages error:", error);
      return;
    }

    const nextMap: Record<string, ChatMessageRow | null> = {};

    for (const item of (data || []) as ChatMessageRow[]) {
      if (!nextMap[item.group_id]) {
        nextMap[item.group_id] = item;
      }
    }

    setLatestMessageByGroup(nextMap);
  };

  void loadLatestMessages();
}, [groups]);

 useEffect(() => {
  if (typeof window === "undefined") return;

  const appWindow = window as Window & {
    __AIXIA_ONLINE_USERS__?: Record<string, boolean>;
  };

  const applyCurrent = () => {
    setOnlineUsers({ ...(appWindow.__AIXIA_ONLINE_USERS__ || {}) });
  };

  const handleOnlineUsersChanged = (
    event: Event
  ) => {
    const customEvent = event as CustomEvent<Record<string, boolean>>;
    setOnlineUsers({ ...(customEvent.detail || {}) });
  };

  applyCurrent();
  window.addEventListener(
    "aixia-online-users-changed",
    handleOnlineUsersChanged as EventListener
  );

  return () => {
    window.removeEventListener(
      "aixia-online-users-changed",
      handleOnlineUsersChanged as EventListener
    );
  };
}, []);

useEffect(() => {
  if (sidebarRealtimeChannelRef.current) {
    void sidebarRealtimeChannelRef.current.unsubscribe();
    sidebarRealtimeChannelRef.current = null;
  }

  const visibleGroupIds = new Set(groups.map((group) => group.id));
  if (visibleGroupIds.size === 0) return;

  const channel = supabase
    .channel("chat-sidebar-realtime")
    .on(
      "postgres_changes",
      {
  event: "INSERT",
  schema: "public",
  table: "chat_messages",
  filter: `group_id=in.(${Array.from(visibleGroupIds).join(",")})`,
},
      async (payload) => {
        const newMessage = payload.new as ChatMessageRow;
        if (!newMessage?.group_id) return;
        if (!visibleGroupIds.has(newMessage.group_id)) return;

        const { data, error } = await supabase
          .from("chat_messages")
          .select(`
            id,
            group_id,
            user_id,
            content,
            created_at,
            attachments:chat_attachments(
              id,
              message_id,
              group_id,
              uploaded_by,
              file_name,
              file_path,
              mime_type,
              file_size,
              created_at
            )
          `)
          .eq("id", newMessage.id)
          .single();

        if (error || !data) {
          console.error("Sidebar realtime fetch message error:", error);
          return;
        }

        const fullMessage = data as ChatMessageRow;

        setLatestMessageByGroup((prev) => ({
          ...prev,
          [fullMessage.group_id]: fullMessage,
        }));

                moveGroupToTop(fullMessage.group_id);

                if (fullMessage.user_id === currentUserId) {
          return;
        }

        try {
  const playPromise = notificationAudioRef.current?.play();
  if (playPromise !== undefined) {
    playPromise.catch(() => {});
  }
} catch {}

        if (fullMessage.group_id !== selectedConversationId) {
          setUnreadCounts((prev) => ({
            ...prev,
            [fullMessage.group_id]: (prev[fullMessage.group_id] || 0) + 1,
          }));
        }
      }
    )
    .subscribe();

  sidebarRealtimeChannelRef.current = channel;

  return () => {
    void channel.unsubscribe();

    if (sidebarRealtimeChannelRef.current === channel) {
      sidebarRealtimeChannelRef.current = null;
    }
  };
}, [
  groups,
  currentUserId,
  moveGroupToTop,
  selectedConversationId,
]);

    useEffect(() => {
    if (!currentUserId) return;

    if (notificationRealtimeChannelKeyRef.current) {
      void removeRealtimeChannel(notificationRealtimeChannelKeyRef.current);
      notificationRealtimeChannelKeyRef.current = null;
    }

    const channelKey = `chat-notification-counts:${currentUserId}`;
    notificationRealtimeChannelKeyRef.current = channelKey;

    registerRealtimeChannel(
      channelKey,
      supabase
        .channel(channelKey)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${currentUserId}`,
          },
          () => {
            void loadUnreadConversationCounts();
          }
        )
        .subscribe()
    );

    return () => {
      if (notificationRealtimeChannelKeyRef.current === channelKey) {
        notificationRealtimeChannelKeyRef.current = null;
      }
      void removeRealtimeChannel(channelKey);
    };
  }, [currentUserId, loadUnreadConversationCounts]);

    useEffect(() => {
    if (!selectedConversationId || !currentUserId) {
      setTypingUsers([]);
      return;
    }

    const channel = supabase
      .channel(`chat-typing:${selectedConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_typing_status",
          filter: `group_id=eq.${selectedConversationId}`,
        },
        (payload) => {
          const eventType = payload.eventType;
          const newRow = payload.new as
            | { user_id?: string; expires_at?: string }
            | undefined;
          const oldRow = payload.old as { user_id?: string } | undefined;

          const affectedUserId =
            String(newRow?.user_id || oldRow?.user_id || "").trim();

          if (!affectedUserId || affectedUserId === currentUserId) {
            return;
          }

          if (eventType === "DELETE") {
            setTypingUsers((prev) =>
              prev.filter((userId) => userId !== affectedUserId)
            );
            return;
          }

          const expiresAt = newRow?.expires_at
            ? new Date(newRow.expires_at).getTime()
            : 0;

          if (expiresAt && expiresAt <= Date.now()) {
            setTypingUsers((prev) =>
              prev.filter((userId) => userId !== affectedUserId)
            );
            return;
          }

          setTypingUsers((prev) =>
            prev.includes(affectedUserId)
              ? prev
              : [...prev, affectedUserId]
          );
        }
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
    }, [selectedConversationId, currentUserId]);

     useEffect(() => {
    if (!selectedConversationId) return;

    const channel = supabase
      .channel(`chat-reactions:${selectedConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_message_reactions",
          filter: `group_id=eq.${selectedConversationId}`,
        },
        async (payload) => {
          try {
            const messageId =
              (payload.new as { message_id?: string } | null)?.message_id ||
              (payload.old as { message_id?: string } | null)?.message_id;

            if (!messageId) return;

            const { data, error } = await supabase
              .from("chat_messages")
              .select(`
                id,
                group_id,
                user_id,
                content,
                created_at,
                attachments:chat_attachments(*),
                reads:chat_message_reads(*),
                reactions:chat_message_reactions(*)
              `)
              .eq("id", messageId)
              .single();

            if (error || !data) return;

            updateMessageLocally(selectedConversationId, data as ChatMessageRow);
          } catch (err) {
            console.error("Reaction realtime error:", err);
          }
        }
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, [selectedConversationId, updateMessageLocally]);

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

    const typingLabel = useMemo(() => {
  const names = typingUsers
    .map((userId) =>
      profiles.find((profile) => profile.user_id === userId)?.full_name
    )
    .filter(Boolean) as string[];

  if (names.length === 0) return "";

  if (names.length === 1) {
    return t("chat.typing.single", undefined, { name: names[0] });
  }

  if (names.length === 2) {
    return t("chat.typing.double", undefined, {
      name1: names[0],
      name2: names[1],
    });
  }

  return t("chat.typing.multiple");
}, [profiles, typingUsers, t]);

    const canManageMessage = useCallback(
    (message: ChatMessageRow) => {
      if (!currentUserId) return false;
      return currentUserRole === "admin" || message.user_id === currentUserId;
    },
    [currentUserId, currentUserRole]
  );

  const canDeleteChat = useCallback(
    (group: ChatGroupRow) => {
      if (!currentUserId) return false;

      if (currentUserRole === "admin") {
        return true;
      }

      if (group.type === "DIRECT") {
        return getMembers(group.id).some(
          (member) => member.user_id === currentUserId
        );
      }

      return group.created_by === currentUserId;
    },
    [currentUserId, currentUserRole, getMembers]
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
    setUnreadCounts((prev) => ({
      ...prev,
      [groupId]: 0,
    }));
    navigate(`/chat/${groupId}`);

    if (!messages[groupId]) {
      void loadMessagesForGroup(groupId);
    }
  },
  [loadMessagesForGroup, messages, navigate, setSelectedConversationId]
);

    const setTypingState = useCallback(
    async (groupId: string, isTyping: boolean) => {
      try {
        await supabase.functions.invoke("chat-set-typing", {
          body: {
            groupId,
            isTyping,
          },
        });
      } catch {}
    },
    []
  );

  const handleMessageInputChange = (value: string) => {
    setMessageInput(value);

    if (selectedConversationId) {
      void setTypingState(selectedConversationId, value.trim().length > 0);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        void setTypingState(selectedConversationId, false);
      }, 3000);
    }

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

const handleUploadFile = async (file: File) => {
  if (!selectedConversationId || !currentUserId) return;

  setIsUploadingFile(true);
  setError("");

  try {
    const fileExt = file.name.split(".").pop();
    const safeExt = fileExt ? `.${fileExt}` : "";
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${safeExt}`;
    const filePath = `${selectedConversationId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("chat-files")
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data, error: functionError } = await supabase.functions.invoke(
      "chat-upload-attachment",
      {
        body: {
          groupId: selectedConversationId,
          fileName: file.name,
          filePath,
          mimeType: file.type || null,
          fileSize: file.size,
        },
      }
    );

    const message = data?.message;

    if (functionError || !message) {
      throw new Error(functionError?.message || "Upload failed");
    }

    const optimisticAttachmentMessage: ChatMessageRow = {
      id: message.id,
      group_id: selectedConversationId,
      user_id: currentUserId,
      content: "",
      created_at: clock.nowIso,
      attachments: [
        {
          id: `local-${message.id}`,
          message_id: message.id,
          group_id: selectedConversationId,
          uploaded_by: currentUserId,
          file_name: file.name,
          file_path: filePath,
          mime_type: file.type || null,
          file_size: file.size,
          created_at: clock.nowIso,
        },
      ],
    };

    appendMessageLocally(selectedConversationId, optimisticAttachmentMessage);

    setLatestMessageByGroup((prev) => ({
      ...prev,
      [selectedConversationId]: optimisticAttachmentMessage,
    }));

    moveGroupToTop(selectedConversationId);

    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  } catch (err: any) {
    console.error(err);
    setError(err?.message || t("chat.errors.uploadFailed", "Upload failed"));
  } finally {
    setIsUploadingFile(false);
  }
};

  const toggleGroupMember = (userId: string) => {
    setSelectedGroupMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

const startDirectMessage = async (targetUserId: string) => {
 const session = await supabase.auth.getSession();
const user = session.data.session?.user;

  if (!user) return;

  const currentUserId = user.id;

  setError("");

const existingLocal = groups.find((group) => {
  if (group.type !== "DIRECT") return false;

  const members = getMembers(group.id).map((member) => member.user_id);
  return (
    members.includes(currentUserId) &&
    members.includes(targetUserId) &&
    members.length === 2
  );
});

if (existingLocal) {
  openConversation(existingLocal.id);
  await reloadChatShell(existingLocal.id);
  return;
}

  const { data, error: functionError } = await supabase.functions.invoke(
    "chat-create",
    {
      body: {
        mode: "DIRECT",
        targetUserId,
      },
    }
  );

  if (functionError || !data?.success || !data?.group) {
    setError(
      functionError?.message ||
        data?.error ||
        t("chat.errors.createDirectChat")
    );
    return;
  }

  const resolvedGroup = data.group as ChatGroupRow;

  const optimisticMembers: ChatGroupMemberRow[] = [
    {
      id: `local-${resolvedGroup.id}-${currentUserId}`,
      group_id: resolvedGroup.id,
      user_id: currentUserId,
      role: "member",
      invited_by: currentUserId,
      created_at: clock.nowIso,
    },
    {
      id: `local-${resolvedGroup.id}-${targetUserId}`,
      group_id: resolvedGroup.id,
      user_id: targetUserId,
      role: "member",
      invited_by: currentUserId,
      created_at: clock.nowIso,
    },
  ];

  upsertGroupLocally(resolvedGroup, optimisticMembers);
  openConversation(resolvedGroup.id);
  await reloadChatShell(resolvedGroup.id);
};

  const handleCreateGroup = async () => {
  const session = await supabase.auth.getSession();
const user = session.data.session?.user;

  if (!user) return;

  const currentUserId = user.id;

    if (!groupName.trim()) {
  setError(t("chat.errors.groupNameRequired"));
  setIsCreateGroupOpen(true); // keep dialog open so user sees issue
  return;
}

    if (selectedGroupMembers.length === 0) {
  setError(t("chat.errors.selectAtLeastOneMember"));
  setIsCreateGroupOpen(true);
  return;
}

    setIsCreatingGroup(true);
    setError("");

const { data, error: functionError } = await supabase.functions.invoke("chat-create", {
  body: {
    mode: "GROUP",
    groupName: groupName.trim(),
    memberIds: selectedGroupMembers,
  },
});

if (functionError || !data?.success || !data?.group) {
  setError(functionError?.message || data?.error || t("chat.errors.createGroupChat"));
  setIsCreatingGroup(false);
  return;
}

const newGroup = data.group as ChatGroupRow;

const optimisticMembers: ChatGroupMemberRow[] = [
  {
    id: `local-${newGroup.id}-${currentUserId}`,
    group_id: newGroup.id,
    user_id: currentUserId,
    role: "owner",
    invited_by: currentUserId,
    created_at: clock.nowIso,
  },
  ...selectedGroupMembers.map((userId) => ({
    id: `local-${newGroup.id}-${userId}`,
    group_id: newGroup.id,
    user_id: userId,
    role: "member" as const,
    invited_by: currentUserId,
    created_at: clock.nowIso,
  })),
];

upsertGroupLocally(newGroup, optimisticMembers);
openConversation(newGroup.id);

setGroupName("");
setSelectedGroupMembers([]);
setIsCreateGroupOpen(false);
setIsCreatingGroup(false);

await reloadChatShell(newGroup.id);
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversationId || !currentUserId || !selectedConversation) {
      return;
    }

    const contentToSend = messageInput.trim();
    const tempId = `temp-${clock.nowMs}`;

        const optimisticMessage: ChatMessageRow = {
      id: tempId,
      group_id: selectedConversationId,
      user_id: currentUserId,
      content: contentToSend,
      created_at: clock.nowIso,
    };

    appendMessageLocally(selectedConversationId, optimisticMessage);
    setLatestMessageByGroup((prev) => ({
  ...prev,
  [selectedConversationId]: optimisticMessage,
}));
    moveGroupToTop(selectedConversationId);

       setMessageInput("");
    setMentionQuery("");
    setShowMentionDropdown(false);
    setIsSending(true);
    setError("");

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    void setTypingState(selectedConversationId, false);

    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });

        const mentionedUserIds = extractMentionedUserIds(
      contentToSend,
      mentionCandidates.map((profile) => ({
        user_id: profile.user_id,
        full_name: profile.full_name,
      }))
    ).filter((userId) => userId !== currentUserId);

   const { data, error: sendError } = await supabase.functions.invoke(
  "chat-send-message",
  {
    body: {
      groupId: selectedConversationId,
      content: contentToSend,
      mentionedUserIds,
    },
  }
);

const insertedMessage = data?.message;

    if (sendError || !insertedMessage) {
      deleteMessageLocally(selectedConversationId, tempId);
      setMessageInput(contentToSend);
      setError(sendError?.message || t("chat.errors.sendMessage"));
      setIsSending(false);
      return;
    }

        replaceTempMessageWithRealOne(
      selectedConversationId,
      insertedMessage as ChatMessageRow
    );
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

    const { data, error: updateError } = await supabase.functions.invoke(
  "chat-update-message",
  {
    body: {
      messageId: message.id,
      content: editingMessageText.trim(),
    },
  }
);

const updatedMessage = data?.message;

    if (updateError) {
      setError(updateError.message || t("chat.errors.updateMessage"));
      setMessageActionLoading(null);
      return;
    }

    updateMessageLocally(message.group_id, updatedMessage);

    setEditingMessageId(null);
    setEditingMessageText("");
    setMessageActionLoading(null);
  };

  const handleDeleteMessage = async (message: ChatMessageRow) => {
    const confirmed = window.confirm(t("chat.confirms.deleteMessage"));
    if (!confirmed) return;

    setMessageActionLoading(message.id);
    setError("");

    const { error: deleteError } = await supabase.functions.invoke(
  "chat-delete-messages",
  {
    body: {
      messageIds: [message.id],
    },
  }
);

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

     const handleToggleReaction = async (
    messageId: string,
    emoji: string
  ) => {
    if (!selectedConversationId || !currentUserId) return;

    const targetMessage = selectedMessages.find(
      (message) => message.id === messageId
    );

    if (!targetMessage) return;

    const existingReaction = (targetMessage.reactions || []).find(
      (reaction) =>
        reaction.user_id === currentUserId && reaction.emoji === emoji
    );

    const nextReactions = existingReaction
      ? (targetMessage.reactions || []).filter(
          (reaction) =>
            !(
              reaction.user_id === currentUserId &&
              reaction.emoji === emoji
            )
        )
      : [
          ...(targetMessage.reactions || []),
          {
            id: `temp-reaction-${Date.now()}`,
            message_id: messageId,
            group_id: selectedConversationId,
            user_id: currentUserId,
            emoji,
            created_at: new Date().toISOString(),
          },
        ];

    updateMessageLocally(selectedConversationId, {
      ...targetMessage,
      reactions: nextReactions,
    });

    try {
      const { data, error } = await supabase.functions.invoke(
        "chat-toggle-reaction",
        {
          body: {
            messageId,
            emoji,
          },
        }
      );

      if (error || !data?.success) {
        updateMessageLocally(selectedConversationId, targetMessage);
      }
    } catch {
      updateMessageLocally(selectedConversationId, targetMessage);
    }
  };

  useEffect(() => {
    if (!selectedConversationId || !currentUserId) return;
    if (selectedMessages.length === 0) return;

    const unreadIncomingIds = selectedMessages
      .filter((message) => message.user_id !== currentUserId)
      .filter(
        (message) =>
          !(message.reads || []).some(
            (read) => read.user_id === currentUserId
          )
      )
      .map((message) => message.id);

    if (unreadIncomingIds.length === 0) return;

    void supabase.functions.invoke("chat-mark-read", {
      body: {
        groupId: selectedConversationId,
        messageIds: unreadIncomingIds,
      },
    });
  }, [selectedConversationId, currentUserId, selectedMessages]);

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

    const { error: deleteError } = await supabase.functions.invoke(
  "chat-delete-messages",
  {
    body: {
      messageIds: idsToDelete,
    },
  }
);

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

const handleAddParticipant = async (userId: string) => {
  if (!selectedConversation || !currentUserId) return;
  if (selectedConversation.type !== "GROUP") return;

  const isMember = getMembers(selectedConversation.id).some(
    (member) => member.user_id === currentUserId
  );

  const canAdd =
    currentUserRole === "admin" ||
    selectedConversation.created_by === currentUserId ||
    isMember;

  if (!canAdd) {
    setError("Not authorized to add participants.");
    return;
  }

  setMemberActionLoading("add");
  setError("");

  const { data, error: functionError } = await supabase.functions.invoke(
    "chat-update-members",
    {
      body: {
        groupId: selectedConversation.id,
        action: "add",
        userId,
      },
    }
  );

  if (functionError || !data?.success) {
    setError(functionError?.message || data?.error || "Failed to add participant.");
    setMemberActionLoading(null);
    return;
  }

  setMemberActionLoading(null);
  await reloadChatShell(selectedConversation.id);
};

const handleRemoveParticipant = async (member: ChatGroupMemberRow) => {
  if (!selectedConversation || !currentUserId) return;
  if (selectedConversation.type !== "GROUP") return;

  const isAdmin = currentUserRole === "admin";
  const isCreator = selectedConversation.created_by === currentUserId;
  const canRemoveOwnInvite = member.invited_by === currentUserId;

  if (member.user_id === selectedConversation.created_by) {
    setError("Cannot remove the group creator.");
    return;
  }

  if (!isAdmin && !isCreator && !canRemoveOwnInvite) {
    setError("Not authorized to remove this participant.");
    return;
  }

  setMemberActionLoading(member.id);
  setError("");

  const { data, error: functionError } = await supabase.functions.invoke(
    "chat-update-members",
    {
      body: {
        groupId: selectedConversation.id,
        action: "remove",
        userId: member.user_id,
      },
    }
  );

  if (functionError || !data?.success) {
    setError(functionError?.message || data?.error || "Failed to remove participant.");
    setMemberActionLoading(null);
    return;
  }

  setMemberActionLoading(null);
  await reloadChatShell(selectedConversation.id);
};

   const handleDeleteChat = async (group: ChatGroupRow) => {
  if (!canDeleteChat(group)) {
    setError(t("chat.errors.notAuthorized", "Not authorized"));
    return;
  }

  const confirmed = window.confirm(t("chat.confirms.deleteChat"));
  if (!confirmed) return;

  setGroupActionLoading(group.id);
  setError("");

  const { data, error: functionError } = await supabase.functions.invoke(
    "chat-delete-group",
    {
      body: {
        groupId: group.id,
      },
    }
  );

  if (functionError || !data?.success) {
    setError(functionError?.message || data?.error || t("chat.errors.deleteChat"));
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

    useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, []);

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
  unreadCounts={unreadCounts}
  latestMessageByGroup={latestMessageByGroup}
  onSearchChange={setSearchQuery}
  onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
  onOpenConversation={openConversation}
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
  messageSearchQuery={messageSearchQuery}
  onMessageSearchChange={setMessageSearchQuery}
  isParticipantsPanelOpen={isParticipantsPanelOpen}
  onToggleParticipantsPanel={() =>
    setIsParticipantsPanelOpen((prev) => !prev)
  }
/>

            <GroupParticipantsPanel
  open={isParticipantsPanelOpen}
  group={selectedConversation}
  currentUserId={currentUserId}
  currentUserRole={currentUserRole}
  profiles={profiles}
  groupMembers={groupMembers}
  onlineUsers={onlineUsers}
  onAddParticipant={(userId) => void handleAddParticipant(userId)}
  onRemoveParticipant={(member) => void handleRemoveParticipant(member)}
  memberActionLoading={memberActionLoading}
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
  messageSearchQuery={messageSearchQuery}
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
                onToggleReaction={(messageId, emoji) =>
    handleToggleReaction(messageId, emoji)
  }
/>

                       <div className="px-4 py-2 space-y-1">
              <div className="text-xs text-slate-500">
                {isLoadingMessages && !messages[selectedConversation.id]
                  ? t("chat.status.openingConversation")
                  : t("chat.status.loadedMessages", undefined, {
                      total: selectedMessages.length,
                    })}
              </div>

              {typingLabel ? (
                <div className="text-xs text-indigo-300">
                  {typingLabel}
                </div>
              ) : null}
            </div>

            <MessageComposer
  messageInput={messageInput}
  isSending={isSending}
  isUploadingFile={isUploadingFile}
  showMentionDropdown={showMentionDropdown}
  filteredMentionCandidates={filteredMentionCandidates}
  onChange={handleMessageInputChange}
  onSend={() => void handleSendMessage()}
  onInsertMention={insertMention}
  onUploadFile={(file) => void handleUploadFile(file)}
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

 <TeamMembersSidebar
  profiles={profiles}
  currentUserId={currentUserId}
  onlineUsers={onlineUsers}
  onStartDM={(userId) => void startDirectMessage(userId)}
/>
      </div>

      <CreateGroupDialog
  open={isCreateGroupOpen}
  currentUserId={currentUserId}
  groupName={groupName}
  selectedGroupMembers={selectedGroupMembers}
  profiles={profiles}
  isCreatingGroup={isCreatingGroup}
  error={isCreateGroupOpen ? error : ""}
  onOpenChange={(open) => {
    setIsCreateGroupOpen(open);
    if (open) {
      setError("");
    }
  }}
  onGroupNameChange={(value) => {
    setGroupName(value);
    if (error) {
      setError("");
    }
  }}
  onToggleMember={(userId) => {
    toggleGroupMember(userId);
    if (error) {
      setError("");
    }
  }}
  onCreate={() => void handleCreateGroup()}
  onCancel={() => {
    setIsCreateGroupOpen(false);
    setGroupName("");
    setSelectedGroupMembers([]);
    setError("");
  }}
/>
    </>
  );
}
