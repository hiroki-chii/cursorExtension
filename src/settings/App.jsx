import React, { useEffect, useState } from 'react';
import {
  Sun, Moon, Monitor, Sparkles, Sliders, Trash2, Undo, Redo,
  MousePointer, Zap, Edit3, Keyboard, Info, Check, HelpCircle,
  BoxSelect, ZoomIn, Power
} from 'lucide-react';
import { useTheme } from '../components/ThemeProvider';

export default function App() {
  const { theme, setTheme } = useTheme();
  const [config, setConfig] = useState(null);
  const [activeTab, setActiveTab] = useState('effects'); // 'effects', 'drawing', 'shortcuts'

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getConfig().then((loadedConfig) => {
        setConfig(loadedConfig);
      });

      const unsubscribe = window.electronAPI.onConfigUpdate((newConfig) => {
        setConfig(newConfig);
      });
      return unsubscribe;
    }
  }, []);

  if (!config) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="text-sm text-slate-500 dark:text-slate-400">設定を読み込み中...</p>
        </div>
      </div>
    );
  }

  const updateConfig = (section, values) => {
    const updated = {
      ...config,
      [section]: {
        ...config[section],
        ...values
      }
    };
    setConfig(updated);
    if (window.electronAPI) {
      window.electronAPI.updateConfig(updated);
    }
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    const updated = { ...config, theme: newTheme };
    setConfig(updated);
    if (window.electronAPI) {
      window.electronAPI.updateConfig(updated);
    }
  };

  const handleUndoDrawing = () => {
    if (window.electronAPI) {
      window.electronAPI.triggerUndoDrawing();
    }
  };

  const handleRedoDrawing = () => {
    if (window.electronAPI) {
      window.electronAPI.triggerRedoDrawing();
    }
  };

  const handleClearAllDrawing = () => {
    if (window.electronAPI) {
      window.electronAPI.triggerClearDrawing(true);
    }
  };

  const anyEnabled = config && (
    config.spotlight?.enabled ||
    config.areaSpotlight?.enabled ||
    config.laser?.enabled ||
    config.ripple?.enabled ||
    config.pen?.enabled ||
    config.zoom?.enabled ||
    config.keycast?.enabled
  );

  const handleAllOff = () => {
    if (!config) return;
    const updated = {
      ...config,
      spotlight: { ...config.spotlight, enabled: false },
      areaSpotlight: { ...config.areaSpotlight, enabled: false, rect: null },
      laser: { ...config.laser, enabled: false },
      ripple: { ...config.ripple, enabled: false },
      pen: { ...config.pen, enabled: false },
      zoom: { ...config.zoom, enabled: false },
      keycast: { ...config.keycast, enabled: false }
    };
    setConfig(updated);
    if (window.electronAPI) {
      window.electronAPI.updateConfig(updated);
    }
  };

  const PRESET_COLORS = [
    '#ef4444', // レッド
    '#3b82f6', // ブルー
    '#10b981', // グリーン
    '#eab308', // イエロー
    '#a855f7', // パープル
    '#f97316', // オレンジ
    '#ec4899', // ピンク
  ];

  // カスタムトグルスイッチコンポーネント
  const Switch = ({ checked, onChange }) => (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${checked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
        }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-1'
          }`}
      />
    </button>
  );

  return (
    <div
      onMouseEnter={() => window.electronAPI && window.electronAPI.setSettingsHover(true)}
      onMouseLeave={() => window.electronAPI && window.electronAPI.setSettingsHover(false)}
      className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100/50 to-slate-200/30 text-slate-900 transition-colors duration-200 dark:from-slate-950 dark:via-slate-900/50 dark:to-slate-950 dark:text-slate-50 flex flex-col h-screen overflow-hidden"
    >

      {/* ヘッダー */}
      <header className="px-6 py-4 bg-white/70 dark:bg-slate-900/70 border-b border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500 rounded-xl text-white shadow-lg shadow-emerald-500/30 animate-pulse">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">PresenterCursor</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">プレゼンテーション支援ツール</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* 全機能OFFボタン */}
          <button
            onClick={handleAllOff}
            disabled={!anyEnabled}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-md transition-all ${anyEnabled
              ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/25 hover:scale-105 active:scale-95 cursor-pointer'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 shadow-none cursor-not-allowed opacity-50'
              }`}
            title="すべてのエフェクトと機能をOFFにします"
          >
            <Power className="h-3.5 w-3.5" />
            OFF
          </button>

          {/* テーマ切り替え */}
          <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800/60 p-1 rounded-xl">
            <button
              onClick={() => handleThemeChange('light')}
              className={`p-1.5 rounded-lg transition-all ${theme === 'light' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-500' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              title="ライトモード"
            >
              <Sun className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleThemeChange('dark')}
              className={`p-1.5 rounded-lg transition-all ${theme === 'dark' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              title="ダークモード"
            >
              <Moon className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleThemeChange('system')}
              className={`p-1.5 rounded-lg transition-all ${theme === 'system' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-500 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              title="システム同期"
            >
              <Monitor className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* タブナビゲーション */}
      <div className="px-6 py-2 bg-white/40 dark:bg-slate-900/40 border-b border-slate-200/30 dark:border-slate-800/30 flex gap-2 flex-shrink-0">
        <button
          onClick={() => setActiveTab('effects')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'effects'
            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-sm'
            : 'text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
            }`}
        >
          <MousePointer className="h-4 w-4" />
          ポインター効果
        </button>
        <button
          onClick={() => setActiveTab('drawing')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'drawing'
            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-sm'
            : 'text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
            }`}
        >
          <Edit3 className="h-4 w-4" />
          描画 & アシスト
        </button>
        <button
          onClick={() => setActiveTab('shortcuts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'shortcuts'
            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-sm'
            : 'text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
            }`}
        >
          <Keyboard className="h-4 w-4" />
          ショートカット
        </button>
      </div>

      {/* コンテンツエリア */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* === ポインター効果タブ === */}
        {activeTab === 'effects' && (
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
        )}

        {/* === 描画 & アシストタブ === */}
        {activeTab === 'drawing' && (
          <div className="space-y-6 max-w-2xl mx-auto">

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

            {/* ズーム（拡大鏡）設定 */}
            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <ZoomIn className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">ズーム（拡大鏡）機能</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">マウスポインター周辺を拡大表示します。ONの時にホイール回転でズーム変更が可能です</p>
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
                    ズームモードがONの時、マウスホイールを回すことでズームイン（奥へスクロール）およびズームアウト（手前へスクロール）が行えます。
                    （Escキーでズームを解除できます）
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium text-slate-600 dark:text-slate-300">
                    <span>拡大鏡のサイズ（半径）</span>
                    <span>{config.zoom?.radius || 150} px</span>
                  </div>
                  <input
                    type="range" min="100" max="300" step="10"
                    value={config.zoom?.radius || 150}
                    onChange={(e) => updateConfig('zoom', { radius: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>

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
        )}

        {/* === ショートカットタブ === */}
        {activeTab === 'shortcuts' && (
          <div className="space-y-6 max-w-2xl mx-auto">

            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Keyboard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">グローバルショートカットキー</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">他のアプリを開いていても動作するシステムショートカット</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/30 dark:border-slate-700/30">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">スポットライトのON/OFF</span>
                  <kbd className="px-2.5 py-1 bg-white dark:bg-slate-700 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm text-indigo-600 dark:text-indigo-400">
                    Ctrl + Shift + S
                  </kbd>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/30 dark:border-slate-700/30">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">エリアスポットライトのON/OFF</span>
                  <kbd className="px-2.5 py-1 bg-white dark:bg-slate-700 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm text-indigo-600 dark:text-indigo-400">
                    Ctrl + Shift + A
                  </kbd>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/30 dark:border-slate-700/30">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">レーザーポインターのON/OFF</span>
                  <kbd className="px-2.5 py-1 bg-white dark:bg-slate-700 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm text-indigo-600 dark:text-indigo-400">
                    Ctrl + Shift + L
                  </kbd>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/30 dark:border-slate-700/30">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">手書きペンのON/OFF</span>
                  <kbd className="px-2.5 py-1 bg-white dark:bg-slate-700 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm text-indigo-600 dark:text-indigo-400">
                    Ctrl + Shift + P
                  </kbd>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/30 dark:border-slate-700/30">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">ズーム（拡大鏡）のON/OFF</span>
                  <kbd className="px-2.5 py-1 bg-white dark:bg-slate-700 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm text-indigo-600 dark:text-indigo-400">
                    Ctrl + Shift + M
                  </kbd>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/30 dark:border-slate-700/30">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">手書きメモを戻す (Undo)</span>
                  <kbd className="px-2.5 py-1 bg-white dark:bg-slate-700 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm text-indigo-600 dark:text-indigo-400">
                    Ctrl + Shift + Z
                  </kbd>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/30 dark:border-slate-700/30">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">手書きメモをやり直す (Redo)</span>
                  <kbd className="px-2.5 py-1 bg-white dark:bg-slate-700 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm text-indigo-600 dark:text-indigo-400">
                    Ctrl + Shift + Y
                  </kbd>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/30 dark:border-slate-700/30">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">手書きメモの全クリア</span>
                  <kbd className="px-2.5 py-1 bg-white dark:bg-slate-700 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm text-indigo-600 dark:text-indigo-400">
                    Ctrl + Shift + C
                  </kbd>
                </div>
              </div>

              <div className="mt-4 p-3.5 bg-slate-150 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 rounded-xl text-xs flex gap-2">
                <HelpCircle className="h-4 w-4 flex-shrink-0 text-indigo-500" />
                <span>ショートカットキーは他のソフトウェアを操作中（PowerPointやブラウザなどでのスライド表示中）でも、バックグラウンドで常に有効です。</span>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* フッター */}
      <footer className="px-6 py-3 bg-white/40 dark:bg-slate-900/40 border-t border-slate-200/30 dark:border-slate-800/30 text-center text-xs text-slate-450 flex-shrink-0">
        &copy; 2026 PresenterCursor. すべてのプレゼンテーションをスマートに。
      </footer>
    </div>
  );
}
