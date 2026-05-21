import React, { useEffect, useRef, useState } from 'react';

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

export default function App() {
  const canvasRef = useRef(null);
  const [config, setConfig] = useState(null);
  const [keyCast, setKeyCast] = useState({ text: '', visible: false, timestamp: 0 });
  const [isSettingsActive, setIsSettingsActive] = useState(false);
  const isSettingsActiveRef = useRef(false);
  
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

  useEffect(() => {
    isSettingsActiveRef.current = isSettingsActive;
    if (isSettingsActive) {
      laserHistoryRef.current = [];
      ripplesRef.current = [];
    }
  }, [isSettingsActive]);

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

      // グローバルマウスイベントの同期
      const unsubscribeMouse = window.electronAPI.onGlobalMouse((e) => {
        if (isSettingsActiveRef.current) return;
        if (e.type === 'move') {
          mousePosRef.current = { x: e.x, y: e.y };
          if (config?.laser?.enabled) {
            laserHistoryRef.current.push({ x: e.x, y: e.y, time: Date.now() });
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
        // Escキー (keycode 1) で通常のスポットライト・エリアスポットライト選択を解除/キャンセルする
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
        unsubscribeClear();
        unsubscribeUndo();
        unsubscribeRedo();
        unsubscribeSettingsState();
      };
    }
  }, [config]);

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

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 設定ウィンドウがアクティブな場合は、エフェクトを描画しない
      if (isSettingsActive) {
        animationId = requestAnimationFrame(draw);
        return;
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
          ctx.strokeStyle = stroke.color;
          ctx.lineWidth = stroke.width;
          ctx.beginPath();
          ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
          for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
          }
          ctx.stroke();
        });

        // 現在描いている線
        if (currentStrokeRef.current && currentStrokeRef.current.points.length >= 2) {
          ctx.strokeStyle = currentStrokeRef.current.color;
          ctx.lineWidth = currentStrokeRef.current.width;
          ctx.beginPath();
          ctx.moveTo(currentStrokeRef.current.points[0].x, currentStrokeRef.current.points[0].y);
          for (let i = 1; i < currentStrokeRef.current.points.length; i++) {
            ctx.lineTo(currentStrokeRef.current.points[i].x, currentStrokeRef.current.points[i].y);
          }
          ctx.stroke();
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

    if (!config?.pen?.enabled) return;
    
    isDrawingRef.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    currentStrokeRef.current = {
      points: [{ x, y }],
      color: config.pen.color || '#eab308',
      width: config.pen.width || 4
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

    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    
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

  const isPenActive = config?.pen?.enabled;
  const isInteractive = !isSettingsActive && (isPenActive || isAreaSelecting);

  return (
    <div 
      className="relative w-full h-full select-none"
      style={{ pointerEvents: isInteractive ? 'auto' : 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 block bg-transparent"
        style={{ pointerEvents: isInteractive ? 'auto' : 'none' }}
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
