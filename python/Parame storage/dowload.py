# dowload.py
import time
import json
import os
import shutil
import zipfile
from datetime import datetime
from urllib.parse import urlparse, parse_qs
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import pandas as pd
import logging

# Import các module tùy chỉnh
import config
from utils import get_and_validate_username

# --- THÔNG TIN CẤU HÌNH ---
BASE_URL = "https://consulting-manager.jp/"

def get_target_urls():
    """Đọc URL từ file Excel được định nghĩa trong config."""
    try:
        df_urls = pd.read_excel(
            config.CONSULTING_EXCEL_PATH,
            sheet_name=0,
            usecols='D',
            header=None
        )
        url_list = df_urls[df_urls.columns[0]].dropna().astype(str).tolist()
        url_list = [url for url in url_list if url.startswith('http')]

        if not url_list:
            raise ValueError("Không tìm thấy URL hợp lệ.")
        logging.info(f"Đã tìm thấy {len(url_list)} URL trong file Consulting.xlsx.")
        return url_list
    except FileNotFoundError:
        logging.error(f"❌ LỖI: Không tìm thấy file Excel tại: {config.CONSULTING_EXCEL_PATH}")
        return []
    except Exception as e:
        logging.error(f"❌ LỖI khi đọc file Excel: {e}")
        return []

def create_filename_from_url(url, unique_timestamp=False):
    """Tạo tên file từ URL."""
    try:
        parsed_url = urlparse(url)
        query_params = parse_qs(parsed_url.query)
        client_id = query_params.get('client_id', ['UNKNOWN_CLIENT'])[0]
        media_id = query_params.get('media_id', ['UNKNOWN_MEDIA'])[0]
        date_str = datetime.now().strftime("%Y%m%d")
        filename = f"{client_id}_{media_id}_掲載内容_{date_str}"
        if unique_timestamp:
            filename = f"{filename}{datetime.now().strftime('_%H%M%S_%f')}"
        return "".join(c for c in filename if c.isalnum() or c in ('-', '_')).rstrip()
    except Exception:
        return f"download_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"

def perform_automated_task(driver, target_url, username, password, progress_message=""):
    """Thực hiện tải file cho một URL."""
    logging.info(f"\n========================================================")
    logging.info(f"{progress_message} Bắt đầu xử lý URL: {target_url}")
    wait = WebDriverWait(driver, 10)

    # --- Đăng nhập ---
    logging.info("Bắt đầu đăng nhập...")
    driver.get(target_url)
    try:
        # Nếu đã có sẵn session từ lần đăng nhập trước, sẽ không cần làm gì
        WebDriverWait(driver, 5).until(EC.url_contains("media_id="))
        logging.info("Đã đăng nhập từ phiên trước.")
    except TimeoutException:
        # Nếu không, thực hiện đăng nhập
        try:
            logging.info("Chuyển hướng đến trang đăng nhập...")
            WebDriverWait(driver, 120).until(
                EC.presence_of_element_located((By.XPATH, "//input[@type='text' or @type='email']"))
            )
            driver.find_element(By.XPATH, "//input[@type='text' or @type='email']").send_keys(username)
            driver.find_element(By.XPATH, "//input[@type='password']").send_keys(password)
            sign_on_button = WebDriverWait(driver, 120).until(EC.element_to_be_clickable((By.ID, "signOnButton")))
            driver.execute_script("arguments[0].click();", sign_on_button)
            WebDriverWait(driver, 120).until(EC.url_contains("media_id="))
            logging.info("Đăng nhập thành công.")
        except (TimeoutException, NoSuchElementException):
            logging.warning("Không tìm thấy form đăng nhập hoặc đã đăng nhập sẵn. Tiếp tục...")

    # --- Xuất file và tải về ---
    main_page_element = wait.until(
        EC.presence_of_element_located((By.XPATH, "//button[contains(., '掲載内容出力') or contains(., 'アーカイブを更新')]"))
    )
    if "掲載内容出力" in main_page_element.text:
        logging.info("Phát hiện trang tạo file mới, thực hiện các bước cần thiết...")
        main_page_element.click()
        wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'アカウント追加')]"))).click()
        checkbox = wait.until(EC.presence_of_element_located((By.XPATH, "//div[@role='dialog']//thead//input[@type='checkbox']")))
        driver.execute_script("arguments[0].click();", checkbox)
        time.sleep(1)
        wait.until(EC.element_to_be_clickable((By.XPATH, "//div[@role='dialog']//button[contains(., '追加')]"))).click()
        wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., '出力開始')]"))).click()
        logging.info("Đã gửi yêu cầu xuất file. Chờ trang danh sách tải...")
        wait.until(EC.presence_of_element_located((By.XPATH, "//button[contains(., 'アーカイブを更新')]")))
        logging.info("Đã chuyển tới trang danh sách file.")

    logging.info("\nBắt đầu vòng lặp 'Tải và Kiểm tra Thư mục'...")
    loop_timeout = time.time() + 600
    time.sleep(3)
    driver.refresh()
    download_successful = False
    extract_dirname = create_filename_from_url(target_url, unique_timestamp=False) 
    
    while time.time() < loop_timeout:
        try:
            menu_button = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//tbody/tr[1]/td[last()]//button"))
            )
            menu_button.click()
            time.sleep(1)

            download_button = WebDriverWait(driver, 3).until(
                EC.element_to_be_clickable((By.XPATH, "//li[@role='menuitem' and .//p[contains(text(), 'ZIPダウンロード')]]"))
            )
            driver.execute_script("arguments[0].click();", download_button)
            logging.info("Đã gửi lệnh tải file. Bắt đầu kiểm tra thư mục...")

            download_wait_timeout = time.time() + 10
            
            zip_files_before = set(f for f in os.listdir(config.DOWNLOADS_DIR) if f.endswith('.zip'))

            while time.time() < download_wait_timeout:
                zip_files_after = set(f for f in os.listdir(config.DOWNLOADS_DIR) if f.endswith('.zip'))
                temp_files = [f for f in os.listdir(config.DOWNLOADS_DIR) if f.endswith('.crdownload')]
                
                new_zip_files = list(zip_files_after - zip_files_before)
                
                if new_zip_files and not temp_files:
                    original_zip_name = new_zip_files[0]
                    zip_path = os.path.join(config.DOWNLOADS_DIR, original_zip_name)
                    
                    logging.info(f"✅ Tải file thành công: {original_zip_name}")
                    download_successful = True
                    
                    final_zip_name = create_filename_from_url(target_url, unique_timestamp=True) + ".zip"
                    final_zip_path = os.path.join(config.DOWNLOADS_DIR, final_zip_name)
                    os.rename(zip_path, final_zip_path)
                    logging.info(f"✅ Đã đổi tên và giữ lại file ZIP: {final_zip_name}")

                    final_extract_dir = os.path.join(config.DOWNLOADS_DIR, extract_dirname)
                    try:
                        logging.info(f"Bắt đầu giải nén vào thư mục: {final_extract_dir}")
                        if os.path.exists(final_extract_dir):
                            shutil.rmtree(final_extract_dir)
                        os.makedirs(final_extract_dir)
                        
                        with zipfile.ZipFile(final_zip_path, 'r') as zip_ref:
                            zip_ref.extractall(final_extract_dir)
                        logging.info(f"✅ Giải nén thành công! File lưu tại: {final_extract_dir}")
                    except Exception as e:
                        logging.error(f"❌ Lỗi trong quá trình giải nén: {e}")
                    
                    break
                
                time.sleep(1)

            if download_successful:
                break
            else:
                logging.warning(f"Tải file không thành công. Làm mới trang và thử lại...")
                driver.refresh()
                time.sleep(2)
                
        except TimeoutException:
            logging.info("Không tìm thấy nút tải (file chưa sẵn sàng). Làm mới trang và thử lại...")
            driver.refresh()
            time.sleep(2)
            
    if not download_successful:
        raise TimeoutException(f"Sau 5 phút, vẫn không thể tải được file cho URL: {target_url}")

    logging.info(f"✅ Hoàn thành tải file cho URL: {target_url}")
    return True

