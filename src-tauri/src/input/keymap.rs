pub fn to_uiohook_keycode(vk: u32, extended: bool) -> Option<u32> {
    let code = match vk {
        0x1B => 1,
        0x31 => 2,
        0x32 => 3,
        0x33 => 4,
        0x34 => 5,
        0x35 => 6,
        0x36 => 7,
        0x37 => 8,
        0x38 => 9,
        0x39 => 10,
        0x30 => 11,
        0xBD => 12,
        0xBB => 13,
        0x08 => 14,
        0x09 => 15,
        0x51 => 16,
        0x57 => 17,
        0x45 => 18,
        0x52 => 19,
        0x54 => 20,
        0x59 => 21,
        0x55 => 22,
        0x49 => 23,
        0x4F => 24,
        0x50 => 25,
        0xDB => 26,
        0xDD => 27,
        0x0D => 28,
        0xA2 => {
            if extended {
                3613
            } else {
                29
            }
        }
        0x41 => 30,
        0x53 => 31,
        0x44 => 32,
        0x46 => 33,
        0x47 => 34,
        0x48 => 35,
        0x4A => 36,
        0x4B => 37,
        0x4C => 38,
        0xBA => 39,
        0xDE => 40,
        0xC0 => 41,
        0xA0 => 42,
        0xDC => 43,
        0x5A => 44,
        0x58 => 45,
        0x43 => 46,
        0x56 => 47,
        0x42 => 48,
        0x4E => 49,
        0x4D => 50,
        0xBC => 51,
        0xBE => 52,
        0xBF => 53,
        0xA1 => 54,
        0x12 => {
            if extended {
                3640
            } else {
                56
            }
        }
        0x20 => 57,
        0x14 => 58,
        0x70 => 59,
        0x71 => 60,
        0x72 => 61,
        0x73 => 62,
        0x74 => 63,
        0x75 => 64,
        0x76 => 65,
        0x77 => 66,
        0x78 => 67,
        0x79 => 68,
        0x7A => 87,
        0x7B => 88,
        0x5B | 0x5C => {
            if extended {
                3675
            } else {
                3676
            }
        }
        0x2C => 3639,
        0x91 => 70,
        0x13 => 3653,
        0x2D => 3666,
        0x24 => 3655,
        0x21 => 3657,
        0x2E => 3667,
        0x23 => 3659,
        0x22 => 3665,
        0x26 => 57416,
        0x28 => 57424,
        0x25 => 57419,
        0x27 => 57421,
        _ => return None,
    };
    Some(code)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn maps_frontend_key_contract() {
        assert_eq!(to_uiohook_keycode(0x1B, false), Some(1));
        assert_eq!(to_uiohook_keycode(0x20, false), Some(57));
        assert_eq!(to_uiohook_keycode(0xA2, true), Some(3613));
        assert_eq!(to_uiohook_keycode(0xFF, false), None);
    }
}
