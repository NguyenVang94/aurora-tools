# =================================================================================
#       HẰNG SỐ VÀ CẤU HÌNH CHUNG
# =================================================================================
import os

# --- THƯ MỤC (được set bởi configure_paths() khi run_cli.py nhận input_path/master_path
# từ UI — không còn giá trị mặc định nào hợp lý nếu 2 thứ này chưa được chọn) ---
input_dir = None
source_dir = None
output_dir = None
download_dir = None
master_dir = None

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
LINE_INPUT_DIR = None
LINE_MASTER_FILE = None
LINE_OUTPUT_DIR = None
LINE_ERROR_LOG_FILE = None
LINE_DUPLICATE_LOG_FILE = None
LINE_MISSING_COMBINATIONS_FILE = None
LINE_NAN_ROWS_FILE = None
LINE_MISSING_IDS_FILE = None
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


# --- CÁC FILE NẰM TRONG MASTER FOLDER (do configure_paths() tính lại mỗi khi master_dir đổi) ---
user_file = None
master_folder = None
cookie_path = None
TEMPLATE2_FILE = None
UPLOAD_LOG_FILE = None
creds_path = None
CM_COOKIE_PATH = None

# OUTPUT
source_folder = None

URL_TARGET = "https://ca-rpa.cloud/en/parameter-storage/manager"
URL_LOGIN = "https://ca-rpa.cloud/login"
URL_BASE = "https://ca-rpa.cloud/"
COOKIE_FILENAME = "cloud_cookies.json"

# --- GOOGLE SHEETS ---
spreadsheet_url = "https://docs.google.com/spreadsheets/d/1sw_eGCeogGVz9q_yqiDDhUVdWXM1AHgrhObQdTgyDU0/edit?gid=0#gid=0"

CM_BASE_URL = "https://consulting-manager.jp/"
CM_TARGET_URL_TEMPLATE = "https://consulting-manager.jp/assetExport?client_id={client_id}&media_id={media_id}"

# Media ID mapping for downloader
CM_MEDIA_IDS = {
    "Facebook": "1020",
    "Twitter": "1021",
    "Line": "9191"
}

# --- FILERUN ---
destination_base = r'\\vnfs\share\04_SEM\007.PARAMETER_STORAGE'


def configure_paths(input_path, master_path):
    """Điểm set path DUY NHẤT, gọi 1 lần từ run_cli.py sau khi nhận Input/Master Folder
    từ UI. Output và Download tự suy ra là 2 thư mục cùng cấp với Input (không cần user
    chọn tay), Master là thư mục user tự chọn/tái sử dụng giữa nhiều lần chạy."""
    global input_dir, source_dir, output_dir, download_dir, master_dir
    global user_file, master_folder, cookie_path, TEMPLATE2_FILE, UPLOAD_LOG_FILE
    global creds_path, CM_COOKIE_PATH, source_folder
    global LINE_INPUT_DIR, LINE_MASTER_FILE, LINE_OUTPUT_DIR, LINE_ERROR_LOG_FILE
    global LINE_DUPLICATE_LOG_FILE, LINE_MISSING_COMBINATIONS_FILE, LINE_NAN_ROWS_FILE
    global LINE_MISSING_IDS_FILE

    input_dir = input_path
    source_dir = input_path

    parent_dir = os.path.dirname(input_path)
    output_dir = os.path.join(parent_dir, 'output')
    os.makedirs(output_dir, exist_ok=True)
    # download_dir chỉ thực sự được tạo (trong Downloader.py) khi có file cần tải.
    download_dir = os.path.join(parent_dir, 'download')
    source_folder = output_dir

    master_dir = master_path
    master_folder = master_dir
    user_file = os.path.join(master_dir, 'User.xlsx')
    cookie_path = os.path.join(master_dir, COOKIE_FILENAME)
    TEMPLATE2_FILE = os.path.join(master_dir, 'Template2.xlsx')
    UPLOAD_LOG_FILE = os.path.join(master_dir, 'upload_log.xlsx')
    creds_path = os.path.join(master_dir, 'credentials.json')
    CM_COOKIE_PATH = os.path.join(master_dir, 'consulting_cookies.json')

    LINE_INPUT_DIR = input_dir
    LINE_MASTER_FILE = os.path.join(master_dir, 'Master.xlsx')
    LINE_OUTPUT_DIR = output_dir
    LINE_ERROR_LOG_FILE = os.path.join(output_dir, 'master2_error_log.txt')
    LINE_DUPLICATE_LOG_FILE = os.path.join(output_dir, 'duplicate_campaigns.csv')
    LINE_MISSING_COMBINATIONS_FILE = os.path.join(output_dir, 'missing_combinations.csv')
    LINE_NAN_ROWS_FILE = os.path.join(output_dir, 'nan_rows_master2.csv')
    LINE_MISSING_IDS_FILE = os.path.join(output_dir, 'missingLineID_Template2.csv')
