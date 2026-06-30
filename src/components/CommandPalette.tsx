// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Command } from 'cmdk';
import { Search, Play, Power } from 'lucide-react';
import { useTheme } from '../utils';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

import { getCurrentWindow, currentMonitor } from '@tauri-apps/api/window'; 
import { LogicalSize, PhysicalPosition } from '@tauri-apps/api/dpi'; 

export default function CommandPalette({ tools, onRunTool, isOpen, setIsOpen, isMinimalMode, setIsMinimalMode }) {
  const { isDark } = useTheme();
  const [search, setSearch] = useState('');

  // 1. CHỈNH LẠI THUẬT TOÁN TỌA ĐỘ VỊ TRÍ
  useEffect(() => {
    const adjustWindow = async () => {
      try {
        const win = getCurrentWindow();
        const monitor = await currentMonitor();
        
        if (isOpen && isMinimalMode && monitor) {
          const winW = 700;
          const winH = 450;
          await win.setSize(new LogicalSize(winW, winH));
          await win.setAlwaysOnTop(true);

          const scaleFactor = monitor.scaleFactor;
          const physicalWinW = winW * scaleFactor;
          const physicalWinH = winH * scaleFactor;

          // Căn giữa theo chiều ngang
          const x = (monitor.size.width - physicalWinW) / 2;
          
          // THUẬT TOÁN MỚI: Lấy điểm giữa màn hình, cộng thêm 150px (đã scale) để đẩy xuống nửa dưới
          const y = (monitor.size.height - physicalWinH) / 2 + (150 * scaleFactor); 

          await win.setPosition(new PhysicalPosition(x, y));
        } else if (!isMinimalMode) {
          await win.setSize(new LogicalSize(1100, 750));
          await win.setAlwaysOnTop(false);
          await win.center();
        }
      } catch (err) {
        console.error("Lỗi căn chỉnh cửa sổ:", err);
      }
    };
    adjustWindow();
  }, [isOpen, isMinimalMode]);

  useEffect(() => {
    const handleKeyDown = async (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsMinimalMode(false); 
        setIsOpen((open) => !open);
      }
      
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        setSearch('');
        try {
          await getCurrentWindow().close(); 
        } catch (err) {}
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    const unlisten = listen('toggle-command-palette', async (event) => {
      const wasHidden = event.payload === true; 
      setIsMinimalMode(wasHidden); 
      setIsOpen(true);
      
      try {
        const win = getCurrentWindow();
        
        // 2. ĐỒNG BỘ THUẬT TOÁN TỌA ĐỘ KHI MỞ BẰNG ALT+K
        if (wasHidden) {
          const monitor = await currentMonitor();
          if (monitor) {
            const winW = 700;
            const winH = 450;
            await win.setSize(new LogicalSize(winW, winH));
            await win.setAlwaysOnTop(true);
            const scaleFactor = monitor.scaleFactor;
            const physicalWinW = winW * scaleFactor;
            const physicalWinH = winH * scaleFactor;
            
            const x = (monitor.size.width - physicalWinW) / 2;
            const y = (monitor.size.height - physicalWinH) / 2 + (150 * scaleFactor); // Đẩy xuống 150px
            
            await win.setPosition(new PhysicalPosition(x, y));
          }
        }

        setTimeout(async () => {
          await win.show();
          await win.setFocus();
        }, 50);

      } catch (err) {}
    });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      unlisten.then((f) => f());
    };
  }, [setIsOpen, isMinimalMode]);

  const handleQuit = async () => {
    setIsOpen(false);
    await invoke('quit_app');
  };

  const showList = !isMinimalMode || search.length > 0;

  const paletteContent = isOpen ? (
    <div className={`fixed inset-0 z-[9999] flex justify-center pointer-events-none ${isMinimalMode ? 'items-start pt-2 px-4' : 'items-start pt-[25vh] px-4'}`}>
      
      <div 
        className="fixed inset-0 pointer-events-auto bg-transparent" 
        onClick={async () => { 
          setIsOpen(false); 
          setSearch(''); 
          try { await getCurrentWindow().close(); } catch (err) {}
        }} 
      />

      <div 
        data-tauri-drag-region 
        className={`relative w-full max-w-xl rounded-2xl border shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] flex flex-col transition-colors animate-in fade-in zoom-in-95 duration-200 pointer-events-auto ${
          isDark ? 'bg-slate-900/95 border-white/10' : 'bg-white/95 border-black/10'
        }`}
      >
        <Command className="w-full flex flex-col bg-transparent" onValueChange={setSearch}>
          <div data-tauri-drag-region className={`flex items-center px-4 transition-colors cursor-grab active:cursor-grabbing ${showList ? 'border-b border-slate-500/10' : 'border-transparent'}`}>
            <Search className={`w-5 h-5 shrink-0 pointer-events-none ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            <Command.Input 
              autoFocus 
              value={search}
              onValueChange={setSearch}
              placeholder="Tìm kiếm công cụ hoặc gõ lệnh..." 
              className={`flex-1 bg-transparent border-none outline-none px-4 py-4 text-[17px] font-medium cursor-text ${
                isDark ? 'text-white placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'
              }`} 
            />
          </div>

          {showList && (
            <Command.List className="max-h-[250px] overflow-y-auto p-2 custom-scrollbar animate-in slide-in-from-top-1 duration-200 cursor-auto">
              <Command.Empty className="p-6 text-center text-sm text-slate-500">Không tìm thấy.</Command.Empty>
              <Command.Group heading="Công cụ" className={`px-3 py-2 text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {tools.map((tool) => (
                  <Command.Item
                    key={tool.id} value={tool.name} 
                    onSelect={async () => { 
                      setIsOpen(false); 
                      setSearch(''); 
                      setIsMinimalMode(false);
                      try { await getCurrentWindow().show(); } catch (err) {}
                      onRunTool(tool.id); 
                    }}
                    className={`flex items-center gap-3 px-3 py-3 mt-1 cursor-pointer rounded-xl transition-all aria-selected:bg-cyan-500/20 aria-selected:text-cyan-400 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-white/10 bg-white/5">{tool.icon}</div>
                    <div className="flex-1 font-semibold text-[15px]">{tool.name}</div>
                    <Play className="w-3 h-3 opacity-50" />
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
          )}
        </Command>
      </div>
    </div>
  ) : null;

  return (
    <>
      {isMinimalMode && (
        <style>{`
          html, body { background: transparent !important; }
          #root { opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; }
        `}</style>
      )}
      {createPortal(paletteContent, document.body)}
    </>
  );
}