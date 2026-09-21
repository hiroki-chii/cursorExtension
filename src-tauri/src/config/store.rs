use super::model::Config;
use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
};

pub fn load(config_path: &Path, legacy_path: Option<&Path>) -> Config {
    if config_path.exists() {
        return read_config(config_path);
    }

    if let Some(legacy_path) = legacy_path.filter(|path| path.exists()) {
        let config = read_config(legacy_path);
        if let Err(error) = save(config_path, &config) {
            eprintln!("failed to migrate legacy config: {error}");
        }
        return config;
    }

    Config::default()
}

fn read_config(path: &Path) -> Config {
    match fs::read_to_string(path)
        .map_err(|error| error.to_string())
        .and_then(|data| serde_json::from_str::<Config>(&data).map_err(|error| error.to_string()))
    {
        Ok(config) => config,
        Err(error) => {
            eprintln!("failed to load config {}: {error}", path.display());
            Config::default()
        }
    }
}

pub fn save(path: &Path, config: &Config) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "config path has no parent".to_string())?;
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    let temp_path = PathBuf::from(format!("{}.tmp", path.display()));
    let data = serde_json::to_vec_pretty(config).map_err(|error| error.to_string())?;
    let mut file = fs::File::create(&temp_path).map_err(|error| error.to_string())?;
    file.write_all(&data).map_err(|error| error.to_string())?;
    file.sync_all().map_err(|error| error.to_string())?;
    drop(file);
    if path.exists() {
        fs::remove_file(path).map_err(|error| error.to_string())?;
    }
    fs::rename(&temp_path, path).map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_dir() -> PathBuf {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!("presenter-cursor-test-{suffix}"))
    }

    #[test]
    fn imports_legacy_only_when_new_config_is_missing() {
        let dir = temp_dir();
        fs::create_dir_all(&dir).unwrap();
        let current = dir.join("config.json");
        let legacy = dir.join("legacy.json");
        fs::write(&legacy, r#"{"theme":"dark","pen":{"enabled":true}}"#).unwrap();
        let config = load(&current, Some(&legacy));
        assert_eq!(config.theme, "dark");
        assert!(config.pen.enabled);
        assert!(current.exists());
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn current_config_wins_over_legacy() {
        let dir = temp_dir();
        fs::create_dir_all(&dir).unwrap();
        let current = dir.join("config.json");
        let legacy = dir.join("legacy.json");
        fs::write(&current, r#"{"theme":"light"}"#).unwrap();
        fs::write(&legacy, r#"{"theme":"dark"}"#).unwrap();
        assert_eq!(load(&current, Some(&legacy)).theme, "light");
        fs::remove_dir_all(dir).unwrap();
    }
}
