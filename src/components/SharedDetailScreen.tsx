// @ts-nocheck
import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core'; // Nhớ import invoke
import { 
  ChevronLeft, Play, Square, Terminal, 
  Trash2, Copy, Activity, FolderOpen, 
  ChevronUp, ChevronDown, Send // Thêm icon Send
} from 'lucide-react';
import { glassPanel, textPrimary, textSecondary, useTheme } from '../utils';

export function SharedDetailScreen({ tool, logs, onBack, onToggle, onClearLogs, onSelectPath }) {
  const { isDark } = useTheme();
  const isRunning = tool?.status === 'running';
  
  const [isConsoleOpen, setIsConsoleOpen] = useState(isRunning); 
  const [inputValue, setInputValue] = useState(""); // State cho thanh chat
  
  const logEndRef = useRef(null);
  const currentLogs = (tool?.currentTaskId && logs) ? logs[tool?.currentTaskId] : '';

  useEffect(() => {
    if (isRunning) setIsConsoleOpen(true);
  }, [isRunning]);

  useEffect(() => {
    if (isConsoleOpen && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentLogs, isConsoleOpen]);

  const handleCopyLogs = () => {
    if (currentLogs) navigator.clipboard.writeText(currentLogs);
  };

  // Hàm xử lý gửi lệnh (Enter hoặc bấm nút)
  const handleSendInput = async () => {
    if (!inputValue.trim() || !tool?.currentTaskId) return;
    try {
      await invoke('send_input', { 
        taskId: tool.currentTaskId, 
        input: inputValue 
      });
      setInputValue(""); // Gửi xong thì xóa trắng ô nhập liệu
    } catch (e) {
      console.error("Lỗi gửi input:", e);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSendInput();
  };

  if (!tool) return null;

  return (
    <div className="flex flex-col h-full gap-4 overflow-hidden relative">
      
      {/* KHU VỰC THÔNG TIN & CÀI ĐẶT ĐƯỜNG DẪN */}
      <div className={`p-6 rounded-2xl flex flex-col gap-6 shadow-sm shrink-0 z-10 ${glassPanel(isDark)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className={`p-2 rounded-xl transition-all ${isDark ? 'bg-white/5 hover:bg-white/10 text-white/70' : 'bg-black/5 hover:bg-black/10 text-slate-600'}`}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border shadow-sm ${isRunning ? (isDark ? 'bg-emerald-500/10 border-emerald-400/30' : 'bg-emerald-50 border-emerald-200') : (isDark ? 'bg-white/5 border-white/10' : 'bg-white border-black/10')}`}>
                {tool.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className={`text-xl font-bold ${textPrimary(isDark)}`}>{tool.name}</h2>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono border ${isDark ? 'bg-white/5 text-white/50 border-white/10' : 'bg-black/5 text-slate-500 border-black/10'}`}>v{tool.version}</span>
                </div>
                <p className={`text-sm flex items-center gap-1 mt-0.5 ${isRunning ? 'text-emerald-500 font-medium' : textSecondary(isDark)}`}>
                  {isRunning ? <><span className="relative flex h-2 w-2 mr-1"><span className="animate-ping absolute inset-0 rounded-full bg-emerald-400 opacity-75"></span><span className="relative rounded-full h-2 w-2 bg-emerald-500"></span></span>Đang chạy</> : 'Đã dừng'}
                  <span className="mx-2 opacity-50">•</span><span>Chế độ: Console CLI</span>
                </p>
              </div>
            </div>
          </div>
          
          <button onClick={() => onToggle(tool.id)} className={`px-6 py-3 flex items-center gap-2 rounded-xl text-sm font-bold transition-all duration-300 ${isRunning ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20' : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg hover:shadow-cyan-500/40'}`}>
            {isRunning ? <><Square className="w-4 h-4" /> Dừng tiến trình</> : <><Play className="w-4 h-4" /> Khởi chạy</>}
          </button>
        </div>

        <div className="flex flex-col gap-2 mt-2">
          <label className={`text-[11px] font-bold uppercase tracking-wider ${textSecondary(isDark)}`}>Đường dẫn thực thi (File Target)</label>
          <div className="flex items-center gap-3">
            <div className={`flex-1 px-4 py-3 rounded-xl text-sm font-mono truncate border transition-all ${isDark ? 'bg-black/20 border-white/10 text-white/60' : 'bg-slate-50 border-black/10 text-slate-600'}`} title={tool.path}>
              {tool.path || 'Chưa thiết lập đường dẫn. Vui lòng chọn file...'}
            </div>
            <button onClick={() => onSelectPath && onSelectPath(tool.id)} className={`px-5 py-3 rounded-xl border flex items-center gap-2 font-semibold text-sm transition-all shadow-sm ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white' : 'bg-white border-black/10 hover:bg-slate-50 text-slate-700'}`}>
              <FolderOpen className="w-4 h-4" /> Chọn File
            </button>
          </div>
        </div>
      </div>

      {/* KHU VỰC CONSOLE */}
      <motion.div 
        layout
        transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }}
        className={`flex flex-col rounded-2xl overflow-hidden border shadow-xl z-20 origin-bottom ${
          isDark ? 'bg-[#0a0d14] border-white/10' : 'bg-[#1e1e1e] border-black/20'
        } ${isConsoleOpen ? 'flex-1 mt-0' : 'h-12 shrink-0 mt-auto'}`}
      >
        {/* Thanh Header Console */}
        <div 
          onClick={() => setIsConsoleOpen(!isConsoleOpen)}
          className="h-12 px-4 flex items-center justify-between bg-black/40 border-b border-white/10 cursor-pointer hover:bg-black/60 transition-colors shrink-0"
        >
          <div className="flex items-center gap-3">
            <Terminal className={`w-4 h-4 ${isConsoleOpen ? 'text-cyan-400' : 'text-white/50'}`} />
            <span className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Output Console</span>
            {isRunning && !isConsoleOpen && (
               <span className="flex h-2 w-2 relative ml-2">
                 <span className="animate-ping absolute inset-0 rounded-full bg-emerald-400 opacity-75"></span>
                 <span className="relative rounded-full h-2 w-2 bg-emerald-500"></span>
               </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={(e) => { e.stopPropagation(); handleCopyLogs(); }} className="p-1.5 rounded-lg text-white/40 hover:text-white/90 hover:bg-white/10 transition-all" title="Sao chép toàn bộ Logs"><Copy className="w-4 h-4" /></button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <button onClick={(e) => { e.stopPropagation(); onClearLogs && onClearLogs(tool.currentTaskId); }} className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/10 transition-all" title="Xoá màn hình (Clear)"><Trash2 className="w-4 h-4" /></button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <div className="p-1.5 text-white/40">{isConsoleOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}</div>
          </div>
        </div>

        <AnimatePresence>
          {isConsoleOpen && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {/* Bảng hiển thị chữ */}
              <div className="flex-1 p-5 overflow-y-auto font-mono text-[13px] bg-black/20">
                {currentLogs ? (
                  <pre className="text-emerald-400 whitespace-pre-wrap leading-relaxed break-all">
                    {currentLogs}
                    <div ref={logEndRef} className="h-4" />
                  </pre>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 text-white gap-3 select-none">
                     <Activity className="w-8 h-8" />
                     <p className="text-xs uppercase tracking-widest">Chưa có dữ liệu đầu ra</p>
                  </div>
                )}
              </div>

              {/* THANH GÕ LỆNH (CHATBOX INPUT) */}
              {isRunning && (
                <div className="p-3 bg-black/40 border-t border-white/10 flex items-center gap-3 shrink-0">
                  <Terminal className="w-4 h-4 text-emerald-500 opacity-70" />
                  <input 
                    type="text" 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Gõ lệnh (input) cho tiến trình tại đây và ấn Enter..."
                    className="flex-1 bg-transparent border-none outline-none font-mono text-sm text-emerald-100 placeholder-white/30"
                  />
                  <button 
                    onClick={handleSendInput}
                    disabled={!inputValue.trim()}
                    className={`p-2 rounded-lg transition-colors ${
                      inputValue.trim() ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 cursor-pointer' : 'text-white/20 cursor-not-allowed'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

    </div>
  );
}