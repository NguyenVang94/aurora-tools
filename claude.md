# 🚀 Kiến trúc & Ngữ cảnh dự án: Aurora System (Tauri V2 + React 19)

## 1. Ngữ cảnh Ứng dụng (Context)
- **Tên dự án:** Aurora.
- **Mục tiêu:** Là một "Trạm kiểm soát" (Business Hub) dạng Desktop App dành cho doanh nghiệp. Giúp tự động hóa quy trình quản trị, gộp các tool nghiệp vụ (.exe), đồng bộ tin nhắn Slack thành Task, và quản lý lịch trình.
- **Triết lý cốt lõi:** "Tự động - Đơn giản - tiện lợi - giao diện đẹp". Tối ưu hóa thời gian (Zero-mouse/Phím tắt) và giảm thiểu Context Switching. giao diện đẹp dễ thao tác.

## 2. Stack Công nghệ
- **Frontend:** React 19 + TypeScript + Vite + TailwindCSS.
- **UI Components:** `lucide-react` (Icons), `framer-motion` (Animations), `cmdk` (Command Palette Ctrl+K), `@dnd-kit` (Drag & Drop).
- **Backend Core:** Rust (Tauri V2).
- **Database/BaaS:** Supabase (Bắt buộc sử dụng RLS - Row Level Security cho mọi bảng).

## 3. Quy tắc Thiết kế UI/UX (Design System)
- **Glassmorphism:** Giao diện sử dụng hiệu ứng kính mờ (backdrop-blur), background gradient pastel (Cyan, Lime, Purple, Sky).
- **Component:** Thiết kế bo góc mềm mại (rounded-xl, rounded-2xl), đổ bóng neon tinh tế.
- **Trải nghiệm:** Phải luôn có trạng thái Loading, Empty state và Toast Notification khi tool chạy xong hoặc gặp lỗi.

## 4. Quy tắc Code Frontend (React/Vite)
- Dùng Functional Components và Hooks. Tận dụng tính năng mới của React 19.
- Bắt buộc dùng TypeScript, định nghĩa Interface rõ ràng cho Payload từ Supabase/Tauri, tuyệt đối không dùng `any`.
- **HMR Rule (Quan trọng):** Trong các file giao diện (`.tsx`), CHỈ được `export` các React Component. Mọi hàm logic (như fetch API, parse data) phải viết dạng hàm nội bộ hoặc tách ra file `.ts` riêng để không làm hỏng tính năng Fast Refresh (HMR) của Vite.

## 5. Quy tắc Code Backend (Tauri V2 & Rust)
- Code Rust nằm trong `src-tauri`.
- **Hệ sinh thái Plugin:** Ưu tiên dùng Plugin của Tauri V2 (`@tauri-apps/plugin-shell` để gọi file .exe, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-updater`).
- **Single Instance:** App luôn phải cấu hình chỉ cho phép chạy 1 tiến trình duy nhất (chống Zombie Process).
- **Global Shortcuts:** Khi đăng ký phím tắt bằng Rust, phải handle cẩn thận trường hợp phím bị chiếm dụng để tránh làm crash app ngầm.
- Trả về `Result<T, String>` cho các custom commands bằng Rust để Frontend dễ dàng `try/catch`.

## 6. Quy tắc Tương tác (Prompting)
- CHỈ đọc các file liên quan trực tiếp đến tính năng đang được yêu cầu.
- TRƯỚC KHI viết code, hãy đưa ra kế hoạch (Step-by-step) phân tích luồng đi từ: UI -> Gọi Tauri command (nếu có) -> Xử lý Rust/Supabase -> Trả về UI.
- Tuân thủ tư duy "First Principles": Giữ code sạch, logic đơn giản nhất có thể, chia nhỏ component React và hàm Rust.