import React from 'react';
import { Check, Edit3, Info, Keyboard, Redo, Sparkles, Trash2, Undo, ZoomIn } from 'lucide-react';
import { PRESET_COLORS, Switch } from './SettingsControls';

export function DrawingSettings({ config, updateConfig, onUndo, onRedo, onClear }) {
  const handleUndoDrawing = onUndo;
  const handleRedoDrawing = onRedo;
  const handleClearAllDrawing = onClear;
  return (
<div className="space-y-6 max-w-2xl mx-auto">

            {/* ジェスチャー操作設定 */}
            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">マウスジェスチャー機能</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">マウスの中ボタン（ホイールクリック）を押しながら動かすことで、ジェスチャーで機能をON/OFFします</p>
                  </div>
                </div>
                <Switch
                  checked={config.gesture?.enabled ?? true}
                  onChange={(val) => updateConfig('gesture', { enabled: val })}
                />
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">ジェスチャー一覧（マウス中ボタンを押しながらドラッグ）</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/35 dark:border-slate-700/35">
                    <span className="text-lg">V</span>
                    <div>
                      <p className="font-bold">Vを描く</p>
                      <p className="text-slate-500 dark:text-slate-400">手書きペン ON/OFF</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/35 dark:border-slate-700/35">
                    <span className="text-lg">↔</span>
                    <div>
                      <p className="font-bold">左右に振る</p>
                      <p className="text-slate-500 dark:text-slate-400">手書きの全クリア</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/35 dark:border-slate-700/35">
                    <span className="text-lg">←</span>
                    <div>
                      <p className="font-bold">右から左に引く</p>
                      <p className="text-slate-500 dark:text-slate-400">戻る (Undo)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/35 dark:border-slate-700/35">
                    <span className="text-lg">→</span>
                    <div>
                      <p className="font-bold">左から右に引く</p>
                      <p className="text-slate-500 dark:text-slate-400">進む (Redo)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 手書きペン設定 */}
            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
                    <Edit3 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">画面手書きマーカー (ペン)</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">画面上のあらゆる場所にフリーハンドでメモを描画します</p>
                  </div>
                </div>
                <Switch
                  checked={config.pen.enabled}
                  onChange={(val) => updateConfig('pen', { enabled: val })}
                />
              </div>

              {config.pen.enabled && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200 rounded-xl text-xs flex gap-2 items-start mb-4">
                  <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div>
                    ペンモードが有効な間は、マウスクリックが画面透過されず、画面上への「描画」に割り当てられます。
                    クリック操作を行いたいときは、ペンモードをオフにしてください。
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300 block mb-2">ペンの色</span>
                  <div className="flex flex-wrap gap-2 items-center">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => updateConfig('pen', { color })}
                        style={{ backgroundColor: color }}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${config.pen.color === color ? 'ring-2 ring-indigo-500 dark:ring-indigo-400 scale-110 shadow-sm' : 'hover:scale-105'
                          }`}
                      >
                        {config.pen.color === color && <Check className="h-4 w-4 text-white drop-shadow-sm" />}
                      </button>
                    ))}
                    <input
                      type="color"
                      value={config.pen.color}
                      onChange={(e) => updateConfig('pen', { color: e.target.value })}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium text-slate-600 dark:text-slate-300">
                    <span>ペンの太さ</span>
                    <span>{config.pen.width} px</span>
                  </div>
                  <input
                    type="range" min="1" max="15" step="1"
                    value={config.pen.width}
                    onChange={(e) => updateConfig('pen', { width: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium text-slate-600 dark:text-slate-300">
                    <span>ペンの不透明度</span>
                    <span>{Math.round((config.pen.opacity ?? 0.8) * 100)} %</span>
                  </div>
                  <input
                    type="range" min="0.1" max="1.0" step="0.05"
                    value={config.pen.opacity ?? 0.8}
                    onChange={(e) => updateConfig('pen', { opacity: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>

                <div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300 block mb-2">手書きトリガーキー</span>
                  <select
                    value={config.pen.triggerKey || 'None'}
                    onChange={(e) => updateConfig('pen', { triggerKey: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="None">左クリックのみ</option>
                    <option value="Shift">Shift or 左クリック</option>
                    <option value="Alt">Alt or 左クリック</option>
                    <option value="Ctrl">Ctrl or 左クリック</option>
                    <option value="Space">Space or 左クリック</option>
                  </select>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    指定したキーを押している間、マウスを動かすだけで、クリックせずに線を描けます（※マーカーがONのときのみ有効）。
                  </p>
                </div>

                <div className="pt-2 flex justify-end gap-2 flex-wrap">
                  <button
                    onClick={handleUndoDrawing}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-semibold transition-all shadow-sm border border-slate-200 dark:border-slate-700"
                  >
                    <Undo className="h-4 w-4" />
                    戻る (Undo)
                  </button>
                  <button
                    onClick={handleRedoDrawing}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-semibold transition-all shadow-sm border border-slate-200 dark:border-slate-700"
                  >
                    <Redo className="h-4 w-4" />
                    やり直し (Redo)
                  </button>
                  <button
                    onClick={handleClearAllDrawing}
                    className="flex items-center gap-2 px-3 py-2 bg-rose-600 hover:bg-rose-700 dark:bg-rose-900/60 dark:hover:bg-rose-900/80 text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
                  >
                    <Trash2 className="h-4 w-4" />
                    すべてクリア
                  </button>
                </div>
              </div>
            </div>

            {/* 全画面ズーム設定 */}
            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <ZoomIn className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">全画面ズーム機能</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">画面全体を拡大し、左ドラッグで表示位置を移動できます。ONの時にホイール回転で倍率を変更できます</p>
                  </div>
                </div>
                <Switch
                  checked={config.zoom?.enabled || false}
                  onChange={(val) => updateConfig('zoom', { enabled: val })}
                />
              </div>

              {config.zoom?.enabled && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-800 dark:text-indigo-200 rounded-xl text-xs flex gap-2 items-start mb-4">
                  <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div>
                    ズームモードがONの時、左ドラッグで表示位置を移動できます。マウスホイールを回すとズームイン（奥へスクロール）およびズームアウト（手前へスクロール）が行えます。
                    （Escキーでズームを解除できます）
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium text-slate-600 dark:text-slate-300">
                    <span>初期の拡大倍率</span>
                    <span>{(config.zoom?.scale || 2.0).toFixed(1)} x</span>
                  </div>
                  <input
                    type="range" min="1.0" max="5.0" step="0.2"
                    value={config.zoom?.scale || 2.0}
                    onChange={(e) => updateConfig('zoom', { scale: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              </div>
            </div>

            {/* キーキャスト設定 */}
            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl">
                    <Keyboard className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">キーキャスト (打鍵の表示)</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">ショートカットなどの入力キーを画面上に表示します</p>
                  </div>
                </div>
                <Switch
                  checked={config.keycast.enabled}
                  onChange={(val) => updateConfig('keycast', { enabled: val })}
                />
              </div>

              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium text-slate-600 dark:text-slate-300">
                    <span>表示し続ける時間</span>
                    <span>{config.keycast.duration / 1000} 秒</span>
                  </div>
                  <input
                    type="range" min="1000" max="5000" step="500"
                    value={config.keycast.duration}
                    onChange={(e) => updateConfig('keycast', { duration: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              </div>
            </div>

          </div>
  );
}
