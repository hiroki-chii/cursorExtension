import React, { useEffect, useRef, useState } from 'react';
import { recognizeGesture } from './gestureRecognizer';

// uiohook-napi から送られてくるキーコードのマップ
const KEY_MAP = {
  1: 'Esc', 59: 'F1', 60: 'F2', 61: 'F3', 62: 'F4', 63: 'F5', 64: 'F6', 65: 'F7', 66: 'F8', 67: 'F9', 68: 'F10', 87: 'F11', 88: 'F12',
  2: '1', 3: '2', 4: '3', 5: '4', 6: '5', 7: '6', 8: '7', 9: '8', 10: '9', 11: '0', 12: '-', 13: '=', 14: 'Backspace',
  15: 'Tab', 16: 'Q', 17: 'W', 18: 'E', 19: 'R', 20: 'T', 21: 'Y', 22: 'U', 23: 'I', 24: 'O', 25: 'P', 26: '[', 27: ']', 28: 'Enter',
  29: 'Ctrl', 30: 'A', 31: 'S', 32: 'D', 33: 'F', 34: 'G', 35: 'H', 36: 'J', 37: 'K', 38: 'L', 39: ';', 40: "'", 41: '`',
  42: 'Shift', 43: '\\', 44: 'Z', 45: 'X', 46: 'C', 47: 'V', 48: 'B', 49: 'N', 50: 'M', 51: ',', 52: '.', 53: '/', 54: 'Shift',
  56: 'Alt', 57: 'Space', 58: 'CapsLock', 3675: 'Win', 3676: 'Win', 3613: 'Ctrl', 3640: 'Alt',
  57416: '↑', 57424: '↓', 57419: '←', 57421: '→',
  3639: 'PrtScn', 70: 'ScrollLock', 3653: 'Pause', 3666: 'Insert', 3655: 'Home', 3657: 'PgUp', 3667: 'Delete', 3659: 'End', 3665: 'PgDn'
};

// トリガーキーマップ
const TRIGGER_KEYS = {
  'Shift': [42, 54],
  'Alt': [56, 3640],
  'Ctrl': [29, 3613],
  'Space': [57]
};

