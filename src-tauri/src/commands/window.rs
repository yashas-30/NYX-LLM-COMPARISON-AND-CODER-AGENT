use tauri::{AppHandle, Manager};

#[derive(serde::Serialize)]
pub struct WindowResult<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn window_minimize(app: AppHandle) -> WindowResult<()> {
    if let Some(window) = app.get_webview_window("main") { let _ = window.minimize(); }
    WindowResult { success: true, data: Some(()), error: None }
}

#[tauri::command]
pub async fn window_maximize(app: AppHandle) -> WindowResult<()> {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_maximized().unwrap_or(false) { let _ = window.unmaximize(); }
        else { let _ = window.maximize(); }
    }
    WindowResult { success: true, data: Some(()), error: None }
}

#[tauri::command]
pub async fn window_close(app: AppHandle) -> WindowResult<()> {
    if let Some(window) = app.get_webview_window("main") { let _ = window.close(); }
    WindowResult { success: true, data: Some(()), error: None }
}

#[tauri::command]
pub async fn window_show(app: AppHandle) -> WindowResult<()> {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
    WindowResult { success: true, data: Some(()), error: None }
}

#[tauri::command]
pub async fn window_hide(app: AppHandle) -> WindowResult<()> {
    if let Some(window) = app.get_webview_window("main") { let _ = window.hide(); }
    WindowResult { success: true, data: Some(()), error: None }
}
