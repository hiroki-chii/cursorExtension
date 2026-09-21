@echo off
cd /d "%~dp0"
if not exist "src-tauri\target\release\presenter-cursor.exe" (
  echo PresenterCursorのリリース版が見つかりません。
  echo 先に npm run tauri:build を実行してください。
  exit /b 1
)
start "" /b "%~dp0src-tauri\target\release\presenter-cursor.exe"
exit /b 0
