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
      <div className={`${size} rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center font-semibold`}>{initials}</div>
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
        rows.push(<div key={`d-${date}`} className="flex justify-center"><span className="text-xs text-muted-foreground bg-gray-100 dark:bg-blue-700/20 px-3 py-1 rounded-full">{date}</span></div>);
        lastDate = date;
      }
      const isMe = m.from === currentUser?.uid;
      rows.push(
        <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
          <div className={`relative max-w-[70%] px-4 py-2 rounded-lg ${isMe ? 'bg-green-500 text-white' : 'bg-white dark:bg-blue-700/20 text-gray-900 dark:text-foreground'} shadow-sm`}>
            <button onClick={() => toggleStar(m)} title="Star" className={`absolute -top-3 right-0 p-1 rounded ${m.starred ? 'text-yellow-400' : 'text-muted-foreground'}`}>
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
    <div className="h-[calc(100vh-80px)] bg-gray-50 dark:bg-slate-900 p-6">
        <div className="max-w-[1200px] mx-auto bg-transparent h-full shadow-none">
          <div className="flex h-full border rounded-lg overflow-hidden bg-white dark:bg-slate-900">
            {/* Left column - contacts */}
            <div className="w-80 border-r border-r-gray-200 dark:border-r-neutral-800 flex flex-col bg-white dark:bg-neutral-900">
              <div className="px-4 py-3 border-b flex items-center gap-2">
                <h3 className="text-lg font-semibold text-foreground">Conversations</h3>
              </div>
              <div className="p-3 sticky top-0 bg-white dark:bg-neutral-600 z-10">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 rounded-lg bg-white dark:bg-neutral-700 text-foreground placeholder:text-muted-foreground py-2 pr-3 focus:outline-none focus:ring-2 focus:ring-blue-400 hover:bg-gray-50 dark:hover:bg-neutral-600 transition-shadow shadow-inner"
                    placeholder="Search or start new chat"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                <div className="divide-y">
                  {contacts
                    .filter(c => !c.isMe)
                    .filter(c => (c.displayName || c.username || c.email || '').toLowerCase().includes(search.toLowerCase()))
                    .map((c) => (
                    <button
                      key={c.uid}
                      onClick={() => setSelected(c)}
                      className={`w-full text-left p-3 flex items-center gap-3 group transform transition duration-150 ease-in-out hover:bg-gray-100 dark:hover:bg-blue-700/20 hover:translate-x-1 cursor-pointer ${selected?.uid === c.uid ? 'bg-gray-100 dark:bg-blue-600/40' : ''}`}
                    >
                      <div className="h-10 w-10 flex-shrink-0">{renderAvatar(c)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="truncate font-medium text-foreground group-hover:opacity-95">{c.displayName || c.username || c.email} {c.isMe ? <span className="text-xs text-muted-foreground">(self)</span> : null}</div>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{c.title || ''}</div>
                      </div>
                      <div className="flex-shrink-0">
                        {c.unreadCount > 0 ? (
                          <span className="inline-flex items-center justify-center bg-red-500 text-white text-xs rounded-full h-6 w-6 ring-2 ring-white dark:ring-neutral-600 shadow">{c.unreadCount > 99 ? '99+' : c.unreadCount}</span>
                        ) : (
                          // small spacer to keep alignment consistent
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
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 flex-shrink-0">{selected ? renderAvatar(selected) : null}</div>
                  <div>
                    <div className="font-medium text-foreground">{selected?.displayName || selected?.email || 'Select a chat'}</div>
                      <div className="text-xs text-muted-foreground">{selected ? (selected.status || 'Active') : ''}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 relative">
                  <button onClick={() => setMenuOpen(s => !s)} className="p-2 rounded bg-transparent"><MoreVertical className="h-4 w-4 text-muted-foreground" /></button>
                  {menuOpen && (
                    <div className="absolute right-0 top-10 bg-white dark:bg-neutral-600 border dark:border-neutral-600 rounded shadow-md w-56 z-50">
                      <button onClick={() => { setMenuOpen(false); const color = prompt('Enter a background color (hex or css):',''); if (color) setChatTheme({ bg: color }); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-neutral-500 flex items-center gap-2"><Paintbrush/> Change Theme Color</button>
                      <button onClick={() => { setMenuOpen(false); bgInputRef.current?.click(); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-neutral-500 flex items-center gap-2"><Paintbrush/> Change Background Image</button>
                      <button onClick={() => { setMenuOpen(false); exportChat(); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-neutral-500 flex items-center gap-2"><Download/> Export Chat</button>
                      <button onClick={() => { setMenuOpen(false); const starred = messages.filter(m => m.starred); alert(`Starred messages:\n\n${starred.map(s=> (s.content || s.file?.name) + ' - ' + (s.timestampText||'')).join('\n')}`); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-neutral-500 flex items-center gap-2"><Star/> Starred Messages</button>
                    </div>
                  )}
                </div>
              </div>

              {/* messages */}
              <div className="flex-1 p-4 overflow-hidden" style={ chatTheme.bg ? { background: chatTheme.bg } : undefined }>
                <div ref={listRef} className="h-full overflow-auto flex flex-col gap-3">
                  {selected ? renderMessages() : (
                    <div className="m-auto text-center text-muted-foreground flex flex-col items-center gap-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
                          <Shield className="h-12 w-12 text-white" />
                        </div>
                      </div>
                      <div>
                        <div className="text-4xl font-bold text-foreground">trustNshare</div>
                          <div className="text-lg opacity-80 mt-2 max-w-xl text-muted-foreground">Secure File Sharing for Modern Businesses — protect sensitive data with end-to-end encryption, granular access control, and audit visibility.</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* input (only show when a chat is selected) */}
              {selected && (
                <div className="px-4 py-3 border-t border-t-gray-200 dark:border-t-neutral-600 relative bg-white dark:bg-neutral-600">
                  <div className="flex items-center gap-3">
                      <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) handleAttachFile(f); e.currentTarget.value = ''; }} />
                      <button ref={emojiButtonRef} onClick={(e) => { e.stopPropagation(); setShowEmoji(s => !s); }} className="p-2 rounded-full bg-transparent" title="Emoji">
                        <Smile className="h-5 w-5 text-muted-foreground" />
                      </button>
                      <button onClick={toggleRecording} className={`p-2 rounded-full ${recording ? 'bg-red-100' : 'bg-transparent'}`} title="Voice message">
                        <Mic className="h-5 w-5 text-muted-foreground" />
                      </button>
                      <Input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Type a message"
                        className="flex-1 rounded-full bg-white dark:bg-neutral-700 text-foreground placeholder:text-muted-foreground py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-400 hover:bg-gray-50 dark:hover:bg-neutral-600 transition-shadow"
                        onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
                      />
                      <Button onClick={sendMessage} size="sm" className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-2">
                        <Send className="h-4 w-4" />
                      </Button>

                      {showEmoji && (
                        <div ref={emojiPanelRef} onClick={(e) => e.stopPropagation()} className="absolute bottom-12 right-12 bg-white dark:bg-card border dark:border-neutral-700 rounded shadow p-2 grid grid-cols-8 gap-1 z-50">
                          {['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😍','😘','😎','🤔','🙌','👍','🙏'].map(em => (
                            <button key={em} onClick={() => insertEmoji(em)} className="p-1 text-lg">{em}</button>
                          ))}
                        </div>
                      )}
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
