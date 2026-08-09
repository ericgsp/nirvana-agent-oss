@echo off
:: Launches Chrome with remote debugging on port 9222 using a dedicated profile.
:: A separate profile is used so this Chrome can run alongside your normal Chrome.
:: The profile persists login cookies — you only need to log in once.

set PROFILE_DIR=%LOCALAPPDATA%\NirvanaSyncChrome
set "CHROME_EXE=C:\Program Files\Google\Chrome\Application\chrome.exe"

if not exist "%CHROME_EXE%" (
  set "CHROME_EXE=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)

echo ============================================
echo   Nirvana Portal Co-Pilot Chrome Launcher
echo ============================================
echo.
echo Profile: %PROFILE_DIR%
echo Debug port: 9222
echo.

start "" "%CHROME_EXE%" ^
  --remote-debugging-port=9222 ^
  --user-data-dir="%PROFILE_DIR%" ^
  --no-first-run ^
  --no-default-browser-check ^
  "https://flpnwc-cc2c2c251.dispatcher.ap1.hana.ondemand.com/sites?siteId=ca8971d5-a7d7-4031-9b80-c58872b01a34#Shell-home"

echo Chrome launched. Log in to the portal if prompted.
echo Then open: http://localhost:3000/product-sync-copilot
echo.
echo Keep this window open while syncing.
pause
