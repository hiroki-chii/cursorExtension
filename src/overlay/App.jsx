import React, { useEffect, useRef, useState } from 'react';
import { recognizeGesture } from './gestureRecognizer';
import { createDrawingHistory } from './drawingHistory';
import { isOverlayInteractive } from './interactionPolicy';
import { subscribeOverlayEvents } from './electronSubscriptions';
import {
  drawAreaSpotlight,
  drawGesture,
  drawInteractionIndicator,
  drawLaser,
  drawRipples,
  drawSpotlight,
  drawStrokes,
  drawZoom,
} from './canvasRenderer';

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
  const configRef = useRef(null);
  const updateConfigState = (nextConfig) => {
    configRef.current = nextConfig;
    setConfig(nextConfig);
  };
  const [keyCast, setKeyCast] = useState({ text: '', visible: false, timestamp: 0 });
  const [isSettingsActive, setIsSettingsActive] = useState(false);
  const isSettingsActiveRef = useRef(false);
  const [isRecordingGesture, setIsRecordingGesture] = useState(false);
  const isRecordingGestureRef = useRef(false);
  const gesturePointsRef = useRef([]);

  // コンテキストメニュー用ステートとRef
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });
  const contextMenuRef = useRef({ visible: false, x: 0, y: 0 });

  const updateContextMenu = (val) => {
    contextMenuRef.current = val;
    setContextMenu(val);
  };
  
  // 描画ループで確実に最新値を取得するため、refを使用
  const mousePosRef = useRef({ x: 0, y: 0 });
  const laserHistoryRef = useRef([]); // レーザーの軌跡保存
  const ripplesRef = useRef([]); // クリック波紋保存
  
  // 手書きペンデータ
  const drawingHistoryRef = useRef(null);
  if (!drawingHistoryRef.current) {
    drawingHistoryRef.current = createDrawingHistory();
  }
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
      const updatedIsInteractive = isOverlayInteractive({
        settingsActive: isSettingsActiveRef.current,
        penEnabled: config.pen?.enabled,
        areaSelecting: isAreaSelecting,
        recordingGesture: isRecordingGestureRef.current,
      });
      if (window.electronAPI) {
        window.electronAPI.setIgnoreMouseEvents(!updatedIsInteractive, { forward: !updatedIsInteractive });
      }
    }
  }, [config?.pen?.enabled]);

  useEffect(() => {
    if (window.electronAPI) {
      // 初期設定の取得
      window.electronAPI.getConfig().then((initialConfig) => {
        updateConfigState(initialConfig);
      });

      // 設定変更の同期
      const handleConfigUpdate = (newConfig) => {
        updateConfigState(newConfig);
      };

      const handleGestureResult = (result) => {
        const config = configRef.current;
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
        } else if (result === 'clearDrawing') {
          // 描画だけを消去し、ペンモードの有効状態は維持する
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
          updateConfigState(updatedConfig);
          if (window.electronAPI) {
            window.electronAPI.updateConfig(updatedConfig);
          }
        }
        return gestureHandled;
      };

      // グローバルマウスイベントの同期
      const handleGlobalMouse = (e) => {
        const config = configRef.current;
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
                const updatedIsInteractive = isOverlayInteractive({
                  settingsActive: isSettingsActiveRef.current,
                  penEnabled: config.pen?.enabled,
                  areaSelecting: config.areaSpotlight?.enabled && !config.areaSpotlight?.rect,
                  recordingGesture: false,
                });
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
      };

      // グローバルキーイベントの同期 (キーキャスト & 各種制御)
      const handleGlobalKey = (e) => {
        const config = configRef.current;
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
              const updatedIsInteractive = isOverlayInteractive({
                settingsActive: isSettingsActiveRef.current,
                penEnabled: isPenActive,
                areaSelecting: isAreaSelecting,
                recordingGesture: isRecordingGestureRef.current,
              });
              
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
                    drawingHistoryRef.current.commit(currentStrokeRef.current);
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
          if (contextMenuRef.current.visible) {
            updateContextMenu({ visible: false, x: 0, y: 0 });
            return;
          }

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
            updateConfigState(updatedConfig);
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
      };

      // グローバルホイールイベントの同期
      const handleGlobalWheel = (data) => {
        const config = configRef.current;
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
      };

      // 手書きクリアの同期 (allがtrueなら全クリア、falseなら1画消去/Undo)
      const handleClearDrawing = (all) => {
        if (all) {
          drawingHistoryRef.current.clear();
        } else {
          drawingHistoryRef.current.undo();
        }
        currentStrokeRef.current = null;
      };

      // 手書きアンドゥの同期
      const handleUndoDrawing = () => {
        drawingHistoryRef.current.undo();
      };

      // 手書きリドゥの同期
      const handleRedoDrawing = () => {
        drawingHistoryRef.current.redo();
      };

      // 設定画面のアクティブ状態の同期
      const handleSettingsStateChanged = (active) => {
        setIsSettingsActive(active);
      };

      return subscribeOverlayEvents(window.electronAPI, {
        configUpdated: handleConfigUpdate,
        globalMouse: handleGlobalMouse,
        globalKey: handleGlobalKey,
        globalWheel: handleGlobalWheel,
        clearDrawing: handleClearDrawing,
        undoDrawing: handleUndoDrawing,
        redoDrawing: handleRedoDrawing,
        settingsStateChanged: handleSettingsStateChanged,
      });
    }
  }, []);

  // 全画面ズーム有効時のスクリーンキャプチャ取得処理
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
      if (isRecordingGestureRef.current && gesturePointsRef.current.length > 1) {
        drawGesture(ctx, gesturePointsRef.current);
      }

      // 0.5. カーソル位置を基準とした全画面ズーム描画
      if (config.zoom?.enabled && captureImageRef.current) {
        drawZoom(ctx, canvas, captureImageRef.current, mousePosRef.current, zoomScaleRef.current);
      }

      // 1. スポットライト
      drawSpotlight(ctx, canvas, config.spotlight, mousePosRef.current);

      // 1.5. エリアスポットライト（矩形・ドラッグ選択）
      drawAreaSpotlight(ctx, canvas, config.areaSpotlight, tempRect);

      // 2. 手書きペン
      const committedStrokes = drawingHistoryRef.current.getStrokes();
      drawStrokes(ctx, committedStrokes, currentStrokeRef.current);

      // 3. レーザーポインター
      laserHistoryRef.current = drawLaser(
        ctx, config.laser, mousePosRef.current, laserHistoryRef.current,
      );

      // 4. クリック波紋
      ripplesRef.current = drawRipples(ctx, config.ripple, ripplesRef.current);

      // 5. マウス追従インジケータ (ペンモード / エリアスポットライト選択中)
      drawInteractionIndicator(ctx, config, mousePosRef.current, isAreaSelecting);

      animationId = requestAnimationFrame(draw);
    };

    animationId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [config, isSettingsActive]);

  const isAreaSelecting = config?.areaSpotlight?.enabled && !config?.areaSpotlight?.rect;

  // 手書きペンの設定変更ハンドラー
  const handlePenConfigChange = (key, value) => {
    if (!config) return;
    const updatedConfig = {
      ...config,
      pen: {
        ...config.pen,
        [key]: value
      }
    };
    updateConfigState(updatedConfig);
    if (window.electronAPI) {
      window.electronAPI.updateConfig(updatedConfig);
    }
  };

  // 右クリックコンテキストメニュー表示ハンドラー
  const handleContextMenu = (e) => {
    if (!config?.pen?.enabled) return;
    e.preventDefault();

    const menuWidth = 240;
    const menuHeight = 280;
    let x = e.clientX;
    let y = e.clientY;

    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }

    updateContextMenu({
      visible: true,
      x,
      y
    });
  };

  // 手書き & エリア選択入力ハンドラー
  const handlePointerDown = (e) => {
    if (contextMenuRef.current.visible) {
      updateContextMenu({ visible: false, x: 0, y: 0 });
      return;
    }

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
        updateConfigState(updatedConfig);
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
      drawingHistoryRef.current.commit(currentStrokeRef.current);
    }
    currentStrokeRef.current = null;
  };

  const isTriggerActive = config?.pen?.enabled && config.pen.triggerKey && config.pen.triggerKey !== 'None' && isTriggerKeyPressed;
  const isPenActive = config?.pen?.enabled || isTriggerActive;
  const isInteractive = isOverlayInteractive({
    settingsActive: isSettingsActive,
    penEnabled: isPenActive,
    areaSelecting: isAreaSelecting,
    recordingGesture: isRecordingGesture,
  });

  let cursorStyle = 'default';
  if (isPenActive) {
    cursorStyle = 'crosshair';
  } else if (isAreaSelecting) {
    cursorStyle = 'crosshair';
  }

  return (
    <div 
      className="relative w-full h-full select-none"
      style={{ 
        pointerEvents: isInteractive ? 'auto' : 'none', 
        cursor: cursorStyle,
        backgroundColor: isInteractive ? 'rgba(0, 0, 0, 0.005)' : 'transparent' // アルファ値が 1/255 以上（0.004以上）でないとOSで完全透明とみなされクリックが突き抜けるため 0.005 を設定
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onContextMenu={handleContextMenu}
    >
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 block bg-transparent pointer-events-none"
        style={{ pointerEvents: 'none', cursor: cursorStyle }}
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

      {/* 右クリックコンテキストメニュー */}
      {contextMenu.visible && (
        <>
          {/* バックドロップ */}
          <div 
            className="fixed inset-0 z-40 bg-transparent"
            onClick={() => updateContextMenu({ visible: false, x: 0, y: 0 })}
            onContextMenu={(e) => {
              e.preventDefault();
              updateContextMenu({ visible: false, x: 0, y: 0 });
            }}
          />
          {/* メニュー本体 */}
          <div 
            className="absolute z-50 w-60 p-4 rounded-2xl bg-slate-900/95 text-slate-100 border border-slate-800/80 shadow-2xl backdrop-blur-md flex flex-col gap-4 select-none animate-fade-in"
            style={{ 
              left: `${contextMenu.x}px`, 
              top: `${contextMenu.y}px` 
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-850 pb-2">
              <span className="text-xs font-bold text-slate-400 tracking-wider">ペン設定</span>
              <button 
                onClick={() => updateContextMenu({ visible: false, x: 0, y: 0 })}
                className="text-slate-400 hover:text-slate-200 transition-colors text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* 色選択 */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">カラー</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { name: 'yellow', value: '#eab308' },
                  { name: 'red', value: '#ef4444' },
                  { name: 'blue', value: '#3b82f6' },
                  { name: 'green', value: '#10b981' },
                  { name: 'orange', value: '#f97316' },
                  { name: 'purple', value: '#a855f7' },
                  { name: 'slate', value: '#0f172a' },
                  { name: 'white', value: '#ffffff' },
                ].map((color) => (
                  <button
                    key={color.value}
                    onClick={() => handlePenConfigChange('color', color.value)}
                    className="relative w-8 h-8 rounded-full border border-slate-700/50 flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-sm"
                    style={{ backgroundColor: color.value }}
                  >
                    {config?.pen?.color === color.value && (
                      <span className={`w-2 h-2 rounded-full ${color.value === '#ffffff' ? 'bg-slate-900' : 'bg-white'} shadow-md`} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 太さ選択 */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">太さ</label>
                <span className="text-xs font-mono font-bold text-emerald-400">{config?.pen?.width || 4}px</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={config?.pen?.width || 4}
                onChange={(e) => handlePenConfigChange('width', parseInt(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* 不透明度選択 */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">不透明度</label>
                <span className="text-xs font-mono font-bold text-emerald-400">{Math.round((config?.pen?.opacity !== undefined ? config?.pen?.opacity : 0.8) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={config?.pen?.opacity !== undefined ? config?.pen?.opacity : 0.8}
                onChange={(e) => handlePenConfigChange('opacity', parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
