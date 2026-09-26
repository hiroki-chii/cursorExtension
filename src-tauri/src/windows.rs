use crate::{app_state::AppState, config::model::Config, events};
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DisplayBounds {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

impl DisplayBounds {
    pub fn union(displays: impl IntoIterator<Item = Self>) -> Option<Self> {
        displays.into_iter().reduce(|a, b| {
            let x = a.x.min(b.x);
            let y = a.y.min(b.y);
            let right =
                (i64::from(a.x) + i64::from(a.width)).max(i64::from(b.x) + i64::from(b.width));
            let bottom =
                (i64::from(a.y) + i64::from(a.height)).max(i64::from(b.y) + i64::from(b.height));
            Self {
                x,
                y,
                width: (right - i64::from(x)) as u32,
                height: (bottom - i64::from(y)) as u32,
            }
        })
    }
}

pub fn configure_overlay(app: &AppHandle) -> Result<(), String> {
    let Some(overlay) = app.get_webview_window("overlay") else {
        return Err("overlay window is missing".into());
    };
    let monitors = overlay
        .available_monitors()
        .map_err(|error| error.to_string())?;
    let bounds = DisplayBounds::union(monitors.iter().map(|monitor| DisplayBounds {
        x: monitor.position().x,
        y: monitor.position().y,
        width: monitor.size().width,
        height: monitor.size().height,
    }))
    .ok_or_else(|| "no monitors found".to_string())?;
    overlay
        .set_position(tauri::PhysicalPosition::new(bounds.x, bounds.y))
        .map_err(|error| error.to_string())?;
    overlay
        .set_size(tauri::PhysicalSize::new(bounds.width, bounds.height))
        .map_err(|error| error.to_string())?;
    overlay
        .set_always_on_top(true)
        .map_err(|error| error.to_string())?;
    overlay
        .set_ignore_cursor_events(true)
        .map_err(|error| error.to_string())?;
    Ok(())
}

pub fn open_settings(app: &AppHandle) -> Result<(), String> {
    if let Some(settings) = app.get_webview_window("settings") {
        if settings.is_minimized().map_err(|error| error.to_string())? {
            settings.unminimize().map_err(|error| error.to_string())?;
        }
        settings.show().map_err(|error| error.to_string())?;
        settings.set_focus().map_err(|error| error.to_string())?;
        return Ok(());
    }

    let app_handle = app.clone();
    let settings = WebviewWindowBuilder::new(app, "settings", WebviewUrl::App("index.html".into()))
        .title("PresenterCursor 設定")
        .inner_size(650.0, 800.0)
        .min_inner_size(650.0, 600.0)
        .max_inner_size(650.0, 10000.0)
        .resizable(false)
        .visible(true)
        .build()
        .map_err(|error| error.to_string())?;

    settings.on_window_event(move |event| {
        let state = app_handle.state::<AppState>();
        match event {
            WindowEvent::Focused(focused) => {
                if let Ok(mut value) = state.settings_focused.lock() {
                    *value = *focused;
                }
                if !focused {
                    if let Ok(mut value) = state.settings_hovered.lock() {
                        *value = false;
                    }
                }
                sync_settings_state(&app_handle);
            }
            WindowEvent::CloseRequested { .. } | WindowEvent::Destroyed => {
                if let Ok(mut value) = state.settings_focused.lock() {
                    *value = false;
                }
                if let Ok(mut value) = state.settings_hovered.lock() {
                    *value = false;
                }
                sync_settings_state(&app_handle);
            }
            _ => {}
        }
    });
    Ok(())
}

pub fn sync_settings_state(app: &AppHandle) {
    let Some(overlay) = app.get_webview_window("overlay") else {
        return;
    };
    let state = app.state::<AppState>();
    let active = state.settings_active();
    let _ = app.emit_to("overlay", events::SETTINGS_STATE_CHANGED, active);

    let config = state.config();
    let area_selecting = config.area_spotlight.enabled && config.area_spotlight.rect.is_none();
    let ignore = active || (!config.pen.enabled && !area_selecting && !config.zoom.enabled);
    let _ = overlay.set_ignore_cursor_events(ignore);
}

#[allow(dead_code)]
pub fn interaction_is_enabled(config: &Config, settings_active: bool) -> bool {
    if settings_active {
        return false;
    }
    config.pen.enabled
        || config.zoom.enabled
        || (config.area_spotlight.enabled && config.area_spotlight.rect.is_none())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn desktop_bounds_cover_negative_origins_and_unequal_displays() {
        let main = DisplayBounds {
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
        };
        let left = DisplayBounds {
            x: -2560,
            y: -360,
            width: 2560,
            height: 1440,
        };
        let above = DisplayBounds {
            x: 400,
            y: -1560,
            width: 1920,
            height: 1200,
        };
        assert_eq!(
            DisplayBounds::union([main, left, above]),
            Some(DisplayBounds {
                x: -2560,
                y: -1560,
                width: 4880,
                height: 2640,
            })
        );
        assert_eq!(DisplayBounds::union([main]), Some(main));
        assert_eq!(DisplayBounds::union([]), None);
    }

    #[test]
    fn settings_activity_always_disables_interaction() {
        let mut config = Config::default();
        config.pen.enabled = true;
        assert!(!interaction_is_enabled(&config, true));
        assert!(interaction_is_enabled(&config, false));
    }
}
