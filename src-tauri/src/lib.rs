use std::collections::HashMap;
use std::io::{Read, Write};
use std::process::{ChildStdin, Command, Stdio};
use std::sync::Mutex;
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager, State, Window};
use tokio::fs::File;
use tokio::io::AsyncWriteExt;

#[tauri::command]
async fn download_and_install_update(app: AppHandle, url: String) -> Result<String, String> {
    let mut dest_path = app.path().download_dir().map_err(|e| e.to_string())?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let filename = format!("Aurora_Update_Setup_{}.exe", timestamp);
    dest_path.push(&filename);

    // 1. Gửi request lấy file (Lưu ý: thêm chữ mut ở đây)
    let mut response = reqwest::get(&url).await.map_err(|e| e.to_string())?;

    // 2. Lấy tổng dung lượng file (Content-Length)
    let total_size = response.content_length().unwrap_or(0);

    let mut file = std::fs::File::create(&dest_path).map_err(|e| e.to_string())?;
    let mut downloaded: u64 = 0;

    // 3. Tải theo từng đoạn nhỏ bằng hàm chunk() có sẵn siêu đơn giản
    while let Some(chunk) = response.chunk().await.map_err(|e| e.to_string())? {
        file.write_all(&chunk).map_err(|e| e.to_string())?;

        downloaded += chunk.len() as u64;

        if total_size > 0 {
            // Tính toán %
            let percentage = (downloaded as f64 / total_size as f64) * 100.0;
            // Phát sự kiện "download-progress" lên React
            app.emit("download-progress", percentage as u8).ok();
        }
    }
    drop(file);

    // 3b. Kiểm tra file tải về có hợp lệ không trước khi cài (tránh cài file rỗng/lỗi
    // do mạng đứt giữa chừng, rồi mới đóng app - nếu không sẽ mất dấu vết lỗi vì
    // app đã thoát, không còn ai báo cho người dùng biết).
    let actual_size = std::fs::metadata(&dest_path).map_err(|e| e.to_string())?.len();
    if actual_size < 1_000_000 || (total_size > 0 && actual_size != total_size) {
        let _ = std::fs::remove_file(&dest_path);
        return Err(format!(
            "File cài đặt tải về không đầy đủ ({} bytes). Vui lòng thử lại.",
            actual_size
        ));
    }

    // 4. Chạy file cài đặt - gọi trực tiếp installer.exe từ Rust, KHÔNG qua PowerShell
    // trung gian. Chuỗi tiến trình "Aurora -> PowerShell ẩn -> installer.exe lạ" rất giống
    // hành vi mã độc thường gặp, nên phần mềm bảo mật/Defender trên nhiều máy công ty âm
    // thầm chặn/kill cả chuỗi mà không báo lỗi gì - App tự thoát trước đó nên trông như crash
    // và bản cập nhật không bao giờ thực sự được cài. Gọi thẳng installer.exe (một tiến trình
    // cha-con bình thường, giống mọi app tự cập nhật khác) đáng tin cậy hơn nhiều.
    #[cfg(target_os = "windows")]
    {
        let current_exe = std::env::current_exe().map_err(|e| e.to_string())?;

        // Đợi 1.5s trên một thread nền để Aurora hiện tại kịp giải phóng file trước khi
        // installer cố ghi đè, rồi mới chạy installer ở chế độ passive (/P, có thanh tiến
        // trình nhỏ thay vì im lặng tuyệt đối) và tự mở lại app (/R).
        let install_path = dest_path.clone();
        thread::spawn(move || {
            thread::sleep(std::time::Duration::from_millis(1500));
            let _ = Command::new(&install_path).args(["/P", "/R"]).spawn();
        });

        // Dự phòng: nếu vì lý do gì đó app không tự mở lại được (VD: /R thất bại), tự mở
        // lại sau một khoảng đủ để cài xong.
        thread::spawn(move || {
            thread::sleep(std::time::Duration::from_secs(15));
            if !is_process_running("Aurora.exe") {
                let _ = Command::new(&current_exe).spawn();
            }
        });
    }

    // 5. Thoát app ngay lập tức để trả tự do cho file Aurora.exe
    app.exit(0);

    Ok("Đang cập nhật...".to_string())
}

#[cfg(target_os = "windows")]
fn is_process_running(image_name: &str) -> bool {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    Command::new("tasklist")
        .args(["/FI", &format!("IMAGENAME eq {}", image_name), "/NH"])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map(|out| {
            String::from_utf8_lossy(&out.stdout)
                .to_lowercase()
                .contains(&image_name.to_lowercase())
        })
        .unwrap_or(false)
}

