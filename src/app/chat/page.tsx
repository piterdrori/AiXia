import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Send,
  Phone,
  Video,
  Info,
  FolderKanban,
  MessageSquare,
  Users,
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

  const loadChatData = async (selectedId?: string | null) => {
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

    const [
      { data: myProfile, error: myProfileError },
      { data: allProfiles, error: profilesError },
      { data: myMemberships, error: membershipsError },
    ] = await Promise.all([
      supabase.from("profiles").select("role").eq("user_id", user.id).single(),
      supabase
        .from("profiles")
        .select("user_id, full_name, role, status")
        .eq("status", "active")
        .order("full_name", { ascending: true }),
      supabase.from("chat_group_members").select("id, group_id, user_id, role, created_at"),
    ]);

    if (myProfileError || !myProfile) {
      navigate("/login");
      return;
    }

    setCurrentUserRole(myProfile.role as Role);

    if (profilesError) {
      setError(profilesError.message || "Failed to load users.");
      return;
    }

    if (membershipsError) {
      setError(membershipsError.message || "Failed to load chat members.");
      return;
    }

    const memberships = (myMemberships || []) as ChatGroupMemberRow[];

    const myGroupIds =
      myProfile.role === "admin"
        ? Array.from(new Set(memberships.map((m) => m.group_id)))
        : Array.from(
            new Set(
              memberships
                .filter((m) => m.user_id === user.id)
                .map((m) => m.group_id)
            )
          );

    let groupsQuery = supabase
      .from("chat_groups")
      .select("id, name, type, project_id, task_id, created_by, created_at")
      .order("created_at", { ascending: false });

    if (myProfile.role !== "admin") {
      if (myGroupIds.length === 0) {
        setProfiles((allProfiles || []) as ProfileRow[]);
        setGroups([]);
        setGroupMembers(memberships);
        setMessages({});
        return;
      }
      groupsQuery = groupsQuery.in("id", myGroupIds);
    }

    const { data: groupsData, error: groupsError } = await groupsQuery;

    if (groupsError) {
      setError(groupsError.message || "Failed to load chat groups.");
      return;
    }

    const loadedGroups = (groupsData || []) as ChatGroupRow[];
    const loadedProfiles = (allProfiles || []) as ProfileRow[];

    const visibleGroupIds = loadedGroups.map((g) => g.id);
    const visibleMembers =
      myProfile.role === "admin"
        ? memberships.filter((m) => visibleGroupIds.includes(m.group_id))
        : memberships.filter((m) => visibleGroupIds.includes(m.group_id));

    setProfiles(loadedProfiles);
    setGroups(loadedGroups);
    setGroupMembers(visibleMembers);

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

      const groupedMessages: Record<string, ChatMessageRow[]> = {};
      ((messagesData || []) as ChatMessageRow[]).forEach((msg) => {
        if (!groupedMessages[msg.group_id]) groupedMessages[msg.group_id] = [];
        groupedMessages[msg.group_id].push(msg);
      });

      setMessages(groupedMessages);
    } else {
      setMessages({});
    }

    const finalSelected = selectedId || id || null;

    if (finalSelected && loadedGroups.some((g) => g.id === finalSelected)) {
      setSelectedConversationId(finalSelected);
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
      .channel("chat-messages-realtime")
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

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversationId || !currentUserId) return;

    setIsSending(true);
    setError("");

    const { error: sendError } = await supabase.from("chat_messages").insert({
      group_id: selectedConversationId,
      user_id: currentUserId,
      content: messageInput.trim(),
    });

    if (sendError) {
      setError(sendError.message || "Failed to send message.");
      setIsSending(false);
      return;
    }

    setMessageInput("");
    setIsSending(false);
  };

  const startDirectMessage = async (targetUserId: string) => {
    if (!currentUserId) return;

    const existingDirect = groups.find((group) => {
      if (group.type !== "DIRECT") return false;
      const members = getMembersForGroup(group.id).map((m) => m.user_id);
      return (
        members.length === 2 &&
        members.includes(currentUserId) &&
        members.includes(targetUserId)
      );
    });

    if (existingDirect) {
      setSelectedConversationId(existingDirect.id);
      navigate(`/chat/${existingDirect.id}`);
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
      })
      .select("id, name, type, project_id, task_id, created_by, created_at")
      .single();

    if (groupError || !newGroup) {
      setError(groupError?.message || "Failed to create direct message.");
      return;
    }

    const { error: memberInsertError } = await supabase.from("chat_group_members").insert([
      {
        group_id: newGroup.id,
        user_id: currentUserId,
        role: "member",
      },
      {
        group_id: newGroup.id,
        user_id: targetUserId,
        role: "member",
      },
    ]);

    if (memberInsertError) {
      setError(memberInsertError.message || "Failed to create direct chat members.");
      return;
    }

    await loadChatData(newGroup.id);
    setSelectedConversationId(newGroup.id);
    navigate(`/chat/${newGroup.id}`);
  };

  const renderConversationButton = (group: ChatGroupRow, iconType?: "project" | "task" | "group") => {
    return (
      <button
        key={group.id}
        onClick={() => {
          setSelectedConversationId(group.id);
          navigate(`/chat/${group.id}`);
        }}
        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
          selectedConversationId === group.id
            ? "bg-indigo-600/20 border border-indigo-500/30"
            : "hover:bg-slate-800/50"
        }`}
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

        <div className="flex-1 text-left min-w-0">
          <p className="text-white font-medium text-sm truncate">{getConversationName(group)}</p>
          <p className="text-slate-500 text-xs">
            {getMembersForGroup(group.id).length} participants
          </p>
        </div>
      </button>
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

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="text-slate-400">
                <Phone className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-slate-400">
                <Video className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-slate-400">
                <Info className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {conversationMessages.map((message, index) => {
                const isOwn = message.user_id === currentUserId;
                const user = getProfileByUserId(message.user_id);
                const showAvatar =
                  index === 0 || conversationMessages[index - 1].user_id !== message.user_id;

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
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
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
  );
}
