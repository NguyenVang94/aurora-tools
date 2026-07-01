import logging
import sys
from selenium.common.exceptions import TimeoutException
import shutil
import json
from datetime import datetime
import openpyxl
from charset_normalizer import detect
from Upload import run_auto_uploader, run_filerun, upload_data_to_google_sheet

# Configure logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)


# def check_encoding(file_path):
#     """Kiểm tra encoding của file."""
#     try:
#         with open(file_path, 'rb') as file:
#             result = detect(file.read())
#             encoding = result['encoding']
#             return encoding
#     except Exception as e:
#         logging.error(f"Error when check encoding of {file_path}: {e}")
#         return None

# def read_csv_with_fallback(file_path, expected_encoding=None, sep=','):
#     """read file CSV với các encoding thử nghiệm và dấu phân tách."""
#     encodings = [expected_encoding] if expected_encoding else ['utf-8-sig', 'utf-8', 'utf-16', 'latin1', 'cp1252']
#     for encoding in encodings:
#         try:
#             df = pd.read_csv(file_path, encoding=encoding, sep=sep)
#             logging.info(f"read file {file_path} sucssecful with encoding {encoding} and '{sep}'")
#             return df, encoding
#         except UnicodeDecodeError:
#             logging.info(f"can't read file {file_path} with {encoding}, try next encoding...")
#         except Exception as e:
#             logging.error(f"Eror when read file {file_path} với {encoding}: {e}")
#     raise ValueError(f"can't read file {file_path} with any encoding in {encodings}")

# def merge_with_template2(input_df, template_file_path, output_dir, media):
#     """入力DataFrameをTemplate.xlsxとマージし、CIDごとにExcelファイルとして分割して出力する。"""
#     try:
#         df = pd.read_excel(user_file)
#         username = get_and_validate_username()

#         # 1. Excelテンプレートファイルの存在確認
#         if not os.path.exists(template_file_path):
#             raise FileNotFoundError(f"テンプレートファイルが見つかりません: {template_file_path}")

#         # 2. Excelファイルを読み込む
#         logging.info(f"テンプレートファイルを読み込んでいます: {template_file_path}")
#         template_df = pd.read_excel(template_file_path, engine='openpyxl', dtype=str)
#         template_df = template_df.fillna('')

#         logging.info("テンプレートファイルの列:")
#         logging.info(template_df.columns.tolist())
        
#         # 3. 入力データとテンプレートの列を比較
#         if not all(col in template_df.columns for col in input_df.columns):
#             missing_cols = [col for col in input_df.columns if col not in template_df.columns]
#             raise ValueError(f"入力データの列がテンプレートと一致しません！不足している列: {missing_cols}")
        
#         # 4. データフレームを結合
#         combined_df = pd.concat([template_df, input_df], ignore_index=True)
        
#         current_date = datetime.now().strftime("%y%m%d")
#         combined_df['CID'] = combined_df['CID'].astype(str).replace('nan', '').replace('.0', '')
        
#         # 5. CIDごとにグループ化してファイルを出力
#         cid_groups = combined_df.groupby('CID')
        
#         logging.info("CIDに基づいてファイルを分割・Excel形式で出力します...")
#         for cid, group in cid_groups:
#             cid_prefix = str(cid).strip() if cid and len(str(cid).strip()) >= 6 else 'empty'
            
#             # ▼ 変更点 1: 出力ファイル名の拡張子を .xlsx に変更
#             output_file = os.path.join(output_dir, f'{username}★{current_date}_{cid_prefix}_{media}_Template2.xlsx')
            
#             try:
#                 # ▼ 変更点 2: to_excel() を使ってExcelファイルとして保存
#                 group.to_excel(output_file, index=False, engine='openpyxl')
#                 logging.info(f"CID '{cid}' の出力ファイル ({len(group)}行) を保存しました: {output_file}")
#             except PermissionError:
#                 logging.error(f"書き込み権限がありません: {output_file}")
        
#     except FileNotFoundError as e:
#         logging.error(f"エラー: {e}")
#     except ValueError as e:
#         logging.error(f"エラー: {e}")
#     except Exception as e:
#         logging.error(f"不明なエラーが発生しました: {e}", exc_info=True)

if __name__ == "__main__":
    try:
        # Chạy bước 1 và nhận về 2 kết quả
        output_df, continue_processing, should_upload ,should_run_filerun = run_parameter_generation()
        
        print("===============================================================================")
        print("=== ステップ➊：パラメータファイル作成プロセスの開始 ===")
        print("===============================================================================")
           
        # Chỉ tiếp tục nếu người dùng không chọn "Kết thúc" ở bước 1
        if continue_processing:
            print("\n=====================================================================")
            print("======ステップ➊ 完了 - ファイルが作成されました。 ======")
            print("=====================================================================")
            
            # CHẠY HÀM RUN_FILERUN VÀ HÀM GOOGLE SHEET MỚI
            run_filerun()
            upload_data_to_google_sheet(output_df) # <-- GỌI HÀM MỚI Ở ĐÂY
            
            # Nếu người dùng đã chọn "Có" upload thì mới chạy phần upload
            if should_upload:
                print("\n\n")
                print("=====================================================================")
                print("=== ステップ➋：クラウドへの自動アップロード開始 ===")
                print("=====================================================================")
                run_auto_uploader()
                # run_filerun()
                print("\n=====================================================================")
                print("====== ステップ➋ 完了 - アップロード成功 ======")
                print("=====================================================================")
            else:
                # run_filerun()
                print("\nアップロードしないことが選択されたため、ステップ➋ をスキップします。.")

    except SystemExit as e:
        logging.warning(f"プログラムが停止しました... {e}")
    except Exception as e:
        logging.error(f"メインプロセス実行中のエラー: {e}")
        raise
    
    print("\nすべて完了しました。ご利用いただきありがとうございます。")
    input("Have a nice day, Press Enter to exit...")