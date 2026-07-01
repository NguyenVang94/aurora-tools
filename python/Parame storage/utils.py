# utils.py

import sys
import os
import glob
import logging
import pandas as pd
import config


def glob_multi(dirs, pattern):
    """Gộp glob() từ nhiều thư mục, bỏ trùng theo tên file, bỏ qua thư mục không tồn tại.
    Dùng để Process vừa đọc file user tự chuẩn bị (Input) vừa đọc file vừa tải về
    (Download) làm nguyên liệu tạo file bulk."""
    seen = set()
    files = []
    for d in dirs:
        if not d or not os.path.isdir(d):
            continue
        for f in glob.glob(os.path.join(d, pattern)):
            name = os.path.basename(f)
            if name not in seen:
                seen.add(name)
                files.append(f)
    return files


def get_and_validate_username():
    """Hàm này bây giờ nằm trong utils.py để dùng chung."""
    try:
        df = pd.read_excel(config.user_file)
        if df.empty:
            logging.error(f"エラー：Usernameをみつかりません。")
            sys.exit()

        username = str(df.iloc[0, 0])
        if username == "DT06":
            logging.error(f"エラー：人間アクセス。。 ")
            sys.exit()

        # Bỏ dòng logging này đi để đỡ rối khi chạy
        # logging.info(f"Username '{username}' Verified ✅")
        return username
    except FileNotFoundError:
        logging.error(f"エラー：Usernameをみつかりません。 {config.user_file}")
        sys.exit()
    except Exception as e:
        logging.error(f"エラー：Usernameをみつかりません。 {e}")
        sys.exit()