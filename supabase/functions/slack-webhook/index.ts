// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    // Đọc body gửi về từ Slack
    const body = await req.json();

    // 1. CHÀO HỎI SLACK (BẮT BUỘC): Xác thực URL lúc cài đặt
    if (body.type === 'url_verification') {
      return new Response(body.challenge, { status: 200 });
    }


    if (event.channel !== 'C05R11U8EDT' , 'C05R3UNCC5Q') {
      return new Response("Kênh này không quan tâm", { status: 200 });
    }

    // 2. XỬ LÝ TIN NHẮN MỚI
    if (body.type === 'event_callback' && body.event.type === 'message') {
      const event = body.event;

      // Lọc: Chỉ lấy tin nhắn chứa text và bỏ qua các sự kiện xóa/sửa tin nhắn (subtype)
      if (event.text && !event.subtype) {
        
        // Tùy chọn: Nếu bạn CHỈ muốn bắt tin nhắn của con Bot (không lấy tin user chat), 
        // hãy bỏ comment dòng dưới đây (thay thế bằng bot_id thật của bạn nếu cần)
        // if (!event.bot_id) return new Response("Bỏ qua tin nhắn của người dùng", { status: 200 });

        // Kết nối Supabase (Edge Function tự động có sẵn biến môi trường)
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Lưu trực tiếp nội dung tin nhắn vào bảng slack_logs
        const { error } = await supabase
          .from('slack_logs')
          .insert([{ 
            content: event.text, 
            is_synced: false 
          }]);

        if (error) {
          console.error("Lỗi khi lưu Supabase:", error);
          return new Response("Lỗi DB", { status: 500 });
        }
      }
    }

    // Trả về 200 OK để Slack biết ta đã nhận được tin
    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("Lỗi Server:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});