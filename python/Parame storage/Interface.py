import sys
import threading
import os
import json
import logging
import time
import CoreLogic
from PySide6.QtWidgets import (
    QApplication, QWidget, QVBoxLayout, QHBoxLayout, 
    QLabel, QPushButton, QCheckBox, QFrame, QGridLayout,
    QPlainTextEdit, QSplitter
)
from PySide6.QtCore import Qt, QSize, Signal, QObject, Property, QPoint, QRectF, QPropertyAnimation, QEasingCurve, QRect, QEvent
from PySide6.QtGui import QFont, QPixmap, QColor, QTextCharFormat, QBrush, QPainter, QIcon
from PySide6.QtCore import QThread, Signal, QObject
from PySide6.QtWidgets import QMessageBox
from PIL import Image, ImageQt
import dowload


# =================================================================================
# WOKER THREAD CHO CÁC TÁC VỤ NỀN TẢNG  
# =================================================================================


class DownloadWorker(QObject):
    """Worker này chỉ thực hiện tác vụ download."""
    finished = Signal(dict) # Phát tín hiệu khi download xong, mang theo kết quả

    def run(self):
        """Chạy tiến trình download và trả về kết quả."""
        logging.info("Bắt đầu tác vụ nền: Download...")
        result = dowload.run_download_process()
        self.finished.emit(result)

class ProcessUploadWorker(QObject):
    """Worker này chỉ thực hiện tác vụ Process và Upload."""
    finished = Signal() # Chỉ cần tín hiệu báo xong, không cần mang dữ liệu

    def __init__(self, settings):
        super().__init__()
        self.settings = settings

    def run(self):
        """Chạy tiến trình process và upload."""
        logging.info("Bắt đầu tác vụ nền: Process & Upload...")
        CoreLogic.execute_tasks_process_upload(self.settings)
        self.finished.emit()

# class Worker(QObject):
#     """
#     Đối tượng Worker sẽ chạy trong một luồng nền để thực hiện các tác vụ nặng
#     mà không làm đơ giao diện.
#     """
#     finished = Signal(dict)  # Tín hiệu sẽ được phát ra khi tác vụ hoàn thành

#     def __init__(self, settings):
#         super().__init__()
#         self.settings = settings

#     def run(self):
#         """Hàm chính, chứa toàn bộ logic chạy nền."""
#         download_result = None
#         try:
#             # === CHẠY PHASE 1: DOWNLOAD ===
#             platforms_to_download = [p for p, s in self.settings.items() if s.get("download")]
#             if platforms_to_download:
#                 # Gọi hàm download và lưu kết quả để hiển thị pop-up
#                 download_result = dowload.run_download_process()
#             else:
#                 logging.info("Bỏ qua Phase 1: Download (không có lựa chọn).")

#             # === CHẠY PHASE 2 & 3: PROCESS VÀ UPLOAD ===
#             platforms_to_process = [p for p, s in self.settings.items() if s.get("on_off")]
#             platforms_to_upload = [p for p, s in self.settings.items() if s.get("upload")]
            
#             if platforms_to_process or platforms_to_upload:
#                  CoreLogic.execute_tasks_process_upload(self.settings)
#             else:
#                 logging.info("Bỏ qua Phase 2 & 3: Process và Upload (không có lựa chọn).")

#         except Exception as e:
#             logging.error(f"Lỗi nghiêm trọng trong luồng Worker: {e}", exc_info=True)
#             # Trong trường hợp lỗi, tạo một kết quả lỗi để báo cáo
#             download_result = {
#                 "title": "❌ Lỗi",
#                 "message": f"Đã xảy ra lỗi nghiêm trọng:\n{e}",
#                 "is_success": False
#             }
#         finally:
#             # Phát tín hiệu `finished` và gửi kết quả về luồng chính
#             self.finished.emit(download_result or {})

# =================================================================================
# LỚP HỖ TRỢ CHUYỂN HƯỚNG PRINT VÀ LOGGING SANG GIAO DIỆN
# =================================================================================
class ConsoleOutputStream(QObject):
    text_written = Signal(str)
    def write(self, text): self.text_written.emit(str(text))
    def flush(self): pass

