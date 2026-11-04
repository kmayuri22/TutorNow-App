# ============================================================
# TutorNow - USB Direct Deployment Script
# Run this script from the project root after connecting your
# Android phone via USB with USB Debugging enabled.
# ============================================================

$ADB = "C:\Users\venkataramana\AppData\Local\Android\Sdk\platform-tools\adb.exe"
$ANDROID_DIR = "$PSScriptRoot\frontend\android"
$GRADLEW = "$ANDROID_DIR\gradlew.bat"
$APK_PATH = "$ANDROID_DIR\app\build\outputs\apk\debug\app-debug.apk"
$APP_PACKAGE = "com.tutornow.app"
$APP_ACTIVITY = "com.tutornow.app.MainActivity"

# Load env vars for this session
$env:ANDROID_HOME = "C:\Users\venkataramana\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT = "C:\Users\venkataramana\AppData\Local\Android\Sdk"
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot"
$env:PATH = "C:\Users\venkataramana\AppData\Local\Android\Sdk\platform-tools;$env:JAVA_HOME\bin;$env:PATH"

Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  TutorNow - USB Deployment" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

# ---- Step 1: Check ADB ----
Write-Host "[1/5] Checking ADB..." -ForegroundColor Yellow
$adbVersion = & $ADB version 2>&1 | Select-Object -First 1
Write-Host "      $adbVersion" -ForegroundColor Gray

# ---- Step 2: Check Device ----
Write-Host ""
Write-Host "[2/5] Checking connected devices..." -ForegroundColor Yellow
$devices = & $ADB devices -l 2>&1
Write-Host $devices

# Parse device lines (skip the header line)
$deviceLines = ($devices -split "`n") | Where-Object { $_ -match "device$|device " -and $_ -notmatch "^List" }

if ($deviceLines.Count -eq 0) {
    Write-Host ""
    Write-Host "ERROR: No authorized Android device found." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check the following:" -ForegroundColor Yellow
    Write-Host "  1. Connect your phone via USB cable." -ForegroundColor White
    Write-Host "  2. On your phone go to: Settings > About Phone > tap 'Build Number' 7 times." -ForegroundColor White
    Write-Host "  3. Go to: Settings > Developer Options > enable 'USB Debugging'." -ForegroundColor White
    Write-Host "  4. When prompted on your phone, tap 'Allow' to authorize this computer." -ForegroundColor White
    Write-Host "  5. Run this script again." -ForegroundColor White
    Write-Host ""
    exit 1
}

if ($devices -match "unauthorized") {
    Write-Host ""
    Write-Host "ERROR: Device found but NOT authorized." -ForegroundColor Red
    Write-Host "  -> Check your phone screen and tap 'Allow' on the authorization dialog." -ForegroundColor Yellow
    Write-Host "  -> Then run this script again." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "  Device detected and authorized." -ForegroundColor Green

# ---- Step 3: Build Debug APK ----
Write-Host ""
Write-Host "[3/5] Building debug APK..." -ForegroundColor Yellow
Write-Host "      (This may take a minute on first run)" -ForegroundColor Gray

Push-Location $ANDROID_DIR
& $GRADLEW assembleDebug
$buildResult = $LASTEXITCODE
Pop-Location

if ($buildResult -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Gradle build failed." -ForegroundColor Red
    Write-Host "  Check the error above and fix any compilation issues." -ForegroundColor Yellow
    exit 1
}
Write-Host "  Build successful." -ForegroundColor Green

# ---- Step 4: Install APK ----
Write-Host ""
Write-Host "[4/5] Installing APK on device..." -ForegroundColor Yellow
$installResult = & $ADB install -r $APK_PATH 2>&1
Write-Host $installResult

if ($installResult -match "Success") {
    Write-Host "  Installation successful." -ForegroundColor Green
} else {
    Write-Host "ERROR: APK installation failed." -ForegroundColor Red
    Write-Host $installResult
    exit 1
}

# ---- Step 5: Launch App ----
Write-Host ""
Write-Host "[5/5] Launching TutorNow on device..." -ForegroundColor Yellow
& $ADB shell am start -n "${APP_PACKAGE}/${APP_ACTIVITY}" 2>&1
Write-Host "  App launched." -ForegroundColor Green

# ---- Done ----
Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  Deployment complete! Check your phone." -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To view live Logcat output, open a new terminal and run:" -ForegroundColor Gray
Write-Host "  $ADB logcat --pid=`$($ADB shell pidof $APP_PACKAGE)" -ForegroundColor White
Write-Host ""
