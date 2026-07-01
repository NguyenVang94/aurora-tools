// @ts-nocheck
import CommandPalette from './CommandPalette';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import kiwamiLogoSmall from '../assets/image_c4d8bb.png';
import XSuiteCustomScreen from './XSuiteCustomScreen';
import ParameCustomScreen from './ParameCustomScreen';
import HimozukeCustomScreen from './HimozukeCustomScreen';
import XCustomScreen from './XCustomScreen';
import ConsultingCustomScreen from './ConsultingCustomScreen';
import TWCustomScreen from './TWCustomScreen';
import KiwamiCustomScreen from './KiwamiCustomScreen';
import XUploadCustomScreen from './XUploadCustomScreen';
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
  Settings2, GripHorizontal, Save, X, Cloud, CloudRain, CloudLightning, Sun, CloudFog, Droplets, Wind, ThermometerSun, MapPin, RefreshCw
} from 'lucide-react';


import { useTheme, glassPanel, glassCard, textPrimary, textSecondary, textMuted } from '../utils';

import { SharedDetailScreen } from './SharedDetailScreen';
import SeleniumCustomScreen from './SeleniumCustomScreen';
import { supabase } from '../supabase';


// 1. Hiệu ứng Mưa rơi (Rõ nét hơn, có độ mờ dần khi rơi)
const RainEffect = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-70">
    {Array.from({ length: 30 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute bg-sky-300/60 w-[2px] h-6 rounded-full"
        style={{ left: `${Math.random() * 100}%`, top: '-10%' }}
        animate={{ y: ['0vh', '120px'], opacity: [0, 1, 0] }}
        transition={{ duration: 0.6 + Math.random() * 0.4, repeat: Infinity, ease: "linear", delay: Math.random() }}
      />
    ))}
  </div>
);

// 2. Hiệu ứng Mây trôi (Mây trôi ngang màn hình liên tục)
const CloudEffect = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-20">
    {[1, 2, 3].map((i) => (
      <motion.div
        key={i}
        className="absolute text-white"
        style={{ top: `${i * 15}%`, left: '-20%' }}
        animate={{ x: ['0vw', '100vw'] }}
        transition={{ duration: 25 + i * 15, repeat: Infinity, ease: "linear", delay: i * 3 }}
      >
        <Cloud className="w-24 h-24" />
      </motion.div>
    ))}
  </div>
);

