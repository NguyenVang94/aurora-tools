// @ts-nocheck
import kiwamiLogoSmall from '../assets/image_c4d8bb.png';
import XSuiteCustomScreen from './XSuiteCustomScreen';
import ParameCustomScreen from './ParameCustomScreen';
import HimozukeCustomScreen from './HimozukeCustomScreen';
import XCustomScreen from './XCustomScreen';
import ConsultingCustomScreen from './ConsultingCustomScreen';
import TWCustomScreen from './TWCustomScreen';
import KiwamiCustomScreen from './KiwamiCustomScreen';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import React, { useState, useMemo, useEffect } from 'react';
import { motion, useMotionValue, useMotionTemplate } from 'framer-motion';

// --- IMPORT THƯ VIỆN KÉO THẢ DND-KIT ---
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// ----------------------------------------

import { 
  Search, Package, Activity, CircleOff, Zap, Play, Square, 
  ExternalLink, ChevronLeft, FolderOpen, Terminal, 
  Calendar, CheckCircle2, Clock, ListTodo, Download, Loader2,
  Settings2, GripHorizontal, Save, X 
} from 'lucide-react';
import { useTheme, glassPanel, glassCard, textPrimary, textSecondary, textMuted } from '../utils';

import { SharedDetailScreen } from './SharedDetailScreen';
import SeleniumCustomScreen from './SeleniumCustomScreen';
import { supabase } from '../supabase';

const TOOLS_DATA = [
  { id:1, name:'FastAPI Server', description:'Framework API hiệu suất cao.', icon:'⚡', version:'0.104.1', status:'stopped', uiType: 'cli' },
  { id:2, name:'Selenium Scraper', description:'Tự động hóa web.', icon:'🕷️', version:'4.16.0', status:'stopped', uiType: 'custom_gui' },
  { id:3, name:'Celery Worker', description:'Task queue phân tán.', icon:'🌿', version:'5.3.6', status:'stopped', uiType: 'cli' },
  { id:4, name:'Jupyter Notebook', description:'Data science.', icon:'📓', version:'7.0.6', status:'stopped', uiType: 'cli' },
  { id:5, name:'PyTest Runner', description:'Kiểm thử Python.', icon:'🧪', version:'7.4.3', status:'stopped', uiType: 'cli' },
  { id:6, name:'Black Formatter', description:'Format code tự động.', icon:'🎨', version:'23.12.1', status:'stopped', uiType: 'cli' },
];

const STAT_COLORS = {
  cyan:   { dark: { text:'text-cyan-400',    bg:'bg-cyan-500/[0.08]',    border:'border-cyan-400/20',    line:'via-cyan-400/50'    }, light: { text:'text-sky-500',     bg:'bg-sky-50',     border:'border-sky-300/50',  line:'via-sky-400/40'    } },
  green:  { dark: { text:'text-emerald-400', bg:'bg-emerald-500/[0.08]', border:'border-emerald-400/20', line:'via-emerald-400/50' }, light: { text:'text-emerald-500', bg:'bg-emerald-50', border:'border-emerald-200', line:'via-emerald-400/40' } },
  orange: { dark: { text:'text-orange-400',  bg:'bg-orange-500/[0.08]',  border:'border-orange-400/20',  line:'via-orange-400/50'  }, light: { text:'text-amber-500',   bg:'bg-amber-50',   border:'border-amber-200',   line:'via-amber-400/40'   } },
  purple: { dark: { text:'text-violet-400',  bg:'bg-violet-500/[0.08]',  border:'border-violet-400/20',  line:'via-violet-400/50'  }, light: { text:'text-violet-500',  bg:'bg-violet-50',  border:'border-violet-200',  line:'via-violet-400/40'  } },
};

