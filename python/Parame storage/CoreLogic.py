# CoreLogic.py

import os
import logging
import pandas as pd
from datetime import datetime
# Import các thành phần cần thiết
import config
from Processor_Twitter import tw_process_files, tw_load_master_file
from Processor_Line import line_process_files
from Processor_Facebook import process_facebook_data
from Upload import run_filerun, upload_data_to_google_sheet, run_auto_uploader 
from utils import get_and_validate_username
import dowload
import glob


def merge_with_template2(input_df, media):
    """Hàm này hợp nhất kết quả xử lý với file Template2.xlsx."""
    try:
        username = get_and_validate_username()
        template_file_path = config.TEMPLATE2_FILE
        output_dir = config.output_dir

        if not os.path.exists(template_file_path):
            raise FileNotFoundError(f"テンプレートファイルが見つかりません: {template_file_path}")

        logging.info(f"テンプレートファイルを読み込んでいます: {template_file_path}")
        template_df = pd.read_excel(template_file_path, engine='openpyxl', dtype=str).fillna('')

        if not all(col in template_df.columns for col in input_df.columns):
            missing_cols = [col for col in input_df.columns if col not in template_df.columns]
            raise ValueError(f"入力データの列がテンプレートと一致しません！不足している列: {missing_cols}")

        combined_df = pd.concat([template_df, input_df], ignore_index=True)
        current_date = datetime.now().strftime("%y%m%d")
        combined_df['CID'] = combined_df['CID'].astype(str).replace('nan', '').replace('.0', '')

        cid_groups = combined_df.groupby('CID')
        logging.info("CIDに基づいてファイルを分割・Excel形式で出力します...")
        for cid, group in cid_groups:
            cid_prefix = str(cid).strip() if cid and len(str(cid).strip()) >= 6 else 'empty'
            output_file = os.path.join(output_dir, f'{username}★{current_date}_{cid_prefix}_{media}_Template2.xlsx')
            group.to_excel(output_file, index=False, engine='openpyxl')
            logging.info(f"CID '{cid}' の出力ファイル ({len(group)}行) を保存しました: {output_file}")
    except Exception as e:
        logging.error(f"merge_with_template2 中にエラー: {e}", exc_info=True)

def execute_tasks_process_upload(settings):
    """
    Hàm điều phối chính với 3 pha độc lập: Download, Process, Upload.
    Mỗi hành động sẽ chạy trên các nền tảng được chọn tương ứng.
    """
    # === THAY ĐỔI LOGIC QUAN TRỌNG NHẤT ===
    # "on_off" giờ chỉ có nghĩa là "Process"
    # platforms_to_download = [p.replace(" (twitter)", "").lower() for p, s in settings.items() if s.get("download")]
    platforms_to_process = [p.replace(" (twitter)", "").lower() for p, s in settings.items() if s.get("on_off")]
    platforms_to_upload = [p.replace(" (twitter)", "").lower() for p, s in settings.items() if s.get("upload")]
    
    # ===================================================================
    # --- PHASE 1: DOWNLOAD ---
    # Chạy nếu có ít nhất một công tắc "掲載ダウンロード" được bật.
    # ===================================================================
    # if platforms_to_download:
    #     dowload.run_download_process()
    #     logging.info("====== PHASE 1: DOWNLOAD hoàn tất ======")
    
    if platforms_to_process:
        logging.info("="*50)
        logging.info(f"====== PHASE 2: Bắt đầu PROCESS cho: {', '.join(platforms_to_process)} ======")
        source_dir = config.input_dir
        master_dir = config.master_dir
        output_dir = config.output_dir
        
        cid_map = tw_load_master_file(master_dir) 
        for platform in platforms_to_process:
            logging.info(f"--- Đang xử lý {platform.upper()} ---")
            output_df = None
            if platform == "line": output_df = line_process_files()
            elif platform == "facebook": output_df = process_facebook_data(source_dir, output_dir, cid_map)
            elif platform == "twitter": output_df = tw_process_files(source_dir, master_dir, output_dir, cid_map)
            
            if output_df is not None and not output_df.empty:
                logging.info(f"Xử lý '{platform}' hoàn tất. Dữ liệu: {len(output_df)} dòng.")
                merge_with_template2(output_df, platform.capitalize()) # Viết hoa chữ cái đầu cho tên file
            else:
                logging.warning(f"Không có dữ liệu để xử lý cho {platform}.")
        logging.info("====== PHASE 2: PROCESS hoàn tất ======")

    # ===================================================================
    # --- PHASE 3: UPLOAD ---
    # Chạy nếu có ít nhất một công tắc "自動アップ" được bật.
    # ===================================================================
    if platforms_to_upload:
        logging.info("="*50)
        logging.info(f"====== PHASE 3: Bắt đầu UPLOAD cho: {', '.join(platforms_to_upload)} ======")
        
        # 1. Tìm file trong thư mục output
        files_to_upload = []
        for platform in platforms_to_upload:
            search_pattern = os.path.join(config.output_dir, f"*_{platform.capitalize()}_Template2.xlsx")
            found_files = glob.glob(search_pattern)
            if found_files:
                files_to_upload.extend(found_files)
                logging.info(f"Đã tìm thấy file để upload cho {platform}: {', '.join(os.path.basename(f) for f in found_files)}")
            else:
                logging.warning(f"Không tìm thấy file output nào cho {platform} để upload.")

        if not files_to_upload:
            logging.error("Không có file nào trong thư mục 'output' để thực hiện upload. Dừng tiến trình upload.")
            return

        # 2. Upload lên Google Sheet
        try:
            all_dfs_for_gsheet = [pd.read_excel(f) for f in files_to_upload]
            if all_dfs_for_gsheet:
                final_df_for_gsheet = pd.concat(all_dfs_for_gsheet, ignore_index=True)
                upload_data_to_google_sheet(final_df_for_gsheet)
        except Exception as e:
            logging.error(f"Lỗi khi chuẩn bị dữ liệu cho Google Sheet: {e}")

        # 3. Chạy các tiến trình upload khác
        run_filerun() 
        run_auto_uploader(platforms_to_upload) 
        
        logging.info("====== PHASE 3: UPLOAD hoàn tất ======")