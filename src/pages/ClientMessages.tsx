import { useEffect, useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MoreVertical, Send, Smile, Star, Download, Paintbrush } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

const ClientMessages: React.FC = () => {
  const { currentUser, profile } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme-preference');
      if (saved === 'light' || saved === 'dark') {
        return saved === 'dark';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [contacts, setContacts] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const emojiButtonRef = useRef<HTMLButtonElement | null>(null);
  const emojiPanelRef = useRef<HTMLDivElement | null>(null);
  const [chatTheme, setChatTheme] = useState<{bg?:string}>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const bgInputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Listen for theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  const getInitials = (u: any) => {
    const name = (u?.displayName || u?.username || u?.email || u?.uid || '').toString().trim();
    if (!name) return '';
    const parts = name.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (name.includes('@')) {
      const local = name.split('@')[0];
      return (local[0] + (local[1] || '')).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const renderAvatar = (u: any, size = 'h-10 w-10') => {
    const initials = getInitials(u);
    if (u?.avatar) {
      return <img src={u.avatar} alt={u.displayName || u.email || 'avatar'} className={`${size} rounded-full object-cover`} />;
    }
    return (
      <div className={`${size} rounded-full bg-teal-600 text-white flex items-center justify-center font-semibold`}>{initials}</div>
    );
  };

  // Load contacts based on user role - CRITICAL FOR SECURITY
  useEffect(() => {
    if (!currentUser) return;
    
    // Wait for profile to load before setting up contacts
    if (!profile || !profile.role) return;

    console.log('Setting up contacts for role:', profile.role, 'user:', currentUser.uid);

    let unsubUsers: any = null;

    // CASE 1: Client can only chat with their assigned admin
    if (profile.role === 'client') {
      console.log('Client setup - createdBy:', profile.createdBy);
      
      if (!profile.createdBy) {
        // No admin assigned yet
        const me = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email || 'Me', isMe: true, avatar: profile?.avatar };
        setContacts([me]);
        return;
      }

      // Load the specific admin document
      unsubUsers = onSnapshot(
        doc(firestore, 'users', profile.createdBy),
        (snap) => {
          const me = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email || 'Me', isMe: true, avatar: profile?.avatar };
          if (snap.exists()) {
            const adminData = { uid: snap.id, ...(snap.data() as any) };
            setContacts([me, adminData]);
            console.log('Client contacts loaded: self + admin', adminData.displayName);
          } else {
            setContacts([me]);
            console.log('Client contacts: admin not found');
          }
        },
        (error) => console.error('Client contacts error:', error)
      );

    }
    // CASE 2: Admin can only chat with their assigned clients
    else if (profile.role === 'admin') {
      console.log('Admin setup - looking for clients created by:', currentUser.uid);
      
      const clientsQuery = query(
        collection(firestore, 'users'),
        where('createdBy', '==', currentUser.uid),
        where('role', '==', 'client')
      );

      unsubUsers = onSnapshot(
        clientsQuery,
        (snap) => {
          const clients = snap.docs.map((d) => ({ uid: d.id, ...(d.data() as any) }));
          const me = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email || 'Me', isMe: true, avatar: profile?.avatar };
          const allContacts = [me, ...clients];
          setContacts(allContacts);
          console.log('Admin contacts loaded: self + ', clients.length, ' clients');
        },
        (error) => console.error('Admin contacts error:', error)
      );
    }

    return () => {
      if (unsubUsers) unsubUsers();
    };
  }, [currentUser, profile?.role, profile?.createdBy]);

  // Update contacts with message summaries (last message, unread count, timestamp)
  useEffect(() => {
    if (!currentUser) return;

    const msgsQuery = query(
      collection(firestore, 'messages'),
      where('participants', 'array-contains', currentUser.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubMsgs = onSnapshot(msgsQuery, (snap) => {
      // Build summaries from messages
      const summaries: Record<string, { lastMessage?: string; lastTimestamp?: any; unreadCount: number }> = {};
      snap.docs.forEach((d) => {
        const m = d.data() as any;
        const other = Array.isArray(m.participants) 
          ? m.participants.find((p: string) => p !== currentUser.uid)
          : (m.from === currentUser.uid ? m.to : m.from);
        if (!other) return;
        if (!summaries[other]) summaries[other] = { lastMessage: '', lastTimestamp: null, unreadCount: 0 };
        if (!summaries[other].lastMessage) {
          summaries[other].lastMessage = m.messageType === 'file' 
            ? `[file] ${m.content || (m.file && m.file.name) || ''}` 
            : (m.content || '');
          summaries[other].lastTimestamp = m.timestamp;
        }
        if (m.to === currentUser.uid && m.from === other && m.read !== true) {
          summaries[other].unreadCount = (summaries[other].unreadCount || 0) + 1;
        }
      });

      // Merge summaries into current contacts
      setContacts((prev) => {
        const merged = prev.map((c) => ({
          ...c,
          lastMessage: summaries[c.uid]?.lastMessage,
          lastTimestamp: summaries[c.uid]?.lastTimestamp,
          unreadCount: summaries[c.uid]?.unreadCount || 0
        }));

        // Keep self first, sort others by unread then timestamp
        const me = merged.find((m) => m.isMe);
        const others = merged.filter((m) => !m.isMe);
        others.sort((a, b) => {
          if ((b.unreadCount || 0) !== (a.unreadCount || 0)) 
            return (b.unreadCount || 0) - (a.unreadCount || 0);
          const at = a.lastTimestamp 
            ? (a.lastTimestamp.toDate ? a.lastTimestamp.toDate().getTime() : new Date(a.lastTimestamp).getTime())
            : 0;
          const bt = b.lastTimestamp
            ? (b.lastTimestamp.toDate ? b.lastTimestamp.toDate().getTime() : new Date(b.lastTimestamp).getTime())
            : 0;
          return bt - at;
        });

        return me ? [me, ...others] : others;
      });
    }, (e) => console.warn('messages summaries error', e));

    return () => unsubMsgs();
  }, [currentUser]);

  // messages listener for selected conversation - prefer convoId query for realtime accuracy
  useEffect(() => {
    if (!currentUser || !selected) {
      setMessages([]);
      return;
    }
    setMessages([]);
    const convoId = [currentUser.uid, selected.uid].sort().join('_');
    const coll = collection(firestore, 'messages');
    // prefer listening by convoId (more precise & efficient)
    // include an additional `participants` filter so security rules that
    // permit `array-contains` on participants allow this query.
    const q = query(
      coll,
      where('convoId', '==', convoId),
      where('participants', 'array-contains', currentUser.uid),
      orderBy('timestamp', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      const annotated = docs.map((m: any) => ({ ...m, timestampText: m.timestamp && m.timestamp.toDate ? m.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '' }));
      setMessages(annotated);
    }, (e) => {
      console.warn('messages listen error', e);
      toast?.error?.('Unable to load messages (check console).');
    });

    return () => unsub();
  }, [currentUser, selected]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, selected]);

  // close emoji panel when clicking outside or pressing Escape
  useEffect(() => {
    if (!showEmoji) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (emojiPanelRef.current && emojiPanelRef.current.contains(target)) return;
      if (emojiButtonRef.current && emojiButtonRef.current.contains(target)) return;
      setShowEmoji(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowEmoji(false);
    };
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [showEmoji]);

  // mark messages as read when opening a conversation
  useEffect(() => {
    if (!currentUser || !selected || !messages.length) return;
    const unread = messages.filter((m) => m.to === currentUser.uid && m.from === selected.uid && m.read !== true && m.id && !m._temp);
    unread.forEach((m) => {
      try {
        const ref = doc(firestore, 'messages', m.id);
        updateDoc(ref, { read: true }).catch(() => {});
      } catch (e) {
        // ignore
      }
    });
  }, [messages, selected, currentUser]);

  const sendMessage = async () => {
    if (!text.trim() || !currentUser || !selected) return;
    const content = text.trim();
    const convoId = [currentUser.uid, selected.uid].sort().join('_');
    // pre-create a doc ref so we can use the same id for optimistic UI
    const newRef = doc(collection(firestore, 'messages'));
    const tempId = newRef.id;
    const temp = { id: tempId, from: currentUser.uid, to: selected.uid, content, convoId, participants: [currentUser.uid, selected.uid], timestampText: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), _temp: true, pending: true };
    setMessages((s) => [...s, temp]);
    setText('');
    try {
      await setDoc(newRef, { from: currentUser.uid, to: selected.uid, content, timestamp: serverTimestamp(), participants: [currentUser.uid, selected.uid], convoId });
    } catch (e) {
      console.warn('send error', e);
      // mark temp as failed so user sees it's not persisted
      setMessages((s) => s.map((m) => m.id === tempId ? { ...m, pending: false, failed: true } : m));
      toast?.error?.('Failed to send message. It will be retried automatically.');
      // optionally implement retry later
    }
  };

  const toggleEmoji = () => setShowEmoji(s => !s);
  const insertEmoji = (em: string) => setText(t => t + em);

  const exportChat = () => {
    if (!selected) return;
    const lines = messages.map((m) => {
      const who = m.from === currentUser?.uid ? 'Me' : (selected.displayName || selected.username || selected.email || selected.uid);
      const time = m.timestampText || '';
      const content = m.content;
      return `${who} (${time}): ${content}`;
    }).join('\n');
    const blob = new Blob([`Chat with ${selected.displayName || selected.username || selected.email}\n\n${lines}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selected.uid}_chat.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBgFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as string;
      setChatTheme({ bg: `url(${data}) center/center / cover no-repeat` });
    };
    reader.readAsDataURL(f);
  };

  const toggleStar = async (m: any) => {
    try {
      if (!m.id) return;
      const starVal = !m.starred;
      setMessages(msgs => msgs.map(mm => mm.id === m.id ? { ...mm, starred: starVal } : mm));
      const ref = doc(firestore, 'messages', m.id);
      await updateDoc(ref, { starred: starVal });
    } catch (e) {
      console.warn('toggle star', e);
    }
  };

  const showStarredMessages = () => {
    if (!selected) return;
    const starred = messages.filter(m => m.starred);
    if (starred.length === 0) {
      alert('No starred messages in this conversation.');
      return;
    }
    alert(`Starred messages:\n\n${starred.map(s => s.content + ' - ' + (s.timestampText || '')).join('\n')}`);
  };

  const renderMessages = () => {
    const rows: any[] = [];
    let lastDate = '';
    for (const m of messages) {
      const ts = m.timestamp ? (m.timestamp.toDate ? m.timestamp.toDate() : new Date(m.timestamp)) : new Date();
      const date = ts.toDateString();
      if (date !== lastDate) {
        rows.push(<div key={`d-${date}`} className="flex justify-center"><span className={`text-xs px-3 py-1 rounded-full ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>{date}</span></div>);
        lastDate = date;
      }
      const isMe = m.from === currentUser?.uid;
      rows.push(
        <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
          <div className={`relative max-w-[70%] px-4 py-2 rounded-lg ${isMe ? 'bg-green-500 text-white' : isDarkMode ? 'bg-slate-700 text-slate-100' : 'bg-white text-gray-900 border border-gray-200'} shadow-sm`}>
            <button onClick={() => toggleStar(m)} title="Star" className={`absolute -top-3 right-0 p-1 rounded ${m.starred ? 'text-yellow-400' : isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
              <Star className="h-4 w-4" />
            </button>
            <div className="whitespace-pre-wrap">{m.content}</div>
            <div className="text-xs mt-1 text-right opacity-70">{m.timestampText || ''}</div>
          </div>
        </div>
      );
    }
    return rows;
  };

  return (
    <div className={`h-[calc(100vh-80px)] p-4 sm:p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-[1400px] mx-auto h-full shadow-none">
          <div className={`flex h-full border rounded-lg overflow-hidden ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            {/* Left column - contacts */}
            <div className={`w-64 sm:w-80 border-r flex flex-col ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className={`px-4 py-3 border-b flex items-center gap-2 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Conversations</h3>
              </div>
              <div className={`p-3 sticky top-0 z-10 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="relative">
                  <Search className={`absolute left-3 top-3 h-4 w-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={`pl-10 rounded-lg py-2 pr-3 focus:outline-none transition-all ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder:text-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'}`}
                    placeholder="Search or start new chat"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                <div className={isDarkMode ? 'divide-y divide-gray-700' : 'divide-y divide-gray-200'}>
                  {contacts
                    .filter(c => !c.isMe)
                    .filter(c => (c.displayName || c.username || c.email || '').toLowerCase().includes(search.toLowerCase()))
                    .map((c) => (
                    <button
                      key={c.uid}
                      onClick={() => setSelected(c)}
                      className={`w-full text-left p-3 flex items-center gap-3 transition-colors ${isDarkMode ? `${selected?.uid === c.uid ? 'bg-gray-700' : 'hover:bg-gray-700'} text-gray-100` : `${selected?.uid === c.uid ? 'bg-gray-100' : 'hover:bg-gray-50'} text-gray-900`}`}
                    >
                      <div className="h-10 w-10 flex-shrink-0">{renderAvatar(c)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className={`truncate font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{c.displayName || c.username || c.email} {c.isMe ? <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>(self)</span> : null}</div>
                        </div>
                        <div className={`text-xs truncate ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>{c.title || ''}</div>
                      </div>
                      <div className="flex-shrink-0">
                        {c.unreadCount > 0 ? (
                          <span className={`inline-flex items-center justify-center bg-red-500 text-white text-xs rounded-full h-6 w-6 ring-2 ${isDarkMode ? 'ring-gray-800' : 'ring-white'} shadow`}>{c.unreadCount > 99 ? '99+' : c.unreadCount}</span>
                        ) : (
                          <div style={{ width: 24 }} />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column - chat area */}
            <div className="flex-1 flex flex-col">
              {selected ? (
                <>
                  <div className={`px-4 py-3 border-b flex items-center justify-between ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 flex-shrink-0">{renderAvatar(selected)}</div>
                      <div>
                        <div className={`font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{selected?.displayName || selected?.email}</div>
                        <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>{selected.status || 'Active'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 relative">
                      <button onClick={() => setMenuOpen(s => !s)} className={`p-2 rounded transition-colors ${isDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}>
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {menuOpen && (
                        <div className={`absolute right-0 top-10 rounded shadow-lg w-48 z-50 ${isDarkMode ? 'bg-gray-700 border border-gray-600' : 'bg-white border border-gray-200'}`}>
                          <button onClick={() => { setMenuOpen(false); const color = prompt('Enter a background color (hex or css):',''); if (color) setChatTheme({ bg: color }); }} className={`w-full text-left px-4 py-2 flex items-center gap-2 transition-colors ${isDarkMode ? 'hover:bg-gray-600 text-gray-100' : 'hover:bg-gray-100 text-gray-900'}`}>
                            <Paintbrush className="h-4 w-4" /> Change Theme Color
                          </button>
                          <button onClick={() => { setMenuOpen(false); bgInputRef.current?.click(); }} className={`w-full text-left px-4 py-2 flex items-center gap-2 transition-colors ${isDarkMode ? 'hover:bg-gray-600 text-gray-100' : 'hover:bg-gray-100 text-gray-900'}`}>
                            <Paintbrush className="h-4 w-4" /> Change Background Image
                          </button>
                          <button onClick={() => { setMenuOpen(false); exportChat(); }} className={`w-full text-left px-4 py-2 flex items-center gap-2 transition-colors ${isDarkMode ? 'hover:bg-gray-600 text-gray-100' : 'hover:bg-gray-100 text-gray-900'}`}>
                            <Download className="h-4 w-4" /> Export Chat
                          </button>
                          <button onClick={() => { setMenuOpen(false); showStarredMessages(); }} className={`w-full text-left px-4 py-2 flex items-center gap-2 transition-colors ${isDarkMode ? 'hover:bg-gray-600 text-gray-100' : 'hover:bg-gray-100 text-gray-900'}`}>
                            <Star className="h-4 w-4" /> Starred Messages
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* messages */}
                  <div className="flex-1 p-4 overflow-hidden" style={ chatTheme.bg ? { background: chatTheme.bg } : undefined }>
                    <div ref={listRef} className={`h-full overflow-auto flex flex-col gap-3`}>
                      {renderMessages()}
                    </div>
                  </div>

                  {/* input area */}
                  <div className={`px-4 py-3 border-t relative ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center gap-3">
                      <button ref={emojiButtonRef} onClick={(e) => { e.stopPropagation(); toggleEmoji(); }} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`} title="Emoji">
                        <Smile className="h-5 w-5" />
                      </button>
                      <Input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Type a message"
                        className={`flex-1 rounded-lg py-2 px-4 focus:outline-none transition-all ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder:text-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'}`}
                        onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
                      />
                      <button onClick={sendMessage} style={{ backgroundColor: '#113738' }} className="text-white p-2 rounded-lg hover:opacity-90 transition-opacity">
                        <Send className="h-5 w-5" />
                      </button>

                      {showEmoji && (
                        <div ref={emojiPanelRef} onClick={(e) => e.stopPropagation()} className={`absolute bottom-16 right-4 rounded shadow-lg p-3 grid grid-cols-8 gap-1 z-50 ${isDarkMode ? 'bg-gray-700 border border-gray-600' : 'bg-white border border-gray-200'}`}>
                          {['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😍','😘','😎','🤔','🙌','👍','🙏'].map(em => (
                            <button key={em} onClick={() => insertEmoji(em)} className="p-1 text-lg hover:scale-110 transition-transform">{em}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className={`m-auto text-center flex flex-col items-center gap-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <img
                    src="/lbg.png"
                    alt="trustNshare light"
                    className="h-28 md:h-32 object-contain block dark:hidden"
                  />
                  <img
                    src="/bg.png"
                    alt="trustNshare"
                    className="h-28 md:h-32 object-contain hidden dark:block"
                  />
                  <div>
                    <div className={`text-lg opacity-80 mt-2 max-w-xl ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Secure File Sharing for Modern Businesses — protect sensitive data with end-to-end encryption, granular access control, and audit visibility.</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.currentTarget.files && e.currentTarget.files[0]; if (f) handleBgFile(f); e.currentTarget.value = ''; }} />
    </div>
  );
};

export default ClientMessages;
