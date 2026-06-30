// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Play, Square, Terminal, Trash2, 
  FileSpreadsheet, FolderSearch, Link, Edit3, 
  ArrowRight, Settings2, UserCircle, AlertCircle
} from 'lucide-react';
import { useTheme, glassPanel, textPrimary, textSecondary } from '../utils';
import { open } from '@tauri-apps/plugin-dialog';

export default function XSuiteCustomScreen({ allTools, logs, onBack, onToggle, onClearLogs }) {
  const { isDark } = useTheme();
  const logEndRef = useRef<HTMLDivElement>(null);
  
  // 1. TÌM KIẾM CÁC TOOL CON TRONG DANH SÁCH TỪ SUPABASE
  const toolTW = allTools.find(t => t.name.includes('TW管理票')) || {};
  const toolHimo = allTools.find(t => t.name.includes('himozuke')) || {};
  const toolXChange = allTools.find(t => t.name.includes('X変更')) || {};

  // 2. QUẢN LÝ TRẠNG THÁI INPUT & LOCALSTORAGE
  const [pathTW, setPathTW] = useState(() => localStorage.getItem(`x_path_tw`) || '');
  const [empId, setEmpId] = useState(() => localStorage.getItem(`x_empid_tw`) || '');
  const [pathHimoMain, setPathHimoMain] = useState(() => localStorage.getItem(`x_path_himo_main`) || '');
  const [pathHimoBulk, setPathHimoBulk] = useState(() => localStorage.getItem(`x_path_himo_bulk`) || '');
  const [pathXChange, setPathXChange] = useState(() => localStorage.getItem(`x_path_xchange`) || '');

  // Trạng thái giao diện
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState('tw'); // Để biết đang hiển thị log của tool nào

  // Lưu vào LocalStorage khi thay đổi
  useEffect(() => {
    localStorage.setItem('x_path_tw', pathTW);
    localStorage.setItem('x_empid_tw', empId);
    localStorage.setItem('x_path_himo_main', pathHimoMain);
    localStorage.setItem('x_path_himo_bulk', pathHimoBulk);
    localStorage.setItem('x_path_xchange', pathXChange);
  }, [pathTW, empId, pathHimoMain, pathHimoBulk, pathXChange]);

  // Tự động cuộn log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // 3. HÀM CHỌN FILE
  const handlePick = async (setter) => {
    const selected = await open({ multiple: false, filters: [{ name: 'Excel', extensions: ['xlsx', 'xlsm'] }] });
    if (selected && !Array.isArray(selected)) setter(selected);
  };

  // 4. HÀM KHỞI CHẠY (LOGIC RIÊNG CHO TỪNG TOOL)
  const runTW = () => {
    if (!pathTW || !empId) return alert("Vui lòng điền đủ file và mã nhân viên!");
    setActiveTab('tw');
    onToggle(toolTW.id, { input_path: pathTW, emp_id: empId });
  };

  const runHimo = () => {
    if (!pathHimoMain || !pathHimoBulk) return alert("Vui lòng chọn đủ 2 file cho himozuke!");
    setActiveTab('himo');
    onToggle(toolHimo.id, { main_path: pathHimoMain, bulk_path: pathHimoBulk });
  };

  const runXChange = () => {
    if (!pathXChange) return alert("Vui lòng chọn file cho X変更!");
    setActiveTab('xchange');
    onToggle(toolXChange.id, { input_path: pathXChange });
  };

  // Lấy log hiển thị dựa trên tab đang hoạt động
  const getActiveLog = () => {
    if (activeTab === 'tw') return logs[toolTW.currentTaskId] || '';
    if (activeTab === 'himo') return logs[toolHimo.currentTaskId] || '';
    return logs[toolXChange.currentTaskId] || '';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full gap-4 p-2 overflow-hidden">
      {/* HEADER */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className={`w-10 h-10 rounded-xl flex items-center justify-center border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'}`}>
            <ChevronLeft className={textPrimary(isDark)} />
          </button>
          <div>
            <h2 className={`text-2xl font-bold ${textPrimary(isDark)}`}>✖️ Media X Hub</h2>
            <p className={`text-sm ${textSecondary(isDark)}`}>Tổ hợp công cụ Twitter chuyên dụng</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0">
        {/* CỘT TRÁI: ĐIỀU KHIỂN */}
        <div className="w-full lg:w-[55%] flex flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar">
          
          {/* PHẦN 1 & 2: LUỒNG CHÍNH */}
          <div className="grid grid-cols-1 md:flex gap-3 items-stretch">
            {/* CARD TW管理票 */}
            <div className={`flex-1 p-4 rounded-2xl border flex flex-col ${glassPanel(isDark)} ${activeTab === 'tw' ? 'border-sky-500/50' : ''}`}>
               <div className="flex items-center gap-2 mb-4">
                 <FileSpreadsheet className="w-5 h-5 text-sky-500" />
                 <span className={`font-bold ${textPrimary(isDark)}`}>1. TW管理票</span>
               </div>
               
               <div className="space-y-3 mb-4 flex-1">
                  <div onClick={() => handlePick(setPathTW)} className="p-2 rounded-lg border border-dashed cursor-pointer hover:bg-sky-500/5">
                    <p className="text-[10px] uppercase font-bold text-sky-500">File Nhập</p>
                    <p className={`text-xs truncate ${textSecondary(isDark)}`}>{pathTW || 'Chọn file...'}</p>
                  </div>
                  <div className={`flex items-center gap-2 p-2 rounded-lg border ${isDark ? 'bg-black/20 border-white/10' : 'bg-white'}`}>
                    <UserCircle className="w-4 h-4 opacity-50" />
                    <input value={empId} onChange={e => setEmpId(e.target.value.toUpperCase())} placeholder="Casso ID" className="bg-transparent border-none outline-none text-xs w-full" />
                  </div>
               </div>

               <button onClick={runTW} disabled={toolTW.status === 'running'} className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 ${toolTW.status === 'running' ? 'bg-red-500/20 text-red-500' : 'bg-sky-600 text-white shadow-lg'}`}>
                  {toolTW.status === 'running' ? <><Square className="w-3 h-3"/> Dừng</> : <><Play className="w-3 h-3"/> Chạy bước 1</>}
               </button>
            </div>

            <div className="hidden md:flex items-center opacity-20"><ArrowRight /></div>

            {/* CARD HIMOZUKE */}
            <div className={`flex-1 p-4 rounded-2xl border flex flex-col ${glassPanel(isDark)} ${activeTab === 'himo' ? 'border-teal-500/50' : ''}`}>
               <div className="flex items-center gap-2 mb-4">
                 <Link className="w-5 h-5 text-teal-500" />
                 <span className={`font-bold ${textPrimary(isDark)}`}>2. himozuke</span>
               </div>
               
               <div className="space-y-3 mb-4 flex-1">
                  <div onClick={() => handlePick(setPathHimoMain)} className="p-2 rounded-lg border border-dashed cursor-pointer hover:bg-teal-500/5">
                    <p className="text-[10px] uppercase font-bold text-teal-500">File Chính</p>
                    <p className={`text-xs truncate ${textSecondary(isDark)}`}>{pathHimoMain || 'Chọn file...'}</p>
                  </div>
                  <div onClick={() => handlePick(setPathHimoBulk)} className="p-2 rounded-lg border border-dashed cursor-pointer hover:bg-teal-500/5">
                    <p className="text-[10px] uppercase font-bold text-teal-500">File Bulk</p>
                    <p className={`text-xs truncate ${textSecondary(isDark)}`}>{pathHimoBulk || 'Chọn file...'}</p>
                  </div>
               </div>

               <button onClick={runHimo} disabled={toolHimo.status === 'running'} className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 ${toolHimo.status === 'running' ? 'bg-red-500/20 text-red-500' : 'bg-teal-600 text-white shadow-lg'}`}>
                  {toolHimo.status === 'running' ? <><Square className="w-3 h-3"/> Dừng</> : <><Play className="w-3 h-3"/> Chạy bước 2</>}
               </button>
            </div>
          </div>

          {/* PHẦN 3: CÔNG CỤ PHỤ (X変更) */}
          <div className="mt-2">
            <button onClick={() => setShowAdvanced(!showAdvanced)} className={`flex items-center gap-2 text-xs font-bold opacity-60 hover:opacity-100 mb-2 transition-all`}>
              <Settings2 className="w-4 h-4" /> {showAdvanced ? "Ẩn công cụ nâng cao" : "Hiển thị công cụ nâng cao (X変更)"}
            </button>
            
            <AnimatePresence>
              {showAdvanced && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className={`p-4 rounded-2xl border flex flex-col md:flex-row gap-4 items-center ${glassPanel(isDark)} ${isDark ? 'bg-purple-500/5 border-purple-500/20' : 'bg-purple-50 border-purple-200'}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Edit3 className="w-4 h-4 text-purple-500" />
                        <span className={`font-bold text-sm ${textPrimary(isDark)}`}>X変更</span>
                      </div>
                      <p className="text-[10px] opacity-60">Đổi tên thẻ quảng cáo theo chỉ định.</p>
                    </div>
                    <div onClick={() => handlePick(setPathXChange)} className="flex-[2] w-full p-2 rounded-lg border border-dashed cursor-pointer text-xs truncate">
                      {pathXChange || 'Chọn file X変更...'}
                    </div>
                    <button onClick={runXChange} className="w-full md:w-28 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2">
                      <Play className="w-3 h-3" /> Chạy
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* CỘT PHẢI: TERMINAL CHUNG */}
        <div className={`flex-1 flex flex-col rounded-2xl overflow-hidden border ${isDark ? 'bg-[#0a0a0a] border-white/10' : 'bg-[#1e1e1e] border-slate-200'}`}>
          <div className="px-4 py-2 border-b border-white/5 flex justify-between items-center bg-black/20">
             <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] font-mono text-slate-300 uppercase tracking-widest">
                  Log: {activeTab === 'tw' ? 'TW管理票' : activeTab === 'himo' ? 'himozuke' : 'X変更'}
                </span>
             </div>
             <button onClick={() => onClearLogs(activeTab === 'tw' ? toolTW.currentTaskId : activeTab === 'himo' ? toolHimo.currentTaskId : toolXChange.currentTaskId)} className="p-1 hover:bg-white/10 rounded text-slate-400"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] text-slate-300 custom-scrollbar">
             {getActiveLog() ? (
               <pre className="whitespace-pre-wrap">
                 {getActiveLog().split('\n').map((line, i) => (
                   <div key={i} className={line.includes('Lỗi') || line.includes('❌') ? 'text-red-400' : line.includes('✅') ? 'text-emerald-400' : ''}>{line}</div>
                 ))}
                 <div ref={logEndRef} />
               </pre>
             ) : (
               <div className="h-full flex items-center justify-center text-slate-600 italic">Chưa có dữ liệu log cho tiến trình này.</div>
             )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}