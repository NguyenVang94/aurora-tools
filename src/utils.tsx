import React, { createContext, useContext, useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence, Transition } from 'framer-motion';

/* ─────────────────────────────────────────
   1. THEME CONTEXT
───────────────────────────────────────── */
const ThemeCtx = createContext<any>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // 1. Khởi tạo state: Ưu tiên lấy từ localStorage, nếu chưa có thì mặc định là true (Dark Mode)
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem('app-theme');
    if (savedTheme) {
      return savedTheme === 'light';
    }
    return false; // Mặc định là light mode
  });

  useEffect(() => {
    // 2. Cập nhật class 'dark' vào thẻ html
    document.documentElement.classList.toggle('dark', isDark);
    
    // 3. Lưu lựa chọn vào localStorage mỗi khi isDark thay đổi
    localStorage.setItem('app-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <ThemeCtx.Provider value={{ isDark, toggle: () => setIsDark(p => !p) }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);

/* ─────────────────────────────────────────
   2. GLASS & COLOR HELPERS
───────────────────────────────────────── */
/* ─────────────────────────────────────────
   2. GLASS & COLOR HELPERS
───────────────────────────────────────── */
export function glassCard(isDark: boolean, extra = '') {
  return isDark
    // Dark mode: Viền sáng mờ, shadow ngoài và inset shadow (viền hắt sáng bên trong)
    ? `bg-[#0a0f1c]/40 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] ${extra}`
    // Light mode: Nền trắng mờ, viền xám siêu nhạt, bóng đổ mềm và inset hắt sáng
    : `bg-white/50 backdrop-blur-2xl border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,1)] ${extra}`;
}

export function glassPanel(isDark: boolean, extra = '') {
  return isDark
    ? `bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${extra}`
    : `bg-white/40 backdrop-blur-xl border border-white/60 shadow-[0_4px_24px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,0.8)] ${extra}`;
}

export function textPrimary(isDark: boolean) { return isDark ? 'text-white/90' : 'text-slate-800'; }
export function textSecondary(isDark: boolean) { return isDark ? 'text-white/40' : 'text-slate-400'; }
export function textMuted(isDark: boolean) { return isDark ? 'text-white/25' : 'text-slate-300'; }

/* ─────────────────────────────────────────
   3. SHARED COMPONENTS
───────────────────────────────────────── */
export function BgFx() {
  const { isDark } = useTheme();
  
  // Thời lượng chung được nới rộng ra để quãng đường dài di chuyển được mượt mà, bồng bềnh
  const baseTransition: Transition = {
    repeat: Infinity,
    repeatType: "mirror" as const,
    ease: "easeInOut",
  };

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      {isDark ? (
        <>
          <div className="absolute inset-0 bg-[#060a14]" />
          
          {/* Khối 1 (Xanh lơ): Quét từ góc trái trên -> tít sang phải -> chéo xuống dưới */}
          <motion.div 
            animate={{ x: ['0vw', '45vw', '15vw', '0vw'], y: ['0vh', '15vh', '50vh', '0vh'], scale: [1, 1.2, 0.8, 1] }}
            transition={{ ...baseTransition, duration: 9 }}
            style={{ willChange: "transform" }}
            className="absolute -top-20 -left-20 w-[600px] h-[600px] rounded-full bg-cyan-500/40 blur-[90px]" 
          />
          
          {/* Khối 2 (Tím): Quét từ góc phải dưới -> bọc tít sang trái -> lên trên */}
          <motion.div 
            animate={{ x: ['0vw', '-50vw', '-25vw', '0vw'], y: ['0vh', '-45vh', '-10vh', '0vh'], scale: [1, 1.3, 0.9, 1] }}
            transition={{ ...baseTransition, duration: 11 }}
            style={{ willChange: "transform" }}
            className="absolute -bottom-20 -right-20 w-[500px] h-[500px] rounded-full bg-violet-600/40 blur-[90px]" 
          />
          
          {/* Khối 3 (Xanh ngọc): Bắt đầu từ giữa, bơi hình elip rộng ra hai bên */}
          <motion.div 
            animate={{ x: ['0vw', '35vw', '-35vw', '0vw'], y: ['0vh', '-35vh', '35vh', '0vh'] }}
            transition={{ ...baseTransition, duration: 12}}
            style={{ willChange: "transform" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full bg-emerald-500/30 blur-[90px]" 
          />
          
          {/* Khối 4 (Đỏ Rose): Quỹ đạo chéo ngược lại để trộn với màu xanh */}
          <motion.div 
            animate={{ x: ['0vw', '-45vw', '30vw', '0vw'], y: ['0vh', '45vh', '-25vh', '0vh'] }}
            transition={{ ...baseTransition, duration: 10}}
            style={{ willChange: "transform" }}
            className="absolute top-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-rose-500/30 blur-[80px]" 
          />

          <div className="absolute inset-0 opacity-[0.02]" style={{backgroundImage:'linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px)',backgroundSize:'60px 60px'}} />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-[#f0f4f8]" />
          
          {/* Khối 1 (Xanh dương): Chuyển động rộng, mượt */}
          <motion.div 
            animate={{ x: ['0vw', '45vw', '15vw', '0vw'], y: ['0vh', '20vh', '55vh', '0vh'], scale: [1, 1.2, 0.9, 1] }}
            transition={{ ...baseTransition, duration: 9 }}
            style={{ willChange: "transform" }}
            className="absolute -top-10 -left-10 w-[500px] h-[500px] rounded-full bg-blue-400/60 blur-[90px]" 
          />
          
          {/* Khối 2 (Tím): Bọc từ dưới lên */}
          <motion.div 
            animate={{ x: ['0vw', '-50vw', '-25vw', '0vw'], y: ['0vh', '-45vh', '-15vh', '0vh'], scale: [1, 1.1, 0.85, 1] }}
            transition={{ ...baseTransition, duration: 11 }}
            style={{ willChange: "transform" }}
            className="absolute bottom-0 right-0 w-[450px] h-[450px] rounded-full bg-violet-400/50 blur-[90px]" 
          />
          
          {/* Khối 3 (Xanh ngọc): Lượn sóng */}
          <motion.div 
            animate={{ x: ['0vw', '30vw', '-35vw', '0vw'], y: ['0vh', '-35vh', '30vh', '0vh'] }}
            transition={{ ...baseTransition, duration: 12 }}
            style={{ willChange: "transform" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-teal-300/60 blur-[80px]" 
          />
          
          {/* Khối 4 (Đỏ Rose): Điểm xuyết và giao thoa với vùng trung tâm */}
          <motion.div 
            animate={{ x: ['0vw', '-40vw', '25vw', '0vw'], y: ['0vh', '40vh', '-20vh', '0vh'] }}
            transition={{ ...baseTransition, duration: 10 }}
            style={{ willChange: "transform" }}
            className="absolute top-1/4 right-1/4 w-[350px] h-[350px] rounded-full bg-rose-400/50 blur-[80px]" 
          />

          <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage:'linear-gradient(rgba(100,120,180,.3) 1px,transparent 1px),linear-gradient(90deg,rgba(100,120,180,.3) 1px,transparent 1px)',backgroundSize:'60px 60px'}} />
        </>
      )}
    </div>
  );
}

export function ThemeToggle() {
  const { isDark, toggle } = useTheme();
  return (
    <motion.button
      onClick={toggle}
      whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
      className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-300 ${
        isDark
          ? 'bg-white/[0.05] border-white/[0.08] hover:bg-white/[0.1] hover:border-cyan-400/30'
          : 'bg-black/[0.04] border-black/[0.07] hover:bg-black/[0.08] hover:border-sky-400/40'
      }`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.div key="moon"
            initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.3 }}>
            <Moon className="w-4 h-4 text-cyan-400" />
          </motion.div>
        ) : (
          <motion.div key="sun"
            initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.3 }}>
            <Sun className="w-4 h-4 text-amber-500" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}