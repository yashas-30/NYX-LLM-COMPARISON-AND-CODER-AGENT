use crate::server_sidecar::ServerPorts;
use crate::AppState;
use serde::Serialize;
use tauri::State;

#[derive(Serialize)]
pub struct ServerResult<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn server_get_ports(state: State<'_, AppState>) -> Result<ServerResult<ServerPorts>, String> {
    let mgr = state.server_manager.lock().await;
    if let Some(ref manager) = *mgr {
        Ok(ServerResult {
            success: true,
            data: Some(ServerPorts {
                express_port: manager.express_port,
                fastify_port: manager.fastify_port,
                scrapling_port: manager.scrapling_port,
            }),
            error: None,
        })
    } else {
        Ok(ServerResult { success: false, data: None, error: Some("Server not running".to_string()) })
    }
}

#[tauri::command]
pub async fn server_restart() -> Result<ServerResult<()>, String> {
    Ok(ServerResult { success: true, data: Some(()), error: None })
}