// 3. Hiệu ứng Nắng tỏa (Quầng sáng vàng góc phải)
const SunEffect = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
    <motion.div 
      className="absolute -top-20 -right-10 w-64 h-64 bg-amber-400/20 rounded-full blur-[60px]"
      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    />
  </div>
);

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
const ToolCardContent = React.forwardRef(({ tool, index, onClick, onToggle, isDownloading, downloadProgress = 0, isCustomizing, isDraggingOverlay = false, dragListeners, dragAttributes, setActivatorNodeRef }, ref) => {
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
    <div ref={ref} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onMouseMove={handleMouseMove} onClick={!isCustomizing ? onClick : undefined} className={cardStyles}>
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
        <div className="absolute inset-0 z-50 rounded-[16px] border-[1.5px] border-dashed border-cyan-500/50 flex items-center justify-center bg-black/10 backdrop-blur-[2px]">
          <div 
            ref={setActivatorNodeRef} 
            {...dragAttributes}
            {...dragListeners}
            style={{ touchAction: 'none' }} 
            className="bg-black/60 text-white w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md shadow-lg opacity-90 cursor-grab active:cursor-grabbing"
          >
            <GripHorizontal className="w-6 h-6 pointer-events-none" />
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
            {isDownloading ? <><Loader2 className="w-3 h-3 animate-spin" /><span>Đang tải... {downloadProgress}%</span></>
              : needsDownload ? <><Download className="w-3 h-3" /><span>Cập nhật</span></>
              : running ? <><Square className="w-3 h-3" /><span>Dừng</span></>
              : <><Play className="w-3 h-3" /><span>Khởi chạy</span></>}
          </motion.button>
        </div>

        {isDownloading && (
          <div className={`mt-2 h-1.5 w-full rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
            <div
              className={`h-full rounded-full transition-all duration-300 ${isDark ? 'bg-cyan-400' : 'bg-sky-500'}`}
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
});

// =====================================================================
// COMPONENT WRAPPER CHO DND-KIT (Quản lý Transform mượt mà)
// =====================================================================
function SortableToolCardWrapper(props) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: props.tool.id });

  const style = {
    // Dùng Translate thay vì Transform để card không bị méo khi kéo
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 99 : 1, 
    position: 'relative'
  };

  return (
    // Xóa motion.div và hiệu ứng rung lắc ở đây
    <div ref={setNodeRef} style={style} className="h-full">
      <ToolCardContent 
        {...props} 
        dragListeners={listeners} 
        dragAttributes={attributes} 
        setActivatorNodeRef={setActivatorNodeRef}
      />
    </div>
  );
}

// =====================================================================
// DASHBOARD CHÍNH
// =====================================================================
export default function DashboardTab() {
  const { isDark } = useTheme();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isMinimalMode, setIsMinimalMode] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedToolId, setSelectedToolId] = useState(null);
  const [downloadingTools, setDownloadingTools] = useState({});
  const [toolDownloadProgress, setToolDownloadProgress] = useState({});
  const [tools, setTools] = useState([]);
  const [allLogs, setAllLogs] = useState({});
  const [todayTasks, setTodayTasks] = useState([]); 
  const userName = "nguyen";

  // --- TRẠNG THÁI CHO KÉO THẢ ---
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [toolOrder, setToolOrder] = useState([]); 
  const [activeDragItem, setActiveDragItem] = useState(null); // Lưu item đang cầm trên tay

  // STATE LƯU DỮ LIỆU THỜI TIẾT
  const [weather, setWeather] = useState(null);
  // Thay thế forecast17h bằng mảng dự báo theo giờ
  const [hourlyForecast, setHourlyForecast] = useState([]);
  const [weatherError, setWeatherError] = useState(false);
  const [weatherRetryKey, setWeatherRetryKey] = useState(0);

  useEffect(() => {
    const fetchWeather = async () => {
      setWeatherError(false);
      try {
        const lat = 10.7828; // Hồ Con Rùa, Quận 3
        const lon = 106.6959;
        
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FBangkok`);
        const data = await res.json();
        setWeather(data);

        // LOGIC LẤY 12 GIỜ TIẾP THEO (Chuẩn phong cách iOS)
        const currentTime = new Date().getTime();
        
        // Tìm mốc thời gian gần nhất với hiện tại
        const currentIndex = data.hourly.time.findIndex(timeStr => {
          return new Date(timeStr).getTime() >= currentTime - 3600000;
        });
        
        const startIdx = currentIndex !== -1 ? currentIndex : 0;
        const nextHours = [];
        
        // 👇 CHỈ CẦN SỬA SỐ 6 THÀNH SỐ 12 Ở DÒNG DƯỚI ĐÂY 👇
        for(let i = 0; i < 12; i++) { 
           const idx = startIdx + i;
           if(idx < data.hourly.time.length) {
              nextHours.push({
                 // Ô đầu tiên để chữ "Bây giờ", các ô sau lấy giờ (VD: "14:00")
                 time: i === 0 ? 'Bây giờ' : data.hourly.time[idx].substring(11, 16), 
                 temp: Math.round(data.hourly.temperature_2m[idx]),
                 code: data.hourly.weather_code[idx]
              });
           }
        }
        setHourlyForecast(nextHours);

      } catch (error) {
        console.error("Lỗi tải thời tiết", error);
        setWeatherError(true);
      }
    };
    fetchWeather();
    // Tự động làm mới thời tiết mỗi 10 phút - rút ngắn từ 30 phút vì mưa rào ở
    // TP.HCM có thể đến/tan rất nhanh, 30 phút khiến dữ liệu hiển thị bị trễ.
    const intervalId = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [weatherRetryKey]);

  // HÀM CHUYỂN ĐỔI MÃ THỜI TIẾT SANG ICON & TIẾNG VIỆT
  const getWeatherDetails = (code) => {
    if (code === 0) return { label: 'Trời quang đãng', icon: Sun, color: 'text-amber-400' };
    if ([1, 2, 3].includes(code)) return { label: 'Nhiều mây', icon: Cloud, color: 'text-sky-400' };
    if ([45, 48].includes(code)) return { label: 'Sương mù', icon: CloudFog, color: 'text-slate-400' };
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return { label: 'Có mưa', icon: CloudRain, color: 'text-blue-400' };
    if ([95, 96, 99].includes(code)) return { label: 'Mưa dông', icon: CloudLightning, color: 'text-indigo-400' };
    return { label: 'Có mây', icon: Cloud, color: 'text-sky-400' };
  };

  // Cấu hình Cảm biến kéo (Chỉ kích hoạt khi kéo quá 5 pixel để tránh lỗi click nhầm)
  const sensors = useSensors(
    useSensor(PointerSensor),
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
    const unlisten = listen('tool-download-progress', (event) => {
      const { tool_id, percentage } = event.payload;
      setToolDownloadProgress(prev => ({ ...prev, [tool_id]: percentage }));
    });
    return () => { unlisten.then(f => f()); };
  }, []);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const { data: tasksData } = await supabase.from('tasks').select('*').eq('user_id', userName).eq('done', false).order('created_at', { ascending: false }).limit(3);
        if (tasksData) setTodayTasks(tasksData);
      } catch (err) {
        console.error("Lỗi kết nối:", err);
      }
    };
    fetchTasks();
  }, [userName]);

  useEffect(() => {
    // 🔥 Tách riêng fetch tools_registry + poll định kỳ, để badge "Cập nhật" tự hiện
    // khi bump version trên Supabase mà không cần tắt hẳn app rồi mở lại.
    const fetchToolsRegistry = async () => {
      try {
        const { data: registryData, error: regError } = await supabase.from('tools_registry').select('*');
        if (regError) { console.error("Lỗi tải tools registry:", regError); return; }

        if (registryData) {
          const savedLocal = JSON.parse(localStorage.getItem('parame_local_tools') || '{}');
          setTools(prev => {
            const prevById = new Map(prev.map(t => [t.id, t]));
            return registryData.map(dbTool => {
              const localData = savedLocal[dbTool.id] || {};
              const existing = prevById.get(dbTool.id);
              return {
                ...dbTool,
                localVersion: localData.version || null,
                path: localData.path || null,
                // Giữ nguyên trạng thái đang chạy nếu có, tránh poll đè mất status khi tool đang chạy
                status: existing?.status || 'stopped',
                currentTaskId: existing?.currentTaskId || null
              };
            });
          });
        }
      } catch (err) {
        console.error("Lỗi kết nối:", err);
      }
    };
    fetchToolsRegistry();
    const intervalId = setInterval(fetchToolsRegistry, 2 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [userName]);

  const toggleTool = async (toolId, customParams = null) => {
    const showDesktopNotification = async (title, body) => {
      // BƯỚC THÊM: Đọc cài đặt xem user có cho phép thông báo không
      const isNotificationEnabled = localStorage.getItem('aurora_notifications') !== 'false';
      
      // Nếu user tắt trong Settings, thì return luôn không làm gì cả
      if (!isNotificationEnabled) return;

      try {
        let permissionGranted = await isPermissionGranted();
        // Nếu chưa có quyền, yêu cầu Hệ điều hành cấp quyền
        if (!permissionGranted) {
          const permission = await requestPermission();
          permissionGranted = permission === 'granted';
        }
        // Nếu đã có quyền -> Bắn thông báo
        if (permissionGranted) {
          await sendNotification({ title, body });
        }
      } catch (err) {
        console.error("Lỗi khi gửi thông báo:", err);
      }
    };

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
      setToolDownloadProgress(prev => ({ ...prev, [toolId]: 0 }));
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
    
    // Đổi trạng thái thẻ thành "Đang chạy"
    setTools(prev => prev.map(t => t.id === toolId ? { ...t, status: 'running', currentTaskId: taskId } : t));

    // Dùng try...catch...finally để quản lý trọn vẹn vòng đời của tiến trình
    try {
      if (customParams) {
        const args = ["--config", JSON.stringify(customParams)];
        await invoke('run_executable_with_args', { exePath: currentPath, taskId, args });
      } else {
        await invoke('run_executable', { exePath: currentPath, taskId });
      }
      
      // ✅ NẾU CHẠY ĐẾN ĐÂY: TOOL ĐÃ CHẠY XONG THÀNH CÔNG
      showDesktopNotification("Aurora Automation", `✅ Hoàn tất! ${tool.name} đã xử lý xong công việc.`);
      
    } catch (err) {
      // ❌ NẾU CÓ LỖI XẢY RA TRONG QUÁ TRÌNH CHẠY
      showDesktopNotification("Aurora Cảnh Báo", `❌ ${tool.name} gặp lỗi: ${err}`);
      alert("Lỗi tiến trình: " + err);
    } finally {
      // 🔄 TỰ ĐỘNG RESET TRẠNG THÁI: Dù thành công hay thất bại, thẻ tự trả về "Đã dừng"
      setTools(prev => prev.map(t => t.id === toolId ? { ...t, status: 'stopped' } : t));
    }

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
    if (activeTool.uiType === 'x_upload_gui') {
      return (
        <XUploadCustomScreen
          tool={activeTool}
          logs={allLogs}
          onBack={() => setSelectedToolId(null)}
          onToggle={toggleTool}
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
    <div className="flex flex-col h-full overflow-hidden relative">

      {/* 1. CHỈ GỌI COMMAND PALETTE ĐÚNG 1 LẦN Ở ĐÂY */}
      <CommandPalette 
        tools={tools} 
        isOpen={isCommandPaletteOpen} 
        setIsOpen={setIsCommandPaletteOpen} 
        isMinimalMode={isMinimalMode}
        setIsMinimalMode={setIsMinimalMode}
        onRunTool={(toolId) => toggleTool(toolId)} 
      />
      
      {/* 2. BỌC DASHBOARD ĐỂ ẨN ĐI KHI Ở CHẾ ĐỘ MINIMAL */}
      <div 
        className={`flex flex-col h-full gap-4 transition-all duration-500 ease-in-out ${
          isCommandPaletteOpen && isMinimalMode ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
        }`}
      >
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
        
        {/* WIDGET THỜI TIẾT DYNAMIC - KIỂU DÁNG IOS */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
          className={`relative overflow-hidden rounded-[24px] p-6 flex flex-col xl:flex-row shadow-xl gap-6 min-h-[160px] ${glassCard(isDark, 'border-l-4 border-l-sky-500')}`}
        >
          {/* LỚP HIỆU ỨNG (Z-Index 0 để nằm dưới chữ) */}
          {weather && (
            <>
              {[51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(weather.current.weather_code) && <RainEffect />}
              {[1, 2, 3, 45, 48].includes(weather.current.weather_code) && <CloudEffect />}
              {weather.current.weather_code === 0 && <SunEffect />}
            </>
          )}

          {weather ? (
            <>
              {/* CỘT TRÁI: THÔNG TIN HIỆN TẠI */}
              <div className="relative z-10 flex flex-col justify-center xl:w-[40%] xl:border-r border-white/10 xl:pr-6">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className={`w-4 h-4 ${isDark ? 'text-sky-400' : 'text-sky-500'}`} />
                  <span className={`text-[12px] font-bold uppercase tracking-[0.1em] ${textPrimary(isDark)}`}>Hồ Con Rùa, Quận 3</span>
                  <button
                    onClick={() => setWeatherRetryKey(k => k + 1)}
                    title="Làm mới thời tiết"
                    className={`p-1 rounded-md transition-colors ${isDark ? 'hover:bg-white/10 text-white/40 hover:text-sky-400' : 'hover:bg-black/5 text-slate-400 hover:text-sky-500'}`}
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
                
                <div className="flex items-center gap-4">
                  <h2 className={`text-6xl font-black tracking-tighter ${textPrimary(isDark)}`}>
                    {Math.round(weather.current.temperature_2m)}°
                  </h2>
                  <div className="flex flex-col">
                    <span className={`text-sm font-bold ${getWeatherDetails(weather.current.weather_code).color}`}>
                      {getWeatherDetails(weather.current.weather_code).label}
                    </span>
                    <span className={`text-[11px] font-medium mt-1 opacity-60 ${textPrimary(isDark)}`}>
                      C: {Math.round(weather.daily.temperature_2m_max[0])}° - T: {Math.round(weather.daily.temperature_2m_min[0])}°
                    </span>
                  </div>
                </div>
              </div>

              {/* CỘT PHẢI: DỰ BÁO THEO GIỜ (CUỘN NGANG GIỐNG IOS) */}
              <div className="relative z-10 flex-1 flex flex-col justify-center overflow-hidden">
                <div className="flex items-center justify-between gap-6 overflow-x-auto custom-scrollbar pb-2 pt-1 px-1">
                  {hourlyForecast.map((hour, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2.5 min-w-[50px]">
                      <span className={`text-[12px] font-medium ${idx === 0 ? 'font-bold text-sky-500' : textSecondary(isDark)}`}>
                        {hour.time}
                      </span>
                      
                      <div className="w-8 h-8 flex items-center justify-center">
                        {React.createElement(getWeatherDetails(hour.code).icon, { 
                          className: `w-6 h-6 ${getWeatherDetails(hour.code).color}` 
                        })}
                      </div>
                      
                      <span className={`text-[15px] font-bold ${textPrimary(isDark)}`}>
                        {hour.temp}°
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : weatherError ? (
            <div className="w-full flex items-center justify-center gap-3">
              <span className={`text-sm font-medium ${textMuted(isDark)}`}>Không tải được thời tiết. Kiểm tra kết nối mạng.</span>
              <button
                onClick={() => setWeatherRetryKey(k => k + 1)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white/70' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'}`}
              >
                Thử lại
              </button>
            </div>
          ) : (
            <div className="w-full flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-sky-500" />
              <span className={`text-sm font-medium ${textMuted(isDark)}`}>Đang cập nhật thời tiết...</span>
            </div>
          )}
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

              <div className="relative group max-w-xs w-full flex items-center">
                <Search className={`absolute left-3 w-4 h-4 ${textMuted(isDark)}`} />
                <input 
                  value={search} onChange={e=>setSearch(e.target.value)} 
                  placeholder="Tìm công cụ..." 
                  className={`w-full h-10 pl-9 pr-14 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all ${isDark ? 'bg-white/[0.04] border-white/10 text-white' : 'bg-white border-black/10 text-slate-800'}`} 
                />
                {/* GỢI Ý PHÍM TẮT ĐẶT ĐÈ LÊN TRONG Ô INPUT */}
                <div className={`absolute right-2 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${isDark ? 'bg-white/10 border-white/20 text-white/50' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                  Ctrl+K
                </div>
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
                  downloadProgress={toolDownloadProgress[tool.id] || 0}
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
    </div>
  );
}