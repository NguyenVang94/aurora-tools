// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, Play, Square, Terminal, 
  Trash2, FileSpreadsheet, FolderSearch, AlertCircle, Download, FolderOpen
} from 'lucide-react';
import { useTheme, glassPanel, textPrimary, textSecondary } from '../utils';
import { open } from '@tauri-apps/plugin-dialog';
import { open as openUrl } from '@tauri-apps/plugin-shell';

export default function ConsultingCustomScreen({ tool, logs, onBack, onToggle, onClearLogs }) {
  const { isDark } = useTheme();
  
  // 🔥 AUTO SAVE/LOAD: Đường dẫn file đầu vào
  const [selectedPath, setSelectedPath] = useState(() => {
    return localStorage.getItem(`consulting_path_${tool.id}`) || '';
  });

  // 🔥 NEW: Đường dẫn thư mục lưu kết quả
  const [saveDirPath, setSaveDirPath] = useState(() => {
    return localStorage.getItem(`consulting_save_path_${tool.id}`) || '';
  });

  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  const logEndRef = useRef<HTMLDivElement>(null);
  const isRunning = tool.status === 'running';
  const currentLog = logs[tool.currentTaskId] || '';

  // Lưu các đường dẫn vào localStorage
  useEffect(() => {
    localStorage.setItem(`consulting_path_${tool.id}`, selectedPath);
    localStorage.setItem(`consulting_save_path_${tool.id}`, saveDirPath);
  }, [selectedPath, saveDirPath, tool.id]);

  useEffect(() => {
    if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [currentLog]);

  const handleSelectFile = async () => {
    if (isRunning) return;
    try {
      const selected = await open({
        multiple: false,
        title: "Chọn file Consulting.xlsx",
        filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls', 'xlsm'] }]
      });
      if (selected && !Array.isArray(selected)) {
        setSelectedPath(selected);
      }
    } catch (error) {
      console.error("Lỗi chọn file:", error);
    }
  };

  // 🔥 HÀM CHỌN THƯ MỤC LƯU
  const handleSelectFolder = async () => {
    if (isRunning) return;
    try {
      const selected = await open({
        directory: true, // Quan trọng: Chế độ chọn thư mục
        multiple: false,
        title: "Chọn thư mục lưu file kết quả"
      });
      if (selected) {
        setSaveDirPath(selected);
      }
    } catch (error) {
      console.error("Lỗi chọn thư mục:", error);
    }
  };

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      const downloadUrl = 'https://github.com/NguyenVang94/aurora-tools/releases/download/Consultingtemple/Consulting.xlsx';
      await openUrl(downloadUrl);
    } catch (error) {
      console.error("Lỗi khi tải file mẫu:", error);
      alert("Không thể tải file mẫu. Vui lòng thử lại!");
    } finally {
      setTimeout(() => setIsDownloadingTemplate(false), 800);
    }
  };

  const handleRun = () => {
    if (!selectedPath || !saveDirPath) {
      alert("⚠️ Vui lòng chọn đầy đủ file đầu vào và thư mục lưu kết quả!");
      return;
    }
    // Gửi JSON config xuống Python bao gồm cả output_dir
    onToggle(tool.id, { 
      input_path: selectedPath,
      output_dir: saveDirPath 
    });
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
            <p className={`text-sm ${textSecondary(isDark)}`}>Tự động hóa kiểm tra trạng thái chiến dịch trên Kiwami AI.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-2 ${isRunning ? (isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-200') : (isDark ? 'bg-white/5 text-white/40 border-white/10' : 'bg-slate-100 text-slate-500 border-slate-200')}`}>
            {isRunning && <span className="relative flex h-2 w-2"><span className={`animate-ping absolute inset-0 rounded-full opacity-75 ${isDark ? 'bg-emerald-400' : 'bg-emerald-500'}`} /><span className={`relative rounded-full h-2 w-2 ${isDark ? 'bg-emerald-400' : 'bg-emerald-500'}`} /></span>}
            {isRunning ? 'Đang hoạt động' : 'Đang chờ'}
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0">
        
        {/* BẢNG ĐIỀU KHIỂN (CỘT TRÁI) */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
          <div className={`p-5 rounded-2xl flex-1 flex flex-col ${glassPanel(isDark)}`}>
            
            <div className="flex items-center justify-between mb-5">
              <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${textPrimary(isDark)}`}>
                <FileSpreadsheet className="w-4 h-4 text-cyan-500" /> Cấu hình công cụ
              </h3>
            </div>

            <div className="space-y-5 flex-1 overflow-y-auto pr-1">
              {/* PHẦN 1: CHỌN FILE ĐẦU VÀO */}
              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-tight mb-2 ${textSecondary(isDark)}`}>File Excel nguồn (.xlsx)</label>
                <div 
                  onClick={handleSelectFile}
                  className={`relative flex items-center gap-3 p-3.5 rounded-xl border-2 border-dashed transition-all cursor-pointer group ${isRunning ? 'opacity-60 cursor-not-allowed' : ''} ${isDark ? (selectedPath ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-white/10 hover:border-cyan-500/30 hover:bg-white/5') : (selectedPath ? 'border-cyan-500/50 bg-cyan-50' : 'border-slate-300 hover:border-cyan-400/50 hover:bg-slate-50')}`}
                >
                  <div className={`p-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-white border'}`}>
                    <FolderSearch className={`w-4 h-4 ${selectedPath ? (isDark ? 'text-cyan-400' : 'text-cyan-500') : textSecondary(isDark)}`} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {selectedPath ? (
                      <p className={`text-[13px] font-medium truncate ${textPrimary(isDark)}`}>{selectedPath.split('\\').pop() || selectedPath.split('/').pop()}</p>
                    ) : (
                      <p className={`text-[13px] font-medium ${textSecondary(isDark)} group-hover:text-cyan-400 transition-colors`}>Chọn file đầu vào...</p>
                    )}
                  </div>
                </div>
              </div>

              {/* PHẦN 2: CHỌN THƯ MỤC LƯU KẾT QUẢ */}
              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-tight mb-2 ${textSecondary(isDark)}`}>Thư mục lưu kết quả</label>
                <div 
                  onClick={handleSelectFolder}
                  className={`relative flex items-center gap-3 p-3.5 rounded-xl border-2 border-dashed transition-all cursor-pointer group ${isRunning ? 'opacity-60 cursor-not-allowed' : ''} ${isDark ? (saveDirPath ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-white/10 hover:border-indigo-500/30 hover:bg-white/5') : (saveDirPath ? 'border-indigo-500/50 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400/50 hover:bg-slate-50')}`}
                >
                  <div className={`p-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-white border'}`}>
                    <FolderOpen className={`w-4 h-4 ${saveDirPath ? (isDark ? 'text-indigo-400' : 'text-indigo-500') : textSecondary(isDark)}`} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {saveDirPath ? (
                      <p className={`text-[13px] font-medium truncate ${textPrimary(isDark)}`}>{saveDirPath}</p>
                    ) : (
                      <p className={`text-[13px] font-medium ${textSecondary(isDark)} group-hover:text-indigo-400 transition-colors`}>Chọn nơi lưu file...</p>
                    )}
                  </div>
                </div>
                <p className={`text-[10px] mt-2 flex items-center gap-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                   <AlertCircle className="w-3 h-3" /> Kết quả sẽ được lưu với tên <span className="font-mono">Final_Report_All.csv</span>
                </p>
              </div>

              {/* Box cảnh báo màu vàng */}
              <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-[11px] leading-relaxed ${isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-500/90' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Tool yêu cầu file có sheet <strong className="font-semibold text-amber-400">'user'</strong> chứa Casso ID/Pass. Hãy tải file mẫu nếu chưa có.</p>
              </div>

              {/* Nút tải file mẫu */}
              <button 
                onClick={handleDownloadTemplate}
                className={`w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-medium transition-all border shadow-sm ${
                  isDark 
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20 hover:border-cyan-500/40' 
                    : 'bg-white text-cyan-600 border-cyan-200 hover:bg-cyan-50 hover:border-cyan-300'
                } ${isDownloadingTemplate ? 'opacity-50' : ''}`}
              >
                <Download className="w-3.5 h-3.5" /> Tải file mẫu (.xlsx)
              </button>
            </div>

            {/* ACTION BUTTON KHỞI CHẠY */}
            <div className="pt-4 mt-auto">
              {isRunning ? (
                <button onClick={() => onToggle(tool.id)} className={`w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-500/20 active:scale-[0.98] ${isDark ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20' : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'}`}>
                  <Square className="w-4 h-4" /> Dừng tiến trình
                </button>
              ) : (
                <button onClick={handleRun} className={`w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] ${(selectedPath && saveDirPath) ? (isDark ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-cyan-500/25' : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-cyan-500/25') : (isDark ? 'bg-white/5 text-white/30 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed')}`}>
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
                  <div key={i} className={`${line.includes('✘') || line.includes('⚠') ? 'text-amber-400' : line.includes('✔') || line.includes('✅') ? 'text-emerald-400 font-bold' : ''}`}>
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