# Downloader.py

import time
import json
import os
import shutil
import zipfile
import logging
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException

import config

def login_and_save_cookie(driver, username, password):
    """
    Thực hiện đăng nhập vào consulting-manager.jp.
    Ưu tiên dùng cookie, nếu thất bại thì đăng nhập thủ công và lưu lại cookie mới.
    Trả về True nếu đăng nhập thành công, ngược lại trả về False.
    """
    login_successful = False

    # 1. Thử đăng nhập bằng cookie
    if os.path.exists(config.CM_COOKIE_PATH):
        logging.info("Đã tìm thấy file cookie của Consulting Manager. Thử đăng nhập...")
        driver.get(config.CM_BASE_URL)
        with open(config.CM_COOKIE_PATH, "r") as file:
            cookies = json.load(file)
        for cookie in cookies:
            try:
                driver.add_cookie(cookie)
            except Exception:
                pass
        
        driver.get(config.CM_BASE_URL) 
        time.sleep(2)
        
        if "login" not in driver.current_url.lower():
            logging.info("✅ Đăng nhập bằng cookie thành công!")
            login_successful = True
        else:
            logging.warning("Cookie đã hết hạn. Chuyển sang đăng nhập thủ công.")
            os.remove(config.CM_COOKIE_PATH)

    # 2. Nếu đăng nhập cookie thất bại, đăng nhập thủ công
    if not login_successful:
        logging.info("Bắt đầu đăng nhập thủ công vào Consulting Manager...")
        driver.get(config.CM_BASE_URL)
        try:
            user_field = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.XPATH, "//input[@type='text' or @type='email']")))
            user_field.send_keys(username)
            
            driver.find_element(By.XPATH, "//input[@type='password']").send_keys(password)
            
            sign_on_button = WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.ID, "signOnButton")))
            driver.execute_script("arguments[0].click();", sign_on_button)
            
            # === SỬA LỖI: THAY THẾ EC.not_ BẰNG LAMBDA FUNCTION ===
            # Chờ đến khi "login" không còn trong URL nữa
            WebDriverWait(driver, 60).until(
                lambda d: "login" not in d.current_url.lower()
            )
            # =======================================================

            logging.info("✅ Đăng nhập thủ công thành công!")
            login_successful = True
            
            logging.info("Lưu cookie mới cho lần chạy sau...")
            with open(config.CM_COOKIE_PATH, 'w') as file:
                json.dump(driver.get_cookies(), file)
            logging.info("✅ Đã lưu cookie mới.")

        except TimeoutException:
            logging.error("❌ Đăng nhập thủ công thất bại. Vui lòng kiểm tra tài khoản hoặc trang web.")
            return False
            
    return login_successful

def perform_download(driver, media_id, client_id):
    """
    Thực hiện tải và giải nén file cho một media_id và client_id cụ thể.
    Hàm này giả định rằng đã đăng nhập thành công.
    """
    target_url = config.CM_TARGET_URL_TEMPLATE.format(client_id=client_id, media_id=media_id)
    logging.info(f"Bắt đầu tải dữ liệu cho Client ID: {client_id}, Media ID: {media_id}")
    logging.info(f"URL đích: {target_url}")
    
    driver.get(target_url)
    wait = WebDriverWait(driver, 120)

    try:
        main_page_element = wait.until(
            EC.presence_of_element_located((By.XPATH, "//button[contains(., '掲載内容出力') or contains(., 'アーカイブを更新')]"))
        )
        
        if "掲載内容出力" in main_page_element.text:
            logging.info("Phát hiện trang tạo file mới. Bắt đầu các bước khởi tạo...")
            main_page_element.click()
            wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'アカウント追加')]"))).click()
            checkbox = wait.until(EC.presence_of_element_located((By.XPATH, "//div[@role='dialog']//thead//input[@type='checkbox']")))
            driver.execute_script("arguments[0].click();", checkbox)
            time.sleep(1)
            wait.until(EC.element_to_be_clickable((By.XPATH, "//div[@role='dialog']//button[contains(., '追加')]"))).click()
            wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., '出力開始')]"))).click()
            logging.info("Đã gửi yêu cầu xuất file. Chờ chuyển trang...")
            wait.until(EC.presence_of_element_located((By.XPATH, "//button[contains(., 'アーカイブを更新')]")))
            logging.info("Đã chuyển tới trang danh sách file.")

        logging.info("Bắt đầu vòng lặp tìm và tải file...")
        loop_timeout = time.time() + 600
        
        # Dọn dẹp thư mục input trước mỗi lần download để đảm bảo chỉ có file mới nhất
        temp_download_dir = os.path.join(config.input_dir, f"temp_{client_id}_{media_id}")
        if os.path.exists(temp_download_dir):
            shutil.rmtree(temp_download_dir)
        os.makedirs(temp_download_dir)
        
        # Cấu hình lại Chrome để tải về thư mục tạm này
        driver.command_executor._commands['send_command'] = ('POST', '/session/$sessionId/chromium/send_command')
        params = {'cmd': 'Page.setDownloadBehavior', 'params': {'behavior': 'allow', 'downloadPath': temp_download_dir}}
        driver.execute("send_command", params)
        
        driver.refresh()
        time.sleep(5)

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
                logging.info(f"Đã click tải file vào: {temp_download_dir}")

                download_wait_timeout = time.time() + 10
                download_successful = False
                while time.time() < download_wait_timeout:
                    zip_files = [f for f in os.listdir(temp_download_dir) if f.endswith('.zip')]
                    temp_files = [f for f in os.listdir(temp_download_dir) if f.endswith('.crdownload')]
                    
                    if zip_files and not temp_files:
                        logging.info(f"✅ Tải file ZIP thành công: {zip_files[0]}")
                        download_successful = True
                        zip_path = os.path.join(temp_download_dir, zip_files[0])
                        
                        try:
                            logging.info(f"Bắt đầu giải nén file: {zip_path}")
                            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                                # Giải nén và chuyển file vào thư mục input chính
                                for file_info in zip_ref.infolist():
                                    # Tránh giải nén các file hệ thống của macOS
                                    if not file_info.filename.startswith('__MACOSX/'):
                                        zip_ref.extract(file_info, config.input_dir)
                            logging.info(f"✅ Giải nén thành công vào thư mục: {config.input_dir}")
                        except Exception as e:
                            logging.error(f"❌ Lỗi trong quá trình giải nén: {e}")
                        finally:
                            # Dọn dẹp thư mục tạm
                            shutil.rmtree(temp_download_dir)

                        break
                    
                    time.sleep(2)

                if download_successful:
                    return True
                else:
                    logging.warning("Tải file không thành công, có thể file lớn. Refresh và thử lại...")
                    driver.refresh()
                    time.sleep(5)
                    
            except TimeoutException:
                logging.info("File chưa sẵn sàng để tải. Refresh và chờ...")
                driver.refresh()
                time.sleep(15)
                
        logging.error("❌ Hết thời gian chờ (10 phút), không thể tải file.")
        return False

    except Exception as e:
        logging.error(f"❌ Đã xảy ra lỗi khi tải cho Client ID {client_id}: {e}")
        return False