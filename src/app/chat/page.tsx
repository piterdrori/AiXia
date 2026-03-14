import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format, isToday, isYesterday } from "date-fns";
import {
  Search,
  Send,
  FolderKanban,
  MessageSquare,
  Users,
  CheckSquare,
  Plus,
  Trash2,
  Save,
  X,
  Check,
  Square,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import {
  createNotification,
  extractMentionedUserIds,
} from "@/lib/notifications";
import { createRequestTracker } from "@/lib/safeAsync";
import {
  registerRealtimeChannel,
  removeRealtimeChannel,
} from "@/lib/realtime";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

type Role = "admin" | "manager" | "employee" | "guest";
type ChatGroupType = "DIRECT" | "GROUP" | "PROJECT" | "TASK";

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  role: Role;
  status: "active" | "pending" | "inactive" | "denied";
};

type ChatGroupRow = {
  id: string;
  name: string | null;
  type: ChatGroupType;
  project_id: string | null;
  task_id: string | null;
  created_by: string | null;
  created_at: string;
  direct_key?: string | null;
};

type ChatGroupMemberRow = {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  created_at: string;
};

type ChatMessageRow = {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

type MessagesByGroup = Record<string, ChatMessageRow[]>;
type HasMoreByGroup = Record<string, boolean>;

const PAGE_SIZE = 20;
const NEAR_BOTTOM_PX = 120;

function buildDirectKey(a: string, b: string) {
  return [a, b].sort().join("__");
}

function sortMessagesAscending(items: ChatMessageRow[]) {
  return [...items].sort((a, b) => {
    const timeDiff =
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime();

    if (timeDiff !== 0) return timeDiff;
    return a.id.localeCompare(b.id);
  });
}

function dedupeMessages(items: ChatMessageRow[]) {
  const map = new Map<string, ChatMessageRow>();

  for (const item of items) {
    map.set(item.id, item);
  }

  return sortMessagesAscending(Array.from(map.values()));
}

function formatMessageTime(value: string) {
  const date = new Date(value);

  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return `Yesterday ${format(date, "h:mm a")}`;
  return format(date, "MMM d, h:mm a");
}

export default function ChatPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const requestTracker = useRef(createRequestTracker());

  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const selectedConversationIdRef = useRef<string | null>(null);
  const suppressNextAutoScrollRef = useRef(false);
  const shouldScrollToBottomRef = useRef(false);
  const isMountedRef = useRef(true);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);

  const [groups, setGroups] = useState<ChatGroupRow[]>([]);
  const [groupMembers, setGroupMembers] = useState<ChatGroupMemberRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [messages, setMessages] = useState<MessagesByGroup>({});
  const [hasMoreMessages, setHasMoreMessages] = useState<HasMoreByGroup>({});

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    id || null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

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
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  const selectedConversation = selectedConversationId
    ? groups.find((group) => group.id === selectedConversationId) || null
    : null;

  const conversationMessages = selectedConversationId
    ? messages[selectedConversationId] || []
    : [];

useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setIsSelectionMode(false);
    setSelectedMessageIds([]);
    setEditingMessageId(null);
    setEditingMessageText("");
  }, [selectedConversationId]);

  const getScrollViewport = useCallback(() => {
    if (!scrollAreaRef.current) return null;

    return scrollAreaRef.current.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLDivElement | null;
  }, []);

  const isViewportNearBottom = useCallback(() => {
    const viewport = getScrollViewport();
    if (!viewport) return true;

    const distanceFromBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;

    return distanceFromBottom <= NEAR_BOTTOM_PX;
  }, [getScrollViewport]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  const getMembersForGroup = useCallback(
    (groupId: string) => {
      return groupMembers.filter((member) => member.group_id === groupId);
    },
    [groupMembers]
  );

  const getProfileByUserId = useCallback(
    (userId: string) => {
      return profiles.find((profile) => profile.user_id === userId);
    },
    [profiles]
  );

  const canManageMessage = useCallback(
    (message: ChatMessageRow) => {
      if (!currentUserId) return false;
      return currentUserRole === "admin" || message.user_id === currentUserId;
    },
    [currentUserId, currentUserRole]
  );

  const getConversationName = useCallback(
    (group: ChatGroupRow) => {
      if (group.name) return group.name;

      const members = getMembersForGroup(group.id);

      if (group.type === "DIRECT") {
        const otherMember = members.find((member) => member.user_id !== currentUserId);
        const otherProfile = otherMember
          ? getProfileByUserId(otherMember.user_id)
          : null;

        return otherProfile?.full_name || "Direct Chat";
      }

      if (group.type === "PROJECT") return "Project Chat";
      if (group.type === "TASK") return "Task Chat";
      return "Group Chat";
    },
    [currentUserId, getMembersForGroup, getProfileByUserId]
  );

  const getConversationInitials = useCallback(
    (group: ChatGroupRow) => {
      const name = getConversationName(group);

      return name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    },
    [getConversationName]
  );

  const moveGroupToTop = useCallback((groupId: string) => {
    setGroups((prev) => {
      const index = prev.findIndex((group) => group.id === groupId);
      if (index <= 0) return prev;

      const next = [...prev];
      const [group] = next.splice(index, 1);
      next.unshift(group);
      return next;
    });
  }, []);

  const replaceTempMessageWithRealOne = useCallback(
    (groupId: string, realMessage: ChatMessageRow) => {
      setMessages((prev) => {
        const existing = prev[groupId] || [];

        const tempIndex = existing.findIndex((message) => {
          if (!message.id.startsWith("temp-")) return false;
          if (message.user_id !== realMessage.user_id) return false;
          if (message.group_id !== realMessage.group_id) return false;
          if (message.content !== realMessage.content) return false;

          const timeDiff = Math.abs(
            new Date(message.created_at).getTime() -
              new Date(realMessage.created_at).getTime()
          );

          return timeDiff < 30000;
        });

        if (tempIndex === -1) {
          const merged = dedupeMessages([...existing, realMessage]);
          return { ...prev, [groupId]: merged };
        }

        const next = [...existing];
        next[tempIndex] = realMessage;

        return {
          ...prev,
          [groupId]: dedupeMessages(next),
        };
      });
    },
    []
  );

  const appendMessageLocally = useCallback((groupId: string, message: ChatMessageRow) => {
    setMessages((prev) => {
      const current = prev[groupId] || [];
      const alreadyExists = current.some((item) => item.id === message.id);

      if (alreadyExists) return prev;

      return {
        ...prev,
        [groupId]: dedupeMessages([...current, message]),
      };
    });
  }, []);

  const updateMessageLocally = useCallback((groupId: string, message: ChatMessageRow) => {
    setMessages((prev) => {
      const current = prev[groupId] || [];
      const exists = current.some((item) => item.id === message.id);

      if (!exists) return prev;

      return {
        ...prev,
        [groupId]: current.map((item) => (item.id === message.id ? message : item)),
      };
    });
  }, []);

const deleteMessageLocally = useCallback((groupId: string, messageId: string) => {
    setMessages((prev) => ({
      ...prev,
      [groupId]: (prev[groupId] || []).filter((item) => item.id !== messageId),
    }));

    setSelectedMessageIds((prev) => prev.filter((id) => id !== messageId));
  }, []);

  const deleteMultipleMessagesLocally = useCallback(
    (groupId: string, messageIds: string[]) => {
      const idSet = new Set(messageIds);

      setMessages((prev) => ({
        ...prev,
        [groupId]: (prev[groupId] || []).filter((item) => !idSet.has(item.id)),
      }));

      setSelectedMessageIds((prev) => prev.filter((id) => !idSet.has(id)));
    },
    []
  );

  const loadMessagesForGroup = useCallback(async (groupId: string) => {
    const { data, error: messagesError } = await supabase
      .from("chat_messages")
      .select("id, group_id, user_id, content, created_at")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (messagesError) {
      throw new Error(messagesError.message || "Failed to load messages.");
    }

    const newestMessages = sortMessagesAscending((data || []) as ChatMessageRow[]);

    return {
      items: newestMessages,
      hasMore: (data || []).length === PAGE_SIZE,
    };
  }, []);

  const loadChatData = useCallback(
    async (preferredId?: string | null) => {
      const requestId = requestTracker.current.next();
      setError("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!isMountedRef.current || !requestTracker.current.isLatest(requestId)) return;

      if (authError || !user) {
        navigate("/login");
        return;
      }

      setCurrentUserId(user.id);

      const [{ data: myProfile }, { data: allProfiles, error: profilesError }] =
        await Promise.all([
          supabase.from("profiles").select("role").eq("user_id", user.id).single(),
          supabase
            .from("profiles")
            .select("user_id, full_name, role, status")
            .eq("status", "active")
            .order("full_name", { ascending: true }),
        ]);

      if (!isMountedRef.current || !requestTracker.current.isLatest(requestId)) return;

      if (profilesError) {
        setError(profilesError.message || "Failed to load users.");
        return;
      }

      const role = (myProfile?.role || "employee") as Role;
      setCurrentUserRole(role);

      const isAdmin = role === "admin";

      let groupsQuery = supabase
        .from("chat_groups")
        .select("id, name, type, project_id, task_id, created_by, created_at, direct_key")
        .order("created_at", { ascending: false });

      if (!isAdmin) {
        const { data: myMemberships, error: membershipsError } = await supabase
          .from("chat_group_members")
          .select("group_id")
          .eq("user_id", user.id);

        if (!isMountedRef.current || !requestTracker.current.isLatest(requestId)) return;

        if (membershipsError) {
          setError(membershipsError.message || "Failed to load memberships.");
          return;
        }

        const myGroupIds = Array.from(
          new Set((myMemberships || []).map((membership) => membership.group_id))
        );

        if (myGroupIds.length === 0) {
          setProfiles((allProfiles || []) as ProfileRow[]);
          setGroups([]);
          setGroupMembers([]);
          setMessages({});
          setHasMoreMessages({});
          setSelectedConversationId(null);
          return;
        }

        groupsQuery = groupsQuery.in("id", myGroupIds);
      }

      const { data: groupsData, error: groupsError } = await groupsQuery;

      if (!isMountedRef.current || !requestTracker.current.isLatest(requestId)) return;

      if (groupsError) {
        setError(groupsError.message || "Failed to load chat groups.");
        return;
      }

      const rawGroups = (groupsData || []) as ChatGroupRow[];
      const dedupedMap = new Map<string, ChatGroupRow>();

      for (const group of rawGroups) {
        const dedupeKey =
          group.type === "DIRECT" && group.direct_key
            ? `DIRECT:${group.direct_key}`
            : `GROUP:${group.id}`;

        if (!dedupedMap.has(dedupeKey)) {
          dedupedMap.set(dedupeKey, group);
        }
      }

      const loadedGroups = Array.from(dedupedMap.values());
      const visibleGroupIds = loadedGroups.map((group) => group.id);

      let membersQuery = supabase
        .from("chat_group_members")
        .select("id, group_id, user_id, role, created_at");

      if (visibleGroupIds.length > 0) {
        membersQuery = membersQuery.in("group_id", visibleGroupIds);
      }

      const { data: membersData, error: membersError } = await membersQuery;

      if (!isMountedRef.current || !requestTracker.current.isLatest(requestId)) return;

      if (membersError) {
        setError(membersError.message || "Failed to load group members.");
        return;
      }
const loadedMessages: MessagesByGroup = {};
      const loadedHasMore: HasMoreByGroup = {};

      for (const groupId of visibleGroupIds) {
        const result = await loadMessagesForGroup(groupId);

        if (!isMountedRef.current || !requestTracker.current.isLatest(requestId)) return;

        loadedMessages[groupId] = result.items;
        loadedHasMore[groupId] = result.hasMore;
      }

      setProfiles((allProfiles || []) as ProfileRow[]);
      setGroups(loadedGroups);
      setGroupMembers((membersData || []) as ChatGroupMemberRow[]);
      setMessages(loadedMessages);
      setHasMoreMessages(loadedHasMore);

      const requestedId = preferredId || id || null;

      if (requestedId && loadedGroups.some((group) => group.id === requestedId)) {
        setSelectedConversationId(requestedId);
        return;
      }

      if (loadedGroups.length > 0) {
        const firstGroupId = loadedGroups[0].id;
        setSelectedConversationId(firstGroupId);
        navigate(`/chat/${firstGroupId}`);
        return;
      }

      setSelectedConversationId(null);
    },
    [id, loadMessagesForGroup, navigate]
  );

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);

      try {
        await loadChatData(id || null);
      } catch (err) {
        console.error("Chat init error:", err);

        if (isMountedRef.current) {
          setError("Failed to load chat.");
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          shouldScrollToBottomRef.current = true;

          requestAnimationFrame(() => {
            scrollToBottom("auto");
          });
        }
      }
    };

    void init();
  }, [id, loadChatData, scrollToBottom]);

  useEffect(() => {
    if (!selectedConversationId) return;

    const channelKey = `chat:${selectedConversationId}`;

    registerRealtimeChannel(
      channelKey,
      supabase
        .channel(channelKey)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "chat_messages" },
          (payload) => {
            const changedGroupId = (payload.new as { group_id?: string } | null)?.group_id;
            const oldGroupId = (payload.old as { group_id?: string } | null)?.group_id;
            const targetGroupId = changedGroupId || oldGroupId;

            if (!targetGroupId) return;

            const isCurrentConversation =
              targetGroupId === selectedConversationIdRef.current;

            if (payload.eventType === "INSERT" && payload.new) {
              const newMessage = payload.new as ChatMessageRow;

              if (isCurrentConversation) {
                const shouldStayAtBottom = isViewportNearBottom();
                replaceTempMessageWithRealOne(targetGroupId, newMessage);

                if (shouldStayAtBottom) {
                  shouldScrollToBottomRef.current = true;
                }
              } else {
                appendMessageLocally(targetGroupId, newMessage);
              }

              moveGroupToTop(targetGroupId);
              return;
            }

            if (payload.eventType === "UPDATE" && payload.new) {
              updateMessageLocally(targetGroupId, payload.new as ChatMessageRow);
              return;
            }

            if (payload.eventType === "DELETE" && payload.old) {
              const deletedMessage = payload.old as ChatMessageRow;
              deleteMessageLocally(targetGroupId, deletedMessage.id);

              if (editingMessageId === deletedMessage.id) {
                setEditingMessageId(null);
                setEditingMessageText("");
              }
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "chat_groups" },
          () => {
            void loadChatData(selectedConversationIdRef.current);
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "chat_group_members" },
          () => {
            void loadChatData(selectedConversationIdRef.current);
          }
        )
        .subscribe()
    );

    return () => {
      void removeRealtimeChannel(channelKey);
    };
  }, [
    appendMessageLocally,
    deleteMessageLocally,
    editingMessageId,
    isViewportNearBottom,
    loadChatData,
    moveGroupToTop,
    replaceTempMessageWithRealOne,
    selectedConversationId,
    updateMessageLocally,
  ]);

  useEffect(() => {
    if (isLoading) return;
    if (suppressNextAutoScrollRef.current) {
      suppressNextAutoScrollRef.current = false;
      return;
    }
    if (!shouldScrollToBottomRef.current) return;

    shouldScrollToBottomRef.current = false;

    requestAnimationFrame(() => {
      scrollToBottom("smooth");
    });
  }, [conversationMessages.length, isLoading, scrollToBottom]);

  useEffect(() => {
    if (!selectedConversationId) return;
    shouldScrollToBottomRef.current = true;
  }, [selectedConversationId]);

  const filteredConversations = useMemo(() => {
    return groups.filter((group) =>
      getConversationName(group).toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [getConversationName, groups, searchQuery]);

  const directConversations = filteredConversations.filter(
    (group) => group.type === "DIRECT"
  );
  const projectConversations = filteredConversations.filter(
    (group) => group.type === "PROJECT"
  );
  const taskConversations = filteredConversations.filter(
    (group) => group.type === "TASK"
  );
  const groupConversations = filteredConversations.filter(
    (group) => group.type === "GROUP"
  );

  const mentionCandidates = useMemo(() => {
    if (!selectedConversationId) return [];

    const candidateIds = Array.from(
      new Set(getMembersForGroup(selectedConversationId).map((member) => member.user_id))
    );

    return candidateIds
      .map((userId) => profiles.find((profile) => profile.user_id === userId))
      .filter((profile): profile is ProfileRow => Boolean(profile))
      .filter((profile) => profile.user_id !== currentUserId);
  }, [currentUserId, getMembersForGroup, profiles, selectedConversationId]);

  const filteredMentionCandidates = useMemo(() => {
    if (!showMentionDropdown) return [];

    const query = mentionQuery.trim().toLowerCase();

    return mentionCandidates.filter((profile) => {
      const fullName = (profile.full_name || "").toLowerCase();
      return !query || fullName.includes(query);
    });
  }, [mentionCandidates, mentionQuery, showMentionDropdown]);

  const selectableMessages = useMemo(() => {
    return conversationMessages.filter((message) => canManageMessage(message));
  }, [canManageMessage, conversationMessages]);

  const allSelectableIds = selectableMessages.map((message) => message.id);
  const allSelected =
    allSelectableIds.length > 0 &&
    allSelectableIds.every((messageId) => selectedMessageIds.includes(messageId));

  const toggleSelectionMode = () => {
    const nextMode = !isSelectionMode;
    setIsSelectionMode(nextMode);

    if (!nextMode) {
      setSelectedMessageIds([]);
    }
  };

  const toggleMessageSelection = (message: ChatMessageRow) => {
    if (!canManageMessage(message)) return;

    setSelectedMessageIds((prev) =>
      prev.includes(message.id)
        ? prev.filter((id) => id !== message.id)
        : [...prev, message.id]
    );
  };

  const handleSelectAllVisible = () => {
    if (allSelected) {
      setSelectedMessageIds([]);
      return;
    }

    setSelectedMessageIds(allSelectableIds);
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

  const canDeleteChat = (group: ChatGroupRow) => {
    if (!currentUserId) return false;
    return currentUserRole === "admin" || group.created_by === currentUserId;
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
    shouldScrollToBottomRef.current = true;

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

    const recipientMembers = getMembersForGroup(selectedConversationId).filter(
      (member) => member.user_id !== currentUserId && !mentionedSet.has(member.user_id)
    );

    for (const member of recipientMembers) {
      await createNotification({
        userId: member.user_id,
        actorUserId: currentUserId,
        type: "MESSAGE",
        title: `New message in ${getConversationName(selectedConversation)}`,
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
        message: `You were mentioned in ${getConversationName(selectedConversation)}`,
        link: `/chat/${selectedConversationId}`,
        entityType: "chat_message",
        entityId: insertedMessage.id,
      });
    }

    setIsSending(false);
  };

  const handleLoadOlderMessages = async () => {
    if (!selectedConversationId) return;

    const currentMessages = messages[selectedConversationId] || [];
    if (currentMessages.length === 0) return;

    const oldestMessage = currentMessages[0];
    if (!oldestMessage) return;

    const viewport = getScrollViewport();
    const previousScrollHeight = viewport?.scrollHeight || 0;
    const previousScrollTop = viewport?.scrollTop || 0;

    setIsLoadingOlder(true);
    setError("");

    const { data: olderMessages, error: olderError } = await supabase
      .from("chat_messages")
      .select("id, group_id, user_id, content, created_at")
      .eq("group_id", selectedConversationId)
      .lt("created_at", oldestMessage.created_at)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (olderError) {
      setError(olderError.message || "Failed to load older messages.");
      setIsLoadingOlder(false);
      return;
    }

    const olderBatch = sortMessagesAscending((olderMessages || []) as ChatMessageRow[]);
    suppressNextAutoScrollRef.current = true;

    setMessages((prev) => ({
      ...prev,
      [selectedConversationId]: dedupeMessages([
        ...olderBatch,
        ...(prev[selectedConversationId] || []),
      ]),
    }));

    setHasMoreMessages((prev) => ({
      ...prev,
      [selectedConversationId]: (olderMessages || []).length === PAGE_SIZE,
    }));

    setIsLoadingOlder(false);

    requestAnimationFrame(() => {
      const nextViewport = getScrollViewport();
      if (!nextViewport) return;

      const newScrollHeight = nextViewport.scrollHeight;
      const heightDiff = newScrollHeight - previousScrollHeight;
      nextViewport.scrollTop = previousScrollTop + heightDiff;
    });
  };

  const startDirectMessage = async (targetUserId: string) => {
    if (!currentUserId) return;

    const directKey = buildDirectKey(currentUserId, targetUserId);

    const existingLocal = groups.find(
      (group) => group.type === "DIRECT" && group.direct_key === directKey
    );

    if (existingLocal) {
      setSelectedConversationId(existingLocal.id);
      navigate(`/chat/${existingLocal.id}`);
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
      await loadChatData(existingDb.id);
      setSelectedConversationId(existingDb.id);
      navigate(`/chat/${existingDb.id}`);
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

    await loadChatData(newGroup.id);
    setSelectedConversationId(newGroup.id);
    navigate(`/chat/${newGroup.id}`);
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

    await loadChatData(newGroup.id);
    setSelectedConversationId(newGroup.id);
    navigate(`/chat/${newGroup.id}`);
  };

  const toggleGroupMember = (userId: string) => {
    setSelectedGroupMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
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

    await loadChatData(null);
    setGroupActionLoading(null);
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

  const handleBulkDeleteMessages = async () => {
    if (!selectedConversationId || selectedMessageIds.length === 0) return;

    const allowedIds = new Set(
      conversationMessages
        .filter((message) => selectedMessageIds.includes(message.id))
        .filter((message) => canManageMessage(message))
        .map((message) => message.id)
    );

    const idsToDelete = selectedMessageIds.filter((id) => allowedIds.has(id));

    if (idsToDelete.length === 0) {
      setError("No deletable messages selected.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${idsToDelete.length} selected message(s)?`
    );
    if (!confirmed) return;

    setBulkDeleteLoading(true);
    setError("");

    const { error: deleteError } = await supabase
      .from("chat_messages")
      .delete()
      .in("id", idsToDelete);

    if (deleteError) {
      setError(deleteError.message || "Failed to delete selected messages.");
      setBulkDeleteLoading(false);
      return;
    }

    deleteMultipleMessagesLocally(selectedConversationId, idsToDelete);

    if (editingMessageId && idsToDelete.includes(editingMessageId)) {
      setEditingMessageId(null);
      setEditingMessageText("");
    }

    setIsSelectionMode(false);
    setSelectedMessageIds([]);
    setBulkDeleteLoading(false);
  };

  const renderConversationButton = (
    group: ChatGroupRow,
    iconType?: "project" | "task" | "group"
  ) => {
    return (
      <div
        key={group.id}
        className={`w-full rounded-lg transition-all ${
          selectedConversationId === group.id
            ? "bg-indigo-600/20 border border-indigo-500/30"
            : "hover:bg-slate-800/50"
        }`}
      >
        <div className="flex items-center gap-3 p-3">
          <button
            onClick={() => {
              setSelectedConversationId(group.id);
              navigate(`/chat/${group.id}`);
            }}
            className="flex items-center gap-3 flex-1 text-left min-w-0"
          >
            {iconType ? (
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                {iconType === "project" && <FolderKanban className="w-5 h-5 text-indigo-400" />}
                {iconType === "task" && <CheckSquare className="w-5 h-5 text-indigo-400" />}
                {iconType === "group" && <Users className="w-5 h-5 text-indigo-400" />}
              </div>
            ) : (
              <Avatar className="w-10 h-10 shrink-0">
                <AvatarFallback className="bg-indigo-600 text-white">
                  {getConversationInitials(group)}
                </AvatarFallback>
              </Avatar>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">
                {getConversationName(group)}
              </p>
              <p className="text-slate-500 text-xs">
                {getMembersForGroup(group.id).length} participants
              </p>
            </div>
          </button>

          {canDeleteChat(group) && (
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-red-400 shrink-0"
              onClick={() => void handleDeleteChat(group)}
              disabled={groupActionLoading === group.id}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-140px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  return (
    <>
      <div className="h-[calc(100vh-140px)] flex gap-4 overflow-hidden min-h-0">
        <Card className="w-80 bg-slate-900/50 border-slate-800 flex flex-col h-full overflow-hidden min-h-0 shrink-0">
          <CardContent className="p-4 flex flex-col h-full min-h-0">
            <div className="relative mb-4 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600"
              />
            </div>

            <div className="mb-3 shrink-0">
              <Button
                onClick={() => setIsCreateGroupOpen(true)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Group Chat
              </Button>
            </div>

            {error && (
              <div className="mb-3 rounded-md border border-red-800 bg-red-900/20 px-3 py-2 text-sm text-red-300 shrink-0">
                {error}
              </div>
            )}

            <ScrollArea className="flex-1 min-h-0 -mx-2">
              <div className="space-y-1 px-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-medium text-slate-500 uppercase">
                    Direct Messages
                  </h3>
                </div>

                {directConversations.map((group) => renderConversationButton(group))}

                {projectConversations.length > 0 && (
                  <>
                    <Separator className="my-3 bg-slate-800" />
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-medium text-slate-500 uppercase">
                        Project Chats
                      </h3>
                    </div>
                    {projectConversations.map((group) =>
                      renderConversationButton(group, "project")
                    )}
                  </>
                )}

                {taskConversations.length > 0 && (
                  <>
                    <Separator className="my-3 bg-slate-800" />
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-medium text-slate-500 uppercase">
                        Task Chats
                      </h3>
                    </div>
                    {taskConversations.map((group) => renderConversationButton(group, "task"))}
                  </>
                )}

                {groupConversations.length > 0 && (
                  <>
                    <Separator className="my-3 bg-slate-800" />
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-medium text-slate-500 uppercase">
                        Group Chats
                      </h3>
                    </div>
                    {groupConversations.map((group) => renderConversationButton(group, "group"))}
                  </>
                )}

                <Separator className="my-3 bg-slate-800" />
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-medium text-slate-500 uppercase">
                    Team Members
                  </h3>
                </div>

                {profiles
                  .filter((user) => user.user_id !== currentUserId && user.status === "active")
                  .map((user) => (
                    <button
                      key={user.user_id}
                      onClick={() => void startDirectMessage(user.user_id)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800/50 transition-all"
                    >
                      <Avatar className="w-10 h-10 shrink-0">
                        <AvatarFallback className="bg-indigo-600 text-white">
                          {(user.full_name || "U")
                            .split(" ")
                            .map((part) => part[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 text-left min-w-0">
                        <p className="text-white font-medium text-sm truncate">
                          {user.full_name || "Unknown"}
                        </p>
                        <p className="text-slate-500 text-xs">{user.role}</p>
                      </div>

                      <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    </button>
                  ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {selectedConversation ? (
          <Card className="flex-1 bg-slate-900/50 border-slate-800 flex flex-col h-full overflow-hidden min-h-0">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="w-10 h-10 shrink-0">
                  <AvatarFallback className="bg-indigo-600 text-white">
                    {getConversationInitials(selectedConversation)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                  <h3 className="text-white font-medium truncate">
                    {getConversationName(selectedConversation)}
                  </h3>
                  <p className="text-slate-500 text-sm">
                    {getMembersForGroup(selectedConversation.id).length} participants
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-700 text-slate-200 hover:bg-slate-800"
                  onClick={toggleSelectionMode}
                >
                  {isSelectionMode ? (
                    <>
                      <X className="w-4 h-4 mr-2" />
                      Cancel Selection
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-4 h-4 mr-2" />
                      Select Messages
                    </>
                  )}
                </Button>
              </div>
            </div>

            {(isSelectionMode || selectedMessageIds.length > 0) && (
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-800 bg-slate-950/60 shrink-0">
                <div className="text-sm text-slate-300">
                  {selectedMessageIds.length} selected
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-700 text-slate-200 hover:bg-slate-800"
                    onClick={handleSelectAllVisible}
                  >
                   {allSelected ? (
                      <>
                        <Square className="w-4 h-4 mr-2" />
                        Clear All
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Select All
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
                    {bulkDeleteLoading ? "Deleting..." : "Delete Selected"}
                  </Button>
                </div>
              </div>
            )}

            <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0">
              <div className="px-4 py-4">
                <div className="flex justify-center mb-4">
                  {selectedConversationId ? (
                    hasMoreMessages[selectedConversationId] ? (
                      <Button
                        type="button"
                        onClick={() => void handleLoadOlderMessages()}
                        disabled={isLoadingOlder}
                        className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                      >
                        {isLoadingOlder ? "Loading older messages..." : "Load older messages"}
                      </Button>
                    ) : (
                      <div className="text-xs text-slate-500 px-3 py-1 rounded-md bg-slate-900/80 border border-slate-800">
                        Beginning of conversation
                      </div>
                    )
                  ) : null}
                </div>

                <div className="space-y-4 pt-2">
                  {conversationMessages.map((message, index) => {
                    const isOwn = message.user_id === currentUserId;
                    const user = getProfileByUserId(message.user_id);
                    const showAvatar =
                      index === 0 || conversationMessages[index - 1].user_id !== message.user_id;
                    const isEditing = editingMessageId === message.id;
                    const canSelect = canManageMessage(message);
                    const isSelected = selectedMessageIds.includes(message.id);

                    return (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
                      >
                        {isSelectionMode && (
                          <div
                            className={`pt-2 ${canSelect ? "" : "opacity-40"} ${
                              isOwn ? "order-3" : "order-1"
                            }`}
                          >
                            <Checkbox
                              checked={isSelected}
                              disabled={!canSelect}
                              onCheckedChange={() => toggleMessageSelection(message)}
                            />
                          </div>
                        )}

                        {showAvatar ? (
                          <Avatar className="w-8 h-8 flex-shrink-0">
                            <AvatarFallback className="bg-indigo-600 text-white text-xs">
                              {(user?.full_name || "U")
                                .split(" ")
                                .map((part) => part[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-8 flex-shrink-0" />
                        )}

                        <div className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
                          {showAvatar && (
                            <p className="text-xs text-slate-500 mb-1">
                              {user?.full_name || "Unknown"} • {formatMessageTime(message.created_at)}
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
                                  onChange={(e) => setEditingMessageText(e.target.value)}
                                  rows={3}
                                  className="bg-slate-900 border-slate-700 text-white resize-none"
                                />
                                <div className="flex items-center gap-2 justify-end">
                                  <Button
                                    size="sm"
                                    className="bg-white text-black hover:bg-slate-200"
                                    onClick={() => void handleSaveEditedMessage(message)}
                                    disabled={
                                      messageActionLoading === message.id ||
                                      !editingMessageText.trim()
                                    }
                                  >
                                    <Save className="w-3 h-3 mr-1" />
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-slate-500 text-white hover:bg-slate-700"
                                    onClick={cancelEditingMessage}
                                    disabled={messageActionLoading === message.id}
                                  >
                                    <X className="w-3 h-3 mr-1" />
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap break-words">{message.content}</p>
                            )}
                          </div>

                          {canManageMessage(message) && !isEditing && !isSelectionMode && (
                            <div
                              className={`mt-1 flex gap-2 ${
                                isOwn ? "justify-end" : "justify-start"
                              }`}
                            >
                              <button
                                className="text-xs text-slate-400 hover:text-white"
                                onClick={() => startEditingMessage(message)}
                                disabled={messageActionLoading === message.id}
                              >
                                Edit
                              </button>
                              <button
                                className="text-xs text-red-400 hover:text-red-300"
                                onClick={() => void handleDeleteMessage(message)}
                                disabled={messageActionLoading === message.id}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {conversationMessages.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="w-8 h-8 text-slate-500" />
                      </div>
                      <p className="text-slate-500">No messages yet</p>
                      <p className="text-slate-600 text-sm">Start the conversation!</p>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-slate-800 shrink-0">
              <div className="space-y-2">
                <div className="flex gap-2 items-end">
                  <Textarea
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => handleMessageInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleSendMessage();
                      }
                    }}
                    rows={2}
                    className="min-h-[44px] max-h-40 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 resize-none"
                  />
                  <Button
                    onClick={() => void handleSendMessage()}
                    disabled={isSending || !messageInput.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white h-11"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>

                {showMentionDropdown && (
                  <div className="rounded-lg border border-slate-800 bg-slate-900 shadow-lg overflow-hidden">
                    {filteredMentionCandidates.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-slate-500">
                        No matching participants
                      </div>
                    ) : (
                      filteredMentionCandidates.map((profile) => (
                        <button
                          key={profile.user_id}
                          type="button"
                          onClick={() => insertMention(profile.full_name || "")}
                          className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-800 transition-colors"
                        >
                          <div>
                            <div className="text-sm font-medium text-white">
                              {profile.full_name || "Unknown"}
                            </div>
                            <div className="text-xs text-slate-500">
                              {profile.role.toUpperCase()}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
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

      <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Group Chat</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-300 mb-2 block">Group Name</label>
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
                className="bg-slate-900 border-slate-800 text-white"
              />
            </div>

            <div>
              <label className="text-sm text-slate-300 mb-2 block">Select Members</label>
              <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900 p-2 space-y-2">
                {profiles
                  .filter((user) => user.user_id !== currentUserId && user.status === "active")
                  .map((user) => (
                    <label
                      key={user.user_id}
                      className="flex items-center justify-between gap-3 rounded-md px-3 py-2 hover:bg-slate-800 cursor-pointer"
                    >
                      <div>
                        <div className="text-white text-sm font-medium">
                          {user.full_name || "Unknown"}
                        </div>
                        <div className="text-slate-500 text-xs">{user.role}</div>
                      </div>

                      <Checkbox
                        checked={selectedGroupMembers.includes(user.user_id)}
                        onCheckedChange={() => toggleGroupMember(user.user_id)}
                      />
                    </label>
                  ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
                onClick={() => {
                  setIsCreateGroupOpen(false);
                  setGroupName("");
                  setSelectedGroupMembers([]);
                }}
              >
                Cancel
              </Button>

              <Button
                onClick={() => void handleCreateGroup()}
                disabled={isCreatingGroup}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isCreatingGroup ? "Creating..." : "Create Group"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
    
