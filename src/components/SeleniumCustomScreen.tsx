// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronLeft, Play, Square, Terminal, Trash2, Activity,
  MessageSquare, Globe, Hash, FolderOpen 
} from 'lucide-react';
import { glassPanel, textPrimary, textSecondary, useTheme } from '../utils';

// Component Nút Toggle
function ToggleSwitch({ checked, onChange }) {
  const { isDark } = useTheme();
  return (
    <button 
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
        checked ? 'bg-cyan-500' : isDark ? 'bg-white/20' : 'bg-slate-300'
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : 'translate-x-1'}`} />
    </button>
  );
}

export default function SeleniumCustomScreen({ tool, logs, onBack, onToggle, onClearLogs }) {
  const { isDark } = useTheme();
  const isRunning = tool?.status === 'running';
  const logEndRef = useRef(null);
  
  // Khóa lưu trữ (Storage Key) dựa trên ID của tool để không bị lẫn với các app khác
  const STORAGE_KEY = `pytools_selenium_config_${tool?.id}`;

  // State quản lý ma trận công tắc (Lấy từ LocalStorage nếu có)
  const [tasks, setTasks] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).tasks;
    } catch (e) {}
    return {
      LINE:     { bulk: false, download: false, upload: false },
      FACEBOOK: { bulk: false, download: false, upload: false },
      X:        { bulk: false, download: false, upload: false },
    };
  });

  // State quản lý thư mục (Lấy từ LocalStorage nếu có)
  const [folders, setFolders] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).folders;
    } catch (e) {}
    return { input: '', output: '' };
  });

  // TỰ ĐỘNG LƯU: Mỗi khi tasks hoặc folders thay đổi, lưu ngay xuống LocalStorage
  useEffect(() => {
    if (tool?.id) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks, folders }));
    }
  }, [tasks, folders, tool?.id]);

  const currentLogs = (tool?.currentTaskId && logs) ? logs[tool.currentTaskId] : '';

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentLogs]);

  const handleToggle = (media, action) => {
    setTasks(prev => ({
      ...prev,
      [media]: { ...prev[media], [action]: !prev[media][action] }
    }));
  };

  const handlePickFolder = async (type) => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({ directory: true, multiple: false });
      if (selected) {
        setFolders(prev => ({ ...prev, [type]: selected }));
      }
    } catch (err) {
      console.error("Lỗi mở dialog:", err);
    }
  };

  const medias = [
    { id: 'LINE', name: 'LINE', icon: MessageSquare, color: 'text-green-500' },
    { id: 'FACEBOOK', name: 'FACEBOOK', icon: Globe, color: 'text-blue-500' },
    { id: 'X', name: 'X (TWITTER)', icon: Hash, color: 'text-slate-400' },
  ];

  if (!tool) return null;

  return (
    <div className="flex flex-col h-full gap-4 overflow-hidden">
      <div className={`p-4 rounded-2xl flex items-center gap-4 ${glassPanel(isDark)} shrink-0`}>
        <button onClick={onBack} className="p-2 rounded-xl bg-black/5 hover:bg-black/10 transition-all">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className={`text-xl font-bold ${textPrimary(isDark)}`}>Parame Storage</h2>
          <p className={`text-xs ${textSecondary(isDark)}`}>Công cụ tự động hóa</p>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* BẢNG ĐIỀU KHIỂN BÊN TRÁI */}
        <div className={`w-[55%] p-6 rounded-2xl flex flex-col ${glassPanel(isDark)}`}>
          
          <div className={`flex items-center pb-3 mb-4 border-b ${isDark ? 'border-white/10' : 'border-black/10'}`}>
            <div className={`w-[40%] text-sm font-bold ${textPrimary(isDark)}`}>媒体 (Media)</div>
            <div className="w-[60%] flex justify-between px-2">
              <span className={`text-xs font-semibold ${textSecondary(isDark)}`}>バルク作成</span>
              <span className={`text-xs font-semibold ${textSecondary(isDark)}`}>掲載ダウンロード</span>
              <span className={`text-xs font-semibold ${textSecondary(isDark)}`}>自動アップ</span>
            </div>
          </div>

          <div className="space-y-6 flex-1">
            {medias.map((media) => {
              const SafeIcon = media.icon;
              return (
                <div key={media.id} className="flex items-center">
                  <div className="w-[40%] flex items-center gap-3">
                    <div className="p-1.5 bg-black/5 rounded-lg">
                      <SafeIcon className={`w-5 h-5 ${media.color}`} />
                    </div>
                    <span className={`text-sm font-bold ${textPrimary(isDark)}`}>{media.name}</span>
                  </div>
                  <div className="w-[60%] flex justify-between px-6">
                    <ToggleSwitch checked={tasks[media.id].bulk} onChange={() => handleToggle(media.id, 'bulk')} />
                    <ToggleSwitch checked={tasks[media.id].download} onChange={() => handleToggle(media.id, 'download')} />
                    <ToggleSwitch checked={tasks[media.id].upload} onChange={() => handleToggle(media.id, 'upload')} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-3 mt-4 shrink-0">
            {/* Vùng chọn Thư mục Input / Output */}
            <div className="grid grid-cols-2 gap-3 mb-2">
              <button onClick={() => handlePickFolder('input')} className={`p-3 rounded-xl border border-dashed flex items-center gap-2 text-xs truncate transition-all ${isDark ? 'border-white/20 hover:bg-white/5 text-white/70' : 'border-black/20 hover:bg-black/5 text-slate-700'}`}>
                <FolderOpen className="w-4 h-4 shrink-0" />
                {folders.input ? 'Input: ...' + folders.input.slice(-10) : 'Chọn Input Folder'}
              </button>
              <button onClick={() => handlePickFolder('output')} className={`p-3 rounded-xl border border-dashed flex items-center gap-2 text-xs truncate transition-all ${isDark ? 'border-white/20 hover:bg-white/5 text-white/70' : 'border-black/20 hover:bg-black/5 text-slate-700'}`}>
                <FolderOpen className="w-4 h-4 shrink-0" />
                {folders.output ? 'Output: ...' + folders.output.slice(-10) : 'Chọn Output Folder'}
              </button>
            </div>

            {/* Nút Thực thi */}
            <button 
              onClick={() => onToggle(tool.id, { tasks, folders })} 
              className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${isRunning ? 'bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500/30' : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:opacity-90'}`}
            >
              {isRunning ? <><Square className="w-4 h-4"/> 実行停止 (Dừng)</> : <><Play className="w-4 h-4"/> 実行 (Thực thi)</>}
            </button>
          </div>
        </div>

        {/* LOG CONSOLE BÊN PHẢI */}
        <div className={`flex-1 rounded-2xl flex flex-col overflow-hidden border ${isDark ? 'bg-[#0a0d14] border-white/10' : 'bg-[#1e1e1e] border-black/10'}`}>
          <div className="p-3 border-b flex items-center justify-between bg-black/40 border-white/10">
            <div className="flex items-center gap-2 text-[11px] font-bold text-white/50 uppercase tracking-widest">
              <Terminal className="w-4 h-4" /> Console Output
            </div>
            <button onClick={() => onClearLogs && onClearLogs(tool.currentTaskId)} className="text-white/30 hover:text-red-400 transition-colors p-1 rounded hover:bg-white/10">
              <Trash2 className="w-4 h-4"/>
            </button>
          </div>
          <div className="flex-1 p-4 font-mono text-[13px] overflow-y-auto bg-black/20">
            {currentLogs ? (
              <pre className="text-emerald-400 whitespace-pre-wrap leading-relaxed break-all">
                {currentLogs}
                {isRunning && <span className="inline-block w-2 h-4 bg-emerald-500 ml-1 animate-pulse" />}
                <div ref={logEndRef} className="h-4" />
              </pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-20 text-white gap-3 select-none">
                <Activity className="w-8 h-8" />
                <span className="text-xs uppercase tracking-widest font-sans">Chưa có dữ liệu</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}