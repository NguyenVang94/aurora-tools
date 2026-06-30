// @ts-nocheck
import { supabase } from '../supabase'; // Đường dẫn tới file supabase.ts của bạn
import { getCurrentWindow } from '@tauri-apps/api/window';
/**
 * PyTools Manager — Single-file standalone app
 * Auth + Dashboard + Tasks/Calendar + Slack + Notes
 * Glassmorphism · Dark/Light Mode · Framer Motion
 */

import React, {
  useState, useMemo, useEffect, useRef, createContext, useContext
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Puzzle, Settings, Terminal, Cpu,
  ChevronLeft, Sun, Moon, Search, Command, Package,
  Activity, CircleOff, Zap, Play, Square, ExternalLink,
  LogOut, CalendarDays, MessageSquare, StickyNote,
  Plus, Trash2, Check, Send, ToggleLeft, ToggleRight,
  Clock, AlertCircle, CheckCircle2, Eye, EyeOff, User, Lock, Hash, Key,
  FolderOpen
} from 'lucide-react';

import { useTheme, BgFx, ThemeToggle, textSecondary, textMuted } from '../utils';
import auroraLogo from '../assets/aurora-logo.png';

/* ─────────────────────────────────────────
   AUTH SCREEN (LOGIN / REGISTER)
───────────────────────────────────────── */
export default function AuthScreen({ onLogin }) {
  const { isDark } = useTheme();
  let appWindow = null;
  try {
    appWindow = getCurrentWindow();
  } catch (e) {
    console.warn("Đang xem trên trình duyệt, Tauri Window API sẽ bị vô hiệu hóa.");
  }

  const [tab, setTab] = useState('login');
  const [cassoId, setCassoId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  
  const [remember, setRemember] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // --- HIỆU ỨNG GÕ CHỮ + FADE TRANSITION ---
  const phrases = [
    'Xin chào...',
    'Chúc bạn ngày mới tốt lành',
    'Đăng nhập để trải nghiệm',
    'Aurora app'
  ];
  const [displayText, setDisplayText] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [show, setShow] = useState(true); // Quản lý trạng thái hiện/ẩn để Fade

  useEffect(() => {
    const currentPhrase = phrases[phraseIndex];
    let timer;

    if (show) {
      // Logic gõ chữ tiến tới
      if (displayText.length < currentPhrase.length) {
        timer = setTimeout(() => {
          setDisplayText(currentPhrase.substring(0, displayText.length + 1));
        }, 50).current; // Tốc độ gõ 80ms
      } else {
        // Gõ xong thì đợi 10 giây rồi ẩn đi (Fade out)
        timer = setTimeout(() => setShow(false), 60000);
      }
    } else {
      // Khi đã ẩn (Fade out xong), đổi index và reset để bắt đầu gõ câu mới
      timer = setTimeout(() => {
        setPhraseIndex((prev) => (prev + 1) % phrases.length);
        setDisplayText('');
        setShow(true);
      }, 500); // Đợi 0.5s cho hiệu ứng fade out hoàn tất
    }

    return () => clearTimeout(timer);
  }, [displayText, phraseIndex, show]);
  
  //-------------------------------------

  useEffect(() => {
    setErrorMsg('');
  }, [tab]);

  const getUsers = () => JSON.parse(localStorage.getItem('pytools_users') || '[]');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const normalizedCassoId = cassoId.trim().toLowerCase();
    const cleanUsername = username.trim();

    try {
      if (tab === 'register') {
        // 1. KIỂM TRA ĐẦU VÀO
        if (!normalizedCassoId || !cleanUsername || !password) {
          throw new Error('Vui lòng điền đầy đủ thông tin!');
        }
        if (normalizedCassoId.length !== 6) {
          throw new Error('Casso ID phải có đúng 6 ký tự!');
        }
        if (password !== confirm) {
          throw new Error('Mật khẩu xác nhận không khớp!');
        }

        // 2. KIỂM TRA TRÙNG LẶP TRÊN SUPABASE
        // Lấy các user có casso_id hoặc username giống với dữ liệu nhập vào
        const { data: existingUsers, error: checkError } = await supabase
          .from('app_users')
          .select('casso_id, username')
          .or(`casso_id.eq.${normalizedCassoId},username.eq.${cleanUsername}`);

        if (checkError) throw checkError;

        if (existingUsers && existingUsers.length > 0) {
          const isCassoTaken = existingUsers.some(u => u.casso_id === normalizedCassoId);
          if (isCassoTaken) throw new Error('Casso ID này đã được đăng ký!');
          throw new Error('Tên đăng nhập này đã tồn tại!');
        }

        // 3. TẠO TÀI KHOẢN MỚI
        const role = normalizedCassoId === 's14335' ? 'admin' : 'user';
        const { error: insertError } = await supabase
          .from('app_users')
          .insert([{ 
            casso_id: normalizedCassoId, 
            username: cleanUsername, 
            password: password, 
            role: role 
          }]);

        if (insertError) throw insertError;

        // Đăng ký thành công
        if (remember) localStorage.setItem('pytools_session', cleanUsername);
        onLogin(cleanUsername);

      } else {
        // --- XỬ LÝ ĐĂNG NHẬP ---
        if (!cleanUsername || !password) {
          throw new Error('Vui lòng nhập tên đăng nhập và mật khẩu!');
        }

        // Truy vấn user có username và password khớp
        const { data: validUser, error: loginError } = await supabase
          .from('app_users')
          .select('*')
          .eq('username', cleanUsername)
          .eq('password', password)
          .single(); // single() giúp trả về 1 object thay vì 1 mảng

        // Nếu không tìm thấy hoặc có lỗi
        if (loginError || !validUser) {
          throw new Error('Sai tên đăng nhập hoặc mật khẩu!');
        }

        // Đăng nhập thành công
        if (remember) localStorage.setItem('pytools_session', validUser.username);
        onLogin(validUser.username);
      }
    } catch (err) {
      // Bắt lỗi và hiển thị lên màn hình
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = `w-full h-11 rounded-xl px-4 text-sm border transition-all duration-300 focus:outline-none backdrop-blur-sm ${
    isDark
      ? 'bg-white/[0.05] border-white/[0.09] text-white/85 placeholder:text-white/20 focus:border-cyan-400/40 focus:bg-white/[0.08]'
      : 'bg-white/70 border-black/[0.07] text-slate-700 placeholder:text-slate-400 focus:border-sky-400/50 focus:bg-white/90'
  }`;

  return (
    <div
      className={`h-screen w-screen overflow-hidden rounded-[14px] relative border flex flex-col ${
        isDark ? 'border-white/10' : 'border-black/10'
      }`}
      style={{ transform: 'translateZ(0)' }}
    >
      <BgFx />

      {/* THANH TIÊU ĐỀ LOGIN */}
      <div className="h-14 w-full relative shrink-0">
        <div data-tauri-drag-region="true" className="absolute inset-0 z-0 cursor-move" />
        <div className="absolute inset-0 z-10 flex items-center justify-between px-5 pointer-events-none">
          <div className="pointer-events-auto"><ThemeToggle /></div>
          <div className="flex items-center gap-2.5 pointer-events-auto">
            <div onClick={() => appWindow?.minimize()} className="w-3.5 h-3.5 rounded-full bg-yellow-500/80 hover:bg-yellow-400 transition-colors cursor-pointer shadow-sm" title="Thu nhỏ" />
            <div onClick={() => appWindow?.toggleMaximize()} className="w-3.5 h-3.5 rounded-full bg-green-500/80 hover:bg-green-400 transition-colors cursor-pointer shadow-sm" title="Phóng to" />
            <div onClick={() => appWindow?.close()} className="w-3.5 h-3.5 rounded-full bg-red-500/80 hover:bg-red-400 transition-colors cursor-pointer shadow-sm" title="Đóng" />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 font-inter relative z-10 pb-16">
        <div className="w-full max-w-[340px] flex flex-col items-center">
          
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }} className="flex flex-col items-center gap-3 mb-6">
            
            {/* Thẻ img hiển thị logo mới */}
            <img 
              src={auroraLogo} // Dùng {auroraLogo} nếu import từ assets, hoặc "/aurora-logo.png" nếu để trong public
              alt="Aurora Logo" 
              className="w-14 h-14 object-contain rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.1)] transition-transform hover:scale-105 duration-300"
            />
            
            <div className="h-6 flex items-center justify-center overflow-hidden mb-2">
    <AnimatePresence mode="wait">
      {show && (
        <motion.span
          key={phraseIndex}
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, filter: 'blur(8px)', scale: 0.95 }}
          transition={{ duration: 0.8 }}
          // Đã xóa 'uppercase' và 'tracking-[...]'
          // Đã đổi size chữ thành text-lg (hoặc text-xl tùy bạn thích to bé)
          className={`text-lg font-semibold flex items-center gap-0.5 ${isDark ? 'text-white/70' : 'text-slate-600'}`}
          style={{ fontFamily: "'Dancing Script', cursive" }} // Áp dụng font chữ ký
        >
          {displayText}
          
        </motion.span>
      )}
    </AnimatePresence>
  </div>

          </motion.div>

          <motion.div 
            initial={{ y: 20, opacity: 0, scale: 0.97 }} 
            animate={{ y: 0, opacity: 1, scale: 1 }} 
            transition={{ duration: 0.6, delay: 0.1 }} 
            // Lưu ý: Đã xóa 'overflow-hidden' ở đây để viền mask không bị răng cưa
            className={`w-full rounded-3xl relative shadow-[0_24px_80px_rgba(0,0,0,0.5)] ${
              isDark ? 'bg-white/[0.04] backdrop-blur-3xl' : 'bg-white/75 backdrop-blur-3xl'
            }`}
          >
            {/* LỚP 1: HIỆU ỨNG VIỀN CHẠY (Sử dụng CSS Mask để khoét viền) */}
            <div 
              className="absolute inset-0 z-0 pointer-events-none rounded-3xl overflow-hidden"
              style={{
                padding: '1.5px', // Độ dày của viền chạy
                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude',
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                className="absolute inset-[-100%] z-0"
                style={{
                  background: isDark
                    ? 'conic-gradient(from 0deg, transparent 40%, #22d3ee, #8b5cf6, #ec4899, #10b981, transparent 60%)'
                    : 'conic-gradient(from 0deg, transparent 40%, #38bdf8, #818cf8, #f472b6, #34d399, transparent 60%)'
                }}
              />
            </div>

            {/* LỚP 2: VIỀN TĨNH MỜ (Tạo độ khối cho Card) */}
            <div className={`absolute inset-0 z-0 rounded-3xl border pointer-events-none ${isDark ? 'border-white/[0.08]' : 'border-black/[0.05]'}`} />
            
            {/* LỚP 3: NỘI DUNG FORM (Z-index cao nhất để nổi lên trên) */}
            <div className="relative z-10 p-6">
              <div className={`flex rounded-xl p-1 mb-5 ${isDark ? 'bg-white/[0.04]' : 'bg-black/[0.04]'}`}>
                {['login', 'register'].map(t => (
                  <button key={t} onClick={() => setTab(t)} className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all duration-300 relative ${tab === t ? (isDark ? 'bg-white/[0.1] text-white/90 shadow-sm border border-white/[0.08]' : 'bg-white text-slate-700 shadow-sm border border-black/[0.05]') : textSecondary(isDark)}`}>
                    {t === 'login' ? 'Đăng nhập' : 'Đăng ký'}
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {errorMsg && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4 overflow-hidden">
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-medium p-2.5 rounded-lg text-center flex items-center justify-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errorMsg}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                <motion.form key={tab} initial={{ x: tab === 'login' ? -20 : 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: tab === 'login' ? 20 : -20, opacity: 0 }} transition={{ duration: 0.3 }} onSubmit={handleSubmit} className="space-y-3">
                  
                  {tab === 'register' && (
                    <div className="relative">
                      <Hash className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-white/60' : 'text-sky-500'}`} strokeWidth={2.5} />
                      <input className={`${inputCls} pl-10`} type="text" placeholder="Casso ID" value={cassoId} onChange={e => setCassoId(e.target.value)} required />
                    </div>
                  )}

                  <div className="relative">
                    <User className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-white/60' : 'text-slate-700'}`} strokeWidth={2.5} />
                    <input className={`${inputCls} pl-10`} type="text" placeholder="Tên đăng nhập" value={username} onChange={e => setUsername(e.target.value)} required />
                  </div>

                  <div className="relative">
                  <Key className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-white/60' : 'text-sky-500'}`} strokeWidth={2.5} />
                    <input className={`${inputCls} pl-10 pr-11`} type={showPass ? 'text' : 'password'} placeholder="Mật khẩu" value={password} onChange={e => setPassword(e.target.value)} required />
                    <button type="button" onClick={() => setShowPass(p => !p)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${textSecondary(isDark)} hover:opacity-70 transition-opacity`}>
                     {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {tab === 'register' && (
                    <div className="relative">
                      <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary(isDark)}`} />
                      <input className={`${inputCls} pl-10 pr-11`} type={showConfirm ? 'text' : 'password'} placeholder="Xác nhận mật khẩu" value={confirm} onChange={e => setConfirm(e.target.value)} required />
                      <button type="button" onClick={() => setShowConfirm(p => !p)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${textSecondary(isDark)} hover:opacity-70 transition-opacity`}>
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  )}

                  {tab === 'login' && (
                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-1.5 cursor-pointer group" onClick={(e) => { e.preventDefault(); setRemember(!remember); }}>
                        <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all duration-200 ${remember ? (isDark ? 'bg-cyan-500/80 border-cyan-400' : 'bg-sky-500 border-sky-500') : (isDark ? 'bg-white/[0.05] border-white/[0.12]' : 'bg-white border-slate-300')}`}>
                          {remember && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className={`text-[11px] select-none ${textSecondary(isDark)} group-hover:${isDark ? 'text-white' : 'text-slate-800'}`}>Duy trì đăng nhập</span>
                      </label>
                      <button type="button" className={`text-[11px] ${isDark ? 'text-cyan-400/70 hover:text-cyan-400' : 'text-sky-500/70 hover:text-sky-600'} transition-colors`}>Quên mật khẩu?</button>
                    </div>
                  )}

                  <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`w-full h-11 rounded-xl font-semibold text-[13px] mt-2 flex items-center justify-center gap-2 transition-all duration-300 ${isDark ? 'bg-gradient-to-b from-cyan-500/30 to-cyan-500/15 text-cyan-300 border border-cyan-400/25 hover:from-cyan-500/40 hover:to-cyan-500/20' : 'bg-gradient-to-b from-sky-500 to-sky-600 text-white border border-sky-600/30 hover:from-sky-400 hover:to-sky-500 shadow-md'}`}>
                    {loading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : (tab === 'login' ? 'Đăng nhập' : 'Tạo tài khoản')}
                  </motion.button>
                </motion.form>
              </AnimatePresence>

              <div className="mt-5">
                <button type="button" className={`w-full h-10 rounded-xl text-[11px] font-medium border transition-all duration-200 flex items-center justify-center gap-2 ${isDark ? 'bg-white/[0.04] border-white/[0.07] text-white/50 hover:bg-white/[0.08] hover:text-white/80' : 'bg-white/80 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 shadow-sm'}`}>
                  <Package className="w-4 h-4" /> Đăng nhập bằng Casso ID
                </button>
              </div>

            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}