use crate::config::model::Config;
use std::path::PathBuf;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Mutex, RwLock,
};

pub struct AppState {
    pub config: RwLock<Config>,
    pub settings_focused: Mutex<bool>,
    pub settings_hovered: Mutex<bool>,
    pub shutting_down: AtomicBool,
    pub config_path: PathBuf,
}

impl AppState {
    pub fn new(config: Config, config_path: PathBuf) -> Self {
        Self {
            config: RwLock::new(config),
            settings_focused: Mutex::new(false),
            settings_hovered: Mutex::new(false),
            shutting_down: AtomicBool::new(false),
            config_path,
        }
    }

    pub fn config(&self) -> Config {
        self.config.read().expect("config lock poisoned").clone()
    }

    pub fn settings_active(&self) -> bool {
        *self.settings_focused.lock().expect("focus lock poisoned")
            || *self.settings_hovered.lock().expect("hover lock poisoned")
    }

    pub fn shutdown(&self) {
        self.shutting_down.store(true, Ordering::Release);
    }
}
