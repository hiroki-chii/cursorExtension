use crate::windows::DisplayBounds;
use base64::{engine::general_purpose::STANDARD, Engine};
use image::{imageops, DynamicImage, ImageFormat, Rgba, RgbaImage};
use std::{io::Cursor, thread, time::Duration};
use tauri::{AppHandle, Manager};

pub fn capture(app: &AppHandle) -> Result<Option<String>, String> {
    let overlay = app.get_webview_window("overlay");
    let window = overlay.as_ref().ok_or("overlay window is missing")?;
    let position = window.inner_position().map_err(|error| error.to_string())?;
    let size = window.inner_size().map_err(|error| error.to_string())?;
    let bounds = DisplayBounds {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
    };
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
        if monitors.is_empty() {
            return Err("no monitors found".to_string());
        }
        // Keep the screenshot in the same physical coordinate space as the overlay.
        let mut image = RgbaImage::from_pixel(bounds.width, bounds.height, Rgba([0, 0, 0, 255]));
        for monitor in monitors {
            let x = monitor.x().map_err(|error| error.to_string())?;
            let y = monitor.y().map_err(|error| error.to_string())?;
            let captured = monitor.capture_image().map_err(|error| error.to_string())?;
            place_monitor(&mut image, &captured, bounds, x, y);
        }
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

fn place_monitor(
    desktop: &mut RgbaImage,
    monitor: &RgbaImage,
    bounds: DisplayBounds,
    x: i32,
    y: i32,
) {
    imageops::replace(
        desktop,
        monitor,
        i64::from(x) - i64::from(bounds.x),
        i64::from(y) - i64::from(bounds.y),
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn capture_preserves_monitor_positions_and_gaps() {
        let bounds = DisplayBounds {
            x: -2,
            y: -1,
            width: 4,
            height: 3,
        };
        let black = Rgba([0, 0, 0, 255]);
        let red = Rgba([255, 0, 0, 255]);
        let blue = Rgba([0, 0, 255, 255]);
        let mut desktop = RgbaImage::from_pixel(4, 3, black);
        place_monitor(
            &mut desktop,
            &RgbaImage::from_pixel(2, 2, red),
            bounds,
            -2,
            -1,
        );
        place_monitor(
            &mut desktop,
            &RgbaImage::from_pixel(2, 2, blue),
            bounds,
            0,
            0,
        );
        assert_eq!(*desktop.get_pixel(0, 0), red);
        assert_eq!(*desktop.get_pixel(1, 1), red);
        assert_eq!(*desktop.get_pixel(2, 1), blue);
        assert_eq!(*desktop.get_pixel(3, 2), blue);
        assert_eq!(*desktop.get_pixel(3, 0), black);
        assert_eq!(*desktop.get_pixel(0, 2), black);
    }
}
