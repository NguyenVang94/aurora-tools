// @ts-nocheck
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalSize } from '@tauri-apps/api/dpi';
import { listen } from '@tauri-apps/api/event';
import { supabase } from '../supabase';
import { RefreshCw, Plus, Trash2, Check, CheckCircle2 } from 'lucide-react';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { useTheme, glassPanel, textPrimary, textSecondary, textMuted } from '../utils';

/* ─────────────────────────────────────────
   HÀM HELPER
───────────────────────────────────────── */

// 1. HÀM PHIÊN DỊCH FILE .ICS SANG DỮ LIỆU APP ĐỌC ĐƯỢC
const parseICalDate = (dateStr) => {
  if (!dateStr) return new Date();
  const y = dateStr.slice(0, 4);
  const m = parseInt(dateStr.slice(4, 6)) - 1;
  const d = dateStr.slice(6, 8);
  if (dateStr.includes('T')) {
    const h = dateStr.slice(9, 11);
    const min = dateStr.slice(11, 13);
    const s = dateStr.slice(13, 15);
    if (dateStr.endsWith('Z')) return new Date(Date.UTC(y, m, d, h, min, s));
    return new Date(y, m, d, h, min, s);
  }
  return new Date(y, m, d);
};

const parseICS = (icsString) => {
  const events = [];
  const lines = icsString.split(/\r?\n/);
  let event = null;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    while (i + 1 < lines.length && (lines[i+1].startsWith(' ') || lines[i+1].startsWith('\t'))) {
      i++;
      line += lines[i].slice(1);
    }

    if (line.includes('BEGIN:VEVENT')) {
      event = { id: Math.random().toString(), isAllDay: false };
    } else if (line.includes('END:VEVENT') && event) {
      events.push(event);
      event = null;
    } else if (event) {
      if (line.startsWith('SUMMARY:')) {
        event.title = line.substring(8).trim();
      } else if (line.startsWith('DTSTART')) {
        const val = line.substring(line.indexOf(':') + 1).trim();
        event.startTime = parseICalDate(val);
        if (!val.includes('T')) event.isAllDay = true;
      } else if (line.startsWith('DTEND')) {
        const val = line.substring(line.indexOf(':') + 1).trim();
        event.endTime = parseICalDate(val);
      }
    }
  }
  return events;
};

// 2. HÀM LẤY DATA TỪ GOOGLE SHEET
const getGoogleSheetData = async () => {
  const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT9AAT55cW2KreDdkFQsQTtDlnAlZg9_AdQqpLJ_zI8FSWoM6rVUd7HzIKCd0zqSQNDn5zIyNIfWc-8/pub?gid=961609011&single=true&output=csv'; 
  try {
    const response = await fetch(csvUrl);
    const text = await response.text();
    const rows = text.split(/\r?\n/);

    const data = rows.slice(1).map(row => {
      const values = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/(^"|"$)/g, '').trim());
      return { AccountID: values[0], Name: values[1], CassoID: values[2] };
    });

    return data.filter(item => item.AccountID); 
  } catch (error) {
    console.error("Lỗi đọc Google Sheet:", error);
    return [];
  }
};