def run_download_process():
    """Hàm chính điều khiển toàn bộ quy trình download."""
    logging.info("\n" + "="*50)
    logging.info(" BẮT ĐẦU QUY TRÌNH TẢI FILE 掲載ダウンロード ")
    logging.info("="*50)

    # --- Cấu hình thư mục tải về ---
    download_dir = config.DOWNLOADS_DIR
    if os.path.exists(download_dir):
        shutil.rmtree(download_dir)
    os.makedirs(download_dir)
    logging.info(f"Thư mục tải về được đặt tại: {download_dir}")

    chrome_options = webdriver.ChromeOptions()
    chrome_options.add_argument("--headless=new") # Chạy ẩn
    chrome_options.add_argument("--window-size=1920,1080")
    prefs = {"download.default_directory": download_dir}
    chrome_options.add_experimental_option("prefs", prefs)
    driver = webdriver.Chrome(options=chrome_options)
    
    try:
        target_urls = get_target_urls()
        if not target_urls:
            raise Exception("Không có URL nào để xử lý.")

        username = get_and_validate_username()
        password = str(pd.read_excel(config.user_file).iloc[0, 1])
        
        total_urls = len(target_urls)
        completed_count = 0
        for index, url in enumerate(target_urls):
            progress = f"[{index + 1}/{total_urls} file]"
            try:
                perform_automated_task(driver, url, username, password, progress)
                completed_count += 1
            except Exception as e:
                logging.error(f"\n❌ LỖI: Không thể tải file {progress} (URL: {url}).")
                logging.error(f"Chi tiết lỗi: {e}")

    except Exception as e:
        logging.error(f"\n❌ Đã xảy ra lỗi nghiêm trọng: {e}")
    finally:
        if driver:
            logging.info("Đóng trình duyệt download...")
            driver.quit()
        
        logging.info("="*50)
        logging.info(" KẾT THÚC QUY TRÌNH TẢI FILE. ")
        logging.info("="*50 + "\n")
        
        # Tạo dictionary kết quả để trả về
        success_rate = f"{completed_count}/{total_urls}" if total_urls > 0 else "N/A"
        is_success = completed_count == total_urls and total_urls > 0
        
        title = "✅ Hoàn Thành Tải File" if is_success else "⚠️ Quy Trình Đã Kết Thúc"
        
        message = (
            f"Tổng số URL cần download: {total_urls}\n"
            f"Số file hoàn thành: {completed_count}\n"
            f"Tỷ lệ thành công: {success_rate}\n\n"
            f"Dữ liệu được lưu tại thư mục 'downloads'."
        )
        
        # Trả về một dictionary chứa kết quả
        return {"title": title, "message": message, "is_success": is_success}

# Dùng để test riêng file này nếu cần
if __name__ == "__main__":
    run_download_process()