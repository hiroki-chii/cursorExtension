pub mod keymap;

#[cfg(windows)]
pub mod windows;

#[cfg(windows)]
pub fn start(app: tauri::AppHandle) -> Result<windows::InputHook, String> {
    windows::InputHook::start(app)
}