function StatCard({ icon: Icon, label, value, color, delay = 0 }) {
  const { isDark } = useTheme();
  const c = (STAT_COLORS[color] || STAT_COLORS.cyan)[isDark ? 'dark' : 'light'];
  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay, ease: [0.22,1,.36,1] }}>
      <div className={`relative overflow-hidden rounded-xl px-5 py-4 transition-all duration-500 group hover:scale-[1.01] ${glassCard(isDark)}`}>
        <div className={`absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent ${c.line} to-transparent`} />
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${c.bg} ${c.border}`}><Icon className={`w-4 h-4 ${c.text}`} /></div>
          <div><p className={`text-[11px] font-medium tracking-wide uppercase ${textSecondary(isDark)}`}>{label}</p><p className={`text-xl font-bold tracking-tight ${textPrimary(isDark)}`}>{value}</p></div>
        </div>
      </div>
    </motion.div>
  );
}

// =====================================================================
// COMPONENT TOOL CARD GỐC (Chỉ chứa UI, không chứa logic kéo thả)
// =====================================================================
const ToolCardContent = React.forwardRef(({ tool, index, onClick, onToggle, isDownloading, isCustomizing, isDraggingOverlay = false }, ref) => {
  const { isDark } = useTheme();
  
  const [hovered, setHovered] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }
  
  const particles = useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      xStart: `${Math.random() * 30 + 75}%`,
      yStart: `${Math.random() * 30 - 5}%`,
      size: Math.random() * 2 + 0.5, 
      duration: Math.random() * 3 + 2, 
      delay: Math.random() * 2, 
      xMove: -(Math.random() * 80 + 20), 
      yMove: Math.random() * 80 + 40     
    }));
  }, []);

  const running = tool.status === 'running';
  const needsDownload = !tool.path || tool.localVersion !== tool.version;

  // Lớp CSS cho Shadow và Border
  let cardStyles = `relative group cursor-pointer rounded-2xl overflow-hidden transition-shadow duration-500 h-full w-full `;
  if (isDraggingOverlay) {
     // Hiệu ứng khi thẻ đang lơ lửng trên không
     cardStyles += isDark 
       ? 'bg-white/10 border-cyan-500/50 shadow-[0px_30px_60px_-15px_rgba(6,182,212,0.4)] scale-105' 
       : 'bg-white border-sky-400/50 shadow-[0px_30px_60px_-15px_rgba(14,165,233,0.3)] scale-105';
  } else {
     // Hiệu ứng bình thường
     cardStyles += isDark ? 'bg-white/5 border-white/10 shadow-lg' : 'bg-black/5 border-black/5 shadow-md';
     if (hovered && !isCustomizing) {
       cardStyles += isDark ? ' shadow-[0_16px_48px_rgba(0,0,0,0.5)]' : ' shadow-[0_16px_40px_rgba(0,0,0,0.1)]';
     }
  }

  return (
    <div 
      ref={ref}
      onMouseEnter={() => setHovered(true)} 
      onMouseLeave={() => setHovered(false)} 
      onMouseMove={handleMouseMove}
      onClick={!isCustomizing ? onClick : undefined}
      className={cardStyles}
    >
      {/* 1. SPOTLIGHT VIỀN THEO CHUỘT */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              250px circle at ${mouseX}px ${mouseY}px,
              ${isDark ? 'rgba(6, 182, 212, 0.6)' : 'rgba(14, 165, 233, 0.4)'},
              transparent 80%
            )
          `
        }}
      />

      {/* 2. LỚP KÍNH */}
      <div className={`absolute inset-[1.5px] rounded-[14.5px] transition-colors duration-500 backdrop-blur-2xl z-10 ${
        isDark 
          ? hovered ? 'bg-[#0a0f1c]/85' : 'bg-[#0a0f1c]/60' 
          : hovered ? 'bg-white/85' : 'bg-white/70'
      }`} />

      {/* 3. SPOTLIGHT NỀN MỜ */}
      <motion.div
        className="absolute inset-[1.5px] rounded-[14.5px] z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              400px circle at ${mouseX}px ${mouseY}px,
              ${isDark ? 'rgba(6, 182, 212, 0.15)' : 'rgba(14, 165, 233, 0.1)'},
              transparent 80%
            )
          `
        }}
      />

      {/* 4. KHU VỰC CHỨA ÁNH SÁNG & HẠT RƠI */}
      <div className="absolute inset-[1.5px] rounded-[14.5px] z-10 overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700">
        {(hovered || isDraggingOverlay) && (
          <>
            <motion.div 
              className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-[35px]"
              style={{ background: isDark ? 'radial-gradient(circle, rgba(6, 182, 212, 0.5) 0%, transparent 65%)' : 'radial-gradient(circle, rgba(14, 165, 233, 0.4) 0%, transparent 65%)' }}
              animate={{ scale: [0.9, 1.05, 0.9] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div 
              className="absolute -top-10 -right-10 w-40 h-[380px] rounded-[100%] blur-[25px] origin-top-right rotate-[35deg]"
              style={{ background: isDark ? 'radial-gradient(ellipse at top, rgba(6, 182, 212, 0.6) 0%, rgba(6, 182, 212, 0.1) 40%, transparent 70%)' : 'radial-gradient(ellipse at top, rgba(14, 165, 233, 0.5) 0%, rgba(14, 165, 233, 0.1) 40%, transparent 70%)' }}
              animate={{ scaleY: [0.9, 1.1, 0.9], rotate: [34, 36, 34] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
            {particles.map((p) => (
              <motion.div
                key={p.id}
                className={`absolute rounded-full ${isDark ? 'bg-cyan-100' : 'bg-sky-200'}`}
                style={{ left: p.xStart, top: p.yStart, width: p.size, height: p.size, boxShadow: `0 0 ${p.size * 3}px ${isDark ? 'rgba(103, 232, 249, 1)' : 'rgba(56, 189, 248, 1)'}` }}
                initial={{ opacity: 0, y: 0, x: 0, scale: 0 }}
                animate={{ y: p.yMove, x: p.xMove, opacity: [0, 1, 0.8, 0], scale: [0, 1, 0.6] }}
                transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeOut" }}
              />
            ))}
          </>
        )}
        <div className={`absolute top-0 left-0 right-0 h-[1px] ${running ? (isDark ? 'bg-emerald-400/50' : 'bg-emerald-500/50') : 'bg-gradient-to-r from-transparent via-white/20 to-transparent'}`} />
      </div>

      {/* LỚP OVERLAY CHỈNH SỬA BÊN TRÊN CÙNG (DÀNH CHO CHẾ ĐỘ CUSTOMIZE) */}
      {isCustomizing && (
        <div className="absolute inset-0 z-50 rounded-[16px] border-[1.5px] border-dashed border-cyan-500/50 pointer-events-none flex items-center justify-center bg-black/10 backdrop-blur-[2px]">
          <div className="bg-black/60 text-white w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md shadow-lg opacity-90 cursor-grab active:cursor-grabbing pointer-events-auto">
            <GripHorizontal className="w-5 h-5" />
          </div>
        </div>
      )}

      {/* NỘI DUNG CARD */}
      <div className={`relative z-20 p-5 flex flex-col h-full ${isCustomizing ? 'pointer-events-none opacity-50' : 'pointer-events-none'}`}>
        
        <div className="flex items-start justify-between mb-4 pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl border transition-colors duration-300 ${running ? (isDark ? 'bg-emerald-500/[0.08] border-emerald-400/20' : 'bg-emerald-50 border-emerald-200') : (hovered ? (isDark ? 'bg-white/10 border-white/20' : 'bg-slate-100 border-slate-300') : (isDark ? 'bg-white/[0.04] border-white/[0.07]' : 'bg-slate-50 border-slate-200'))}`}>
              {tool.icon}
            </div>
            
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase border ${running ? (isDark ? 'bg-emerald-500/[0.1] text-emerald-400 border-emerald-400/20' : 'bg-emerald-50 text-emerald-600 border-emerald-200') : (isDark ? 'bg-white/[0.04] text-white/30 border-white/[0.06]' : 'bg-slate-100 text-slate-400 border-slate-200')}`}>
              <span className="relative flex h-1.5 w-1.5">
                {running && <span className={`animate-ping absolute inset-0 rounded-full opacity-75 ${isDark ? 'bg-emerald-400' : 'bg-emerald-500'}`} />}
                <span className={`relative rounded-full h-1.5 w-1.5 ${running ? (isDark ? 'bg-emerald-400' : 'bg-emerald-500') : (isDark ? 'bg-white/30' : 'bg-slate-300')}`} />
              </span>
              {running ? 'Đang chạy' : 'Đã dừng'}
            </div>
          </div>
        </div>
        
        <div className="mb-4 pointer-events-auto">
          <h3 className={`text-[15px] font-semibold mb-1 transition-colors ${textPrimary(isDark)} ${hovered ? (isDark ? 'text-cyan-300' : 'text-sky-600') : ''}`}>{tool.name}</h3>
          <p className={`text-[12px] leading-relaxed line-clamp-2 ${textSecondary(isDark)}`}>{tool.description}</p>
        </div>
        
        <div className="mb-4 flex items-center gap-2 pointer-events-auto">
          <div className={`flex-1 px-3 py-2 rounded-lg text-[10px] font-mono truncate border transition-colors ${isDark ? (hovered ? 'bg-black/40 border-white/20 text-white/70' : 'bg-black/20 border-white/10 text-white/50') : (hovered ? 'bg-white border-black/10 text-slate-600' : 'bg-slate-100 border-black/5 text-slate-500')}`}>
            {tool.path ? `Đã cài đặt tại AppData` : 'Chưa cài đặt trên máy này'}
          </div>
        </div>

        <div className="flex items-center justify-between mt-auto pointer-events-auto">
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border flex gap-1 transition-colors ${needsDownload ? (isDark ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-amber-600 bg-amber-50 border-amber-200') : (isDark ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-emerald-600 bg-emerald-50 border-emerald-200')}`}>
            Mới nhất: v{tool.version}
          </span>
          
          <motion.button 
            whileHover={!isDownloading && !isCustomizing ? { scale: 1.04 } : {}} 
            whileTap={!isDownloading && !isCustomizing ? { scale: 0.96 } : {}} 
            disabled={isDownloading || isCustomizing}
            onClick={(e) => { e.stopPropagation(); onToggle(tool.id); }} 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold border transition-all duration-300 
              ${isCustomizing ? 'opacity-50 grayscale cursor-not-allowed' : ''}
              ${isDownloading ? (isDark ? 'bg-white/[0.05] text-white/40 border-white/10 cursor-not-allowed' : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed') 
              : needsDownload ? (isDark ? 'bg-gradient-to-b from-amber-500/20 to-amber-500/10 text-amber-400 border-amber-400/25 hover:border-amber-400/50' : 'bg-gradient-to-b from-amber-400 to-amber-500 text-white border-amber-500/20 shadow-sm hover:shadow-md')
              : running ? (isDark ? 'bg-white/[0.06] text-white/60 border-white/[0.08] hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-red-50 hover:border-red-300 hover:text-red-500') 
              : (isDark ? 'bg-gradient-to-b from-cyan-500/20 to-cyan-500/10 text-cyan-400 border-cyan-400/25 hover:border-cyan-400/50' : 'bg-gradient-to-b from-sky-500 to-sky-600 text-white border-sky-600/20 shadow-sm hover:shadow-md hover:from-sky-400 hover:to-sky-500')}`}
          >
            {isDownloading ? <><Loader2 className="w-3 h-3 animate-spin" /><span>Đang tải...</span></>
              : needsDownload ? <><Download className="w-3 h-3" /><span>Cập nhật</span></>
              : running ? <><Square className="w-3 h-3" /><span>Dừng</span></> 
              : <><Play className="w-3 h-3" /><span>Khởi chạy</span></>}
          </motion.button>
        </div>
      </div>
    </div>
  );
});

// =====================================================================
// COMPONENT WRAPPER CHO DND-KIT (Quản lý Transform mượt mà)
// =====================================================================
function SortableToolCardWrapper(props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.tool.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1, // Làm mờ vị trí cũ khi đang cầm thẻ
    zIndex: isDragging ? 0 : 1,
  };

  return (
    <motion.div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners} 
      // Rung nhè nhẹ chuẩn phong cách rung của iOS khi vào chế độ Customizing
      animate={props.isCustomizing && !isDragging ? { rotate: [-0.8, 0.8, -0.8] } : { rotate: 0 }}
      transition={{ repeat: Infinity, duration: 0.25 + (props.tool.id % 3) * 0.05, ease: "easeInOut" }}
      className="h-full"
    >
      <ToolCardContent {...props} />
    </motion.div>
  );
}


// =====================================================================
// DASHBOARD CHÍNH
// =====================================================================
export default function DashboardTab() {
  const { isDark } = useTheme();
  
  const [search, setSearch] = useState('');
  const [selectedToolId, setSelectedToolId] = useState(null);
  const [downloadingTools, setDownloadingTools] = useState({});
  const [tools, setTools] = useState([]);
  const [allLogs, setAllLogs] = useState({});
  const [todayTasks, setTodayTasks] = useState([]); 
  const userName = "nguyen";

  // --- TRẠNG THÁI CHO KÉO THẢ ---
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [toolOrder, setToolOrder] = useState([]); 
  const [activeDragItem, setActiveDragItem] = useState(null); // Lưu item đang cầm trên tay

  // Cấu hình Cảm biến kéo (Chỉ kích hoạt khi kéo quá 5 pixel để tránh lỗi click nhầm)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (tools.length > 0) {
      const savedOrder = JSON.parse(localStorage.getItem('user_dashboard_order') || '[]');
      if (savedOrder.length > 0) {
        // Lọc những id không còn tồn tại
        const validSavedOrder = savedOrder.filter(id => tools.some(t => t.id === id));
        // Thêm những id mới chưa có trong mảng lưu
        const newIds = tools.map(t => t.id).filter(id => !validSavedOrder.includes(id));
        setToolOrder([...validSavedOrder, ...newIds]);
      } else {
        setToolOrder(tools.map(t => t.id));
      }
    }
  }, [tools]);

  useEffect(() => {
    const unlisten = listen('python-log', (event) => {
      const { task_id, message } = event.payload;
      setAllLogs(prev => ({ ...prev, [task_id]: (prev[task_id] || '') + message }));
    });
    return () => { unlisten.then(f => f()); };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: tasksData } = await supabase.from('tasks').select('*').eq('user_id', userName).eq('done', false).order('created_at', { ascending: false }).limit(3);
        if (tasksData) setTodayTasks(tasksData);

        const { data: registryData, error: regError } = await supabase.from('tools_registry').select('*');
        if (regError) console.error("Lỗi tải tools registry:", regError);
        
        if (registryData) {
          const savedLocal = JSON.parse(localStorage.getItem('parame_local_tools') || '{}');
          const mergedTools = registryData.map(dbTool => {
            const localData = savedLocal[dbTool.id] || {};
            return {
              ...dbTool,
              localVersion: localData.version || null, 
              path: localData.path || null,           
              status: 'stopped',
              currentTaskId: null
            };
          });
          setTools(mergedTools);
        }
      } catch (err) {
        console.error("Lỗi kết nối:", err);
      }
    };
    fetchData();
  }, [userName]);

  const toggleTool = async (toolId, customParams = null) => {
    const tool = tools.find(t => t.id === toolId);
    if (!tool || downloadingTools[toolId]) return;

    // A. Nếu đang chạy -> Dừng
    if (tool.status === 'running') {
      setAllLogs(logs => ({ ...logs, [tool.currentTaskId]: (logs[tool.currentTaskId] || '') + '\n[System] Đã gửi lệnh dừng.\n' }));
      // Chú ý: Cần có hàm Rust để thực sự kill process nếu bạn chưa viết
      setTools(prev => prev.map(t => t.id === toolId ? { ...t, status: 'stopped' } : t));
      return;
    }

    // B. Kiểm tra xem có cần tải bản mới không
    let currentPath = tool.path;
    const needsDownload = !currentPath || tool.localVersion !== tool.version;

    if (needsDownload) {
      setDownloadingTools(prev => ({ ...prev, [toolId]: true }));
      try {
        // GỌI RUST ĐỂ TẢI FILE!
        const downloadedPath = await invoke('download_tool', { 
          toolId: tool.id, 
          downloadUrl: tool.download_url 
        });

        currentPath = downloadedPath;

        // Tải xong: Lưu vào localStorage và Cập nhật State
        const updatedLocalTools = JSON.parse(localStorage.getItem('parame_local_tools') || '{}');
        updatedLocalTools[tool.id] = { path: currentPath, version: tool.version };
        localStorage.setItem('parame_local_tools', JSON.stringify(updatedLocalTools));

        setTools(prev => prev.map(t => t.id === toolId ? { ...t, path: currentPath, localVersion: tool.version } : t));
        
        // Tắt trạng thái loading
        setDownloadingTools(prev => ({ ...prev, [toolId]: false }));

        // THÊM THÔNG BÁO VÀ DỪNG LẠI (KHÔNG CHẠY TOOL)
        alert(`✅ Đã cập nhật ${tool.name} lên phiên bản v${tool.version} thành công!`);
        return; 

      } catch (error) {
        alert("Lỗi tải công cụ: " + error);
        setDownloadingTools(prev => ({ ...prev, [toolId]: false }));
        return; // Dừng lại nếu tải lỗi
      }
    }

    // C. Khởi chạy file exe (Khi đã chắc chắn có path mới nhất)
    const taskId = `${tool.id}-${Date.now()}`;
    setAllLogs(logs => ({ ...logs, [taskId]: `Khởi chạy ${tool.name} (v${tool.version})...\n` }));
    
    // Đã là file tải về từ hệ thống của bạn thì chắc chắn là exe
    if (customParams) {
      const args = ["--config", JSON.stringify(customParams)];
      invoke('run_executable_with_args', { exePath: currentPath, taskId, args }).catch(err => alert("Lỗi: " + err));
    } else {
      invoke('run_executable', { exePath: currentPath, taskId }).catch(err => alert("Lỗi: " + err));
    }

    setTools(prev => prev.map(t => t.id === toolId ? { ...t, status: 'running', currentTaskId: taskId } : t));
  };

  // --- HÀM XỬ LÝ LỖI KHI BẮT ĐẦU VÀ KẾT THÚC KÉO THẢ ---
  const handleDragStart = (event) => {
    const { active } = event;
    const item = tools.find(t => t.id === active.id);
    setActiveDragItem(item);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveDragItem(null); // Bỏ thẻ xuống

    if (over && active.id !== over.id) {
      setToolOrder((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('user_dashboard_order', JSON.stringify(newOrder));
        return newOrder;
      });
    }
  };

  const orderedAndFilteredTools = useMemo(() => {
    let ordered = [...tools].sort((a, b) => {
      if (toolOrder.length === 0) return 0;
      return toolOrder.indexOf(a.id) - toolOrder.indexOf(b.id);
    });
    return ordered.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
  }, [tools, search, toolOrder]);
  
  const activeTool = tools.find(t => t.id === selectedToolId);
  const runningCount = tools.filter(t => t.status === 'running').length;
  const daysOfWeek = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const today = daysOfWeek[new Date().getDay()];

  // Render detail screen ...
  if (activeTool) {
    if (activeTool.uiType === 'cli') {
      return (
        <SharedDetailScreen 
          tool={activeTool} logs={allLogs} 
          onBack={() => setSelectedToolId(null)} onToggle={toggleTool} 
          onClearLogs={(taskId) => setAllLogs(prev => ({ ...prev, [taskId]: '' }))} 
          onSelectPath={handleSelectPath} 
        />
      );
    }
    if (activeTool.uiType === 'custom_gui') {
      return (
        <SeleniumCustomScreen 
          tool={activeTool} logs={allLogs} 
          onBack={() => setSelectedToolId(null)} onToggle={toggleTool} 
          onClearLogs={(taskId) => setAllLogs(prev => ({ ...prev, [taskId]: '' }))} 
        />
      );
    }
    if (activeTool.uiType === 'kiwami_gui') {
      return (
        <KiwamiCustomScreen 
          tool={activeTool} 
          logs={allLogs} 
          onBack={() => setSelectedToolId(null)} 
          onToggle={toggleTool} 
          onClearLogs={(taskId) => setAllLogs(prev => ({ ...prev, [taskId]: '' }))} 
        />
      );
    }
    if (activeTool.uiType === 'tw_gui') {
      return (
        <TWCustomScreen 
          tool={activeTool} 
          logs={allLogs} 
          onBack={() => setSelectedToolId(null)} 
          onToggle={toggleTool} 
          onClearLogs={(taskId) => setAllLogs(prev => ({ ...prev, [taskId]: '' }))} 
        />
      );
    }
    if (activeTool.uiType === 'consulting_gui') {
      return (
        <ConsultingCustomScreen 
          tool={activeTool} 
          logs={allLogs} 
          onBack={() => setSelectedToolId(null)} 
          onToggle={toggleTool} 
          onClearLogs={(taskId) => setAllLogs(prev => ({ ...prev, [taskId]: '' }))} 
        />
      );
    }
    if (activeTool.uiType === 'x_gui') {
      return (
        <XCustomScreen 
          tool={activeTool} 
          logs={allLogs} 
          onBack={() => setSelectedToolId(null)} 
          onToggle={toggleTool} 
          onClearLogs={(taskId) => setAllLogs(prev => ({ ...prev, [taskId]: '' }))} 
        />
      );
    }
    if (activeTool.uiType === 'himozuke_gui') {
      return (
        <HimozukeCustomScreen 
          tool={activeTool} 
          logs={allLogs} 
          onBack={() => setSelectedToolId(null)} 
          onToggle={toggleTool} 
          onClearLogs={(taskId) => setAllLogs(prev => ({ ...prev, [taskId]: '' }))} 
        />
      );
    }
    if (activeTool.uiType === 'parame_gui') {
      return (
        <ParameCustomScreen 
          tool={activeTool} logs={allLogs} 
          onBack={() => setSelectedToolId(null)} onToggle={toggleTool} 
          onClearLogs={(taskId) => setAllLogs(prev => ({ ...prev, [taskId]: '' }))} 
        />
      );
    }
    if (activeTool.uiType === 'x_suite') {
      return (
        <XSuiteCustomScreen 
          allTools={tools} // Truyền toàn bộ tools để tool con lấy ID
          logs={allLogs} 
          onBack={() => setSelectedToolId(null)} 
          onToggle={toggleTool} 
          onClearLogs={(taskId) => setAllLogs(prev => ({ ...prev, [taskId]: '' }))} 
        />
      );
    }
  }

  return (
    <div className="flex flex-col h-full gap-4 overflow-hidden">
      
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap');`}
      </style>

      {/* HEADER LỜI CHÀO */}
      <div className="shrink-0 pt-2 px-2">
        <h1 className="text-4xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 pb-1" style={{ fontFamily: "'Dancing Script', cursive", fontWeight: 700 }}>
          Chào {userName}, {today} vui vẻ! 👋
        </h1>
        <p className={`text-sm mt-1 ${textSecondary(isDark)}`}>Chúc bạn một ngày làm việc năng suất. Tự động - Đơn giản</p>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-5 pb-4 custom-scrollbar">
        
        {/* WIDGET "CÁC VIỆC CẦN LÀM" LẤY DATA SUPABASE */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className={`relative overflow-hidden rounded-2xl p-6 flex flex-col xl:flex-row items-start xl:items-center justify-between shadow-lg gap-6 ${glassCard(isDark, 'border-l-4 border-l-cyan-500')}`}
        >
          <div className="relative z-10 flex-1 w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-400" />
                <span className={`text-xs font-bold uppercase tracking-widest ${textSecondary(isDark)}`}>Task & Calendar</span>
              </div>
              <span className="text-[11px] font-semibold text-cyan-600 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                {todayTasks.length} việc chờ xử lý
              </span>
            </div>
            
            <h3 className={`text-lg font-bold mb-4 ${textPrimary(isDark)}`}>Các việc cần làm trong hôm nay</h3>
            
            <div className="space-y-3 w-full max-w-xl">
              {todayTasks.length > 0 ? (
                // Lặp qua mảng trả về từ Supabase
                todayTasks.map((task) => (
                  <div key={task.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-all hover:bg-black/5 ${isDark ? 'border-white/5 bg-white/[0.02]' : 'border-black/5 bg-white/50'}`}>
                    <CheckCircle2 className="w-5 h-5 text-slate-400 mt-0.5 shrink-0 cursor-pointer hover:text-emerald-500 transition-colors" />
                    <div className="flex-1">
                      {/* Dùng task.text cho tiêu đề và task.date cho thời gian */}
                      <p className={`text-sm font-semibold ${textPrimary(isDark)} line-clamp-1`}>{task.text}</p>
                      <p className={`text-[11px] mt-1 flex items-center gap-1.5 ${textMuted(isDark)}`}><Clock className="w-3 h-3" /> {task.date || 'Chưa đặt hạn chót'}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className={`p-4 text-center rounded-xl border border-dashed ${isDark ? 'border-white/10 text-white/40' : 'border-black/10 text-slate-400'}`}>
                  <p className="text-sm">Hôm nay không có việc nào cần làm. Bạn có thể nghỉ ngơi! 🎉</p>
                </div>
              )}
            </div>
          </div>

          <div className="relative z-10 shrink-0 self-stretch flex flex-col justify-center border-t xl:border-t-0 xl:border-l border-white/10 pt-5 xl:pt-0 xl:pl-8 w-full xl:w-auto">
            <button className={`w-full xl:w-auto px-8 py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:scale-105 active:scale-95 ${isDark ? 'bg-cyan-500 text-white shadow-cyan-500/20' : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'}`}>
              <ListTodo className="w-4 h-4" /> Quản lý Calendar
            </button>
          </div>
          
          <div className="absolute right-0 top-0 w-[400px] h-[400px] bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        </motion.div>

        {/* KHUNG THỐNG KÊ VÀ SEARCH */}
        <div className={`rounded-2xl p-5 ${glassPanel(isDark)} mb-4`}>
           <div className="flex flex-col md:flex-row md:items-center justify-between mb-5 gap-4">
              
              <div className="flex items-center gap-3">
                <h2 className={`text-lg font-bold ${textPrimary(isDark)}`}>Danh sách Công cụ</h2>
                <button 
                  onClick={() => setIsCustomizing(!isCustomizing)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isCustomizing 
                      ? (isDark ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-600 border border-emerald-300')
                      : (isDark ? 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white' : 'bg-black/5 text-slate-500 hover:bg-black/10 hover:text-slate-700')
                  }`}
                >
                  {isCustomizing ? <><CheckCircle2 className="w-4 h-4" /> Hoàn tất sắp xếp</> : <><GripHorizontal className="w-4 h-4" /> Sắp xếp</>}
                </button>
              </div>

              <div className="relative group max-w-xs w-full">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted(isDark)}`} />
                <input 
                  value={search} onChange={e=>setSearch(e.target.value)} 
                  placeholder="Tìm công cụ..." 
                  className={`w-full h-10 pl-9 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all ${isDark ? 'bg-white/[0.04] border-white/10 text-white' : 'bg-white border-black/10 text-slate-800'}`} 
                />
              </div>
           </div>
           
           <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon={Package} label="Tổng số App" value={tools.length} color="cyan" />
              <StatCard icon={Activity} label="Đang chạy" value={runningCount} color="green" />
              <StatCard icon={CircleOff} label="Đã dừng" value={tools.length - runningCount} color="orange" />
              <StatCard icon={Zap} label="Hiệu suất" value="Tối ưu" color="purple" />
           </div>
        </div>

        {/* LƯỚI CARD ỨNG DỤNG - SỬ DỤNG DND-KIT CHO ĐỘ MƯỢT TUYỆT ĐỐI */}
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={toolOrder} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-10">
              {orderedAndFilteredTools.map((tool) => (
                <SortableToolCardWrapper 
                  key={tool.id} 
                  tool={tool} 
                  isDownloading={downloadingTools[tool.id]}
                  onClick={() => setSelectedToolId(tool.id)} 
                  onToggle={toggleTool}
                  isCustomizing={isCustomizing}
                />
              ))}
            </div>
          </SortableContext>

          {/* DRAG OVERLAY: Thành phần lơ lửng bám theo con trỏ chuột khi đang kéo */}
          <DragOverlay>
            {activeDragItem ? (
              <ToolCardContent 
                tool={activeDragItem}
                isCustomizing={isCustomizing}
                isDraggingOverlay={true}
              />
            ) : null}
          </DragOverlay>

        </DndContext>

      </div>
    </div>
  );
}