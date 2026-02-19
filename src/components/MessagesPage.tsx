import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { Send, Edit, ArrowLeft, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface Conversation {
  id: string;
  updated_at: string;
  otherUser: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  lastMessage?: string;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export const MessagesPage = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) fetchConversations();
  }, [user]);

  useEffect(() => {
    if (!selectedConv) return;

    fetchMessages(selectedConv.id);

    const channel = supabase
      .channel(`messages:${selectedConv.id}`)
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

    if (!participantData?.length) {
      setLoading(false);
      return;
    }

    const convIds = participantData.map((p) => p.conversation_id);

    // Get all participants for these conversations
    const { data: allParticipants } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id')
      .in('conversation_id', convIds)
      .neq('user_id', user.id);

    const otherUserIds = [...new Set(allParticipants?.map((p) => p.user_id) || [])];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', otherUserIds);

    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

    // Get last messages
    const { data: convData } = await supabase
      .from('conversations')
      .select('id, updated_at')
      .in('id', convIds)
      .order('updated_at', { ascending: false });

    const { data: lastMessages } = await supabase
      .from('messages')
      .select('conversation_id, content, created_at')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false });

    const lastMsgMap: Record<string, string> = {};
    lastMessages?.forEach((m) => {
      if (!lastMsgMap[m.conversation_id]) lastMsgMap[m.conversation_id] = m.content;
    });

    const convs: Conversation[] = (convData || []).map((c) => {
      const participant = allParticipants?.find((p) => p.conversation_id === c.id);
      const otherUser = participant ? profileMap[participant.user_id] : null;
      return {
        id: c.id,
        updated_at: c.updated_at,
        otherUser: otherUser || { id: '', username: 'Unknown', avatar_url: null },
        lastMessage: lastMsgMap[c.id],
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

    await supabase.from('messages').insert({
      conversation_id: selectedConv.id,
      sender_id: user.id,
      content: newMessage.trim(),
    });

    setNewMessage('');
    setSending(false);
  };

  const startConversation = async (otherUserId: string) => {
    if (!user) return;

    // Check if conversation already exists
    const { data: myConvs } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    const myConvIds = myConvs?.map((c) => c.conversation_id) || [];

    const { data: existing } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', otherUserId)
      .in('conversation_id', myConvIds);

    let convId: string;

    if (existing && existing.length > 0) {
      convId = existing[0].conversation_id;
    } else {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({})
        .select('id')
        .single();

      if (!newConv) return;
      convId = newConv.id;

      await supabase.from('conversation_participants').insert([
        { conversation_id: convId, user_id: user.id },
        { conversation_id: convId, user_id: otherUserId },
      ]);
    }

    setShowNewChat(false);
    setSearchQuery('');
    await fetchConversations();

    // Select the conversation
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .eq('id', otherUserId)
      .single();

    if (profile) {
      setSelectedConv({ id: convId, updated_at: new Date().toISOString(), otherUser: profile });
    }
  };

  const loadUsersForSearch = async (query: string) => {
    if (!query.trim() || !user) { setAllUsers([]); return; }
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .neq('id', user.id)
      .ilike('username', `%${query}%`)
      .limit(10);
    setAllUsers(data || []);
  };

  useEffect(() => {
    loadUsersForSearch(searchQuery);
  }, [searchQuery]);

  const Avatar = ({ url, name, size = 10 }: { url: string | null; name: string; size?: number }) => (
    <div className={`w-${size} h-${size} rounded-full bg-muted overflow-hidden flex-shrink-0`}>
      {url ? (
        <img src={url} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-muted-foreground">
          {name[0]?.toUpperCase()}
        </div>
      )}
    </div>
  );

  // Mobile: show conversation list OR chat view
  // Desktop: show both side by side
  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-screen border-l border-border">
      {/* Conversation List */}
      <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-border`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-semibold">Messages</h2>
          <button onClick={() => setShowNewChat(true)} className="text-foreground hover:text-muted-foreground">
            <Edit size={20} strokeWidth={1.5} />
          </button>
        </div>

        {showNewChat && (
          <div className="border-b border-border p-3">
            <input
              autoFocus
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-sm outline-none bg-muted rounded-lg px-3 py-2 placeholder:text-muted-foreground"
            />
            {allUsers.length > 0 && (
              <div className="mt-2 space-y-1">
                {allUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => startConversation(u.id)}
                    className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Avatar url={u.avatar_url} name={u.username} size={9} />
                    <span className="text-sm font-medium">{u.username}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12 px-4 text-muted-foreground">
              <MessageCircle size={40} className="mx-auto mb-3 opacity-30" strokeWidth={1} />
              <p className="text-sm font-semibold">No messages yet</p>
              <p className="text-xs mt-1">Start a conversation by clicking the edit icon above</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConv(conv)}
                className={`flex items-center gap-3 w-full px-4 py-3 hover:bg-muted/50 transition-colors ${selectedConv?.id === conv.id ? 'bg-muted/50' : ''}`}
              >
                <Avatar url={conv.otherUser.avatar_url} name={conv.otherUser.username} size={12} />
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold truncate">{conv.otherUser.username}</p>
                  {conv.lastMessage && (
                    <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat View */}
      {selectedConv ? (
        <div className="flex flex-col flex-1">
          {/* Chat Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <button
              onClick={() => setSelectedConv(null)}
              className="md:hidden text-foreground hover:text-muted-foreground mr-1"
            >
              <ArrowLeft size={20} />
            </button>
            <Link to={`/profile/${selectedConv.otherUser.id}`}>
              <Avatar url={selectedConv.otherUser.avatar_url} name={selectedConv.otherUser.username} size={10} />
            </Link>
            <Link to={`/profile/${selectedConv.otherUser.id}`} className="font-semibold text-sm hover:opacity-70">
              {selectedConv.otherUser.username}
            </Link>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((msg) => {
              const isMe = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm ${
                      isMe
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-muted text-foreground rounded-bl-sm'
                    }`}
                  >
                    <p>{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form onSubmit={sendMessage} className="flex items-center gap-3 px-4 py-3 border-t border-border">
            <input
              type="text"
              placeholder="Message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 text-sm outline-none bg-muted rounded-full px-4 py-2 placeholder:text-muted-foreground"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!newMessage.trim() || sending}
              className="rounded-full flex-shrink-0"
            >
              <Send size={16} />
            </Button>
          </form>
        </div>
      ) : (
        <div className="hidden md:flex flex-col flex-1 items-center justify-center text-muted-foreground">
          <MessageCircle size={64} strokeWidth={1} className="mb-4 opacity-30" />
          <p className="font-semibold text-base">Your Messages</p>
          <p className="text-sm mt-1">Send private messages to a friend</p>
          <Button className="mt-4" onClick={() => setShowNewChat(true)}>Send message</Button>
        </div>
      )}
    </div>
  );
};
