import { useEffect, useState, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MessageCircle, Search, Phone, Video, MoreVertical, Send } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
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
  const { currentUser } = useAuth();
  const [contacts, setContacts] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');

  const listRef = useRef<HTMLDivElement | null>(null); // messages scroll container

  // load contacts
  useEffect(() => {
    if (!currentUser) return;
    const load = async () => {
      try {
        const q = query(collection(firestore, 'users'), where('role', 'in', ['client', 'admin']));
        const snaps = await getDocs(q);
        const loaded = snaps.docs.map((d) => ({ uid: d.id, ...(d.data() as any) }));
        setContacts(loaded);
        if (!selected && loaded.length) setSelected(loaded[0]);
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

    const coll = collection(firestore, 'messages');
    const q = query(coll, where('from', 'in', [currentUser.uid, selected.uid]), orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      const convo = docs.filter((m: any) => (m.from === currentUser.uid && m.to === selected.uid) || (m.from === selected.uid && m.to === currentUser.uid));
      // annotate timestampText
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
    const temp = { id: `temp-${Date.now()}`, from: currentUser.uid, to: selected.uid, content, timestampText: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), _temp: true };
    setMessages((s) => [...s, temp]);
    setText('');
    try {
      await addDoc(collection(firestore, 'messages'), { from: currentUser.uid, to: selected.uid, content, timestamp: serverTimestamp() });
    } catch (e) {
      console.warn('send error', e);
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
      rows.push(
        <div key={m.id} className={`flex ${m.from === currentUser?.uid ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[70%] px-4 py-2 rounded-lg ${m.from === currentUser?.uid ? 'bg-green-500 text-white' : 'bg-white text-gray-900'} shadow-sm`}>
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
                  {contacts.filter(c => (c.displayName || c.email || '').toLowerCase().includes(search.toLowerCase())).map((c) => (
                    <button key={c.uid} onClick={() => setSelected(c)} className={`w-full text-left p-3 flex items-center gap-3 hover:bg-gray-50 ${selected?.uid === c.uid ? 'bg-gray-100' : ''}`}>
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-xs">{(c.displayName || c.email || '').slice(0,2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="truncate font-medium">{c.displayName || c.email}</div>
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
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm"><Phone className="h-4 w-4" /></Button>
                  <Button variant="outline" size="sm"><Video className="h-4 w-4" /></Button>
                  <Button variant="outline" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                </div>
              </div>

              {/* messages */}
              <div className="flex-1 bg-[linear-gradient(180deg,#f3f6f9,transparent)] p-4 overflow-hidden">
                <div ref={listRef} className="h-full overflow-auto flex flex-col gap-3">
                  {selected ? renderMessages() : (
                    <div className="m-auto text-center text-muted-foreground">Select a conversation to start chatting</div>
                  )}
                </div>
              </div>

              {/* input */}
              <div className="px-4 py-3 border-t">
                <div className="flex items-center gap-3">
                  <button className="p-2 rounded-full bg-transparent"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-2.197 2.197a2.121 2.121 0 01-3 0l-1.06-1.06a2.121 2.121 0 010-3l2.197-2.197M15 12l6 6" /></svg></button>
                  <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" className="flex-1" onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }} />
                  <Button onClick={sendMessage} size="sm"><Send className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Chat;