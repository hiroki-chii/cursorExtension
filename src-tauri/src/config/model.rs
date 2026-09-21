use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Rect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(default)]
pub struct Spotlight {
    pub enabled: bool,
    pub radius: f64,
    pub opacity: f64,
}

impl Default for Spotlight {
    fn default() -> Self {
        Self {
            enabled: false,
            radius: 120.0,
            opacity: 0.6,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(default)]
pub struct AreaSpotlight {
    pub enabled: bool,
    pub rect: Option<Rect>,
    pub opacity: f64,
    #[serde(rename = "borderColor")]
    pub border_color: String,
    #[serde(rename = "borderWidth")]
    pub border_width: f64,
}

impl Default for AreaSpotlight {
    fn default() -> Self {
        Self {
            enabled: false,
            rect: None,
            opacity: 0.6,
            border_color: "#3b82f6".into(),
            border_width: 2.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(default)]
pub struct Laser {
    pub enabled: bool,
    pub radius: f64,
    pub color: String,
    #[serde(rename = "trailLength")]
    pub trail_length: u32,
}

impl Default for Laser {
    fn default() -> Self {
        Self {
            enabled: false,
            radius: 6.0,
            color: "#ef4444".into(),
            trail_length: 8,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(default)]
pub struct Ripple {
    pub enabled: bool,
    #[serde(rename = "leftColor")]
    pub left_color: String,
    #[serde(rename = "rightColor")]
    pub right_color: String,
    pub radius: f64,
    pub speed: f64,
}

impl Default for Ripple {
    fn default() -> Self {
        Self {
            enabled: true,
            left_color: "#ef4444".into(),
            right_color: "#3b82f6".into(),
            radius: 35.0,
            speed: 1.5,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(default)]
pub struct Pen {
    pub enabled: bool,
    pub color: String,
    pub width: f64,
    #[serde(rename = "triggerKey")]
    pub trigger_key: String,
    pub opacity: f64,
}

impl Default for Pen {
    fn default() -> Self {
        Self {
            enabled: false,
            color: "#eab308".into(),
            width: 4.0,
            trigger_key: "Shift".into(),
            opacity: 0.8,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(default)]
pub struct Zoom {
    pub enabled: bool,
    pub radius: f64,
    pub scale: f64,
    #[serde(rename = "minScale")]
    pub min_scale: f64,
    #[serde(rename = "maxScale")]
    pub max_scale: f64,
}

impl Default for Zoom {
    fn default() -> Self {
        Self {
            enabled: false,
            radius: 150.0,
            scale: 2.0,
            min_scale: 1.0,
            max_scale: 5.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(default)]
pub struct Keycast {
    pub enabled: bool,
    pub duration: u64,
}

impl Default for Keycast {
    fn default() -> Self {
        Self {
            enabled: false,
            duration: 2000,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(default)]
pub struct Gesture {
    pub enabled: bool,
}

impl Default for Gesture {
    fn default() -> Self {
        Self { enabled: true }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(default)]
pub struct Shortcuts {
    #[serde(rename = "toggleSpotlight")]
    pub toggle_spotlight: String,
    #[serde(rename = "toggleLaser")]
    pub toggle_laser: String,
    #[serde(rename = "togglePen")]
    pub toggle_pen: String,
    #[serde(rename = "clearDrawing")]
    pub clear_drawing: String,
    #[serde(rename = "toggleAreaSpotlight")]
    pub toggle_area_spotlight: String,
    #[serde(rename = "undoDrawing")]
    pub undo_drawing: String,
    #[serde(rename = "redoDrawing")]
    pub redo_drawing: String,
    #[serde(rename = "toggleZoom")]
    pub toggle_zoom: String,
}

impl Default for Shortcuts {
    fn default() -> Self {
        Self {
            toggle_spotlight: "CommandOrControl+Shift+S".into(),
            toggle_laser: "CommandOrControl+Shift+L".into(),
            toggle_pen: "CommandOrControl+Shift+P".into(),
            clear_drawing: "CommandOrControl+Shift+C".into(),
            toggle_area_spotlight: "CommandOrControl+Shift+A".into(),
            undo_drawing: "CommandOrControl+Shift+Z".into(),
            redo_drawing: "CommandOrControl+Shift+Y".into(),
            toggle_zoom: "CommandOrControl+Shift+M".into(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(default)]
pub struct Config {
    pub theme: String,
    pub spotlight: Spotlight,
    #[serde(rename = "areaSpotlight")]
    pub area_spotlight: AreaSpotlight,
    pub laser: Laser,
    pub ripple: Ripple,
    pub pen: Pen,
    pub zoom: Zoom,
    pub keycast: Keycast,
    pub gesture: Gesture,
    pub shortcuts: Shortcuts,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            theme: "system".into(),
            spotlight: Spotlight::default(),
            area_spotlight: AreaSpotlight::default(),
            laser: Laser::default(),
            ripple: Ripple::default(),
            pen: Pen::default(),
            zoom: Zoom::default(),
            keycast: Keycast::default(),
            gesture: Gesture::default(),
            shortcuts: Shortcuts::default(),
        }
    }
}

impl Config {
    pub fn merge_update(&self, update: &Value) -> Result<(Self, bool), String> {
        let mut current = serde_json::to_value(self).map_err(|error| error.to_string())?;
        let Some(update_object) = update.as_object() else {
            return Err("config update must be an object".into());
        };
        let current_object = current
            .as_object_mut()
            .expect("Config serializes to object");
        for (key, value) in update_object {
            if let Some(section) = value.as_object() {
                let target = current_object
                    .entry(key)
                    .or_insert_with(|| Value::Object(Default::default()));
                if let Some(target_section) = target.as_object_mut() {
                    for (field, field_value) in section {
                        target_section.insert(field.clone(), field_value.clone());
                    }
                } else {
                    *target = Value::Object(section.clone());
                }
            } else {
                current_object.insert(key.clone(), value.clone());
            }
        }
        let next: Self = serde_json::from_value(current).map_err(|error| error.to_string())?;
        Ok((next.clone(), self.shortcuts != next.shortcuts))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_match_frontend_schema() {
        let config = Config::default();
        assert_eq!(config.theme, "system");
        assert_eq!(config.ripple.radius, 35.0);
        assert_eq!(config.shortcuts.toggle_zoom, "CommandOrControl+Shift+M");
    }

    #[test]
    fn partial_sections_are_merged_and_shortcuts_detected() {
        let current = Config::default();
        let (next, changed) = current
            .merge_update(&serde_json::json!({
                "pen": { "enabled": true },
                "shortcuts": { "toggleZoom": "Ctrl+Alt+M" }
            }))
            .unwrap();
        assert!(next.pen.enabled);
        assert_eq!(next.pen.width, 4.0);
        assert!(changed);
    }
}
