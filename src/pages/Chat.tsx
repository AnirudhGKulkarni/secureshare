import { useEffect, useState, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
// avatar removed per user request
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MessageCircle, Search, MoreVertical, Send, Shield, Smile, Star, Download, Paintbrush, Lock } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

/**
 * WhatsApp-like Chat UI
 * - Left column: contacts with sticky search and scroll
 * - Right column: header, message area with date separators, sticky input bar
 * - Real-time messages via Firestore, optimistic send, auto-scroll
 */

const formatDate = (d?: any) => {
  if (!d) return '';
  const date = d.toDate ? d.toDate() : new Date(d);
  return date.toLocaleDateString();
};

const Chat = () => {
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
  
  useEffect(() => {
    // Listen for theme changes by observing document class changes
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    // Also apply theme to document
    document.documentElement.classList.toggle('dark', isDarkMode);
    
    return () => observer.disconnect();
  }, [isDarkMode]);
  
  const [contacts, setContacts] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [chatTheme, setChatTheme] = useState<{bg?:string}>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const bgInputRef = useRef<HTMLInputElement | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null); // messages scroll container

  // load contacts with role-based filtering
  useEffect(() => {
    if (!currentUser || !profile) return;
    const load = async () => {
      try {
        let loaded = [];
        
        // If client: load their assigning admin (from profile.createdBy)
        if (profile?.role === 'client' && profile?.createdBy) {
          console.log('[Chat.tsx] Client loading admin:', profile.createdBy);
          const adminDoc = await getDoc(doc(firestore, 'users', profile.createdBy));
          if (adminDoc.exists()) {
            const adminData = adminDoc.data();
            loaded = [{ uid: profile.createdBy, displayName: adminData.displayName || 'Admin', ...adminData }];
          }
        } 
        // If admin: load their created clients only
        else if (profile?.role === 'admin') {
          console.log('[Chat.tsx] Admin loading own clients:', currentUser.uid);
          const q = query(
            collection(firestore, 'users'),
            where('createdBy', '==', currentUser.uid),
            where('role', '==', 'client')
          );
          const snaps = await getDocs(q);
          loaded = snaps.docs.map((d) => ({ uid: d.id, ...(d.data() as any) }));
        }
        
        // Add self-chat at top
        const me = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email || 'Me', isMe: true };
        const others = loaded.filter((c) => c.uid !== currentUser.uid);
        const all = [me, ...others];
        setContacts(all);
      } catch (e) {
        console.warn('load contacts', e);
      }
    };
    load();
  }, [currentUser, profile]);

  // messages listener for selected conversation
  useEffect(() => {
    if (!currentUser || !selected) {
      setMessages([]);
      return;
    }

    // Clear messages immediately when switching conversations to avoid cross-chat temps
    setMessages([]);

    // Self Chat mode - privacy restriction: only show messages where both from and to are current user
    if (selected.isMe) {
      const coll = collection(firestore, 'messages');
      const q = query(coll, where('from', '==', currentUser.uid), where('to', '==', currentUser.uid), orderBy('timestamp', 'asc'));
      const unsub = onSnapshot(q, (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        const annotated = docs.map((m: any) => ({ ...m, timestampText: m.timestamp && m.timestamp.toDate ? m.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '' }));
        setMessages(annotated);
      }, (e) => console.warn('self-chat messages listen', e));
      return () => unsub();
    }

    const coll = collection(firestore, 'messages');
    // Query messages where current user participates (requires messages to include `participants` array)
    const q = query(coll, where('participants', 'array-contains', currentUser.uid), orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      // Filter to the selected conversation (support legacy messages without participants)
      const convo = docs.filter((m: any) => {
        if (Array.isArray(m.participants)) return m.participants.includes(selected.uid);
        return (m.from === currentUser.uid && m.to === selected.uid) || (m.from === selected.uid && m.to === currentUser.uid);
      });
      const annotated = convo.map((m: any) => ({ ...m, timestampText: m.timestamp && m.timestamp.toDate ? m.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '' }));
      setMessages(annotated);
    }, (e) => console.warn('messages listen', e));

    return () => unsub();
  }, [currentUser, selected]);

  // autoresize/scroll to bottom
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, selected]);

  const sendMessage = async () => {
    if (!text.trim() || !currentUser || !selected) return;
    const content = text.trim();
    
    // Regular message
    const convoId = [currentUser.uid, selected.uid].sort().join('_');
    const temp = { id: `temp-${Date.now()}`, from: currentUser.uid, to: selected.uid, content, convoId, participants: [currentUser.uid, selected.uid], timestampText: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), _temp: true };
    setMessages((s) => [...s, temp]);
    setText('');
    try {
      await addDoc(collection(firestore, 'messages'), { from: currentUser.uid, to: selected.uid, content, timestamp: serverTimestamp(), participants: [currentUser.uid, selected.uid], convoId });
    } catch (e) {
      console.warn('send error', e);
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

  // helpers to render date separators
  const renderMessages = () => {
    const rows: any[] = [];
    let lastDate = '';
    for (const m of messages) {
      const ts = m.timestamp ? (m.timestamp.toDate ? m.timestamp.toDate() : new Date(m.timestamp)) : new Date();
      const date = ts.toDateString();
      if (date !== lastDate) {
        rows.push(<div key={`d-${date}`} className="flex justify-center"><span className="text-xs text-muted-foreground bg-gray-100 px-3 py-1 rounded-full">{date}</span></div>);
        lastDate = date;
      }
      const isMe = m.from === currentUser?.uid;
      rows.push(
        <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
          <div className={`relative max-w-[70%] px-4 py-2 rounded-lg shadow-sm ${
            isMe 
              ? 'bg-green-500 text-white'
              : (isDarkMode ? 'bg-gray-700 text-gray-100' : 'bg-gray-100 text-gray-900')
          }`}>
            <button onClick={() => toggleStar(m)} title="Star" className={`absolute -top-3 right-0 p-1 rounded ${m.starred ? 'text-yellow-400' : 'text-muted-foreground'}`}>
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
    <DashboardLayout>
      <div className={`h-[calc(100vh-80px)] p-4 sm:p-6 ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="max-w-[1400px] mx-auto h-full shadow-none">
          <div className={`flex h-full border rounded-lg overflow-hidden ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            {/* Left column - contacts */}
            <div className={`w-64 sm:w-80 border-r flex flex-col ${
              isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
            }`}>
              <div className={`px-4 py-3 border-b flex items-center gap-2 ${
                isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
              }`}>
                <h3 className={`text-lg font-semibold ${
                  isDarkMode ? 'text-gray-100' : 'text-gray-900'
                }`}>Conversations</h3>
              </div>
              <div className={`p-3 sticky top-0 z-10 ${
                isDarkMode ? 'bg-gray-800' : 'bg-white'
              }`}>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} className={`pl-10 ${
                    isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                  }`} placeholder="Search or start new chat" />
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                <div className={isDarkMode ? 'divide-y divide-gray-700' : 'divide-y divide-gray-200'}>
                  {contacts.filter(c => (c.displayName || c.username || c.email || '').toLowerCase().includes(search.toLowerCase())).map((c) => (
                    <button key={c.uid} onClick={() => setSelected(c)} className={`w-full text-left p-3 flex items-center gap-3 transition-colors ${
                      isDarkMode 
                        ? `${selected?.uid === c.uid ? 'bg-gray-700' : 'hover:bg-gray-700'} text-gray-100` 
                        : `${selected?.uid === c.uid ? 'bg-gray-100' : 'hover:bg-gray-50'} text-gray-900`
                    }`}>
                      <div className={`h-10 w-10 flex-shrink-0 rounded-full flex items-center justify-center relative ${
                        c.isMe
                          ? (isDarkMode ? 'bg-green-600' : 'bg-green-100')
                          : (c.role === 'admin' || c.role === 'super_admin')
                            ? (isDarkMode ? 'bg-purple-600' : 'bg-purple-100')
                            : (isDarkMode ? 'bg-teal-600' : 'bg-teal-100')
                      }`}>
                        {c.isMe ? (
                          <Lock className={`h-5 w-5 ${
                            isDarkMode ? 'text-white' : 'text-green-900'
                          }`} />
                        ) : (c.role === 'admin' || c.role === 'super_admin') ? (
                          <Shield className={`h-5 w-5 ${
                            isDarkMode ? 'text-white' : 'text-purple-900'
                          }`} />
                        ) : (
                          <span className={isDarkMode ? 'text-white text-sm font-semibold' : 'text-teal-900 text-sm font-semibold'}>
                            {(c.displayName?.[0] || c.email?.[0] || 'U').toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`truncate font-medium ${
                              isDarkMode ? 'text-gray-100' : 'text-gray-900'
                            }`}>{c.displayName || c.username || c.email} {c.isMe ? <span className="text-xs text-muted-foreground">(private notes)</span> : null}</div>
                            {!c.isMe && c.role && (
                              <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded ${
                                c.role === 'admin' || c.role === 'super_admin'
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                              }`}>
                                {c.role === 'admin' || c.role === 'super_admin' ? 'Admin' : 'Client'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{c.isMe ? 'Your private space for personal notes' : (c.title || '')}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column - chat area */}
            <div className={`flex-1 flex flex-col min-w-0 ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className={`px-4 py-3 border-b flex items-center justify-between ${
                isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
              }`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-10 w-10 flex-shrink-0 rounded-full flex items-center justify-center ${
                    selected?.isMe
                      ? (isDarkMode ? 'bg-green-600' : 'bg-green-100')
                      : (selected?.role === 'admin' || selected?.role === 'super_admin')
                        ? (isDarkMode ? 'bg-purple-600' : 'bg-purple-100')
                        : (isDarkMode ? 'bg-teal-600' : 'bg-teal-100')
                  }`}>
                    {selected?.isMe ? (
                      <Lock className={`h-5 w-5 ${
                        isDarkMode ? 'text-white' : 'text-green-900'
                      }`} />
                    ) : (selected?.role === 'admin' || selected?.role === 'super_admin') ? (
                      <Shield className={`h-5 w-5 ${
                        isDarkMode ? 'text-white' : 'text-purple-900'
                      }`} />
                    ) : (
                      <span className={isDarkMode ? 'text-white text-sm font-semibold' : 'text-teal-900 text-sm font-semibold'}>
                        {(selected?.displayName?.[0] || selected?.email?.[0] || 'C').toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className={`font-medium truncate ${
                        isDarkMode ? 'text-gray-100' : 'text-gray-900'
                      }`}>{selected?.displayName || selected?.email || 'Select a chat'}</div>
                      {selected && selected.isMe && (
                        <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                          🔒 Private Notes
                        </span>
                      )}
                      {selected && !selected.isMe && selected.role && (
                        <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded ${
                          selected.role === 'admin' || selected.role === 'super_admin'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        }`}>
                          {selected.role === 'admin' || selected.role === 'super_admin' ? 'Admin' : 'Client'}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{selected ? (selected.isMe ? 'Only you can see these messages' : (selected.status || 'Active')) : ''}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 relative flex-shrink-0">
                  <button onClick={() => setMenuOpen(s => !s)} className={`p-2 rounded transition-colors ${
                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}><MoreVertical className="h-4 w-4" /></button>
                  {menuOpen && (
                    <div className={`absolute right-0 top-10 border rounded shadow-md w-56 z-50 ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                    }`}>
                      <button onClick={() => { setMenuOpen(false); const color = prompt('Enter a background color (hex or css):',''); if (color) setChatTheme({ bg: color }); }} className={`w-full text-left px-4 py-2 flex items-center gap-2 transition-colors ${
                        isDarkMode ? 'hover:bg-gray-600 text-gray-100' : 'hover:bg-gray-50 text-gray-900'
                      }`}><Paintbrush/> Change Theme Color</button>
                      <button onClick={() => { setMenuOpen(false); bgInputRef.current?.click(); }} className={`w-full text-left px-4 py-2 flex items-center gap-2 transition-colors ${
                        isDarkMode ? 'hover:bg-gray-600 text-gray-100' : 'hover:bg-gray-50 text-gray-900'
                      }`}><Paintbrush/> Change Background Image</button>
                      <button onClick={() => { setMenuOpen(false); exportChat(); }} className={`w-full text-left px-4 py-2 flex items-center gap-2 transition-colors ${
                        isDarkMode ? 'hover:bg-gray-600 text-gray-100' : 'hover:bg-gray-50 text-gray-900'
                      }`}><Download/> Export Chat</button>
                      <button onClick={() => { setMenuOpen(false); const starred = messages.filter(m => m.starred); alert(`Starred messages:\n\n${starred.map(s=> s.content + ' - ' + (s.timestampText||'')).join('\n')}`); }} className={`w-full text-left px-4 py-2 flex items-center gap-2 transition-colors ${
                        isDarkMode ? 'hover:bg-gray-600 text-gray-100' : 'hover:bg-gray-50 text-gray-900'
                      }`}><Star/> Starred Messages</button>
                    </div>
                  )}
                </div>
              </div>

              {/* messages */}
              <div className={`flex-1 p-4 overflow-hidden ${
                isDarkMode ? 'bg-gray-800' : 'bg-white'
              }`} style={ chatTheme.bg ? { background: chatTheme.bg } : undefined }>
                <div ref={listRef} className="h-full overflow-auto flex flex-col gap-3">
                  {selected ? renderMessages() : (
                    <div className="m-auto text-center text-muted-foreground flex flex-col items-center gap-6">
                      <div className="flex items-center gap-3">
                        <img src="/lbg.png" alt="trustNshare light" className="h-28 md:h-32 object-contain block dark:hidden" />
                        <img src="/bg.png" alt="trustNshare" className="h-28 md:h-32 object-contain hidden dark:block" />
                      </div>
                      <div>
                        <div className="text-lg opacity-80 mt-2 max-w-xl">Secure File Sharing for Modern Businesses — protect sensitive data with end-to-end encryption, granular access control, and audit visibility.</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* input (only show when a chat is selected) */}
              {selected && (
                <div className={`px-4 py-3 border-t ${
                  isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                }`}>
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
                      <button onClick={toggleEmoji} className={`p-2 rounded-full transition-colors flex-shrink-0 ${
                        isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                      }`} title="Emoji">
                        <Smile className="h-5 w-5 text-muted-foreground" />
                      </button>
                      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" className={`flex-1 min-w-0 ${
                        isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                      }`} onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }} />
                      <Button onClick={sendMessage} size="sm" className="flex-shrink-0 text-white" style={{ backgroundColor: '#113738' }}><Send className="h-4 w-4" /></Button>
                      {showEmoji && (
                        <div className={`absolute bottom-20 left-60 border rounded shadow p-2 grid grid-cols-8 gap-1 z-50 ${
                          isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                        }`}>
                          {['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😍','😘','😎','🤔','🙌','👍','🙏'].map(em => (
                            <button key={em} onClick={() => insertEmoji(em)} className="p-1 text-lg hover:scale-125 transition-transform">{em}</button>
                          ))}
                        </div>
                      )}
                    </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBgFile(f); e.currentTarget.value = ''; }} />
    </DashboardLayout>
  );
};

export default Chat;