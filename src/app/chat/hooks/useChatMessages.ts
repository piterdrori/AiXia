// useChatMessages.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { dedupeMessages, PAGE_SIZE, sortMessagesAscending, playNotificationSound, showBrowserNotification } from "../utils";
import type { ChatMessageRow, HasMoreByGroup, MessagesByGroup } from "../types";

export function useChatMessages(
  selectedConversationId: string | null,
  currentUserId: string | null,
  incrementUnread: (groupId: string, messageId: string) => void,
  moveGroupToTop: (groupId: string, lastMessage?: string) => void,
  getConversationName: (groupId: string) => string
) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedIdRef = useRef(selectedConversationId);
  const processedIds = useRef<Set<string>>(new Set());
  
  const [messages, setMessages] = useState<MessagesByGroup>({});
  const [hasMore, setHasMore] = useState<HasMoreByGroup>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);

  useEffect(() => {
    selectedIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  const getViewport = useCallback(() => {
    if (!scrollAreaRef.current) return null;
    return scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]") as HTMLDivElement | null;
  }, []);

  const isNearBottom = useCallback(() => {
    const viewport = getViewport();
    if (!viewport) return true;
    return viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= 120;
  }, [getViewport]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  const loadMessages = useCallback(async (groupId: string) => {
    if (!groupId) return;
    setIsLoading(true);
    processedIds.current.clear();

    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select(`*, attachments:chat_attachments(*)`)
        .eq("group_id", groupId)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (error) throw error;

      const msgs = sortMessagesAscending((data || []) as ChatMessageRow[]);
      msgs.forEach(m => processedIds.current.add(m.id));
      
      setMessages(prev => ({ ...prev, [groupId]: dedupeMessages(msgs) }));
      setHasMore(prev => ({ ...prev, [groupId]: (data || []).length === PAGE_SIZE }));
      
      setTimeout(() => scrollToBottom("auto"), 0);
    } catch (err) {
      console.error("Load messages error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [scrollToBottom]);

  useEffect(() => {
    if (selectedConversationId) {
      loadMessages(selectedConversationId);
    }
  }, [selectedConversationId, loadMessages]);

  const appendMessage = useCallback((groupId: string, message: ChatMessageRow) => {
    setMessages(prev => {
      const current = prev[groupId] || [];
      if (current.some(m => m.id === message.id)) return prev;
      return { ...prev, [groupId]: dedupeMessages([...current, message]) };
    });
  }, []);

  const updateMessage = useCallback((groupId: string, message: ChatMessageRow) => {
    setMessages(prev => ({
      ...prev,
      [groupId]: (prev[groupId] || []).map(m => m.id === message.id ? message : m),
    }));
  }, []);

  const deleteMessage = useCallback((groupId: string, messageId: string) => {
    setMessages(prev => ({
      ...prev,
      [groupId]: (prev[groupId] || []).filter(m => m.id !== messageId),
    }));
  }, []);

  const replaceTempMessage = useCallback((groupId: string, realMessage: ChatMessageRow) => {
    setMessages(prev => {
      const existing = prev[groupId] || [];
      const tempIdx = existing.findIndex(m => 
        m.id.startsWith("temp-") && 
        m.user_id === realMessage.user_id &&
        m.content === realMessage.content
      );
      
      if (tempIdx === -1) {
        return { ...prev, [groupId]: dedupeMessages([...existing, realMessage]) };
      }
      
      const next = [...existing];
      next[tempIdx] = realMessage;
      return { ...prev, [groupId]: dedupeMessages(next) };
    });
  }, []);

  const loadOlder = useCallback(async () => {
    if (!selectedConversationId) return;
    const current = messages[selectedConversationId] || [];
    if (current.length === 0) return;
    
    const oldest = current[0];
    const viewport = getViewport();
    const prevHeight = viewport?.scrollHeight || 0;
    const prevScroll = viewport?.scrollTop || 0;
    
    setIsLoadingOlder(true);
    
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select(`*, attachments:chat_attachments(*)`)
        .eq("group_id", selectedConversationId)
        .lt("created_at", oldest.created_at)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
        
      if (error) throw error;
      
      const older = sortMessagesAscending((data || []) as ChatMessageRow[]);
      setMessages(prev => ({
        ...prev,
        [selectedConversationId]: dedupeMessages([...older, ...(prev[selectedConversationId] || [])]),
      }));
      setHasMore(prev => ({ ...prev, [selectedConversationId]: (data || []).length === PAGE_SIZE }));
      
      setTimeout(() => {
        const newViewport = getViewport();
        if (newViewport) {
          newViewport.scrollTop = prevScroll + (newViewport.scrollHeight - prevHeight);
        }
      }, 0);
    } catch (err) {
      console.error("Load older error:", err);
    } finally {
      setIsLoadingOlder(false);
    }
  }, [selectedConversationId, messages, getViewport]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("chat-messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, (payload) => {
        if (payload.eventType === "INSERT" && payload.new) {
          const msg = payload.new as ChatMessageRow;
          const isCurrent = selectedIdRef.current === msg.group_id;
          const isOwn = msg.user_id === currentUserId;
          
          if (processedIds.current.has(msg.id)) return;
          processedIds.current.add(msg.id);
          
          if (isCurrent) {
            replaceTempMessage(msg.group_id, msg);
            if (!isOwn) {
              setHighlightedIds(prev => [...prev, msg.id]);
              setTimeout(() => setHighlightedIds(prev => prev.filter(id => id !== msg.id)), 3000);
              if (isNearBottom()) scrollToBottom();
            }
          } else {
            appendMessage(msg.group_id, msg);
            if (!isOwn) {
              incrementUnread(msg.group_id, msg.id);
              moveGroupToTop(msg.group_id, msg.content);
              playNotificationSound();
              showBrowserNotification(getConversationName(msg.group_id), msg.content);
            }
          }
        } else if (payload.eventType === "UPDATE" && payload.new) {
          const msg = payload.new as ChatMessageRow;
          updateMessage(msg.group_id, msg);
        } else if (payload.eventType === "DELETE" && payload.old) {
          const old = payload.old as ChatMessageRow;
          deleteMessage(old.group_id, old.id);
        }
      })
      .subscribe();
      
    return () => {
      channel.unsubscribe();
    };
  }, [currentUserId, incrementUnread, moveGroupToTop, getConversationName, appendMessage, updateMessage, deleteMessage, replaceTempMessage, isNearBottom, scrollToBottom]);

  const selectedMessages = useMemo(() => {
    if (!selectedConversationId) return [];
    return messages[selectedConversationId] || [];
  }, [messages, selectedConversationId]);

  return {
    messages,
    hasMoreMessages: hasMore,
    isLoadingMessages: isLoading,
    isLoadingOlder,
    selectedMessages,
    highlightedMessageIds: highlightedIds,
    scrollAreaRef,
    messagesEndRef,
    loadMessagesForGroup: loadMessages,
    handleLoadOlderMessages: loadOlder,
    appendMessageLocally: appendMessage,
    updateMessageLocally: updateMessage,
    deleteMessageLocally: deleteMessage,
    replaceTempMessageWithRealOne: replaceTempMessage,
  };
}
