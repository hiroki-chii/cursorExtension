import React from 'react';
import { BoxSelect, Check, Info, MousePointer, Sun, Zap } from 'lucide-react';
import { PRESET_COLORS, Switch } from './SettingsControls';

export function EffectsSettings({ config, updateConfig }) {
  return (
<div className="space-y-6 max-w-2xl mx-auto">
            {/* レーザーポインター設定 */}
            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">レーザーポインター</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">マウスポインターに赤いドットと軌跡を付けます</p>
                  </div>
                </div>
                <Switch
                  checked={config.laser.enabled}
                  onChange={(val) => updateConfig('laser', { enabled: val })}
                />
              </div>

              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                {/* カラー選択 */}
                <div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300 block mb-2">カラー</span>
                  <div className="flex flex-wrap gap-2 items-center">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => updateConfig('laser', { color })}
                        style={{ backgroundColor: color }}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${config.laser.color === color ? 'ring-2 ring-indigo-500 dark:ring-indigo-400 scale-110 shadow-sm' : 'hover:scale-105'
                          }`}
                      >
                        {config.laser.color === color && <Check className="h-4 w-4 text-white drop-shadow-sm" />}
                      </button>
                    ))}
                    <input
                      type="color"
                      value={config.laser.color}
                      onChange={(e) => updateConfig('laser', { color: e.target.value })}
                      className="w-8 h-8 rounded-lg border-0 p-0 cursor-pointer overflow-hidden bg-transparent"
                    />
                  </div>
                </div>

                {/* サイズスライダー */}
                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium text-slate-600 dark:text-slate-300">
                    <span>ポインターのサイズ</span>
                    <span>{config.laser.radius * 2} px</span>
                  </div>
                  <input
                    type="range" min="3" max="20" step="1"
                    value={config.laser.radius}
                    onChange={(e) => updateConfig('laser', { radius: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>

                {/* 軌跡の長さスライダー */}
                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium text-slate-600 dark:text-slate-300">
                    <span>軌跡の長さ</span>
                    <span>{config.laser.trailLength}</span>
                  </div>
                  <input
                    type="range" min="2" max="25" step="1"
                    value={config.laser.trailLength}
                    onChange={(e) => updateConfig('laser', { trailLength: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              </div>
            </div>

            {/* クリックインジケーター設定 */}
            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
                    <MousePointer className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">クリックインジケーター</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">クリックした位置に波紋エフェクトを表示します</p>
                  </div>
                </div>
                <Switch
                  checked={config.ripple.enabled}
                  onChange={(val) => updateConfig('ripple', { enabled: val })}
                />
              </div>

              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300 block mb-1">左クリック色</span>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={config.ripple.leftColor}
                        onChange={(e) => updateConfig('ripple', { leftColor: e.target.value })}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                      <span className="text-xs font-mono text-slate-500">{config.ripple.leftColor}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300 block mb-1">右クリック色</span>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={config.ripple.rightColor}
                        onChange={(e) => updateConfig('ripple', { rightColor: e.target.value })}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                      <span className="text-xs font-mono text-slate-500">{config.ripple.rightColor}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium text-slate-600 dark:text-slate-300">
                    <span>波紋の最大半径</span>
                    <span>{config.ripple.radius} px</span>
                  </div>
                  <input
                    type="range" min="15" max="80" step="5"
                    value={config.ripple.radius}
                    onChange={(e) => updateConfig('ripple', { radius: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium text-slate-600 dark:text-slate-300">
                    <span>波紋の広がる速度</span>
                    <span>{config.ripple.speed}</span>
                  </div>
                  <input
                    type="range" min="0.5" max="4.0" step="0.5"
                    value={config.ripple.speed}
                    onChange={(e) => updateConfig('ripple', { speed: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              </div>
            </div>

            {/* スポットライト設定 */}
            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-yellow-100 dark:bg-yellow-950/40 text-yellow-600 dark:text-yellow-400 rounded-xl">
                    <Sun className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">スポットライト効果</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">マウスポインターの周囲以外を暗くします</p>
                  </div>
                </div>
                <Switch
                  checked={config.spotlight.enabled}
                  onChange={(val) => updateConfig('spotlight', { enabled: val })}
                />
              </div>

              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800 animate-fadeIn">
                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium text-slate-600 dark:text-slate-300">
                    <span>スポットライトの半径</span>
                    <span>{config.spotlight.radius} px</span>
                  </div>
                  <input
                    type="range" min="50" max="300" step="5"
                    value={config.spotlight.radius}
                    onChange={(e) => updateConfig('spotlight', { radius: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium text-slate-600 dark:text-slate-300">
                    <span>背景の不透明度（暗さ）</span>
                    <span>{Math.round(config.spotlight.opacity * 100)} %</span>
                  </div>
                  <input
                    type="range" min="0.1" max="0.9" step="0.05"
                    value={config.spotlight.opacity}
                    onChange={(e) => updateConfig('spotlight', { opacity: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              </div>
            </div>

            {/* エリアスポットライト（矩形）設定 */}
            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <BoxSelect className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">エリアスポットライト</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">画面上の選択した矩形領域をハイライトします</p>
                  </div>
                </div>
                <Switch
                  checked={config.areaSpotlight?.enabled}
                  onChange={(val) => updateConfig('areaSpotlight', { enabled: val })}
                />
              </div>

              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800 animate-fadeIn">
                {config.areaSpotlight?.enabled && !config.areaSpotlight.rect && (
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-800 dark:text-indigo-200 rounded-xl text-xs flex gap-2 items-start">
                    <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <div>
                      画面が薄暗くなりました。マウスをドラッグして、ハイライトしたい四角形の領域を囲んでください。
                      （Escキーで選択をキャンセル・解除できます）
                    </div>
                  </div>
                )}

                {config.areaSpotlight?.enabled && config.areaSpotlight.rect && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-350 rounded-xl text-xs flex gap-2 items-start justify-between">
                    <div className="flex gap-2 items-start">
                      <Check className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <div>
                        領域が設定されています。背面にあるアプリを通常通り操作できます。
                        もう一度選択し直したい場合は、一度トグルをOFFにしてからONにするか、
                        ショートカット（Ctrl + Shift + A）を押してください。
                      </div>
                    </div>
                    <button
                      onClick={() => updateConfig('areaSpotlight', { rect: null })}
                      className="text-xs text-indigo-500 hover:text-indigo-600 font-bold whitespace-nowrap"
                    >
                      再選択
                    </button>
                  </div>
                )}

                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium text-slate-600 dark:text-slate-300">
                    <span>背景の不透明度（暗さ）</span>
                    <span>{Math.round((config.areaSpotlight?.opacity || 0.6) * 100)} %</span>
                  </div>
                  <input
                    type="range" min="0.1" max="0.9" step="0.05"
                    value={config.areaSpotlight?.opacity || 0.6}
                    onChange={(e) => updateConfig('areaSpotlight', { opacity: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>

                <div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300 block mb-2">枠線の色</span>
                  <div className="flex flex-wrap gap-2 items-center">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => updateConfig('areaSpotlight', { borderColor: color })}
                        style={{ backgroundColor: color }}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${config.areaSpotlight?.borderColor === color ? 'ring-2 ring-indigo-500 dark:ring-indigo-400 scale-110 shadow-sm' : 'hover:scale-105'
                          }`}
                      >
                        {config.areaSpotlight?.borderColor === color && <Check className="h-4 w-4 text-white drop-shadow-sm" />}
                      </button>
                    ))}
                    <input
                      type="color"
                      value={config.areaSpotlight?.borderColor || '#3b82f6'}
                      onChange={(e) => updateConfig('areaSpotlight', { borderColor: e.target.value })}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium text-slate-600 dark:text-slate-300">
                    <span>枠線の太さ</span>
                    <span>{config.areaSpotlight?.borderWidth || 2} px</span>
                  </div>
                  <input
                    type="range" min="0" max="8" step="1"
                    value={config.areaSpotlight?.borderWidth || 2}
                    onChange={(e) => updateConfig('areaSpotlight', { borderWidth: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              </div>
            </div>
          </div>
  );
}
