import os
import sys
import shutil
import json
import pandas as pd
from datetime import datetime
import logging
import time
import gspread
from google.oauth2.service_account import Credentials
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from cryptography.fernet import Fernet
import config
from utils import get_and_validate_username

FERNET_KEY = b'nN8KSpSvpPV9UujNdU11mUCcXoKQee5CzkxjwaPWTy4=' 

def run_filerun():
    try:
        now = datetime.now()
        yyyymmdd = now.strftime('%Y%m%d')
        month_folder_name = now.strftime('%m月')

        try:
            username = get_and_validate_username()
            if not username:
                print("エラー: Usernameをみつかりません。")
                return
            print(f"Username情報を読み済です。. Username: {username}")
        except Exception as e:
            print(f"Excelファイルの読み取り中に不明なエラーが発生しました {e}.")
            return

        destination_folder = os.path.join(
            config.destination_base,
            month_folder_name,
            yyyymmdd,
            f"{yyyymmdd}★{username}"
        )

        print(f"Source directory: {config.output_dir}")
        print(f"Destination folder: {destination_folder}")

        if not os.path.exists(destination_folder):
            os.makedirs(destination_folder)
            print(f"Destination folder created {destination_folder}")

        files_in_source = os.listdir(config.output_dir)
        if not files_in_source:
            print(f"Source directory '{config.output_dir}' empty, can't copy file")
            return

        print(f"\nCopy starting...")
        copied_count = 0
        for file_name in files_in_source:
            source_path = os.path.join(config.output_dir, file_name)
            if os.path.isfile(source_path):
                if "empty" not in file_name and "missing" not in file_name:
                    destination_path = os.path.join(destination_folder, file_name)
                    shutil.copy2(source_path, destination_path)
                    print(f" ✅ Copied: {file_name}")
                    copied_count += 1
                else:
                    print(f" ❌ Ignore: {file_name} (contains 'empty' or 'missing')")
        print(f"\n Done! Copied {copied_count} file. ✅")
    except Exception as e:
        print(f"An unexpected error occurred while copying the file: {e}")

def upload_data_to_google_sheet(processed_df):
    print("\n ngưng sử dụng hàm upload_data_to_google_sheet")

