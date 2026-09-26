use super::keymap::to_uiohook_keycode;
use crate::events;
use serde_json::json;
use std::{
    sync::{
        mpsc::{self, Sender},
        OnceLock,
    },
    thread::{self, JoinHandle},
};
use tauri::{AppHandle, Emitter, Manager};
use windows::Win32::{
    Foundation::{LPARAM, LRESULT, WPARAM},
    System::Threading::GetCurrentThreadId,
    UI::{
        Input::KeyboardAndMouse::{
            GetAsyncKeyState, VK_CONTROL, VK_LCONTROL, VK_LMENU, VK_LSHIFT, VK_LWIN, VK_MENU,
            VK_RCONTROL, VK_RMENU, VK_RSHIFT, VK_RWIN, VK_SHIFT,
        },
        WindowsAndMessaging::{
            CallNextHookEx, DispatchMessageW, GetMessageW, PostThreadMessageW, SetWindowsHookExW,
            TranslateMessage, UnhookWindowsHookEx, KBDLLHOOKSTRUCT, MSG, MSLLHOOKSTRUCT,
            WH_KEYBOARD_LL, WH_MOUSE_LL, WM_KEYDOWN, WM_KEYUP, WM_LBUTTONDOWN, WM_LBUTTONUP,
            WM_MBUTTONDOWN, WM_MBUTTONUP, WM_MOUSEMOVE, WM_MOUSEWHEEL, WM_QUIT, WM_RBUTTONDOWN,
            WM_RBUTTONUP,
        },
    },
};

enum RawInput {
    Mouse {
        kind: &'static str,
        x: i32,
        y: i32,
        button: Option<u32>,
    },
    Wheel {
        rotation: i32,
        amount: i32,
        direction: i32,
    },
    Key {
        kind: &'static str,
        vk: u32,
        extended: bool,
    },
    Stop,
}
static MOUSE_SENDER: OnceLock<Sender<RawInput>> = OnceLock::new();
static KEY_SENDER: OnceLock<Sender<RawInput>> = OnceLock::new();

pub struct InputHook {
    thread_id: u32,
    stop_sender: Sender<RawInput>,
    join: Option<JoinHandle<()>>,
}

#[derive(Clone, Copy)]
struct OverlaySurface {
    x: i32,
    y: i32,
    width: u32,
    height: u32,
    scale: f64,
}

impl Default for OverlaySurface {
    fn default() -> Self {
        Self {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            scale: 1.0,
        }
    }
}

impl InputHook {
    pub fn start(app: AppHandle) -> Result<Self, String> {
        // Read window geometry on Tauri's setup thread and keep it stable for the
        // high-frequency hook dispatcher, which runs on a background thread.
        let surface = overlay_surface(&app);
        let (tx, rx) = mpsc::channel();
        let _ = MOUSE_SENDER.set(tx.clone());
        let _ = KEY_SENDER.set(tx.clone());
        let (ready_tx, ready_rx) = mpsc::channel();
        let join = thread::spawn(move || unsafe {
            let thread_id = GetCurrentThreadId();
            let mouse = SetWindowsHookExW(WH_MOUSE_LL, Some(mouse_proc), None, 0)
                .map_err(|error| error.to_string());
            let keyboard = SetWindowsHookExW(WH_KEYBOARD_LL, Some(keyboard_proc), None, 0)
                .map_err(|error| error.to_string());
            let (mouse, keyboard) = match (mouse, keyboard) {
                (Ok(mouse), Ok(keyboard)) => (mouse, keyboard),
                (mouse, keyboard) => {
                    let _ = ready_tx.send(Err(format!("mouse={mouse:?}, keyboard={keyboard:?}")));
                    return;
                }
            };
            let _ = ready_tx.send(Ok(thread_id));
            let dispatcher = thread::spawn(move || {
                while let Ok(event) = rx.recv() {
                    match event {
                        RawInput::Mouse { kind, x, y, button } => {
                            let mut payload = json!({
                                "type": kind,
                                // Keep the legacy logical coordinates available if the
                                // WebView cannot provide its viewport dimensions.
                                "x": (f64::from(x) - f64::from(surface.x)) / surface.scale,
                                "y": (f64::from(y) - f64::from(surface.y)) / surface.scale,
                                "screenX": x,
                                "screenY": y,
                                "originX": surface.x,
                                "originY": surface.y,
                                "surfaceWidth": surface.width,
                                "surfaceHeight": surface.height
                            });
                            if let Some(button) = button {
                                payload["button"] = json!(button);
                            }
                            let _ = app.emit_to("overlay", events::GLOBAL_MOUSE, payload);
                        }
                        RawInput::Wheel {
                            rotation,
                            amount,
                            direction,
                        } => {
                            let _ = app.emit_to("overlay", events::GLOBAL_WHEEL, json!({"rotation": rotation, "amount": amount, "direction": direction}));
                        }
                        RawInput::Key { kind, vk, extended } => {
                            if let Some(keycode) = to_uiohook_keycode(vk, extended) {
                                let _ = app.emit_to("overlay", events::GLOBAL_KEY, json!({
                                    "type": kind, "keycode": keycode, "ctrlKey": key_down(VK_CONTROL) || key_down(VK_LCONTROL) || key_down(VK_RCONTROL),
                                    "altKey": key_down(VK_MENU) || key_down(VK_LMENU) || key_down(VK_RMENU), "shiftKey": key_down(VK_SHIFT) || key_down(VK_LSHIFT) || key_down(VK_RSHIFT),
                                    "metaKey": key_down(VK_LWIN) || key_down(VK_RWIN)
                                }));
                            }
                        }
                        RawInput::Stop => break,
                    }
                }
            });
            let mut message = MSG::default();
            while GetMessageW(&mut message, None, 0, 0).as_bool() {
                let _ = TranslateMessage(&message);
                DispatchMessageW(&message);
            }
            let _ = UnhookWindowsHookEx(mouse);
            let _ = UnhookWindowsHookEx(keyboard);
            let _ = dispatcher.join();
        });
        let thread_id = ready_rx.recv().map_err(|error| error.to_string())??;
        Ok(Self {
            thread_id,
            stop_sender: tx,
            join: Some(join),
        })
    }