// Mở (và tự tạo nếu chưa có) thư mục "master" nằm cạnh file .exe của tool trong
// Explorer, để user copy Master.xlsx/User.xlsx/Consulting.xlsx/Template2.xlsx vào.
#[tauri::command]
fn open_tool_master_folder(exe_path: String) -> Result<(), String> {
    let master_dir = std::path::Path::new(&exe_path)
        .parent()
        .ok_or("Không xác định được thư mục chứa tool")?
        .join("master");
    std::fs::create_dir_all(&master_dir).map_err(|e| e.to_string())?;
    Command::new("explorer")
        .arg(&master_dir)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

// Lệnh này nhận ID của tool và URL tải xuống từ React
#[tauri::command]
async fn download_tool(
    app: AppHandle,
    tool_id: String,
    download_url: String,
) -> Result<String, String> {
    // 1. Lấy đường dẫn thư mục ẩn của app (Vd: C:\Users\Name\AppData\Roaming\com.your.app)
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Lỗi tìm thư mục AppData: {}", e))?;

    // 2. Tạo một thư mục con tên là "tools" bên trong đó để chứa các file exe
    let tools_dir = app_data_dir.join("tools");
    tokio::fs::create_dir_all(&tools_dir)
        .await
        .map_err(|e| format!("Lỗi tạo thư mục tools: {}", e))?;

    // 3. Đường dẫn file đích (ví dụ: tools/fastapi_server.exe)
    let file_name = format!("{}.exe", tool_id);
    let file_path = tools_dir.join(&file_name);

    // 4. Bắt đầu tải file từ URL, đọc theo từng đoạn nhỏ để báo % tiến độ
    let mut response = reqwest::get(&download_url)
        .await
        .map_err(|e| format!("Lỗi tải xuống từ URL: {}", e))?;

    let total_size = response.content_length().unwrap_or(0);
    let mut file = File::create(&file_path)
        .await
        .map_err(|e| format!("Lỗi tạo file exe: {}", e))?;
    let mut downloaded: u64 = 0;

    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|e| format!("Lỗi đọc dữ liệu: {}", e))?
    {
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("Lỗi lưu file exe: {}", e))?;

        downloaded += chunk.len() as u64;

        if total_size > 0 {
            let percentage = (downloaded as f64 / total_size as f64) * 100.0;
            app.emit(
                "tool-download-progress",
                ToolDownloadProgress {
                    tool_id: tool_id.clone(),
                    percentage: percentage as u8,
                },
            )
            .ok();
        }
    }

    // 5. Trả về đường dẫn tuyệt đối của file exe cho Frontend để nó dùng lệnh invoke chạy file
    Ok(file_path.to_string_lossy().to_string())
}

// Bổ sung thư viện này để can thiệp vào cách Windows mở file
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

struct AppState {
    stdin_map: Mutex<HashMap<String, ChildStdin>>,
}

#[derive(Clone, serde::Serialize)]
struct LogPayload {
    task_id: String,
    message: String,
}

#[derive(Clone, serde::Serialize)]
struct ToolDownloadProgress {
    tool_id: String,
    percentage: u8,
}

#[tauri::command]
fn send_input(task_id: String, input: String, state: State<AppState>) {
    if let Ok(mut map) = state.stdin_map.lock() {
        if let Some(stdin) = map.get_mut(&task_id) {
            let mut input_with_newline = input.clone();
            if !input_with_newline.ends_with('\n') {
                input_with_newline.push('\n');
            }
            let _ = stdin.write_all(input_with_newline.as_bytes());
            let _ = stdin.flush();
        }
    }
}

