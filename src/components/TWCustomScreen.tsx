// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, Play, Square, Terminal, 
  Trash2, FileSpreadsheet, FolderSearch, AlertCircle, UserCircle
} from 'lucide-react';
import { useTheme, glassPanel, textPrimary, textSecondary } from '../utils';
import { open } from '@tauri-apps/plugin-dialog';

export default function TWCustomScreen({ tool, logs, onBack, onToggle, onClearLogs }) {
  const { isDark } = useTheme();
  const [selectedPath, setSelectedPath] = useState(() => {
    return localStorage.getItem(`tw_path_${tool.id}`) || '';
  });
  
  const [empId, setEmpId] = useState(() => {
    return localStorage.getItem(`tw_empid_${tool.id}`) || '';
  });
  const logEndRef = useRef<HTMLDivElement>(null);
  const isRunning = tool.status === 'running';
  const currentLog = logs[tool.currentTaskId] || '';

  useEffect(() => {
    localStorage.setItem(`tw_path_${tool.id}`, selectedPath);
  }, [selectedPath, tool.id]);

  useEffect(() => {
    localStorage.setItem(`tw_empid_${tool.id}`, empId);
  }, [empId, tool.id]);

  // Tự động cuộn xuống dòng log mới nhất
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentLog]);

  // Hàm mở hộp thoại chọn file
  const handleSelectFile = async () => {
    if (isRunning) return;
    try {
      const selected = await open({
        multiple: false,
        title: "Chọn file 入稿シート (Excel)",
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
    if (!empId.trim()) {
      alert("⚠️ Vui lòng nhập Mã nhân viên của bạn (Casso ID)!");
      return;
    }
    // Gửi data xuống Tauri với cấu trúc JSON khớp với file Python
    onToggle(tool.id, { 
      input_path: selectedPath, 
      emp_id: empId.trim() 
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full gap-5 overflow-hidden p-2"
    >
      {/* HEADER */}
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
            <p className={`text-sm ${textSecondary(isDark)}`}>Tự động hóa ghi đè dữ liệu và đặt lịch Slack.</p>
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
        
        {/* CỘT TRÁI: CẤU HÌNH (THÔNG SỐ ĐẦU VÀO) */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
          <div className={`p-5 rounded-2xl flex-1 flex flex-col ${glassPanel(isDark)}`}>
            <h3 className={`text-sm font-bold uppercase tracking-wider mb-5 flex items-center gap-2 ${textPrimary(isDark)}`}>
              <FileSpreadsheet className="w-4 h-4 text-violet-500" /> Cấu hình đầu vào
            </h3>

            <div className="space-y-5 flex-1">
              
              {/* Ô 1: Chọn File Excel */}
              <div>
                <label className={`block text-xs font-semibold mb-2 ${textSecondary(isDark)}`}>File 入稿シート (.xlsx)</label>
                <div 
                  onClick={handleSelectFile}
                  className={`relative flex items-center gap-3 p-3 rounded-xl border-2 border-dashed transition-all cursor-pointer group ${isRunning ? 'opacity-60 cursor-not-allowed' : ''} ${isDark ? (selectedPath ? 'border-violet-500/50 bg-violet-500/5' : 'border-white/10 hover:border-violet-500/30 hover:bg-white/5') : (selectedPath ? 'border-violet-500/50 bg-violet-50' : 'border-slate-300 hover:border-violet-400/50 hover:bg-slate-50')}`}
                >
                  <div className={`p-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-white border'}`}>
                    <FolderSearch className={`w-5 h-5 ${selectedPath ? (isDark ? 'text-violet-400' : 'text-violet-500') : textSecondary(isDark)}`} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {selectedPath ? (
                      <>
                        <p className={`text-sm font-medium truncate ${textPrimary(isDark)}`}>{selectedPath.split('\\').pop() || selectedPath.split('/').pop()}</p>
                        <p className={`text-[10px] truncate ${textSecondary(isDark)}`}>{selectedPath}</p>
                      </>
                    ) : (
                      <p className={`text-sm font-medium ${textSecondary(isDark)} group-hover:text-violet-400 transition-colors`}>Nhấn để chọn file...</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Ô 2: Nhập Mã Nhân Viên */}
              <div>
                <label className={`block text-xs font-semibold mb-2 ${textSecondary(isDark)}`}>Mã nhân viên của bạn (Casso ID)</label>
                <div className={`relative flex items-center gap-3 p-1 rounded-xl border transition-all ${isRunning ? 'opacity-60 cursor-not-allowed' : ''} ${isDark ? 'bg-black/20 border-white/10 focus-within:border-violet-500/50 focus-within:bg-violet-500/5' : 'bg-white border-slate-200 focus-within:border-violet-400 focus-within:bg-violet-50'}`}>
                  <div className={`p-2 pl-3 ${textSecondary(isDark)}`}>
                    <UserCircle className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    disabled={isRunning}
                    value={empId}
                    onChange={(e) => setEmpId(e.target.value.toUpperCase())} // Ép viết hoa tự động
                    placeholder="VD: DT0160"
                    className={`flex-1 bg-transparent border-none outline-none text-sm font-semibold tracking-wider placeholder:font-normal placeholder:tracking-normal py-2 pr-4 ${textPrimary(isDark)} ${isDark ? 'placeholder:text-white/20' : 'placeholder:text-slate-400'}`}
                  />
                </div>
                <p className={`text-[11px] mt-2 flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <AlertCircle className="w-3 h-3" /> Mã này dùng để xác định người nhận thông báo trên Slack.
                </p>
              </div>

            </div>

            {/* ACTION BUTTON */}
            <div className="pt-4 mt-auto">
              {isRunning ? (
                <button onClick={() => onToggle(tool.id)} className={`w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-500/20 active:scale-[0.98] ${isDark ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20' : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'}`}>
                  <Square className="w-4 h-4" /> Dừng tiến trình
                </button>
              ) : (
                <button onClick={handleRun} className={`w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] ${selectedPath && empId ? (isDark ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-violet-500/25' : 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-violet-500/25') : (isDark ? 'bg-white/5 text-white/30 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed')}`}>
                  <Play className="w-4 h-4" /> Khởi chạy công cụ
                </button>
              )}
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: TERMINAL LOGS */}
        <div className={`w-full lg:w-2/3 flex flex-col rounded-2xl overflow-hidden border ${isDark ? 'border-white/10 bg-[#0a0a0a]' : 'border-slate-200 bg-[#1e1e1e]'}`}>
          <div className={`px-4 py-3 border-b flex items-center justify-between bg-black/20 ${isDark ? 'border-white/10' : 'border-white/5'}`}>
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-mono text-slate-300">Terminal Output</span>
            </div>
            <button 
              onClick={() => onClearLogs(tool.currentTaskId)}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Xóa Log"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto font-mono text-[13px] leading-relaxed text-slate-300">
            {currentLog ? (
              <pre className="whitespace-pre-wrap font-inherit">
                {currentLog.split('\n').map((line, i) => (
                  <div key={i} className={`${line.includes('LỖI') || line.includes('Error') || line.includes('❌') ? 'text-red-400' : line.includes('✅') ? 'text-emerald-400 font-bold' : line.includes('⚠️') ? 'text-amber-400' : ''}`}>
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