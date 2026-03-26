// useChatBootstrap.ts
import { useCallback, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import type { ChatGroupMemberRow, ChatGroupRow, ProfileRow, Role, UnreadCounts, OnlineStatus } from "../types";
import { buildDirectKey } from "../utils";

export function useChatBootstrap(preferredId: string | null) {
  const navigate = useNavigate();
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [groups, setGroups] = useState<ChatGroupRow[]>([]);
  const [groupMembers, setGroupMembers] = useState<ChatGroupMemberRow[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(preferredId || null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [error, setError] = useState("");
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({});
  const [onlineStatus, setOnlineStatus] = useState<OnlineStatus>({});
  
  const lastReadRef = useRef<Record<string, string>>({});
  const lastMessageIdsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const saved = localStorage.getItem("chat_last_read");
    if (saved) {
      try {
        lastReadRef.current = JSON.parse(saved);
      } catch {}
    }
  }, []);

  const saveLastRead = useCallback((groupId: string, timestamp: string) => {
    lastReadRef.current[groupId] = timestamp;
    localStorage.setItem("chat_last_read", JSON.stringify(lastReadRef.current));
  }, []);

  const getMembersForGroup = useCallback((groupId: string) => {
    return groupMembers.filter((member) => member.group_id === groupId);
  }, [groupMembers]);

  const moveGroupToTop = useCallback((groupId: string, lastMessage?: string) => {
    setGroups((prev) => {
      const index = prev.findIndex((g) => g.id === groupId);
      if (index <= 0) return prev;
      const next = [...prev];
      const [group] = next.splice(index, 1);
      group.updated_at = new Date().toISOString();
      if (lastMessage) {
        group.last_message = lastMessage;
        group.last_message_at = new Date().toISOString();
      }
      next.unshift(group);
      return next;
    });
  }, []);

  const upsertGroupLocally = useCallback((group: ChatGroupRow, members: ChatGroupMemberRow[] = []) => {
    setGroups((prev) => {
      const existing = prev.find(g => g.id === group.id);
      if (existing) {
        return prev.map(g => g.id === group.id ? { ...g, ...group } : g);
      }
      return [group, ...prev];
    });
    
    if (members.length > 0) {
      setGroupMembers((prev) => {
        const byId = new Map(prev.map((item) => [item.id, item]));
        for (const member of members) {
          byId.set(member.id, member);
        }
        return Array.from(byId.values());
      });
    }
  }, []);

  const removeGroupLocally = useCallback((groupId: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    setGroupMembers((prev) => prev.filter((m) => m.group_id !== groupId));
    if (selectedConversationId === groupId) {
      setSelectedConversationId(null);
      navigate("/chat");
    }
  }, [selectedConversationId, navigate]);

  const markConversationAsRead = useCallback((groupId: string) => {
    setUnreadCounts(prev => ({ ...prev, [groupId]: 0 }));
    saveLastRead(groupId, new Date().toISOString());
  }, [saveLastRead]);

  const incrementUnread = useCallback((groupId: string, messageId: string) => {
    if (selectedConversationId === groupId) {
      markConversationAsRead(groupId);
      return;
    }
    if (lastMessageIdsRef.current[groupId] === messageId) return;
    lastMessageIdsRef.current[groupId] = messageId;
    setUnreadCounts(prev => ({ ...prev, [groupId]: (prev[groupId] || 0) + 1 }));
  }, [selectedConversationId, markConversationAsRead]);

  const loadChatShell = useCallback(async (nextPreferredId?: string | null) => {
    setError("");
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        navigate("/login");
        return;
      }

      setCurrentUserId(user.id);

      const [{ data: myProfile }, { data: allProfiles }] = await Promise.all([
        supabase.from("profiles").select("role").eq("user_id", user.id).single(),
        supabase.from("profiles").select("*").eq("status", "active").order("full_name", { ascending: true }),
      ]);

      const role = (myProfile?.role as Role) || "employee";
      setCurrentUserRole(role);
      setProfiles((allProfiles || []) as ProfileRow[]);

      let loadedGroups: ChatGroupRow[] = [];
      
      if (role === "admin") {
        const { data: groupsData } = await supabase
          .from("chat_groups")
          .select("*")
          .order("updated_at", { ascending: false });
        loadedGroups = (groupsData || []) as ChatGroupRow[];
      } else {
        const [{ data: memberships }, { data: created }] = await Promise.all([
          supabase.from("chat_group_members").select("group_id").eq("user_id", user.id),
          supabase.from("chat_groups").select("*").eq("created_by", user.id),
        ]);
        
        const memberIds = Array.from(new Set((memberships || []).map(m => m.group_id)));
        let memberGroups: ChatGroupRow[] = [];
        
        if (memberIds.length > 0) {
          const { data: groupsData } = await supabase
            .from("chat_groups")
            .select("*")
            .in("id", memberIds);
          memberGroups = (groupsData || []) as ChatGroupRow[];
        }
        
        loadedGroups = [...memberGroups, ...(created || [])].sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      }

      const uniqueGroups = Array.from(new Map(loadedGroups.map(g => [g.id, g])).values());
      setGroups(uniqueGroups);

      if (uniqueGroups.length > 0) {
        const { data: membersData } = await supabase
          .from("chat_group_members")
          .select("*")
          .in("group_id", uniqueGroups.map(g => g.id));
        setGroupMembers((membersData || []) as ChatGroupMemberRow[]);
      }

      const requestedId = nextPreferredId || preferredId;
      if (requestedId && uniqueGroups.some(g => g.id === requestedId)) {
        setSelectedConversationId(requestedId);
        markConversationAsRead(requestedId);
      } else if (!selectedConversationId && uniqueGroups.length > 0) {
        const firstId = uniqueGroups[0].id;
        setSelectedConversationId(firstId);
        navigate(`/chat/${firstId}`, { replace: true });
        markConversationAsRead(firstId);
      }
    } catch (err) {
      console.error("loadChatShell error:", err);
      setError("Failed to load chat");
    } finally {
      setIsBootstrapping(false);
    }
  }, [navigate, preferredId, selectedConversationId, markConversationAsRead]);

  const startDirectMessage = useCallback(async (targetUserId: string) => {
    if (!currentUserId || targetUserId === currentUserId) return;
    
    const directKey = buildDirectKey(currentUserId, targetUserId);
    const existing = groups.find(g => g.type === "DIRECT" && g.direct_key === directKey);
    
    if (existing) {
      setSelectedConversationId(existing.id);
      navigate(`/chat/${existing.id}`);
      markConversationAsRead(existing.id);
      return;
    }
    
    const { data: newGroup, error: createError } = await supabase
      .from("chat_groups")
      .insert({ type: "DIRECT", direct_key: directKey, created_by: currentUserId, name: null })
      .select()
      .single();
      
    if (createError || !newGroup) {
      setError("Failed to create conversation");
      return;
    }
    
    const { error: memberError } = await supabase
      .from("chat_group_members")
      .insert([
        { group_id: newGroup.id, user_id: currentUserId, role: "member" },
        { group_id: newGroup.id, user_id: targetUserId, role: "member" },
      ]);
      
    if (memberError) {
      setError("Failed to add members");
      return;
    }
    
    upsertGroupLocally(newGroup as ChatGroupRow, [
      { id: `${newGroup.id}-${currentUserId}`, group_id: newGroup.id, user_id: currentUserId, role: "member", invited_by: null, created_at: new Date().toISOString() },
      { id: `${newGroup.id}-${targetUserId}`, group_id: newGroup.id, user_id: targetUserId, role: "member", invited_by: null, created_at: new Date().toISOString() },
    ]);
    
    setSelectedConversationId(newGroup.id);
    navigate(`/chat/${newGroup.id}`);
    markConversationAsRead(newGroup.id);
  }, [currentUserId, groups, navigate, markConversationAsRead, upsertGroupLocally]);

  useEffect(() => {
    loadChatShell(preferredId || null);
  }, []);

  useEffect(() => {
    if (preferredId && groups.some(g => g.id === preferredId)) {
      setSelectedConversationId(preferredId);
      markConversationAsRead(preferredId);
    }
  }, [preferredId, groups, markConversationAsRead]);

  useEffect(() => {
    if (!currentUserId) return;
    
    const channel = supabase.channel("online-users", {
      config: { presence: { key: currentUserId } },
    });
    
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const newStatus: OnlineStatus = {};
      Object.keys(state).forEach(userId => {
        newStatus[userId] = "online";
      });
      setOnlineStatus(prev => ({ ...prev, ...newStatus }));
    });
    
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ online_at: new Date().toISOString() });
      }
    });
    
    return () => {
      channel.unsubscribe();
    };
  }, [currentUserId]);

  return {
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
    getMembersForGroup,
    moveGroupToTop,
    upsertGroupLocally,
    removeGroupLocally,
    markConversationAsRead,
    incrementUnread,
    startDirectMessage,
  };
}
