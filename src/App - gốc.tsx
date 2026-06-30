// @ts-nocheck
import './App.css';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalSize } from '@tauri-apps/api/dpi';
import { listen } from '@tauri-apps/api/event';

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


/* ─────────────────────────────────────────
   THEME CONTEXT
───────────────────────────────────────── */
const ThemeCtx = createContext();
function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);
  return (
    <ThemeCtx.Provider value={{ isDark, toggle: () => setIsDark(p => !p) }}>
      {children}
    </ThemeCtx.Provider>
  );
}
const useTheme = () => useContext(ThemeCtx);

/* ─────────────────────────────────────────
   BACKGROUND EFFECTS
───────────────────────────────────────── */
function BgFx() {
  const { isDark } = useTheme();
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      {isDark ? (
        <>
          <div className="absolute inset-0 bg-[#060a14]" />
          <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full bg-cyan-500/[0.025] blur-[130px]" />
          <div className="absolute -bottom-40 -right-20 w-[500px] h-[500px] rounded-full bg-violet-500/[0.03] blur-[110px]" />
          <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] rounded-full bg-emerald-500/[0.015] blur-[100px]" />
          <div className="absolute inset-0 opacity-[0.012]" style={{backgroundImage:'linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px)',backgroundSize:'60px 60px'}} />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-[#eef2f8]" />
          <div className="absolute -top-40 -left-20 w-[500px] h-[500px] rounded-full bg-sky-300/20 blur-[130px]" />
          <div className="absolute -bottom-40 -right-20 w-[450px] h-[450px] rounded-full bg-violet-300/15 blur-[110px]" />
          <div className="absolute top-1/2 left-1/2 w-[350px] h-[350px] rounded-full bg-emerald-300/10 blur-[100px]" />
          <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage:'linear-gradient(rgba(100,120,180,.3) 1px,transparent 1px),linear-gradient(90deg,rgba(100,120,180,.3) 1px,transparent 1px)',backgroundSize:'60px 60px'}} />
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   GLASS HELPERS
───────────────────────────────────────── */
function glassCard(isDark, extra = '') {
  return isDark
    ? `bg-white/[0.04] backdrop-blur-2xl border border-white/[0.07] ${extra}`
    : `bg-white/65 backdrop-blur-2xl border border-black/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.07)] ${extra}`;
}
function glassPanel(isDark, extra = '') {
  return isDark
    ? `bg-white/[0.025] backdrop-blur-xl border border-white/[0.05] ${extra}`
    : `bg-white/50 backdrop-blur-xl border border-black/[0.05] shadow-[0_2px_16px_rgba(0,0,0,0.06)] ${extra}`;
}
function textPrimary(isDark) { return isDark ? 'text-white/90' : 'text-slate-800'; }
function textSecondary(isDark) { return isDark ? 'text-white/40' : 'text-slate-400'; }
function textMuted(isDark) { return isDark ? 'text-white/25' : 'text-slate-300'; }

/* ─────────────────────────────────────────
   THEME TOGGLE BUTTON
───────────────────────────────────────── */
function ThemeToggle() {
  const { isDark, toggle } = useTheme();
  return (
    <motion.button
      onClick={toggle}
      whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
      className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-300 ${
        isDark
          ? 'bg-white/[0.05] border-white/[0.08] hover:bg-white/[0.1] hover:border-cyan-400/30'
          : 'bg-black/[0.04] border-black/[0.07] hover:bg-black/[0.08] hover:border-sky-400/40'
      }`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.div key="moon"
            initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.3 }}>
            <Moon className="w-4 h-4 text-cyan-400" />
          </motion.div>
        ) : (
          <motion.div key="sun"
            initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.3 }}>
            <Sun className="w-4 h-4 text-amber-500" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/* ─────────────────────────────────────────
   AUTH SCREEN (LOGIN / REGISTER)
───────────────────────────────────────── */
function AuthScreen({ onLogin }) {
  const { isDark } = useTheme();
  const appWindow = getCurrentWindow();

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

  useEffect(() => {
    setErrorMsg('');
  }, [tab]);

  const getUsers = () => JSON.parse(localStorage.getItem('pytools_users') || '[]');

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    const users = getUsers();

    if (tab === 'register') {
      if (!cassoId.trim() || !username.trim() || !password) {
        return setErrorMsg('Vui lòng điền đầy đủ thông tin!');
      }
      if (password !== confirm) {
        return setErrorMsg('Mật khẩu xác nhận không khớp!');
      }
      if (users.find(u => u.cassoId === cassoId)) {
        return setErrorMsg('Casso ID này đã được đăng ký!');
      }
      if (users.find(u => u.username === username)) {
        return setErrorMsg('Tên đăng nhập này đã tồn tại!');
      }

      setLoading(true);
      setTimeout(() => {
        users.push({ cassoId, username, password });
        localStorage.setItem('pytools_users', JSON.stringify(users));
        if (remember) localStorage.setItem('pytools_session', username);
        setLoading(false);
        onLogin(username);
      }, 1000);

    } else {
      if (!username.trim() || !password) {
        return setErrorMsg('Vui lòng nhập tên đăng nhập và mật khẩu!');
      }
      const validUser = users.find(u => u.username === username && u.password === password);
      
      if (!validUser) {
        return setErrorMsg('Sai tên đăng nhập hoặc mật khẩu!');
      }

      setLoading(true);
      setTimeout(() => {
        if (remember) localStorage.setItem('pytools_session', validUser.username);
        setLoading(false);
        onLogin(validUser.username);
      }, 800);
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
            <div onClick={() => appWindow.minimize()} className="w-3.5 h-3.5 rounded-full bg-yellow-500/80 hover:bg-yellow-400 transition-colors cursor-pointer shadow-sm" title="Thu nhỏ" />
            <div onClick={() => appWindow.toggleMaximize()} className="w-3.5 h-3.5 rounded-full bg-green-500/80 hover:bg-green-400 transition-colors cursor-pointer shadow-sm" title="Phóng to" />
            <div onClick={() => appWindow.close()} className="w-3.5 h-3.5 rounded-full bg-red-500/80 hover:bg-red-400 transition-colors cursor-pointer shadow-sm" title="Đóng" />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 font-inter relative z-10 pb-16">
        <div className="w-full max-w-[340px] flex flex-col items-center">
          
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }} className="flex flex-col items-center gap-2 mb-6">
            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border-cyan-400/30 shadow-[0_0_20px_rgba(0,212,255,0.15)]' : 'bg-gradient-to-br from-sky-400/15 to-violet-400/15 border-sky-400/30 shadow-[0_0_16px_rgba(14,165,233,0.15)]'}`}>
              <Terminal className={`w-6 h-6 ${isDark ? 'text-cyan-400' : 'text-sky-500'}`} />
            </div>
            <span className={`text-xs font-bold tracking-[0.2em] uppercase ${textSecondary(isDark)}`}>PyTools Manager</span>
          </motion.div>

          <motion.div initial={{ y: 20, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.1 }} className={`w-full rounded-3xl overflow-hidden relative ${isDark ? 'bg-white/[0.04] backdrop-blur-3xl border border-white/[0.08] shadow-[0_24px_80px_rgba(0,0,0,0.5)]' : 'bg-white/75 backdrop-blur-3xl border border-black/[0.07] shadow-[0_24px_80px_rgba(0,0,0,0.12)]'}`}>
            <div className={`absolute top-0 left-0 right-0 h-[1px] ${isDark ? 'bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent' : 'bg-gradient-to-r from-transparent via-sky-400/40 to-transparent'}`} />
            
            <div className="p-6">
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
                      <Hash className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted(isDark)}`} />
                      <input className={`${inputCls} pl-10`} type="text" placeholder="Casso ID" value={cassoId} onChange={e => setCassoId(e.target.value)} required />
                    </div>
                  )}

                  <div className="relative">
                    <User className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted(isDark)}`} />
                    <input className={`${inputCls} pl-10`} type="text" placeholder="Tên đăng nhập" value={username} onChange={e => setUsername(e.target.value)} required />
                  </div>

                  <div className="relative">
                    <Key className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted(isDark)}`} />
                    <input className={`${inputCls} pl-10 pr-11`} type={showPass ? 'text' : 'password'} placeholder="Mật khẩu" value={password} onChange={e => setPassword(e.target.value)} required />
                    <button type="button" onClick={() => setShowPass(p => !p)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${textMuted(isDark)} hover:opacity-70 transition-opacity`}>
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {tab === 'register' && (
                    <div className="relative">
                      <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted(isDark)}`} />
                      <input className={`${inputCls} pl-10 pr-11`} type={showConfirm ? 'text' : 'password'} placeholder="Xác nhận mật khẩu" value={confirm} onChange={e => setConfirm(e.target.value)} required />
                      <button type="button" onClick={() => setShowConfirm(p => !p)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${textMuted(isDark)} hover:opacity-70 transition-opacity`}>
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
                  <Package className="w-4 h-4" /> Liên kết & Quản lý Casso ID
                </button>
              </div>

            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   SIDEBAR & TABS
