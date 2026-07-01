import undetected_chromedriver as uc
import time
import pandas as pd
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
import random
import sys
import os
import json
import argparse

# Bọc thép chống lỗi Encoding
if sys.stdout is not None:
    sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
if sys.stderr is not None:
    sys.stderr.reconfigure(encoding='utf-8', line_buffering=True)

def human_typing(element, text):
    for char in text:
        element.send_keys(char)
        time.sleep(random.uniform(0.05, 0.25))

def chunk_list(lst, n):
    """Hàm chia nhỏ danh sách thành các cụm n phần tử"""
    for i in range(0, len(lst), n):
        yield lst[i:i + n]

def parse_config():
    """Doc duong dan file Excel va thu muc media duoc Aurora truyen vao qua --config."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=str, default=None)
    args, _ = parser.parse_known_args()

    if not args.config:
        print("❌ Thiếu tham số --config từ Aurora.", flush=True)
        return None, None

    cfg = json.loads(args.config)
    return cfg.get("excel_path"), cfg.get("media_folder")


def main():
    try:
        # 1. NHẬN FILE EXCEL VÀ THƯ MỤC MEDIA TỪ AURORA
        excel_path, folder_path = parse_config()
        if not excel_path or not folder_path:
            print("❌ Thiếu file Excel hoặc thư mục Media.", flush=True)
            return

        df_info = pd.read_excel(excel_path, sheet_name="ツイート設計シート", header=None)
        login_id = str(df_info.iloc[6, 2]).strip()
        password = str(df_info.iloc[7, 2]).strip()
        media_url = str(df_info.iloc[10, 2]).strip()
        print(f"🔑 ID: {login_id} | Đích đến: {media_url}", flush=True)

        image_extensions = ('.jpg', '.jpeg', '.png', '.gif')
        video_extensions = ('.mp4', '.mov')
        
        image_files = []
        video_files = []
        
        for root_dir, subdirs, files in os.walk(folder_path):
            for file in files:
                full_path = os.path.abspath(os.path.join(root_dir, file))
                if file.lower().endswith(image_extensions):
                    image_files.append(full_path)
                elif file.lower().endswith(video_extensions):
                    video_files.append(full_path)
                
        if not image_files and not video_files:
            print(f"❌ Không tìm thấy file media nào hợp lệ trong thư mục.", flush=True)
            return
            
        print(f"📦 Đã tìm thấy: {len(image_files)} Ảnh và {len(video_files)} Video.", flush=True)

        # Chia cụm: 5 ảnh/cụm, 1 video/cụm
        upload_batches = []
        for chunk in chunk_list(image_files, 5):
            upload_batches.append({"type": "images", "files": chunk})
        
        for chunk in chunk_list(video_files, 1):
            upload_batches.append({"type": "video", "files": chunk})

        # =========================================================
        options = uc.ChromeOptions()
        driver = uc.Chrome(options=options, version_main=148)
        wait = WebDriverWait(driver, 20) 

        # ================== QUÁ TRÌNH ĐĂNG NHẬP ==================
        driver.get("https://x.com/i/flow/login")
        time.sleep(random.uniform(3.0, 5.0)) 

        try:
            username_input = wait.until(EC.presence_of_element_located((By.ID, 'jf-input-username_or_email')))
            username_input.click() 
            username_input.send_keys(Keys.CONTROL + "a")
            username_input.send_keys(Keys.DELETE)
            time.sleep(random.uniform(0.5, 1.0))
            
            human_typing(username_input, login_id) 
            time.sleep(random.uniform(0.5, 1.2)) 
            username_input.send_keys(Keys.RETURN)
            time.sleep(random.uniform(2.5, 4.0)) 
            
            password_input = wait.until(EC.presence_of_element_located((By.XPATH, '//input[@name="password"]')))
            password_input.click()
            human_typing(password_input, password)
            time.sleep(random.uniform(0.5, 1.2))
            password_input.send_keys(Keys.RETURN)
            
            wait.until(EC.url_contains("home"))
            print("✅ Đăng nhập thành công!", flush=True)
            time.sleep(random.uniform(2.0, 4.0))
            # driver.minimize_window()
            time.sleep(2)
            
        except Exception as e:
            print(f"❌ Lỗi đăng nhập: {e}", flush=True)
            driver.quit()
            return

        # ================== QUÁ TRÌNH UPLOAD ==================
        driver.get(media_url)
        time.sleep(7) 

        for index, batch in enumerate(upload_batches):
            files_to_upload = batch["files"]
            batch_type = batch["type"]
            paths_string = "\n".join(files_to_upload)
            
            file_names_str = ", ".join([os.path.basename(f) for f in files_to_upload])
            
            upload_success = False
            retry_count = 0
            
            while not upload_success and retry_count < 3:
                try:
                    file_input = wait.until(EC.presence_of_element_located((By.XPATH, '//input[@type="file"]')))
                    file_input.send_keys(paths_string)
                    
                    # Chờ 3s để UI hiển thị thanh tiến trình 読み込み中
                    time.sleep(3)                    
                    upload_status = "timeout" # Mặc định là timeout nếu kẹt quá lâu
                    
                    # Vòng lặp chờ THÔNG MINH (Quét tối đa 5 phút = 150 lần x 2s)
                    for i in range(150): 
                        time.sleep(2) 
                        try:
                            # 1. KIỂM TRA TIẾN TRÌNH TRƯỚC (Đợi tất cả file ngã ngũ)
                            processing_msgs = driver.find_elements(By.XPATH, "//*[contains(text(), '読み込み中') or contains(text(), '処理中')]")
                            
                            if len(processing_msgs) > 0:
                                # Nếu vẫn còn file đang tải/xử lý -> Bỏ qua vòng lặp này, tiếp tục đứng đợi
                                continue 
                            
                            # 2. KHI MÀN HÌNH ĐÃ YÊN TĨNH, BẮT ĐẦU ĐỌC KẾT QUẢ CUỐI CÙNG
                            body_text = driver.find_element(By.TAG_NAME, "body").text
                            
                            if '制限を超過しました' in body_text:
                                upload_status = "rate_limit"
                                break 
                            elif '内部エラー' in body_text or 'アップロードできません' in body_text:
                                upload_status = "internal_error"
                                break
                            elif 'サポートされていません' in body_text or '大きすぎます' in body_text:
                                upload_status = "media_error" # Lỗi do file hỏng/quá nặng/sai định dạng
                                break
                            else:
                                # Không còn file đang chạy & Không tìm thấy chữ báo lỗi -> 100% THÀNH CÔNG
                                upload_status = "success"
                                break
                        except:
                            pass

                    # --- XỬ LÝ KẾT QUẢ SAU KHI THEO DÕI ---
                    if upload_status == "rate_limit":
                        retry_count += 1
                        print(f"⚠️ Phát hiện Rate Limit ở lượt {index + 1}!")
                        print(f"   -> Cho hệ thống ngủ 5 phút (300s). Lần thử {retry_count}/3...")
                        time.sleep(300)
                        driver.refresh()
                        time.sleep(10)
                        
                    elif upload_status == "internal_error" or upload_status == "timeout":
                        retry_count += 1
                        print(f"⚠️ Lỗi máy chủ X (内部エラー) hoặc Quá thời gian ở lượt {index + 1}!")
                        print(f"   -> Tiến hành Tải lại trang và Up lại ngay. Lần thử {retry_count}/3...")
                        driver.refresh()
                        time.sleep(10)
                        
                    elif upload_status == "media_error":
                        # Gặp lỗi cứng này thì không retry nữa, qua lượt up tiếp theo luôn
                        upload_success = True 
                        driver.refresh()
                        time.sleep(7)

                    elif upload_status == "success":
                        upload_success = True
                        print(f"✅ Lượt {index + 1}/{len(upload_batches)} tải lên thành công!", flush=True)
                        
                        cooldown = random.uniform(5.0, 8.0)
                        print(f"   -> Nghỉ {int(cooldown)}s...", flush=True)
                        time.sleep(cooldown)
                        driver.refresh() 
                        time.sleep(7)

                except Exception as e:
                    retry_count += 1
                    time.sleep(5) 
                    driver.refresh()
                    time.sleep(10)

            if not upload_success:
                print(f"❌ BỎ QUA lượt {index + 1} vì thất bại quá 3 lần.", flush=True)

        print("ĐÃ HOÀN THÀNH TOÀN BỘ!", flush=True)
        # driver.maximize_window()
        time.sleep(10)

    except Exception as e:
        print(f"❌ Lỗi hệ thống: {e}", flush=True)
    finally:
        print("kết thúc.")

if __name__ == "__main__":
    main()