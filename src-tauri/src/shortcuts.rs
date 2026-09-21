use crate::{app_state::AppState, commands, config::model::Shortcuts};
use serde_json::json;
use std::str::FromStr;
use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

pub fn register(app: &AppHandle, shortcuts: &Shortcuts) {
    let manager = app.global_shortcut();
    if let Err(error) = manager.unregister_all() {
        eprintln!("failed to unregister shortcuts: {error}");
    }
    let entries = [
        ("toggleSpotlight", &shortcuts.toggle_spotlight),
        ("toggleLaser", &shortcuts.toggle_laser),
        ("togglePen", &shortcuts.toggle_pen),
        ("clearDrawing", &shortcuts.clear_drawing),
        ("toggleAreaSpotlight", &shortcuts.toggle_area_spotlight),
        ("undoDrawing", &shortcuts.undo_drawing),
        ("redoDrawing", &shortcuts.redo_drawing),
        ("toggleZoom", &shortcuts.toggle_zoom),
    ];
    for (_, accelerator) in entries {
        if accelerator.is_empty() {
            continue;
        }
        match Shortcut::from_str(accelerator) {
            Ok(shortcut) => {
                if let Err(error) = manager.register(shortcut) {
                    eprintln!("failed to register shortcut {accelerator}: {error}");
                }
            }
            Err(error) => eprintln!("failed to parse shortcut {accelerator}: {error}"),
        }
    }
}

pub fn handle(app: &AppHandle, shortcut: &Shortcut, state: ShortcutState) {
    if state != ShortcutState::Pressed {
        return;
    }
    let current = app.state::<AppState>().config();
    let shortcuts = &current.shortcuts;
    let name = [
        ("toggleSpotlight", &shortcuts.toggle_spotlight),
        ("toggleLaser", &shortcuts.toggle_laser),
        ("togglePen", &shortcuts.toggle_pen),
        ("clearDrawing", &shortcuts.clear_drawing),
        ("toggleAreaSpotlight", &shortcuts.toggle_area_spotlight),
        ("undoDrawing", &shortcuts.undo_drawing),
        ("redoDrawing", &shortcuts.redo_drawing),
        ("toggleZoom", &shortcuts.toggle_zoom),
    ]
    .into_iter()
    .find_map(|(name, accelerator)| {
        Shortcut::from_str(accelerator)
            .ok()
            .filter(|value| value == shortcut)
            .map(|_| name)
    });
    let Some(name) = name else { return };
    match name {
        "clearDrawing" => {
            let _ = commands::trigger_clear_drawing(app.clone(), true);
        }
        "undoDrawing" => {
            let _ = commands::trigger_undo_drawing(app.clone());
        }
        "redoDrawing" => {
            let _ = commands::trigger_redo_drawing(app.clone());
        }
        "toggleAreaSpotlight" => {
            update(
                app,
                json!({"areaSpotlight": {"enabled": !current.area_spotlight.enabled, "rect": null}}),
            );
        }
        "toggleSpotlight" => {
            update(
                app,
                json!({"spotlight": {"enabled": !current.spotlight.enabled}}),
            );
        }
        "toggleLaser" => {
            update(app, json!({"laser": {"enabled": !current.laser.enabled}}));
        }
        "togglePen" => {
            update(app, json!({"pen": {"enabled": !current.pen.enabled}}));
        }
        "toggleZoom" => {
            update(app, json!({"zoom": {"enabled": !current.zoom.enabled}}));
        }
        _ => {}
    }
}

fn update(app: &AppHandle, value: serde_json::Value) {
    if let Err(error) = commands::apply_config_update(app, &app.state::<AppState>(), value) {
        eprintln!("shortcut config update failed: {error}");
    }
}