export default function App() {
  const canvasRef = useRef(null);
  const [config, setConfig] = useState(null);
  const [keyCast, setKeyCast] = useState({ text: '', visible: false, timestamp: 0 });
  const [isSettingsActive, setIsSettingsActive] = useState(false);
  const isSettingsActiveRef = useRef(false);
  const [isRecordingGesture, setIsRecordingGesture] = useState(false);
  const isRecordingGestureRef = useRef(false);
  const gesturePointsRef = useRef([]);
  
  // 描画ループで確実に最新値を取得するため、refを使用
  const mousePosRef = useRef({ x: 0, y: 0 });
  const laserHistoryRef = useRef([]); // レーザーの軌跡保存
  const ripplesRef = useRef([]); // クリック波紋保存
  
  // 手書きペンデータ
  const strokesRef = useRef([]);
  const redoStrokesRef = useRef([]); // やり直し用
  const currentStrokeRef = useRef(null);
  const isDrawingRef = useRef(false);

  // エリアスポットライト選択用のステート/Ref
  const selectionStartRef = useRef(null);
  const [tempRect, setTempRect] = useState(null);

  // ズーム用のステート/Ref
  const [captureUrl, setCaptureUrl] = useState(null);
  const captureImageRef = useRef(null);
  const zoomScaleRef = useRef(2.0);

  // 手書きトリガーキーの押下状態
  const [isTriggerKeyPressed, setIsTriggerKeyPressed] = useState(false);
  const isTriggerKeyPressedRef = useRef(false);

  useEffect(() => {
    isSettingsActiveRef.current = isSettingsActive;
    if (isSettingsActive) {
      laserHistoryRef.current = [];
      ripplesRef.current = [];
    }
  }, [isSettingsActive]);

  // ペンモードの有効/無効切り替え時に描画状態およびトリガー状態をリセット
  useEffect(() => {
    isDrawingRef.current = false;
    currentStrokeRef.current = null;
    if (isTriggerKeyPressedRef.current) {
      isTriggerKeyPressedRef.current = false;
      setIsTriggerKeyPressed(false);
    }
    
    // 透過状態を同期
    if (config) {
      const isAreaSelecting = config.areaSpotlight?.enabled && !config.areaSpotlight?.rect;
      const isZoomActive = config.zoom?.enabled;
      const updatedIsInteractive = config.pen?.enabled || isAreaSelecting || isZoomActive || isRecordingGestureRef.current;
      if (window.electronAPI) {
        window.electronAPI.setIgnoreMouseEvents(!updatedIsInteractive, { forward: !updatedIsInteractive });
      }
    }
  }, [config?.pen?.enabled]);

  useEffect(() => {
    if (window.electronAPI) {
      // 初期設定の取得
      window.electronAPI.getConfig().then((initialConfig) => {
        setConfig(initialConfig);
      });

      // 設定変更の同期
      const unsubscribeConfig = window.electronAPI.onConfigUpdate((newConfig) => {
        setConfig(newConfig);
      });

      const handleGestureResult = (result) => {
        if (!config) return false;
        const updatedConfig = { ...config };
        let configChanged = false;
        let gestureHandled = false;

        if (result === 'checkmark') {
          updatedConfig.pen = {
            ...config.pen,
            enabled: !config.pen.enabled
          };
          configChanged = true;
          gestureHandled = true;
        } else if (result === 'shake') {
          // 手書きの全クリア
          currentStrokeRef.current = null;
          if (window.electronAPI) {
            window.electronAPI.triggerClearDrawing(true);
          }
          gestureHandled = true;
        } else if (result === 'rightToLeft') {
          // 戻る (Undo)
          currentStrokeRef.current = null;
          if (window.electronAPI) {
            window.electronAPI.triggerUndoDrawing();
          }
          gestureHandled = true;
        } else if (result === 'leftToRight') {
          // 進む (Redo)
          currentStrokeRef.current = null;
          if (window.electronAPI) {
            window.electronAPI.triggerRedoDrawing();
          }
          gestureHandled = true;
        }

        if (configChanged) {
          setConfig(updatedConfig);
          if (window.electronAPI) {
            window.electronAPI.updateConfig(updatedConfig);
          }
        }
        return gestureHandled;
      };

      // グローバルマウスイベントの同期
      const unsubscribeMouse = window.electronAPI.onGlobalMouse((e) => {
        if (isSettingsActiveRef.current) return;

        // ジェスチャー記録中
        if (config?.gesture?.enabled) {
          if (e.type === 'down' && e.button === 3) {
            isRecordingGestureRef.current = true;
            setIsRecordingGesture(true);
            gesturePointsRef.current = [{ x: e.x, y: e.y }];
            window.electronAPI.setIgnoreMouseEvents(false, { forward: false });
            return;
          }

          if (isRecordingGestureRef.current) {
            if (e.type === 'move') {
              gesturePointsRef.current.push({ x: e.x, y: e.y });
              mousePosRef.current = { x: e.x, y: e.y };
            } else if (e.type === 'up' && e.button === 3) {
              isRecordingGestureRef.current = false;
              setIsRecordingGesture(false);

              const result = recognizeGesture(gesturePointsRef.current);
              let gestureHandled = false;
              if (result) {
                gestureHandled = handleGestureResult(result);
              }

              gesturePointsRef.current = [];
              
              if (!gestureHandled) {
                const updatedIsInteractive = config.pen?.enabled || (config.areaSpotlight?.enabled && !config.areaSpotlight?.rect) || config.zoom?.enabled;
                window.electronAPI.setIgnoreMouseEvents(!updatedIsInteractive, { forward: !updatedIsInteractive });
              }
            }
            return;
          }
        }

        if (e.type === 'move') {
          mousePosRef.current = { x: e.x, y: e.y };
          if (config?.laser?.enabled) {
            laserHistoryRef.current.push({ x: e.x, y: e.y, time: Date.now() });
          }

          // トリガーキーが押されている間の手書き描画（クリックなしでのマウス移動）
          if (isDrawingRef.current && isTriggerKeyPressedRef.current && currentStrokeRef.current) {
            const canvas = canvasRef.current;
            if (canvas) {
              const rect = canvas.getBoundingClientRect();
              const x = e.x - rect.left;
              const y = e.y - rect.top;
              
              const lastPoint = currentStrokeRef.current.points[currentStrokeRef.current.points.length - 1];
              const dist = Math.hypot(x - lastPoint.x, y - lastPoint.y);
              
              if (dist > 1.5) {
                currentStrokeRef.current.points.push({ x, y });
              }
            }
          }
        } else if (e.type === 'down') {
          if (config?.ripple?.enabled) {
            const rippleColor = e.button === 1 
              ? (config?.ripple?.leftColor || '#ef4444') 
              : (config?.ripple?.rightColor || '#3b82f6');
            
            ripplesRef.current.push({
              x: e.x,
              y: e.y,
              radius: 5,
              maxRadius: config?.ripple?.radius || 35,
              opacity: 1.0,
              color: rippleColor,
              speed: config?.ripple?.speed || 1.5,
            });
          }
        }
      });

      // グローバルキーイベントの同期 (キーキャスト & 各種制御)
      const unsubscribeKey = window.electronAPI.onGlobalKey((e) => {
        if (isSettingsActiveRef.current) return;

        const type = e.type || 'down'; // 下位互換用

        // 手書きトリガーキーの判定（手書きマーカーモードがONのときのみ有効）
        const triggerKey = config?.pen?.triggerKey;
        const isPenEnabled = config?.pen?.enabled;
        if (isPenEnabled && triggerKey && triggerKey !== 'None') {
          // 他の修飾キーが押されている場合はショートカット操作とみなし、一時的描画トリガーは無視する
          const hasOtherModifiers = 
            (triggerKey !== 'Shift' && e.shiftKey) ||
            (triggerKey !== 'Ctrl' && e.ctrlKey) ||
            (triggerKey !== 'Alt' && e.altKey) ||
            e.metaKey;

          const keycodes = TRIGGER_KEYS[triggerKey] || [];
          if (keycodes.includes(e.keycode) && !hasOtherModifiers) {
            const isDown = type === 'down';
            if (isTriggerKeyPressedRef.current !== isDown) {
              isTriggerKeyPressedRef.current = isDown;
              setIsTriggerKeyPressed(isDown);

              // 透過状態の即時更新
              const isTriggerActive = isDown && isPenEnabled;
              const isPenActive = isPenEnabled || isTriggerActive;
              const isAreaSelecting = config.areaSpotlight?.enabled && !config.areaSpotlight?.rect;
              const isZoomActive = config.zoom?.enabled;
              const updatedIsInteractive = isPenActive || isAreaSelecting || isZoomActive || isRecordingGestureRef.current;
              
              if (window.electronAPI) {
                window.electronAPI.setIgnoreMouseEvents(!updatedIsInteractive, { forward: !updatedIsInteractive });
              }

              // トリガーキー押下時：描画を開始する
              if (isDown) {
                isDrawingRef.current = true;
                const canvas = canvasRef.current;
                if (canvas) {
                  const rect = canvas.getBoundingClientRect();
                  const x = mousePosRef.current.x - rect.left;
                  const y = mousePosRef.current.y - rect.top;
                  currentStrokeRef.current = {
                    points: [{ x, y }],
                    color: config.pen.color || '#eab308',
                    width: config.pen.width || 4,
                    opacity: config.pen.opacity !== undefined ? config.pen.opacity : 0.8
                  };
                }
              } else {
                // トリガーキー解放時：描画を終了する
                if (isDrawingRef.current) {
                  isDrawingRef.current = false;
                  if (currentStrokeRef.current && currentStrokeRef.current.points.length >= 2) {
                    strokesRef.current.push(currentStrokeRef.current);
                    redoStrokesRef.current = []; // 履歴をクリア
                  }
                  currentStrokeRef.current = null;
                }
              }
            }
            return; // トリガーキー単体はキーキャストに表示しない
          }
        }

        if (type !== 'down') return; // キーキャストはkeydownのみ表示

        // Escキー (keycode 1) で通常のスポットライト・エリアスポットライト選択・ズームを解除/キャンセルする
        if (e.keycode === 1) { // Esc
          let changed = false;
          const updatedConfig = { ...config };

          if (config?.areaSpotlight?.enabled) {
            updatedConfig.areaSpotlight = {
              ...config.areaSpotlight,
              enabled: false,
              rect: null
            };
            changed = true;
          }

          if (config?.spotlight?.enabled) {
            updatedConfig.spotlight = {
              ...config.spotlight,
              enabled: false
            };
            changed = true;
          }

          if (config?.zoom?.enabled) {
            updatedConfig.zoom = {
              ...config.zoom,
              enabled: false
            };
            changed = true;
          }

          if (changed) {
            setConfig(updatedConfig);
            if (window.electronAPI) {
              window.electronAPI.updateConfig(updatedConfig);
            }
            setTempRect(null);
            selectionStartRef.current = null;
            return;
          }
        }

        if (!config?.keycast?.enabled) return;

        // 修飾キー単体は無視
        const isModifier = [29, 3613, 42, 54, 56, 3640, 3675, 3676].includes(e.keycode);
        if (isModifier) return;

        const keyName = KEY_MAP[e.keycode] || `Key-${e.keycode}`;
        const parts = [];
        if (e.ctrlKey) parts.push('Ctrl');
        if (e.shiftKey) parts.push('Shift');
        if (e.altKey) parts.push('Alt');
        if (e.metaKey) parts.push('Win');
        parts.push(keyName);

        const text = parts.join(' + ');
        setKeyCast({
          text,
          visible: true,
          timestamp: Date.now()
        });
      });

      // グローバルホイールイベントの同期
      const unsubscribeWheel = window.electronAPI.onGlobalWheel((data) => {
        if (isSettingsActiveRef.current) return;
        if (!config?.zoom?.enabled) return;

        // rotation < 0 が奥へ（ズームイン）、rotation > 0 が手前へ（ズームアウト）
        const direction = data.rotation < 0 ? 1 : -1;
        const scaleStep = 0.2;

        let newScale = zoomScaleRef.current + direction * scaleStep;
        const minScale = config.zoom.minScale || 1.0;
        const maxScale = config.zoom.maxScale || 5.0;
        newScale = Math.max(minScale, Math.min(maxScale, newScale));

        zoomScaleRef.current = newScale;
      });

      // 手書きクリアの同期 (allがtrueなら全クリア、falseなら1画消去/Undo)
      const unsubscribeClear = window.electronAPI.onClearDrawing((all) => {
        if (all) {
          strokesRef.current = [];
          redoStrokesRef.current = [];
        } else {
          if (strokesRef.current.length > 0) {
            const popped = strokesRef.current.pop();
            redoStrokesRef.current.push(popped);
          }
        }
        currentStrokeRef.current = null;
      });

      // 手書きアンドゥの同期
      const unsubscribeUndo = window.electronAPI.onUndoDrawing(() => {
        if (strokesRef.current.length > 0) {
          const popped = strokesRef.current.pop();
          redoStrokesRef.current.push(popped);
        }
      });

      // 手書きリドゥの同期
      const unsubscribeRedo = window.electronAPI.onRedoDrawing(() => {
        if (redoStrokesRef.current.length > 0) {
          const popped = redoStrokesRef.current.pop();
          strokesRef.current.push(popped);
        }
      });

      // 設定画面のアクティブ状態の同期
      const unsubscribeSettingsState = window.electronAPI.onSettingsStateChanged((active) => {
        setIsSettingsActive(active);
      });

      return () => {
        unsubscribeConfig();
        unsubscribeMouse();
        unsubscribeKey();
        unsubscribeWheel();
        unsubscribeClear();
        unsubscribeUndo();
        unsubscribeRedo();
        unsubscribeSettingsState();
      };
    }
  }, [config]);

  // ズーム（拡大鏡）有効時のスクリーンキャプチャ取得処理
  useEffect(() => {
    if (config?.zoom?.enabled) {
      // 初期倍率にリセット
      zoomScaleRef.current = config.zoom.scale || 2.0;

      window.electronAPI.captureScreen().then((dataUrl) => {
        if (dataUrl) {
          const img = new Image();
          img.src = dataUrl;
          img.onload = () => {
            captureImageRef.current = img;
            setCaptureUrl(dataUrl); // レンダラーステートを更新して再描画
          };
        }
      });
    } else {
      setCaptureUrl(null);
      captureImageRef.current = null;
    }
  }, [config?.zoom?.enabled, config?.zoom?.scale]);

  // キーキャスト表示時間制御
  useEffect(() => {
    if (!keyCast.visible) return;
    const duration = config?.keycast?.duration || 2000;
    const timeout = setTimeout(() => {
      setKeyCast(prev => {
        if (Date.now() - prev.timestamp >= duration - 100) {
          return { ...prev, visible: false };
        }
        return prev;
      });
    }, duration);

    return () => clearTimeout(timeout);
  }, [keyCast.timestamp, config?.keycast?.duration]);

  // レンダリングループ (Canvas)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let animationId;

    const draw = () => {
      if (!ctx || !config) {
        animationId = requestAnimationFrame(draw);
        return;
      }

      const isAreaSelecting = config.areaSpotlight?.enabled && !config.areaSpotlight?.rect;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 設定ウィンドウがアクティブな場合は、エフェクトを描画しない
      if (isSettingsActive) {
        animationId = requestAnimationFrame(draw);
        return;
      }

      // 0.2. ジェスチャー軌跡の描画
      if (isRecordingGesture && gesturePointsRef.current.length > 1) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.65)';
        ctx.lineWidth = 4;
        
        ctx.beginPath();
        ctx.moveTo(gesturePointsRef.current[0].x, gesturePointsRef.current[0].y);
        for (let i = 1; i < gesturePointsRef.current.length; i++) {
          ctx.lineTo(gesturePointsRef.current[i].x, gesturePointsRef.current[i].y);
        }
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(16, 185, 129, 0.8)';
        ctx.beginPath();
        ctx.arc(gesturePointsRef.current[0].x, gesturePointsRef.current[0].y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 0.5. ズーム（拡大鏡）描画
      if (config.zoom?.enabled && captureImageRef.current) {
        const mx = mousePosRef.current.x;
        const my = mousePosRef.current.y;
        const r = config.zoom.radius || 150;
        const scale = zoomScaleRef.current;

        ctx.save();
        // 拡大鏡の外側の影
        ctx.beginPath();
        ctx.arc(mx, my, r, 0, Math.PI * 2);
        ctx.shadowBlur = 25;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.fillStyle = 'rgba(15, 23, 42, 0.05)';
        ctx.fill();
        ctx.restore();

        // 拡大領域のクリップ
        ctx.save();
        ctx.beginPath();
        ctx.arc(mx, my, r, 0, Math.PI * 2);
        ctx.clip();

        // キャプチャした画像を拡大して描画
        const img = captureImageRef.current;
        const rx = img.width / canvas.width;
        const ry = img.height / canvas.height;

        const sw = (r * 2 * rx) / scale;
        const sh = (r * 2 * ry) / scale;
        const sx = (mx * rx) - (sw / 2);
        const sy = (my * ry) - (sh / 2);

        const dx = mx - r;
        const dy = my - r;
        const dw = r * 2;
        const dh = r * 2;

        ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
        ctx.restore();

        // 拡大鏡のボーダー
        ctx.save();
        ctx.beginPath();
        ctx.arc(mx, my, r, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        // 拡大率のテキストバッジ
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        const badgeW = 54;
        const badgeH = 20;
        const badgeX = mx - badgeW / 2;
        const badgeY = my + r - 32;
        
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${scale.toFixed(1)}x`, mx, badgeY + badgeH / 2);
        ctx.restore();
      }

      // 1. スポットライト
      if (config.spotlight?.enabled) {
        ctx.save();
        ctx.fillStyle = `rgba(15, 23, 42, ${config.spotlight.opacity || 0.6})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.globalCompositeOperation = 'destination-out';
        
        const radius = config.spotlight.radius || 120;
        const grad = ctx.createRadialGradient(
          mousePosRef.current.x, mousePosRef.current.y, radius * 0.7,
          mousePosRef.current.x, mousePosRef.current.y, radius
        );
        grad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(mousePosRef.current.x, mousePosRef.current.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 1.5. エリアスポットライト（矩形・ドラッグ選択）
      if (config.areaSpotlight?.enabled) {
        const activeRect = config.areaSpotlight.rect || tempRect;
        const isSelecting = config.areaSpotlight.enabled && !config.areaSpotlight.rect;

        if (activeRect) {
          ctx.save();
          // 暗い背景を描く
          ctx.fillStyle = `rgba(15, 23, 42, ${config.areaSpotlight.opacity || 0.6})`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // 矩形部分をくり抜く
          ctx.globalCompositeOperation = 'destination-out';
          ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
          ctx.fillRect(activeRect.x, activeRect.y, activeRect.width, activeRect.height);

          // 枠線を描画する
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = config.areaSpotlight.borderColor || '#3b82f6';
          ctx.lineWidth = config.areaSpotlight.borderWidth || 2;
          ctx.strokeRect(activeRect.x, activeRect.y, activeRect.width, activeRect.height);
          ctx.restore();
        } else if (isSelecting) {
          // まだドラッグが始まっていない選択中のとき（画面全体を軽く暗くして、ドラッグできることを示す）
          ctx.save();
          ctx.fillStyle = `rgba(15, 23, 42, ${(config.areaSpotlight.opacity || 0.6) * 0.5})`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.restore();
        }
      }

      // 2. 手書きペン
      if (strokesRef.current.length > 0 || currentStrokeRef.current) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // 過去の線
        strokesRef.current.forEach(stroke => {
          if (stroke.points.length < 2) return;
          ctx.save();
          ctx.strokeStyle = stroke.color;
          ctx.lineWidth = stroke.width;
          ctx.globalAlpha = stroke.opacity !== undefined ? stroke.opacity : 0.8;
          ctx.beginPath();
          ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
          for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
          }
          ctx.stroke();
          ctx.restore();
        });

        // 現在描いている線
        if (currentStrokeRef.current && currentStrokeRef.current.points.length >= 2) {
          ctx.save();
          ctx.strokeStyle = currentStrokeRef.current.color;
          ctx.lineWidth = currentStrokeRef.current.width;
          ctx.globalAlpha = currentStrokeRef.current.opacity !== undefined ? currentStrokeRef.current.opacity : 0.8;
          ctx.beginPath();
          ctx.moveTo(currentStrokeRef.current.points[0].x, currentStrokeRef.current.points[0].y);
          for (let i = 1; i < currentStrokeRef.current.points.length; i++) {
            ctx.lineTo(currentStrokeRef.current.points[i].x, currentStrokeRef.current.points[i].y);
          }
          ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
      }

      // 3. レーザーポインター
      if (config.laser?.enabled) {
        const now = Date.now();
        const trailLength = (config.laser.trailLength || 8) * 40; // ミリ秒
        
        laserHistoryRef.current = laserHistoryRef.current.filter(p => now - p.time < trailLength);

        if (laserHistoryRef.current.length > 1) {
          ctx.save();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          for (let i = 1; i < laserHistoryRef.current.length; i++) {
            const p1 = laserHistoryRef.current[i - 1];
            const p2 = laserHistoryRef.current[i];
            const age = now - p2.time;
            const ratio = 1 - age / trailLength;
            
            ctx.strokeStyle = config.laser.color || '#ef4444';
            ctx.globalAlpha = ratio * 0.6;
            ctx.lineWidth = (config.laser.radius || 6) * ratio * 1.5;
            
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
          ctx.restore();
        }

        // ポインタ本体
        ctx.save();
        ctx.shadowBlur = 12;
        ctx.shadowColor = config.laser.color || '#ef4444';
        ctx.fillStyle = config.laser.color || '#ef4444';
        ctx.beginPath();
        ctx.arc(mousePosRef.current.x, mousePosRef.current.y, config.laser.radius || 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 4. クリック波紋
      if (config.ripple?.enabled && ripplesRef.current.length > 0) {
        ctx.save();
        ripplesRef.current.forEach((ripple, index) => {
          ripple.radius += ripple.speed;
          ripple.opacity = 1.0 - (ripple.radius / ripple.maxRadius);

          if (ripple.opacity <= 0) {
            ripplesRef.current[index] = null;
            return;
          }

          ctx.beginPath();
          ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
          ctx.strokeStyle = ripple.color;
          ctx.globalAlpha = ripple.opacity;
          ctx.lineWidth = 3;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(ripple.x, ripple.y, ripple.radius * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = ripple.color;
          ctx.globalAlpha = ripple.opacity * 0.15;
          ctx.fill();
        });
        ripplesRef.current = ripplesRef.current.filter(r => r !== null);
        ctx.restore();
      }

      // 5. マウス追従インジケータ (ペンモード / エリアスポットライト選択中)
      if (!isSettingsActive) {
        if (config.pen?.enabled) {
          ctx.save();
          const mx = mousePosRef.current.x;
          const my = mousePosRef.current.y;
          
          // ペン色を取得（デフォルトは黄色）
          const penColor = config.pen.color || '#eab308';
          
          // ガラス風の小さなサークル
          ctx.beginPath();
          ctx.arc(mx + 16, my + 16, 12, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.75)'; // ダークなガラス背景
          ctx.strokeStyle = penColor;
          ctx.lineWidth = 1.5;
          ctx.shadowBlur = 6;
          ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
          ctx.fill();
          ctx.stroke();
          
          // ペン絵文字
          ctx.fillStyle = '#ffffff';
          ctx.font = '11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('✏️', mx + 16, my + 16);
          ctx.restore();
        } else if (isAreaSelecting) {
          ctx.save();
          const mx = mousePosRef.current.x;
          const my = mousePosRef.current.y;
          const borderColor = config.areaSpotlight?.borderColor || '#3b82f6';
          
          // エリア選択用のガラス風サークル
          ctx.beginPath();
          ctx.arc(mx + 16, my + 16, 12, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
          ctx.strokeStyle = borderColor;
          ctx.lineWidth = 1.5;
          ctx.shadowBlur = 6;
          ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
          ctx.fill();
          ctx.stroke();
          
          // クロスヘア絵文字
          ctx.fillStyle = '#ffffff';
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⛶', mx + 16, my + 16);
          ctx.restore();
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    animationId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [config, isSettingsActive]);

  const isAreaSelecting = config?.areaSpotlight?.enabled && !config?.areaSpotlight?.rect;

  // 手書き & エリア選択入力ハンドラー
  const handlePointerDown = (e) => {
    if (isAreaSelecting) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      selectionStartRef.current = { x, y };
      setTempRect({ x, y, width: 0, height: 0 });
      return;
    }

    // ジェスチャー記録中、または左クリック以外の場合は描画しない
    if (!config?.pen?.enabled || isRecordingGestureRef.current || e.button !== 0) return;
    
    isDrawingRef.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    currentStrokeRef.current = {
      points: [{ x, y }],
      color: config.pen.color || '#eab308',
      width: config.pen.width || 4,
      opacity: config.pen.opacity !== undefined ? config.pen.opacity : 0.8
    };
  };

  const handlePointerMove = (e) => {
    if (isAreaSelecting && selectionStartRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const startX = selectionStartRef.current.x;
      const startY = selectionStartRef.current.y;
      
      setTempRect({
        x: Math.min(startX, x),
        y: Math.min(startY, y),
        width: Math.abs(x - startX),
        height: Math.abs(y - startY)
      });
      return;
    }

    if (isRecordingGestureRef.current || !isDrawingRef.current || !currentStrokeRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const lastPoint = currentStrokeRef.current.points[currentStrokeRef.current.points.length - 1];
    const dist = Math.hypot(x - lastPoint.x, y - lastPoint.y);
    
    if (dist > 1.5) {
      currentStrokeRef.current.points.push({ x, y });
    }
  };

  const handlePointerUp = () => {
    if (isAreaSelecting && selectionStartRef.current) {
      if (tempRect && tempRect.width > 10 && tempRect.height > 10) {
        const updatedConfig = {
          ...config,
          areaSpotlight: {
            ...config.areaSpotlight,
            rect: tempRect,
            enabled: true
          }
        };
        setConfig(updatedConfig);
        if (window.electronAPI) {
          window.electronAPI.updateConfig(updatedConfig);
        }
      } else {
        setTempRect(null);
      }
      selectionStartRef.current = null;
      return;
    }

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    
    if (currentStrokeRef.current && currentStrokeRef.current.points.length >= 2) {
      strokesRef.current.push(currentStrokeRef.current);
      redoStrokesRef.current = []; // 新しく描画されたのでやり直し履歴をクリア
    }
    currentStrokeRef.current = null;
  };

  const isTriggerActive = config?.pen?.enabled && config.pen.triggerKey && config.pen.triggerKey !== 'None' && isTriggerKeyPressed;
  const isPenActive = config?.pen?.enabled || isTriggerActive;
  const isZoomActive = config?.zoom?.enabled;
  const isInteractive = !isSettingsActive && (isPenActive || isAreaSelecting || isZoomActive || isRecordingGesture);

  let cursorStyle = 'default';
  if (isPenActive) {
    cursorStyle = 'crosshair';
  } else if (isAreaSelecting) {
    cursorStyle = 'crosshair';
  }

  return (
    <div 
      className="relative w-full h-full select-none"
      style={{ pointerEvents: isInteractive ? 'auto' : 'none', cursor: cursorStyle }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 block bg-transparent"
        style={{ pointerEvents: isInteractive ? 'auto' : 'none', cursor: cursorStyle }}
      />

      {/* キーキャストバッジ */}
      {config?.keycast?.enabled && keyCast.visible && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex items-center justify-center pointer-events-none transition-all duration-300 ease-out opacity-100 scale-100">
          <div className="px-6 py-3 bg-slate-900/90 text-white font-semibold rounded-2xl border border-slate-700/80 shadow-2xl flex items-center gap-3 backdrop-blur-md">
            <span className="text-sm text-indigo-400 tracking-wider font-bold">KEY</span>
            <span className="text-xl font-mono">{keyCast.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