def log_successful_upload(file_path_to_log):
    try:
        log_df = pd.read_excel(file_path_to_log, engine='openpyxl', dtype=str)
        log_df['Timestamp'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        cols = log_df.columns.tolist()
        cols = ['Timestamp'] + [col for col in cols if col != 'Timestamp']
        log_df = log_df[cols]

        if os.path.exists(config.UPLOAD_LOG_FILE):
            existing_df = pd.read_excel(config.UPLOAD_LOG_FILE, engine='openpyxl')
            db_columns = existing_df.columns
            log_df_aligned = log_df.reindex(columns=db_columns)
            combined_df = pd.concat([existing_df, log_df_aligned], ignore_index=True)
            combined_df.to_excel(config.UPLOAD_LOG_FILE, index=False, engine='openpyxl')
        else:
            log_df.to_excel(config.UPLOAD_LOG_FILE, index=False, engine='openpyxl')
        print(f"💾 Databaseに全て記載されていました！: {os.path.basename(file_path_to_log)}")
    except Exception as e:
        print(f"❗️ Databaseの記載エラーが発生しました。: {e}")
        
        
def encrypt_cookies(cookies_list: list, key: bytes = FERNET_KEY) -> str:
    """
    Encrypt a list of cookies.

    Args:
        cookies_list: List of cookie dictionaries
        key: Fernet encryption key (32-byte base64-encoded)

    Returns:
        Encrypted string (base64url encoded Fernet token)

    Raises:
        ValueError: If cookies_list is empty or None
    """
    if not cookies_list:
        raise ValueError("No cookies provided")

    cookies_str = json.dumps(cookies_list, ensure_ascii=False)
    cookies_bytes = cookies_str.encode('utf-16')

    fernet = Fernet(key)
    encrypted_bytes = fernet.encrypt(cookies_bytes)

    return encrypted_bytes.decode('utf-8')


def decrypt_cookies(encrypted_str: str, key: bytes = FERNET_KEY) -> list | None:
    """
    Decrypt an encrypted cookie string.

    Args:
        encrypted_str: Base64url encoded Fernet token
        key: Fernet encryption key (32-byte base64-encoded)

    Returns:
        List of cookie dictionaries, or None if decryption fails
    """
    try:
        fernet = Fernet(key)
        encrypted_bytes = encrypted_str.encode('utf-8')
        decrypted_bytes = fernet.decrypt(encrypted_bytes)
        decrypted_str = decrypted_bytes.decode('utf-16')

        return json.loads(decrypted_str)

    except Exception as e:
        logging.error(f"Decryption error: {e}")
        return None


def save_encrypted_cookies(cookies_list: list, file_path: str, key: bytes = FERNET_KEY) -> bool:
    """
    Encrypt cookies and save to file.

    Args:
        cookies_list: List of cookie dictionaries
        file_path: Destination file path
        key: Fernet encryption key

    Returns:
        True if successful, False otherwise
    """
    try:
        encrypted_str = encrypt_cookies(cookies_list, key)

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(encrypted_str)

        logging.info(f"Cookies saved to {file_path}")
        return True

    except Exception as e:
        logging.warning(f"Failed to save cookies: {e}")
        return False


def load_encrypted_cookies(file_path: str, key: bytes = FERNET_KEY) -> list | None:
    """
    Load and decrypt cookies from file.

    Args:
        file_path: Source file path
        key: Fernet encryption key

    Returns:
        List of cookie dictionaries, or None if failed
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            encrypted_str = f.read()

        return decrypt_cookies(encrypted_str, key)

    except FileNotFoundError:
        logging.warning(f"Cookie file not found: {file_path}")
        return None
    except Exception as e:
        logging.error(f"Failed to load cookies: {e}")
        return None
    

def perform_automated_login(driver, username, password, cookie_path):
    try:
        print("アカウントで自動ログインを開始します...")
        driver.get(config.URL_LOGIN)
        login_button = WebDriverWait(driver, 60).until(
            EC.element_to_be_clickable((By.XPATH, "//button[normalize-space()='Login']"))
        )
        driver.execute_script("arguments[0].click();", login_button)
        
        WebDriverWait(driver, 60).until(
            EC.presence_of_element_located((By.XPATH, "//input[@type='text' or @type='email']"))
        )
        driver.find_element(By.XPATH, "//input[@type='text' or @type='email']").send_keys(username)
        driver.find_element(By.XPATH, "//input[@type='password']").send_keys(password)

        sign_on_button = WebDriverWait(driver, 120).until(EC.element_to_be_clickable((By.ID, "submit")))
        driver.execute_script("arguments[0].click();", sign_on_button)
        
        print("ログイン後にリダイレクトを待機しています。。。。")
        WebDriverWait(driver, 120).until(EC.url_contains("schedule"))
        
        for _ in range(3):
            try:
                driver.get(config.URL_TARGET)
                WebDriverWait(driver, 2).until(EC.url_to_be(config.URL_TARGET))
                break
            except Exception:
                time.sleep(2)
        else:
            print("ページのリフレッシュまたは遷移に失敗しました。")
        
        WebDriverWait(driver, 5).until(EC.url_to_be(config.URL_TARGET))
        print("✅ 自動ログインとリダイレクトが成功しました！")
        print("新しい Cookie を保存しています。。。")
        time.sleep(1)
        # with open(cookie_path, 'w') as file:
        #     json.dump(driver.get_cookies(), file)
        save_encrypted_cookies(driver.get_cookies(), cookie_path)
        print(f"💾 新しい Cookie が保存されました: {cookie_path}")
        return True
    except Exception as e:
        print(f"❌ 自動ログイン中にエラーが発生しました: {e}")
        try:
            print(f"記録された最終 URL: {driver.current_url}")
        except:
            pass
        return False
    
    

def run_auto_uploader(platforms_to_upload):
    try:
        df = pd.read_excel(config.user_file)
        username = get_and_validate_username()
        password = str(df.iloc[0, 1])
        if not username or not password:
            print("エラー:Excelファイルでユーザー名またはパスワードが見つかりません。アップロード処理を終了します。")
            return
        print(f"ログイン情報の読み込みに成功しました。ユーザー名： {username}")
    except Exception as e:
        print(f"エラー：指定されたパスにファイルが見つかりません。 {e}")
        return

    all_files_in_output = os.listdir(config.output_dir)
    files_to_upload = []
    for filename in all_files_in_output:
        if filename.endswith('.xlsx') and '_empty_' not in filename and 'missing' not in filename:
            if any(platform.lower() in filename.lower() for platform in platforms_to_upload):
                files_to_upload.append(os.path.join(config.output_dir, filename))
    
    logging.info(f"自動アップロード対象の媒体: {', '.join(platforms_to_upload)}")

    if not files_to_upload:
        print("選択された媒体に対するアップロード対象の有効なファイルが見つかりません。アップロード処理を終了します。")
        return

    driver = webdriver.Chrome(service=ChromeService(ChromeDriverManager().install()))
    login_successful = False
    try:
        if os.path.exists(config.cookie_path):
            cookies = load_encrypted_cookies(config.cookie_path)
            if cookies:
                driver.get(config.URL_BASE)
                for cookie in cookies:
                    try:
                        driver.add_cookie(cookie)
                    except Exception:
                        pass
                driver.get(config.URL_TARGET)
                time.sleep(3)
                if "login" not in driver.current_url:
                    print("Cookie を使用したログインに成功しました!")
                    login_successful = True
                else:
                    print("Cookieの有効期限が切れています。アカウントで再度ログインしています。。。")
                    os.remove(config.cookie_path)
            else:
                print("\nCookie ファイルが見つかりました。自動的にログインしようとしています...")
        
        if not login_successful:
            login_successful = perform_automated_login(driver, username, password, config.cookie_path)

        if login_successful:
            print("\nファイルのアップロードを開始します...")
            for index, file_path in enumerate(files_to_upload):
                filename = os.path.basename(file_path)
                print(f"\n--- [{index + 1}/{len(files_to_upload)}] {filename}: 処理を開始---")
                upload_successful = False
                retry_count = 0
                driver.get(config.URL_TARGET)
                time.sleep(1)
                while not upload_successful and retry_count < 3:
                    try:
                        driver.get(config.URL_TARGET)
                        time.sleep(1)
                        WebDriverWait(driver, 3).until(
                            EC.presence_of_element_located((By.XPATH, "//input[@role='combobox']"))
                        )
                        time.sleep(1)

                        search_cid = filename.split('_')[1][:6]
                        print(f"➞[第 {retry_count + 1}回] '{search_cid}'CIDを選択します。。。")
                        search_input = WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.XPATH, "//input[@role='combobox']")))
                        search_input.clear()
                        search_input.send_keys(search_cid)

                        print("➞CIDを入力")
                        search_result_xpath = f"//*[starts-with(normalize-space(.), '{search_cid}') and contains(@class, 'option')]"
                        search_result_element = WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.XPATH, search_result_xpath)))
                        search_result_element.click()
                        time.sleep(1)

                        print("➞ファイルをアップロード")
                        upload_input = WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.XPATH, "//input[@type='file']")))
                        upload_input.send_keys(file_path)
                        time.sleep(1)

                        upload_buttons = driver.find_elements(By.XPATH, "//button[.//span[text()='Upload']]")
                        if upload_buttons:
                            btn = upload_buttons[-1]
                            driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", btn)
                            time.sleep(1)
                            driver.execute_script("arguments[0].click();", btn)
                            print("➞'Upload Data'を押しました。")

                            confirm_btn = WebDriverWait(driver, 15).until(
                                EC.element_to_be_clickable((By.XPATH, "//button[.//span[normalize-space(text())='Confirm Upload'] or contains(., 'Confirm Upload')]"))
                            )
                            driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", confirm_btn)
                            time.sleep(1)
                            driver.execute_script("arguments[0].click();", confirm_btn)
                            print("➞'Confirm Upload'を押しました。")
                        else:
                            raise Exception("Upload button not found.")
                        
                        log_successful_upload(file_path)
                        upload_successful = True
                        print(f"🟢 {filename}をアップロード成功しました！")
                        time.sleep(1)
                    except Exception as file_error:
                        retry_count += 1
                        print(f" {filename}:操作中にエラーが発生しました {file_error}")
                        print(f"   -> 5秒後に再試行します。 ({retry_count}回目の試行 )")
                        time.sleep(2)

            print("\n==============================================")
            print("すべてのファイルの処理が完了しました！")
            print("==============================================")
        else:
            print("\nログイン失敗した。アップ不可です。")
    except Exception as e:
        print(f"\nアップロード処理中のエラー: {e}")
    finally:
        time.sleep(2)
        print("ブラウザーを終了します。")
        driver.quit()