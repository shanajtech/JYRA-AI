use std::process::{Command, Stdio};
use std::sync::Mutex;
use tauri::Manager;

struct NativePid(Mutex<Option<u32>>);

fn stop_runtime(pid: u32) {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        // Only the process ID spawned by this application and its children.
        let _ = Command::new("taskkill.exe")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .creation_flags(0x08000000)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();
    }
    #[cfg(not(target_os = "windows"))]
    let _ = pid;
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(NativePid(Mutex::new(None)))
        .setup(|app| {
            let window = app.get_webview_window("main").expect("main window missing");
            if cfg!(debug_assertions) {
                window.show()?;
                return Ok(());
            }
            let resources = app.path().resource_dir()?.join("resources");
            let data = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data)?;
            let mut command = Command::new(resources.join("node.exe"));
            command.arg(resources.join("scripts/desktop.mjs"))
                .current_dir(&resources)
                .env("ZYRA_DATABASE_PATH", data.join("zyra.sqlite"))
                .stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::null());
            #[cfg(target_os = "windows")]
            {
                use std::os::windows::process::CommandExt;
                command.creation_flags(0x08000000);
            }
            let mut child = command.spawn()?;
            let pid = child.id();
            *app.state::<NativePid>().0.lock().unwrap() = Some(pid);
            std::thread::spawn(move || {
                let address = "127.0.0.1:4315".parse().unwrap();
                let mut ready = false;
                for _ in 0..60 {
                    if child.try_wait().ok().flatten().is_some() { break; }
                    if std::net::TcpStream::connect_timeout(&address, std::time::Duration::from_millis(100)).is_ok() { ready = true; break; }
                    std::thread::sleep(std::time::Duration::from_millis(250));
                }
                if ready { let _ = window.navigate("http://127.0.0.1:4315/".parse().unwrap()); }
                let _ = window.show();
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("could not initialize ZYRA desktop")
        .run(|app, event| {
            if let tauri::RunEvent::Exit = event {
                if let Some(pid) = app.state::<NativePid>().0.lock().unwrap().take() { stop_runtime(pid); }
            }
        });
}
