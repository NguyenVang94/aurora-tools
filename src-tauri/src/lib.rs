use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use tauri::{Emitter, Window}; // Tauri v2 dùng Emitter thay vì emit

#[tauri::command]
fn run_python_script(window: Window, script_path: String, task_id: String) {
    // Chạy trong một luồng (thread) riêng để không làm đơ App
    std::thread::spawn(move || {
        let mut child = Command::new("python")
            .env("PYTHONIOENCODING", "utf-8")
            .arg(&script_path)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .expect("Không thể khởi chạy Python");

        let stdout = child.stdout.take().unwrap();
        let reader = BufReader::new(stdout);

        // Đọc từng dòng Python in ra và gửi ngay về React
        for line in reader.lines() {
            if let Ok(content) = line {
                // Gửi kèm task_id để React biết dòng này của file nào
                window
                    .emit(
                        "python-log",
                        Payload {
                            task_id: task_id.clone(),
                            message: content,
                        },
                    )
                    .unwrap();
            }
        }

        // Khi chạy xong
        window
            .emit(
                "python-finished",
                Payload {
                    task_id: task_id.clone(),
                    message: "--- ĐÃ HOÀN THÀNH ---".to_string(),
                },
            )
            .unwrap();
    });
}

#[derive(Clone, serde::Serialize)]
struct Payload {
    task_id: String,
    message: String,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![run_python_script])
        .run(tauri::generate_context!())
        .expect("Lỗi khi khởi chạy ứng dụng Tauri");
}
