import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Send, Edit, ArrowLeft, MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface Conversation {
  id: string;
  updated_at: string;
  otherUser: { id: string; username: string; avatar_url: string | null };
  lastMessage?: string;
  isOwn?: boolean;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface SearchUser {
  id: string;
  username: string;
  avatar_url: string | null;
}

const UserAvatar = ({ url, name, className = 'w-10 h-10' }: { url: string | null; name: string; className?: string }) => (
  <div className={`${className} rounded-full bg-muted overflow-hidden flex-shrink-0`}>
    {url ? (
      <img src={url} alt={name} className="w-full h-full object-cover" />
    ) : (
      <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-muted-foreground">
        {name[0]?.toUpperCase()}
      </div>
    )}
  </div>
);

export const MessagesPage = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) fetchConversations();
  }, [user]);

  // Search all users when typing in new chat modal
  useEffect(() => {
    if (!showNewChat || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .neq('id', user.id)
        .ilike('username', `%${searchQuery.trim()}%`)
        .limit(15);
      setSearchResults(data || []);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, showNewChat, user]);

  // Real-time messages for selected conversation
  useEffect(() => {
    if (!selectedConv) return;
    fetchMessages(selectedConv.id);

    const channel = supabase
      .channel(`conv:${selectedConv.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${selectedConv.id}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedConv?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    if (!user) return;

    const { data: participantData } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (!participantData?.length) { setLoading(false); return; }

    const convIds = participantData.map((p) => p.conversation_id);

    const { data: allParticipants } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id')
      .in('conversation_id', convIds)
      .neq('user_id', user.id);

    const otherUserIds = [...new Set(allParticipants?.map((p) => p.user_id) || [])];

    let profileMap: Record<string, SearchUser> = {};
    if (otherUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', otherUserIds);
      profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
    }

    const { data: convData } = await supabase
      .from('conversations')
      .select('id, updated_at')
      .in('id', convIds)
      .order('updated_at', { ascending: false });

    const { data: lastMessages } = await supabase
      .from('messages')
      .select('conversation_id, content, sender_id')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false });

    const lastMsgMap: Record<string, { content: string; isOwn: boolean }> = {};
    lastMessages?.forEach((m) => {
      if (!lastMsgMap[m.conversation_id]) {
        lastMsgMap[m.conversation_id] = { content: m.content, isOwn: m.sender_id === user.id };
      }
    });

    const convs: Conversation[] = (convData || []).map((c) => {
      const participant = allParticipants?.find((p) => p.conversation_id === c.id);
      const otherUser = participant ? profileMap[participant.user_id] : null;
      const last = lastMsgMap[c.id];
      return {
        id: c.id,
        updated_at: c.updated_at,
        otherUser: otherUser || { id: '', username: 'Unknown', avatar_url: null },
        lastMessage: last?.content,
        isOwn: last?.isOwn,
      };
    }).filter((c) => c.otherUser.id);

    setConversations(convs);
    setLoading(false);
  };

  const fetchMessages = async (convId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    setMessages(data || []);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedConv || !newMessage.trim()) return;
    setSending(true);
    const content = newMessage.trim();
    setNewMessage('');
    // Optimistically add message to UI
    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    const { data: inserted } = await supabase.from('messages').insert({
      conversation_id: selectedConv.id,
      sender_id: user.id,
      content,
    }).select('*').single();
    // Replace temp message with real one
    if (inserted) {
      setMessages((prev) => prev.map((m) => m.id === tempMsg.id ? inserted : m));
    }
    setSending(false);
    fetchConversations();
  };

  const startConversation = async (otherUser: SearchUser) => {
    if (!user) return;

    // Use atomic security-definer function to avoid RLS chicken-and-egg problem
    const { data: convId, error } = await supabase.rpc('create_conversation_with_participants', {
      other_user_id: otherUser.id,
    });

    if (error || !convId) {
      console.error('Failed to create conversation:', error);
      return;
    }

    setShowNewChat(false);
    setSearchQuery('');
    setSearchResults([]);
    const convIdStr = convId as string;
    await fetchConversations();
    const conv = { id: convIdStr, updated_at: new Date().toISOString(), otherUser };
    setSelectedConv(conv);
    // Manually fetch messages for this conversation since selectedConv may not change
    fetchMessages(convIdStr);
  };

  return (
    <div className="flex h-[calc(100svh-3.5rem)] md:h-screen">
      {/* Conversation list */}
      <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[360px] border-r border-border`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <span className="font-bold text-base">Messages</span>
          <button onClick={() => { setShowNewChat(true); setSearchQuery(''); }} className="hover:text-muted-foreground transition-colors">
            <Edit size={22} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-16 px-6 text-muted-foreground">
              <MessageCircle size={48} className="mx-auto mb-3 opacity-20" strokeWidth={1} />
              <p className="text-sm font-semibold text-foreground">No messages yet</p>
              <p className="text-xs mt-1">Start a conversation with anyone</p>
              <Button size="sm" className="mt-4" onClick={() => setShowNewChat(true)}>Send message</Button>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConv(conv)}
                className={`flex items-center gap-3 w-full px-5 py-3 hover:bg-muted/50 transition-colors text-left ${selectedConv?.id === conv.id ? 'bg-muted/40' : ''}`}
              >
                <UserAvatar url={conv.otherUser.avatar_url} name={conv.otherUser.username} className="w-12 h-12" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{conv.otherUser.username}</p>
                  {conv.lastMessage && (
                    <p className="text-xs text-muted-foreground truncate">
                      {conv.isOwn ? 'You: ' : ''}{conv.lastMessage}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      {selectedConv ? (
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <button onClick={() => setSelectedConv(null)} className="md:hidden mr-1 hover:text-muted-foreground">
              <ArrowLeft size={20} />
            </button>
            <Link to={`/profile/${selectedConv.otherUser.id}`} className="flex items-center gap-3 flex-1 min-w-0">
              <UserAvatar url={selectedConv.otherUser.avatar_url} name={selectedConv.otherUser.username} className="w-10 h-10" />
              <p className="font-semibold text-sm">{selectedConv.otherUser.username}</p>
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
            {messages.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <UserAvatar url={selectedConv.otherUser.avatar_url} name={selectedConv.otherUser.username} className="w-16 h-16 mx-auto mb-3" />
                <p className="font-semibold text-sm text-foreground">{selectedConv.otherUser.username}</p>
                <p className="text-xs mt-1">Say hi! 👋</p>
              </div>
            )}
            {messages.map((msg) => {
              const isMe = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMe ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted text-foreground rounded-bl-md'
                  }`}>
                    <p>{msg.content}</p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="flex items-center gap-3 px-4 py-3 border-t border-border">
            <input
              type="text"
              placeholder="Message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 text-sm outline-none bg-muted rounded-full px-4 py-2.5 placeholder:text-muted-foreground"
            />
            {newMessage.trim() && (
              <Button type="submit" size="icon" disabled={sending} className="rounded-full flex-shrink-0">
                <Send size={16} />
              </Button>
            )}
          </form>
        </div>
      ) : (
        <div className="hidden md:flex flex-col flex-1 items-center justify-center text-muted-foreground gap-2">
          <MessageCircle size={64} strokeWidth={1} className="opacity-20 mb-2" />
          <p className="font-semibold text-lg text-foreground">Your Messages</p>
          <p className="text-sm">Send private messages to anyone.</p>
          <Button className="mt-3" onClick={() => setShowNewChat(true)}>Send message</Button>
        </div>
      )}

      {/* New chat modal */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowNewChat(false)}>
          <div className="bg-background rounded-xl w-full max-w-sm shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="font-semibold">New message</p>
              <button onClick={() => setShowNewChat(false)}><X size={18} /></button>
            </div>
            <div className="p-3 border-b border-border">
              <input
                autoFocus
                type="text"
                placeholder="Search by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm outline-none bg-muted rounded-lg px-3 py-2 placeholder:text-muted-foreground"
              />
            </div>
            <div className="max-h-72 overflow-y-auto">
              {!searchQuery.trim() ? (
                <p className="text-center text-sm text-muted-foreground py-8">Type a username to search</p>
              ) : searchResults.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No users found</p>
              ) : (
                searchResults.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => startConversation(u)}
                    className="flex items-center gap-3 w-full px-4 py-3 hover:bg-muted transition-colors"
                  >
                    <UserAvatar url={u.avatar_url} name={u.username} className="w-10 h-10" />
                    <span className="text-sm font-medium">{u.username}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
