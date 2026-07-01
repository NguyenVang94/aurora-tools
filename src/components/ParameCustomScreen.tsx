// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft, Play, Square, Terminal,
  Trash2, FolderOpen, FolderCog
} from 'lucide-react';
import { useTheme, glassPanel, textPrimary, textSecondary } from '../utils';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

// Component Toggle Switch tự chế siêu đẹp
const Toggle = ({ checked, onChange, color }) => (
  <div 
    onClick={() => onChange(!checked)}
    className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${checked ? color : 'bg-slate-300/30'}`}
  >
    <motion.div 
      layout transition={{ type: "spring", stiffness: 700, damping: 30 }}
      className={`bg-white w-4 h-4 rounded-full shadow-md ${checked ? 'ml-auto' : ''}`} 
    />
  </div>
);

export default function ParameCustomScreen({ tool, logs, onBack, onToggle, onClearLogs }) {
  const { isDark } = useTheme();
  
  // 🔥 LẤY DATA TỪ LOCALSTORAGE
  const [inputFolder, setInputFolder] = useState(() => localStorage.getItem(`parame_in_${tool.id}`) || '');
  const [outputFolder, setOutputFolder] = useState(() => localStorage.getItem(`parame_out_${tool.id}`) || '');
  
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem(`parame_settings_${tool.id}`);
    return saved ? JSON.parse(saved) : {
      line: { on_off: true, download: true, upload: true },
      facebook: { on_off: true, download: true, upload: false },
      twitter: { on_off: true, download: false, upload: true }
    };
  });

  const logEndRef = useRef<HTMLDivElement>(null);
  const isRunning = tool.status === 'running';
  const currentLog = logs[tool.currentTaskId] || '';

  // 🔥 LƯU VÀO LOCALSTORAGE MỖI KHI CÓ THAY ĐỔI
  useEffect(() => { localStorage.setItem(`parame_in_${tool.id}`, inputFolder); }, [inputFolder]);
  useEffect(() => { localStorage.setItem(`parame_out_${tool.id}`, outputFolder); }, [outputFolder]);
  useEffect(() => { localStorage.setItem(`parame_settings_${tool.id}`, JSON.stringify(settings)); }, [settings]);

  useEffect(() => {
    if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [currentLog]);

  const handleSelectFolder = async (isInput) => {
    if (isRunning) return;
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected && !Array.isArray(selected)) {
        if (isInput) setInputFolder(selected);
        else setOutputFolder(selected);
      }
    } catch (err) { console.error("Lỗi chọn folder:", err); }
  };

  const updateSetting = (platform, key, value) => {
    if (isRunning) return;
    setSettings(prev => ({ ...prev, [platform]: { ...prev[platform], [key]: value } }));
  };

  const handleRun = () => {
    if (!inputFolder || !outputFolder) {
      alert("⚠️ Vui lòng chọn đủ cả Input và Output Folder!");
      return;
    }
    onToggle(tool.id, { 
      action: "run_main",
      input_path: inputFolder,
      output_path: outputFolder,
      settings: settings 
    });
  };

  const handleOpenMasterFolder = async () => {
    if (!tool.path) {
      alert("⚠️ Tool chưa được tải về, chưa xác định được vị trí Master Folder.");
      return;
    }
    try {
      await invoke('open_tool_master_folder', { exePath: tool.path });
    } catch (err) {
      alert("Lỗi mở Master Folder: " + err);
    }
  };

  const PlatformRow = ({ name, platformKey, colorClass }) => (
    <div className="flex items-center justify-between py-3 border-b border-white/5">
      <span className={`w-32 font-bold ${textPrimary(isDark)}`}>{name}</span>
      <div className="flex-1 flex justify-around">
        <Toggle checked={settings[platformKey].on_off} onChange={(v) => updateSetting(platformKey, 'on_off', v)} color={colorClass} />
        <Toggle checked={settings[platformKey].download} onChange={(v) => updateSetting(platformKey, 'download', v)} color={colorClass} />
        <Toggle checked={settings[platformKey].upload} onChange={(v) => updateSetting(platformKey, 'upload', v)} color={colorClass} />
      </div>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full gap-5 overflow-hidden p-2"
    >
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${isDark ? 'bg-white/[0.05] border-white/10 hover:bg-white/10' : 'bg-white border-black/10 hover:bg-slate-50'}`}
          >
            <ChevronLeft className={`w-5 h-5 ${textPrimary(isDark)}`} />
          </button>
          <div>
            <h2 className={`text-2xl font-bold flex items-center gap-2 ${textPrimary(isDark)}`}>
              {tool.icon} {tool.name}
            </h2>
            <p className={`text-sm ${textSecondary(isDark)}`}>Công cụ tự động hóa toàn diện.</p>
          </div>
        </div>

        <button
          onClick={handleOpenMasterFolder}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 hover:scale-105 ${isDark ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-cyan-50 text-cyan-600 border-cyan-200'}`}
        >
          <FolderCog className="w-4 h-4" /> Mở Master Folder
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0">
        
        {/* BẢNG ĐIỀU KHIỂN (CỘT TRÁI) */}
        <div className="w-full lg:w-1/2 flex flex-col gap-4">
          <div className={`p-6 rounded-2xl flex-1 flex flex-col ${glassPanel(isDark)}`}>
            
            {/* Table Header */}
            <div className={`flex items-center justify-between pb-4 border-b text-xs font-bold tracking-wider ${textSecondary(isDark)} ${isDark ? 'border-white/10' : 'border-black/5'}`}>
              <span className="w-32">媒体 (Media)</span>
              <div className="flex-1 flex justify-around text-center">
                <span>バルク作成</span>
                <span>掲載ダウンロード</span>
                <span>自動アップ</span>
              </div>
            </div>

            {/* Toggles */}
            <div className="mt-2 space-y-2">
              <PlatformRow name="💬 LINE" platformKey="line" colorClass="bg-green-500" />
              <PlatformRow name="🌐 FACEBOOK" platformKey="facebook" colorClass="bg-blue-500" />
              <PlatformRow name="✖️ X (TWITTER)" platformKey="twitter" colorClass="bg-slate-800" />
            </div>

            {/* Folder Selectors */}
            <div className="mt-auto pt-6 flex gap-3">
              <div 
                onClick={() => handleSelectFolder(true)}
                className={`flex-1 flex items-center gap-2 p-3 rounded-xl border border-dashed transition-all cursor-pointer ${isRunning ? 'opacity-50' : 'hover:bg-cyan-500/10 hover:border-cyan-500/30'} ${isDark ? 'border-white/20' : 'border-slate-300'}`}
              >
                <FolderOpen className={`w-5 h-5 ${textSecondary(isDark)}`} />
                <div className="overflow-hidden">
                  <p className={`text-xs font-bold ${textPrimary(isDark)}`}>Input Folder</p>
                  <p className={`text-[10px] truncate ${textSecondary(isDark)}`}>{inputFolder || 'Nhấn để chọn...'}</p>
                </div>
              </div>

              <div 
                onClick={() => handleSelectFolder(false)}
                className={`flex-1 flex items-center gap-2 p-3 rounded-xl border border-dashed transition-all cursor-pointer ${isRunning ? 'opacity-50' : 'hover:bg-cyan-500/10 hover:border-cyan-500/30'} ${isDark ? 'border-white/20' : 'border-slate-300'}`}
              >
                <FolderOpen className={`w-5 h-5 ${textSecondary(isDark)}`} />
                <div className="overflow-hidden">
                  <p className={`text-xs font-bold ${textPrimary(isDark)}`}>Output Folder</p>
                  <p className={`text-[10px] truncate ${textSecondary(isDark)}`}>{outputFolder || 'Nhấn để chọn...'}</p>
                </div>
              </div>
            </div>

            {/* ACTION BUTTON */}
            <div className="pt-4">
              {isRunning ? (
                <button onClick={() => onToggle(tool.id)} className={`w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] ${isDark ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                  <Square className="w-4 h-4" /> Dừng tiến trình
                </button>
              ) : (
                <button onClick={handleRun} className={`w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] ${inputFolder && outputFolder ? (isDark ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-cyan-500/25' : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-cyan-500/25') : (isDark ? 'bg-white/5 text-white/30 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed')}`}>
                  <Play className="w-4 h-4" /> 実行 (Thực thi)
                </button>
              )}
            </div>

          </div>
        </div>

        {/* TERMINAL LOGS (CỘT PHẢI) */}
        <div className={`w-full lg:w-1/2 flex flex-col rounded-2xl overflow-hidden border ${isDark ? 'border-white/10 bg-[#0a0a0a]' : 'border-slate-200 bg-[#1e1e1e]'}`}>
          <div className={`px-4 py-3 border-b flex items-center justify-between bg-black/20 ${isDark ? 'border-white/10' : 'border-white/5'}`}>
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-mono text-slate-300">CONSOLE OUTPUT</span>
            </div>
            <button onClick={() => onClearLogs(tool.currentTaskId)} className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto font-mono text-[13px] leading-relaxed text-slate-300">
            {currentLog ? (
              <pre className="whitespace-pre-wrap font-inherit">
                {currentLog.split('\n').map((line, i) => (
                  <div key={i} className={`${line.includes('Lỗi') || line.includes('❌') ? 'text-red-400' : line.includes('✅') || line.includes('hoàn tất') ? 'text-cyan-400 font-bold' : line.includes('Cảnh báo') || line.includes('⚠️') ? 'text-amber-400' : ''}`}>
                    {line}
                  </div>
                ))}
                <div ref={logEndRef} />
              </pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500/50 italic space-y-3">
                <Terminal className="w-12 h-12 opacity-20" />
                <p>CHƯA CÓ DỮ LIỆU</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </motion.div>
  );
}