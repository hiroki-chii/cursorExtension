Option Explicit

Dim shell, fileSystem, appPath, scriptDirectory
Set shell = CreateObject("WScript.Shell")
Set fileSystem = CreateObject("Scripting.FileSystemObject")
scriptDirectory = fileSystem.GetParentFolderName(WScript.ScriptFullName)
appPath = fileSystem.BuildPath(scriptDirectory, "src-tauri\target\release\presenter-cursor.exe")

If fileSystem.FileExists(appPath) Then
  shell.Run Chr(34) & appPath & Chr(34), 0, False
Else
  MsgBox "PresenterCursorのリリース版が見つかりません。先に npm run tauri:build を実行してください。", 48, "PresenterCursor"
End If
