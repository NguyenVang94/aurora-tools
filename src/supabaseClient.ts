import { createClient } from '@supabase/supabase-js';

// Lấy URL và Key từ biến môi trường của Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Khởi tạo client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);