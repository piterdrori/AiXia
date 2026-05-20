import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";

import { CheckSquare, FolderKanban, Plus, Search, Trash2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { useLanguage } from "@/lib/i18n";

import type { ChatGroupRow, ChatGroupMemberRow, ChatMessageRow, ProfileRow } from "../types";

import {

  getConversationInitials,

  getConversationName,

  getMembersForGroup,

} from "../utils";



type Props = {

  currentUserId: string | null;

  currentUserRole: string | null;

  groups: ChatGroupRow[];

  groupMembers: ChatGroupMemberRow[];

  profiles: ProfileRow[];

  searchQuery: string;

  selectedConversationId: string | null;

  groupActionLoading: string | null;

  unreadCounts: Record<string, number>;

  latestMessageByGroup: Record<string, ChatMessageRow | null>;

  onSearchChange: (value: string) => void;

  onOpenCreateGroup: () => void;

  onOpenConversation: (groupId: string) => void;

  onDeleteChat: (group: ChatGroupRow) => void;

};



function getLatestPreview(

  message: ChatMessageRow | null | undefined,

  currentUserId: string | null

) {

  if (!message) return "";



  const hasText = Boolean(message.content?.trim());

  const hasAttachment = Boolean(message.attachments?.length);



  if (hasText && hasAttachment) {

    return message.user_id === currentUserId

      ? `You: ${message.content}`

      : message.content;

  }



  if (hasText) {

    return message.user_id === currentUserId

      ? `You: ${message.content}`

      : message.content;

  }



  if (hasAttachment) {

    const fileName = message.attachments?.[0]?.file_name || "Attachment";

    return message.user_id === currentUserId

      ? `You: 📎 ${fileName}`

      : `📎 ${fileName}`;

  }



  return "";

}



function getConversationSortTime(

  group: ChatGroupRow,

  latestMessageByGroup: Record<string, ChatMessageRow | null>

) {

  const latestMessage = latestMessageByGroup[group.id];



  if (latestMessage?.created_at) {

    return new Date(latestMessage.created_at).getTime();

  }



  return new Date(group.created_at).getTime();

}



export default function ChatSidebar({

  currentUserId,

  currentUserRole,

  groups,

  groupMembers,

  profiles,

  searchQuery,

  selectedConversationId,

  groupActionLoading,

  unreadCounts,

  latestMessageByGroup,

  onSearchChange,

  onOpenCreateGroup,

  onOpenConversation,

  onDeleteChat,

}: Props) {

  const { t } = useLanguage();



  const q = searchQuery.trim().toLowerCase();



  const filteredConversations = useMemo(() => {

    return groups.filter((group) => {

      const name = getConversationName(group, currentUserId, profiles, groupMembers, t)

        .toLowerCase();

      const latestPreview = getLatestPreview(latestMessageByGroup[group.id], currentUserId)

        .toLowerCase();



      return name.includes(q) || latestPreview.includes(q);

    });

  }, [currentUserId, groupMembers, groups, latestMessageByGroup, profiles, q, t]);



  const sortedConversations = useMemo(() => {

    return [...filteredConversations].sort((a, b) => {

      const aUnread = (unreadCounts[a.id] || 0) > 0 ? 1 : 0;

      const bUnread = (unreadCounts[b.id] || 0) > 0 ? 1 : 0;



      if (bUnread !== aUnread) {

        return bUnread - aUnread;

      }



      const bTime = getConversationSortTime(b, latestMessageByGroup);

      const aTime = getConversationSortTime(a, latestMessageByGroup);



      if (bTime !== aTime) {

        return bTime - aTime;

      }



      return a.id.localeCompare(b.id);

    });

  }, [filteredConversations, latestMessageByGroup, unreadCounts]);

  const sidebarBodyRef = useRef<HTMLDivElement>(null);
  const isDraggingSplitterRef = useRef(false);
  const hasInitializedSplitRef = useRef(false);
  const [topSectionPercent, setTopSectionPercent] = useState(62);

  const getSidebarLayoutPx = useCallback((element?: HTMLElement | null) => {
    const metricsRoot =
      element?.closest(".aixia-chat-page") ??
      sidebarBodyRef.current?.closest(".aixia-chat-page") ??
      document.documentElement;
    const styles = getComputedStyle(metricsRoot);
    const rootFontSize = parseFloat(styles.fontSize);
    const rem = (value: string, fallbackRem: number) =>
      (parseFloat(value) || fallbackRem) * rootFontSize;

    return {
      rowPx: rem(
        styles.getPropertyValue("--aixia-chat-conversation-row-height"),
        4.25
      ),
      headerPx: rem(
        styles.getPropertyValue("--aixia-chat-conversation-section-hd-height"),
        2.125
      ),
      splitterPx: rem(
        styles.getPropertyValue("--aixia-chat-sidebar-splitter-height"),
        0.75
      ),
    };
  }, []);

  const clampTopPercent = useCallback(
    (percent: number, bodyHeight: number) => {
      if (bodyHeight <= 0) return percent;

      const { rowPx, headerPx, splitterPx } = getSidebarLayoutPx();
      const minSectionPx = 2 * rowPx + headerPx;
      const minPercent = (minSectionPx / bodyHeight) * 100;
      const maxPercent =
        ((bodyHeight - splitterPx - minSectionPx) / bodyHeight) * 100;

      return Math.min(maxPercent, Math.max(minPercent, percent));
    },
    [getSidebarLayoutPx]
  );

  useEffect(() => {
    const body = sidebarBodyRef.current;
    if (!body) return;

    const syncDefaultSplit = () => {
      const bodyHeight = body.clientHeight;
      if (bodyHeight <= 0 || hasInitializedSplitRef.current) return;

      const { rowPx, headerPx } = getSidebarLayoutPx(body);
      const defaultDmPx = 5 * rowPx + headerPx;
      const defaultPercent = (defaultDmPx / bodyHeight) * 100;

      setTopSectionPercent(clampTopPercent(defaultPercent, bodyHeight));
      hasInitializedSplitRef.current = true;
    };

    syncDefaultSplit();

    const observer = new ResizeObserver(() => {
      const bodyHeight = body.clientHeight;
      if (bodyHeight <= 0) return;

      if (!hasInitializedSplitRef.current) {
        syncDefaultSplit();
        return;
      }

      setTopSectionPercent((current) =>
        clampTopPercent(current, bodyHeight)
      );
    });

    observer.observe(body);
    return () => observer.disconnect();
  }, [clampTopPercent, getSidebarLayoutPx]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isDraggingSplitterRef.current) return;

      const body = sidebarBodyRef.current;
      if (!body) return;

      const rect = body.getBoundingClientRect();
      const nextPercent =
        ((event.clientY - rect.top) / rect.height) * 100;

      setTopSectionPercent(clampTopPercent(nextPercent, rect.height));
    };

    const handleMouseUp = () => {
      if (!isDraggingSplitterRef.current) return;
      isDraggingSplitterRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [clampTopPercent]);

  const handleSplitterMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    isDraggingSplitterRef.current = true;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  };

  const directConversations = sortedConversations.filter(

    (group) => group.type === "DIRECT"

  );



  const groupChats = sortedConversations.filter((group) => group.type !== "DIRECT");



  const canDeleteChat = (group: ChatGroupRow) => {

    if (!currentUserId) return false;



    if (currentUserRole === "admin") {

      return true;

    }



    if (group.type === "DIRECT") {

      return groupMembers.some(

        (member) =>

          member.group_id === group.id && member.user_id === currentUserId

      );

    }



    return group.created_by === currentUserId;

  };



  const renderConversationButton = (group: ChatGroupRow) => {

    const iconType =

      group.type === "PROJECT"

        ? "project"

        : group.type === "TASK"

          ? "task"

          : group.type === "GROUP"

            ? "group"

            : null;



    const unreadCount = unreadCounts[group.id] || 0;

    const hasUnread = unreadCount > 0 && selectedConversationId !== group.id;

    const preview = getLatestPreview(latestMessageByGroup[group.id], currentUserId);

    const canDelete = canDeleteChat(group);

    const isActive = selectedConversationId === group.id;



    return (

      <div

        key={group.id}

        className={`aixia-chat-conversation-item ${

          isActive

            ? "aixia-chat-conversation-item--active"

            : hasUnread

              ? "aixia-chat-conversation-item--unread"

              : ""

        }`}

      >

        <div className="flex items-center gap-3 p-3">

          <button

            type="button"

            onClick={() => onOpenConversation(group.id)}

            className="flex min-w-0 flex-1 items-center gap-3 text-left"

          >

            {iconType ? (

              <div className="aixia-chat-conversation-icon">

                {iconType === "project" && <FolderKanban className="h-5 w-5" />}

                {iconType === "task" && <CheckSquare className="h-5 w-5" />}

                {iconType === "group" && <Users className="h-5 w-5" />}

              </div>

            ) : (

              <span className="aixia-projects-member-tile-avatar shrink-0">

                {getConversationInitials(

                  group,

                  currentUserId,

                  profiles,

                  groupMembers,

                  t

                )}

              </span>

            )}



            <span className="aixia-projects-member-tile-meta min-w-0 flex-1">

              <span

                className={`aixia-dash-list-row-title truncate ${

                  hasUnread ? "font-semibold" : ""

                }`}

              >

                {getConversationName(

                  group,

                  currentUserId,

                  profiles,

                  groupMembers,

                  t

                )}

              </span>

              <span className="aixia-dash-list-row-meta truncate">{preview ||

                  t("chat.sidebar.participantsCount", undefined, {

                    total: getMembersForGroup(groupMembers, group.id).length,

                  })}</span>

            </span>

          </button>



          <div className="flex shrink-0 items-center gap-2 self-center">

            {hasUnread ? (

              <span className="aixia-chat-unread-badge">

                {unreadCount > 99 ? "99+" : unreadCount}

              </span>

            ) : null}



            {canDelete ? (

              <Button

                variant="ghost"

                size="icon"

                className="shrink-0 text-muted-foreground hover:text-red-400"

                onClick={() => onDeleteChat(group)}

                disabled={groupActionLoading === group.id}

              >

                <Trash2 className="h-4 w-4" />

              </Button>

            ) : null}

          </div>

        </div>

      </div>

    );

  };



  const renderConversationSection = (

    title: string,

    conversations: ChatGroupRow[],

    emptyLabel: string,

    sectionClassName: string,

    sectionStyle?: CSSProperties

  ) => (

    <div

      className={`aixia-chat-conversations aixia-chat-sidebar-section ${sectionClassName}`}

      style={sectionStyle}

    >

      <div className="aixia-chat-conversations-section-hd">{title}</div>

      <div className="aixia-chat-sidebar-section-scroll">

        <div className="space-y-1 p-2">

          {conversations.length > 0 ? (

            conversations.map((group) => renderConversationButton(group))

          ) : (

            <div className="px-2 py-6 text-center text-sm aixia-projects-muted">

              {emptyLabel}

            </div>

          )}

        </div>

      </div>

    </div>

  );



  return (

    <aside className="aixia-chat-panel aixia-chat-panel--sidebar aixia-dash-panel aixia-dash-glass aixia-projects-panel-card flex min-h-0 flex-col">

      <div className="aixia-chat-panel-hd space-y-3">

        <div className="relative">

          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input

            placeholder={t("chat.sidebar.searchPlaceholder")}

            value={searchQuery}

            onChange={(e) => onSearchChange(e.target.value)}

            className="aixia-projects-input pl-10"

          />

        </div>



        <Button

          onClick={onOpenCreateGroup}

          className="aixia-dash-action aixia-dash-action--primary h-9 w-full"

        >

          <Plus className="mr-2 h-4 w-4" />

          {t("chat.sidebar.newGroupChat")}

        </Button>

      </div>



      <div
        ref={sidebarBodyRef}
        className="aixia-chat-panel-body aixia-chat-sidebar-body aixia-chat-sidebar-body--split"
      >
        {renderConversationSection(
          t("chat.sidebar.directMessages"),
          directConversations,
          "No direct messages",
          "aixia-chat-sidebar-section--dm",
          { flex: `0 0 ${topSectionPercent}%` }
        )}

        <div
          role="separator"
          aria-orientation="horizontal"
          aria-valuenow={Math.round(topSectionPercent)}
          tabIndex={0}
          className="aixia-chat-conversations-splitter"
          onMouseDown={handleSplitterMouseDown}
        />

        {renderConversationSection(
          t("chat.sidebar.groupChats"),
          groupChats,
          "No group chats",
          "aixia-chat-sidebar-section--group",
          { flex: "1 1 0", minHeight: 0 }
        )}
      </div>

    </aside>

  );

}


