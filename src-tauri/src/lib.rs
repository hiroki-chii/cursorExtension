#![cfg_attr(windows, windows_subsystem = "windows")]

mod app_state;
mod commands;
mod config;
mod events;
mod input;
mod screen_capture;
mod shortcuts;
mod tray;
mod windows;

use app_state::AppState;
use config::store;
use tauri::{Manager, WindowEvent};

#[tauri::command]
fn capture_screen(app: tauri::AppHandle) -> Result<Option<String>, String> {
    screen_capture::capture(&app)
}

pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    shortcuts::handle(app, shortcut, event.state());
                })
                .build(),
        )
        .setup(|app| {
            let config_dir = app.path().app_config_dir()?;
            let config_path = config_dir.join("config.json");
            let legacy_path = legacy_config_path();
            let config = store::load(&config_path, legacy_path.as_deref());
            app.manage(AppState::new(config.clone(), config_path));
            windows::configure_overlay(app.handle()).map_err(std::io::Error::other)?;
            tray::setup(app.handle()).map_err(std::io::Error::other)?;
            shortcuts::register(app.handle(), &config.shortcuts);
            #[cfg(windows)]
            {
                match input::start(app.handle().clone()) {
                    Ok(hook) => {
                        app.manage(std::sync::Mutex::new(Some(hook)));
                    }
                    Err(error) => eprintln!("failed to start global input hook: {error}"),
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_config,
            commands::update_config,
            commands::set_settings_hover,
            commands::set_overlay_ignore_mouse_events,
            commands::trigger_clear_drawing,
            commands::trigger_undo_drawing,
            commands::trigger_redo_drawing,
            capture_screen
        ])
        .on_window_event(|window, event| {
            if let WindowEvent::Destroyed = event {
                if window.label() == "overlay" {
                    window.app_handle().exit(0);
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while running PresenterCursor")
        .run(|app, event| {
            if let tauri::RunEvent::Exit = event {
                if let Some(state) = app.try_state::<AppState>() {
                    state.shutdown();
                }
                if let Some(hook) =
                    app.try_state::<std::sync::Mutex<Option<input::windows::InputHook>>>()
                {
                    if let Ok(mut hook) = hook.lock() {
                        if let Some(hook) = hook.take() {
                            hook.stop();
                        }
                    }
                }
            }
        });
}

#[cfg(windows)]
fn legacy_config_path() -> Option<std::path::PathBuf> {
    std::env::var_os("APPDATA").map(|path| {
        std::path::PathBuf::from(path)
            .join("presenter-cursor")
            .join("config.json")
    })
}

#[cfg(not(windows))]
fn legacy_config_path() -> Option<std::path::PathBuf> {
    None
}
