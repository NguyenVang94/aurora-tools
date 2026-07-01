import os
import glob
import pandas as pd
import logging
from datetime import datetime
import config # Import file config

# --- CÁC HÀM XỬ LÝ CHO TWITTER ---

def tw_setup_directories(source_dir, master_dir, output_dir):
    """Check and create output directory if needed for Twitter."""
    for directory in [source_dir, master_dir]:
        if not os.path.exists(directory):
            logging.error(f"フォルダが見つかりません。: {directory}")
            raise FileNotFoundError(f"フォルダが見つかりません。: {directory}")
    os.makedirs(output_dir, exist_ok=True)

def tw_load_master_file(master_path):
    """Read Master.xlsx and create a mapping dictionary for アカウントID -> CID for Twitter."""
    master_file = os.path.join(master_path, config.TW_MASTER_FILE)
    if not os.path.exists(master_file):
        logging.warning(f"{master_file}にてファイル「Master.xlsx」が見つかりません。")
        return {}
    try:
        df = pd.read_excel(master_file, engine='openpyxl', usecols=["アカウントID", "CID"])
        cid_map = {
            str(row["アカウントID"]).strip(): str(row["CID"]).strip()
            for _, row in df.iterrows()
            if not pd.isna(row["アカウントID"]) and not pd.isna(row["CID"])
        }
        logging.info(f"「Master.xlsx」にて、{len(cid_map)} 件のアカウントID -> CID の紐付けを検出しました。")
        return cid_map
    except FileNotFoundError:
        logging.error(f"「Master.xlsx」ファイルが存在しません:{master_file}")
        return {}
    except Exception as e:
        logging.error(f"「Master.xlsx」の読み込みエラー:{e}")
        return {}

def tw_find_columns(df, target_tweet_id=config.TW_TWEET_ID_COL, target_url=config.TW_URL_COL, target_card_name="カード名"):
    """Chỉ tìm đúng tên cột, không tìm gần giống."""
    found_tweet_id, found_url, found_card_name = None, None, None
    logging.info(f"シートの列一覧：{df.columns.tolist()}")
    for col in df.columns:
        if col == target_tweet_id:
            found_tweet_id = col
        if col == target_url:
            found_url = col
        if col == target_card_name:
            found_card_name = col
    if found_tweet_id:
        logging.info(f"「ツイートID」列を検出:'{found_tweet_id}'")
    else:
        logging.warning(f"'{target_tweet_id}'列が見つかりません。")
    if found_url:
        logging.info(f"ウェブサイトのURLを検出: '{found_url}'")
    else:
        logging.warning(f"'{target_url}'列が見つかりません。")
    if found_card_name:
        logging.info(f"カード名を検出: '{found_card_name}'")
    else:
        logging.warning(f"'カード名'列が見つかりません。")
    return found_tweet_id, found_url, found_card_name


def tw_process_excel_files(directory, pattern=config.TW_SOURCE_PATTERN, extension=config.TW_SOURCE_EXTENSION):
    """Process Excel files containing the pattern in their names for Twitter."""
    search_pattern = os.path.join(directory, f"*{pattern}*{extension}")
    excel_files = [f for f in glob.glob(search_pattern) if not os.path.basename(f).startswith("~$")]

    if not excel_files:
        logging.warning(f"{directory} 内に、パターン「{pattern}」、拡張子「{extension}」のファイルが見つかりません。")
        return []

    all_data = []
    for file_path in excel_files:
        logging.info(f"Excelファイルを処理中：{file_path}")
        try:
            df = pd.read_excel(file_path, sheet_name=config.TW_SHEET_NAME, engine='openpyxl', header=config.TW_HEADER_ROW)
            logging.info(f"シート「{config.TW_SHEET_NAME}」の先頭5行のデータ:\n{df.head(5).to_string()}")
            
            tweet_id_col, url_col, card_name_col = tw_find_columns(df)

            if tweet_id_col is None:
                logging.error(f"{os.path.basename(file_path)} 内に「ツイートID」列が見つかりません。")
                continue

            required_cols = [tweet_id_col]
            if url_col:
                required_cols.append(url_col)
            if card_name_col:
                required_cols.append(card_name_col)
            
            df_filtered = df[required_cols]

            tweet_url_card_pairs = set()
            for _, row in df_filtered.iterrows():
                if tweet_id_col in row and not pd.isna(row[tweet_id_col]) and str(row[tweet_id_col]).strip().startswith('i'):
                    tweet_id = str(row[tweet_id_col]).strip()
                    url = str(row[url_col]).strip() if url_col and url_col in df.columns and not pd.isna(row[url_col]) else ""
                    card_name = str(row[card_name_col]).strip() if card_name_col and card_name_col in df.columns and not pd.isna(row[card_name_col]) else ""
                    tweet_url_card_pairs.add((tweet_id, url, card_name))

            unique_pairs = list(tweet_url_card_pairs)
            logging.info(f"{os.path.basename(file_path)} 内で、有効な「ツイートID-URL-カード名」のペアを {len(unique_pairs)} 件検出しました。")
            all_data.extend(unique_pairs)

        except Exception as e:
            logging.error(f"{file_path} の処理中にエラー：{e}")
            continue

    return all_data

