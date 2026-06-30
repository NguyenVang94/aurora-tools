// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, Play, Square, Terminal, 
  Trash2, FileSpreadsheet, FolderSearch, Link
} from 'lucide-react';
import { useTheme, glassPanel, textPrimary, textSecondary } from '../utils';
import { open } from '@tauri-apps/plugin-dialog';

export default function HimozukeCustomScreen({ tool, logs, onBack, onToggle, onClearLogs }) {
  const { isDark } = useTheme();
  
  // 🔥 AUTO SAVE/LOAD cho cả 2 file
  const [mainPath, setMainPath] = useState(() => localStorage.getItem(`himozuke_main_${tool.id}`) || '');
  const [bulkPath, setBulkPath] = useState(() => localStorage.getItem(`himozuke_bulk_${tool.id}`) || '');

  const logEndRef = useRef<HTMLDivElement>(null);
  const isRunning = tool.status === 'running';
  const currentLog = logs[tool.currentTaskId] || '';

  // 🔥 LƯU VÀO LOCALSTORAGE
  useEffect(() => { localStorage.setItem(`himozuke_main_${tool.id}`, mainPath); }, [mainPath, tool.id]);
  useEffect(() => { localStorage.setItem(`himozuke_bulk_${tool.id}`, bulkPath); }, [bulkPath, tool.id]);

  useEffect(() => {
    if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [currentLog]);

  const handleSelectMain = async () => {
    if (isRunning) return;
    try {
      const selected = await open({
        multiple: false, title: "Chọn file 入稿シート.xlsx",
        filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls', 'xlsm'] }]
      });
      if (selected && !Array.isArray(selected)) setMainPath(selected);
    } catch (err) { console.error("Lỗi chọn file:", err); }
  };

  const handleSelectBulk = async () => {
    if (isRunning) return;
    try {
      const selected = await open({
        multiple: false, title: "Chọn file Bulk",
        filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls', 'xlsm', 'csv'] }]
      });
      if (selected && !Array.isArray(selected)) setBulkPath(selected);
    } catch (err) { console.error("Lỗi chọn file:", err); }
  };

  const handleRun = () => {
    if (!mainPath || !bulkPath) {
      alert("⚠️ Vui lòng chọn ĐẦY ĐỦ cả 2 file Excel trước khi khởi chạy!");
      return;
    }
    // Gửi cả 2 đường dẫn xuống Python
    onToggle(tool.id, { main_path: mainPath, bulk_path: bulkPath });
  };

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
            <p className={`text-sm ${textSecondary(isDark)}`}>Ghép nối và xử lý dữ liệu bulk tự động.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-2 ${isRunning ? (isDark ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-teal-50 text-teal-600 border-teal-200') : (isDark ? 'bg-white/5 text-white/40 border-white/10' : 'bg-slate-100 text-slate-500 border-slate-200')}`}>
            {isRunning && <span className="relative flex h-2 w-2"><span className={`animate-ping absolute inset-0 rounded-full opacity-75 ${isDark ? 'bg-teal-400' : 'bg-teal-500'}`} /><span className={`relative rounded-full h-2 w-2 ${isDark ? 'bg-teal-400' : 'bg-teal-500'}`} /></span>}
            {isRunning ? 'Đang hoạt động' : 'Đang chờ'}
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0">
        
        {/* BẢNG ĐIỀU KHIỂN (CỘT TRÁI) */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
          <div className={`p-5 rounded-2xl flex-1 flex flex-col ${glassPanel(isDark)}`}>
            <h3 className={`text-sm font-bold uppercase tracking-wider mb-5 flex items-center gap-2 ${textPrimary(isDark)}`}>
              <Link className="w-4 h-4 text-teal-500" /> Nguồn dữ liệu (2 File)
            </h3>

            <div className="space-y-4 flex-1">
              {/* Ô 1: Main File */}
              <div>
                <label className={`block text-xs font-semibold mb-2 ${textSecondary(isDark)}`}>File 入稿シート (.xlsx)</label>
                <div 
                  onClick={handleSelectMain}
                  className={`relative flex items-center gap-3 p-3 rounded-xl border-2 border-dashed transition-all cursor-pointer group ${isRunning ? 'opacity-60 cursor-not-allowed' : ''} ${isDark ? (mainPath ? 'border-teal-500/50 bg-teal-500/5' : 'border-white/10 hover:border-teal-500/30 hover:bg-white/5') : (mainPath ? 'border-teal-500/50 bg-teal-50' : 'border-slate-300 hover:border-teal-400/50 hover:bg-slate-50')}`}
                >
                  <div className={`p-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-white border'}`}>
                    <FileSpreadsheet className={`w-5 h-5 ${mainPath ? (isDark ? 'text-teal-400' : 'text-teal-500') : textSecondary(isDark)}`} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {mainPath ? (
                      <>
                        <p className={`text-sm font-medium truncate ${textPrimary(isDark)}`}>{mainPath.split('\\').pop() || mainPath.split('/').pop()}</p>
                        <p className={`text-[10px] truncate ${textSecondary(isDark)}`}>{mainPath}</p>
                      </>
                    ) : (
                      <p className={`text-sm font-medium ${textSecondary(isDark)} group-hover:text-teal-400 transition-colors`}>Nhấn chọn tệp chính...</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Ô 2: Bulk File */}
              <div>
                <label className={`block text-xs font-semibold mb-2 ${textSecondary(isDark)}`}>File Bulk (Nguồn)</label>
                <div 
                  onClick={handleSelectBulk}
                  className={`relative flex items-center gap-3 p-3 rounded-xl border-2 border-dashed transition-all cursor-pointer group ${isRunning ? 'opacity-60 cursor-not-allowed' : ''} ${isDark ? (bulkPath ? 'border-teal-500/50 bg-teal-500/5' : 'border-white/10 hover:border-teal-500/30 hover:bg-white/5') : (bulkPath ? 'border-teal-500/50 bg-teal-50' : 'border-slate-300 hover:border-teal-400/50 hover:bg-slate-50')}`}
                >
                  <div className={`p-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-white border'}`}>
                    <FolderSearch className={`w-5 h-5 ${bulkPath ? (isDark ? 'text-teal-400' : 'text-teal-500') : textSecondary(isDark)}`} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {bulkPath ? (
                      <>
                        <p className={`text-sm font-medium truncate ${textPrimary(isDark)}`}>{bulkPath.split('\\').pop() || bulkPath.split('/').pop()}</p>
                        <p className={`text-[10px] truncate ${textSecondary(isDark)}`}>{bulkPath}</p>
                      </>
                    ) : (
                      <p className={`text-sm font-medium ${textSecondary(isDark)} group-hover:text-teal-400 transition-colors`}>Nhấn chọn tệp bulk...</p>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* ACTION BUTTON */}
            <div className="pt-4 mt-auto">
              {isRunning ? (
                <button onClick={() => onToggle(tool.id)} className={`w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-500/20 active:scale-[0.98] ${isDark ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20' : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'}`}>
                  <Square className="w-4 h-4" /> Dừng tiến trình
                </button>
              ) : (
                <button onClick={handleRun} className={`w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] ${mainPath && bulkPath ? (isDark ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-teal-500/25' : 'bg-gradient-to-r from-teal-400 to-emerald-500 text-white shadow-teal-500/25') : (isDark ? 'bg-white/5 text-white/30 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed')}`}>
                  <Play className="w-4 h-4" /> Khởi chạy công cụ
                </button>
              )}
            </div>
          </div>
        </div>

        {/* TERMINAL LOGS (CỘT PHẢI) */}
        <div className={`w-full lg:w-2/3 flex flex-col rounded-2xl overflow-hidden border ${isDark ? 'border-white/10 bg-[#0a0a0a]' : 'border-slate-200 bg-[#1e1e1e]'}`}>
          <div className={`px-4 py-3 border-b flex items-center justify-between bg-black/20 ${isDark ? 'border-white/10' : 'border-white/5'}`}>
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-mono text-slate-300">Terminal Output</span>
            </div>
            <button onClick={() => onClearLogs(tool.currentTaskId)} className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto font-mono text-[13px] leading-relaxed text-slate-300">
            {currentLog ? (
              <pre className="whitespace-pre-wrap font-inherit">
                {currentLog.split('\n').map((line, i) => (
                  <div key={i} className={`${line.includes('Lỗi') || line.includes('❌') ? 'text-red-400' : line.includes('✅') || line.includes('Hoàn thành') ? 'text-teal-400 font-bold' : line.includes('Cảnh báo') ? 'text-amber-400' : ''}`}>
                    {line}
                  </div>
                ))}
                <div ref={logEndRef} />
              </pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500/50 italic space-y-3">
                <Terminal className="w-12 h-12 opacity-20" />
                <p>Hệ thống sẵn sàng. Vui lòng chọn đủ 2 file để khởi chạy...</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </motion.div>
  );
}