#[tauri::command]
async fn run_executable(
    window: Window,
    state: State<'_, AppState>,
    exe_path: String,
    task_id: String,
) -> Result<(), String> {
    let mut cmd = Command::new(exe_path);

    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000);

    let mut child = cmd
        .env("PYTHONIOENCODING", "utf-8")
        .env("PYTHONUTF8", "1")
        .env("PYTHONUNBUFFERED", "1")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Không thể chạy file exe: {}", e))?;

    if let Some(stdin) = child.stdin.take() {
        if let Ok(mut map) = state.stdin_map.lock() {
            map.insert(task_id.clone(), stdin);
        }
    }

    let window_out = window.clone();
    let task_id_out = task_id.clone();
    if let Some(mut stdout) = child.stdout.take() {
        thread::spawn(move || {
            let mut buffer = [0; 512];
            loop {
                match stdout.read(&mut buffer) {
                    Ok(0) => break,
                    Ok(n) => {
                        let chunk = String::from_utf8_lossy(&buffer[0..n]).into_owned();
                        let _ = window_out.emit(
                            "python-log",
                            LogPayload {
                                task_id: task_id_out.clone(),
                                message: chunk,
                            },
                        );
                    }
                    Err(_) => break,
                }
            }
        });
    }

    let window_err = window.clone();
    let task_id_err = task_id.clone(); // ĐÃ SỬA THÀNH CLONE ĐỂ KHÔNG BỊ LỖI RAM
    if let Some(mut stderr) = child.stderr.take() {
        thread::spawn(move || {
            let mut buffer = [0; 512];
            loop {
                match stderr.read(&mut buffer) {
                    Ok(0) => break,
                    Ok(n) => {
                        let chunk = String::from_utf8_lossy(&buffer[0..n]).into_owned();
                        let _ = window_err.emit(
                            "python-log",
                            LogPayload {
                                task_id: task_id_err.clone(),
                                message: chunk,
                            },
                        );
                    }
                    Err(_) => break,
                }
            }
        });
    }

    // --- MẤU CHỐT Ở ĐÂY: ÉP RUST ĐỨNG CHỜ TIẾN TRÌNH KẾT THÚC ---
    let status = tauri::async_runtime::spawn_blocking(move || child.wait())
        .await
        .map_err(|e| format!("Lỗi luồng: {}", e))?
        .map_err(|e| format!("Lỗi chờ tiến trình: {}", e))?;

    // Dọn dẹp RAM sau khi chạy xong
    if let Ok(mut map) = state.stdin_map.lock() {
        map.remove(&task_id);
    }

    if status.success() {
        Ok(()) // Tool chạy xong 100% -> Báo về cho React
    } else {
        Err(format!("Tiến trình kết thúc với mã lỗi: {}", status))
    }
}

#[tauri::command]
async fn run_executable_with_args(
    window: Window,
    state: State<'_, AppState>,
    exe_path: String,
    task_id: String,
    args: Vec<String>,
) -> Result<(), String> {
    let mut cmd = Command::new(exe_path);

    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000);

    let mut child = cmd
        .args(args)
        .env("PYTHONIOENCODING", "utf-8")
        .env("PYTHONUTF8", "1")
        .env("PYTHONUNBUFFERED", "1")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Không thể chạy file exe kèm params: {}", e))?;

    if let Some(stdin) = child.stdin.take() {
        if let Ok(mut map) = state.stdin_map.lock() {
            map.insert(task_id.clone(), stdin);
        }
    }

    let window_out = window.clone();
    let task_id_out = task_id.clone();
    if let Some(mut stdout) = child.stdout.take() {
        thread::spawn(move || {
            let mut buffer = [0; 512];
            loop {
                match stdout.read(&mut buffer) {
                    Ok(0) => break,
                    Ok(n) => {
                        let chunk = String::from_utf8_lossy(&buffer[0..n]).into_owned();
                        let _ = window_out.emit(
                            "python-log",
                            LogPayload {
                                task_id: task_id_out.clone(),
                                message: chunk,
                            },
                        );
                    }
                    Err(_) => break,
                }
            }
        });
    }

    let window_err = window.clone();
    let task_id_err = task_id.clone();
    if let Some(mut stderr) = child.stderr.take() {
        thread::spawn(move || {
            let mut buffer = [0; 512];
            loop {
                match stderr.read(&mut buffer) {
                    Ok(0) => break,
                    Ok(n) => {
                        let chunk = String::from_utf8_lossy(&buffer[0..n]).into_owned();
                        let _ = window_err.emit(
                            "python-log",
                            LogPayload {
                                task_id: task_id_err.clone(),
                                message: chunk,
                            },
                        );
                    }
                    Err(_) => break,
                }
            }
        });
    }

    let status = tauri::async_runtime::spawn_blocking(move || child.wait())
        .await
        .map_err(|e| format!("Lỗi luồng: {}", e))?
        .map_err(|e| format!("Lỗi chờ tiến trình: {}", e))?;

    if let Ok(mut map) = state.stdin_map.lock() {
        map.remove(&task_id);
    }

    if status.success() {
        Ok(())
    } else {
        Err(format!("Tiến trình kết thúc với mã lỗi: {}", status))
    }
}

