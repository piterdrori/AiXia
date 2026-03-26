// useChatBootstrap.ts
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n";
import type {
  ChatGroupMemberRow,
  ChatGroupRow,
  ProfileRow,
  Role,
  UnreadCounts,
} from "../types";

function dedupeGroups(items: ChatGroupRow[]) {
  const map = new Map<string, ChatGroupRow>();
  for (const group of items) {
    const key =
      group.type === "DIRECT" && group.direct_key
        ? `DIRECT:${group.direct_key}`
        : `GROUP:${group.id}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, group);
      continue;
    }
    const existingTime = new Date(existing.created_at).getTime();
    const nextTime = new Date(group.created_at).getTime();
    if (nextTime > existingTime) {
      map.set(key, group);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function useChatBootstrap(preferredId: string | null) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [groups, setGroups] = useState<ChatGroupRow[]>([]);
  const [groupMembers, setGroupMembers] = useState<ChatGroupMemberRow[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(preferredId || null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [error, setError] = useState("");
  
  // New: Unread message tracking
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({});
  const [lastReadTimestamps, setLastReadTimestamps] = useState<Record<string, string>>({});
  const lastMessageIdsRef = useRef<Record<string, string>>({});

  // Load last read timestamps from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("chat_last_read");
    if (saved) {
      try {
        setLastReadTimestamps(JSON.parse(saved));
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  // Persist last read timestamps
  const saveLastRead = useCallback((groupId: string, timestamp: string) => {
    setLastReadTimestamps(prev => {
      const next = { ...prev, [groupId]: timestamp };
      localStorage.setItem("chat_last_read", JSON.stringify(next));
      return next;
    });
  }, []);

  const getMembersForGroup = useCallback(
    (groupId: string) => groupMembers.filter((member) => member.group_id === groupId),
    [groupMembers]
  );

  const getProfileByUserId = useCallback(
    (userId: string) => profiles.find((profile) => profile.user_id === userId) || null,
    [profiles]
  );

  // Enhanced: Move group to top with activity timestamp update
  const moveGroupToTop = useCallback((groupId: string) => {
    setGroups((prev) => {
      const index = prev.findIndex((group) => group.id === groupId);
      if (index <= 0) return prev;
      const next = [...prev];
      const [group] = next.splice(index, 1);
      // Update timestamp to now for sorting
      group.updated_at = new Date().toISOString();
      next.unshift(group);
      return next;
    });
  }, []);

  const upsertGroupLocally = useCallback(
    (group: ChatGroupRow, members: ChatGroupMemberRow[] = []) => {
      setGroups((prev) => {
        const withoutSameId = prev.filter((item) => item.id !== group.id);
        return dedupeGroups([{...group, updated_at: new Date().toISOString()}, ...withoutSameId]);
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
    },
    []
  );

  const removeGroupLocally = useCallback((groupId: string) => {
    setGroups((prev) => prev.filter((group) => group.id !== groupId));
    setGroupMembers((prev) => prev.filter((member) => member.group_id !== groupId));
    setSelectedConversationId((prev) => (prev === groupId ? null : prev));
    // Clear unread for deleted group
    setUnreadCounts(prev => {
      const next = { ...prev };
      delete next[groupId];
      return next;
    });
  }, []);

  // New: Mark conversation as read
  const markConversationAsRead = useCallback((groupId: string) => {
    setUnreadCounts(prev => ({ ...prev, [groupId]: 0 }));
    saveLastRead(groupId, new Date().toISOString());
  }, [saveLastRead]);

  // New: Increment unread count for conversation
  const incrementUnread = useCallback((groupId: string, messageId: string) => {
    // Don't increment if it's the currently selected conversation
    if (selectedConversationId === groupId) {
      markConversationAsRead(groupId);
      return;
    }
    
    // Don't increment if we've already seen this message
    if (lastMessageIdsRef.current[groupId] === messageId) return;
    lastMessageIdsRef.current[groupId] = messageId;

    setUnreadCounts(prev => ({
      ...prev,
      [groupId]: (prev[groupId] || 0) + 1
    }));
  }, [selectedConversationId, markConversationAsRead]);

  const loadChatShell = useCallback(
    async (nextPreferredId?: string | null) => {
      setError("");
      try {
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
          { data: myProfile, error: profileError },
          { data: allProfiles, error: allProfilesError },
        ] = await Promise.all([
          supabase.from("profiles").select("role").eq("user_id", user.id).single(),
          supabase
            .from("profiles")
            .select("user_id, full_name, role, status")
            .eq("status", "active")
            .order("full_name", { ascending: true }),
        ]);

        if (profileError || allProfilesError) {
          setError(profileError?.message || allProfilesError?.message || t("chat.errors.loadChatUsers"));
          return;
        }

        const role = ((myProfile?.role as Role) || "employee") as Role;
        setCurrentUserRole(role);
        setProfiles((allProfiles || []) as ProfileRow[]);

        let loadedGroups: ChatGroupRow[] = [];

        if (role === "admin") {
          const { data: groupsData, error: groupsError } = await supabase
            .from("chat_groups")
            .select("id, name, type, project_id, task_id, created_by, created_at, direct_key, updated_at")
            .order("updated_at", { ascending: false });

          if (groupsError) {
            setError(groupsError.message || t("chat.errors.loadChatGroups"));
            return;
          }

          loadedGroups = dedupeGroups((groupsData || []) as ChatGroupRow[]);
        } else {
          const [
            { data: myMemberships, error: membershipsError },
            { data: createdGroups, error: createdGroupsError },
          ] = await Promise.all([
            supabase.from("chat_group_members").select("group_id").eq("user_id", user.id),
            supabase
              .from("chat_groups")
              .select("id, name, type, project_id, task_id, created_by, created_at, direct_key, updated_at")
              .eq("created_by", user.id)
              .order("updated_at", { ascending: false }),
          ]);

          if (membershipsError || createdGroupsError) {
            setError(membershipsError?.message || createdGroupsError?.message || t("chat.errors.loadChatGroups"));
            return;
          }

          const membershipGroupIds = Array.from(
            new Set((myMemberships || []).map((item) => item.group_id))
          );

          let memberGroups: ChatGroupRow[] = [];
          if (membershipGroupIds.length > 0) {
            const { data: groupsData, error: groupsError } = await supabase
              .from("chat_groups")
              .select("id, name, type, project_id, task_id, created_by, created_at, direct_key, updated_at")
              .in("id", membershipGroupIds)
              .order("updated_at", { ascending: false });

            if (groupsError) {
              setError(groupsError.message || t("chat.errors.loadChatGroups"));
              return;
            }
            memberGroups = (groupsData || []) as ChatGroupRow[];
          }

          loadedGroups = dedupeGroups([
            ...memberGroups,
            ...((createdGroups || []) as ChatGroupRow[]),
          ]);
        }

        const groupIds = loadedGroups.map((group) => group.id);
        let members: ChatGroupMemberRow[] = [];

        if (groupIds.length > 0) {
          const { data: membersData, error: membersError } = await supabase
            .from("chat_group_members")
            .select("id, group_id, user_id, role, created_at")
            .in("group_id", groupIds);

          if (membersError) {
            setError(membersError.message || t("chat.errors.loadGroupMembers"));
            return;
          }
          members = (membersData || []) as ChatGroupMemberRow[];
        }

        setGroups(loadedGroups);
        setGroupMembers(members);

        const requestedId = nextPreferredId || preferredId || null;

        if (requestedId && loadedGroups.some((group) => group.id === requestedId)) {
          setSelectedConversationId(requestedId);
          markConversationAsRead(requestedId);
          return;
        }

        setSelectedConversationId((prev) => {
          if (prev && loadedGroups.some((group) => group.id === prev)) {
            return prev;
          }
          const firstGroupId = loadedGroups[0]?.id || null;
          if (firstGroupId && requestedId !== firstGroupId) {
            navigate(`/chat/${firstGroupId}`, { replace: true });
          }
          return firstGroupId;
        });
      } catch (err) {
        console.error("loadChatShell error:", err);
        setError(t("chat.errors.loadChat"));
      } finally {
        setIsBootstrapping(false);
      }
    },
    [navigate, preferredId, t, markConversationAsRead]
  );

  const reloadChatShell = useCallback(
    async (nextPreferredId?: string | null) => {
      await loadChatShell(nextPreferredId);
    },
    [loadChatShell]
  );

  useEffect(() => {
    setIsBootstrapping(true);
    void loadChatShell(preferredId || null);
  }, []); // Initial bootstrap only

  useEffect(() => {
    if (!preferredId) return;
    if (!groups.some((group) => group.id === preferredId)) return;
    setSelectedConversationId((prev) => (prev === preferredId ? prev : preferredId));
    markConversationAsRead(preferredId);
  }, [groups, preferredId, markConversationAsRead]);

  useEffect(() => {
    if (!selectedConversationId) return;
    markConversationAsRead(selectedConversationId);
  }, [selectedConversationId, markConversationAsRead]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setCurrentUserId(null);
        setCurrentUserRole(null);
        setProfiles([]);
        setGroups([]);
        setGroupMembers([]);
        setSelectedConversationId(null);
        setUnreadCounts({});
        return;
      }
      void loadChatShell();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadChatShell]);

  const groupedState = useMemo(
    () => ({
      currentUserId,
      currentUserRole,
      profiles,
      groups,
      groupMembers,
      selectedConversationId,
      isBootstrapping,
      error,
      unreadCounts,
      lastReadTimestamps,
    }),
    [
      currentUserId,
      currentUserRole,
      profiles,
      groups,
      groupMembers,
      selectedConversationId,
      isBootstrapping,
      error,
      unreadCounts,
      lastReadTimestamps,
    ]
  );

  return {
    ...groupedState,
    setError,
    setSelectedConversationId,
    getMembersForGroup,
    getProfileByUserId,
    moveGroupToTop,
    upsertGroupLocally,
    removeGroupLocally,
    loadChatShell,
    reloadChatShell,
    markConversationAsRead,
    incrementUnread,
  };
}
