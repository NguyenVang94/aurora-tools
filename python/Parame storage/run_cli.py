import sys
import argparse
import json
import logging
import os

# Bọc thép chống lỗi Encoding và ép nhả Log thời gian thực
if sys.stdout is not None:
    sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
if sys.stderr is not None:
    sys.stderr.reconfigure(encoding='utf-8', line_buffering=True)

# Ghi đè cấu hình Logging để log đẩy thẳng ra Terminal (bắt bằng Tauri)
logging.basicConfig(level=logging.INFO, format='%(message)s', stream=sys.stdout)

# Import các module cốt lõi của bạn
import config
import CoreLogic
try:
    import dowload
except ImportError:
    logging.warning("Không tìm thấy module 'dowload'. Các tác vụ tải xuống có thể bị lỗi.")

def main():
    print("="*60, flush=True)
    print("----> PARAME STORAGE AUTOMATION <----", flush=True)
    print("="*60, flush=True)

    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=str, help="JSON config từ React truyền xuống", default="{}")
    args = parser.parse_args()

    try:
        data = json.loads(args.config)
    except Exception as e:
        logging.error(f"❌ Lỗi giải mã tham số từ UI: {e}")
        return

    # 1. THIẾT LẬP INPUT/MASTER FOLDER (Output/Download tự suy ra bên trong configure_paths)
    input_path = data.get("input_path", "")
    master_path = data.get("master_path", "")

    if not input_path or not os.path.exists(input_path):
        logging.error(f"❌ Input Folder không hợp lệ hoặc chưa tồn tại: {input_path}")
        return
    if not master_path or not os.path.exists(master_path):
        logging.error(f"❌ Master Folder không hợp lệ hoặc chưa tồn tại: {master_path}")
        return

    config.configure_paths(input_path, master_path)
    logging.info(f"📂 Input Folder: {config.input_dir}")
    logging.info(f"📂 Master Folder: {config.master_dir}")
    logging.info(f"📂 Output Folder: {config.output_dir}")

    # 2. LẤY SETTING BẬT/TẮT CỦA TỪNG PLATFORM
    settings = data.get("settings", {})
    
    # --- PHASE 1: DOWNLOAD ---
    platforms_to_download = [p for p, s in settings.items() if s.get("download")]
    if platforms_to_download:
        logging.info("\n⬇️ BẮT ĐẦU TÁC VỤ: DOWNLOAD...")
        try:
            dowload.run_download_process(platforms_to_download)
        except Exception as e:
            logging.error(f"❌ Lỗi khi Download: {e}")
    else:
        logging.info("\n⏭️ Bỏ qua tác vụ Download.")

    # --- PHASE 2 & 3: PROCESS VÀ UPLOAD ---
    platforms_to_process = [p for p, s in settings.items() if s.get("on_off")]
    platforms_to_upload = [p for p, s in settings.items() if s.get("upload")]
    
    if platforms_to_process or platforms_to_upload:
        logging.info("\n⚙️ BẮT ĐẦU TÁC VỤ: PROCESS & UPLOAD...")
        try:
            CoreLogic.execute_tasks_process_upload(settings)
        except Exception as e:
            logging.error(f"❌ Lỗi khi Process/Upload: {e}")
    else:
        logging.info("\n⏭️ Bỏ qua tác vụ Process và Upload.")
            
    logging.info("\n✅ TẤT CẢ TIẾN TRÌNH ĐÃ HOÀN TẤT!")

if __name__ == "__main__":
    main()