// 3. HÀM BÓC TÁCH TIN NHẮN SLACK
const parseBotMessage = (rawContent) => {
  if (!rawContent) return []; 
  const content = rawContent.replace(/`/g, '').replace(/[<>]/g, '');
  const results = []; 

  if (content.includes("スプシURL") || content.includes("タイムスタンプ")) {
    const blocks = content.split(/(?=行番号[：:])/);
    for (const block of blocks) {
      if (!block.trim()) continue;
      const accountIdMatch = block.match(/アカウント名.*?[：:]\s*([^\r\n]+)/);
      if (accountIdMatch) {
        const linkMatch = block.match(/スプシURL[：:]\s*(https?:\/\/[^\s]+)/);
        const dateMatch = block.match(/タイムスタンプ[：:]\s*(\d{4})\/(\d{1,2})\/(\d{1,2})/);
        const rowMatch = block.match(/行番号[：:]\s*(\d+)/);
        let dueDate = null;
        if (dateMatch) {
          dueDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
        }
        results.push({
          accountId: accountIdMatch[1].trim(), taskLink: linkMatch ? linkMatch[1].trim() : null, dueDate: dueDate, formType: 'form2', rowNumber: rowMatch ? rowMatch[1] : null
        });
      }
    }
    if (results.length > 0) return results;
  }

  const accountIdMatch = content.match(/対象アカウント[\s\S]*?\(([a-zA-Z0-9_]+)\)/);
  if (accountIdMatch) {
    const linkMatch = content.match(/(https:\/\/ifd\.task-manager\.jp\/task\/\d+)/);
    const dateMatch = content.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    let dueDate = null;
    if (dateMatch) {
      dueDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
    }
    results.push({
      accountId: accountIdMatch[1], taskLink: linkMatch ? linkMatch[1] : null, dueDate, formType: 'form1', rowNumber: null
    });
  }
  return results; 
};

/* ─────────────────────────────────────────
   COMPONENT CHÍNH
───────────────────────────────────────── */

export default function TasksTab({ userName = "guest", userRole = "user" }) {
  const { isDark } = useTheme();
  const today = new Date();
  const [calDate, setCalDate] = useState(today);
  const [direction, setDirection] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const [allTasks, setAllTasks] = useState([]);
  const [newTask, setNewTask] = useState('');

  // --- STATE LỊCH GOOGLE CẦN THÊM ---
  const [gcalEvents, setGcalEvents] = useState([]);
  const [isFetchingCal, setIsFetchingCal] = useState(false);

  // --- HÀM TẢI LỊCH (Đã dời vào trong Component) --- vẫn không được bạn ơi chắc phải chuyển qua cách 2
  const fetchGoogleCalendar = async () => {
    setIsFetchingCal(true);
    try {
      // Dán link chế tạo vào đây:
      const url = 'https://calendar.google.com/calendar/ical/s2ltvmacusfi4f7tv5rc1r1q6r88o93f%40import.calendar.google.com/public/basic.ics'; 
      
      const response = await tauriFetch(url, {
        method: 'GET',
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const icsText = await response.text();
      const parsedEvents = parseICS(icsText);
      setGcalEvents(parsedEvents);
      
    } catch (error) {
      console.error("Lỗi tải lịch qua Tauri Plugin:", error);
      setGcalEvents([]); 
    } finally {
      setIsFetchingCal(false);
    }
  };

  // 1. HÀM TẢI DATA TỪ 2 BẢNG GỘP LẠI
  const fetchTasks = async () => {
    try {
      // Lấy task thủ công
      const { data: manualTasks, error: err1 } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userName);

      if (err1) throw err1;

      // Lấy task từ Slack
      const { data: slackTasks, error: err2 } = await supabase
        .from('tasks_slack')
        .select('*')
        .eq('user_id', userName);

      if (err2) throw err2;

      // MẸO: Gắn thêm nhãn 'source' để lát nữa biết task này thuộc bảng nào để Sửa/Xóa cho đúng
      const mTasks = (manualTasks || []).map(t => ({ ...t, source: 'tasks' }));
      const sTasks = (slackTasks || []).map(t => ({ ...t, source: 'tasks_slack' }));

      setAllTasks([...mTasks, ...sTasks]);
    } catch (error) {
      console.error("Lỗi khi tải danh sách task:", error);
    }
  };

  // Tự động tải data khi vừa mở tab hoặc đổi user
  useEffect(() => {
    fetchTasks();
    fetchGoogleCalendar();
  }, [userName]);

  // 2. HÀM THÊM TASK (Ghi thẳng lên bảng 'tasks')
  const addTask = async () => {
    if (!newTask.trim()) return;
    const taskText = newTask.trim();
    const taskDate = formatDate(calDate);
    setNewTask('');

    // Hiển thị tạm lên UI cho mượt
    const tempTask = { id: Date.now(), text: taskText, done: false, date: taskDate, source: 'tasks' };
    setAllTasks(p => [...p, tempTask]);

    // Đẩy lên DB
    try {
      const { error } = await supabase.from('tasks').insert([{
        text: taskText,
        date: taskDate,
        done: false,
        user_id: userName
      }]);
      if (error) throw error;
      fetchTasks(); // Tải lại để lấy ID thật từ database
    } catch (error) {
      console.error("Lỗi thêm task thủ công:", error);
    }
  };

  // 3. HÀM TÍCH HOÀN THÀNH (Dựa vào source để update đúng bảng)
  const toggleTask = async (task) => {
    setAllTasks(p => p.map(t => t.id === task.id ? { ...t, done: !t.done } : t));
    if (task.source) {
      await supabase.from(task.source).update({ done: !task.done }).eq('id', task.id);
    }
  };

  // 4. HÀM XÓA TASK
  const deleteTask = async (task) => {
    setAllTasks(p => p.filter(t => t.id !== task.id));
    if (task.source) {
      await supabase.from(task.source).delete().eq('id', task.id);
    }
  };

  const JP_HOLIDAYS = {
    '2026-01-01': { name: '元日', desc: 'Ngày ngày mùng 1 tháng 1 dương lịch, ngày đầu tiên của năm mới tại Nhật Bản. Đây là ngày lễ quốc gia quan trọng, đánh dấu sự khởi đầu năm mới theo lịch Tây, thường diễn ra trong không khí đoàn tụ gia đình, nghỉ ngơi và thực hiện các nghi lễ truyền thống.' },
    '2026-01-12': { name: '成人の日', desc: 'Coming of Age Day (tiếng Nhật: 成人の日 - Seijin no Hi), hay còn gọi là Lễ trưởng thành, là ngày lễ quốc gia tại Nhật Bản được tổ chức vào thứ Hai của tuần thứ hai trong tháng 1 hàng năm. Đây là dịp để chúc mừng, động viên các bạn trẻ bước sang tuổi 20, chính thức trở thành người lớn, có trách nhiệm với xã hội.' },
    '2026-02-11': { name: '建国記念の日', desc: 'National Foundation Day (tiếng Nhật: Kenkoku Kinen no Hi - 建国記念の日) là Ngày Quốc khánh Nhật Bản, một ngày lễ quốc gia được tổ chức hàng năm vào ngày 11 tháng 2. Ngày này kỷ niệm sự thành lập đất nước Nhật Bản và việc Thiên hoàng đầu tiên, Jimmu, lên ngôi vào năm 660 TCN.' },
    '2026-02-23': { name: '天皇誕生日', desc: 'Ngày sinh nhật của đương kim Thiên Hoàng Nhật Bản, một ngày lễ quốc gia chính thức tại Nhật Bản. Hiện nay, ngày này được tổ chức vào ngày 23 tháng 2 hàng năm, kỷ niệm ngày sinh của Thiên Hoàng Naruhito' },
    '2026-03-20': { name: '春分の日 ', desc: 'Shunbun no Hi (春分の日 - Ngày Xuân phân) là một ngày lễ quốc gia tại Nhật Bản, thường diễn ra vào ngày 20 hoặc 21 tháng 3, đánh dấu thời điểm mặt trời đi qua xích đạo, khiến ngày và đêm dài bằng nhau. Đây là ngày lễ tôn vinh thiên nhiên, sự sinh sôi nảy nở của mùa xuân, và là dịp để thăm mộ tổ tiên.' },
    '2026-04-29': { name: '昭和の日', desc: 'Ngày Showa (昭和の日, Shōwa no Hi) là ngày lễ quốc gia tại Nhật Bản được tổ chức hàng năm vào ngày 29 tháng 4. Đây là ngày kỷ niệm sinh nhật của cố Hoàng đế Showa (Hirohito) và cũng là ngày bắt đầu của kỳ nghỉ lễ lớn Tuần lễ Vàng (Golden Week). Ngày lễ này tôn vinh thời kỳ 62 năm (1926-1989) đầy biến động của triều đại Showa.' },
    '2026-05-03': { name: '憲法記念日', desc: 'Ngày Hiến pháp Nhật Bản (憲法記念日 - Kenpō Kinenbi) là ngày lễ quốc gia được tổ chức vào ngày 3 tháng 5 hàng năm để kỷ niệm việc Hiến pháp Nhật Bản hiện đại có hiệu lực vào ngày 3/5/1947. Đây là một phần quan trọng của "Tuần lễ Vàng" (Golden Week), tôn vinh chủ quyền nhân dân, hòa bình và quyền con người.' },
    '2026-05-04': { name: 'みどりの日', desc: 'Midori no Hi (みどりの日), hay còn gọi là Ngày Xanh, là một ngày lễ quốc gia tại Nhật Bản được tổ chức vào ngày 4 tháng 5 hằng năm. Đây là một phần của chuỗi ngày nghỉ lễ liên tiếp nổi tiếng mang tên Tuần lễ Vàng (Golden Week).' },
    '2026-05-05': { name: 'こどもの日', desc: 'Kodomo no Hi (こどもの日), hay Ngày Thiếu nhi, được tổ chức vào ngày 5 tháng 5 hằng năm. Đây là ngày lễ kết thúc chuỗi Tuần lễ Vàng (Golden Week) tại Nhật Bản, nhằm cầu chúc sức khỏe, hạnh phúc và tôn trọng cá tính của trẻ em.' },
    '2026-05-06': { name: '振替休日', desc: 'Ngày  Nghỉ bù cho Ngày Hiến pháp tại Nhật Bản, diễn ra vào thứ Tư, ngày 6 tháng 5 năm 2026.' },
    '2026-07-20': { name: '海の日', desc: 'Ngày của Biển tại Nhật Bản, một ngày lễ quốc gia được tổ chức vào ngày thứ Hai của tuần thứ 3 trong tháng 7 hàng năm. Ý nghĩa chính là cảm tạ ơn huệ của biển cả, cầu mong sự thịnh vượng cho Nhật Bản - một quốc gia hải đảo.' },
    '2026-08-11': { name: '山の日', desc: 'là một quốc khánh của Nhật Bản, được tổ chức hàng năm vào ngày 11 tháng 8. Mục đích của ngày này là tạo cơ hội để mọi người gần gũi với núi non, trân trọng sự ưu ái của thiên nhiên và cảm ơn những lợi ích mà núi rừng mang lại.' },
    '2026-09-21': { name: '敬老の日', desc: 'Ngày Kính lão tại Nhật Bản, một ngày lễ quốc gia (lịch đỏ) nhằm tri ân người cao tuổi, tôn vinh sự trường thọ và cảm ơn những đóng góp của họ cho xã hội. Ngày này diễn ra vào thứ Hai của tuần thứ 3 trong tháng 9 hàng năm.' },
    '2026-09-22': { name: '国民の休日', desc: 'Ngày nghỉ xen giữa hai ngày lễ quốc gia (祝日 - Shukujitsu) của Nhật Bản, được quy định theo Luật ngày lễ. Nó tạo thành một kỳ nghỉ liên tục (nghỉ bù) khi một ngày thường nằm giữa hai ngày lễ, thường thấy nhất trong tuần lễ vàng (Golden Week).' },
    '2026-09-23': { name: '秋分の日', desc: 'Ngày  lễ quốc gia tại Nhật Bản, thường diễn ra vào ngày 22 hoặc 23 tháng 9 hàng năm. Đây là ngày đánh dấu sự chuyển giao mùa sang thu, khi độ dài ngày và đêm xấp xỉ bằng nhau, sau đó ngày sẽ ngắn lại và đêm dài ra.' },
    '2026-10-12': { name: 'スポーツの日', desc: 'Ngày lễ quốc gia tại Nhật Bản, diễn ra vào thứ Hai của tuần thứ hai trong tháng 10 hàng năm. Mục đích của ngày này là khuyến khích người dân rèn luyện sức khỏe thể chất, tinh thần và tận hưởng các hoạt động thể thao.' },
    '2026-11-03': { name: '文化の日', desc: 'Ngày lễ quốc gia tại Nhật Bản được tổ chức hàng năm vào ngày 3 tháng 11 để tôn vinh văn hóa, nghệ thuật và tri thức. Được thiết lập vào năm 1948, ngày này hướng tới thông điệp yêu tự do, hòa bình và phát triển văn hóa, với các hoạt động nổi bật như lễ trao Huân chương Văn hóa (Order of Culture), mở cửa miễn phí các bảo tàng và tổ chức triển lãm nghệ thuật.' },
    '2026-11-23': { name: '勤労感謝の日', desc: 'Ngày lễ quốc gia tại Nhật Bản, diễn ra vào ngày 23 tháng 11 hàng năm. Ngày này tôn vinh sự chăm chỉ, năng suất lao động và tri ân những người lao động. Nó tương đương với Ngày Quốc tế Lao động ở các nơi khác, nhưng có ý nghĩa biết ơn sâu sắc hơn.' }
  };

  const year = calDate.getFullYear(), month = calDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

  const formatDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // LOGIC ĐỒNG BỘ
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      // 1. TẠO TỪ ĐIỂN USER
      const { data: allUsers, error: usersErr } = await supabase
        .from('app_users')
        .select('username, casso_id');

      if (usersErr) throw usersErr;

      const cassoToUser = {};
      allUsers.forEach(u => {
        if (u.casso_id && u.username) {
          cassoToUser[u.casso_id.trim().toLowerCase()] = u.username;
        }
      });

      // 2. XÁC ĐỊNH MỐC THỜI GIAN ĐẦU THÁNG HIỆN TẠI
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const startOfMonthStr = `${yyyy}-${mm}-01`; 
      const startOfMonthISO = new Date(yyyy, now.getMonth(), 1).toISOString();

      // 3. LẤY TOÀN BỘ LOG SLACK TRONG THÁNG
      const { data: logs, error: fetchErr } = await supabase
        .from('slack_logs')
        .select('*')
        .gte('created_at', startOfMonthISO);

      if (fetchErr) throw fetchErr;
      if (!logs || logs.length === 0) {
        alert("Không có tin nhắn Slack nào trong tháng này để đồng bộ.");
        setIsSyncing(false);
        return;
      }

      // 4. DỌN DẸP: CHỈ XÓA NHỮNG TASK CHƯA HOÀN THÀNH (done = false)
      const { error: deleteErr } = await supabase
        .from('tasks_slack')
        .delete()
        .gte('date', startOfMonthStr)
        .eq('done', false); // Cứu lại những task done = true!

      if (deleteErr) throw deleteErr;

      // 5. LẤY DANH SÁCH NHỮNG TASK ĐÃ DONE (Để chống tạo trùng)
      const { data: retainedTasks, error: retainedErr } = await supabase
        .from('tasks_slack')
        .select('text, date, user_id')
        .gte('date', startOfMonthStr);

      if (retainedErr) throw retainedErr;

      // Tạo một tập hợp (Set) các "Chữ ký Task" đã tồn tại
      // Chữ ký có dạng: "username|2026-04-21|アカウント: A123..."
      const existingSignatures = new Set();
      if (retainedTasks) {
        retainedTasks.forEach(t => {
          existingSignatures.add(`${t.user_id}|${t.date}|${t.text}`);
        });
      }

      // 6. TẢI MASTER SHEET MỚI NHẤT
      const sheetData = await getGoogleSheetData(); 
      const tasksToInsert = [];
      
      // Bộ lọc chống trùng cục bộ dành riêng cho Form 2 (theo dòng)
      const existingRows = new Set(); 

      // 7. DUYỆT LOG VÀ TẠO TASK MỚI CÓ ĐIỀU KIỆN
      for (const log of logs) {
        
        // Nhận về một MẢNG các kết quả bóc tách từ 1 tin nhắn
        const parsedTasks = parseBotMessage(log.content);
        console.log(`[Tin nhắn ID: ${log.id}] Dữ liệu bóc được:`, parsedTasks);
        // Duyệt qua từng khối dữ liệu đã bóc được
        for (const parsed of parsedTasks) {
          const { accountId, taskLink, dueDate, formType, rowNumber } = parsed;
          
          if (!accountId) continue; 

          // Kiểm tra chống dội bom Form 2 (theo dòng)
          if (formType === 'form2' && rowNumber) {
             if (existingRows.has(rowNumber)) continue;
          }

          // Ép kiểu: Xóa toàn bộ dấu cách (khoảng trắng) và đưa về chữ thường trước khi so sánh
          const matchedRow = sheetData.find(row => {
            if (!row.AccountID) return false;
            
            const sheetId = row.AccountID.trim();
            const slackId = accountId.trim();

            // 1. Nếu giống hệt nhau 100% -> Chốt luôn cho nhanh!
            if (sheetId === slackId) {
              return true;
            }

            // 2. Nếu lệch nhau, thử gọt sạch mọi loại dấu cách và ép về chuẩn Half-width để so sánh lại
            // Giúp bỏ qua lỗi con người gõ dư dấu cách hoặc dùng dấu cách tiếng Nhật
            const sanitizeText = (str) => {
              return str
                .normalize('NFKC') // Ép Full-width thành Half-width (VD: ＡＢＣ -> ABC)
                .toLowerCase()     // Đưa về chữ thường
                .replace(/\s+/g, ''); // Xóa SẠCH mọi loại khoảng trắng/dấu cách
            };

            const cleanSheet = sanitizeText(sheetId);
            const cleanSlack = sanitizeText(slackId);
            
            // ÉP BUỘC PHẢI BẰNG NHAU HOÀN TOÀN (===), tuyệt đối KHÔNG dùng includes() nữa
            return cleanSheet === cleanSlack; 
          });

          const rowCassoId = matchedRow && matchedRow.CassoID ? matchedRow.CassoID.trim().toLowerCase() : null;
          const taskOwnerUsername = rowCassoId ? cassoToUser[rowCassoId] : null;

          // 👉 DÒNG CONSOLE.LOG BẮT BỆNH TẠI ĐÂY:
          console.log(`🕵️ ĐANG XÉT ACCOUNT: ${accountId}`, {
            '1. Có trên Sheet không?': !!matchedRow,
            '2. Tên gốc trên Sheet': matchedRow ? matchedRow.AccountID : 'Không tìm thấy',
            '3. Mã Casso ID trên Sheet': rowCassoId || 'Trống',
            '4. Phân cho User (App)': taskOwnerUsername || 'LỖI: CHƯA CÓ USER'
          });

          // Tiếp tục logic tạo task nếu tìm thấy người
          if (matchedRow) {
            if (taskOwnerUsername && taskLink && dueDate) {
              const logDateObj = new Date(log.created_at);
              const log_y = logDateObj.getFullYear();
              const log_m = String(logDateObj.getMonth() + 1).padStart(2, '0');
              const log_d = String(logDateObj.getDate()).padStart(2, '0');
              const createdDateStr = `${log_y}-${log_m}-${log_d}`; 

              let taskText = `アカウント: ${accountId}\nLink: ${taskLink}\n完了期日: ${dueDate}`;
              if (formType === 'form2' && rowNumber) {
                  taskText += `\n行番号: ${rowNumber}`;
              }

              const signature = `${taskOwnerUsername}|${createdDateStr}|${taskText}`;

              if (!existingSignatures.has(signature)) {
                  tasksToInsert.push({
                      text: taskText, 
                      date: createdDateStr,
                      done: false, 
                      user_id: taskOwnerUsername 
                  });

                  existingSignatures.add(signature);
              }

              if (formType === 'form2' && rowNumber) {
                  existingRows.add(rowNumber);
              }
            } else if (!taskOwnerUsername) {
               console.warn(`Tạm giữ lại: Mã Casso [${rowCassoId}] chưa đăng ký tài khoản App.`);
            }
          } else {
             console.warn(`Tạm giữ lại: Không tìm thấy Account ID này trên Google Sheet.`);
          }
        }
      }

      // 8. GHI NHỮNG TASK THỰC SỰ MỚI VÀO DATABASE
      if (tasksToInsert.length > 0) {
        const { error: insertErr } = await supabase.from('tasks_slack').insert(tasksToInsert);
        if (insertErr) throw insertErr;
      }

      alert("Đồng bộ dữ liệu thành công!");
      
      // 9. LÀM MỚI GIAO DIỆN
      fetchTasks();
      
    } catch (error) {
      console.error("Lỗi đồng bộ:", error);
      alert("Có lỗi xảy ra trong quá trình đồng bộ!");
    } finally {
      setIsSyncing(false);
    }
  };

  const selectedDateStr = formatDate(calDate);
  const dailyTasks = allTasks.filter(t => t.date === selectedDateStr);

  // --- LỌC SỰ KIỆN LỊCH THEO NGÀY ---
  const dailyEvents = (Array.isArray(gcalEvents) ? gcalEvents : []).filter(ev => {
    if (!ev || !ev.startTime) return false;
    try {
      const evDate = new Date(ev.startTime);
      if (isNaN(evDate.getTime())) return false; 
      return formatDate(evDate) === selectedDateStr;
    } catch (e) {
      return false;
    }
  });

  return (
    <div className="flex gap-5 h-full overflow-hidden">
      {/* CỘT TRÁI: LỊCH */}
      <div className="w-80 shrink-0 flex flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar">
        <div className={`rounded-2xl p-5 ${glassPanel(isDark)}`}>
          <div className="flex items-center gap-2 mb-2">
            {userRole === 'admin' && (
              <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-red-500/20 text-red-500 uppercase shadow-sm border border-red-500/20">
                Admin
              </span>
            )}
            <span className={`font-bold text-base ${textPrimary(isDark)}`}>
              {MONTHS[month]} {year}
            </span>
            
            <div className="flex gap-1 ml-auto">
              <button 
                onClick={() => {setDirection(-1); setCalDate(new Date(year, month - 1, 1))}} 
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xl transition-all ${
                  isDark ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}>‹</button>
              <button 
                onClick={() => {setDirection(1); setCalDate(new Date(year, month + 1, 1))}} 
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xl transition-all ${
                  isDark ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}>›</button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((d, i) => (
              <div key={d} className={`text-center text-[10px] font-bold ${i === 0 ? 'text-red-500' : textMuted(isDark)}`}>{d}</div>
            ))}
          </div>

          <div className="relative overflow-hidden min-h-[240px]">
            <AnimatePresence mode="popLayout" custom={direction}>
              <motion.div key={month} custom={direction} initial={{ x: direction * 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: direction * -50, opacity: 0 }} transition={{ duration: 0.3 }} className="grid grid-cols-7 gap-1">
                {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
                {Array(daysInMonth).fill(null).map((_, i) => {
                  const d = i + 1;
                  const loopDate = new Date(year, month, d);
                  const dStr = formatDate(loopDate);
                  const isToday = dStr === formatDate(today);
                  const isSelected = dStr === selectedDateStr;
                  const holiday = JP_HOLIDAYS[dStr];
                  const hasUnfinishedTasks = allTasks.some(t => t.date === dStr && !t.done);

                  return (
                    <button key={d} onClick={() => setCalDate(loopDate)}
                      className={`relative h-10 w-full rounded-xl text-sm font-bold transition-all flex flex-col items-center justify-center ${
                        isSelected 
                          ? 'bg-sky-500 text-white shadow-lg' 
                          : isToday 
                            ? (isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700') 
                            : holiday ? 'text-red-500 hover:bg-red-50' : (isDark ? 'text-white/60 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100')
                      }`}>
                      <span>{d}</span>
                      {hasUnfinishedTasks && !isSelected && (
                        <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-cyan-500" />
                      )}
                    </button>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className={`rounded-2xl p-5 ${glassPanel(isDark)}`}>
          <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${textSecondary(isDark)}`}>User: {userName}</p>
          <p className={`text-lg font-black ${textPrimary(isDark)}`}>{calDate.toLocaleDateString('vi-VN', { weekday: 'long' })}</p>
          <p className={`text-sm font-medium mb-4 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Ngày {calDate.getDate()} thg {calDate.getMonth() + 1}</p>
          
          {JP_HOLIDAYS[selectedDateStr] ? (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
              <p className="text-red-500 font-bold text-sm mb-1">🎌 {JP_HOLIDAYS[selectedDateStr]?.name}</p>
              <p className={`text-[11px] leading-relaxed ${isDark ? 'text-red-200/80' : 'text-red-800/70'}`}>{JP_HOLIDAYS[selectedDateStr]?.desc}</p>
            </div>
          ) : (
            <div className={`p-4 rounded-2xl border border-dashed ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <p className={`text-[11px] text-center ${textMuted(isDark)}`}>Ngày thường</p>
            </div>
          )}
        </div>
      </div>

      {/* CỘT PHẢI: TASK */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div className={`rounded-2xl p-6 ${glassPanel(isDark)}`}>
          
          {/* NÚT SYNC SLACK ĐƯỢC ĐƯA VÀO ĐÚNG VỊ TRÍ NÀY */}
          <div className="flex items-center justify-between mb-5">
            <h2 className={`font-black text-xl ${textPrimary(isDark)}`}>Công việc ngày {calDate.getDate()}</h2>
            
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${
                isDark 
                  ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30' 
                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              } ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Đang đồng bộ...' : 'Sync Slack'}
            </button>
          </div>

          <div className="flex gap-2">
            <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()}
              placeholder="Thêm công việc..." className={`flex-1 h-12 px-4 rounded-xl text-sm border focus:outline-none transition-all ${isDark ? 'bg-white/[0.04] border-white/10 text-white' : 'bg-white border-slate-200'}`} />
            <button onClick={addTask} className="h-12 px-5 rounded-xl bg-sky-500 text-white shadow-lg hover:bg-sky-600 transition-all"><Plus className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {/* IN RA LỊCH GOOGLE TRƯỚC */}
            {dailyEvents.map(ev => {
              const startObj = new Date(ev.startTime);
              const endObj = new Date(ev.endTime);
              const timeStr = startObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
              const endTimeStr = endObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

              return (
                <motion.div key={ev.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl p-4 flex items-center gap-4 border transition-all ${isDark ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100 shadow-sm'}`}>
                  <div className={`w-14 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 border ${isDark ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400' : 'bg-white border-indigo-200 text-indigo-600 shadow-sm'}`}>
                    {ev.isAllDay ? <span className="text-[10px] font-black uppercase">Cả ngày</span> : <span className="text-xs font-black">{timeStr}</span>}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-bold ${textPrimary(isDark)}`}>{ev.title}</p>
                    {!ev.isAllDay && <p className={`text-[11px] mt-1 font-medium ${isDark ? 'text-indigo-300/60' : 'text-indigo-500/70'}`}>Kết thúc lúc: {endTimeStr}</p>}
                  </div>
                </motion.div>
              );
            })}
            {dailyTasks.length > 0 ? dailyTasks.map(task => (
              <motion.div key={task.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                className={`rounded-2xl p-4 flex items-center gap-4 border transition-all ${isDark ? 'bg-white/[0.03] border-white/5 hover:bg-white/[0.05]' : 'bg-white border-black/5 shadow-sm'}`}>
                <button onClick={() => toggleTask(task)}
                  className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-all ${task.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>
                  {task.done && <Check className="w-4 h-4" />}
                </button>
                <span className={`flex-1 text-sm font-medium whitespace-pre-wrap leading-relaxed transition-all ${
                  task.done ? `line-through ${isDark ? 'text-white/30' : 'text-slate-400'}` : textPrimary(isDark)
                }`}>
                  {task.text}
                </span>
                <button onClick={() => deleteTask(task)} className="text-red-400 hover:text-red-600 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
              </motion.div>
            )) : (
              <div className={`text-center py-20 ${textMuted(isDark)} opacity-50`}>
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm font-bold uppercase tracking-widest">Không có việc</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}