import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { createNotification } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";
import { format } from "date-fns";

type Role = "admin" | "manager" | "employee" | "guest";

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  role: Role;
  status: "active" | "pending" | "inactive" | "denied";
};

type ChatGroupRow = {
  id: string;
  name: string | null;
  type: "DIRECT" | "GROUP" | "PROJECT" | "TASK";
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

function buildDirectKey(a: string, b: string) {
  return [a, b].sort().join("__");
}

export default function ChatPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);

  const [groups, setGroups] = useState<ChatGroupRow[]>([]);
  const [groupMembers, setGroupMembers] = useState<ChatGroupMemberRow[]>([]);
  const [messages, setMessages] = useState<Record<string, ChatMessageRow[]>>({});
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(id || null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState("");
  const [messageActionLoading, setMessageActionLoading] = useState<string | null>(null);
  const [groupActionLoading, setGroupActionLoading] = useState<string | null>(null);

  const loadChatData = async (preferredId?: string | null) => {
    setError("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      navigate("/login");
      return;
    }

    setCurrentUserId(user.id);

    const [{ data: myProfile }, { data: allProfiles, error: profilesError }] = await Promise.all([
      supabase.from("profiles").select("role").eq("user_id", user.id).single(),
      supabase
        .from("profiles")
        .select("user_id, full_name, role, status")
        .eq("status", "active")
        .order("full_name", { ascending: true }),
    ]);

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

      if (membershipsError) {
        setError(membershipsError.message || "Failed to load memberships.");
        return;
      }

      const myGroupIds = Array.from(new Set((myMemberships || []).map((m) => m.group_id)));

      if (myGroupIds.length === 0) {
        setProfiles((allProfiles || []) as ProfileRow[]);
        setGroups([]);
        setGroupMembers([]);
        setMessages({});
        setSelectedConversationId(null);
        return;
      }

      groupsQuery = groupsQuery.in("id", myGroupIds);
    }

    const { data: groupsData, error: groupsError } = await groupsQuery;

    if (groupsError) {
      setError(groupsError.message || "Failed to load chat groups.");
      return;
    }

    const rawGroups = (groupsData || []) as ChatGroupRow[];

    const dedupedMap = new Map<string, ChatGroupRow>();
    for (const group of rawGroups) {
      const key =
        group.type === "DIRECT" && group.direct_key
          ? `DIRECT:${group.direct_key}`
          : `GROUP:${group.id}`;
      if (!dedupedMap.has(key)) {
        dedupedMap.set(key, group);
      }
    }
    const loadedGroups = Array.from(dedupedMap.values());

    const visibleGroupIds = loadedGroups.map((g) => g.id);

    let membersQuery = supabase
      .from("chat_group_members")
      .select("id, group_id, user_id, role, created_at");

    if (visibleGroupIds.length > 0) {
      membersQuery = membersQuery.in("group_id", visibleGroupIds);
    }

    const { data: membersData, error: membersError } = await membersQuery;

    if (membersError) {
      setError(membersError.message || "Failed to load group members.");
      return;
    }

    let loadedMessages: Record<string, ChatMessageRow[]> = {};

    if (visibleGroupIds.length > 0) {
      const { data: messagesData, error: messagesError } = await supabase
        .from("chat_messages")
        .select("id, group_id, user_id, content, created_at")
        .in("group_id", visibleGroupIds)
        .order("created_at", { ascending: true });

      if (messagesError) {
        setError(messagesError.message || "Failed to load messages.");
        return;
      }

      ((messagesData || []) as ChatMessageRow[]).forEach((msg) => {
        if (!loadedMessages[msg.group_id]) loadedMessages[msg.group_id] = [];
        loadedMessages[msg.group_id].push(msg);
      });
    }

    setProfiles((allProfiles || []) as ProfileRow[]);
    setGroups(loadedGroups);
    setGroupMembers((membersData || []) as ChatGroupMemberRow[]);
    setMessages(loadedMessages);

    const requestedId = preferredId || id || null;
    if (requestedId && loadedGroups.some((g) => g.id === requestedId)) {
      setSelectedConversationId(requestedId);
    } else if (loadedGroups.length > 0) {
      setSelectedConversationId(loadedGroups[0].id);
      navigate(`/chat/${loadedGroups[0].id}`);
    } else {
      setSelectedConversationId(null);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadChatData(id || null);
      setIsLoading(false);
    };
    init();
  }, [id]);

  useEffect(() => {
    const channel = supabase
      .channel("chat-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages" },
        async () => {
          await loadChatData(selectedConversationId);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_groups" },
        async () => {
          await loadChatData(selectedConversationId);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_group_members" },
        async () => {
          await loadChatData(selectedConversationId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversationId]);

useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedConversationId]);

  const selectedConversation = selectedConversationId
    ? groups.find((g) => g.id === selectedConversationId)
    : null;

  const conversationMessages = selectedConversationId
    ? messages[selectedConversationId] || []
    : [];

  const getMembersForGroup = (groupId: string) => {
    return groupMembers.filter((m) => m.group_id === groupId);
  };

  const getProfileByUserId = (userId: string) => {
    return profiles.find((p) => p.user_id === userId);
  };

  const getConversationName = (group: ChatGroupRow) => {
    if (group.name) return group.name;

    const members = getMembersForGroup(group.id);

    if (group.type === "DIRECT") {
      const otherMember = members.find((m) => m.user_id !== currentUserId);
      const profile = otherMember ? getProfileByUserId(otherMember.user_id) : null;
      return profile?.full_name || "Direct Chat";
    }

    if (group.type === "PROJECT") return "Project Chat";
    if (group.type === "TASK") return "Task Chat";

    return "Group Chat";
  };

  const getConversationInitials = (group: ChatGroupRow) => {
    const name = getConversationName(group);
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredConversations = useMemo(() => {
    return groups.filter((group) =>
      getConversationName(group).toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [groups, searchQuery, currentUserId, groupMembers, profiles]);

  const directConversations = filteredConversations.filter((g) => g.type === "DIRECT");
  const projectConversations = filteredConversations.filter((g) => g.type === "PROJECT");
  const taskConversations = filteredConversations.filter((g) => g.type === "TASK");
  const groupConversations = filteredConversations.filter((g) => g.type === "GROUP");

  const canManageMessage = (message: ChatMessageRow) => {
    if (!currentUserId) return false;
    return currentUserRole === "admin" || message.user_id === currentUserId;
  };

  const canDeleteChat = (group: ChatGroupRow) => {
    if (!currentUserId) return false;
    return currentUserRole === "admin" || group.created_by === currentUserId;
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversationId || !currentUserId || !selectedConversation)
      return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessageRow = {
      id: tempId,
      group_id: selectedConversationId,
      user_id: currentUserId,
      content: messageInput.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => ({
      ...prev,
      [selectedConversationId]: [...(prev[selectedConversationId] || []), optimisticMessage],
    }));

    const contentToSend = messageInput.trim();
    setMessageInput("");
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
      setMessages((prev) => ({
        ...prev,
        [selectedConversationId]: (prev[selectedConversationId] || []).filter(
          (m) => m.id !== tempId
        ),
      }));
      setMessageInput(contentToSend);
      setError(sendError?.message || "Failed to send message.");
      setIsSending(false);
      return;
    }

    setMessages((prev) => ({
      ...prev,
      [selectedConversationId]: (prev[selectedConversationId] || []).map((m) =>
        m.id === tempId ? (insertedMessage as ChatMessageRow) : m
      ),
    }));

    const recipientMembers = getMembersForGroup(selectedConversationId).filter(
      (member) => member.user_id !== currentUserId
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

    setIsSending(false);
  };

  const startDirectMessage = async (targetUserId: string) => {
    if (!currentUserId) return;

    const directKey = buildDirectKey(currentUserId, targetUserId);

    const existingDirect = groups.find(
      (group) => group.type === "DIRECT" && group.direct_key === directKey
    );

    if (existingDirect) {
      setSelectedConversationId(existingDirect.id);
      navigate(`/chat/${existingDirect.id}`);
      return;
    }

    const { data: dbExisting, error: existingError } = await supabase
      .from("chat_groups")
      .select("id, name, type, project_id, task_id, created_by, created_at, direct_key")
      .eq("type", "DIRECT")
      .eq("direct_key", directKey)
      .maybeSingle();

    if (existingError) {
      setError(existingError.message || "Failed to check existing direct chat.");
      return;
    }

    if (dbExisting) {
      await loadChatData(dbExisting.id);
      setSelectedConversationId(dbExisting.id);
      navigate(`/chat/${dbExisting.id}`);
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
      setError(groupError?.message || "Failed to create direct message.");
      return;
    }

    const { error: memberInsertError } = await supabase.from("chat_group_members").insert([
      { group_id: newGroup.id, user_id: currentUserId, role: "member" },
      { group_id: newGroup.id, user_id: targetUserId, role: "member" },
    ]);

    if (memberInsertError) {
      setError(memberInsertError.message || "Failed to create direct chat members.");
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

    const { error: membersError } = await supabase.from("chat_group_members").insert(memberRows);

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

    const { error: deleteError } = await supabase.from("chat_groups").delete().eq("id", group.id);

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

    setMessages((prev) => ({
      ...prev,
      [message.group_id]: (prev[message.group_id] || []).map((m) =>
        m.id === message.id ? { ...m, content: editingMessageText.trim() } : m
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

    setMessages((prev) => ({
      ...prev,
      [message.group_id]: (prev[message.group_id] || []).filter((m) => m.id !== message.id),
    }));

    if (editingMessageId === message.id) {
      setEditingMessageId(null);
      setEditingMessageText("");
    }

    setMessageActionLoading(null);
  };

  const renderConversationButton = (group: ChatGroupRow, iconType?: "project" | "task" | "group") => {
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
            className="flex items-center gap-3 flex-1 text-left"
          >
            {iconType ? (
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                {iconType === "project" && <FolderKanban className="w-5 h-5 text-indigo-400" />}
                {iconType === "task" && <CheckSquare className="w-5 h-5 text-indigo-400" />}
                {iconType === "group" && <Users className="w-5 h-5 text-indigo-400" />}
              </div>
            ) : (
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-indigo-600 text-white">
                  {getConversationInitials(group)}
                </AvatarFallback>
              </Avatar>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">{getConversationName(group)}</p>
              <p className="text-slate-500 text-xs">
                {getMembersForGroup(group.id).length} participants
              </p>
            </div>
          </button>

          {canDeleteChat(group) && (
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-red-400"
              onClick={() => handleDeleteChat(group)}
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
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

return (
    <>
      <div className="h-[calc(100vh-140px)] flex gap-4">
        <Card className="w-80 bg-slate-900/50 border-slate-800 flex flex-col">
          <CardContent className="p-4 flex flex-col h-full">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600"
              />
            </div>

            <div className="mb-3">
              <Button
                onClick={() => setIsCreateGroupOpen(true)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Group Chat
              </Button>
            </div>

            {error && (
              <div className="mb-3 rounded-md border border-red-800 bg-red-900/20 px-3 py-2 text-sm text-red-300">
                {error}
              </div>
            )}

            <ScrollArea className="flex-1 -mx-2">
              <div className="space-y-1 px-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-medium text-slate-500 uppercase">Direct Messages</h3>
                </div>
                {directConversations.map((group) => renderConversationButton(group))}

                {projectConversations.length > 0 && (
                  <>
                    <Separator className="my-3 bg-slate-800" />
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-medium text-slate-500 uppercase">Project Chats</h3>
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
                      <h3 className="text-xs font-medium text-slate-500 uppercase">Task Chats</h3>
                    </div>
                    {taskConversations.map((group) => renderConversationButton(group, "task"))}
                  </>
                )}

                {groupConversations.length > 0 && (
                  <>
                    <Separator className="my-3 bg-slate-800" />
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-medium text-slate-500 uppercase">Group Chats</h3>
                    </div>
                    {groupConversations.map((group) => renderConversationButton(group, "group"))}
                  </>
                )}

                <Separator className="my-3 bg-slate-800" />
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-medium text-slate-500 uppercase">Team Members</h3>
                </div>

                {profiles
                  .filter((user) => user.user_id !== currentUserId && user.status === "active")
                  .map((user) => (
                    <button
                      key={user.user_id}
                      onClick={() => startDirectMessage(user.user_id)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800/50 transition-all"
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-indigo-600 text-white">
                          {(user.full_name || "U")
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="text-white font-medium text-sm">{user.full_name || "Unknown"}</p>
                        <p className="text-slate-500 text-xs">{user.role}</p>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                    </button>
                  ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {selectedConversation ? (
          <Card className="flex-1 bg-slate-900/50 border-slate-800 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-indigo-600 text-white">
                    {getConversationInitials(selectedConversation)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-white font-medium">
                    {getConversationName(selectedConversation)}
                  </h3>
                  <p className="text-slate-500 text-sm">
                    {getMembersForGroup(selectedConversation.id).length} participants
                  </p>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {conversationMessages.map((message, index) => {
                  const isOwn = message.user_id === currentUserId;
                  const user = getProfileByUserId(message.user_id);
                  const showAvatar =
                    index === 0 || conversationMessages[index - 1].user_id !== message.user_id;
                  const isEditing = editingMessageId === message.id;

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
                              .map((n) => n[0])
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
                            {user?.full_name || "Unknown"} •{" "}
                            {format(new Date(message.created_at), "h:mm a")}
                          </p>
                        )}

                        <div
                          className={`px-4 py-2 rounded-2xl ${
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
                                  onClick={() => handleSaveEditedMessage(message)}
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
                            <p className="whitespace-pre-wrap">{message.content}</p>
                          )}
                        </div>

                        {canManageMessage(message) && !isEditing && (
                          <div className={`mt-1 flex gap-2 ${isOwn ? "justify-end" : "justify-start"}`}>
                            <button
                              className="text-xs text-slate-400 hover:text-white"
                              onClick={() => startEditingMessage(message)}
                              disabled={messageActionLoading === message.id}
                            >
                              Edit
                            </button>
                            <button
                              className="text-xs text-red-400 hover:text-red-300"
                              onClick={() => handleDeleteMessage(message)}
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

                <div ref={messagesEndRef} />

                {conversationMessages.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="w-8 h-8 text-slate-500" />
                    </div>
                    <p className="text-slate-500">No messages yet</p>
                    <p className="text-slate-600 text-sm">Start the conversation!</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-slate-800">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isSending || !messageInput.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
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
              <h3 className="text-lg font-medium text-white mb-2">Select a conversation</h3>
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
                onClick={handleCreateGroup}
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
