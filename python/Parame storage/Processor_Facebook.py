import os
import pandas as pd
import logging
import config
from utils import glob_multi

# CÁC HÀM XỬ LÝ CHO FACEBOOK

def process_facebook_data(input_dir, output_dir, cid_map):
    # Tìm ở cả Input Folder (user tự đặt thủ công) lẫn Download Folder (vừa tải về)
    search_pattern = f"*{config.FB_CSV_PATTERN}*{config.FB_CSV_EXTENSION}"
    fb_files = glob_multi([input_dir, config.download_dir], search_pattern)

    if not fb_files:
        logging.info("FacebookのエクスポートCSVファイルが見つかりません。")
        return None

    all_processed_rows = []
    all_app_store_link_rows = []

    for file_path in fb_files:
        logging.info(f"Facebookファイルを処理中：{file_path}")

        df = None
        encodings_to_try = ['utf-8-sig', 'utf-16', 'shift_jis', 'cp932', 'utf-8']
        for encoding in encodings_to_try:
            try:
                df = pd.read_csv(file_path, sep='\t', engine='python', on_bad_lines='warn', dtype=str, encoding=encoding)
                logging.info(f"ファイル「{os.path.basename(file_path)}」の読み込みに成功しました（エンコーディング：{encoding}）。")
                break
            except Exception:
                continue

        if df is None:
            logging.error(f"ファイル「{os.path.basename(file_path)}」を読み込めません。スキップします。")
            continue

        try:
            google_play_url = "http://play.google.com/store/apps"
            apple_store_url = "http://itunes.apple.com/app"
            
            extra_link_cols = [f'Product {i} - Link' for i in range(1, 10)] + \
                              [f'Additional Link {i}' for i in range(1, 10)]
            existing_extra_link_cols = [col for col in extra_link_cols if col in df.columns]

            for index, row in df.iterrows():
                row_account_id = ''
                row_cid = 'empty'
                current_hash = row.get('Image Hash') if pd.notna(row.get('Image Hash')) else ''

                if current_hash and ':' in current_hash:
                    row_account_id = f"CA-{current_hash.split(':')[0]}"
                    row_cid = cid_map.get(row_account_id, "empty")
                
                main_link = row.get('Link', '')

                base_data = {
                    "Action": config.FB_ACTION, 
                    "媒体ID": config.FB_MEDIA_ID, 
                    "アカウントID": row_account_id,
                    "CID": row_cid,
                    'キャンペーンID': str(row.get('Campaign ID', '')).replace('cg:', 'CA-'),
                    'キャンペーン名': str(row.get('Campaign Name', '')),
                    '広告グループID': str(row.get('Ad Set ID', '')).replace('c:', 'CA-'),
                    '広告グループ名': str(row.get('Ad Set Name', '')),
                    '広告ID': str(row.get('Ad ID', '')).replace('a:', 'CA-'),
                    '告名': str(row.get('Ad Name', '')),
                    'relation ID': '', 'キーワードID': '', 'キーワード名': '', 'マッチタイプ': '', 'ドラフト停止日': ''
                }
                
                if pd.notna(main_link) and main_link.strip() != '':
                    main_row = base_data.copy()
                    main_row['パラメ発行済みURL'] = main_link
                    if google_play_url in main_link or apple_store_url in main_link:
                        all_app_store_link_rows.append(main_row)
                    else:
                        all_processed_rows.append(main_row)

                processed_extra_links = set() 
                for col_name in existing_extra_link_cols:
                    extra_link = row.get(col_name, '')
                    if pd.notna(extra_link) and extra_link.strip() != '' and extra_link != main_link and extra_link not in processed_extra_links:
                        processed_extra_links.add(extra_link)
                        extra_row = base_data.copy()
                        extra_row['パラメ発行済みURL'] = extra_link
                        if google_play_url in extra_link or apple_store_url in extra_link:
                            all_app_store_link_rows.append(extra_row)
                        else:
                            all_processed_rows.append(extra_row)
        
        except Exception as e:
            logging.error(f"ファイル「{os.path.basename(file_path)}」のデータ処理中にエラー：{e}")
            continue

    if all_app_store_link_rows:
        missing_df = pd.DataFrame(all_app_store_link_rows, columns=config.FB_OUTPUT_COLUMNS)
        missing_file_path = os.path.join(output_dir, 'missingFacebookID_Template2.csv')
        missing_df.to_csv(missing_file_path, index=False, encoding='utf-8-sig')
        logging.info(f"アプリストアへのリンクを含む {len(missing_df)} 行をファイルに保存しました：{missing_file_path}")

    if not all_processed_rows:
        logging.warning("全てのFacebookファイルに、処理可能な有効な行（アプリリンク以外）はありませんでした。")
        return pd.DataFrame(columns=config.FB_OUTPUT_COLUMNS)

    fb_results_df = pd.DataFrame(all_processed_rows, columns=config.FB_OUTPUT_COLUMNS)
    logging.info(f"処理完了。{len(fb_files)}個のファイルから合計{len(fb_results_df)}件の有効なデータを取得しました。")
    return fb_results_df