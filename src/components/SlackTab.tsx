// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { Send, Hash, Loader2, User, Users, Plus, X, Check, Search } from 'lucide-react';
import { useTheme, glassPanel, textPrimary, textSecondary } from '../utils';

export default function SlackTab({ username }) {
  const { isDark } = useTheme();
  
  // States chính
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]); 
  const [selectedChat, setSelectedChat] = useState({ id: 'global', name: 'Kênh chung', isGroup: false });
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Search & Filter
  const [contactSearch, setContactSearch] = useState('');
  
  // Group Creation States (Modal)
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);

  const messagesEndRef = useRef(null);
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => { scrollToBottom(); }, [messages]);

  // 1. Tải danh sách người dùng
  useEffect(() => {
    const fetchUsers = async () => {
      // Thêm cột avatar_url vào select
      const { data } = await supabase.from('app_users').select('username, avatar_url'); 
      if (data) setUsers(data.filter(u => u.username !== username));
    };
    fetchUsers();
  }, [username]);

  // 2. Tải tin nhắn & Realtime
  useEffect(() => {
    setLoading(true);
    const fetchMessages = async () => {
      let query = supabase.from('messages').select('*');

      if (selectedChat.id === 'global') {
        query = query.is('receiver', null);
      } else if (selectedChat.isGroup) {
        query = query.eq('receiver', selectedChat.id);
      } else {
        query = query.or(`and(sender.eq.${username},receiver.eq.${selectedChat.id}),and(sender.eq.${selectedChat.id},receiver.eq.${username})`);
      }

      const { data, error } = await query.order('created_at', { ascending: true });
      if (!error && data) setMessages(data);
      setLoading(false);
    };

    fetchMessages();

    const channel = supabase
      .channel(`chat:${selectedChat.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, 
        (payload) => {
          const newMsg = payload.new;
          const isGlobal = selectedChat.id === 'global' && !newMsg.receiver;
          const isCurrentGroup = selectedChat.isGroup && newMsg.receiver === selectedChat.id;
          const isCurrentPrivate = !selectedChat.isGroup && selectedChat.id !== 'global' && (
            (newMsg.sender === username && newMsg.receiver === selectedChat.id) ||
            (newMsg.sender === selectedChat.id && newMsg.receiver === username)
          );

          if (isGlobal || isCurrentGroup || isCurrentPrivate) {
            setMessages((prev) => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
          }
        }
      ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedChat, username]);

  // 3. Gửi tin nhắn
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const textToSend = newMessage.trim();
    const tempId = `temp-${Date.now()}`;
    const targetReceiver = selectedChat.id === 'global' ? null : selectedChat.id;

    setMessages((prev) => [...prev, { id: tempId, sender: username, content: textToSend, receiver: targetReceiver, created_at: new Date().toISOString() }]);
    setNewMessage(''); 

    const { data, error } = await supabase.from('messages').insert([{ sender: username, content: textToSend, receiver: targetReceiver }]).select();
    if (!error && data) setMessages((prev) => prev.map(m => m.id === tempId ? data[0] : m));
  };

  // 4. Logic tạo nhóm
  const toggleMember = (u) => {
    setSelectedMembers(prev => prev.includes(u) ? prev.filter(m => m !== u) : [...prev, u]);
  };

  const confirmCreateGroup = () => {
    if (!groupName.trim() || selectedMembers.length === 0) return;
    const groupId = `group:${groupName.trim()}:${Date.now()}`;
    setSelectedChat({ id: groupId, name: groupName.trim(), isGroup: true });
    setIsCreatingGroup(false);
    setGroupName('');
    setSelectedMembers([]);
  };

  return (
    <div className="flex h-full max-w-6xl mx-auto overflow-hidden p-2 gap-2">
      
      {/* SIDEBAR */}
      <div className={`${glassPanel(isDark)} w-72 flex flex-col rounded-3xl overflow-hidden border ${isDark ? 'border-white/10' : 'border-black/5'}`}>
        <div className="p-4 flex flex-col h-full">
          
          {/* Header Sidebar & Nút + tạo nhóm */}
          <div className="flex justify-between items-center mb-4">
            <h2 className={`font-bold text-lg ${textPrimary(isDark)}`}>Đoạn chat</h2>
            <button 
              onClick={() => setIsCreatingGroup(true)}
              className="p-1.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-all active:scale-90 shadow-lg shadow-cyan-500/20"
              title="Tạo hội thoại nhóm mới"
            >
              <Plus size={18} />
            </button>
          </div>

          {/* Ô Tìm liên lạc (Filter danh sách) */}
          <div className="relative mb-4">
            <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textSecondary(isDark)}`} />
            <input 
              type="text" 
              placeholder="Tìm liên lạc..." 
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs outline-none border transition-all ${isDark ? 'bg-white/5 border-white/10 text-white focus:border-cyan-500/50' : 'bg-slate-100 border-black/5 focus:border-cyan-500/50'}`}
            />
          </div>

          {/* List danh sách */}
          <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
            <button onClick={() => setSelectedChat({ id: 'global', name: 'Kênh chung', isGroup: false })}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${selectedChat.id === 'global' ? 'bg-cyan-500 text-white shadow-md' : `hover:bg-white/5 ${textSecondary(isDark)}`}`}>
              <Hash size={18} /> <span className="text-sm font-medium">Kênh chung</span>
            </button>

            <div className={`pt-4 pb-2 px-3 text-[10px] uppercase tracking-widest font-bold ${textSecondary(isDark)} opacity-50`}>Danh bạ</div>
            
            {users
              .filter(u => u.username.toLowerCase().includes(contactSearch.toLowerCase()))
              .map((u) => (
                <button key={u.username} onClick={() => setSelectedChat({ id: u.username, name: u.username, isGroup: false })}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${selectedChat.id === u.username ? 'bg-cyan-500 text-white shadow-sm' : `hover:bg-white/5 ${textSecondary(isDark)}`}`}>
                  
                  {/* PHẦN AVATAR MỚI CẬP NHẬT */}
                  <div className="relative shrink-0">
                    {u.avatar_url ? (
                      <img 
                        src={u.avatar_url} 
                        alt={u.username} 
                        className="w-8 h-8 rounded-full object-cover border border-white/10"
                      />
                    ) : (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedChat.id === u.username ? 'bg-white/20' : 'bg-indigo-500/20 text-indigo-400'}`}>
                        <User size={14} />
                      </div>
                    )}
                    {/* Có thể thêm chấm xanh online nếu muốn */}
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#0a0f1c] rounded-full"></div>
                  </div>

                  <span className="text-sm font-medium truncate">{u.username}</span>
                </button>
            ))}
          </div>
        </div>
      </div>

      {/* CHAT CONTENT */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header Chat */}
        <div className={`${glassPanel(isDark)} rounded-t-3xl p-4 flex items-center gap-3 shrink-0 border-b ${isDark ? 'border-white/10' : 'border-black/5'}`}>
  
          {/* Khu vực Avatar: Ưu tiên ảnh từ DB, nếu không có hiện Icon mặc định */}
          <div className="w-10 h-10 rounded-full overflow-hidden bg-cyan-500/20 flex items-center justify-center text-cyan-500 shrink-0">
            {selectedChat.isGroup ? (
              <Users size={20} />
            ) : (
              // Tìm avatar của user đang chat trong danh sách users
              users.find(u => u.username === selectedChat.id)?.avatar_url ? (
                <img 
                  src={users.find(u => u.username === selectedChat.id).avatar_url} 
                  className="w-full h-full object-cover" 
                  alt={selectedChat.name}
                />
              ) : (
                // Nếu là Kênh chung hoặc không có ảnh thì hiện icon
                selectedChat.id === 'global' ? <Hash size={20} /> : <User size={20} />
              )
            )}
          </div>

          {/* Phần tên User và Trạng thái */}
          <div className="flex flex-col">
            <h2 className={`font-bold text-lg leading-tight ${textPrimary(isDark)}`}>
              {selectedChat.name}
            </h2>
            <p className={`text-xs ${textSecondary(isDark)}`}>
              {selectedChat.isGroup ? 'Hội thoại nhóm' : (selectedChat.id === 'global' ? 'Tất cả mọi người' : `Đang nhắn tin với ${selectedChat.name}`)}
            </p>
          </div>
        </div>

        {/* Messages List */}
        <div className={`${glassPanel(isDark)} flex-1 overflow-y-auto p-6 space-y-4 rounded-none custom-scrollbar`}>
          {loading ? (
             <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-cyan-500 opacity-50" /></div>
          ) : (
            messages.map((msg, index) => (
              <div key={msg.id || index} className={`flex flex-col ${msg.sender === username ? 'items-end' : 'items-start'}`}>
                <span className={`text-[10px] mb-1 font-semibold ${msg.sender === username ? 'text-cyan-500' : textSecondary(isDark)}`}>{msg.sender}</span>
                <div className={`px-4 py-2 rounded-2xl max-w-sm text-sm ${msg.sender === username ? 'bg-cyan-500 text-white rounded-br-sm shadow-sm' : isDark ? 'bg-white/10 text-white rounded-bl-sm' : 'bg-white border rounded-bl-sm'}`}>
                  {msg.content}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className={`${glassPanel(isDark)} p-4 rounded-b-3xl border-t ${isDark ? 'border-white/10' : 'border-black/5'}`}>
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder={`Nhắn cho ${selectedChat.name}...`}
              className={`flex-1 px-4 py-3 rounded-xl text-sm outline-none border transition-all ${isDark ? 'bg-white/5 border-white/10 text-white focus:border-cyan-500' : 'bg-slate-100 border-black/5 focus:border-cyan-500'}`} />
            <button type="submit" disabled={!newMessage.trim()} className="w-12 h-12 flex items-center justify-center bg-cyan-500 text-white rounded-xl active:scale-95 transition-transform"><Send size={18} /></button>
          </form>
        </div>
      </div>

      {/* MODAL TẠO NHÓM (GIỐNG SLACK) */}
      {isCreatingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-all">
          <div className={`${glassPanel(isDark)} w-full max-w-md rounded-3xl p-6 shadow-2xl border ${isDark ? 'border-white/10' : 'border-white'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className={`text-xl font-bold ${textPrimary(isDark)}`}>Tạo hội thoại mới</h3>
              <button onClick={() => setIsCreatingGroup(false)} className="p-2 hover:bg-red-500/10 rounded-full text-slate-400 hover:text-red-500 transition-colors"><X size={20} /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={`text-[11px] font-bold uppercase tracking-wider mb-2 block ${textSecondary(isDark)}`}>Tên hội thoại</label>
                <input type="text" placeholder="VD: Team Marketing, Dự án X..." value={groupName} onChange={(e) => setGroupName(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl outline-none border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-100 border-black/5'}`} />
              </div>
              
              <div>
                <label className={`text-[11px] font-bold uppercase tracking-wider mb-2 block ${textSecondary(isDark)}`}>Thêm thành viên ({selectedMembers.length})</label>
                <div className="max-h-52 overflow-y-auto space-y-1 pr-2 custom-scrollbar border rounded-2xl p-2 border-black/5">
                  {users.map(u => (
                    <button key={u.username} onClick={() => toggleMember(u.username)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${selectedMembers.includes(u.username) ? 'bg-cyan-500/10 border border-cyan-500/30' : 'hover:bg-white/5 border border-transparent'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-slate-500/20 flex items-center justify-center text-[10px]">{u.username[0].toUpperCase()}</div>
                        <span className={`text-sm font-medium ${textPrimary(isDark)}`}>{u.username}</span>
                      </div>
                      {selectedMembers.includes(u.username) ? <div className="bg-cyan-500 p-0.5 rounded-full text-white"><Check size={12} /></div> : <div className="w-4 h-4 rounded-full border border-slate-500/30" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button 
              onClick={confirmCreateGroup} 
              disabled={!groupName.trim() || selectedMembers.length === 0}
              className="w-full mt-8 py-4 bg-cyan-500 text-white rounded-2xl font-bold hover:bg-cyan-600 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/30 transition-all"
            >
              Tạo hội thoại
            </button>
          </div>
        </div>
      )}
    </div>
  );
}