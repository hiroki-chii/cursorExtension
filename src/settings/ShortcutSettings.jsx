import React from 'react';
import { HelpCircle, Keyboard, Sparkles } from 'lucide-react';

const shortcutItems = [
  ['toggleSpotlight', 'スポットライトのON/OFF'],
  ['toggleAreaSpotlight', 'エリアスポットライトのON/OFF'],
  ['toggleLaser', 'レーザーポインターのON/OFF'],
  ['togglePen', '手書きペンのON/OFF'],
  ['toggleZoom', '全画面ズームのON/OFF'],
  ['undoDrawing', '手書きメモを戻す (Undo)'],
  ['redoDrawing', '手書きメモをやり直す (Redo)'],
  ['clearDrawing', '手書きメモの全クリア'],
];

const gestureItems = [
  ['V（Vの形を描く）', '手書きペン ON/OFF'],
  ['↔（左右にすばやく振る）', '手書きの全クリア'],
  ['←（右から左に直線を引く）', '戻る (Undo)'],
  ['→（左から右に直線を引く）', '進む (Redo)'],
];

function formatAccelerator(value) {
  return (value || '未設定').replace('CommandOrControl', 'Ctrl').replaceAll('+', ' + ');
}

function Row({ label, value, accent = 'text-indigo-600 dark:text-indigo-400' }) {
  return (
    <div className="flex items-center justify-between gap-4 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/30 dark:border-slate-700/30">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <span className={`text-xs font-bold text-right ${accent}`}>{value}</span>
    </div>
  );
}

export function ShortcutSettings({ shortcuts }) {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <section className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl"><Keyboard className="h-5 w-5" /></div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100">グローバルショートカットキー</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">他のアプリを開いていても動作するシステムショートカット</p>
          </div>
        </div>
        <div className="space-y-3">
          {shortcutItems.map(([key, label]) => (
            <Row key={key} label={label} value={formatAccelerator(shortcuts?.[key])} />
          ))}
        </div>
        <div className="mt-4 p-3.5 bg-slate-150 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 rounded-xl text-xs flex gap-2">
          <HelpCircle className="h-4 w-4 flex-shrink-0 text-indigo-500" />
          <span>ショートカットキーは他のソフトウェアを操作中でもバックグラウンドで有効です。</span>
        </div>
      </section>

      <section className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl"><Sparkles className="h-5 w-5" /></div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100">マウスジェスチャー操作</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">マウスの中ボタンを押しながら描く操作</p>
          </div>
        </div>
        <div className="space-y-3">
          {gestureItems.map(([label, value]) => (
            <Row key={label} label={label} value={value} accent="text-emerald-600 dark:text-emerald-400" />
          ))}
        </div>
      </section>
    </div>
  );
}
