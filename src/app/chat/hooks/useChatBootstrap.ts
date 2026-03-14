import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";
import type {
  ChatBootstrapResult,
  ChatGroupMemberRow,
  ChatGroupRow,
  ProfileRow,
  Role,
} from "../types";

export function useChatBootstrap(preferredId?: string | null) {
  const navigate = useNavigate();
  const requestTracker = useRef(createRequestTracker());

  const [data, setData] = useState<ChatBootstrapResult>({
    currentUserId: null,
    currentUserRole: null,
    profiles: [],
    groups: [],
    groupMembers: [],
  });

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    preferredId || null
  );

  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [error, setError] = useState("");

  const loadChatShell = useCallback(
    async (nextPreferredId?: string | null) => {
      const requestId = requestTracker.current.next();
      setError("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (!requestTracker.current.isLatest(requestId)) return;

        if (authError || !user) {
          navigate("/login");
          return;
        }

        const [{ data: myProfile }, { data: allProfiles, error: profilesError }] =
          await Promise.all([
            supabase.from("profiles").select("role").eq("user_id", user.id).single(),
            supabase
              .from("profiles")
              .select("user_id, full_name, role, status")
              .eq("status", "active")
              .order("full_name", { ascending: true }),
          ]);

        if (!requestTracker.current.isLatest(requestId)) return;

        if (profilesError) {
          setError(profilesError.message || "Failed to load users.");
          return;
        }

        const role = (myProfile?.role || "employee") as Role;
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

          if (!requestTracker.current.isLatest(requestId)) return;

          if (membershipsError) {
            setError(membershipsError.message || "Failed to load memberships.");
            return;
          }

          const myGroupIds = Array.from(
            new Set((myMemberships || []).map((item) => item.group_id))
          );

          if (myGroupIds.length === 0) {
            setData({
              currentUserId: user.id,
              currentUserRole: role,
              profiles: (allProfiles || []) as ProfileRow[],
              groups: [],
              groupMembers: [],
            });
            setSelectedConversationId(null);
            return;
          }

          groupsQuery = groupsQuery.in("id", myGroupIds);
        }

        const { data: groupsData, error: groupsError } = await groupsQuery;

        if (!requestTracker.current.isLatest(requestId)) return;

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
        const visibleGroupIds = loadedGroups.map((group) => group.id);

        let membersQuery = supabase
          .from("chat_group_members")
          .select("id, group_id, user_id, role, created_at");

        if (visibleGroupIds.length > 0) {
          membersQuery = membersQuery.in("group_id", visibleGroupIds);
        }

        const { data: membersData, error: membersError } = await membersQuery;

        if (!requestTracker.current.isLatest(requestId)) return;

        if (membersError) {
          setError(membersError.message || "Failed to load group members.");
          return;
        }

        setData({
          currentUserId: user.id,
          currentUserRole: role,
          profiles: (allProfiles || []) as ProfileRow[],
          groups: loadedGroups,
          groupMembers: (membersData || []) as ChatGroupMemberRow[],
        });

        const requestedId = nextPreferredId || preferredId || null;

        if (requestedId && loadedGroups.some((group) => group.id === requestedId)) {
          setSelectedConversationId(requestedId);
        } else if (loadedGroups.length > 0) {
          const firstGroupId = loadedGroups[0].id;
          setSelectedConversationId(firstGroupId);

          if (!requestedId) {
            navigate(`/chat/${firstGroupId}`, { replace: true });
          }
        } else {
          setSelectedConversationId(null);
        }
      } catch (err) {
        if (!requestTracker.current.isLatest(requestId)) return;
        console.error("useChatBootstrap error:", err);
        setError("Failed to load chat.");
      } finally {
        if (!requestTracker.current.isLatest(requestId)) return;
        setIsBootstrapping(false);
      }
    },
    [navigate, preferredId]
  );

  useEffect(() => {
    setIsBootstrapping(true);
    void loadChatShell(preferredId || null);
  }, [preferredId, loadChatShell]);

  return {
    ...data,
    selectedConversationId,
    setSelectedConversationId,
    isBootstrapping,
    error,
    setError,
    reloadChatShell: loadChatShell,
  };
}
