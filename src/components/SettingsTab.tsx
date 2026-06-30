// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, Bell, BellOff, Info, Moon, Sun, Send, Power,
  RefreshCw, CheckCircle2, DownloadCloud, Loader2
} from 'lucide-react';
import { useTheme, glassPanel, textPrimary, textSecondary, textMuted, normalizeVersion } from '../utils';
import { invoke } from '@tauri-apps/api/core'; // Chuẩn Tauri v2
import { supabase } from '../supabase';
import { getVersion } from '@tauri-apps/api/app';
import { listen } from '@tauri-apps/api/event';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { isEnabled as isAutostartEnabled, enable as enableAutostart, disable as disableAutostart } from '@tauri-apps/plugin-autostart';

// Hàng công tắc bật/tắt dùng chung cho các mục cài đặt
function ToggleRow({ icon, title, description, checked, onToggle, isDark, disabled = false }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/10 text-cyan-400' : 'bg-black/5 border-black/10 text-sky-500'}`}>
          {icon}
        </div>
        <div>
          <h3 className={`text-lg font-bold ${textPrimary(isDark)}`}>{title}</h3>
          <p className={`text-sm mt-1 max-w-md leading-relaxed ${textSecondary(isDark)}`}>
            {description}
          </p>
        </div>
      </div>
      <button
        onClick={onToggle}
        disabled={disabled}
        className={`relative flex items-center w-14 h-8 rounded-full p-1 cursor-pointer transition-colors duration-300 border ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${
          checked ? (isDark ? 'bg-cyan-500/20 border-cyan-500/50' : 'bg-sky-500/20 border-sky-500/50') : (isDark ? 'bg-white/10 border-white/10' : 'bg-black/10 border-black/10')
        }`}
      >
        <motion.div layout className={`w-6 h-6 rounded-full shadow-md ${checked ? (isDark ? 'bg-cyan-400' : 'bg-sky-500') : (isDark ? 'bg-white/40' : 'bg-white')}`} animate={{ x: checked ? 24 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
      </button>
    </div>
  );
}

// Nhận prop từ AppShell truyền xuống
export default function SettingsTab({ hasUpdate, setHasUpdate }) {
  const { isDark, toggle: toggleTheme } = useTheme();

  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    const saved = localStorage.getItem('aurora_notifications');
    return saved !== 'false';
  });
  const [isSendingTest, setIsSendingTest] = useState(false);

  const [autostartEnabled, setAutostartEnabled] = useState(false);
  const [isTogglingAutostart, setIsTogglingAutostart] = useState(false);

  useEffect(() => {
    isAutostartEnabled().then(setAutostartEnabled).catch(err => console.error("Lỗi đọc trạng thái autostart:", err));
  }, []);

  const toggleAutostart = async () => {
    if (isTogglingAutostart) return;
    setIsTogglingAutostart(true);
    try {
      if (autostartEnabled) {
        await disableAutostart();
      } else {
        await enableAutostart();
      }
      setAutostartEnabled(await isAutostartEnabled());
    } catch (err) {
      console.error("Lỗi đổi trạng thái khởi động cùng Windows:", err);
      alert("Không thể đổi trạng thái khởi động cùng Windows: " + err);
    } finally {
      setIsTogglingAutostart(false);
    }
  };

  const handleSendTestNotification = async () => {
    setIsSendingTest(true);
    try {
      let granted = await isPermissionGranted();
      if (!granted) {
        const permission = await requestPermission();
        granted = permission === 'granted';
      }
      if (granted) {
        sendNotification({ title: "Aurora Automation", body: "Đây là thông báo thử nghiệm. Nếu bạn thấy nó, thông báo hệ thống đang hoạt động tốt!" });
      } else {
        alert("Windows chưa cấp quyền thông báo cho Aurora. Vui lòng vào Settings > Notifications của Windows để bật.");
      }
    } catch (err) {
      console.error("Lỗi gửi thông báo thử:", err);
      alert("Không thể gửi thông báo thử: " + err);
    } finally {
      setIsSendingTest(false);
    }
  };

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Lắng nghe sự kiện 'download-progress' từ Rust
  useEffect(() => {
    let unlisten: any;
    const setupListener = async () => {
      unlisten = await listen('download-progress', (event) => {
        setDownloadProgress(event.payload as number);
      });
    };
    setupListener();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);
  const [currentVersion, setCurrentVersion] = useState("Đang tải..."); // Sửa biến tĩnh thành State
  const [updateInfo, setUpdateInfo] = useState({
    latestVersion: "",
    downloadUrl: "",
    notes: ""
  });
  
  // Phiên bản hiện tại của app (có thể lấy động qua tauri API, tạm fix cứng để test)

  // 1. Fetch dữ liệu từ Supabase khi mở Tab
  useEffect(() => {
    const fetchUpdateData = async () => {
      try {
        // 1. Lấy version thật của app đang chạy
        const appVer = await getVersion();
        const formattedCurrentVer = `v${appVer}`;
        setCurrentVersion(formattedCurrentVer);

        // 2. Lấy data từ Supabase
        const { data, error } = await supabase
          .from('app_versions')
          .select('*')
          .order('id', { ascending: false })
          .limit(1)
          .single();

        if (data) {
          const fetchedVersion = data.version.startsWith('v') ? data.version : `v${data.version}`;

          // So sánh version đã chuẩn hóa (không phụ thuộc tiền tố "v"), formattedCurrentVer/fetchedVersion chỉ dùng để hiển thị
          if (normalizeVersion(data.version) !== normalizeVersion(appVer)) {
            setHasUpdate(true);
            setUpdateInfo({
              latestVersion: fetchedVersion,
              downloadUrl: data.download_url,
              notes: data.release_notes
            });
          } else {
            setHasUpdate(false);
          }
        }
      } catch (err) {
        console.error("Lỗi lấy thông tin update:", err);
      }
    };

    fetchUpdateData();
  }, [setHasUpdate]); // Xóa dependency currentVersion cũ đi

  const toggleNotifications = () => {
    const newState = !notificationsEnabled;
    setNotificationsEnabled(newState);
    localStorage.setItem('aurora_notifications', newState.toString());
  };

  // 2. Hàm chạy khi bấm "Cập nhật ngay"
  const handleUpdateApp = async () => {
    if (!updateInfo.downloadUrl) {
      alert("Không tìm thấy đường dẫn tải bản cập nhật!");
      return;
    }

    try {
      setIsDownloading(true);
      
      // Gọi hàm Rust để tải và chạy file
      // Chú ý: Tên hàm phải khớp 100% với tên đăng ký trong main.rs
      const result = await invoke('download_and_install_update', { 
        url: updateInfo.downloadUrl 
      });
      
      alert(result); // Hiện thông báo "Đang mở trình cài đặt..."
      

    } catch(err) {
      alert("Lỗi trong quá trình cập nhật: " + err);
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-1 custom-scrollbar">
      {/* ... (Phần Header và Box 1: Thông báo giữ nguyên như cũ) ... */}
      <div className="shrink-0 pt-2 px-2 mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Settings className={`w-8 h-8 ${isDark ? 'text-cyan-400' : 'text-sky-500'}`} />
          <h1 className={`text-3xl font-bold tracking-tight ${textPrimary(isDark)}`}>
            Cài đặt hệ thống
          </h1>
        </div>
        <p className={`text-sm ${textSecondary(isDark)}`}>
          Tùy chỉnh trải nghiệm Aurora Automation của bạn
        </p>
      </div>

      <div className="space-y-6 max-w-4xl px-2 pb-10">
        
        {/* CARD 1: CÀI ĐẶT THÔNG BÁO */}
        <div className={`rounded-2xl p-6 transition-all duration-300 space-y-4 ${glassPanel(isDark)}`}>
          <ToggleRow
            icon={notificationsEnabled ? <Bell className="w-6 h-6" /> : <BellOff className="w-6 h-6" />}
            title="Thông báo hệ thống"
            description="Hiển thị thông báo (Notification) trên màn hình máy tính khi một công cụ chạy xong hoặc gặp lỗi."
            checked={notificationsEnabled}
            onToggle={toggleNotifications}
            isDark={isDark}
          />
          <div className={`pt-4 border-t flex items-center justify-between ${isDark ? 'border-white/10' : 'border-black/10'}`}>
            <p className={`text-sm ${textSecondary(isDark)}`}>Kiểm tra xem thông báo có hiện lên màn hình không.</p>
            <button
              onClick={handleSendTestNotification}
              disabled={isSendingTest}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-300 ${isSendingTest ? 'opacity-50 cursor-not-allowed' : ''} ${isDark ? 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10' : 'bg-black/5 border-black/10 text-slate-700 hover:bg-black/10'}`}
            >
              {isSendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Gửi thử thông báo
            </button>
          </div>
        </div>

        {/* CARD: GIAO DIỆN & KHỞI ĐỘNG */}
        <div className={`rounded-2xl p-6 transition-all duration-300 space-y-4 ${glassPanel(isDark)}`}>
          <ToggleRow
            icon={isDark ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
            title="Giao diện tối (Dark mode)"
            description="Chuyển đổi giữa giao diện sáng và tối cho toàn bộ ứng dụng."
            checked={isDark}
            onToggle={toggleTheme}
            isDark={isDark}
          />
          <div className={`pt-4 border-t ${isDark ? 'border-white/10' : 'border-black/10'}`}>
            <ToggleRow
              icon={<Power className="w-6 h-6" />}
              title="Khởi động cùng Windows"
              description="Tự động mở Aurora ngay khi bạn đăng nhập vào máy tính."
              checked={autostartEnabled}
              onToggle={toggleAutostart}
              isDark={isDark}
              disabled={isTogglingAutostart}
            />
          </div>
        </div>

        {/* CARD 2: CẬP NHẬT PHIÊN BẢN */}
        <div className={`rounded-2xl p-6 transition-all duration-300 relative overflow-hidden ${glassPanel(isDark)} ${hasUpdate ? (isDark ? 'border-cyan-500/30' : 'border-sky-400/30') : ''}`}>
          
          {hasUpdate && (
            <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br rounded-full blur-[60px] opacity-20 pointer-events-none -translate-y-1/2 translate-x-1/2 ${isDark ? 'from-cyan-500 to-blue-500' : 'from-sky-400 to-blue-400'}`} />
          )}

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="relative">
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/10 text-white/70' : 'bg-black/5 border-black/10 text-slate-600'}`}>
                  <RefreshCw className={`w-6 h-6 ${hasUpdate && !isDownloading ? 'animate-[spin_4s_linear_infinite]' : ''} ${isDownloading ? 'animate-spin text-cyan-400' : ''}`} />
                </div>
                {hasUpdate && !isDownloading && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 border-2 border-[#0a0f1c] dark:border-white"></span>
                  </span>
                )}
              </div>

              <div>
                <h3 className={`text-lg font-bold flex items-center gap-2 ${textPrimary(isDark)}`}>
                  Phiên bản ứng dụng
                  {hasUpdate && (
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-sky-100 text-sky-600'}`}>Mới</span>
                  )}
                </h3>
                
                {hasUpdate ? (
                  <div className="mt-1">
                    <p className={`text-sm ${textPrimary(isDark)}`}>
                      Đã có phiên bản mới: <strong className={isDark ? 'text-cyan-400' : 'text-sky-600'}>{updateInfo.latestVersion}</strong> (Hiện tại: {currentVersion})
                    </p>
                    <p className={`text-xs mt-1.5 flex items-start gap-1.5 ${textMuted(isDark)}`}>
                      <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>{updateInfo.notes}</span>
                    </p>
                  </div>
                ) : (
                  <div className="mt-1">
                    <p className={`text-sm ${textSecondary(isDark)}`}>
                      Phiên bản hiện tại: {currentVersion}
                    </p>
                    <p className={`text-[11px] mt-1 flex items-center gap-1 ${textMuted(isDark)}`}>
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Đã cập nhật phiên bản mới nhất.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* NÚT CLICK GỌI HÀM UPDATE */}
            <div className="shrink-0 w-32 flex justify-end">
              {hasUpdate ? (
                isDownloading ? (
                  // UI: THANH TIẾN ĐỘ KHI ĐANG TẢI
                  <div className="flex flex-col items-end gap-1.5 w-full">
                    <span className={`text-[11px] font-bold tracking-wider ${isDark ? 'text-cyan-400' : 'text-sky-600'}`}>
                      {downloadProgress}%
                    </span>
                    <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-black/10'}`}>
                      <motion.div 
                        className={`h-full ${isDark ? 'bg-cyan-400' : 'bg-sky-500'}`} 
                        initial={{ width: 0 }}
                        animate={{ width: `${downloadProgress}%` }}
                        transition={{ ease: "linear", duration: 0.2 }}
                      />
                    </div>
                  </div>
                ) : (
                  // UI: NÚT CẬP NHẬT BÌNH THƯỜNG
                  <motion.button 
                    onClick={handleUpdateApp} 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all ${
                      isDark 
                        ? 'bg-cyan-500 text-white shadow-cyan-500/20 hover:bg-cyan-400' 
                        : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-cyan-500/30'
                    }`}
                  >
                    <DownloadCloud className="w-4 h-4" /> Cập nhật ngay
                  </motion.button>
                )
              ) : (
                <button className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border cursor-not-allowed ${
                  isDark ? 'bg-white/5 border-white/10 text-white/30' : 'bg-black/5 border-black/10 text-slate-400'
                }`}>
                  <RefreshCw className="w-4 h-4" /> Đã cập nhật
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}