import { useEffect, useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Paperclip, MoreVertical, Send, Shield, Smile, Mic, Star, Download, Paintbrush } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { firestore, storage } from '@/lib/firebase';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const emojiButtonRef = useRef<HTMLButtonElement | null>(null);
  const emojiPanelRef = useRef<HTMLDivElement | null>(null);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<any[]>([]);
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

  // load contacts (clients + admins) and subscribe to realtime message summaries
  useEffect(() => {
    if (!currentUser) return;

    // subscribe to users (clients + admins)
    const usersQuery = query(collection(firestore, 'users'), where('role', 'in', ['client', 'admin']));
    const unsubUsers = onSnapshot(usersQuery, (snap) => {
      const loaded = snap.docs.map((d) => ({ uid: d.id, ...(d.data() as any) }));
      const me = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email || 'Me', isMe: true, avatar: profile?.avatar } as any;
      const others = loaded.filter((c) => c.uid !== currentUser.uid);
      const all = [me, ...others];
      setContacts(all);
    }, (e) => console.warn('users listen', e));

    // subscribe to all messages that involve me to compute lastMessage + unread counts per contact
    const msgsQuery = query(collection(firestore, 'messages'), where('participants', 'array-contains', currentUser.uid), orderBy('timestamp', 'desc'));
    const unsubMsgs = onSnapshot(msgsQuery, (snap) => {
      // compute a map of summaries keyed by other participant uid
      const summaries: Record<string, { lastMessage?: string; lastTimestamp?: any; unreadCount: number }> = {};
      snap.docs.forEach((d) => {
        const m = d.data() as any;
        const other = Array.isArray(m.participants) ? m.participants.find((p: string) => p !== currentUser.uid) : (m.from === currentUser.uid ? m.to : m.from);
        if (!other) return;
        if (!summaries[other]) summaries[other] = { lastMessage: '', lastTimestamp: null, unreadCount: 0 };
        // last message is the most recent due to desc ordering
        if (!summaries[other].lastMessage) {
          summaries[other].lastMessage = m.messageType === 'file' ? `[file] ${m.content || (m.file && m.file.name) || ''}` : (m.content || '');
          summaries[other].lastTimestamp = m.timestamp;
        }
        // unread if message is to me and not marked read
        if (m.to === currentUser.uid && m.from === other && m.read !== true) {
          summaries[other].unreadCount = (summaries[other].unreadCount || 0) + 1;
        }
      });

      // merge summaries into contacts state and reorder so that
      // - users with unread messages appear first
      // - then by most recent message timestamp
      setContacts((prev) => {
        const merged = prev.map((c) => ({ ...c, lastMessage: summaries[c.uid]?.lastMessage, lastTimestamp: summaries[c.uid]?.lastTimestamp, unreadCount: summaries[c.uid]?.unreadCount || 0 }));
        // keep `me` (self) as its original position; sort others
        const me = merged.find(m => m.isMe);
        const others = merged.filter(m => !m.isMe);
        others.sort((a, b) => {
          // unread first
          if ((b.unreadCount || 0) !== (a.unreadCount || 0)) return (b.unreadCount || 0) - (a.unreadCount || 0);
          const at = a.lastTimestamp ? (a.lastTimestamp.toDate ? a.lastTimestamp.toDate().getTime() : new Date(a.lastTimestamp).getTime()) : 0;
          const bt = b.lastTimestamp ? (b.lastTimestamp.toDate ? b.lastTimestamp.toDate().getTime() : new Date(b.lastTimestamp).getTime()) : 0;
          return bt - at;
        });
        return me ? [me, ...others] : others;
      });
    }, (e) => console.warn('messages summary listen', e));

    return () => {
      try { unsubUsers(); } catch (e) {}
      try { unsubMsgs(); } catch (e) {}
    };
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

  const sendFile = async (file: File) => {
    if (!currentUser || !selected || !file) return;
    try {
      setUploading(true);
      const convoId = [currentUser.uid, selected.uid].sort().join('_');
      const path = `messages/${convoId}/${Date.now()}_${file.name}`;
      const sref = storageRef(storage, path);
      const uploadTask = uploadBytesResumable(sref, file);
      uploadTask.on('state_changed', null, (err) => {
        console.warn('upload err', err);
        setUploading(false);
      }, async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        // pre-create doc so optimistic UI uses same id
        const newRef = doc(collection(firestore, 'messages'));
        const tempId = newRef.id;
        setMessages((s) => [...s, { id: tempId, from: currentUser.uid, to: selected.uid, content: file.name, file: { name: file.name }, convoId, participants: [currentUser.uid, selected.uid], timestampText: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), _temp: true, pending: true, messageType: 'file' }]);
        await setDoc(newRef, {
          from: currentUser.uid,
          to: selected.uid,
          content: file.name,
          file: { url, name: file.name, type: file.type, size: file.size },
          timestamp: serverTimestamp(),
          participants: [currentUser.uid, selected.uid],
          convoId,
          messageType: 'file'
        });
        setUploading(false);
      });
    } catch (e) {
      console.warn('file send error', e);
      setUploading(false);
    }
  };

  const MAX_SIZE = 5 * 1024 * 1024;
  const allowedTypes = [
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/',
    'audio/',
    'video/'
  ];

  const isAllowedType = (file: File) => {
    if (!file.type) return false;
    return allowedTypes.some(t => t.endsWith('/') ? file.type.startsWith(t) : file.type === t);
  };

  const openAttach = () => setAttachOpen(true);
  const closeAttach = () => setAttachOpen(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleAttachFile(f);
  };

  const handleAttachFile = (f: File) => {
    if (f.size > MAX_SIZE) {
      alert('You cannot share a file more than 5MB in chat kindly use the main sharing window of Share data');
      return;
    }
    if (!isAllowedType(f)) {
      alert('This file type is not allowed in chat');
      return;
    }
    sendFile(f);
    closeAttach();
  };

  const toggleEmoji = () => setShowEmoji(s => !s);
  const insertEmoji = (em: string) => setText(t => t + em);

  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Recording not supported in this browser');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new (window as any).MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = (e: any) => audioChunksRef.current.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice_${Date.now()}.webm`, { type: blob.type });
        await sendFile(file);
      };
      mr.start();
      setRecording(true);
    } catch (err) {
      console.warn('rec start', err);
    }
  };

  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') mr.stop();
    setRecording(false);
  };

  const toggleRecording = () => {
    if (recording) stopRecording(); else startRecording();
  };

  const exportChat = () => {
    if (!selected) return;
    const lines = messages.map((m) => {
      const who = m.from === currentUser?.uid ? 'Me' : (selected.displayName || selected.username || selected.email || selected.uid);
      const time = m.timestampText || '';
      const content = m.messageType === 'file' && m.file ? `[file] ${m.file.name} -> ${m.file.url}` : m.content;
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
            {m.messageType === 'file' && m.file ? (
              <div className="flex flex-col gap-2">
                {m.file.type?.startsWith('image') ? (
                  <img src={m.file.url} alt={m.file.name} className="max-h-56 rounded" />
                ) : (
                  <a href={m.file.url} target="_blank" rel="noreferrer" className="underline">
                    {m.file.name}
                  </a>
                )}
                <div className="text-xs mt-1 text-right opacity-70">{m.timestampText || ''}</div>
              </div>
            ) : (
              <>
                <div className="whitespace-pre-wrap">{m.content}</div>
                <div className="text-xs mt-1 text-right opacity-70">{m.timestampText || ''}</div>
              </>
            )}
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
                          <button onClick={() => { setMenuOpen(false); const starred = messages.filter(m => m.starred); alert(`Starred messages:\n\n${starred.map(s=> (s.content || s.file?.name) + ' - ' + (s.timestampText||'')).join('\n')}`); }} className={`w-full text-left px-4 py-2 flex items-center gap-2 transition-colors ${isDarkMode ? 'hover:bg-gray-600 text-gray-100' : 'hover:bg-gray-100 text-gray-900'}`}>
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
                      <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) handleAttachFile(f); e.currentTarget.value = ''; }} />
                      <button ref={emojiButtonRef} onClick={(e) => { e.stopPropagation(); setShowEmoji(s => !s); }} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`} title="Emoji">
                        <Smile className="h-5 w-5" />
                      </button>
                      <button onClick={toggleRecording} className={`p-2 rounded-full transition-colors ${recording ? (isDarkMode ? 'bg-red-600' : 'bg-red-100') : ''} ${isDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`} title="Voice message">
                        <Mic className="h-5 w-5" />
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
      {/* attach modal removed to fix JSX parse error; file attach still works via hidden input */}
      <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.currentTarget.files && e.currentTarget.files[0]; if (f) handleBgFile(f); e.currentTarget.value = ''; }} />
    </div>
  );
};

export default ClientMessages;
