import { useEffect, useState, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MessageCircle, Search, Paperclip, MoreVertical, Send, Shield, Smile, Mic, Star, Download, Paintbrush } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, doc, updateDoc } from 'firebase/firestore';
import { firestore, storage } from '@/lib/firebase';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
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
  const { currentUser } = useAuth();
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
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<any[]>([]);
  const [chatTheme, setChatTheme] = useState<{bg?:string}>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const bgInputRef = useRef<HTMLInputElement | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null); // messages scroll container

  // load contacts
  useEffect(() => {
    if (!currentUser) return;
    const load = async () => {
      try {
        const q = query(collection(firestore, 'users'), where('role', 'in', ['client', 'admin']));
        const snaps = await getDocs(q);
        const loaded = snaps.docs.map((d) => ({ uid: d.id, ...(d.data() as any) }));
        // ensure current user is pinned as a self-chat at top
        const me = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email || 'Me', isMe: true };
        // merge, removing any duplicate of current user from loaded
        const others = loaded.filter((c) => c.uid !== currentUser.uid);
        const all = [me, ...others];
        setContacts(all);
      } catch (e) {
        console.warn('load contacts', e);
      }
    };
    load();
  }, [currentUser]);

  // messages listener for selected conversation
  useEffect(() => {
    if (!currentUser || !selected) {
      setMessages([]);
      return;
    }

    // Clear messages immediately when switching conversations to avoid cross-chat temps
    setMessages([]);

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
    // optimistic
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
        await addDoc(collection(firestore, 'messages'), {
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

  // Attachment and helper utilities
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
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
          <div className={`relative max-w-[70%] px-4 py-2 rounded-lg ${isMe ? 'bg-green-500 text-white' : 'bg-white text-gray-900'} shadow-sm`}>
            <button onClick={() => toggleStar(m)} title="Star" className={`absolute -top-3 right-0 p-1 rounded ${m.starred ? 'text-yellow-400' : 'text-gray-300'}`}>
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
    <DashboardLayout>
      <div className="h-[calc(100vh-80px)] bg-gray-50 p-6">
        <div className="max-w-[1200px] mx-auto bg-transparent h-full shadow-none">
          <div className="flex h-full border rounded-lg overflow-hidden bg-white">
            {/* Left column - contacts */}
            <div className="w-80 border-r flex flex-col">
              <div className="px-4 py-3 border-b flex items-center gap-2">
                <h3 className="text-lg font-semibold">Conversations</h3>
              </div>
              <div className="p-3 sticky top-0 bg-white z-10">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" placeholder="Search or start new chat" />
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                <div className="divide-y">
                  {contacts.filter(c => (c.displayName || c.username || c.email || '').toLowerCase().includes(search.toLowerCase())).map((c) => (
                    <button key={c.uid} onClick={() => setSelected(c)} className={`w-full text-left p-3 flex items-center gap-3 hover:bg-gray-50 ${selected?.uid === c.uid ? 'bg-gray-100' : ''}`}>
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-xs">{(c.displayName || c.username || c.email || '').slice(0,2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="truncate font-medium">{c.displayName || c.username || c.email} {c.isMe ? <span className="text-xs text-muted-foreground">(self)</span> : null}</div>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{c.title || ''}</div>
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
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="text-xs">{(selected?.displayName || selected?.email || '').slice(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{selected?.displayName || selected?.email || 'Select a chat'}</div>
                    <div className="text-xs text-muted-foreground">{selected ? (selected.status || 'Active') : ''}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 relative">
                  <button onClick={() => setMenuOpen(s => !s)} className="p-2 rounded bg-transparent"><MoreVertical className="h-4 w-4" /></button>
                  {menuOpen && (
                    <div className="absolute right-0 top-10 bg-white border rounded shadow-md w-56 z-50">
                      <button onClick={() => { setMenuOpen(false); const color = prompt('Enter a background color (hex or css):',''); if (color) setChatTheme({ bg: color }); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"><Paintbrush/> Change Theme Color</button>
                      <button onClick={() => { setMenuOpen(false); bgInputRef.current?.click(); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"><Paintbrush/> Change Background Image</button>
                      <button onClick={() => { setMenuOpen(false); exportChat(); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"><Download/> Export Chat</button>
                      <button onClick={() => { setMenuOpen(false); const starred = messages.filter(m => m.starred); alert(`Starred messages:\n\n${starred.map(s=> (s.content || s.file?.name) + ' - ' + (s.timestampText||'')).join('\n')}`); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"><Star/> Starred Messages</button>
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
                        <div className="text-4xl font-bold">trustNshare</div>
                        <div className="text-lg opacity-80 mt-2 max-w-xl">Secure File Sharing for Modern Businesses — protect sensitive data with end-to-end encryption, granular access control, and audit visibility.</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* input (only show when a chat is selected) */}
              {selected && (
                <div className="px-4 py-3 border-t">
                  <div className="flex items-center gap-3">
                      <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAttachFile(f); e.currentTarget.value = ''; }} />
                      <button onClick={openAttach} className="p-2 rounded-full bg-transparent" title="Attach">
                        <Paperclip className="h-5 w-5 text-muted-foreground" />
                      </button>
                      <button onClick={toggleEmoji} className="p-2 rounded-full bg-transparent" title="Emoji">
                        <Smile className="h-5 w-5 text-muted-foreground" />
                      </button>
                      <button onClick={toggleRecording} className={`p-2 rounded-full ${recording ? 'bg-red-100' : 'bg-transparent'}`} title="Voice message">
                        <Mic className="h-5 w-5 text-muted-foreground" />
                      </button>
                      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" className="flex-1" onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }} />
                      <Button onClick={sendMessage} size="sm"><Send className="h-4 w-4" /></Button>
                      {showEmoji && (
                        <div className="absolute bottom-20 left-60 bg-white border rounded shadow p-2 grid grid-cols-8 gap-1">
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
      </div>
      {attachOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeAttach}></div>
          <div className="relative bg-white rounded-lg shadow-lg w-[640px] max-w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Share a file</h3>
              <button onClick={closeAttach} className="text-sm px-2 py-1">Close</button>
            </div>
            <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop} className={`border-dashed border-2 rounded p-8 text-center ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
              <div className="mb-2">
                <strong>Drag & drop</strong> files here, or
              </div>
              <div className="mb-4">
                <button onClick={() => fileInputRef.current?.click()} className="underline text-sm">Browse files</button>
                <input type="file" accept=".pdf,.ppt,.pptx,.doc,.docx,image/*,audio/*,video/*" className="hidden" ref={fileInputRef} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAttachFile(f); e.currentTarget.value = ''; }} />
              </div>
              <div className="text-sm text-muted-foreground">Allowed: PDF, PPT, PPTX, DOC, DOCX, images, audio, video. Max 5MB.</div>
            </div>
          </div>
        </div>
      )}
      <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBgFile(f); e.currentTarget.value = ''; }} />
    </DashboardLayout>
  );
};

export default Chat;