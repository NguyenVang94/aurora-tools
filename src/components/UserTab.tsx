// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { User, Camera, Lock, CheckCircle2, Loader2 } from 'lucide-react';
import { useTheme, glassPanel, textPrimary, textSecondary } from '../utils';

export default function UserTab({ username }) {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  
  const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' });
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchUserData();
  }, [username]);

  const fetchUserData = async () => {
    const { data } = await supabase.from('app_users').select('*').eq('username', username).single();
    if (data) setUserData(data);
  };

  // 1. XỬ LÝ UPLOAD AVATAR (Giữ nguyên)
  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setLoading(true);
      const file = e.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${username}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error: updateError } = await supabase.from('app_users').update({ avatar_url: publicUrl }).eq('username', username);
      if (updateError) throw updateError;

      setUserData({ ...userData, avatar_url: publicUrl });
      window.dispatchEvent(new CustomEvent('avatarUpdated', { detail: publicUrl }));
      alert("Cập nhật ảnh đại diện thành công!");
    } catch (error) {
      alert("Lỗi upload: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. LỘCIC ĐỔI MẬT KHẨU ĐÃ ĐƯỢC SỬA LẠI
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });

    if (passwords.new !== passwords.confirm) {
      return setMsg({ type: 'error', text: 'Mật khẩu xác nhận không khớp!' });
    }

    setLoading(true);
    try {
      // BƯỚC 1: Lấy mật khẩu hiện tại trên DB để so sánh
      const { data: userCheck, error: fetchError } = await supabase
        .from('app_users')
        .select('password')
        .eq('username', username)
        .single();

      if (fetchError || userCheck.password !== passwords.old) {
        throw new Error('Mật khẩu hiện tại không chính xác!');
      }

      // BƯỚC 2: Nếu đúng pass cũ thì mới tiến hành Update
      const { error: updateError } = await supabase
        .from('app_users')
        .update({ password: passwords.new })
        .eq('username', username);

      if (updateError) throw updateError;

      setMsg({ type: 'success', text: 'Đã đổi mật khẩu thành công!' });
      setPasswords({ old: '', new: '', confirm: '' });
    } catch (error) {
      setMsg({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    // FIX GIAO DIỆN: Thêm h-full, overflow-y-auto để cuộn mượt mà, giảm p-6 xuống p-4, giảm space-y-6 xuống space-y-4
    <div className="max-w-2xl mx-auto p-4 space-y-4 h-full overflow-y-auto custom-scrollbar pb-20">
      
      {/* CARD THÔNG TIN CÁ NHÂN */}
      <div className={`${glassPanel(isDark)} p-6 rounded-3xl flex flex-col items-center shrink-0`}>
        <div className="relative group">
          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-cyan-500/30 bg-slate-200">
            {userData?.avatar_url ? (
              <img src={userData.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><User size={48} className="text-slate-400" /></div>
            )}
          </div>
          <label className="absolute bottom-0 right-0 p-2 bg-cyan-500 rounded-full cursor-pointer hover:scale-110 transition-transform shadow-lg">
            <Camera size={16} className="text-white" />
            <input type="file" className="hidden" accept="image/*" onChange={handleUploadAvatar} disabled={loading} />
          </label>
        </div>
        
        <h2 className={`mt-3 text-xl font-bold ${textPrimary(isDark)}`}>{username}</h2>
        <p className={`${textSecondary(isDark)} text-xs uppercase tracking-widest font-semibold`}>{userData?.role}</p>
      </div>

      {/* CARD ĐỔI MẬT KHẨU */}
      <div className={`${glassPanel(isDark)} p-6 rounded-3xl shrink-0`}>
        <div className="flex items-center gap-3 mb-4">
          <Lock className="text-cyan-500 w-5 h-5" />
          <h3 className={`text-lg font-bold ${textPrimary(isDark)}`}>Đổi mật khẩu</h3>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-3">
          <input type="password" placeholder="Mật khẩu hiện tại" className={`w-full p-2.5 rounded-xl border text-sm ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-black/10'}`} 
            value={passwords.old} onChange={e => setPasswords({...passwords, old: e.target.value})} required />
          
          <input type="password" placeholder="Mật khẩu mới" className={`w-full p-2.5 rounded-xl border text-sm ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-black/10'}`} 
            value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} required />
          
          <input type="password" placeholder="Xác nhận mật khẩu mới" className={`w-full p-2.5 rounded-xl border text-sm ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-black/10'}`} 
            value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} required />

          {msg.text && (
            <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
              {msg.type === 'success' ? <CheckCircle2 size={14} /> : <Loader2 size={14} className="animate-spin" />}
              {msg.text}
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full py-2.5 mt-2 bg-cyan-500 text-white rounded-xl text-sm font-bold hover:bg-cyan-600 transition-colors shadow-lg shadow-cyan-500/20">
            {loading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
          </button>
        </form>
      </div>
    </div>
  );
}