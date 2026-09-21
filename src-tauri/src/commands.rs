use crate::{
    app_state::AppState,
    config::{model::Config, store},
    events, shortcuts, windows,
};
use serde_json::Value;
use tauri::{AppHandle, Emitter, State, WebviewWindow};

#[tauri::command]
pub fn get_config(state: State<'_, AppState>) -> Config {
    state.config()
}

pub fn apply_config_update(app: &AppHandle, state: &AppState, update: Value) -> Result<(), String> {
    let (next, shortcuts_changed) = {
        let current = state.config();
        current.merge_update(&update)?
    };

    store::save(&state.config_path, &next)?;
    *state
        .config
        .write()
        .map_err(|_| "config lock poisoned".to_string())? = next.clone();

    app.emit_to("overlay", events::CONFIG_UPDATED, next.clone())
        .map_err(|error| error.to_string())?;
    app.emit_to("settings", events::CONFIG_UPDATED, next.clone())
        .map_err(|error| error.to_string())?;
    windows::sync_settings_state(app);
    if shortcuts_changed {
        shortcuts::register(app, &next.shortcuts);
    }
    Ok(())
}

#[tauri::command]
pub fn update_config(
    app: AppHandle,
    state: State<'_, AppState>,
    update: Value,
) -> Result<(), String> {
    apply_config_update(&app, &state, update)
}

#[tauri::command]
pub fn set_settings_hover(
    app: AppHandle,
    state: State<'_, AppState>,
    is_hovered: bool,
) -> Result<(), String> {
    *state
        .settings_hovered
        .lock()
        .map_err(|_| "hover lock poisoned".to_string())? = is_hovered;
    windows::sync_settings_state(&app);
    Ok(())
}

#[tauri::command]
pub fn set_overlay_ignore_mouse_events(window: WebviewWindow, ignore: bool) -> Result<(), String> {
    window
        .set_ignore_cursor_events(ignore)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn trigger_clear_drawing(app: AppHandle, all: bool) -> Result<(), String> {
    app.emit_to("overlay", events::CLEAR_DRAWING, all)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn trigger_undo_drawing(app: AppHandle) -> Result<(), String> {
    app.emit_to("overlay", events::UNDO_DRAWING, ())
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn trigger_redo_drawing(app: AppHandle) -> Result<(), String> {
    app.emit_to("overlay", events::REDO_DRAWING, ())
        .map_err(|error| error.to_string())
}