# =================================================================================
# WIDGET SWITCH TÙY CHỈNH (CÓ ANIMATION)
# =================================================================================
class Switch(QCheckBox):
    def __init__(self, parent=None, app_window=None):
        super().__init__(parent)
        self.app_window = app_window
        self.setFixedSize(45, 25)
        self.setCursor(Qt.PointingHandCursor)

        
        
        self._handle_position = 3
        self._bg_color = QColor("#4C566A")

        self.handle_animation = QPropertyAnimation(self, b"handle_position", self)
        self.handle_animation.setEasingCurve(QEasingCurve.Type.OutCubic)
        self.handle_animation.setDuration(200)

        self.bg_animation = QPropertyAnimation(self, b"bg_color", self)
        self.bg_animation.setDuration(200)

        self.stateChanged.connect(self.start_transition)

    def hitButton(self, pos: QPoint):
        return self.rect().contains(pos)
    
    
    @Property(int)
    def handle_position(self): return self._handle_position
    @handle_position.setter
    def handle_position(self, pos):
        self._handle_position = pos
        self.update()

    @Property(QColor)
    def bg_color(self): return self._bg_color
    @bg_color.setter
    def bg_color(self, color):
        self._bg_color = color
        self.update()

    def start_transition(self, value):
        self.handle_animation.stop()
        self.bg_animation.stop()
        
        if self.app_window:
            theme = self.app_window.themes[self.app_window.current_theme]
            end_bg_color = QColor(theme['accent']) if value else QColor(theme['switch_off_bg'])
            self.bg_animation.setEndValue(end_bg_color)

        end_handle_pos = self.width() - 19 - 3 if value else 3
        self.handle_animation.setEndValue(end_handle_pos)
        
        self.handle_animation.start()
        self.bg_animation.start()
        
    def set_colors(self, theme):
        if self.isChecked():
            self._bg_color = QColor(theme['accent'])
        else:
            self._bg_color = QColor(theme['switch_off_bg'])
        self.update()

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        painter.setPen(Qt.NoPen)
        painter.setBrush(QBrush(self._bg_color))
        painter.drawRoundedRect(QRectF(self.rect()), 12.5, 12.5)
        painter.setBrush(QBrush(QColor("#ffffff")))
        painter.drawEllipse(self._handle_position, 3, 19, 19)
        painter.end()

# =================================================================================
# PHẦN LOGIC BOT CỦA BẠN (Dán code bot của bạn vào đây)
# =================================================================================
def run_main_bot_logic(settings):
    """Hàm tổng hợp, điều khiển toàn bộ logic của bot."""
    logging.info("="*50)
    logging.info("BẮT ĐẦU TÁC VỤ BOT TỪ ỨNG DỤNG PySide")
    logging.info(f"Cài đặt nhận được: {json.dumps(settings, indent=2)}")
    logging.info("="*50)
    
    time.sleep(1)
    if settings.get("line", {}).get("on_off"):
        logging.info("Đang xử lý LINE...")
        time.sleep(1.5)
        logging.info("Xử lý LINE hoàn tất.")
    if settings.get("facebook", {}).get("on_off"):
        logging.info("Đang xử lý FACEBOOK...")
        time.sleep(1.5)
        logging.info("Xử lý FACEBOOK hoàn tất.")
    if settings.get("twitter", {}).get("on_off"):
        logging.info("Đang xử lý X (TWITTER)...")
        time.sleep(1.5)
        logging.info("Xử lý X (TWITTER) hoàn tất.")
    
    logging.info("="*50)
    logging.info("TOÀN BỘ TÁC VỤ ĐÃ HOÀN TẤT!")
    logging.info("="*50)
    