───────────────────────────────────────── */
const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',       id: 'dashboard'  },
  { icon: CalendarDays,    label: 'Tasks & Calendar', id: 'tasks'      },
  { icon: MessageSquare,   label: 'Slack',            id: 'slack'      },
  { icon: StickyNote,      label: 'Quick Notes',      id: 'notes'      },
  { icon: Settings,        label: 'Settings',         id: 'settings'   },
];

function Sidebar({ activeTab, onTabChange, onLogout }) {
  const { isDark } = useTheme();
  return (
    <motion.aside
      initial={{ x: -80, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-[78px] h-full flex flex-col items-center py-6 gap-2 relative z-10 shrink-0"
    >
      <div className={`absolute inset-0 rounded-2xl backdrop-blur-2xl border transition-all duration-500 ${
        isDark
          ? 'bg-white/[0.03] border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.3)]'
          : 'bg-white/60 border-black/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.08)]'
      }`} />

      <div className="relative z-10 mb-5 flex flex-col items-center gap-1">
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
          isDark
            ? 'bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border-cyan-400/30 shadow-[0_0_16px_rgba(0,212,255,0.2)]'
            : 'bg-gradient-to-br from-sky-400/15 to-violet-400/15 border-sky-400/30'
        }`}>
          <Terminal className={`w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-sky-500'}`} />
        </div>
        <span className={`text-[8px] font-bold tracking-[0.2em] uppercase ${textMuted(isDark)}`}>PyTools</span>
      </div>

      <nav className="relative z-10 flex flex-col items-center gap-1.5 flex-1 w-full px-2">
        {NAV_ITEMS.map(({ icon: Icon, label, id }) => {
          const isActive = activeTab === id;
          return (
            <motion.button
              key={id} onClick={() => onTabChange(id)}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="relative group w-12 h-12 rounded-xl flex items-center justify-center"
            >
              {isActive && (
                <motion.div layoutId="sidebarActive"
                  className={`absolute inset-0 rounded-xl border ${
                    isDark
                      ? 'bg-white/[0.1] border-cyan-400/40 shadow-[0_0_16px_rgba(0,212,255,0.15)]'
                      : 'bg-sky-50/80 border-sky-300/50 shadow-[0_0_12px_rgba(14,165,233,0.12)]'
                  }`}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }} />
              )}
              {!isActive && (
                <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 ${isDark ? 'bg-white/[0.04]' : 'bg-black/[0.04]'}`} />
              )}
              {isActive && (
                <motion.div layoutId="sidebarIndicator"
                  className={`absolute -left-[9px] w-[3px] h-6 rounded-full ${
                    isDark ? 'bg-cyan-400 shadow-[0_0_8px_rgba(0,212,255,0.6)]' : 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.4)]'
                  }`}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }} />
              )}
              <Icon className={`w-5 h-5 relative z-10 transition-colors duration-300 ${
                isActive
                  ? isDark ? 'text-cyan-400' : 'text-sky-500'
                  : isDark ? 'text-white/30 group-hover:text-white/60' : 'text-slate-400 group-hover:text-slate-600'
              }`} />
              <div className={`absolute left-full ml-3 px-2.5 py-1 rounded-lg backdrop-blur-xl border text-[11px] font-medium opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-1 group-hover:translate-x-0 whitespace-nowrap z-50 ${
                isDark ? 'bg-white/10 border-white/10 text-white/80' : 'bg-white/90 border-black/[0.06] text-slate-700 shadow-sm'
              }`}>
                {label}
              </div>
            </motion.button>
          );
        })}
      </nav>

      <div className="relative z-10 flex flex-col items-center gap-2">
        <ThemeToggle />
        <motion.button
          onClick={onLogout}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-300 group ${
            isDark
              ? 'bg-white/[0.04] border-white/[0.07] hover:bg-red-500/10 hover:border-red-500/20'
              : 'bg-black/[0.03] border-black/[0.06] hover:bg-red-50 hover:border-red-200'
          }`}
          title="Đăng xuất"
        >
          <LogOut className={`w-4 h-4 transition-colors duration-300 ${
            isDark ? 'text-white/25 group-hover:text-red-400' : 'text-slate-400 group-hover:text-red-500'
          }`} />
        </motion.button>
      </div>
    </motion.aside>
  );
}

const STAT_COLORS = {
  cyan:   { dark: { text:'text-cyan-400',    bg:'bg-cyan-500/[0.08]',    border:'border-cyan-400/20',    line:'via-cyan-400/50'    }, light: { text:'text-sky-500',     bg:'bg-sky-50',     border:'border-sky-300/50',  line:'via-sky-400/40'    } },
  green:  { dark: { text:'text-emerald-400', bg:'bg-emerald-500/[0.08]', border:'border-emerald-400/20', line:'via-emerald-400/50' }, light: { text:'text-emerald-500', bg:'bg-emerald-50', border:'border-emerald-200', line:'via-emerald-400/40' } },
  orange: { dark: { text:'text-orange-400',  bg:'bg-orange-500/[0.08]',  border:'border-orange-400/20',  line:'via-orange-400/50'  }, light: { text:'text-amber-500',   bg:'bg-amber-50',   border:'border-amber-200',   line:'via-amber-400/40'   } },
  purple: { dark: { text:'text-violet-400',  bg:'bg-violet-500/[0.08]',  border:'border-violet-400/20',  line:'via-violet-400/50'  }, light: { text:'text-violet-500',  bg:'bg-violet-50',  border:'border-violet-200',  line:'via-violet-400/40'  } },
};

function StatCard({ icon: Icon, label, value, color, delay = 0 }) {
  const { isDark } = useTheme();
  const c = (STAT_COLORS[color] || STAT_COLORS.cyan)[isDark ? 'dark' : 'light'];
  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay, ease: [0.22,1,.36,1] }}>
      <div className={`relative overflow-hidden rounded-xl px-5 py-4 transition-all duration-500 group hover:scale-[1.01] ${glassCard(isDark)}`}>
        <div className={`absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent ${c.line} to-transparent`} />
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${c.bg} ${c.border}`}>
            <Icon className={`w-4 h-4 ${c.text}`} />
          </div>
          <div>
            <p className={`text-[11px] font-medium tracking-wide uppercase ${textSecondary(isDark)}`}>{label}</p>
            <p className={`text-xl font-bold tracking-tight ${textPrimary(isDark)}`}>{value}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ToolCard({ tool, index, onToggle, onSelectPath }) {
  const [hovered, setHovered] = useState(false);
  const { isDark } = useTheme();
  const running = tool.status === 'running';
  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.05 * index, ease: [0.22,1,.36,1] }}
      whileHover={{ y: -4 }}
      onHoverStart={() => setHovered(true)} onHoverEnd={() => setHovered(false)}
      className="relative group"
    >
      <div className={`relative overflow-hidden rounded-2xl transition-all duration-500 ${
        isDark
          ? hovered ? 'bg-white/[0.06] border border-white/[0.14] shadow-[0_16px_48px_rgba(0,0,0,0.4)]' : 'bg-white/[0.03] border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.3)]'
          : hovered ? 'bg-white/90 border border-black/[0.1] shadow-[0_12px_40px_rgba(0,0,0,0.1)]' : 'bg-white/65 border border-black/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.06)]'
      } backdrop-blur-2xl`}>
        <div className={`absolute top-0 left-0 right-0 h-[1px] transition-opacity duration-500 ${
          running
            ? isDark ? 'bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent opacity-100' : 'bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent opacity-100'
            : 'opacity-0 group-hover:opacity-100 bg-gradient-to-r from-transparent via-white/10 to-transparent'
        }`} />
        {running && <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full blur-3xl bg-emerald-400/[0.05]" />}
        
        <div className="relative z-10 p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl border ${
                running
                  ? isDark ? 'bg-emerald-500/[0.08] border-emerald-400/20' : 'bg-emerald-50 border-emerald-200'
                  : isDark ? 'bg-white/[0.04] border-white/[0.07]' : 'bg-slate-50 border-slate-200'
              }`}>{tool.icon}</div>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase border ${
                running
                  ? isDark ? 'bg-emerald-500/[0.1] text-emerald-400 border-emerald-400/20' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  : isDark ? 'bg-white/[0.04] text-white/30 border-white/[0.06]' : 'bg-slate-100 text-slate-400 border-slate-200'
              }`}>
                <span className="relative flex h-1.5 w-1.5">
                  {running && <span className={`animate-ping absolute inset-0 rounded-full opacity-75 ${isDark ? 'bg-emerald-400' : 'bg-emerald-500'}`} />}
                  <span className={`relative rounded-full h-1.5 w-1.5 ${running ? isDark ? 'bg-emerald-400' : 'bg-emerald-500' : isDark ? 'bg-white/30' : 'bg-slate-300'}`} />
                </span>
                {running ? 'Đang chạy' : 'Đã dừng'}
              </div>
            </div>
            <button className={`w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 ${isDark ? 'text-white/20 hover:text-white/50 hover:bg-white/[0.06]' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'}`}>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <div className="mb-4">
            <h3 className={`text-[15px] font-semibold mb-1 ${textPrimary(isDark)}`}>{tool.name}</h3>
            <p className={`text-[12px] leading-relaxed line-clamp-2 ${textSecondary(isDark)}`}>{tool.description}</p>
          </div>

          {/* Vùng Chọn File Thực Thi */}
          <div className="mb-4 flex items-center gap-2">
            <div className={`flex-1 px-3 py-2 rounded-lg text-[10px] font-mono truncate border ${isDark ? 'bg-black/20 border-white/10 text-white/50' : 'bg-slate-100 border-black/5 text-slate-500'}`} title={tool.path || 'Chưa thiết lập đường dẫn'}>
              {tool.path || 'Chưa thiết lập đường dẫn...'}
            </div>
            <button 
              onClick={() => onSelectPath(tool.id)} 
              className={`p-2 rounded-lg border transition-all ${isDark ? 'bg-white/[0.04] hover:bg-white/10 border-white/10 text-white/70' : 'bg-white hover:bg-slate-50 border-black/10 text-slate-700 shadow-sm'}`} 
              title="Chọn file thực thi (.exe, .py)"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between mt-auto">
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${isDark ? 'text-white/20 bg-white/[0.03] border-white/[0.05]' : 'text-slate-400 bg-slate-50 border-slate-200'}`}>v{tool.version}</span>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => onToggle(tool.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold border transition-all duration-300 ${
                running
                  ? isDark ? 'bg-white/[0.06] text-white/60 border-white/[0.08] hover:bg-red-500/10 hover:text-red-400 hover:border-red-400/20' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200'
                  : isDark ? 'bg-gradient-to-b from-cyan-500/20 to-cyan-500/10 text-cyan-400 border-cyan-400/25 hover:from-cyan-500/30' : 'bg-gradient-to-b from-sky-500 to-sky-600 text-white border-sky-600/20 shadow-[0_4px_12px_rgba(14,165,233,0.2)]'
              }`}>
              {running ? <><Square className="w-3 h-3" /><span>Dừng</span></> : <><Play className="w-3 h-3" /><span>Khởi chạy</span></>}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Chuyển toàn bộ status mặc định thành 'stopped'
