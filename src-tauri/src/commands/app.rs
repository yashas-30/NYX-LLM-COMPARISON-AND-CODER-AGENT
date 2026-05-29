use serde::Serialize;
use tauri::AppHandle;

#[derive(Serialize)]
pub struct AppResult<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn app_get_version(app: AppHandle) -> AppResult<String> {
    AppResult { success: true, data: Some(app.package_info().version.to_string()), error: None }
}

#[tauri::command]
pub async fn app_open_external(url: String) -> AppResult<()> {
    match open::that(&url) {
        Ok(_) => AppResult { success: true, data: Some(()), error: None },
        Err(err) => AppResult { success: false, data: None, error: Some(format!("Failed to open URL: {}", err)) },
    }
}
