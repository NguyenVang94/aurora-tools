// @ts-nocheck
import SettingsTab from './components/SettingsTab';
import './App.css';
import { supabase } from './supabase';
import AdminUserTab from './components/AdminUserTab';
import UserTab from './components/UserTab';
import { ShieldAlert } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalSize } from '@tauri-apps/api/dpi';
import {
  LayoutDashboard, CalendarDays, MessageSquare, StickyNote, Settings, Terminal, LogOut, User
} from 'lucide-react';

// Import từ file Utils
import { ThemeProvider, useTheme, BgFx, ThemeToggle, glassPanel, textMuted, textSecondary, normalizeVersion } from './utils';
import auroraLogo from './assets/aurora-logo.png';
// Import các Components
import AuthScreen from './components/AuthScreen';
import DashboardTab from './components/DashboardTab';
import TasksTab from './components/TasksTab';
import SlackTab from './components/SlackTab';
import NotesTab from './components/NotesTab';

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

function Sidebar({ activeTab, onTabChange, onLogout, userName, userRole, navItems, hasAppUpdate }) {
  const { isDark } = useTheme();
  const [avatarUrl, setAvatarUrl] = useState(null);

  // 1. Quản lý việc lấy ảnh và cập nhật ảnh realtime
  useEffect(() => {
    if (!userName) return;

    // Lấy ảnh đại diện từ database khi component mount
    const fetchAvatar = async () => {
      try {
        const { data, error } = await supabase
          .from('app_users')
          .select('avatar_url')
          .eq('username', userName)
          .single();
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      } catch (err) {
        console.error("Lỗi lấy avatar:", err);
      }
    };
    fetchAvatar();

    // Lắng nghe sự kiện 'avatarUpdated' từ UserTab để cập nhật ảnh ngay lập tức
    const handleAvatarUpdate = (e) => {
      setAvatarUrl(e.detail);
    };

    window.addEventListener('avatarUpdated', handleAvatarUpdate);
    return () => window.removeEventListener('avatarUpdated', handleAvatarUpdate);
  }, [userName]);

  // Logic hiển thị fallback nếu không có ảnh
  const displayLabel = userName || 'User';
  const avatarText = userName ? userName.charAt(0).toUpperCase() : 'U';
  const itemsToRender = navItems || NAV_ITEMS;

  return (
    <motion.aside
      initial={{ x: -80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-[78px] h-full flex flex-col items-center py-6 gap-2 relative z-10 shrink-0"
    >
      {/* Lớp nền Glassmorphism */}
      <div className={`absolute inset-0 rounded-2xl backdrop-blur-2xl border transition-all duration-500 ${
        isDark
          ? 'bg-white/[0.03] border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.3)]'
          : 'bg-white/60 border-black/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.08)]'
      }`} />

      {/* Logo App */}
      <div className="relative z-10 mb-5 flex flex-col items-center gap-1">
        {/* 👇 THÊM overflow-hidden VÀO DÒNG DƯỚI ĐÂY 👇 */}
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center overflow-hidden ${
          isDark
            ? 'bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border-cyan-400/30 shadow-[0_0_16px_rgba(0,212,255,0.2)]'
            : 'bg-gradient-to-br from-sky-400/15 to-violet-400/15 border-sky-400/30'
        }`}>
          {/* Nếu bạn đang dùng thẻ img cho logo thì style như sau: */}
          <img src={auroraLogo} alt="Aurora Logo" className="w-full h-full object-cover scale-[1.15]" />
        </div>
        <span className={`text-[8px] font-bold tracking-[0.2em] uppercase ${textMuted(isDark)}`}>AURORA</span>
      </div>

      {/* Danh sách các Tabs điều hướng */}
      <nav className="relative z-10 flex flex-col items-center gap-1.5 flex-1 w-full px-2">
        {itemsToRender.map(({ icon: Icon, label, id }) => {
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
              {id === 'settings' && hasAppUpdate && (
                <span className="absolute top-2.5 right-2.5 flex h-2.5 w-2.5 z-20">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 ${isDark ? 'border-[#060a14]' : 'border-white'}`}></span>
                </span>
              )}
              {/* Tooltip khi hover */}
              <div className={`absolute left-full ml-3 px-2.5 py-1 rounded-lg backdrop-blur-xl border text-[11px] font-medium opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-1 group-hover:translate-x-0 whitespace-nowrap z-50 ${
                isDark ? 'bg-white/10 border-white/10 text-white/80' : 'bg-white/90 border-black/[0.06] text-slate-700 shadow-sm'
              }`}>
                {label}
              </div>
            </motion.button>
          );
        })}
      </nav>

      {/* Các nút chức năng phía dưới */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        
        {/* Avatar Người dùng (Click để vào Tài khoản) */}
        <motion.button
          onClick={() => onTabChange('user')}
          whileHover={{ scale: 1.08 }} 
          whileTap={{ scale: 0.92 }}
          className="relative flex flex-col items-center cursor-pointer mb-2 group"
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs border-[2px] shadow-sm transition-all duration-300 overflow-hidden ${
            activeTab === 'user' 
              ? (isDark ? 'border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.5)]' : 'border-sky-500 shadow-[0_0_12px_rgba(14,165,233,0.4)]') 
              : (isDark ? 'border-white/10 hover:border-cyan-400/50' : 'border-black/10 hover:border-sky-400/50')
          } ${
            isDark 
              ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-300' 
              : 'bg-gradient-to-br from-sky-400/20 to-blue-400/20 text-sky-600'
          }`}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              avatarText
            )}
          </div>

          {/* Tooltip hiện chữ "Tài khoản" khi di chuột vào */}
          <div className={`absolute left-full ml-3 px-2.5 py-1 rounded-lg backdrop-blur-xl border text-[11px] font-medium opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-1 group-hover:translate-x-0 whitespace-nowrap z-50 ${
            isDark ? 'bg-white/10 border-white/10 text-white/80' : 'bg-white/90 border-black/[0.06] text-slate-700 shadow-sm'
          }`}>
            Tài khoản
          </div>
        </motion.button>

        {/* Nút đổi Theme */}
        <ThemeToggle />

        {/* Nút Đăng xuất */}
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


/* ─────────────────────────────────────────
   MAIN APP (DASHBOARD SHELL)
───────────────────────────────────────── */
function AppShell({ onLogout, userName, userRole }) { 
  useEffect(() => {
    const checkUpdate = async () => {
      try {
        // 1. Lấy version hiện tại của App (đã set trong tauri.conf.json)
        const currentVersion = await getVersion(); // VD: "2.1.0"
        
        // 2. Lấy version mới nhất từ Supabase
        const { data, error } = await supabase
          .from('app_versions')
          .select('*')
          .order('id', { ascending: false })
          .limit(1)
          .single();
          
        if (data) {
          // So sánh version sau khi chuẩn hóa, không phụ thuộc tiền tố "v"
          setHasAppUpdate(normalizeVersion(data.version) !== normalizeVersion(currentVersion));
          // Bạn có thể lưu data.download_url và release_notes vào state để hiện ở SettingsTab
        }
      } catch (err) {
        console.error("Lỗi check update:", err);
      }
    };
    
    checkUpdate();
  }, []);
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('dashboard');

  // STATE LƯU TRẠNG THÁI UPDATE
  const [hasAppUpdate, setHasAppUpdate] = useState(false);

  const finalNavItems = [...NAV_ITEMS];
  if (userRole === 'admin') {
    finalNavItems.push({ icon: ShieldAlert, label: 'Quản lý User', id: 'admin_users' });
  }
  
  const TAB_COMPONENTS = {
    dashboard: DashboardTab,
    tasks:     () => <TasksTab userName={userName} />,
    slack:     () => <SlackTab username={userName} />,
    notes:     NotesTab,
    user:      () => <UserTab username={userName} />,
    settings:  () => <SettingsTab hasUpdate={hasAppUpdate} setHasUpdate={setHasAppUpdate} />,
    admin_users: AdminUserTab,
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
          <div className="flex-1 flex justify-center"><span className={`text-[11px] font-medium tracking-wide uppercase ${isDark ? 'text-white/40' : 'text-black/40'}`}>Aurora — v2.1.0</span></div>
          <div className="flex items-center gap-2.5 justify-end w-16 pointer-events-auto">
            <div onClick={() => appWindow.minimize()} className="w-3.5 h-3.5 rounded-full bg-yellow-500/80 hover:bg-yellow-400 transition-colors cursor-pointer shadow-sm" />
            <div onClick={() => appWindow.toggleMaximize()} className="w-3.5 h-3.5 rounded-full bg-green-500/80 hover:bg-green-400 transition-colors cursor-pointer shadow-sm" />
            <div onClick={() => appWindow.close()} className="w-3.5 h-3.5 rounded-full bg-red-500/80 hover:bg-red-400 transition-colors cursor-pointer shadow-sm" />
          </div>
        </div>
      </div>

      <div className="flex-1 flex p-3 gap-3 overflow-hidden relative z-10">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        onLogout={onLogout} 
        hasAppUpdate={hasAppUpdate}
        navItems={finalNavItems}
        userName={userName}
        userRole={userRole}
            />
        <main className="flex-1 overflow-hidden relative">
          {/* Dashboard luôn giữ mounted để tool/process đang chạy không bị mất trạng thái khi đổi tab */}
          <div className={`h-full ${activeTab === 'dashboard' ? '' : 'hidden'}`}>
            <DashboardTab />
          </div>
          {activeTab !== 'dashboard' && (
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }} className="h-full">
                <TabComponent />
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>
    </div>
  );
}

function RootApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("user");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem('pytools_session');
    if (session) {
      setUserName(session);
      const users = JSON.parse(localStorage.getItem('pytools_users') || '[]');
      const currentUser = users.find((u: any) => u.username === session);
      if (currentUser) {
        setUserRole(currentUser.role || 'user');
      }
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
    setUserRole("user");
  }

  if (!isReady) return null;

  return (
    <AnimatePresence mode="wait">
      {!isLoggedIn ? (
        <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.4 }} className="h-full w-full">
          <AuthScreen onLogin={(user) => {
            setUserName(user);
            const users = JSON.parse(localStorage.getItem('pytools_users') || '[]');
            const currentUser = users.find((u: any) => u.username === user);
            setUserRole(currentUser?.role || 'user');
            setIsLoggedIn(true);
          }} />
        </motion.div>
      ) : (
        <motion.div key="app" initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45 }} className="h-full w-full">
          <AppShell userName={userName} userRole={userRole} onLogout={handleLogout} />
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