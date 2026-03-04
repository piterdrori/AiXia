import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { wsClient } from '@/server/websocket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  Send,
  Phone,
  Video,
  Info,
  FolderKanban,
} from 'lucide-react';
import { format } from 'date-fns';

export default function ChatPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { 
    currentUser, 
    conversations, 
    messages, 
    users, 
    sendMessage,
    createConversation,
    refreshData,
  } = useStore();

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(id || null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    refreshData();
  }, []);

  // Subscribe to new messages
  useEffect(() => {
    const handleNewMessage = () => {
      refreshData();
    };
    
    wsClient.on('message:created', handleNewMessage);
    return () => {
      wsClient.off('message:created', handleNewMessage);
    };
  }, [refreshData]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedConversationId]);

  const selectedConversation = selectedConversationId 
    ? conversations.find(c => c.id === selectedConversationId)
    : null;

  const conversationMessages = selectedConversationId 
    ? (messages[selectedConversationId] || [])
    : [];

  const filteredConversations = conversations.filter(c => {
    const otherParticipant = c.participants.find(p => p !== currentUser?.id);
    const user = otherParticipant ? users.find(u => u.id === otherParticipant) : null;
    return user?.fullName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSendMessage = () => {
    if (messageInput.trim() && selectedConversationId) {
      sendMessage(selectedConversationId, messageInput.trim());
      setMessageInput('');
    }
  };

  const getConversationName = (conversation: typeof conversations[0]) => {
    if (conversation.name) return conversation.name;
    
    const otherParticipant = conversation.participants.find(p => p !== currentUser?.id);
    const user = otherParticipant ? users.find(u => u.id === otherParticipant) : null;
    return user?.fullName || 'Unknown';
  };

  const getConversationAvatar = (conversation: typeof conversations[0]) => {
    const otherParticipant = conversation.participants.find(p => p !== currentUser?.id);
    const user = otherParticipant ? users.find(u => u.id === otherParticipant) : null;
    return user?.avatar;
  };

  const getConversationInitials = (conversation: typeof conversations[0]) => {
    const name = getConversationName(conversation);
    return name.split(' ').map(n => n[0]).join('');
  };

  const startDirectMessage = (userId: string) => {
    // Check if conversation already exists
    const existing = conversations.find(c => 
      c.type === 'DIRECT' && 
      c.participants.includes(userId) && 
      c.participants.includes(currentUser!.id)
    );
    
    if (existing) {
      setSelectedConversationId(existing.id);
      navigate(`/chat/${existing.id}`);
    } else {
      const newConv = createConversation([currentUser!.id, userId], 'DIRECT');
      setSelectedConversationId(newConv.id);
      navigate(`/chat/${newConv.id}`);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex gap-4">
      {/* Sidebar */}
      <Card className="w-80 bg-slate-900/50 border-slate-800 flex flex-col">
        <CardContent className="p-4 flex flex-col h-full">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600"
            />
          </div>

          {/* Conversations List */}
          <ScrollArea className="flex-1 -mx-2">
            <div className="space-y-1 px-2">
              {/* Direct Messages */}
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-medium text-slate-500 uppercase">Direct Messages</h3>
              </div>
              {filteredConversations
                .filter(c => c.type === 'DIRECT')
                .map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => {
                      setSelectedConversationId(conversation.id);
                      navigate(`/chat/${conversation.id}`);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                      selectedConversationId === conversation.id
                        ? 'bg-indigo-600/20 border border-indigo-500/30'
                        : 'hover:bg-slate-800/50'
                    }`}
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={getConversationAvatar(conversation)} />
                      <AvatarFallback className="bg-indigo-600 text-white">
                        {getConversationInitials(conversation)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="text-white font-medium text-sm">{getConversationName(conversation)}</p>
                      <p className="text-slate-500 text-xs truncate">
                        {conversation.lastMessageAt 
                          ? format(new Date(conversation.lastMessageAt), 'MMM d')
                          : 'No messages'
                        }
                      </p>
                    </div>
                  </button>
                ))}

              {/* Project Chats */}
              {conversations.filter(c => c.type === 'PROJECT').length > 0 && (
                <>
                  <Separator className="my-3 bg-slate-800" />
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-medium text-slate-500 uppercase">Project Chats</h3>
                  </div>
                  {conversations
                    .filter(c => c.type === 'PROJECT')
                    .map((conversation) => (
                      <button
                        key={conversation.id}
                        onClick={() => {
                          setSelectedConversationId(conversation.id);
                          navigate(`/chat/${conversation.id}`);
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                          selectedConversationId === conversation.id
                            ? 'bg-indigo-600/20 border border-indigo-500/30'
                            : 'hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                          <FolderKanban className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-white font-medium text-sm">{getConversationName(conversation)}</p>
                        </div>
                      </button>
                    ))}
                </>
              )}

              {/* Users to Message */}
              <Separator className="my-3 bg-slate-800" />
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-medium text-slate-500 uppercase">Team Members</h3>
              </div>
              {users
                .filter(u => u.id !== currentUser?.id && u.status === 'ACTIVE')
                .map((user) => (
                  <button
                    key={user.id}
                    onClick={() => startDirectMessage(user.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800/50 transition-all"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="bg-indigo-600 text-white">
                        {user.fullName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="text-white font-medium text-sm">{user.fullName}</p>
                      <p className="text-slate-500 text-xs">{user.role}</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </button>
                ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      {selectedConversation ? (
        <Card className="flex-1 bg-slate-900/50 border-slate-800 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={getConversationAvatar(selectedConversation)} />
                <AvatarFallback className="bg-indigo-600 text-white">
                  {getConversationInitials(selectedConversation)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-white font-medium">{getConversationName(selectedConversation)}</h3>
                <p className="text-slate-500 text-sm">
                  {selectedConversation.participants.length} participants
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

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {conversationMessages.map((message, index) => {
                const isOwn = message.userId === currentUser?.id;
                const user = users.find(u => u.id === message.userId);
                const showAvatar = index === 0 || conversationMessages[index - 1].userId !== message.userId;

                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
                  >
                    {showAvatar ? (
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback className="bg-indigo-600 text-white text-xs">
                          {user?.fullName?.split(' ').map(n => n[0]).join('') || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-8 flex-shrink-0" />
                    )}
                    <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                      {showAvatar && (
                        <p className="text-xs text-slate-500 mb-1">
                          {user?.fullName} • {format(new Date(message.createdAt), 'h:mm a')}
                        </p>
                      )}
                      <div
                        className={`px-4 py-2 rounded-2xl ${
                          isOwn
                            ? 'bg-indigo-600 text-white rounded-br-none'
                            : 'bg-slate-800 text-slate-200 rounded-bl-none'
                        }`}
                      >
                        <p>{message.content}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
              {conversationMessages.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-slate-500">No messages yet</p>
                  <p className="text-slate-600 text-sm">Start the conversation!</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-slate-800">
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600"
              />
              <Button 
                onClick={handleSendMessage}
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
            <p className="text-slate-500">Choose a conversation from the sidebar to start chatting</p>
          </div>
        </Card>
      )}
    </div>
  );
}
