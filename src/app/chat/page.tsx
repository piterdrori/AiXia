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
import { registerRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";

import { useChatBootstrap } from "./hooks/useChatBootstrap";
import type {
  ChatGroupMemberRow,
  ChatGroupRow,
  ChatMessageRow,
  ProfileRow,
} from "./types";

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

const PAGE_SIZE = 20;

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

  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return `Yesterday ${format(date, "HH:mm")}`;
  return format(date, "MMM d, HH:mm");
}

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
    isBootstrapping,
    error,
    setError,
    setSelectedConversationId,
    getMembersForGroup,
    getProfileByUserId,
    moveGroupToTop,
    upsertGroupLocally,
    removeGroupLocally,
    reloadChatShell,
  } = useChatBootstrap(id || null);

  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");

  const [messagesByGroup, setMessagesByGroup] = useState<Record<string, ChatMessageRow[]>>({});
  const [hasMoreByGroup, setHasMoreByGroup] = useState<Record<string, boolean>>({});
  const [loadingGroupId, setLoadingGroupId] = useState<string | null>(null);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
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

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const selectedConversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  const selectedConversation = selectedConversationId
    ? groups.find((group) => group.id === selectedConversationId) || null
    : null;

  const selectedMessages = selectedConversationId
    ? messagesByGroup[selectedConversationId] || []
    : [];

  useEffect(() => {
    if (!id) return;
    if (id === selectedConversationId) return;
    if (!groups.some((group) => group.id === id)) return;

    setSelectedConversationId(id);
  }, [id, groups, selectedConversationId, setSelectedConversationId]);

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
      return getConversationName(group)
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    },
    [getConversationName]
  );

  const loadMessagesForGroup = useCallback(
    async (groupId: string) => {
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

      setMessagesByGroup((prev) => ({ ...prev, [groupId]: newestMessages }));
      setHasMoreByGroup((prev) => ({
        ...prev,
        [groupId]: (data || []).length === PAGE_SIZE,
      }));
    },
    []
  );

  useEffect(() => {
    const loadSelectedConversation = async () => {
      if (!selectedConversationId) return;
      if (messagesByGroup[selectedConversationId]) return;

      setLoadingGroupId(selectedConversationId);

      try {
        await loadMessagesForGroup(selectedConversationId);
      } catch (err) {
        console.error("loadSelectedConversation error:", err);
        setError("Failed to load conversation.");
      } finally {
        setLoadingGroupId((prev) => (prev === selectedConversationId ? null : prev));
      }
    };

    void loadSelectedConversation();
  }, [loadMessagesForGroup, messagesByGroup, selectedConversationId, setError]);

  useEffect(() => {
    if (!selectedConversationId) return;

    const channelKey = `chat:${selectedConversationId}`;

    registerRealtimeChannel(
      channelKey,
      supabase
        .channel(channelKey)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "chat_messages",
            filter: `group_id=eq.${selectedConversationId}`,
          },
          async (payload) => {
            if (payload.eventType === "INSERT" && payload.new) {
              const message = payload.new as ChatMessageRow;

              setMessagesByGroup((prev) => ({
                ...prev,
                [selectedConversationId]: dedupeMessages([
                  ...(prev[selectedConversationId] || []),
                  message,
                ]),
              }));

              requestAnimationFrame(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              });
            }

            if (payload.eventType === "UPDATE" && payload.new) {
              const message = payload.new as ChatMessageRow;
              setMessagesByGroup((prev) => ({
                ...prev,
                [selectedConversationId]: (prev[selectedConversationId] || []).map((item) =>
                  item.id === message.id ? message : item
                ),
              }));
            }

            if (payload.eventType === "DELETE" && payload.old) {
              const message = payload.old as ChatMessageRow;
              setMessagesByGroup((prev) => ({
                ...prev,
                [selectedConversationId]: (prev[selectedConversationId] || []).filter(
                  (item) => item.id !== message.id
                ),
              }));
            }
          }
        )
        .subscribe()
    );

    return () => {
      void removeRealtimeChannel(channelKey);
    };
  }, [selectedConversationId]);

  const filteredConversations = useMemo(() => {
    return groups.filter((group) =>
      getConversationName(group).toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [getConversationName, groups, searchQuery]);

  const mentionCandidates = useMemo(() => {
    if (!selectedConversationId) return [];

    const ids = Array.from(
      new Set(getMembersForGroup(selectedConversationId).map((member) => member.user_id))
    );

    return ids
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

  const canManageMessage = useCallback(
    (message: ChatMessageRow) => {
      if (!currentUserId) return false;
      return currentUserRole === "admin" || message.user_id === currentUserId;
    },
    [currentUserId, currentUserRole]
  );

  const allSelectableIds = selectedMessages
    .filter((message) => canManageMessage(message))
    .map((message) => message.id);

  const allSelected =
    allSelectableIds.length > 0 &&
    allSelectableIds.every((messageId) => selectedMessageIds.includes(messageId));

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
      setError(groupError?.message || "Failed to create direct chat.");
      return;
    }

    const memberRows = [
      { group_id: newGroup.id, user_id: currentUserId, role: "member" },
      { group_id: newGroup.id, user_id: targetUserId, role: "member" },
    ];

    const { data: insertedMembers, error: memberInsertError } = await supabase
      .from("chat_group_members")
      .insert(memberRows)
      .select("id, group_id, user_id, role, created_at");

    if (memberInsertError) {
      setError(memberInsertError.message || "Failed to add direct chat members.");
      return;
    }

    upsertGroupLocally(newGroup as ChatGroupRow, (insertedMembers || []) as ChatGroupMemberRow[]);
    setMessagesByGroup((prev) => ({ ...prev, [newGroup.id]: [] }));
    openConversation(newGroup.id);
    void reloadChatShell(newGroup.id);
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

    const { data: insertedMembers, error: membersError } = await supabase
      .from("chat_group_members")
      .insert(memberRows)
      .select("id, group_id, user_id, role, created_at");

    if (membersError) {
      setError(membersError.message || "Failed to add group members.");
      setIsCreatingGroup(false);
      return;
    }

    upsertGroupLocally(newGroup as ChatGroupRow, (insertedMembers || []) as ChatGroupMemberRow[]);
    setMessagesByGroup((prev) => ({ ...prev, [newGroup.id]: [] }));
    setGroupName("");
    setSelectedGroupMembers([]);
    setIsCreateGroupOpen(false);
    setIsCreatingGroup(false);
    openConversation(newGroup.id);
    void reloadChatShell(newGroup.id);
  };
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
import { registerRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";

import { useChatBootstrap } from "./hooks/useChatBootstrap";
import type {
  ChatGroupMemberRow,
  ChatGroupRow,
  ChatMessageRow,
  ProfileRow,
} from "./types";

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

const PAGE_SIZE = 20;

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

  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return `Yesterday ${format(date, "HH:mm")}`;
  return format(date, "MMM d, HH:mm");
}

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
    isBootstrapping,
    error,
    setError,
    setSelectedConversationId,
    getMembersForGroup,
    getProfileByUserId,
    moveGroupToTop,
    upsertGroupLocally,
    removeGroupLocally,
    reloadChatShell,
  } = useChatBootstrap(id || null);

  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");

  const [messagesByGroup, setMessagesByGroup] = useState<Record<string, ChatMessageRow[]>>({});
  const [hasMoreByGroup, setHasMoreByGroup] = useState<Record<string, boolean>>({});
  const [loadingGroupId, setLoadingGroupId] = useState<string | null>(null);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
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

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const selectedConversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  const selectedConversation = selectedConversationId
    ? groups.find((group) => group.id === selectedConversationId) || null
    : null;

  const selectedMessages = selectedConversationId
    ? messagesByGroup[selectedConversationId] || []
    : [];

  useEffect(() => {
    if (!id) return;
    if (id === selectedConversationId) return;
    if (!groups.some((group) => group.id === id)) return;

    setSelectedConversationId(id);
  }, [id, groups, selectedConversationId, setSelectedConversationId]);

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
      return getConversationName(group)
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    },
    [getConversationName]
  );

  const loadMessagesForGroup = useCallback(
    async (groupId: string) => {
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

      setMessagesByGroup((prev) => ({ ...prev, [groupId]: newestMessages }));
      setHasMoreByGroup((prev) => ({
        ...prev,
        [groupId]: (data || []).length === PAGE_SIZE,
      }));
    },
    []
  );

  useEffect(() => {
    const loadSelectedConversation = async () => {
      if (!selectedConversationId) return;
      if (messagesByGroup[selectedConversationId]) return;

      setLoadingGroupId(selectedConversationId);

      try {
        await loadMessagesForGroup(selectedConversationId);
      } catch (err) {
        console.error("loadSelectedConversation error:", err);
        setError("Failed to load conversation.");
      } finally {
        setLoadingGroupId((prev) => (prev === selectedConversationId ? null : prev));
      }
    };

    void loadSelectedConversation();
  }, [loadMessagesForGroup, messagesByGroup, selectedConversationId, setError]);

  useEffect(() => {
    if (!selectedConversationId) return;

    const channelKey = `chat:${selectedConversationId}`;

    registerRealtimeChannel(
      channelKey,
      supabase
        .channel(channelKey)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "chat_messages",
            filter: `group_id=eq.${selectedConversationId}`,
          },
          async (payload) => {
            if (payload.eventType === "INSERT" && payload.new) {
              const message = payload.new as ChatMessageRow;

              setMessagesByGroup((prev) => ({
                ...prev,
                [selectedConversationId]: dedupeMessages([
                  ...(prev[selectedConversationId] || []),
                  message,
                ]),
              }));

              requestAnimationFrame(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              });
            }

            if (payload.eventType === "UPDATE" && payload.new) {
              const message = payload.new as ChatMessageRow;
              setMessagesByGroup((prev) => ({
                ...prev,
                [selectedConversationId]: (prev[selectedConversationId] || []).map((item) =>
                  item.id === message.id ? message : item
                ),
              }));
            }

            if (payload.eventType === "DELETE" && payload.old) {
              const message = payload.old as ChatMessageRow;
              setMessagesByGroup((prev) => ({
                ...prev,
                [selectedConversationId]: (prev[selectedConversationId] || []).filter(
                  (item) => item.id !== message.id
                ),
              }));
            }
          }
        )
        .subscribe()
    );

    return () => {
      void removeRealtimeChannel(channelKey);
    };
  }, [selectedConversationId]);

  const filteredConversations = useMemo(() => {
    return groups.filter((group) =>
      getConversationName(group).toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [getConversationName, groups, searchQuery]);

  const mentionCandidates = useMemo(() => {
    if (!selectedConversationId) return [];

    const ids = Array.from(
      new Set(getMembersForGroup(selectedConversationId).map((member) => member.user_id))
    );

    return ids
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

  const canManageMessage = useCallback(
    (message: ChatMessageRow) => {
      if (!currentUserId) return false;
      return currentUserRole === "admin" || message.user_id === currentUserId;
    },
    [currentUserId, currentUserRole]
  );

  const allSelectableIds = selectedMessages
    .filter((message) => canManageMessage(message))
    .map((message) => message.id);

  const allSelected =
    allSelectableIds.length > 0 &&
    allSelectableIds.every((messageId) => selectedMessageIds.includes(messageId));

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
      setError(groupError?.message || "Failed to create direct chat.");
      return;
    }

    const memberRows = [
      { group_id: newGroup.id, user_id: currentUserId, role: "member" },
      { group_id: newGroup.id, user_id: targetUserId, role: "member" },
    ];

    const { data: insertedMembers, error: memberInsertError } = await supabase
      .from("chat_group_members")
      .insert(memberRows)
      .select("id, group_id, user_id, role, created_at");

    if (memberInsertError) {
      setError(memberInsertError.message || "Failed to add direct chat members.");
      return;
    }

    upsertGroupLocally(newGroup as ChatGroupRow, (insertedMembers || []) as ChatGroupMemberRow[]);
    setMessagesByGroup((prev) => ({ ...prev, [newGroup.id]: [] }));
    openConversation(newGroup.id);
    void reloadChatShell(newGroup.id);
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

    const { data: insertedMembers, error: membersError } = await supabase
      .from("chat_group_members")
      .insert(memberRows)
      .select("id, group_id, user_id, role, created_at");

    if (membersError) {
      setError(membersError.message || "Failed to add group members.");
      setIsCreatingGroup(false);
      return;
    }

upsertGroupLocally(
      newGroup as ChatGroupRow,
      (insertedMembers || []) as ChatGroupMemberRow[]
    );
    setMessagesByGroup((prev) => ({ ...prev, [newGroup.id]: [] }));
    setGroupName("");
    setSelectedGroupMembers([]);
    setIsCreateGroupOpen(false);
    setIsCreatingGroup(false);
    openConversation(newGroup.id);
    void reloadChatShell(newGroup.id);
  };

  const handleSendMessage = async () => {
    if (
      !messageInput.trim() ||
      !selectedConversationId ||
      !currentUserId ||
      !selectedConversation
    ) {
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

    setMessagesByGroup((prev) => ({
      ...prev,
      [selectedConversationId]: dedupeMessages([
        ...(prev[selectedConversationId] || []),
        optimisticMessage,
      ]),
    }));

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
      setMessagesByGroup((prev) => ({
        ...prev,
        [selectedConversationId]: (prev[selectedConversationId] || []).filter(
          (item) => item.id !== tempId
        ),
      }));
      setMessageInput(contentToSend);
      setError(sendError?.message || "Failed to send message.");
      setIsSending(false);
      return;
    }

    setMessagesByGroup((prev) => ({
      ...prev,
      [selectedConversationId]: dedupeMessages([
        ...(prev[selectedConversationId] || []).filter((item) => item.id !== tempId),
        insertedMessage as ChatMessageRow,
      ]),
    }));

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

    const currentMessages = messagesByGroup[selectedConversationId] || [];
    if (currentMessages.length === 0) return;

    const oldestMessage = currentMessages[0];
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

    setMessagesByGroup((prev) => ({
      ...prev,
      [selectedConversationId]: dedupeMessages([
        ...olderBatch,
        ...(prev[selectedConversationId] || []),
      ]),
    }));

    setHasMoreByGroup((prev) => ({
      ...prev,
      [selectedConversationId]: (olderMessages || []).length === PAGE_SIZE,
    }));

    setIsLoadingOlder(false);
  };

  const handleDeleteChat = async (group: ChatGroupRow) => {
    const confirmed = window.confirm("Are you sure you want to delete this chat?");
    if (!confirmed) return;

    const { error: deleteError } = await supabase
      .from("chat_groups")
      .delete()
      .eq("id", group.id);

    if (deleteError) {
      setError(deleteError.message || "Failed to delete chat.");
      return;
    }

    removeGroupLocally(group.id);

    if (selectedConversationId === group.id) {
      navigate("/chat");
    }

    void reloadChatShell(null);
  };

  const startEditingMessage = (message: ChatMessageRow) => {
    setIsSelectionMode(false);
    setSelectedMessageIds([]);
    setEditingMessageId(message.id);
    setEditingMessageText(message.content);
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

    setMessagesByGroup((prev) => ({
      ...prev,
      [message.group_id]: (prev[message.group_id] || []).map((item) =>
        item.id === message.id ? { ...item, content: editingMessageText.trim() } : item
      ),
    }));

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

    setMessagesByGroup((prev) => ({
      ...prev,
      [message.group_id]: (prev[message.group_id] || []).filter(
        (item) => item.id !== message.id
      ),
    }));

    setMessageActionLoading(null);
  };

  const handleBulkDeleteMessages = async () => {
    if (!selectedConversationId || selectedMessageIds.length === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedMessageIds.length} selected message(s)?`
    );
    if (!confirmed) return;

    setBulkDeleteLoading(true);

    const { error: deleteError } = await supabase
      .from("chat_messages")
      .delete()
      .in("id", selectedMessageIds);

    if (deleteError) {
      setError(deleteError.message || "Failed to delete selected messages.");
      setBulkDeleteLoading(false);
      return;
    }

    const idSet = new Set(selectedMessageIds);

    setMessagesByGroup((prev) => ({
      ...prev,
      [selectedConversationId]: (prev[selectedConversationId] || []).filter(
        (item) => !idSet.has(item.id)
      ),
    }));

    setSelectedMessageIds([]);
    setIsSelectionMode(false);
    setBulkDeleteLoading(false);
  };

  const renderConversationButton = (
    group: ChatGroupRow,
    iconType?: "project" | "task" | "group"
  ) => (
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
          onClick={() => openConversation(group.id)}
          className="flex items-center gap-3 flex-1 text-left min-w-0"
        >
          {iconType ? (
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
              {iconType === "project" && (
                <FolderKanban className="w-5 h-5 text-indigo-400" />
              )}
              {iconType === "task" && (
                <CheckSquare className="w-5 h-5 text-indigo-400" />
              )}
              {iconType === "group" && (
                <Users className="w-5 h-5 text-indigo-400" />
              )}
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

        {(currentUserRole === "admin" || group.created_by === currentUserId) && (
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-red-400 shrink-0"
            onClick={() => void handleDeleteChat(group)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );

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
                {isBootstrapping ? (
                  <div className="text-sm text-slate-400 px-2 py-4">Loading chats...</div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-medium text-slate-500 uppercase">
                        Direct Messages
                      </h3>
                    </div>

                    {filteredConversations
                      .filter((group) => group.type === "DIRECT")
                      .map((group) => renderConversationButton(group))}

                    {filteredConversations.some((group) => group.type === "PROJECT") && (
                      <>
                        <Separator className="my-3 bg-slate-800" />
                        <h3 className="text-xs font-medium text-slate-500 uppercase mb-2">
                          Project Chats
                        </h3>
                        {filteredConversations
                          .filter((group) => group.type === "PROJECT")
                          .map((group) => renderConversationButton(group, "project"))}
                      </>
                    )}

                    {filteredConversations.some((group) => group.type === "TASK") && (
                      <>
                        <Separator className="my-3 bg-slate-800" />
                        <h3 className="text-xs font-medium text-slate-500 uppercase mb-2">
                          Task Chats
                        </h3>
                        {filteredConversations
                          .filter((group) => group.type === "TASK")
                          .map((group) => renderConversationButton(group, "task"))}
                      </>
                    )}

                    {filteredConversations.some((group) => group.type === "GROUP") && (
                      <>
                        <Separator className="my-3 bg-slate-800" />
                        <h3 className="text-xs font-medium text-slate-500 uppercase mb-2">
                          Group Chats
                        </h3>
                        {filteredConversations
                          .filter((group) => group.type === "GROUP")
                          .map((group) => renderConversationButton(group, "group"))}
                      </>
                    )}

                    <Separator className="my-3 bg-slate-800" />
                    <h3 className="text-xs font-medium text-slate-500 uppercase mb-2">
                      Team Members
                    </h3>

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
                        </button>
                      ))}
                  </>
                )}
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
                  onClick={() => {
                    setIsSelectionMode((prev) => !prev);
                    setSelectedMessageIds([]);
                  }}
                >
                  <CheckSquare className="w-4 h-4 mr-2" />
                  {isSelectionMode ? "Cancel Selection" : "Select Messages"}
                </Button>
              </div>
            </div>

            {(isSelectionMode || selectedMessageIds.length > 0) && (
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-800 bg-slate-950/60 shrink-0">
                <div className="text-sm text-slate-300">{selectedMessageIds.length} selected</div>

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
                  {selectedConversationId && hasMoreByGroup[selectedConversationId] ? (
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
                  )}
                </div>

                {loadingGroupId === selectedConversation.id &&
                selectedMessages.length === 0 ? (
                  <div className="flex items-center justify-center py-16 text-slate-400">
                    Loading conversation...
                  </div>
                ) : (
                  <div className="space-y-4 pt-2">
                    {selectedMessages.map((message, index) => {
                      const isOwn = message.user_id === currentUserId;
                      const user = getProfileByUserId(message.user_id);
                      const showAvatar =
                        index === 0 ||
                        selectedMessages[index - 1].user_id !== message.user_id;

                      return (
                        <div
                          key={message.id}
                          className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
                        >
                          {showAvatar ? (
                            <Avatar className="w-8 h-8 flex-shrink-0">
                              <AvatarFallback className="bg-indigo-600 text-white text-xs">
                                {(user?.full_name || "U")
                                  .split(" ")
                                  .map((p) => p[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="w-8 flex-shrink-0" />
                          )}

                          <div className={`max-w-[70%]`}>
                            {showAvatar && (
                              <p className="text-xs text-slate-500 mb-1">
                                {user?.full_name || "Unknown"} •{" "}
                                {formatMessageTime(message.created_at)}
                              </p>
                            )}

                            <div
                              className={`px-4 py-2 rounded-2xl ${
                                isOwn
                                  ? "bg-indigo-600 text-white rounded-br-none"
                                  : "bg-slate-800 text-slate-200 rounded-bl-none"
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words">
                                {message.content}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {selectedMessages.length === 0 && (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                          <MessageSquare className="w-8 h-8 text-slate-500" />
                        </div>
                        <p className="text-slate-500">No messages yet</p>
                        <p className="text-slate-600 text-sm">
                          Start the conversation!
                        </p>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-slate-800 shrink-0">
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
                  className="min-h-[44px] max-h-40 bg-slate-950 border-slate-800 text-white resize-none"
                />

                <Button
                  onClick={() => void handleSendMessage()}
                  disabled={isSending || !messageInput.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white h-11"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="flex-1 bg-slate-900/50 border-slate-800 flex items-center justify-center">
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
    </>
  );
}
