# =================================================================================
#       HẰNG SỐ VÀ CẤU HÌNH CHUNG
# =================================================================================
import os
import sys

# --- THƯ MỤC CƠ SỞ ---
# Bám theo vị trí file .exe (khi đóng gói PyInstaller) hoặc vị trí script (khi chạy
# dev) thay vì hard-code path máy cụ thể, để tool chạy được trên mọi máy mà không
# cần user tự tạo sẵn cây thư mục "パラメー" ngoài Desktop.
if getattr(sys, 'frozen', False):
    base_dir = os.path.dirname(sys.executable)
else:
    base_dir = os.path.dirname(os.path.abspath(__file__))

input_dir = os.path.join(base_dir, 'input')
source_dir = os.path.join(base_dir, 'input')
master_dir = os.path.join(base_dir, 'master')
output_dir = os.path.join(base_dir, 'output')
DOWNLOADS_DIR = os.path.join(base_dir, 'downloads')

# HẰNG SỐ TW (Twitter)
TW_SOURCE_PATTERN = "入稿"
TW_SOURCE_EXTENSION = "*.xlsm"
TW_CSV_PATTERN = "掲載内容"
TW_CSV_EXTENSION = "*.csv"
TW_MEDIA_ID = "1021"
TW_ACTION = "add"
TW_MASTER_FILE = "Master.xlsx"
TW_SHEET_NAME = "ツイート設計シート"
TW_TWEET_ID_COL = "ツイートID"
TW_URL_COL = "ウェブサイトのURL"
TW_HEADER_ROW = 16  # Row 17 in Excel (0-based index)
TW_REQUIRED_CSV_COLS = [
    "ツイートID", "アカウントID", "キャンペーンID", "広告キャンペーン名",
    "広告グループID", "広告グループ名", "relationID"
]
TW_OUTPUT_COLUMNS = [
    "Action", "媒体ID", "CID", "アカウントID", "キャンペーンID", "キャンペーン名",
    "広告グループID", "広告グループ名", "広告ID", "告名", "relation ID",
    "キーワードID", "キーワード名", "マッチタイプ", "パラメ発行済みURL", "ドラフト停止日"
]

# HẰNG SỐ LINE (Line)
LINE_INPUT_DIR = os.path.join(base_dir, 'input')
LINE_MASTER_FILE = os.path.join(base_dir, 'master', 'Master.xlsx')
LINE_OUTPUT_DIR = os.path.join(base_dir, 'output')
LINE_ERROR_LOG_FILE = os.path.join(LINE_OUTPUT_DIR, 'master2_error_log.txt')
LINE_DUPLICATE_LOG_FILE = os.path.join(LINE_OUTPUT_DIR, 'duplicate_campaigns.csv')
LINE_MISSING_COMBINATIONS_FILE = os.path.join(LINE_OUTPUT_DIR, 'missing_combinations.csv')
LINE_NAN_ROWS_FILE = os.path.join(LINE_OUTPUT_DIR, 'nan_rows_master2.csv')
LINE_MISSING_IDS_FILE = os.path.join(LINE_OUTPUT_DIR, 'missingLineID_Template2.csv')
LINE_MASTER_REQUIRED_COLS = ['アカウントID', 'CID']
LINE_MASTER2_REQUIRED_COLS = ['Campaign name', 'Campaign ID', 'Ad group name', 'Ad group ID', 'Ad name', 'Ad ID']
LINE_INPUT_REQUIRED_COLS = ['アカウントID', 'キャンペーン名', '広告グループ名', '広告名', 'リンク先URL1']
LINE_OUTPUT_COLUMNS = [
    'Action', '媒体ID', 'CID', 'アカウントID', 'キャンペーンID', 'キャンペーン名', '広告グループID',
    '広告グループ名', '広告ID', '告名', 'relation ID', 'キーワードID', 'キーワード名', 'マッチタイプ',
    'パラメ発行済みURL', 'ドラフト停止日'
]
LINE_MEDIA_ID = '9191'
LINE_ACTION = 'add'


# HẰNG SỐ FACEBOOK ---
FB_CSV_PATTERN = "export"
FB_CSV_EXTENSION = "*.csv"
FB_MEDIA_ID = "1020"
FB_ACTION = "add"
FB_OUTPUT_COLUMNS = [
    "Action", "媒体ID", "CID", "アカウントID", "キャンペーンID", "キャンペーン名",
    "広告グループID", "広告グループ名", "広告ID", "告名", "relation ID",
    "キーワードID", "キーワード名", "マッチタイプ", "パラメ発行済みURL", "ドラフト停止日"
]


# User
user_file = os.path.join(master_dir, 'User.xlsx')
consulting_file = os.path.join(master_dir, 'Consulting.xlsx')
master_folder = master_dir

URL_TARGET = "https://ca-rpa.cloud/en/parameter-storage/manager"
URL_LOGIN = "https://ca-rpa.cloud/login"
URL_BASE = "https://ca-rpa.cloud/"
COOKIE_FILENAME = "cloud_cookies.json"
cookie_path = os.path.join(base_dir, COOKIE_FILENAME)

# --- FILE CONSULTING ---
CONSULTING_EXCEL_PATH = os.path.join(master_dir, 'Consulting.xlsx')
CONSULTING_COOKIE_PATH = base_dir

# Template2
TEMPLATE2_FILE = os.path.join(master_dir, 'Template2.xlsx')

# DATA BASE
UPLOAD_LOG_FILE = os.path.join(master_dir, 'upload_log.xlsx')

# OUTPUT
source_folder = output_dir

# --- GOOGLE SHEETS ---
creds_path = os.path.join(base_dir, 'credentials.json')
spreadsheet_url = "https://docs.google.com/spreadsheets/d/1sw_eGCeogGVz9q_yqiDDhUVdWXM1AHgrhObQdTgyDU0/edit?gid=0#gid=0"


CM_BASE_URL = "https://consulting-manager.jp/"
CM_TARGET_URL_TEMPLATE = "https://consulting-manager.jp/assetExport?client_id={client_id}&media_id={media_id}"
CM_COOKIE_PATH = os.path.join(base_dir, 'consulting_cookies.json')

# Media ID mapping for downloader
CM_MEDIA_IDS = {
    "Facebook": "1020",
    "Twitter": "1021",
    "Line": "9191"
}

# --- FILERUN ---
destination_base = r'\\vnfs\share\04_SEM\007.PARAMETER_STORAGE'

# Đảm bảo folder "master" luôn tồn tại ngay từ lần đầu tiên tool được chạy, để user
# chỉ cần copy Master.xlsx/User.xlsx/Consulting.xlsx/Template2.xlsx vào là dùng được,
# không phải tự tạo cây thư mục.
os.makedirs(master_dir, exist_ok=True)
