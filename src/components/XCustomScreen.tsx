// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, Play, Square, Terminal, 
  Trash2, FileSpreadsheet, FolderSearch, AlertCircle,
  Download, Loader2
} from 'lucide-react';
import { useTheme, glassPanel, textPrimary, textSecondary } from '../utils';
import { open } from '@tauri-apps/plugin-dialog';

// 🔥 Import plugin-shell để mở link bằng trình duyệt ngoài
import { open as openUrl } from '@tauri-apps/plugin-shell'; 

export default function XCustomScreen({ tool, logs, onBack, onToggle, onClearLogs }) {
  const { isDark } = useTheme();
  
  // 🔥 AUTO SAVE/LOAD
  const [selectedPath, setSelectedPath] = useState(() => {
    return localStorage.getItem(`x_path_${tool.id}`) || '';
  });

  const logEndRef = useRef<HTMLDivElement>(null);
  const isRunning = tool.status === 'running';
  const currentLog = logs[tool.currentTaskId] || '';
  
  // 🔥 STATE CHO NÚT TẢI FILE MẪU
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  // 🔥 LƯU VÀO LOCALSTORAGE
  useEffect(() => {
    localStorage.setItem(`x_path_${tool.id}`, selectedPath);
  }, [selectedPath, tool.id]);

  useEffect(() => {
    if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [currentLog]);

  const handleSelectFile = async () => {
    if (isRunning) return;
    try {
      const selected = await open({
        multiple: false,
        title: "Chọn file Excel",
        filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls', 'xlsm'] }]
      });
      if (selected && !Array.isArray(selected)) {
        setSelectedPath(selected);
      }
    } catch (error) {
      console.error("Lỗi chọn file:", error);
    }
  };

  const handleRun = () => {
    if (!selectedPath) {
      alert("⚠️ Vui lòng chọn file Excel đầu vào trước khi khởi chạy!");
      return;
    }
    onToggle(tool.id, { input_path: selectedPath });
  };

  // 🔥 HÀM XỬ LÝ TẢI FILE MẪU QUA TRÌNH DUYỆT NGOÀI
  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      const fileUrl = 'https://github.com/NguyenVang94/aurora-tools/releases/download/Xtemple/AD.xlsx';
      
      // Sử dụng API của Tauri Shell để ném link ra Chrome/Edge tải file
      await openUrl(fileUrl);

      // Giả lập thời gian chờ để UI hiển thị mượt mà
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error("Lỗi tải file mẫu:", error);
      // Fallback nếu plugin-shell bị lỗi
      window.location.href = 'https://github.com/NguyenVang94/aurora-tools/releases/download/Xtemple/AD.xlsx';
    } finally {
      setIsDownloadingTemplate(false);
    }
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
            <p className={`text-sm ${textSecondary(isDark)}`}>Tự động hóa thay đổi dữ liệu Ads trên X (Twitter).</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-2 ${isRunning ? (isDark ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' : 'bg-sky-50 text-sky-600 border-sky-200') : (isDark ? 'bg-white/5 text-white/40 border-white/10' : 'bg-slate-100 text-slate-500 border-slate-200')}`}>
            {isRunning && <span className="relative flex h-2 w-2"><span className={`animate-ping absolute inset-0 rounded-full opacity-75 ${isDark ? 'bg-sky-400' : 'bg-sky-500'}`} /><span className={`relative rounded-full h-2 w-2 ${isDark ? 'bg-sky-400' : 'bg-sky-500'}`} /></span>}
            {isRunning ? 'Đang hoạt động' : 'Đang chờ'}
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0">
        
        {/* BẢNG ĐIỀU KHIỂN (CỘT TRÁI) */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
          <div className={`p-5 rounded-2xl flex-1 flex flex-col ${glassPanel(isDark)}`}>
            <h3 className={`text-sm font-bold uppercase tracking-wider mb-5 flex items-center gap-2 ${textPrimary(isDark)}`}>
              <FileSpreadsheet className="w-4 h-4 text-sky-500" /> Cấu hình đầu vào
            </h3>

            <div className="space-y-4 flex-1">
              <div>
                <label className={`block text-xs font-semibold mb-2 ${textSecondary(isDark)}`}>
                  File Excel (.xlsx)
                </label>
                
                {/* Ô CHỌN FILE */}
                <div 
                  onClick={handleSelectFile}
                  className={`relative flex items-center gap-3 p-3 rounded-xl border-2 border-dashed transition-all cursor-pointer group mb-2 ${isRunning ? 'opacity-60 cursor-not-allowed' : ''} ${isDark ? (selectedPath ? 'border-sky-500/50 bg-sky-500/5' : 'border-white/10 hover:border-sky-500/30 hover:bg-white/5') : (selectedPath ? 'border-sky-500/50 bg-sky-50' : 'border-slate-300 hover:border-sky-400/50 hover:bg-slate-50')}`}
                >
                  <div className={`p-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-white border'}`}>
                    <FolderSearch className={`w-5 h-5 ${selectedPath ? (isDark ? 'text-sky-400' : 'text-sky-500') : textSecondary(isDark)}`} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {selectedPath ? (
                      <>
                        <p className={`text-sm font-medium truncate ${textPrimary(isDark)}`}>{selectedPath.split('\\').pop() || selectedPath.split('/').pop()}</p>
                        <p className={`text-[10px] truncate ${textSecondary(isDark)}`}>{selectedPath}</p>
                      </>
                    ) : (
                      <p className={`text-sm font-medium ${textSecondary(isDark)} group-hover:text-sky-400 transition-colors`}>Nhấn để chọn file...</p>
                    )}
                  </div>
                </div>

                {/* TEXT GHI CHÚ ĐÃ ĐƯỢC CĂN GIỮA VÀ ĐƯA LÊN TRÊN */}
                <p className={`text-[11px] mb-4 flex items-center justify-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <AlertCircle className="w-3 h-3" /> Đường dẫn đã được lưu tự động cho lần sau.
                </p>

                {/* NÚT TẢI FILE MẪU */}
                <button 
                  onClick={handleDownloadTemplate}
                  disabled={isDownloadingTemplate || isRunning}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border ${
                    isDark 
                      ? 'bg-white/[0.02] text-sky-400 border-white/10 hover:bg-white/[0.06] hover:border-sky-500/30' 
                      : 'bg-white text-sky-600 border-slate-200 shadow-sm hover:bg-slate-50 hover:border-sky-300'
                  } ${(isDownloadingTemplate || isRunning) ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'}`}
                >
                  {isDownloadingTemplate ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Đang tải...</>
                  ) : (
                    <><Download className="w-4 h-4" /> Tải file mẫu (.xlsx)</>
                  )}
                </button>
              </div>
            </div>

            {/* ACTION BUTTON */}
            <div className="pt-4 mt-auto">
              {isRunning ? (
                <button onClick={() => onToggle(tool.id)} className={`w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-500/20 active:scale-[0.98] ${isDark ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20' : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'}`}>
                  <Square className="w-4 h-4" /> Dừng tiến trình
                </button>
              ) : (
                <button onClick={handleRun} className={`w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] ${selectedPath ? (isDark ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sky-500/25' : 'bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-sky-500/25') : (isDark ? 'bg-white/5 text-white/30 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed')}`}>
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
                  <div key={i} className={`${line.includes('❌') || line.includes('⚠️') ? 'text-amber-400' : line.includes('✔️') || line.includes('✅') ? 'text-sky-400 font-bold' : ''}`}>
                    {line}
                  </div>
                ))}
                <div ref={logEndRef} />
              </pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500/50 italic space-y-3">
                <Terminal className="w-12 h-12 opacity-20" />
                <p>Hệ thống sẵn sàng. Chờ khởi chạy...</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </motion.div>
  );
}