const TOOLS_DATA = [
  { id:1, name:'FastAPI Server',    description:'Framework API hiệu suất cao, hỗ trợ async, auto-generate docs OpenAPI.',       icon:'⚡', version:'0.104.1', status:'stopped' },
  { id:2, name:'Selenium Scraper',  description:'Tự động hóa trình duyệt để thu thập dữ liệu web quy mô lớn.',                  icon:'🕷️', version:'4.16.0',  status:'stopped' },
  { id:3, name:'Celery Worker',     description:'Hệ thống task queue phân tán, xử lý tác vụ nền bất đồng bộ.',                  icon:'🌿', version:'5.3.6',   status:'stopped' },
  { id:4, name:'Jupyter Notebook',  description:'Môi trường notebook tương tác cho data science & machine learning.',            icon:'📓', version:'7.0.6',   status:'stopped' },
  { id:5, name:'PyTest Runner',     description:'Framework kiểm thử Python mạnh mẽ với hệ thống plugin phong phú.',             icon:'🧪', version:'7.4.3',   status:'stopped' },
  { id:6, name:'Black Formatter',   description:'Công cụ format code Python tự động, đảm bảo tính nhất quán.',                  icon:'🎨', version:'23.12.1', status:'stopped' },
  { id:7, name:'Uvicorn ASGI',      description:'Lightning-fast ASGI server cho Python, hỗ trợ HTTP/2 & WebSockets.',           icon:'🦄', version:'0.25.0',  status:'stopped' },
  { id:8, name:'Redis Cache',       description:'In-memory data store tốc độ cao, sử dụng làm cache & message broker.',         icon:'🔴', version:'5.0.1',   status:'stopped' },
  { id:9, name:'Pandas Pipeline',   description:'Xử lý & phân tích dữ liệu dạng bảng với DataFrame hiệu suất cao.',             icon:'🐼', version:'2.1.4',   status:'stopped' },
];

