$ws = New-Object -ComObject WScript.Shell
$desktop = [System.Environment]::GetFolderPath('Desktop')
$targetPath = Join-Path $PSScriptRoot "run_tutornow.bat"
$shortcutPath = Join-Path $desktop "TutorNow.lnk"

$shortcut = $ws.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $targetPath
$shortcut.WorkingDirectory = $PSScriptRoot
$shortcut.Description = "Launch TutorNow App"
$shortcut.Save()

Write-Output "SUCCESS: Created $shortcutPath"
