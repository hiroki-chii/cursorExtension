import React, { useEffect, useState } from 'react';
import {
  Sun, Moon, Monitor, Sparkles, Sliders, Trash2, Undo, Redo,
  MousePointer, Zap, Edit3, Keyboard, Info, Check,
  BoxSelect, ZoomIn, Power
} from 'lucide-react';
import { useTheme } from '../components/ThemeProvider';
import { ShortcutSettings } from './ShortcutSettings';
import { EffectsSettings } from './EffectsSettings';
import { DrawingSettings } from './DrawingSettings';

export default function App() {
  const { theme, setTheme } = useTheme();
  const [config, setConfig] = useState(null);
  const [activeTab, setActiveTab] = useState('effects'); // 'effects', 'drawing', 'shortcuts'

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getConfig().then((loadedConfig) => {
        setConfig(loadedConfig);
        setTheme(loadedConfig.theme || 'system');
      });

      const unsubscribe = window.electronAPI.onConfigUpdate((newConfig) => {
        setConfig(newConfig);
        setTheme(newConfig.theme || 'system');
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
    config.keycast?.enabled ||
    config.gesture?.enabled
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
      keycast: { ...config.keycast, enabled: false },
      gesture: { ...config.gesture, enabled: false }
    };
    setConfig(updated);
    if (window.electronAPI) {
      window.electronAPI.updateConfig(updated);
    }
  };

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
          <EffectsSettings config={config} updateConfig={updateConfig} />
        )}

        {/* === 描画・操作タブ === */}
        {activeTab === 'drawing' && (
          <DrawingSettings
            config={config}
            updateConfig={updateConfig}
            onUndo={handleUndoDrawing}
            onRedo={handleRedoDrawing}
            onClear={handleClearAllDrawing}
          />
        )}

        {/* === ショートカットタブ === */}
        {activeTab === 'shortcuts' && <ShortcutSettings shortcuts={config.shortcuts} />}


      </main>

      {/* フッター */}
      <footer className="px-6 py-3 bg-white/40 dark:bg-slate-900/40 border-t border-slate-200/30 dark:border-slate-800/30 text-center text-xs text-slate-450 flex-shrink-0">
        &copy; 2026 PresenterCursor. すべてのプレゼンテーションをスマートに。
      </footer>
    </div>
  );
}