    pub fn stop(mut self) {
        let _ = self.stop_sender.send(RawInput::Stop);
        unsafe {
            let _ = PostThreadMessageW(self.thread_id, WM_QUIT, WPARAM(0), LPARAM(0));
        }
        if let Some(join) = self.join.take() {
            let _ = join.join();
        }
    }
}

fn key_down(key: windows::Win32::UI::Input::KeyboardAndMouse::VIRTUAL_KEY) -> bool {
    unsafe { GetAsyncKeyState(key.0 as i32) < 0 }
}

fn overlay_surface(app: &AppHandle) -> OverlaySurface {
    if let Some(window) = app.get_webview_window("overlay") {
        if let (Ok(position), Ok(size), Ok(scale)) = (
            window.inner_position(),
            window.inner_size(),
            window.scale_factor(),
        ) {
            return OverlaySurface {
                x: position.x,
                y: position.y,
                width: size.width,
                height: size.height,
                scale,
            };
        }
    }
    OverlaySurface::default()
}

unsafe extern "system" fn mouse_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    if code >= 0 {
        let event = &*(lparam.0 as *const MSLLHOOKSTRUCT);
        let message = wparam.0 as u32;
        let value = match message {
            WM_MOUSEMOVE => Some(RawInput::Mouse {
                kind: "move",
                x: event.pt.x,
                y: event.pt.y,
                button: None,
            }),
            WM_LBUTTONDOWN => Some(RawInput::Mouse {
                kind: "down",
                x: event.pt.x,
                y: event.pt.y,
                button: Some(1),
            }),
            WM_LBUTTONUP => Some(RawInput::Mouse {
                kind: "up",
                x: event.pt.x,
                y: event.pt.y,
                button: Some(1),
            }),
            WM_RBUTTONDOWN => Some(RawInput::Mouse {
                kind: "down",
                x: event.pt.x,
                y: event.pt.y,
                button: Some(2),
            }),
            WM_RBUTTONUP => Some(RawInput::Mouse {
                kind: "up",
                x: event.pt.x,
                y: event.pt.y,
                button: Some(2),
            }),
            WM_MBUTTONDOWN => Some(RawInput::Mouse {
                kind: "down",
                x: event.pt.x,
                y: event.pt.y,
                button: Some(3),
            }),
            WM_MBUTTONUP => Some(RawInput::Mouse {
                kind: "up",
                x: event.pt.x,
                y: event.pt.y,
                button: Some(3),
            }),
            WM_MOUSEWHEEL => {
                let rotation = ((event.mouseData >> 16) as u16 as i16) as i32;
                Some(RawInput::Wheel {
                    rotation,
                    amount: 1,
                    direction: if rotation < 0 { -1 } else { 1 },
                })
            }
            _ => None,
        };
        if let Some(event) = value {
            if let Some(sender) = MOUSE_SENDER.get() {
                let _ = sender.send(event);
            }
        }
    }
    CallNextHookEx(None, code, wparam, lparam)
}

unsafe extern "system" fn keyboard_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    if code >= 0 {
        let event = &*(lparam.0 as *const KBDLLHOOKSTRUCT);
        let message = wparam.0 as u32;
        let kind = match message {
            WM_KEYDOWN => Some("down"),
            WM_KEYUP => Some("up"),
            _ => None,
        };
        if let Some(kind) = kind {
            if let Some(sender) = KEY_SENDER.get() {
                let _ = sender.send(RawInput::Key {
                    kind,
                    vk: event.vkCode,
                    extended: event.flags.0 & 1 != 0,
                });
            }
        }
    }
    CallNextHookEx(None, code, wparam, lparam)
}