function DashboardTab() {
  const { isDark } = useTheme();
  const [search, setSearch] = useState('');
  
  // Nạp cấu hình đường dẫn từ LocalStorage
  const [tools, setTools] = useState(() => {
    const saved = localStorage.getItem('pytools_paths');
    const paths = saved ? JSON.parse(saved) : {};
    return TOOLS_DATA.map(t => ({ ...t, path: paths[t.id] || '' }));
  });

  const [allLogs, setAllLogs] = useState({});
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [terminalHeight, setTerminalHeight] = useState(250);

  useEffect(() => {
    const unlisten = listen('python-log', (event) => {
      const { task_id, message } = event.payload;
      setAllLogs(prev => ({
        ...prev,
        [task_id]: (prev[task_id] || '') + message + '\n'
      }));
    });
    return () => { unlisten.then(f => f()); };
  }, []);

  // Xử lý chọn File thông qua dialog của Tauri
  const handleSelectPath = async (toolId) => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Executables / Scripts', extensions: ['exe', 'py', 'bat', 'sh'] }]
      });

      if (selected) {
        setTools(prev => {
          const next = prev.map(t => t.id === toolId ? { ...t, path: selected } : t);
          // Lưu xuống LocalStorage
          const pathsToSave = next.reduce((acc, t) => { if(t.path) acc[t.id] = t.path; return acc; }, {});
          localStorage.setItem('pytools_paths', JSON.stringify(pathsToSave));
          return next;
        });
      }
    } catch (error) {
      console.error("Lỗi khi mở hộp thoại chọn file:", error);
    }
  };

  // Xử lý Khởi chạy / Dừng Tool
  const toggleTool = (toolId) => {
    setTools(prev => {
      const tool = prev.find(t => t.id === toolId);
      
      // Chặn nếu chưa set đường dẫn
      if (!tool.path) {
        alert(`Vui lòng chọn đường dẫn file thực thi cho ${tool.name} trước khi chạy!`);
        return prev;
      }

      if (tool.status === 'running') {
        // Handle logic Stop tool here (Gửi invoke stop cho Tauri backend)
        // ... invoke('stop_python_script', { taskId: tool.currentTaskId })
        setAllLogs(logs => ({ 
          ...logs, 
          [tool.currentTaskId]: (logs[tool.currentTaskId] || '') + `[${new Date().toLocaleTimeString()}] Tiến trình đã bị dừng.\n` 
        }));
        return prev.map(t => t.id === toolId ? { ...t, status: 'stopped', currentTaskId: null } : t);
      } else {
        // Handle logic Run
        const taskId = `${tool.name}-${Date.now()}`;
        setActiveTaskId(taskId);
        setAllLogs(logs => ({ 
          ...logs, 
          [taskId]: `[${new Date().toLocaleTimeString()}] Khởi chạy ${tool.name}...\n> Thực thi: ${tool.path}\n` 
        }));
        
        invoke('run_python_script', { scriptPath: tool.path, taskId });
        return prev.map(t => t.id === toolId ? { ...t, status: 'running', currentTaskId: taskId } : t);
      }
    });
  };

  const filtered = useMemo(() => tools.filter(t => t.name.toLowerCase().includes(search.toLowerCase())), [tools, search]);

  const runningCount = tools.filter(t => t.status === 'running').length;
  const stoppedCount = tools.filter(t => t.status === 'stopped').length;

  return (
    <div className="flex flex-col h-full gap-3 overflow-hidden">
      
      <div className="flex-1 overflow-y-auto pr-1 space-y-4">
        {/* Header Stats */}
        <div className={`rounded-2xl p-5 ${glassPanel(isDark)}`}>
           <div className="flex items-center justify-between mb-5">
              <h1 className={`text-2xl font-bold ${textPrimary(isDark)}`}>Dashboard</h1>
              <div className="relative group max-w-xs w-full">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted(isDark)}`} />
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm công cụ..."
                  className={`w-full h-9 pl-9 rounded-xl text-sm border focus:outline-none transition-all ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-black/10'}`} />
              </div>
           </div>

           <div className="grid grid-cols-4 gap-3">
              <StatCard icon={Package} label="Tổng số" value={tools.length} color="cyan" />
              <StatCard icon={Activity} label="Đang chạy" value={runningCount} color="green" />
              <StatCard icon={CircleOff} label="Đã dừng" value={stoppedCount} color="orange" />
              <StatCard icon={Zap} label="Hiệu suất" value="56%" color="purple" />
           </div>
        </div>

        {/* Grid Tools */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 pb-4">
          {filtered.map((tool) => (
            <ToolCard 
              key={tool.id} 
              tool={tool} 
              index={tool.id} 
              onToggle={toggleTool} 
              onSelectPath={handleSelectPath} 
            />
          ))}
        </div>
      </div>

      {/* TERMINAL */}
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{ height: terminalHeight }}
        className={`rounded-t-2xl flex flex-col border-t border-x overflow-hidden shadow-2xl transition-all duration-300 ${
          isDark ? 'bg-[#0d1117] border-white/10' : 'bg-[#1e1e1e] border-black/10'
        }`}
      >
        <div className="h-10 px-4 flex items-center justify-between bg-black/20 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar max-w-[70%]">
            <div className="flex items-center gap-2 mr-4">
              <Terminal className="w-4 h-4 text-white/50" />
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Output</span>
            </div>
            
            {/* Tabs theo Tên Tool thay vì TaskId phức tạp */}
            {Object.keys(allLogs).map(id => (
              <button 
                key={id} onClick={() => setActiveTaskId(id)}
                className={`text-[11px] px-3 py-1 rounded-md whitespace-nowrap transition-all ${
                  activeTaskId === id ? 'bg-white/10 text-cyan-400 border border-cyan-400/30' : 'text-white/40 hover:text-white/60'
                }`}
              >
                {id.split('-')[0]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setAllLogs({})} className={`p-1.5 rounded-lg hover:bg-white/10 ${textMuted(isDark)}`} title="Clear logs">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-white/10" />
            <button onClick={() => setTerminalHeight(terminalHeight > 100 ? 40 : 250)} className={`p-1.5 rounded-lg hover:bg-white/10 ${textMuted(isDark)}`}>
               {terminalHeight > 100 ? <ChevronLeft className="w-4 h-4 rotate-[-90deg]" /> : <ChevronLeft className="w-4 h-4 rotate-[90deg]" />}
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto font-mono text-[13px] bg-black/10">
          {activeTaskId ? (
            <pre className="text-emerald-400 whitespace-pre-wrap leading-relaxed selection:bg-emerald-500/30">
              {allLogs[activeTaskId]}
              <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="inline-block w-2 h-4 bg-emerald-500 ml-1 translate-y-1" />
            </pre>
          ) : (
            <div className="h-full flex items-center justify-center opacity-20 flex-col gap-2">
               <Command className="w-8 h-8" />
               <p className="text-xs uppercase tracking-widest">Chưa có tiến trình nào được chạy</p>
            </div>
          )}
        </div>
      </motion.div>

    </div>
  );
}

/* ─────────────────────────────────────────
   TASKS & CALENDAR (JAPAN STYLE)
───────────────────────────────────────── */

function TasksTab({ userName = "guest" }) {
  const { isDark } = useTheme();
  const today = new Date();
  const [calDate, setCalDate] = useState(today);
  const [direction, setDirection] = useState(0);

  const STORAGE_KEY = `pytools_tasks_${userName}`;

  const [allTasks, setAllTasks] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [newTask, setNewTask] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allTasks));
  }, [allTasks, STORAGE_KEY]);

  const JP_HOLIDAYS = {
    '2026-01-01': { name: 'Ganjitsu', desc: 'Ngày đầu năm mới.' },
    '2026-02-11': { name: 'Kenkoku Kinyen no Hi', desc: 'Ngày Quốc khánh.' },
    '2026-02-23': { name: 'Tennō Tanzōbi', desc: 'Sinh nhật Nhật Hoàng.' },
    '2026-03-20': { name: 'Shunbun no Hi', desc: 'Ngày Xuân phân.' },
    '2026-04-29': { name: 'Shōwa no Hi', desc: 'Ngày Showa.' },
    '2026-05-03': { name: 'Kenpō Kinyenbi', desc: 'Ngày Hiến pháp.' },
    '2026-05-04': { name: 'Midori no Hi', desc: 'Ngày Xanh.' },
    '2026-05-05': { name: 'Kodomo no Hi', desc: 'Ngày Thiếu nhi.' },
    '2026-07-20': { name: 'Umi no Hi', desc: 'Ngày của Biển.' },
    '2026-08-11': { name: 'Yama no Hi', desc: 'Ngày của Núi.' },
    '2026-09-21': { name: 'Keirō no Hi', desc: 'Ngày Kính lão.' },
    '2026-11-03': { name: 'Bunka no Hi', desc: 'Ngày Văn hóa.' },
    '2026-11-23': { name: 'Kinrō Kansha no Hi', desc: 'Ngày Tạ ơn Lao động.' }
  };

  const year = calDate.getFullYear(), month = calDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

  const formatDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const selectedDateStr = formatDate(calDate);
  const dailyTasks = allTasks.filter(t => t.date === selectedDateStr);

  const addTask = () => {
    if (!newTask.trim()) return;
    setAllTasks(p => [...p, { id: Date.now(), text: newTask.trim(), done: false, date: selectedDateStr }]);
    setNewTask('');
  };

  return (
    <div className="flex gap-5 h-full overflow-hidden">
      {/* CỘT TRÁI: LỊCH */}
      <div className="w-80 shrink-0 flex flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar">
        <div className={`rounded-2xl p-5 ${glassPanel(isDark)}`}>
          <div className="flex items-center justify-between mb-6">
            <span className={`font-bold text-base ${textPrimary(isDark)}`}>{MONTHS[month]} {year}</span>
            <div className="flex gap-1">
              <button onClick={() => {setDirection(-1); setCalDate(new Date(year, month - 1, 1))}} className={`w-8 h-8 rounded-xl flex items-center justify-center hover:bg-black/5 ${textMuted(isDark)}`}>‹</button>
              <button onClick={() => {setDirection(1); setCalDate(new Date(year, month + 1, 1))}} className={`w-8 h-8 rounded-xl flex items-center justify-center hover:bg-black/5 ${textMuted(isDark)}`}>›</button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((d, i) => (
              <div key={d} className={`text-center text-[10px] font-bold ${i === 0 ? 'text-red-500' : textMuted(isDark)}`}>{d}</div>
            ))}
          </div>

          <div className="relative overflow-hidden min-h-[240px]">
            <AnimatePresence mode="popLayout" custom={direction}>
              <motion.div key={month} custom={direction} initial={{ x: direction * 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: direction * -50, opacity: 0 }} transition={{ duration: 0.3 }} className="grid grid-cols-7 gap-1">
                {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
                {Array(daysInMonth).fill(null).map((_, i) => {
                  const d = i + 1;
                  const loopDate = new Date(year, month, d);
                  const dStr = formatDate(loopDate);
                  const isToday = dStr === formatDate(today);
                  const isSelected = dStr === selectedDateStr;
                  const holiday = JP_HOLIDAYS[dStr];
                  const hasUnfinishedTasks = allTasks.some(t => t.date === dStr && !t.done);

                  return (
                    <button key={d} onClick={() => setCalDate(loopDate)}
                      className={`relative h-10 w-full rounded-xl text-sm font-bold transition-all flex flex-col items-center justify-center ${
                        isSelected 
                          ? 'bg-sky-500 text-white shadow-lg' 
                          : isToday 
                            ? (isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700') 
                            : holiday ? 'text-red-500 hover:bg-red-50' : (isDark ? 'text-white/60 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100')
                      }`}>
                      <span>{d}</span>
                      {hasUnfinishedTasks && !isSelected && (
                        <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-cyan-500" />
                      )}
                    </button>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className={`rounded-2xl p-5 ${glassPanel(isDark)}`}>
          <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${textSecondary(isDark)}`}>User: {userName}</p>
          <p className={`text-lg font-black ${textPrimary(isDark)}`}>{calDate.toLocaleDateString('vi-VN', { weekday: 'long' })}</p>
          <p className={`text-sm font-medium mb-4 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Ngày {calDate.getDate()} thg {calDate.getMonth() + 1}</p>
          
          {JP_HOLIDAYS[selectedDateStr] ? (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
              <p className="text-red-500 font-bold text-sm mb-1">🎌 {JP_HOLIDAYS[selectedDateStr].name}</p>
              <p className={`text-[11px] leading-relaxed ${isDark ? 'text-red-200/80' : 'text-red-800/70'}`}>{JP_HOLIDAYS[selectedDateStr].desc}</p>
            </div>
          ) : (
            <div className={`p-4 rounded-2xl border border-dashed ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <p className={`text-[11px] text-center ${textMuted(isDark)}`}>Ngày thường</p>
            </div>
          )}
        </div>
      </div>

      {/* CỘT PHẢI: TASK */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div className={`rounded-2xl p-6 ${glassPanel(isDark)}`}>
          <h2 className={`font-black text-xl mb-5 ${textPrimary(isDark)}`}>Công việc ngày {calDate.getDate()}</h2>
          <div className="flex gap-2">
            <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()}
              placeholder="Thêm công việc..." className={`flex-1 h-12 px-4 rounded-xl text-sm border focus:outline-none transition-all ${isDark ? 'bg-white/[0.04] border-white/10 text-white' : 'bg-white border-slate-200'}`} />
            <button onClick={addTask} className="h-12 px-5 rounded-xl bg-sky-500 text-white shadow-lg hover:bg-sky-600 transition-all"><Plus className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {dailyTasks.length > 0 ? dailyTasks.map(task => (
              <motion.div key={task.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                className={`rounded-2xl p-4 flex items-center gap-4 border transition-all ${isDark ? 'bg-white/[0.03] border-white/5 hover:bg-white/[0.05]' : 'bg-white border-black/5 shadow-sm'}`}>
                <button onClick={() => setAllTasks(p => p.map(t => t.id === task.id ? { ...t, done: !t.done } : t))}
                  className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-all ${task.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>
                  {task.done && <Check className="w-4 h-4" />}
                </button>
                <span className={`flex-1 text-sm font-medium transition-all ${
                  task.done 
                    ? `line-through ${isDark ? 'text-white/30' : 'text-slate-400'}` 
                    : textPrimary(isDark)
                }`}>
                  {task.text}
                </span>
                <button onClick={() => setAllTasks(p => p.filter(t => t.id !== task.id))} className="text-red-400 hover:text-red-600 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
              </motion.div>
            )) : (
              <div className={`text-center py-20 ${textMuted(isDark)} opacity-50`}>
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm font-bold uppercase tracking-widest">Không có việc</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function SlackTab() {
  const { isDark } = useTheme();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [notifs, setNotifs] = useState({
    onStart: true, onStop: false, onError: true, onCpu: false,
  });
  const [logs, setLogs] = useState([
    { id:1, time:'14:32:01', type:'success', msg:'FastAPI Server bắt đầu chạy — thông báo đã gửi.' },
    { id:2, time:'13:18:45', type:'error',   msg:'Redis Cache lỗi kết nối — thông báo đã gửi.'    },
    { id:3, time:'12:05:10', type:'success', msg:'Jupyter Notebook khởi động — thông báo đã gửi.' },
  ]);
  const [sending, setSending] = useState(false);

  const testSend = () => {
    setSending(true);
    setTimeout(() => {
      const now = new Date();
      const time = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
      setLogs(p => [{ id: Date.now(), time, type:'success', msg:'Test message gửi thành công!' }, ...p.slice(0,9)]);
      setSending(false);
    }, 1000);
  };

  const notifLabels = {
    onStart: 'Báo khi Tool bắt đầu chạy',
    onStop:  'Báo khi Tool bị dừng',
    onError: 'Báo khi Tool gặp lỗi',
    onCpu:   'Báo khi CPU vượt 80%',
  };

  const inputCls = `w-full h-11 px-4 rounded-xl text-sm border focus:outline-none transition-all duration-300 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white/80 placeholder:text-white/20 focus:border-cyan-400/30 focus:bg-white/[0.07]' : 'bg-white/70 border-slate-200 text-slate-700 placeholder:text-slate-400 focus:border-sky-400/50 focus:bg-white/90'}`;

  return (
    <div className="flex gap-5 h-full overflow-hidden">
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-0.5">
        <div className={`rounded-2xl p-6 ${glassPanel(isDark)}`}>
          <div className="flex items-center gap-3 mb-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${isDark ? 'bg-violet-500/[0.1] border-violet-400/20' : 'bg-violet-50 border-violet-200'}`}>
              <MessageSquare className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
            </div>
            <div>
              <h2 className={`font-bold text-base ${textPrimary(isDark)}`}>Slack Integration</h2>
              <p className={`text-xs ${textSecondary(isDark)}`}>Nhận thông báo qua Slack Webhook</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className={`text-xs font-semibold block mb-2 ${textSecondary(isDark)}`}>WEBHOOK URL</label>
              <div className="flex gap-2">
                <input value={webhookUrl} onChange={e=>setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/..." className={inputCls} />
                <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} onClick={testSend} disabled={sending}
                  className={`px-4 h-11 rounded-xl text-sm font-semibold border flex items-center gap-2 shrink-0 transition-all duration-300 ${isDark ? 'bg-violet-500/20 text-violet-300 border-violet-400/25 hover:bg-violet-500/30' : 'bg-violet-500 text-white border-violet-600/20 shadow-sm hover:bg-violet-600'}`}>
                  {sending ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? '' : 'Test'}
                </motion.button>
              </div>
            </div>

            <div>
              <label className={`text-xs font-semibold block mb-3 ${textSecondary(isDark)}`}>LOẠI THÔNG BÁO</label>
              <div className="space-y-2.5">
                {Object.entries(notifLabels).map(([key, label]) => (
                  <div key={key} className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 ${isDark ? 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]' : 'bg-white/60 border-slate-200 hover:bg-white/80'}`}>
                    <span className={`text-sm ${textPrimary(isDark)}`}>{label}</span>
                    <button onClick={() => setNotifs(p => ({...p, [key]: !p[key]}))}
                      className="transition-all duration-300">
                      {notifs[key]
                        ? <ToggleRight className={`w-9 h-9 ${isDark ? 'text-cyan-400' : 'text-sky-500'}`} />
                        : <ToggleLeft  className={`w-9 h-9 ${isDark ? 'text-white/20' : 'text-slate-300'}`} />
                      }
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-80 shrink-0 flex flex-col gap-3">
        <div className={`rounded-2xl p-5 flex-1 flex flex-col ${glassPanel(isDark)}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-semibold text-sm ${textPrimary(isDark)}`}>Lịch sử gửi tin</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${isDark ? 'text-white/30 bg-white/[0.04] border-white/[0.06]' : 'text-slate-400 bg-slate-100 border-slate-200'}`}>{logs.length} logs</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2">
            <AnimatePresence>
              {logs.map(log => (
                <motion.div key={log.id} initial={{y:-10,opacity:0}} animate={{y:0,opacity:1}}
                  className={`rounded-xl p-3 border ${isDark ? 'bg-white/[0.03] border-white/[0.05]' : 'bg-white/60 border-slate-200'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {log.type === 'success'
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      : <AlertCircle  className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    }
                    <span className={`text-[10px] font-mono ${textMuted(isDark)}`}>{log.time}</span>
                  </div>
                  <p className={`text-[11px] leading-relaxed ${textSecondary(isDark)}`}>{log.msg}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotesTab() {
  const { isDark } = useTheme();
  const [notes, setNotes] = useState([
    { id:1, title:'Deploy checklist',  content:'- Update env vars\n- Run migrations\n- Restart workers\n- Verify health check', pinned:true  },
    { id:2, title:'API endpoints cần review', content:'GET /api/v2/tools\nPOST /api/v2/tools/start\nDELETE /api/v2/tools/:id', pinned:false },
    { id:3, title:'Meeting notes 15/4', content:'Sprint review: hoàn thành 8/10 tasks\nBlocker: Redis config\nAction: kiểm tra port 6379', pinned:false },
  ]);
  const [active, setActive] = useState(1);
  const [editContent, setEditContent] = useState(notes[0].content);
  const [editTitle, setEditTitle] = useState(notes[0].title);
  const [saved, setSaved] = useState(false);

  const activeNote = notes.find(n => n.id === active);

  useEffect(() => {
    if (activeNote) { setEditContent(activeNote.content); setEditTitle(activeNote.title); }
  }, [active]);

  const save = () => {
    setNotes(p => p.map(n => n.id===active ? {...n, title: editTitle, content: editContent} : n));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addNote = () => {
    const id = Date.now();
    const nn = { id, title: 'Ghi chú mới', content: '', pinned: false };
    setNotes(p => [...p, nn]);
    setActive(id);
  };

  const deleteNote = (id) => {
    setNotes(p => p.filter(n => n.id !== id));
    if (active === id) { const remaining = notes.filter(n => n.id !== id); if (remaining.length) setActive(remaining[0].id); }
  };

  return (
    <div className="flex gap-4 h-full overflow-hidden">
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

      <div className={`flex-1 flex flex-col rounded-2xl overflow-hidden ${glassPanel(isDark)}`}>
        {activeNote ? (
          <>
            <div className={`flex items-center gap-3 p-4 border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-200'}`}>
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                className={`flex-1 bg-transparent text-base font-bold focus:outline-none ${textPrimary(isDark)} placeholder:${textMuted(isDark)}`}
                placeholder="Tiêu đề..." />
              <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} onClick={save}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all duration-300 ${
                  saved
                    ? isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-400/25' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : isDark ? 'bg-cyan-500/15 text-cyan-400 border-cyan-400/25 hover:bg-cyan-500/25' : 'bg-sky-500 text-white border-sky-600/20 shadow-sm hover:bg-sky-600'
                }`}>
                {saved ? <><CheckCircle2 className="w-3.5 h-3.5" /> Đã lưu</> : 'Lưu ghi chú'}
              </motion.button>
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

function SettingsTab() {
  const { isDark } = useTheme();
  return (
    <div className={`rounded-2xl p-8 flex flex-col items-center justify-center h-full ${glassPanel(isDark)}`}>
      <Settings className={`w-14 h-14 mb-4 opacity-20 ${textSecondary(isDark)}`} />
      <p className={`text-lg font-semibold ${textSecondary(isDark)}`}>Cài đặt</p>
      <p className={`text-sm mt-1 ${textMuted(isDark)}`}>Đang phát triển...</p>
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN APP (DASHBOARD SHELL)
───────────────────────────────────────── */
function AppShell({ onLogout, userName }) { 
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const TAB_COMPONENTS = {
    dashboard: DashboardTab,
    tasks:     () => <TasksTab userName={userName} />,
    slack:     SlackTab,
    notes:     NotesTab,
    settings:  SettingsTab,
  };

  const TabComponent = TAB_COMPONENTS[activeTab] || DashboardTab;
  const appWindow = getCurrentWindow();

  return (
    <div className={`h-screen w-screen overflow-hidden rounded-[14px] border flex flex-col relative ${isDark ? 'border-white/10 bg-[#060a14]' : 'border-black/10 bg-[#e8edf5]'}`} style={{ transform: 'translateZ(0)' }}>
      <BgFx />
      <div className="h-9 w-full relative shrink-0 border-b border-black/5 backdrop-blur-sm">
        <div data-tauri-drag-region="true" className="absolute inset-0 z-0 cursor-move" />
        <div className="absolute inset-0 z-10 flex items-center justify-between px-4 pointer-events-none">
          <div className="w-16" />
          <div className="flex-1 flex justify-center"><span className={`text-[11px] font-medium tracking-wide uppercase ${isDark ? 'text-white/40' : 'text-black/40'}`}>Python Tools Manager — v2.1.0</span></div>
          <div className="flex items-center gap-2.5 justify-end w-16 pointer-events-auto">
            <div onClick={() => appWindow.minimize()} className="w-3.5 h-3.5 rounded-full bg-yellow-500/80 hover:bg-yellow-400 transition-colors cursor-pointer shadow-sm" />
            <div onClick={() => appWindow.toggleMaximize()} className="w-3.5 h-3.5 rounded-full bg-green-500/80 hover:bg-green-400 transition-colors cursor-pointer shadow-sm" />
            <div onClick={() => appWindow.close()} className="w-3.5 h-3.5 rounded-full bg-red-500/80 hover:bg-red-400 transition-colors cursor-pointer shadow-sm" />
          </div>
        </div>
      </div>

      <div className="flex-1 flex p-3 gap-3 overflow-hidden relative z-10">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} onLogout={onLogout} />
        <main className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }} className="h-full">
              <TabComponent />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   ROOT - QUẢN LÝ ĐĂNG NHẬP VÀ USER
───────────────────────────────────────── */
function RootApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem('pytools_session');
    if (session) {
      setUserName(session);
      setIsLoggedIn(true);
    }
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    import('@tauri-apps/api/window').then(async (m) => {
      const win = m.getCurrentWindow ? m.getCurrentWindow() : m.appWindow;
      import('@tauri-apps/api/dpi').then(async (dpi) => {
        try {
          if (!isLoggedIn) {
            await win.setSize(new dpi.LogicalSize(420, 650));
            await win.center();
          } else {
            await win.setSize(new dpi.LogicalSize(1100, 750));
            await win.center();
          }
        } catch (e) { console.error(e); }
      });
    });
  }, [isLoggedIn, isReady]);

  const handleLogout = () => {
    localStorage.removeItem('pytools_session');
    setIsLoggedIn(false);
  }

  if (!isReady) return null;

  return (
    <AnimatePresence mode="wait">
      {!isLoggedIn ? (
        <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.4 }} className="h-full w-full">
          <AuthScreen onLogin={(user) => {
            setUserName(user);
            setIsLoggedIn(true);
          }} />
        </motion.div>
      ) : (
        <motion.div key="app" initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45 }} className="h-full w-full">
          <AppShell userName={userName} onLogout={handleLogout} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function MainApp() {
  return (
    <ThemeProvider>
      <RootApp />
    </ThemeProvider>
  );
}