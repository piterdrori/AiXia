import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  registerRealtimeChannel,
  removeRealtimeChannel,
} from "@/lib/realtime";
import {
  dedupeMessages,
  NEAR_BOTTOM_PX,
  PAGE_SIZE,
  sortMessagesAscending,
} from "../utils";
import type {
  ChatAttachmentRow,
  ChatMessageReadRow,
  ChatMessageRow,
  HasMoreByGroup,
  MessagesByGroup,
} from "../types";

export function useChatMessages(selectedConversationId: string | null) {
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const selectedConversationIdRef = useRef<string | null>(selectedConversationId);
  const suppressNextAutoScrollRef = useRef(false);
  const shouldScrollToBottomRef = useRef(false);

  const [messages, setMessages] = useState<MessagesByGroup>({});
  const [hasMoreMessages, setHasMoreMessages] = useState<HasMoreByGroup>({});
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const loadingGroupRef = useRef<string | null>(null);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
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

  const fetchMessageById = useCallback(async (messageId: string) => {
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
  const fetchMessageById = useCallback(async (messageId: string) => {
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
        ),
        reads:chat_message_reads(
          message_id,
          group_id,
          user_id,
          read_at
        )
      `)
      .eq("id", messageId)
      .single();

    if (error || !data) {
      throw new Error(error?.message || "Failed to fetch message.");
    }

    return {
      ...data,
      attachments: ((data as any).attachments || []) as ChatAttachmentRow[],
      reads: ((data as any).reads || []) as ChatMessageReadRow[],
    } as ChatMessageRow;
  }, []);

  const loadMessagesForGroup = useCallback(
    async (groupId: string) => {
      if (!groupId) return;
      if (loadingGroupRef.current === groupId) return;

      loadingGroupRef.current = groupId;
      setIsLoadingMessages(true);

      try {
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
            ),
            reads:chat_message_reads(
              message_id,
              group_id,
              user_id,
              read_at
            )
          `)
          .eq("group_id", groupId)
          .order("created_at", { ascending: false })
          .limit(PAGE_SIZE);

        if (error) {
          throw new Error(error.message || "Failed to load messages.");
        }

        const newestMessages = sortMessagesAscending((data || []) as ChatMessageRow[]);

        setMessages((prev) => ({
          ...prev,
          [groupId]: dedupeMessages(newestMessages),
        }));

        setHasMoreMessages((prev) => ({
          ...prev,
          [groupId]: (data || []).length === PAGE_SIZE,
        }));

        shouldScrollToBottomRef.current = true;

        requestAnimationFrame(() => {
          scrollToBottom("auto");
        });
      } catch (err) {
        console.error("Load messages error:", err);
      } finally {
        if (loadingGroupRef.current === groupId) {
          loadingGroupRef.current = null;
        }
        setIsLoadingMessages(false);
      }
    },
    [scrollToBottom]
  );

  useEffect(() => {
    if (!selectedConversationId) return;

    void loadMessagesForGroup(selectedConversationId);
  }, [selectedConversationId, loadMessagesForGroup]);

  const appendMessageLocally = useCallback((groupId: string, message: ChatMessageRow) => {
    setMessages((prev) => {
      const current = prev[groupId] || [];
      const exists = current.some((item) => item.id === message.id);
      if (exists) return prev;

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

      if (!exists) {
        return {
          ...prev,
          [groupId]: dedupeMessages([...current, message]),
        };
      }

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
          return {
            ...prev,
            [groupId]: dedupeMessages([...existing, realMessage]),
          };
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

  const handleLoadOlderMessages = useCallback(async () => {
    if (!selectedConversationId) return;

    const currentMessages = messages[selectedConversationId] || [];
    if (currentMessages.length === 0) return;

    const oldestMessage = currentMessages[0];
    const viewport = getScrollViewport();
    const previousScrollHeight = viewport?.scrollHeight || 0;
    const previousScrollTop = viewport?.scrollTop || 0;

    setIsLoadingOlder(true);

    try {
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
          ),
          reads:chat_message_reads(
            message_id,
            group_id,
            user_id,
            read_at
          )
        `)
        .eq("group_id", selectedConversationId)
        .lt("created_at", oldestMessage.created_at)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (error) {
        throw new Error(error.message || "Failed to load older messages.");
      }

      const olderBatch = sortMessagesAscending((data || []) as ChatMessageRow[]);
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
        [selectedConversationId]: (data || []).length === PAGE_SIZE,
      }));

      requestAnimationFrame(() => {
        const nextViewport = getScrollViewport();
        if (!nextViewport) return;

        const newScrollHeight = nextViewport.scrollHeight;
        const heightDiff = newScrollHeight - previousScrollHeight;
        nextViewport.scrollTop = previousScrollTop + heightDiff;
      });
    } catch (err) {
      console.error("Load older messages error:", err);
    } finally {
      setIsLoadingOlder(false);
    }
  }, [getScrollViewport, messages, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) return;

    const groupId = selectedConversationId;
    const shouldStayAtBottomForInsert = () => isViewportNearBottom();

    const messageChannelKey = `chat-messages:${groupId}`;
    const attachmentChannelKey = `chat-attachments:${groupId}`;
    const readChannelKey = `chat-message-reads:${groupId}`;

    registerRealtimeChannel(
      messageChannelKey,
      supabase
        .channel(messageChannelKey)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "chat_messages",
            filter: `group_id=eq.${groupId}`,
          },
          async (payload) => {
            try {
              if (payload.eventType === "INSERT" && payload.new) {
                const shouldScroll = shouldStayAtBottomForInsert();
                const messageId = (payload.new as { id?: string }).id;

                if (!messageId) return;

                const fullMessage = await fetchMessageById(messageId);

                replaceTempMessageWithRealOne(groupId, fullMessage);

                if (shouldScroll) {
                  shouldScrollToBottomRef.current = true;
                }
                return;
              }

              if (payload.eventType === "UPDATE" && payload.new) {
                const messageId = (payload.new as { id?: string }).id;
                if (!messageId) return;

                const fullMessage = await fetchMessageById(messageId);
                updateMessageLocally(groupId, fullMessage);
                return;
              }

              if (payload.eventType === "DELETE" && payload.old) {
                deleteMessageLocally(
                  groupId,
                  (payload.old as { id: string }).id
                );
              }
            } catch (error) {
              console.error("Realtime chat_messages error:", error);
            }
          }
        )
        .subscribe()
    );

    registerRealtimeChannel(
      attachmentChannelKey,
      supabase
        .channel(attachmentChannelKey)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "chat_attachments",
            filter: `group_id=eq.${groupId}`,
          },
          async (payload) => {
            try {
              const messageId =
                (payload.new as { message_id?: string } | null)?.message_id ||
                (payload.old as { message_id?: string } | null)?.message_id;

              if (!messageId) return;

              const fullMessage = await fetchMessageById(messageId);
              updateMessageLocally(groupId, fullMessage);

              if (isViewportNearBottom()) {
                shouldScrollToBottomRef.current = true;
              }
            } catch (error) {
              console.error("Realtime chat_attachments error:", error);
            }
          }
        )
        .subscribe()
    );

    registerRealtimeChannel(
      readChannelKey,
      supabase
        .channel(readChannelKey)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "chat_message_reads",
            filter: `group_id=eq.${groupId}`,
          },
          async (payload) => {
            try {
              const messageId =
                (payload.new as { message_id?: string } | null)?.message_id ||
                (payload.old as { message_id?: string } | null)?.message_id;

              if (!messageId) return;

              const fullMessage = await fetchMessageById(messageId);
              updateMessageLocally(groupId, fullMessage);
            } catch (error) {
              console.error("Realtime chat_message_reads error:", error);
            }
          }
        )
        .subscribe()
    );

    return () => {
      void removeRealtimeChannel(messageChannelKey);
      void removeRealtimeChannel(attachmentChannelKey);
      void removeRealtimeChannel(readChannelKey);
    };
  }, [
    deleteMessageLocally,
    fetchMessageById,
    isViewportNearBottom,
    replaceTempMessageWithRealOne,
    selectedConversationId,
    updateMessageLocally,
  ]);

  const selectedMessages = useMemo(() => {
    if (!selectedConversationId) return [];
    return messages[selectedConversationId] || [];
  }, [messages, selectedConversationId]);

  useEffect(() => {
    if (suppressNextAutoScrollRef.current) {
      suppressNextAutoScrollRef.current = false;
      return;
    }

    if (!shouldScrollToBottomRef.current) return;
    if (isLoadingOlder) return;

    shouldScrollToBottomRef.current = false;

    requestAnimationFrame(() => {
      scrollToBottom("smooth");
    });
  }, [isLoadingOlder, selectedMessages.length, scrollToBottom]);

  return {
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
  };
}
