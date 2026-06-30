// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Trash2, Key, Search, Loader2 } from 'lucide-react';
import { useTheme, glassPanel, textPrimary, textSecondary, textMuted } from '../utils';
import { supabase } from '../supabase'; // 1. Import kết nối Supabase

export default function AdminUserTab() {
  const { isDark } = useTheme();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true); // Thêm trạng thái loading

  // 2. Hàm lấy danh sách User từ Supabase
  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      alert('Lỗi tải danh sách: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  // 3. Hàm xóa User trên Supabase
  const deleteUser = async (username) => {
    if (username === 'nguyen') return alert("Không thể xóa Admin tối cao!");
    
    if (window.confirm(`Bạn có chắc muốn xóa user [${username}]?`)) {
      try {
        const { error } = await supabase
          .from('app_users')
          .delete()
          .eq('username', username);

        if (error) throw error;
        
        // Cập nhật lại giao diện sau khi xóa thành công
        setUsers(users.filter(u => u.username !== username));
      } catch (error) {
        alert('Lỗi khi xóa: ' + error.message);
      }
    }
  };

  // 4. Hàm Reset mật khẩu trên Supabase
  // 4. Hàm Reset mật khẩu trên Supabase (Đã nâng cấp)
  const resetPassword = async (username) => {
    // Hiện hộp thoại yêu cầu nhập mật khẩu mới (Gợi ý sẵn 123456 cho nhanh nếu lười gõ)
    const newPassword = window.prompt(`Nhập mật khẩu mới cho tài khoản [${username}]:`, "123456");

    // Nếu Admin bấm Cancel (Hủy) hoặc xóa trắng ô text rồi bấm OK -> Thoát, không làm gì cả
    if (newPassword === null || newPassword.trim() === "") {
      return; 
    }

    try {
      // Cập nhật mật khẩu do Admin vừa nhập lên Supabase
      const { error } = await supabase
        .from('app_users')
        .update({ password: newPassword.trim() })
        .eq('username', username);

      if (error) throw error;
      
      // Báo thành công với mật khẩu mới
      alert(`Đã đặt lại mật khẩu cho ${username} thành: ${newPassword}`);
    } catch (error) {
      alert('Lỗi reset mật khẩu: ' + error.message);
    }
  };

  const filtered = users.filter(u => 
    (u.username || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full gap-4 overflow-hidden">
      <div className={`rounded-2xl p-6 ${glassPanel(isDark)}`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={`text-xl font-bold ${textPrimary(isDark)}`}>Quản lý người dùng</h2>
            <p className={`text-xs ${textSecondary(isDark)}`}>Dữ liệu trực tuyến từ Supabase (Admin Only)</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Nút làm mới dữ liệu */}
            <button onClick={loadUsers} className={`p-2 rounded-xl border ${isDark ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'} transition-colors`}>
               {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
            </button>
            <div className="relative w-64">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted(isDark)}`} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm username..."
                className={`w-full h-10 pl-10 rounded-xl text-sm border focus:outline-none transition-all ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-black/10'}`} />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading && users.length === 0 ? (
            <div className="py-20 flex justify-center items-center">
              <Loader2 className="w-8 h-8 animate-spin opacity-20" />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b ${isDark ? 'border-white/5' : 'border-black/5'}`}>
                  <th className={`pb-3 text-[11px] font-bold uppercase tracking-wider ${textMuted(isDark)}`}>Người dùng</th>
                  <th className={`pb-3 text-[11px] font-bold uppercase tracking-wider ${textMuted(isDark)}`}>Casso ID</th>
                  <th className={`pb-3 text-[11px] font-bold uppercase tracking-wider ${textMuted(isDark)}`}>Vai trò</th>
                  <th className={`pb-3 text-right text-[11px] font-bold uppercase tracking-wider ${textMuted(isDark)}`}>Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {filtered.map((user) => (
                  <tr key={user.username} className="group">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-black/5'}`}>
                          <User className="w-4 h-4 opacity-50" />
                        </div>
                        <span className={`text-sm font-semibold ${textPrimary(isDark)}`}>{user.username}</span>
                      </div>
                    </td>
                    <td className={`py-4 text-xs font-mono ${textSecondary(isDark)}`}>{user.casso_id}</td>
                    <td className="py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${user.role === 'admin' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                        {user.role || 'user'}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => resetPassword(user.username)} className={`p-2 rounded-lg hover:bg-sky-500/10 text-sky-500`} title="Reset mật khẩu">
                          <Key className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteUser(user.username)} className={`p-2 rounded-lg hover:bg-red-500/10 text-red-400`} title="Xóa User">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}