def tw_process_csv_files(directory, pattern=config.TW_CSV_PATTERN, extension=config.TW_CSV_EXTENSION):
    """Process CSV files containing the pattern in their names for mapping for Twitter."""
    search_pattern = os.path.join(directory, f"*{pattern}*{extension}")
    csv_files = [f for f in glob.glob(search_pattern) if not os.path.basename(f).startswith("~$")]
    
    if not csv_files:
        logging.warning(f"Can't find file  '{pattern}' with '{extension}' in {directory}")
        return []
    
    mapping_data = []
    for file_path in csv_files:
        logging.info(f"紐付け用CSVファイルを処理中：{file_path}")
        try:
            df = pd.read_csv(file_path, encoding='utf-8-sig', usecols=config.TW_REQUIRED_CSV_COLS)
            
            missing_cols = [col for col in config.TW_REQUIRED_CSV_COLS if col not in df.columns]
            if missing_cols:
                logging.warning(f"{os.path.basename(file_path)} に列が不足しています：{missing_cols}")
                continue
            
            for _, row in df.iterrows():
                tweet_id = str(row["ツイートID"]).strip() if not pd.isna(row["ツイートID"]) else None
                if tweet_id and tweet_id.startswith('CA-'):
                    mapping_data.append({
                        "tweet_id": tweet_id,
                        "アカウントID": str(row["アカウントID"]).strip() if not pd.isna(row["アカウントID"]) else "",
                        "キャンペーンID": str(row["キャンペーンID"]).strip() if not pd.isna(row["キャンペーンID"]) else "",
                        "キャンペーン名": str(row["広告キャンペーン名"]).strip() if not pd.isna(row["広告キャンペーン名"]) else "",
                        "広告グループID": str(row["広告グループID"]).strip() if not pd.isna(row["広告グループID"]) else "",
                        "広告グループ名": str(row["広告グループ名"]).strip() if not pd.isna(row["広告グループ名"]) else "",
                        "relation ID": str(row["relationID"]).strip() if not pd.isna(row["relationID"]) else ""
                    })
        except Exception as e:
            logging.error(f"{file_path} の処理中にエラー：{e}")
            continue
    
    return mapping_data

def tw_save_unmapped_data(unmapped_data, output_dir, current_date, filename_prefix="missingTWID"):
    """Save unmapped data to yymmdd_missingTWID_Template2.csv or similar."""
    if not os.access(output_dir, os.W_OK):
        logging.error(f"ディレクトリへの書き込み権限がありません：{output_dir}")
        return

    output_file = os.path.join(output_dir, f"{current_date}_{filename_prefix}_Template2.csv")
    if unmapped_data:
        try:
            unmapped_df = pd.DataFrame(unmapped_data, columns=config.TW_OUTPUT_COLUMNS)
            unmapped_df.to_csv(output_file, index=False, encoding='utf-8-sig')
            logging.info(f"{filename_prefix} のデータ（{len(unmapped_data)} 行）をファイルに保存しました：{output_file}")
        except Exception as e:
            logging.error(f"ファイル書き込みエラー：{output_file} - {e}")
    else:
        logging.info(f"{filename_prefix} に保存するデータがありません。")

def tw_process_files(directory, master_path, output_dir, cid_map):
    """Process Excel, CSV, and Master files to generate output DataFrame for Twitter."""
    current_date = datetime.now().strftime("%y%m%d")
    tw_setup_directories(directory, master_path, output_dir)
    
    mapping_data = tw_process_csv_files(directory)
    excel_data = tw_process_excel_files(directory)
    
    complete_output_data = []
    missing_twid_data = []

    for tweet_id, url, card_name in excel_data:
        modified_id = f"CA-{tweet_id[1:]}"
        matched_mappings = [m for m in mapping_data if m["tweet_id"] == modified_id]
        
        is_incomplete = not matched_mappings or not url or not card_name

        base_output_row = {col: "" for col in config.TW_OUTPUT_COLUMNS}
        base_output_row.update({
            "Action": config.TW_ACTION,
            "媒体ID": config.TW_MEDIA_ID,
            "広告ID": modified_id,
            "パラメ発行済みURL": url,
            "告名": card_name
        })

        if is_incomplete:
            missing_twid_data.append(base_output_row)
            if not matched_mappings:
                logging.warning(f"広告ID {modified_id} の紐付けが見つかりません")
            else:
                logging.warning(f"広告ID {modified_id} は、URLまたは広告名が欠損しているため除外します。")
        else:
            for mapping in matched_mappings:
                account_id = mapping["アカウントID"]
                cid = cid_map.get(account_id, "")
                
                row_to_add = base_output_row.copy()
                row_to_add.update({
                    "CID": cid,
                    "アカウントID": account_id,
                    "キャンペーンID": mapping["キャンペーンID"],
                    "キャンペーン名": mapping["キャンペーン名"],
                    "広告グループID": mapping["広告グループID"],
                    "広告グループ名": mapping["広告グループ名"],
                    "relation ID": mapping["relation ID"]
                })
                
                complete_output_data.append(row_to_add)
                
                if cid:
                    logging.info(f"広告ID {modified_id} をCID {cid} に紐付けました。")
                else:
                    logging.warning(f"広告ID {modified_id} は紐付け済みですが、CIDがありません（アカウントID: {account_id}）。")

    tw_save_unmapped_data(missing_twid_data, output_dir, current_date, "missingTWID")
    
    output_df = pd.DataFrame(complete_output_data, columns=config.TW_OUTPUT_COLUMNS)
    logging.info(f"データが不完全だった {len(missing_twid_data)} 行を最終出力から除外しました。")
    
    return output_df