// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft, Play, Square, Terminal,
  Trash2, FileSpreadsheet, FolderSearch, ImageIcon, AlertCircle
} from 'lucide-react';
import { useTheme, glassPanel, textPrimary, textSecondary } from '../utils';
import { open } from '@tauri-apps/plugin-dialog';

export default function XUploadCustomScreen({ tool, logs, onBack, onToggle, onClearLogs }) {
  const { isDark } = useTheme();
  const [excelPath, setExcelPath] = useState(() => {
    return localStorage.getItem(`xupload_excel_${tool.id}`) || '';
  });
  const [mediaFolder, setMediaFolder] = useState(() => {
    return localStorage.getItem(`xupload_media_${tool.id}`) || '';
  });
  const logEndRef = useRef<HTMLDivElement>(null);

  const isRunning = tool.status === 'running';
  const currentLog = logs[tool.currentTaskId] || '';

  useEffect(() => {
    localStorage.setItem(`xupload_excel_${tool.id}`, excelPath);
  }, [excelPath, tool.id]);

  useEffect(() => {
    localStorage.setItem(`xupload_media_${tool.id}`, mediaFolder);
  }, [mediaFolder, tool.id]);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentLog]);

  const handleSelectExcel = async () => {
    if (isRunning) return;
    try {
      const selected = await open({
        multiple: false,
        title: "Chọn file 入稿シート",
        filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls', 'xlsm'] }]
      });
      if (selected && !Array.isArray(selected)) {
        setExcelPath(selected);
      }
    } catch (error) {
      console.error("Lỗi chọn file:", error);
    }
  };

  const handleSelectMediaFolder = async () => {
    if (isRunning) return;
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Chọn thư mục chứa Hình ảnh/Video"
      });
      if (selected && !Array.isArray(selected)) {
        setMediaFolder(selected);
      }
    } catch (error) {
      console.error("Lỗi chọn thư mục:", error);
    }
  };

  const handleRun = () => {
    if (!excelPath || !mediaFolder) {
      alert("⚠️ Vui lòng chọn đủ file Excel và thư mục Media trước khi khởi chạy!");
      return;
    }
    onToggle(tool.id, { excel_path: excelPath, media_folder: mediaFolder });
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
            <p className={`text-sm ${textSecondary(isDark)}`}>Tự động đăng Hình ảnh/Video lên X (Twitter).</p>
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

        {/* CỘT TRÁI: CẤU HÌNH */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
          <div className={`p-5 rounded-2xl flex-1 flex flex-col ${glassPanel(isDark)}`}>

            <h3 className={`text-sm font-bold uppercase tracking-wider mb-5 flex items-center gap-2 ${textPrimary(isDark)}`}>
              <FileSpreadsheet className="w-4 h-4 text-sky-500" /> Cấu hình đầu vào
            </h3>

            <div className="space-y-4 flex-1">
              {/* CHỌN FILE EXCEL */}
              <div>
                <label className={`block text-xs font-semibold mb-2 ${textSecondary(isDark)}`}>File 入稿シート (.xlsx)</label>
                <div
                  onClick={handleSelectExcel}
                  className={`relative flex items-center gap-3 p-3 rounded-xl border-2 border-dashed transition-all cursor-pointer group ${isRunning ? 'opacity-60 cursor-not-allowed' : ''} ${isDark ? (excelPath ? 'border-sky-500/50 bg-sky-500/5' : 'border-white/10 hover:border-sky-500/30 hover:bg-white/5') : (excelPath ? 'border-sky-500/50 bg-sky-50' : 'border-slate-300 hover:border-sky-400/50 hover:bg-slate-50')}`}
                >
                  <div className={`p-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-white border'}`}>
                    <FolderSearch className={`w-5 h-5 ${excelPath ? (isDark ? 'text-sky-400' : 'text-sky-500') : textSecondary(isDark)}`} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {excelPath ? (
                      <>
                        <p className={`text-sm font-medium truncate ${textPrimary(isDark)}`}>{excelPath.split('\\').pop() || excelPath.split('/').pop()}</p>
                        <p className={`text-[10px] truncate ${textSecondary(isDark)}`}>{excelPath}</p>
                      </>
                    ) : (
                      <p className={`text-sm font-medium ${textSecondary(isDark)} group-hover:text-sky-400 transition-colors`}>Nhấn để chọn file...</p>
                    )}
                  </div>
                </div>
              </div>

              {/* CHỌN THƯ MỤC MEDIA */}
              <div>
                <label className={`block text-xs font-semibold mb-2 ${textSecondary(isDark)}`}>Thư mục chứa Media</label>
                <div
                  onClick={handleSelectMediaFolder}
                  className={`relative flex items-center gap-3 p-3 rounded-xl border-2 border-dashed transition-all cursor-pointer group ${isRunning ? 'opacity-60 cursor-not-allowed' : ''} ${isDark ? (mediaFolder ? 'border-sky-500/50 bg-sky-500/5' : 'border-white/10 hover:border-sky-500/30 hover:bg-white/5') : (mediaFolder ? 'border-sky-500/50 bg-sky-50' : 'border-slate-300 hover:border-sky-400/50 hover:bg-slate-50')}`}
                >
                  <div className={`p-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-white border'}`}>
                    <ImageIcon className={`w-5 h-5 ${mediaFolder ? (isDark ? 'text-sky-400' : 'text-sky-500') : textSecondary(isDark)}`} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {mediaFolder ? (
                      <>
                        <p className={`text-sm font-medium truncate ${textPrimary(isDark)}`}>{mediaFolder.split('\\').pop() || mediaFolder.split('/').pop()}</p>
                        <p className={`text-[10px] truncate ${textSecondary(isDark)}`}>{mediaFolder}</p>
                      </>
                    ) : (
                      <p className={`text-sm font-medium ${textSecondary(isDark)} group-hover:text-sky-400 transition-colors`}>Nhấn để chọn thư mục...</p>
                    )}
                  </div>
                </div>
              </div>

              <div className={`p-3 rounded-xl border border-dashed ${isDark ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                <p className={`text-[11px] leading-relaxed flex items-start gap-2 ${isDark ? 'text-amber-400/90' : 'text-amber-700'}`}>
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    File Excel cần đúng sheet <b>ツイート設計シート</b> (chứa ID đăng nhập, mật khẩu, link đích). Thư mục Media chứa ảnh (.jpg/.png/.gif) và/hoặc video (.mp4/.mov).
                  </span>
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
                <button onClick={handleRun} className={`w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] ${(excelPath && mediaFolder) ? (isDark ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sky-500/25' : 'bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-sky-500/25') : (isDark ? 'bg-white/5 text-white/30 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed')}`}>
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
                  <div key={i} className={`${line.includes('Lỗi') || line.includes('❌') ? 'text-red-400' : line.includes('✅') ? 'text-sky-400 font-bold' : ''}`}>
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