# =================================================================================
# PHẦN GIAO DIỆN DESKTOP (GUI)
# =================================================================================
class App(QWidget):
    def __init__(self):
        super().__init__()
        #                màu nền chính, màu nền phụ, màu container, màu chữ chính, màu chữ phụ, màu accent dòng chữ chạy, màu accent hover, màu borderd đường viền , màu nền bảng console, màu switch off
        self.themes = {
            "light": {"bg_primary": "#E2E1EF", "bg_secondary": "#E2E1EF", "container": "#E2E1EF", "text_primary": "#241D66", "text_secondary": "#241D66", "accent": "#241D66", "accent_hover": "#241D66", "border": "#ffffff", "console_bg": "#bcbcbc", "switch_off_bg": "#CCCCCC"},
            "dark": {"bg_primary": "#2E3440", "bg_secondary": "#3B4252", "container": "#2E3440", "text_primary": "#ffffff", "text_secondary": "#ffffff", "accent": "#007AFF", "accent_hover": "#1C5EC2", "border": "#4C566A", "console_bg": "#222731", "switch_off_bg": "#4C566A"}
        }
        self.current_theme = "dark"
        
        self.setWindowFlags(Qt.FramelessWindowHint | Qt.WindowMinimizeButtonHint)
        self.setAttribute(Qt.WA_TranslucentBackground)
        self.assets_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets")
        self.setWindowIcon(QIcon(os.path.join(self.assets_path, "taskbar_icon.ico")))
        self.resize(990, 695)
        self.setMinimumSize(800, 600)
        self.drag_pos = None
        self.resizing = False
        self.resize_edge = 0
        self.grip_size = 8
        self.setMouseTracking(True)
        self.normal_geometry = None

        self.container = QFrame(self)
        self.container.setObjectName("Container")
        self.main_layout = QVBoxLayout(self)
        self.main_layout.setContentsMargins(0,0,0,0)
        self.main_layout.addWidget(self.container)
        container_layout = QVBoxLayout(self.container)
        container_layout.setContentsMargins(0,0,0,0)
        container_layout.setSpacing(0)

        self.title_bar = QFrame()
        self.title_bar.setObjectName("TitleBar")
        self.title_bar.setFixedHeight(50)
        self.title_bar.setMouseTracking(True)
        
        title_bar_layout = QHBoxLayout(self.title_bar)
        title_bar_layout.setContentsMargins(15, 0, 5, 0)
        
        icon_label = QLabel()
        title_label = QLabel("Parame Storage 2")
        title_label.setFont(QFont("Inter", 12, QFont.Bold))
        
        title_bar_layout.addWidget(icon_label)
        title_bar_layout.addWidget(title_label)
        
        self.theme_switch_label = QLabel("Dark Mode")
        self.theme_switch_label.setFont(QFont("Inter", 10))
        self.theme_switch = Switch(app_window=self)
        self.theme_switch.setChecked(True)
        self.theme_switch.stateChanged.connect(self.toggle_theme)
        
        title_bar_layout.addStretch()
        title_bar_layout.addWidget(self.theme_switch_label)
        title_bar_layout.addWidget(self.theme_switch)

        self.minimize_button = QPushButton("🗕")
        self.maximize_button = QPushButton("🗖")
        self.close_button = QPushButton("🗙")
        
        self.minimize_button.setObjectName("ControlButton")
        self.maximize_button.setObjectName("ControlButton")
        self.close_button.setObjectName("CloseButton")

        self.minimize_button.setFixedSize(45, 45)
        self.maximize_button.setFixedSize(45, 45)
        self.close_button.setFixedSize(45, 45)

        # self.minimize_button.clicked.connect(self.showMinimized)
        self.minimize_button.clicked.connect(self.animate_minimize)
        self.maximize_button.clicked.connect(self.toggle_maximize_restore)
        self.close_button.clicked.connect(self.close)

        title_bar_layout.addWidget(self.minimize_button)
        title_bar_layout.addWidget(self.maximize_button)
        title_bar_layout.addWidget(self.close_button)

        self.splitter = QSplitter(Qt.Horizontal)
        self.control_panel = QWidget()
        self.control_panel.setObjectName("ControlPanel")
        control_layout = QVBoxLayout(self.control_panel)
        control_layout.setContentsMargins(0, 0, 0, 0)
        control_layout.setSpacing(0)
        
        header_widget = QWidget()
        header_widget.setObjectName("HeaderFrame")
        header_widget.setFixedHeight(175    )
        header_layout = QVBoxLayout(header_widget)
        header_layout.setAlignment(Qt.AlignCenter)
        title_label_main = QLabel("")
        title_label_main.setFont(QFont("Inter", 32, QFont.Bold))
        title_label_main.setObjectName("HeaderTitle")
        header_layout.addWidget(title_label_main)

        switches_widget = QWidget()
        switches_layout = QVBoxLayout(switches_widget)
        switches_layout.setContentsMargins(30, 20, 30, 30)
        switches_layout.setSpacing(15)
        
        grid_layout = QGridLayout()
        grid_layout.setHorizontalSpacing(20)
        grid_layout.setVerticalSpacing(20)
        headers = ["媒体", "バルク作成", "掲載ダウンロード", "自動アップ"]
        
        self.header_labels = []
        for i, header in enumerate(headers):
            align = Qt.AlignLeft if i == 0 else Qt.AlignCenter
            label = QLabel(header)
            label.setFont(QFont("Inter", 12))
            label.setObjectName("TableHeader")
            label.setAlignment(align)
            grid_layout.addWidget(label, 0, i, align)
            self.header_labels.append(label)

        self.separator = QFrame()
        self.separator.setFrameShape(QFrame.Shape.HLine)
        self.separator.setObjectName("Separator")
        grid_layout.addWidget(self.separator, 1, 0, 1, 4)

        self.switches = {}
        self.platform_rows_widgets = []
        start_row = 2
        self.create_platform_row(grid_layout, 2, "LINE", "line", "line_logo.png")
        self.create_platform_row(grid_layout, 3, "FACEBOOK", "facebook", "facebook_logo.png")
        self.create_platform_row(grid_layout, 4, "X (TWITTER)", "twitter", "x_logo.png")
        
        switches_layout.addLayout(grid_layout)
        switches_layout.addStretch()
        
        # === THÊM NÚT MỚI VÀO ĐÂY ===
        # Nút kiểm tra Account ID
        self.check_id_button = QPushButton("不足ACCIDチェック")
        # self.check_id_button.setObjectName("CheckButton") # Đặt tên riêng để có thể style khác
        self.check_id_button.setFixedHeight(40)
        self.check_id_button.setFont(QFont("Inter", 14, QFont.Bold))
        self.check_id_button.clicked.connect(self.check_id_button_callback)
        switches_layout.addWidget(self.check_id_button) # Thêm vào layout
        
        
        # Nút chạy chính

        self.run_button = QPushButton("実行")
        self.run_button.setFixedHeight(50)
        self.run_button.setFont(QFont("Inter", 16, QFont.Bold))
        self.run_button.clicked.connect(self.run_button_callback)
        switches_layout.addWidget(self.run_button)

        control_layout.addWidget(header_widget)
        control_layout.addWidget(switches_widget)

        self.console_panel = QWidget()
        self.console_panel.setObjectName("ConsolePanel")
        console_layout = QVBoxLayout(self.console_panel)
        console_layout.setContentsMargins(10, 20, 20, 20)
        
        self.console_title = QLabel("Console Output")
        self.console_title.setFont(QFont("Inter", 16, QFont.Bold))
        
        self.console_output = QPlainTextEdit()
        self.console_output.setReadOnly(True)
        self.console_output.setObjectName("ConsoleOutput")
        
        console_layout.addWidget(self.console_title)
        console_layout.addWidget(self.console_output)

        self.splitter.addWidget(self.control_panel)
        self.splitter.addWidget(self.console_panel)
        self.splitter.setSizes([660, 330])
        
        container_layout.addWidget(self.title_bar)
        container_layout.addWidget(self.splitter)
        
        self.stdout_stream = ConsoleOutputStream()
        self.stdout_stream.text_written.connect(self.append_text_to_console)
        sys.stdout = self.stdout_stream
        
        self.stderr_stream = ConsoleOutputStream()
        self.stderr_stream.text_written.connect(self.append_text_to_console)
        sys.stderr = self.stderr_stream
        
        self.update_theme()

    def update_theme(self):
        theme = self.themes[self.current_theme]
        assets_path_for_qss = self.assets_path.replace(os.sep, '/')
        self.setStyleSheet(f"""
            #Container {{
                background-color: {theme['bg_primary']};
                border-radius: 10px;
                border: 1px solid {theme['border']};
            }}
            #TitleBar {{
                background-color: {theme['bg_secondary']};
                border-top-left-radius: 10px;
                border-top-right-radius: 10px;
                color: {theme['text_primary']};
            }}
            #ControlButton, #CloseButton {{
                background-color: transparent; border: none; font-size: 16px;
                color: {theme['text_secondary']};
            }}
            #ControlButton:hover {{ background-color: {theme['border']}; }}
            #CloseButton:hover {{ background-color: #BF616A; }}
            #ControlPanel {{ background-color: {theme['bg_primary']}; }}
            #ConsolePanel {{ background-color: {theme['bg_secondary']}; }}
            #HeaderFrame {{
                border-image: url({assets_path_for_qss}/header_bg.png) 0 0 0 0 stretch stretch;
                border-radius: 0px;
            }}
            #HeaderTitle {{ color: white; background: transparent; }}
            QLabel, #ConsoleTitle {{ color: {theme['text_primary']}; }}
            #TableHeader {{ color: {theme['text_secondary']};font-weight: bold; }}
            #Separator {{ background-color: {theme['border']}; }}
            #ConsoleOutput {{
                background-color: {theme['console_bg']};
                border: 1px solid {theme['border']};
                border-radius: 5px;
                font-family: "Consolas", "Courier New", monospace; font-size: 13px;
                color: {theme['text_primary']};
            }}
            QPushButton {{
                background-color: {theme['accent']}; color: #FFFFFF;
                border: none; border-radius: 8px; font-weight: bold;
            }}
            QPushButton:hover {{ background-color: {theme['accent_hover']}; }}
            QPushButton:disabled {{ background-color: {theme['border']}; }}
            
            #CheckButton {{
                background-color: {theme['bg_secondary']};
                color: {theme['text_primary']};
                border: 1px solid {theme['border']};
            }}
            #CheckButton:hover {{
                background-color: {theme['border']};
            }}
            #CheckButton:disabled {{
                background-color: {theme['border']};
                color: {theme['text_secondary']};
            }}
            
        """)
        for widgets in self.platform_rows_widgets:
            for switch in widgets['switches'].values():
                switch.set_colors(theme)
            widgets['name_label'].setStyleSheet(f"color: {theme['text_primary']}")
        
        self.theme_switch.set_colors(theme)

    def animate_minimize(self):
        # Tạo animation cho thuộc tính 'độ trong suốt' của cửa sổ
        self.minimize_animation = QPropertyAnimation(self, b"windowOpacity")
        self.minimize_animation.setDuration(300) # Làm mờ trong 200ms
        self.minimize_animation.setStartValue(1.0) # Bắt đầu: Rõ 100%
        self.minimize_animation.setEndValue(0.0)   # Kết thúc: Mờ 0% (trong suốt)
        
        # Sau khi làm mờ xong, GỌI HÀM THU NHỎ THỰC SỰ
        self.minimize_animation.finished.connect(self.showMinimized)
        
        self.minimize_animation.start()
        
    def changeEvent(self, event):
        # Bẫy sự kiện thay đổi trạng thái cửa sổ
        if event.type() == QEvent.Type.WindowStateChange:
            # Nếu cửa sổ vừa được thu nhỏ xong
            if self.isMinimized():
                # Reset lại độ trong suốt để lần sau nó có thể hiện lên
                self.setWindowOpacity(1.0)
            
            # Nếu trạng thái cũ là "thu nhỏ" và trạng thái mới là "bình thường"
            # (tức là vừa được phục hồi từ taskbar)
            elif event.oldState() & Qt.WindowMinimized:
                # Ẩn đi ngay lập tức và bắt đầu hiệu ứng hiện dần lên
                self.setWindowOpacity(0.0)
                self.showNormal() # Phải gọi showNormal để cửa sổ thực sự hiển thị
                
                self.restore_animation = QPropertyAnimation(self, b"windowOpacity")
                self.restore_animation.setDuration(200)
                self.restore_animation.setStartValue(0.0)
                self.restore_animation.setEndValue(1.0)
                self.restore_animation.start()

        # Gọi lại hàm gốc để xử lý các sự kiện khác
        super().changeEvent(event)        

    def check_id_button_callback(self):
        """Hàm được gọi khi nút '不足ACCIDチェック' được nhấn."""
        self.run_button.setDisabled(True)
        self.check_id_button.setDisabled(True)
        self.console_output.clear()
        
        # Chạy hàm kiểm tra trong một thread riêng
        check_thread = threading.Thread(target=self.run_check_in_background)
        check_thread.start()

    def run_check_in_background(self):
        try:
            # <-- THAY ĐỔI: Gọi hàm từ CoreLogic thay vì hàm giả lập -->
            CoreLogic.check_missing_account_ids() 
        except Exception as e:
            logging.error(f"Lỗi nghiêm trọng trong luồng kiểm tra ID: {e}")
        finally:
            # Kích hoạt lại các nút sau khi chạy xong
            self.run_button.setDisabled(False)
            self.check_id_button.setDisabled(False)
    # ==========================================

    def toggle_theme(self):
        self.current_theme = "light" if self.theme_switch.isChecked() is False else "dark"
        self.theme_switch_label.setText("Dark Mode" if self.current_theme == "dark" else "Light Mode")
        self.update_theme()

    def mousePressEvent(self, event):
        pos = event.position().toPoint()
        if (pos.x() >= self.width() - self.grip_size or pos.x() <= self.grip_size or
            pos.y() <= self.grip_size or pos.y() >= self.height() - self.grip_size):
            if event.button() == Qt.LeftButton:
                self.resizing = True
                self.start_pos = event.globalPosition().toPoint()
                self.start_geometry = self.geometry()
                self.set_resize_edge(pos)
                event.accept()
        elif event.button() == Qt.LeftButton and pos.y() <= self.title_bar.height():
            self.drag_pos = event.globalPosition().toPoint() - self.frameGeometry().topLeft()
            event.accept()

    def mouseMoveEvent(self, event):
        pos = event.position().toPoint()
        if self.resizing and event.buttons() == Qt.LeftButton:
            delta = event.globalPosition().toPoint() - self.start_pos
            new_geometry = QRect(self.start_geometry)

            if self.resize_edge & Qt.LeftEdge: new_geometry.setLeft(self.start_geometry.left() + delta.x())
            if self.resize_edge & Qt.RightEdge: new_geometry.setRight(self.start_geometry.right() + delta.x())
            if self.resize_edge & Qt.TopEdge: new_geometry.setTop(self.start_geometry.top() + delta.y())
            if self.resize_edge & Qt.BottomEdge: new_geometry.setBottom(self.start_geometry.bottom() + delta.y())
            
            if new_geometry.width() < self.minimumWidth(): new_geometry.setWidth(self.minimumWidth())
            if new_geometry.height() < self.minimumHeight(): new_geometry.setHeight(self.minimumHeight())

            self.setGeometry(new_geometry)
            event.accept()
        elif self.drag_pos and event.buttons() == Qt.LeftButton:
            self.move(event.globalPosition().toPoint() - self.drag_pos)
            event.accept()
        elif not self.resizing:
            self.update_cursor_shape(pos)

    def mouseReleaseEvent(self, event):
        self.drag_pos = None
        self.resizing = False
        self.setCursor(Qt.ArrowCursor)
        event.accept()

    def set_resize_edge(self, pos):
        self.resize_edge = 0
        if pos.x() <= self.grip_size: self.resize_edge |= Qt.LeftEdge
        if pos.x() >= self.width() - self.grip_size: self.resize_edge |= Qt.RightEdge
        if pos.y() <= self.grip_size: self.resize_edge |= Qt.TopEdge
        if pos.y() >= self.height() - self.grip_size: self.resize_edge |= Qt.BottomEdge

    def update_cursor_shape(self, pos):
        if self.isMaximized():
            self.setCursor(Qt.ArrowCursor)
            return

        on_left = pos.x() <= self.grip_size
        on_right = pos.x() >= self.width() - self.grip_size
        on_top = pos.y() <= self.grip_size
        on_bottom = pos.y() >= self.height() - self.grip_size

        if (on_top and on_left) or (on_bottom and on_right): self.setCursor(Qt.SizeFDiagCursor)
        elif (on_top and on_right) or (on_bottom and on_left): self.setCursor(Qt.SizeBDiagCursor)
        elif on_left or on_right: self.setCursor(Qt.SizeHorCursor)
        elif on_top or on_bottom: self.setCursor(Qt.SizeVerCursor)
        else: self.setCursor(Qt.ArrowCursor)    
            
    def toggle_maximize_restore(self):
        # Tạo animation cho thuộc tính 'geometry'
        self.animation = QPropertyAnimation(self, b"geometry")
        self.animation.setDuration(300) # Thời gian animation (300ms)
        self.animation.setEasingCurve(QEasingCurve.InOutCubic) # Kiểu chuyển động

        if self.isMaximized():
            # --- TỪ PHÓNG TO -> THU NHỎ LẠI ---
            # Điểm bắt đầu là kích thước hiện tại (đang phóng to)
            self.animation.setStartValue(self.geometry())
            # Điểm kết thúc là kích thước bình thường đã lưu trước đó
            self.animation.setEndValue(self.normal_geometry)
            # Sau khi animation kết thúc, chính thức chuyển trạng thái cửa sổ về bình thường
            self.animation.finished.connect(self.showNormal)
        else:
            # --- TỪ BÌNH THƯỜNG -> PHÓNG TO ---
            # Lưu lại kích thước hiện tại trước khi phóng to
            self.normal_geometry = self.geometry()
            # Điểm bắt đầu là kích thước hiện tại
            self.animation.setStartValue(self.normal_geometry)
            # Điểm kết thúc là kích thước của toàn màn hình
            screen_geometry = self.screen().availableGeometry()
            self.animation.setEndValue(screen_geometry)
            # Sau khi animation kết thúc, chính thức chuyển trạng thái cửa sổ về phóng to
            self.animation.finished.connect(self.showMaximized)
            
        # Bắt đầu chạy animation
        self.animation.start()

    def append_text_to_console(self, text):
        self.console_output.insertPlainText(text)
        self.console_output.ensureCursorVisible()

    def create_platform_row(self, layout, row, name, key, logo_file):
        if row > 2:
            separator = QFrame()
            separator.setFrameShape(QFrame.Shape.HLine)
            separator.setObjectName("Separator")
            layout.addWidget(separator, row -1, 0, 2, 4)
        
        logo_label = QLabel()
        logo_pixmap = QPixmap(os.path.join(self.assets_path, logo_file))
        logo_label.setPixmap(logo_pixmap.scaled(QSize(30, 35), Qt.KeepAspectRatio, Qt.SmoothTransformation))
        
        name_label = QLabel(name)
        name_label.setFont(QFont("Inter", 12, QFont.Bold))
        
        media_layout = QHBoxLayout()
        media_layout.setSpacing(10)
        media_layout.addWidget(logo_label)
        media_layout.addWidget(name_label)
        media_layout.addStretch()
        layout.addLayout(media_layout, row, 0)
        
        self.switches[key] = {
            "on_off": Switch(app_window=self), 
            "download": Switch(app_window=self), 
            "upload": Switch(app_window=self)
        }
        self.platform_rows_widgets.append({'name_label': name_label, 'switches': self.switches[key]})
        
        layout.addWidget(self.switches[key]["on_off"], row, 1, Qt.AlignCenter)
        layout.addWidget(self.switches[key]["download"], row, 2, Qt.AlignCenter)
        layout.addWidget(self.switches[key]["upload"], row, 3, Qt.AlignCenter)

    # def run_button_callback(self):
    #     self.console_output.clear()
    #     self.run_button.setDisabled(True)
    #     self.check_id_button.setDisabled(True)
    #     self.run_button.setText("実行中...")
    #     settings = {}
    #     for key, switch_group in self.switches.items():
    #         settings[key] = {
    #             "on_off": switch_group["on_off"].isChecked(),
    #             "download": switch_group["download"].isChecked(),
    #             "upload": switch_group["upload"].isChecked(),
    #         }
    #     bot_thread = threading.Thread(target=self.run_bot_in_background, args=(settings,))
    #     bot_thread.start()
              
    # def run_button_callback(self):
    #     self.console_output.clear()
    #     self.run_button.setDisabled(True)
    #     self.check_id_button.setDisabled(True)
    #     self.run_button.setText("実行中...")
        
    #     self.current_settings = {}
    #     for key, switch_group in self.switches.items():
    #         # Chuẩn hóa tên key (ví dụ: "X (TWITTER)" -> "x (twitter)")
    #         clean_key = key.replace(" (TWITTER)", " (twitter)").lower()
    #         self.current_settings[clean_key] = {
    #             "on_off": switch_group["on_off"].isChecked(),
    #             "download": switch_group["download"].isChecked(),
    #             "upload": switch_group["upload"].isChecked(),
    #         }
        
    #     should_download = any(s.get("download") for s in self.current_settings.values())
    #     # --- Thiết lập và khởi động QThread ---
    #     self.thread = QThread()
    #     self.worker = Worker(settings)
    #     self.worker.moveToThread(self.thread)

    #     # Kết nối các tín hiệu và slot
    #     self.thread.started.connect(self.worker.run)
    #     self.worker.finished.connect(self.show_completion_popup)
    #     self.worker.finished.connect(self.thread.quit)
    #     self.worker.finished.connect(self.worker.deleteLater)
    #     self.thread.finished.connect(self.thread.deleteLater)

    #     # Bắt đầu luồng
    #     self.thread.start()


    def run_button_callback(self):
        """Hàm này chỉ khởi động TÁC VỤ 1: DOWNLOAD."""
        self.console_output.clear()
        self.run_button.setDisabled(True)
        self.check_id_button.setDisabled(True)
        self.run_button.setText("実行中...")
        
        # Lưu lại settings để dùng cho tác vụ sau
        self.current_settings = {}
        for key, switch_group in self.switches.items():
            clean_key = key.replace(" (TWITTER)", " (twitter)").lower()
            self.current_settings[clean_key] = {
                "on_off": switch_group["on_off"].isChecked(),
                "download": switch_group["download"].isChecked(),
                "upload": switch_group["upload"].isChecked(),
            }

        # Kiểm tra xem có cần download không
        should_download = any(s.get("download") for s in self.current_settings.values())

        if should_download:
            # Nếu có, khởi động DownloadWorker
            self.thread = QThread()
            self.worker = DownloadWorker()
            self.worker.moveToThread(self.thread)
            self.thread.started.connect(self.worker.run)
            self.worker.finished.connect(self.on_download_complete) # <-- Kết nối với hàm xử lý tiếp theo
            self.worker.finished.connect(self.thread.quit)
            self.worker.finished.connect(self.worker.deleteLater)
            self.thread.finished.connect(self.thread.deleteLater)
            self.thread.start()
        else:
            # Nếu không download, giả vờ là đã download xong để chuyển ngay sang process
            logging.info("Bỏ qua bước Download, chuyển sang Process & Upload...")
            self.on_download_complete({}) # Gọi trực tiếp với kết quả rỗng

    def on_download_complete(self, result):
        """
        Slot này được gọi khi download xong.
        Nó sẽ hiển thị pop-up và chờ người dùng nhấn OK để bắt đầu TÁC VỤ 2.
        """
        if result: # Nếu có kết quả từ download thì mới hiển thị pop-up
            self.showNormal(); self.activateWindow(); self.raise_()
            theme = self.themes[self.current_theme]
            title = result.get("title", "Thông báo")
            message = result.get("message", "Tác vụ đã hoàn thành.")
            is_success = result.get("is_success", False)
            msg_box = QMessageBox(self)
            msg_box.setWindowTitle(result.get("title"))
            msg_box.setText(result.get("message"))
            msg_box.setIcon(QMessageBox.Information if result.get("is_success") else QMessageBox.Warning)
            
            qss_style = f"""
                QMessageBox {{
                    background-color: {theme['bg_secondary']};
                }}
                QMessageBox QLabel {{
                    color: {theme['text_primary']};
                    font-size: 14px;
                }}
                QMessageBox QPushButton {{
                    background-color: {theme['accent']};
                    color: #FFFFFF;
                    border-radius: 5px;
                    padding: 8px 16px;
                    min-width: 80px;
                    font-weight: bold;
                }}
                QMessageBox QPushButton:hover {{
                    background-color: {theme['accent_hover']};
                }}
            """            
            msg_box.setStyleSheet(qss_style)
            
            # Dòng này sẽ tạm dừng cho đến khi người dùng nhấn nút trên pop-up
            user_choice = msg_box.exec()
        else:
            # Nếu không có gì để pop-up, mặc định coi như người dùng đã nhấn OK
            user_choice = QMessageBox.Ok

        # Nếu người dùng nhấn OK, và có tác vụ process/upload để làm
        if user_choice == QMessageBox.Ok:
            should_process_or_upload = any(s.get("on_off") or s.get("upload") for s in self.current_settings.values())
            
            if should_process_or_upload:
                # Khởi động TÁC VỤ 2: PROCESS & UPLOAD
                self.thread = QThread()
                self.worker = ProcessUploadWorker(self.current_settings)
                self.worker.moveToThread(self.thread)
                self.thread.started.connect(self.worker.run)
                self.worker.finished.connect(self.on_all_tasks_complete) # <-- Kết nối với hàm kết thúc cuối cùng
                self.worker.finished.connect(self.thread.quit)
                self.worker.finished.connect(self.worker.deleteLater)
                self.thread.finished.connect(self.thread.deleteLater)
                self.thread.start()
            else:
                # Nếu không có gì để làm nữa, kết thúc luôn
                self.on_all_tasks_complete()
        else:
            # Nếu người dùng nhấn nút khác (ví dụ: nút close), hủy bỏ và bật lại nút
            logging.info("Người dùng đã hủy bỏ tác vụ Process & Upload.")
            self.on_all_tasks_complete()

    def on_all_tasks_complete(self):
        """Slot này được gọi khi tất cả các tác vụ đã thực sự hoàn thành."""
        logging.info("Tất cả các tác vụ đã hoàn tất!")
        self.run_button.setDisabled(False)
        self.check_id_button.setDisabled(False)
        self.run_button.setText("実行")    

# =================================================================================
# CHẠY ỨNG DỤNG
# =================================================================================
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format='%(message)s', stream=sys.stdout)
    
    app = QApplication(sys.argv)
    
    window = App()
    window.show()
    sys.exit(app.exec())