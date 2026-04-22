import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../AuthContext';
import { MessageSquare, Send, XCircle, Paperclip } from 'lucide-react';

function readAttachment(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    if (file.size > 700 * 1024) {
      reject(new Error('Attachment must be under 700KB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve({
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      dataUrl: String(reader.result || '')
    });
    reader.onerror = () => reject(new Error('Failed to read attachment.'));
    reader.readAsDataURL(file);
  });
}

function AttachmentList({ attachments }: { attachments?: any[] }) {
  if (!attachments?.length) return null;
  return (
    <div className="mt-3 space-y-2">
      {attachments.map((file, index) => (
        <a
          key={`${file.name}-${index}`}
          href={file.dataUrl || file.url}
          download={file.name}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs hover:bg-black/30"
        >
          <Paperclip className="w-3.5 h-3.5" />
          <span className="truncate">{file.name || 'Attachment'}</span>
        </a>
      ))}
    </div>
  );
}

export default function AdminTickets() {
  const { user, profile } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [filter, setFilter] = useState('active'); // active, closed, all
  const [loading, setLoading] = useState(true);
  const msgInitLoad = React.useRef(true);

  const selectedTicket = tickets.find(t => t.id === selectedTicketId) || null;

  const playNotificationSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(() => {});
    } catch (e) {}
  };

  useEffect(() => {
    const q = query(collection(db, 'tickets'), orderBy('updatedAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const t = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTickets(t);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!selectedTicketId) return;
    msgInitLoad.current = true;
    const q = query(collection(db, `tickets/${selectedTicketId}/messages`), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      if (!msgInitLoad.current) {
        const changes = snap.docChanges();
        const hasNewMsg = changes.some(c => c.type === 'added' && c.doc.data().senderId !== user?.uid);
        if (hasNewMsg) playNotificationSound();
      }
      msgInitLoad.current = false;
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [selectedTicketId, user?.uid]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && attachments.length === 0) || !selectedTicket || !user) return;

    try {
      await addDoc(collection(db, `tickets/${selectedTicket.id}/messages`), {
        text: newMessage,
        attachments,
        senderId: user.uid,
        senderName: profile?.displayName || 'Support',
        isAdmin: true,
        createdAt: Date.now()
      });
      
      await updateDoc(doc(db, 'tickets', selectedTicket.id), {
        updatedAt: Date.now(),
        lastMessage: newMessage || `${attachments.length} attachment(s)`,
        status: 'active' // Re-open if it was closed and admin replies
      });
      
      setNewMessage('');
      setAttachments([]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;
    try {
      await updateDoc(doc(db, 'tickets', selectedTicket.id), {
        status: 'closed',
        updatedAt: Date.now()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6 text-white pb-6">
      {/* Ticket List */}
      <div className="w-1/3 bg-[#161d2b] border border-[#222b3d] rounded-xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-[#222b3d] bg-[#1a2332] flex justify-between items-center">
          <h2 className="font-bold text-lg">Tickets</h2>
          <select 
            value={filter} 
            onChange={e => setFilter(e.target.value)}
            className="bg-[#0f172a] border border-[#222b3d] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="all">All Tickets</option>
          </select>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
              <MessageSquare className="w-8 h-8 text-slate-600" />
              <p>No tickets found.</p>
            </div>
          ) : (
            filteredTickets.map(ticket => (
              <div 
                key={ticket.id}
                onClick={() => setSelectedTicketId(ticket.id)}
                className={`p-4 border-b border-[#222b3d] cursor-pointer transition-colors ${
                  selectedTicket?.id === ticket.id ? 'bg-[#1e293b]' : 'hover:bg-[#1e293b]/50'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="font-medium truncate pr-2">{ticket.subject || 'Support Request'}</div>
                  <div className="text-xs text-slate-500 whitespace-nowrap">
                    {new Date(ticket.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-slate-400 truncate pr-4">{ticket.lastMessage || 'No messages yet'}</div>
                  {ticket.status === 'closed' ? (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">Closed</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-2">From: {ticket.userEmail}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-[#161d2b] border border-[#222b3d] rounded-xl flex flex-col overflow-hidden">
        {selectedTicket ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-[#222b3d] bg-[#1a2332] flex justify-between items-center">
              <div>
                <h2 className="font-bold text-lg">{selectedTicket.subject || 'Support Request'}</h2>
                <p className="text-sm text-slate-400">User: {selectedTicket.userEmail}</p>
              </div>
              {selectedTicket.status !== 'closed' && (
                <button 
                  onClick={handleCloseTicket}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-sm font-medium transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Close Ticket
                </button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => {
                const isAdmin = msg.isAdmin;
                return (
                  <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-xl p-3 ${
                      isAdmin ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-[#1e293b] text-slate-200 rounded-tl-none'
                    }`}>
                      <div className="text-xs opacity-70 mb-1 flex justify-between gap-4">
                        <span>{msg.senderName}</span>
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <div className="break-words whitespace-pre-wrap">{msg.text}</div>
                      <AttachmentList attachments={msg.attachments} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-[#222b3d] bg-[#1a2332]">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type your reply..."
                    className="w-full bg-[#0f172a] border border-[#222b3d] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                  {attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {attachments.map((file, index) => (
                        <span key={`${file.name}-${index}`} className="rounded-full bg-[#0f172a] px-3 py-1 text-xs text-slate-300">{file.name}</span>
                      ))}
                    </div>
                  )}
                </div>
                <label className="bg-[#0f172a] border border-[#222b3d] hover:bg-[#1e293b] text-white px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer flex items-center">
                  <Paperclip className="w-4 h-4" />
                  <input
                    type="file"
                    className="hidden"
                    onChange={async e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const attachment = await readAttachment(file);
                        setAttachments(current => [...current, attachment].slice(0, 3));
                      } catch (error: any) {
                        alert(error.message);
                      }
                      e.target.value = '';
                    }}
                  />
                </label>
                <button 
                  type="submit"
                  disabled={!newMessage.trim() && attachments.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <MessageSquare className="w-12 h-12 mb-4 text-slate-600" />
            <p className="text-lg font-medium">Select a ticket to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
