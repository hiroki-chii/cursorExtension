use base64::{engine::general_purpose::STANDARD, Engine};
use image::{DynamicImage, ImageFormat};
use std::{io::Cursor, thread, time::Duration};
use tauri::{AppHandle, Manager};

pub fn capture(app: &AppHandle) -> Result<Option<String>, String> {
    let overlay = app.get_webview_window("overlay");
    let settings = app.get_webview_window("settings");
    let overlay_visible = overlay
        .as_ref()
        .and_then(|window| window.is_visible().ok())
        .unwrap_or(false);
    let settings_visible = settings
        .as_ref()
        .and_then(|window| Some(window.is_visible().ok()? && !window.is_minimized().ok()?))
        .unwrap_or(false);
    let settings_focused = settings_visible
        && settings
            .as_ref()
            .and_then(|window| window.is_focused().ok())
            .unwrap_or(false);

    if overlay_visible {
        if let Some(window) = &overlay {
            window.hide().map_err(|error| error.to_string())?;
        }
    }
    if settings_visible {
        if let Some(window) = &settings {
            window.hide().map_err(|error| error.to_string())?;
        }
    }
    if overlay_visible || settings_visible {
        thread::sleep(Duration::from_millis(80));
    }

    let result = (|| {
        let monitors = xcap::Monitor::all().map_err(|error| error.to_string())?;
        let monitor = monitors
            .into_iter()
            .find(|monitor| monitor.is_primary().unwrap_or(false))
            .ok_or_else(|| "primary monitor not found".to_string())?;
        let image = monitor.capture_image().map_err(|error| error.to_string())?;
        let mut bytes = Vec::new();
        DynamicImage::ImageRgba8(image)
            .write_to(&mut Cursor::new(&mut bytes), ImageFormat::Png)
            .map_err(|error| error.to_string())?;
        Ok::<_, String>(Some(format!(
            "data:image/png;base64,{}",
            STANDARD.encode(bytes)
        )))
    })();

    if settings_visible {
        if let Some(window) = &settings {
            if settings_focused {
                let _ = window.show();
                let _ = window.set_focus();
            } else {
                let _ = window.show();
            }
        }
    }
    if overlay_visible {
        if let Some(window) = &overlay {
            let _ = window.show();
        }
    }
    result
}
