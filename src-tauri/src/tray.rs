use crate::windows;
use tauri::{
    menu::MenuBuilder,
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};

pub fn setup(app: &AppHandle) -> Result<(), String> {
    let menu = MenuBuilder::new(app)
        .text("open-settings", "設定を開く")
        .separator()
        .text("quit", "終了")
        .build()
        .map_err(|error| error.to_string())?;
    let mut builder = TrayIconBuilder::with_id("presenter-cursor")
        .tooltip("PresenterCursor")
        .menu(&menu)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open-settings" => {
                let app_handle = app.app_handle();
                let _ = windows::open_settings(&app_handle);
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|app, event| {
            if let TrayIconEvent::DoubleClick {
                button: MouseButton::Left,
                ..
            } = event
            {
                let app_handle = app.app_handle();
                let _ = windows::open_settings(&app_handle);
            }
        });
    if let Some(icon) = app.default_window_icon().cloned() {
        builder = builder.icon(icon);
    }
    builder.build(app).map_err(|error| error.to_string())?;
    Ok(())
}
