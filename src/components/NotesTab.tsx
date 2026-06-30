// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase'; 
import { motion } from 'framer-motion';
import { Plus, Trash2, StickyNote, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { useTheme, glassPanel, textPrimary, textSecondary, textMuted } from '../utils';

// Hàm sinh ID giả lập lưu vào Local Storage để test nhiều người dùng
const getTempUserId = () => {
  let id = localStorage.getItem('temp_user_id');
  if (!id) {
    id = crypto.randomUUID(); 
    localStorage.setItem('temp_user_id', id);
  }
  return id;
};

export default function NotesTab() {
  const { isDark } = useTheme();
  const [notes, setNotes] = useState([]);
  const [active, setActive] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [saving, setSaving] = useState(false);

  // 1. Load Note khi mở trang
  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    const currentUserId = getTempUserId();

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', currentUserId)
      .order('id', { ascending: false });

    if (!error) {
      setNotes(data || []);
      // Mặc định chọn note đầu tiên nếu có
      if (data && data.length > 0) setActive(data[0].id);
    }
  }

  // 2. Cập nhật input khi chuyển note
  useEffect(() => {
    const activeNote = notes.find(n => n.id === active);
    if (activeNote) {
      setEditContent(activeNote.content || '');
      setEditTitle(activeNote.title || '');
    }
  }, [active, notes]);

  // 3. AUTO-SAVE (Lưu tự động sau 1 giây ngừng gõ)
  useEffect(() => {
    if (!active) return;

    const currentNote = notes.find(n => n.id === active);
    // Chỉ lưu nếu nội dung thực sự thay đổi
    if (currentNote && currentNote.title === editTitle && currentNote.content === editContent) {
        return;
    }

    setSaving(true);
    const handler = setTimeout(async () => {
      const { error } = await supabase
        .from('notes')
        .update({ title: editTitle, content: editContent })
        .eq('id', active);

      if (!error) {
        setNotes(prev => prev.map(n => n.id === active ? { ...n, title: editTitle, content: editContent } : n));
      }
      setSaving(false);
    }, 1000);

    return () => clearTimeout(handler);
  }, [editContent, editTitle, active]); // Thêm active vào dependency

  // 4. Tạo ghi chú mới
  const addNote = async () => {
    try {
      const currentUserId = getTempUserId();

      const newNoteObj = { 
        title: 'Ghi chú mới', 
        content: '', 
        pinned: false,
        user_id: currentUserId
      };
  
      const { data, error } = await supabase.from('notes').insert([newNoteObj]).select(); 
  
      if (error) {
        console.error("Lỗi tạo note:", error);
        return;
      }
  
      if (data && data.length > 0) {
        setNotes(prev => [data[0], ...prev]);
        setActive(data[0].id);
      }
    } catch (err) {
      console.error("Lỗi hệ thống:", err);
    }
  };

  // 5. Xóa ghi chú
  const deleteNote = async (id) => {
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (!error) {
      const remaining = notes.filter(n => n.id !== id);
      setNotes(remaining);
      if (active === id && remaining.length > 0) setActive(remaining[0].id);
      else if (remaining.length === 0) setActive(null);
    }
  };

  return (
    <div className="flex gap-4 h-full overflow-hidden">
      {/* Sidebar Ghi chú */}
      <div className="w-64 shrink-0 flex flex-col gap-3">
        <button onClick={addNote}
          className={`w-full h-10 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold border transition-all duration-300 ${isDark ? 'bg-cyan-500/15 text-cyan-400 border-cyan-400/25 hover:bg-cyan-500/25' : 'bg-sky-500 text-white border-sky-600/20 shadow-sm hover:bg-sky-600'}`}>
          <Plus className="w-4 h-4" /> Ghi chú mới
        </button>
        <div className="flex-1 overflow-y-auto space-y-2">
          {notes.map(note => (
            <motion.button key={note.id} onClick={() => setActive(note.id)}
              whileHover={{ x: 2 }}
              className={`w-full text-left p-3.5 rounded-xl border transition-all duration-300 group ${
                active === note.id
                  ? isDark ? 'bg-white/[0.08] border-cyan-400/30' : 'bg-sky-50 border-sky-300/50'
                  : isDark ? 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]' : 'bg-white/60 border-slate-200 hover:bg-white/80'
              }`}>
              <div className="flex items-start justify-between gap-2">
                <p className={`text-sm font-semibold line-clamp-1 ${active === note.id ? (isDark ? 'text-cyan-400' : 'text-sky-600') : textPrimary(isDark)}`}>{note.title}</p>
                <button onClick={e => { e.stopPropagation(); deleteNote(note.id); }}
                  className={`w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'hover:bg-red-400/10 text-white/25 hover:text-red-400' : 'hover:bg-red-50 text-slate-300 hover:text-red-400'}`}>
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <p className={`text-[11px] mt-1 line-clamp-2 ${textMuted(isDark)}`}>{note.content || 'Trống...'}</p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Vùng soạn thảo */}
      <div className={`flex-1 flex flex-col rounded-2xl overflow-hidden ${glassPanel(isDark)}`}>
        {active ? (
          <>
            <div className={`flex items-center gap-3 p-4 border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-200'}`}>
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                className={`flex-1 bg-transparent text-base font-bold focus:outline-none ${textPrimary(isDark)} placeholder:${textMuted(isDark)}`}
                placeholder="Tiêu đề..." />
              
              {/* Trạng thái lưu tự động */}
              <div className={`flex items-center gap-2 text-[10px] font-medium transition-opacity duration-300 ${saving ? 'opacity-100' : 'opacity-40'}`}>
                {saving ? (
                  <><Loader2 className="w-3 h-3 animate-spin text-cyan-400" /> Đang lưu...</>
                ) : (
                  <><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Đã đồng bộ</>
                )}
              </div>
            </div>
            
            <textarea
              value={editContent} onChange={e => setEditContent(e.target.value)}
              placeholder="Bắt đầu gõ ghi chú của bạn..."
              className={`flex-1 p-5 bg-transparent text-sm leading-relaxed resize-none focus:outline-none font-mono transition-colors duration-500 ${
                isDark ? 'text-white/75 placeholder:text-white/15' : 'text-slate-700 placeholder:text-slate-300'
              }`}
            />
            
            <div className={`px-5 py-2.5 flex items-center justify-between border-t ${isDark ? 'border-white/[0.05]' : 'border-slate-100'}`}>
              <span className={`text-[10px] ${textMuted(isDark)}`}>{editContent.length} ký tự · {editContent.split('\n').length} dòng</span>
              <Clock className={`w-3.5 h-3.5 ${textMuted(isDark)}`} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <StickyNote className={`w-12 h-12 mx-auto mb-3 opacity-20 ${textSecondary(isDark)}`} />
              <p className={`text-sm ${textSecondary(isDark)}`}>Chọn hoặc tạo ghi chú mới</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}