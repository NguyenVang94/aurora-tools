# dowload.py
import os
import glob
import logging

import pandas as pd
from selenium import webdriver

import config
from utils import get_and_validate_username
from Processor_Twitter import tw_load_master_file
import Downloader

FB_ENCODINGS_TO_TRY = ['utf-8-sig', 'utf-16', 'shift_jis', 'cp932', 'utf-8']


def _discover_line_account_ids():
    """Lấy toàn bộ アカウントID trong file 入稿*.xlsm (sheet 'AD入稿') đang có sẵn
    trong Input Folder."""
    ids = set()
    pattern = os.path.join(config.input_dir, '*入稿*.xlsm')
    for file_path in glob.glob(pattern):
        try:
            df = pd.read_excel(file_path, sheet_name='AD入稿', header=14, usecols=['アカウントID'])
            ids.update(df['アカウントID'].dropna().astype(str).str.strip())
        except Exception as e:
            logging.warning(f"Không đọc được アカウントID từ {os.path.basename(file_path)} (LINE): {e}")
    return ids


def _discover_twitter_account_ids():
    """Lấy toàn bộ アカウントID trong file 入稿*.xlsm (sheet ツイート設計シート) của
    Twitter, nếu sheet có cột này."""
    ids = set()
    pattern = os.path.join(config.input_dir, f"*{config.TW_SOURCE_PATTERN}*{config.TW_SOURCE_EXTENSION.lstrip('*')}")
    for file_path in glob.glob(pattern):
        if os.path.basename(file_path).startswith("~$"):
            continue
        try:
            df = pd.read_excel(file_path, sheet_name=config.TW_SHEET_NAME, engine='openpyxl', header=config.TW_HEADER_ROW)
            if 'アカウントID' not in df.columns:
                logging.warning(f"{os.path.basename(file_path)} (Twitter) không có cột 'アカウントID', bỏ qua.")
                continue
            ids.update(df['アカウントID'].dropna().astype(str).str.strip())
        except Exception as e:
            logging.warning(f"Không đọc được アカウントID từ {os.path.basename(file_path)} (Twitter): {e}")
    return ids


def _discover_facebook_account_ids():
    """Suy ra アカウントID từ cột 'Image Hash' của file export*.csv (Facebook), theo
    đúng cách process_facebook_data() đang dùng (CA-<phần trước dấu ':'>)."""
    ids = set()
    pattern = os.path.join(config.input_dir, f"*{config.FB_CSV_PATTERN}*{config.FB_CSV_EXTENSION}")
    for file_path in glob.glob(pattern):
        df = None
        for encoding in FB_ENCODINGS_TO_TRY:
            try:
                df = pd.read_csv(file_path, sep='\t', engine='python', on_bad_lines='warn', dtype=str, encoding=encoding)
                break
            except Exception:
                continue
        if df is None or 'Image Hash' not in df.columns:
            logging.warning(f"Không đọc được cột 'Image Hash' từ {os.path.basename(file_path)} (Facebook).")
            continue
        hashes = df['Image Hash'].dropna().astype(str)
        hashes = hashes[hashes.str.contains(':')]
        ids.update('CA-' + hashes.str.split(':').str[0])
    return ids


PLATFORM_DISCOVERERS = {
    'line': _discover_line_account_ids,
    'twitter': _discover_twitter_account_ids,
    'facebook': _discover_facebook_account_ids,
}


def get_target_client_media_pairs(platforms_to_download):
    """Với mỗi nền tảng đang bật công tắc "掲載ダウンロード", tự động dò アカウントID
    có sẵn trong Input Folder rồi tra CID tương ứng trong Master.xlsx — user không
    cần khai báo thủ công trong Consulting.xlsx nữa."""
    wanted_platforms = [p.lower() for p in (platforms_to_download or []) if p.lower() in PLATFORM_DISCOVERERS]
    if not wanted_platforms:
        logging.info("Không có nền tảng nào được chọn để Download.")
        return []

    cid_map = tw_load_master_file(config.master_dir)
    pairs = []
    seen = set()
    for platform in wanted_platforms:
        media_id = config.CM_MEDIA_IDS.get(platform.capitalize())
        account_ids = PLATFORM_DISCOVERERS[platform]()
        if not account_ids:
            logging.warning(f"Không tìm thấy アカウントID nào trong Input Folder cho {platform.upper()}.")
            continue

        for account_id in account_ids:
            cid = cid_map.get(account_id)
            if not cid:
                logging.warning(f"アカウントID '{account_id}' ({platform.upper()}) không có CID tương ứng trong Master.xlsx.")
                continue
            key = (cid, media_id)
            if key not in seen:
                seen.add(key)
                pairs.append(key)

    logging.info(f"Đã xác định {len(pairs)} Client (CID) cần tải dựa trên dữ liệu trong Input Folder.")
    return pairs


def run_download_process(platforms_to_download=None):
    """Đăng nhập Consulting Manager và tải 掲載内容 cho các nền tảng được chọn,
    giải nén trực tiếp vào Input Folder để Phase 2 (Process) dùng ngay."""
    logging.info("\n" + "="*50)
    logging.info(" BẮT ĐẦU QUY TRÌNH TẢI FILE 掲載ダウンロード ")
    logging.info("="*50)

    pairs = get_target_client_media_pairs(platforms_to_download)
    if not pairs:
        logging.warning("Không có Client/Media nào cần tải. Kiểm tra lại dữ liệu trong Input Folder hoặc Master.xlsx.")
        return {
            "title": "⏭️ Không có gì để tải",
            "message": "Không tìm thấy アカウントID nào trong Input Folder khớp với Master.xlsx cho các nền tảng đã chọn.",
            "is_success": True
        }

    os.makedirs(config.input_dir, exist_ok=True)

    chrome_options = webdriver.ChromeOptions()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--window-size=1920,1080")
    driver = webdriver.Chrome(options=chrome_options)

    total = len(pairs)
    completed_count = 0
    try:
        username = get_and_validate_username()
        password = str(pd.read_excel(config.user_file).iloc[0, 1])

        if not Downloader.login_and_save_cookie(driver, username, password):
            raise Exception("Đăng nhập Consulting Manager thất bại.")

        for index, (client_id, media_id) in enumerate(pairs):
            progress = f"[{index + 1}/{total}]"
            logging.info(f"\n{progress} Client ID: {client_id} - Media ID: {media_id}")
            try:
                if Downloader.perform_download(driver, media_id, client_id):
                    completed_count += 1
            except Exception as e:
                logging.error(f"❌ Lỗi khi tải Client {client_id} / Media {media_id}: {e}")

    except Exception as e:
        logging.error(f"\n❌ Đã xảy ra lỗi nghiêm trọng: {e}")
    finally:
        driver.quit()
        logging.info("="*50)
        logging.info(" KẾT THÚC QUY TRÌNH TẢI FILE. ")
        logging.info("="*50 + "\n")

        success_rate = f"{completed_count}/{total}" if total > 0 else "N/A"
        is_success = completed_count == total and total > 0
        title = "✅ Hoàn Thành Tải File" if is_success else "⚠️ Quy Trình Đã Kết Thúc"
        message = (
            f"Tổng số Client (CID) cần tải: {total}\n"
            f"Số file hoàn thành: {completed_count}\n"
            f"Tỷ lệ thành công: {success_rate}\n\n"
            f"Dữ liệu đã được giải nén trực tiếp vào Input Folder."
        )
        return {"title": title, "message": message, "is_success": is_success}


# Dùng để test riêng file này nếu cần
if __name__ == "__main__":
    run_download_process(list(config.CM_MEDIA_IDS.keys()))
