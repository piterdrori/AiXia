import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import type {
  ChatGroupMemberRow,
  ChatGroupRow,
  ProfileRow,
  Role,
} from "../types";

function dedupeGroups(items: ChatGroupRow[]) {
  const map = new Map<string, ChatGroupRow>();

  for (const group of items) {
    const key =
      group.type === "DIRECT" && group.direct_key
        ? `DIRECT:${group.direct_key}`
        : `GROUP:${group.id}`;

    if (!map.has(key)) {
      map.set(key, group);
    }
  }

  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function useChatBootstrap(preferredId: string | null) {
  const navigate = useNavigate();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [groups, setGroups] = useState<ChatGroupRow[]>([]);
  const [groupMembers, setGroupMembers] = useState<ChatGroupMemberRow[]>([]);

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    preferredId || null
  );

  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [error, setError] = useState("");

  const getMembersForGroup = useCallback(
    (groupId: string) => groupMembers.filter((member) => member.group_id === groupId),
    [groupMembers]
  );

  const getProfileByUserId = useCallback(
    (userId: string) =>
      profiles.find((profile) => profile.user_id === userId) || null,
    [profiles]
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

  const upsertGroupLocally = useCallback(
    (group: ChatGroupRow, members: ChatGroupMemberRow[] = []) => {
      setGroups((prev) => {
        const withoutSameId = prev.filter((item) => item.id !== group.id);
        return dedupeGroups([group, ...withoutSameId]);
      });

      if (members.length > 0) {
        setGroupMembers((prev) => {
          const next = [...prev];

          for (const member of members) {
            const exists = next.some((item) => item.id === member.id);
            if (!exists) {
              next.push(member);
            }
          }

          return next;
        });
      }
    },
    []
  );

  const removeGroupLocally = useCallback((groupId: string) => {
    setGroups((prev) => prev.filter((group) => group.id !== groupId));
    setGroupMembers((prev) => prev.filter((member) => member.group_id !== groupId));
    setSelectedConversationId((prev) => (prev === groupId ? null : prev));
  }, []);

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
          setError(
            profileError?.message ||
              allProfilesError?.message ||
              "Failed to load chat users."
          );
          return;
        }

        const role = ((myProfile?.role as Role) || "employee") as Role;
        setCurrentUserRole(role);
        setProfiles((allProfiles || []) as ProfileRow[]);

        let groupsQuery = supabase
          .from("chat_groups")
          .select(
            "id, name, type, project_id, task_id, created_by, created_at, direct_key"
          )
          .order("created_at", { ascending: false });

        if (role !== "admin") {
          const { data: myMemberships, error: membershipsError } = await supabase
            .from("chat_group_members")
            .select("group_id")
            .eq("user_id", user.id);

          if (membershipsError) {
            setError(membershipsError.message || "Failed to load chat memberships.");
            return;
          }

          const myGroupIds = Array.from(
            new Set((myMemberships || []).map((item) => item.group_id))
          );

          if (myGroupIds.length === 0) {
            setGroups([]);
            setGroupMembers([]);
            setSelectedConversationId(null);
            setIsBootstrapping(false);
            return;
          }

          groupsQuery = groupsQuery.in("id", myGroupIds);
        }

        const { data: groupsData, error: groupsError } = await groupsQuery;

        if (groupsError) {
          setError(groupsError.message || "Failed to load chat groups.");
          return;
        }

        const loadedGroups = dedupeGroups((groupsData || []) as ChatGroupRow[]);
        const groupIds = loadedGroups.map((group) => group.id);

        if (groupIds.length === 0) {
          setGroups([]);
          setGroupMembers([]);
          setSelectedConversationId(null);
          setIsBootstrapping(false);
          return;
        }

        const { data: membersData, error: membersError } = await supabase
          .from("chat_group_members")
          .select("id, group_id, user_id, role, created_at")
          .in("group_id", groupIds);

        if (membersError) {
          setError(membersError.message || "Failed to load group members.");
          return;
        }

        setGroups(loadedGroups);
        setGroupMembers((membersData || []) as ChatGroupMemberRow[]);

        const requestedId = nextPreferredId || preferredId || null;

        if (requestedId && loadedGroups.some((group) => group.id === requestedId)) {
          setSelectedConversationId(requestedId);
        } else {
          setSelectedConversationId((prev) => {
            if (prev && loadedGroups.some((group) => group.id === prev)) {
              return prev;
            }

            const firstGroupId = loadedGroups[0]?.id || null;

            if (firstGroupId && !requestedId) {
              navigate(`/chat/${firstGroupId}`, { replace: true });
            }

            return firstGroupId;
          });
        }
      } catch (err) {
        console.error("loadChatShell error:", err);
        setError("Failed to load chat.");
      } finally {
        setIsBootstrapping(false);
      }
    },
    [navigate, preferredId]
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
    // initial bootstrap only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!preferredId) return;
    if (!groups.some((group) => group.id === preferredId)) return;

    setSelectedConversationId((prev) => (prev === preferredId ? prev : preferredId));
  }, [groups, preferredId]);

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
        return;
      }

      void loadChatShell(selectedConversationId);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadChatShell, selectedConversationId]);

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
  };
}
