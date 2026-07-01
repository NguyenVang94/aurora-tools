# utils.py

import sys
import logging
import pandas as pd
import config

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