@echo off
set "TARGET_BAT=%~dp0run_tutornow.bat"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $desktop = [System.Environment]::GetFolderPath('Desktop'); $shortcut = $ws.CreateShortcut(\"$desktop\TutorNow.lnk\"); $shortcut.TargetPath = '%TARGET_BAT%'; $shortcut.WorkingDirectory = '%~dp0'; $shortcut.Description = 'Launch TutorNow App'; $shortcut.Save()"
echo [OK] Shortcut 'TutorNow' created successfully on your Desktop!
pause