#[tauri::command]
async fn run_python_script(
    window: Window,
    state: State<'_, AppState>,
    script_path: String,
    task_id: String,
) -> Result<(), String> {
    let mut cmd = Command::new("python");

    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000);

    let mut child = cmd
        .arg(script_path)
        .env("PYTHONIOENCODING", "utf-8")
        .env("PYTHONUTF8", "1")
        .env("PYTHONUNBUFFERED", "1")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Không thể chạy python script: {}", e))?;

    if let Some(stdin) = child.stdin.take() {
        if let Ok(mut map) = state.stdin_map.lock() {
            map.insert(task_id.clone(), stdin);
        }
    }

    let window_out = window.clone();
    let task_id_out = task_id.clone();
    if let Some(mut stdout) = child.stdout.take() {
        thread::spawn(move || {
            let mut buffer = [0; 512];
            loop {
                match stdout.read(&mut buffer) {
                    Ok(0) => break,
                    Ok(n) => {
                        let chunk = String::from_utf8_lossy(&buffer[0..n]).into_owned();
                        let _ = window_out.emit(
                            "python-log",
                            LogPayload {
                                task_id: task_id_out.clone(),
                                message: chunk,
                            },
                        );
                    }
                    Err(_) => break,
                }
            }
        });
    }

    let window_err = window.clone();
    let task_id_err = task_id.clone();
    if let Some(mut stderr) = child.stderr.take() {
        thread::spawn(move || {
            let mut buffer = [0; 512];
            loop {
                match stderr.read(&mut buffer) {
                    Ok(0) => break,
                    Ok(n) => {
                        let chunk = String::from_utf8_lossy(&buffer[0..n]).into_owned();
                        let _ = window_err.emit(
                            "python-log",
                            LogPayload {
                                task_id: task_id_err.clone(),
                                message: chunk,
                            },
                        );
                    }
                    Err(_) => break,
                }
            }
        });
    }

    let status = tauri::async_runtime::spawn_blocking(move || child.wait())
        .await
        .map_err(|e| format!("Lỗi luồng: {}", e))?
        .map_err(|e| format!("Lỗi chờ tiến trình: {}", e))?;

    if let Ok(mut map) = state.stdin_map.lock() {
        map.remove(&task_id);
    }

    if status.success() {
        Ok(())
    } else {
        Err(format!("Tiến trình kết thúc với mã lỗi: {}", status))
    }
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0); // Lệnh này sẽ kill tiến trình hoàn toàn
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                // 1. BẮT BUỘC: Hiện cửa sổ lên trước (vì nó đang bị ẩn chạy ngầm)
                let _ = window.show();

                // 2. Khôi phục kích thước nếu nó đang bị thu nhỏ
                let _ = window.unminimize();

                // 3. MẸO TRÊN WINDOWS: Ép cửa sổ nổi lên trên cùng các app khác
                let _ = window.set_always_on_top(true);
                let _ = window.set_always_on_top(false);

                // 4. Focus vào cửa sổ để người dùng click được ngay
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            stdin_map: Mutex::new(HashMap::new()),
        })
        .plugin(tauri_plugin_dialog::init())
        // 👇 BỘ CHẶN SỰ KIỆN "TẮT APP" 👇
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Chặn lệnh kill process của Hệ điều hành
                api.prevent_close();
                // Thay vào đó, chỉ "tàng hình" (hide) cửa sổ đi
                let _ = window.hide();
            }
        })
        // 👆 KẾT THÚC BỘ CHẶN 👆
        .setup(|app| {
            #[cfg(desktop)]
            {
                use std::str::FromStr;
                use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

                if let Ok(shortcut) = Shortcut::from_str("Alt+K") {
                    let _ = app
                        .global_shortcut()
                        .on_shortcut(shortcut, |app, _shortcut, event| {
                            if event.state == ShortcutState::Pressed {
                                // Biến lưu trữ trạng thái: App có đang bị ẩn/thu nhỏ không?
                                let mut was_hidden = false;

                                if let Some(window) = app.get_webview_window("main") {
                                    // Kiểm tra xem cửa sổ có đang thu nhỏ hoặc bị giấu không
                                    let is_minimized = window.is_minimized().unwrap_or(false);
                                    let is_visible = window.is_visible().unwrap_or(true);

                                    if is_minimized || !is_visible {
                                        was_hidden = true; // Xác nhận là app đang ẩn
                                    }

                                    let _ = window.unminimize();
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }

                                // Gửi tín hiệu sang React KÈM THEO TRẠNG THÁI was_hidden (true/false)
                                let _ = app.emit("toggle-command-palette", was_hidden);
                            }
                        });
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            download_tool,
            open_tool_master_folder,
            run_python_script,
            run_executable,
            run_executable_with_args,
            send_input,
            quit_app,
            download_and_install_update
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
